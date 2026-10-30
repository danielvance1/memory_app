import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  TestBrowser,
  closeDatabase,
  connectToTestDatabase,
  newUser,
  prepareDatabase,
  relaxedConfig,
  resetDatabase,
  startApp,
  type RunningApp,
} from "./testing/helpers";

connectToTestDatabase();

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { pool } = await import("./db.js");
  return (await pool.query(sql, params)).rows;
}

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe("signup and sessions", () => {
  let app: RunningApp;
  before(async () => {
    app = await startApp(relaxedConfig);
  });
  after(() => app.close());

  it("creates an account, logs the user in, and never exposes secrets", async () => {
    const browser = new TestBrowser(app.url);
    const input = newUser({ username: "Dan_V", email: "Dan@Example.com" });

    const signup = await browser.post("/api/auth/signup", input);
    assert.equal(signup.status, 201);
    assert.deepEqual(signup.body.user, { id: 1, username: "Dan_V", email: "dan@example.com", isAdmin: false });
    assert.ok(!JSON.stringify(signup.body).includes("password"), "response must not mention a password");

    // The cookie is locked down.
    const cookieLine = signup.setCookie.find((c) => c.startsWith("sid="))!;
    assert.match(cookieLine, /HttpOnly/i);
    assert.match(cookieLine, /SameSite=Lax/i);
    assert.match(cookieLine, /Path=\//i);

    // Signing up also logged them in.
    const me = await browser.get("/api/auth/me");
    assert.equal(me.body.user.username, "Dan_V");

    // The database holds a real argon2id hash, not the password, and not the raw session token.
    const [row] = await query("SELECT password_hash, last_login_at FROM users");
    assert.match(row.password_hash, /^\$argon2id\$/);
    assert.ok(!row.password_hash.includes(input.password));
    assert.ok(row.last_login_at, "signing up counts as a login");
    const [session] = await query("SELECT token_hash FROM sessions");
    assert.notEqual(session.token_hash, browser.cookies.get("sid"));
  });

  it("marks the cookie Secure when the request arrived over HTTPS via the proxy", async () => {
    const browser = new TestBrowser(app.url);
    const signup = await browser.post("/api/auth/signup", newUser(), { "x-forwarded-proto": "https" });
    assert.match(signup.setCookie.find((c) => c.startsWith("sid="))!, /; Secure/i);
  });

  it("rejects invalid signups with a message naming the field", async () => {
    const browser = new TestBrowser(app.url);
    const cases: Array<[string, object, string]> = [
      ["username too short", { ...newUser(), username: "ab" }, "username"],
      ["username with a space", { ...newUser(), username: "has space" }, "username"],
      ["username with @", { ...newUser(), username: "a@b.com" }, "username"],
      ["username too long", { ...newUser(), username: "a".repeat(21) }, "username"],
      ["email without @", { ...newUser(), email: "nope" }, "email"],
      ["email without a dot in the domain", { ...newUser(), email: "a@b" }, "email"],
      ["password too short", { ...newUser(), password: "short" }, "password"],
      ["password too long", { ...newUser(), password: "x".repeat(129) }, "password"],
      ["numbers instead of text", { username: 12345, email: 1, password: 2 }, "username"],
    ];
    for (const [name, body, field] of cases) {
      const reply = await browser.post("/api/auth/signup", body);
      assert.equal(reply.status, 400, name);
      assert.equal(reply.body.field, field, name);
    }
    assert.equal((await query("SELECT count(*)::int AS n FROM users"))[0].n, 0, "nothing was created");
  });

  it("rejects a missing or malformed body without crashing", async () => {
    const browser = new TestBrowser(app.url);
    assert.equal((await browser.post("/api/auth/signup")).status, 400);
    assert.equal((await browser.post("/api/auth/signup", "{ not json")).status, 400);
    assert.equal((await browser.post("/api/auth/signup", { junk: "x".repeat(20_000) })).status, 413);
    assert.equal((await browser.post("/api/auth/login")).status, 400);
  });

  it("refuses duplicate usernames and emails, ignoring letter case", async () => {
    const a = new TestBrowser(app.url);
    await a.post("/api/auth/signup", newUser({ username: "Taken_Name", email: "taken@example.com" }));

    const b = new TestBrowser(app.url);
    const sameName = await b.post("/api/auth/signup", newUser({ username: "taken_name" }));
    assert.equal(sameName.status, 409);
    assert.equal(sameName.body.field, "username");

    const sameEmail = await b.post("/api/auth/signup", newUser({ email: "TAKEN@example.com" }));
    assert.equal(sameEmail.status, 409);
    assert.equal(sameEmail.body.field, "email");

    assert.equal((await query("SELECT count(*)::int AS n FROM users"))[0].n, 1);
  });

  it("logs in by username or by email, in any letter case", async () => {
    const input = newUser({ username: "Login_Test", email: "login@example.com" });
    await new TestBrowser(app.url).post("/api/auth/signup", input);
    await query("UPDATE users SET last_login_at = NULL");

    for (const identifier of ["Login_Test", "login_test", "LOGIN@example.com"]) {
      const browser = new TestBrowser(app.url);
      const reply = await browser.post("/api/auth/login", { identifier, password: input.password });
      assert.equal(reply.status, 200, identifier);
      assert.equal(reply.body.user.username, "Login_Test");
      assert.equal((await browser.get("/api/auth/me")).body.user.username, "Login_Test");
    }
    const [row] = await query("SELECT last_login_at FROM users");
    assert.ok(row.last_login_at, "last_login_at was updated");
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    const input = newUser();
    await new TestBrowser(app.url).post("/api/auth/signup", input);
    const browser = new TestBrowser(app.url);

    const wrongPassword = await browser.post("/api/auth/login", { identifier: input.username, password: "not-it-at-all" });
    const unknownUser = await browser.post("/api/auth/login", { identifier: "nobody_here", password: "not-it-at-all" });
    const unknownEmail = await browser.post("/api/auth/login", { identifier: "no@one.com", password: "not-it-at-all" });

    for (const reply of [wrongPassword, unknownUser, unknownEmail]) {
      assert.equal(reply.status, 401);
      assert.deepEqual(reply.body, wrongPassword.body);
    }
    assert.equal(browser.cookies.size, 0, "no session cookie on failure");
  });

  it("reports nobody logged in when there is no cookie, or a bogus one", async () => {
    const anonymous = new TestBrowser(app.url);
    assert.deepEqual((await anonymous.get("/api/auth/me")).body, { user: null });

    anonymous.cookies.set("sid", "this-is-not-a-real-token");
    assert.deepEqual((await anonymous.get("/api/auth/me")).body, { user: null });
  });

  it("logout ends the session on the server, so a copied cookie stops working", async () => {
    const browser = new TestBrowser(app.url);
    await browser.post("/api/auth/signup", newUser());
    const stolenCopy = browser.cookies.get("sid")!;

    assert.equal((await browser.post("/api/auth/logout")).status, 204);
    assert.equal((await browser.get("/api/auth/me")).body.user, null);
    assert.equal((await query("SELECT count(*)::int AS n FROM sessions"))[0].n, 0);

    const replay = new TestBrowser(app.url);
    replay.cookies.set("sid", stolenCopy);
    assert.equal((await replay.get("/api/auth/me")).body.user, null, "the old cookie is dead");
  });

  it("ignores expired sessions", async () => {
    const browser = new TestBrowser(app.url);
    await browser.post("/api/auth/signup", newUser());
    assert.ok((await browser.get("/api/auth/me")).body.user);

    await query("UPDATE sessions SET expires_at = now() - interval '1 second'");
    assert.equal((await browser.get("/api/auth/me")).body.user, null);
  });

  it("deleting a user ends their sessions", async () => {
    const browser = new TestBrowser(app.url);
    await browser.post("/api/auth/signup", newUser());
    await query("DELETE FROM users");
    assert.equal((await browser.get("/api/auth/me")).body.user, null);
  });

  it("API responses are not cacheable, and unknown API routes are JSON 404s", async () => {
    const browser = new TestBrowser(app.url);
    const res = await fetch(`${app.url}/api/auth/me`);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.headers.get("x-powered-by"), null);
    const missing = await browser.get("/api/does-not-exist");
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { error: "Not found" });
  });
});

