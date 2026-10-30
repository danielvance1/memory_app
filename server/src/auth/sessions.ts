import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db";
import type { AuthUser } from "./types";

// How "staying logged in" works:
//  1. On login we make a long random token and give it to the browser in a cookie.
//  2. We save only a SHA-256 hash of the token in the database. If the database
//     ever leaks, the stored values can't be used to impersonate anyone.
//  3. On each request the browser sends the cookie back; we hash it and look it up.

export const SESSION_COOKIE = "sid";

// Anything we can run a query on: the shared pool, or one connection that is
// in the middle of a transaction.
type Queryable = Pick<PoolClient, "query">;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Queryable,
  userId: number,
  days: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url"); // 256 bits of randomness
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

export async function findUserBySessionToken(token: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<{
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
    code_system: number;
  }>(
    `SELECT u.id, u.username, u.email, u.is_admin, u.code_system
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = rows[0];
  return row
    ? { id: row.id, username: row.username, email: row.email, isAdmin: row.is_admin, codeSystem: row.code_system }
    : null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await pool.query("DELETE FROM sessions WHERE expires_at <= now()");
  return result.rowCount ?? 0;
}

// Cookie settings:
//  - httpOnly: page JavaScript can't read it, so a script injected into the page can't steal it
//  - sameSite lax: the browser won't attach it to requests started by other websites (blocks CSRF)
//  - secure: HTTPS only. We use `req.secure`, which is true behind Caddy (HTTPS) and
//    false on plain http://localhost, so the same code works in production and development.
export function setSessionCookie(req: Request, res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" });
}
