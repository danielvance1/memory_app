import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { DatabaseError } from "pg";
import type { AppConfig } from "../config";
import { pool } from "../db";
import { burnVerificationTime, hashPassword, verifyPassword } from "../auth/passwords";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from "../auth/sessions";
import { validateLogin, validateSignup } from "../auth/validation";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// An arbitrary number that names the "someone is creating an account" lock
// (see signup below). It only has to be the same everywhere it's used.
const SIGNUP_LOCK_ID = 7_300_500;

// Two fixed queries rather than building SQL from text: usernames can't contain
// "@" and emails always do, so the identifier tells us which column to search.
const FIND_BY_EMAIL = `SELECT id, username, email, password_hash, is_admin, code_system FROM users WHERE lower(email) = lower($1)`;
const FIND_BY_USERNAME = `SELECT id, username, email, password_hash, is_admin, code_system FROM users WHERE lower(username) = lower($1)`;

interface UserRow {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  code_system: number;
}

function publicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: row.is_admin,
    codeSystem: row.code_system,
  };
}

function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({ error: "Too many attempts. Please wait a while and try again.", code: "rate_limited" });
}

export function authRouter(config: AppConfig): Router {
  const router = Router();

  // Rate limits. Counters live in memory, so a restart resets them.
  const signupLimiter = rateLimit({
    windowMs: ONE_HOUR,
    limit: config.signupsPerHourPerIp,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: tooManyRequests,
  });

  // Only FAILED logins count against these (skipSuccessfulRequests), so normal
  // use is never throttled. One limiter watches each IP address; the other
  // watches each account name, which also slows an attacker who rotates IPs.
  const loginIpLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: config.failedLoginsPerIp,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: tooManyRequests,
  });
  const loginAccountLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: config.failedLoginsPerAccount,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const identifier: unknown = req.body?.identifier;
      return `account:${typeof identifier === "string" ? identifier.trim().toLowerCase().slice(0, 254) : ""}`;
    },
    handler: tooManyRequests,
  });

  // POST /api/auth/signup  { username, email, password }
  router.post("/signup", signupLimiter, async (req, res) => {
    const parsed = validateSignup(req.body);
    if (!parsed.ok) {
      res.status(400).json(parsed.error);
      return;
    }
    const { username, email, password } = parsed.value;

    // Hash BEFORE the database work: hashing is slow, and we don't want to hold
    // the lock below (and make other signups wait) while it runs.
    const passwordHash = await hashPassword(password);

    const client = await pool.connect();
    let inTransaction = false;
    try {
      await client.query("BEGIN");
      inTransaction = true;

      // The user cap. "Count the users, then insert" is not safe on its own:
      // two signups arriving together could both see 499 and both insert,
      // ending at 501. The advisory lock makes signups take turns, and it is
      // released automatically when the transaction ends.
      await client.query("SELECT pg_advisory_xact_lock($1)", [SIGNUP_LOCK_ID]);
      const counted = await client.query<{ count: string }>("SELECT count(*) AS count FROM users");
      if (Number(counted.rows[0].count) >= config.maxUsers) {
        await client.query("ROLLBACK");
        inTransaction = false;
        res.status(403).json({ error: "Sign-ups are closed right now.", code: "registration_closed" });
        return;
      }

      const inserted = await client.query<UserRow>(
        `INSERT INTO users (username, email, password_hash, last_login_at)
         VALUES ($1, $2, $3, now())
         RETURNING id, username, email, is_admin, code_system`,
        [username, email, passwordHash],
      );
      const user = inserted.rows[0];
      const session = await createSession(client, user.id, config.sessionDays);

      await client.query("COMMIT");
      inTransaction = false;

      setSessionCookie(req, res, session.token, session.expiresAt);
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      if (inTransaction) await client.query("ROLLBACK").catch(() => {});

      // 23505 = "unique violation". The database's unique indexes are the real
      // guard against duplicates, so this is also correct if two people try to
      // claim the same name at the same instant.
      if (err instanceof DatabaseError && err.code === "23505") {
        if (err.constraint === "users_username_lower_key") {
          res.status(409).json({ field: "username", error: "That username is taken." });
          return;
        }
        if (err.constraint === "users_email_lower_key") {
          res.status(409).json({ field: "email", error: "An account with that email already exists." });
          return;
        }
      }
      throw err; // anything else becomes a generic 500 (see app.ts)
    } finally {
      client.release();
    }
  });

  // POST /api/auth/login  { identifier, password }   (identifier = username or email)
  router.post("/login", loginIpLimiter, loginAccountLimiter, async (req, res) => {
    const parsed = validateLogin(req.body);
    if (!parsed.ok) {
      res.status(400).json(parsed.error);
      return;
    }
    const { identifier, password } = parsed.value;

    const found = await pool.query<UserRow & { password_hash: string }>(
      identifier.includes("@") ? FIND_BY_EMAIL : FIND_BY_USERNAME,
      [identifier],
    );
    const user = found.rows[0];

    // Same message for "no such account" and "wrong password", so the response
    // doesn't reveal which accounts exist.
    const notRecognized = () => res.status(401).json({ error: "Wrong username, email, or password." });

    if (!user) {
      await burnVerificationTime(password);
      notRecognized();
      return;
    }
    if (!(await verifyPassword(user.password_hash, password))) {
      notRecognized();
      return;
    }

    await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
    const session = await createSession(pool, user.id, config.sessionDays);
    setSessionCookie(req, res, session.token, session.expiresAt);
    res.json({ user: publicUser(user) });
  });

  // POST /api/auth/logout
  router.post("/logout", async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string" && token.length > 0) {
      await deleteSession(token);
    }
    clearSessionCookie(req, res);
    res.status(204).end();
  });

  // GET /api/auth/me   -> { user } when logged in, { user: null } when not.
  // (200 either way, so the page can ask on load without an error showing up.)
  router.get("/me", (req, res) => {
    res.json({ user: req.user ?? null });
  });

  return router;
}