describe("the user limit", () => {
  it("stops signups once the limit is reached, but existing users can still log in", async () => {
    const app = await startApp({ ...relaxedConfig, maxUsers: 3 });
    try {
      const people = [newUser(), newUser(), newUser()];
      for (const person of people) {
        assert.equal((await new TestBrowser(app.url).post("/api/auth/signup", person)).status, 201);
      }

      const late = await new TestBrowser(app.url).post("/api/auth/signup", newUser());
      assert.equal(late.status, 403);
      assert.equal(late.body.code, "registration_closed");
      assert.equal((await query("SELECT count(*)::int AS n FROM users"))[0].n, 3);

      const login = await new TestBrowser(app.url).post("/api/auth/login", {
        identifier: people[0].username,
        password: people[0].password,
      });
      assert.equal(login.status, 200);
    } finally {
      await app.close();
    }
  });

  it("holds exactly at the limit even when many signups arrive at the same instant", async () => {
    // A race like this normally hides in a window of a few milliseconds, so a
    // test could pass by luck even if the protection were missing. To make the
    // test honest, we slow every INSERT down by 50 ms with a temporary trigger.
    // Without the lock in the signup code, ten or so signups would all count
    // the users before any of them finished inserting, and the total would
    // blow past the limit. (Checked by deleting the lock: this test then fails.)
    await query("DROP TRIGGER IF EXISTS slow_insert_for_test ON users");
    await query(`CREATE OR REPLACE FUNCTION slow_insert_for_test() RETURNS trigger LANGUAGE plpgsql AS $$
                 BEGIN PERFORM pg_sleep(0.05); RETURN NEW; END $$`);
    await query(`CREATE TRIGGER slow_insert_for_test BEFORE INSERT ON users
                 FOR EACH ROW EXECUTE FUNCTION slow_insert_for_test()`);

    const app = await startApp({ ...relaxedConfig, maxUsers: 5 });
    try {
      const replies = await Promise.all(
        Array.from({ length: 25 }, () => new TestBrowser(app.url).post("/api/auth/signup", newUser())),
      );
      const created = replies.filter((r) => r.status === 201).length;
      const refused = replies.filter((r) => r.status === 403).length;

      assert.equal(created, 5, "exactly the limit were created");
      assert.equal(refused, 20, "everyone else was refused");
      assert.equal((await query("SELECT count(*)::int AS n FROM users"))[0].n, 5);
    } finally {
      await app.close();
      await query("DROP TRIGGER IF EXISTS slow_insert_for_test ON users");
      await query("DROP FUNCTION IF EXISTS slow_insert_for_test()");
    }
  });

  it("a limit of 0 closes signups completely", async () => {
    const app = await startApp({ ...relaxedConfig, maxUsers: 0 });
    try {
      assert.equal((await new TestBrowser(app.url).post("/api/auth/signup", newUser())).status, 403);
    } finally {
      await app.close();
    }
  });

  it("failed signups (duplicates, bad input) do not use up slots", async () => {
    const app = await startApp({ ...relaxedConfig, maxUsers: 2 });
    try {
      const first = newUser();
      await new TestBrowser(app.url).post("/api/auth/signup", first);
      await new TestBrowser(app.url).post("/api/auth/signup", first); // duplicate
      await new TestBrowser(app.url).post("/api/auth/signup", { ...newUser(), password: "x" }); // invalid
      assert.equal((await new TestBrowser(app.url).post("/api/auth/signup", newUser())).status, 201);
      assert.equal((await new TestBrowser(app.url).post("/api/auth/signup", newUser())).status, 403);
    } finally {
      await app.close();
    }
  });
});

describe("rate limits", () => {
  it("limits how many accounts one IP address can create per hour", async () => {
    const app = await startApp({ ...relaxedConfig, signupsPerHourPerIp: 3 });
    try {
      for (let i = 0; i < 3; i++) {
        assert.equal((await new TestBrowser(app.url).post("/api/auth/signup", newUser())).status, 201);
      }
      const blocked = await new TestBrowser(app.url).post("/api/auth/signup", newUser());
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.code, "rate_limited");
      assert.equal((await query("SELECT count(*)::int AS n FROM users"))[0].n, 3);
    } finally {
      await app.close();
    }
  });

  it("slows password guessing from one IP address, and normal logins never count", async () => {
    const app = await startApp({ ...relaxedConfig, failedLoginsPerIp: 3 });
    try {
      const input = newUser();
      await new TestBrowser(app.url).post("/api/auth/signup", input);
      const browser = new TestBrowser(app.url);

      // Many successful logins in a row are fine.
      for (let i = 0; i < 6; i++) {
        const ok = await browser.post("/api/auth/login", { identifier: input.username, password: input.password });
        assert.equal(ok.status, 200, `successful login #${i + 1}`);
      }

      // Three wrong guesses, then the door closes.
      for (let i = 0; i < 3; i++) {
        assert.equal((await browser.post("/api/auth/login", { identifier: input.username, password: "wrong-guess" })).status, 401);
      }
      const blocked = await browser.post("/api/auth/login", { identifier: input.username, password: "wrong-guess" });
      assert.equal(blocked.status, 429);
    } finally {
      await app.close();
    }
  });

  it("slows guessing against one account even when it comes from many addresses", async () => {
    const app = await startApp({ ...relaxedConfig, failedLoginsPerAccount: 2 });
    try {
      const target = newUser();
      const other = newUser();
      await new TestBrowser(app.url).post("/api/auth/signup", target);
      await new TestBrowser(app.url).post("/api/auth/signup", other);
      const browser = new TestBrowser(app.url);

      for (let i = 0; i < 2; i++) {
        assert.equal((await browser.post("/api/auth/login", { identifier: target.username, password: "wrong-guess" })).status, 401);
      }
      assert.equal((await browser.post("/api/auth/login", { identifier: target.username.toUpperCase(), password: "wrong-guess" })).status, 429);

      // A different account is unaffected.
      assert.equal((await browser.post("/api/auth/login", { identifier: other.username, password: other.password })).status, 200);
    } finally {
      await app.close();
    }
  });
});

describe("admin", () => {
  let app: RunningApp;
  before(async () => {
    app = await startApp({ ...relaxedConfig, maxUsers: 500 });
  });
  after(() => app.close());

  it("the user list requires login, then admin rights", async () => {
    assert.equal((await new TestBrowser(app.url).get("/api/admin/users")).status, 401);

    const regular = new TestBrowser(app.url);
    await regular.post("/api/auth/signup", newUser());
    assert.equal((await regular.get("/api/admin/users")).status, 403);
  });

  it("there is no way to become an admin through signup, however it is asked for", async () => {
    const browser = new TestBrowser(app.url);
    const reply = await browser.post("/api/auth/signup", { ...newUser(), isAdmin: true, is_admin: true, role: "admin" });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.user.isAdmin, false);
    assert.equal((await query("SELECT is_admin FROM users"))[0].is_admin, false);
    assert.equal((await browser.get("/api/admin/users")).status, 403);
  });

  it("an admin sees username, email, and last login for everyone, but no secrets", async () => {
    const boss = newUser({ username: "the_boss", email: "boss@example.com" });
    const adminBrowser = new TestBrowser(app.url);
    await adminBrowser.post("/api/auth/signup", boss);
    await new TestBrowser(app.url).post("/api/auth/signup", newUser({ username: "second_person" }));
    await query("UPDATE users SET is_admin = true WHERE username = 'the_boss'");
    await query("UPDATE users SET last_login_at = NULL WHERE username = 'second_person'");

    const reply = await adminBrowser.get("/api/admin/users");
    assert.equal(reply.status, 200);
    assert.equal(reply.body.total, 2);
    assert.equal(reply.body.max, 500);

    const byName = Object.fromEntries(reply.body.users.map((u: any) => [u.username, u]));
    assert.equal(byName.the_boss.email, "boss@example.com");
    assert.equal(byName.the_boss.isAdmin, true);
    assert.ok(byName.the_boss.lastLoginAt);
    assert.equal(byName.second_person.lastLoginAt, null, "never logged in shows as null");

    const raw = JSON.stringify(reply.body);
    assert.ok(!raw.includes("argon2"), "hashes never leave the database");
    assert.ok(!raw.includes("password"));
  });

  it("the make-admin script promotes and demotes by username or email", async () => {
    const person = newUser({ username: "promote_me", email: "promote@example.com" });
    const browser = new TestBrowser(app.url);
    await browser.post("/api/auth/signup", person);
    assert.equal((await browser.get("/api/admin/users")).status, 403);

    const script = path.resolve(__dirname, "scripts/make-admin.ts");
    const run = (...args: string[]) =>
      spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
        env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
        encoding: "utf8",
      });

    const promoted = run("PROMOTE@example.com");
    assert.equal(promoted.status, 0, promoted.stderr);
    assert.match(promoted.stdout, /now an admin/);
    assert.equal((await browser.get("/api/admin/users")).status, 200, "the existing session gained admin rights");

    const demoted = run("promote_me", "--remove");
    assert.equal(demoted.status, 0, demoted.stderr);
    assert.match(demoted.stdout, /no longer an admin/);
    assert.equal((await browser.get("/api/admin/users")).status, 403);

    assert.equal(run("nobody_by_that_name").status, 1);
    assert.equal(run().status, 2);
  });
});
