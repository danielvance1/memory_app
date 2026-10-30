import assert from "node:assert/strict";
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

describe("code system", () => {
  let app: RunningApp;
  before(async () => {
    app = await startApp(relaxedConfig);
  });
  after(() => app.close());

  async function signedUpBrowser() {
    const browser = new TestBrowser(app.url);
    const signup = await browser.post("/api/auth/signup", newUser());
    assert.equal(signup.status, 201);
    return { browser, signup };
  }

  it("every new user starts on the 1 digit system, and /me and login report it", async () => {
    const input = newUser();
    const browser = new TestBrowser(app.url);
    const signup = await browser.post("/api/auth/signup", input);
    assert.equal(signup.body.user.codeSystem, 1);
    assert.equal((await browser.get("/api/auth/me")).body.user.codeSystem, 1);

    await browser.post("/api/auth/logout");
    const login = await new TestBrowser(app.url).post("/api/auth/login", {
      identifier: input.username,
      password: input.password,
    });
    assert.equal(login.body.user.codeSystem, 1);
  });

  it("can be set to 2, then 3, then back down, and each change is saved in the database", async () => {
    const { browser } = await signedUpBrowser();

    for (const target of [2, 3, 2, 1, 3]) {
      const reply = await browser.request("PUT", "/api/me/code-system", { codeSystem: target });
      assert.equal(reply.status, 200);
      assert.equal(reply.body.user.codeSystem, target);
      assert.equal((await browser.get("/api/auth/me")).body.user.codeSystem, target);
      const [row] = await query("SELECT code_system FROM users");
      assert.equal(row.code_system, target);
    }
  });

  it("setting the same value twice is harmless", async () => {
    const { browser } = await signedUpBrowser();
    await browser.request("PUT", "/api/me/code-system", { codeSystem: 2 });
    const again = await browser.request("PUT", "/api/me/code-system", { codeSystem: 2 });
    assert.equal(again.status, 200);
    assert.equal(again.body.user.codeSystem, 2);
  });

  it("rejects anything that is not the whole number 1, 2 or 3, and changes nothing", async () => {
    const { browser } = await signedUpBrowser();
    await browser.request("PUT", "/api/me/code-system", { codeSystem: 2 });

    const bad: unknown[] = [0, 4, -1, 1.5, "2", null, true, [2], {}, undefined];
    for (const codeSystem of bad) {
      const reply = await browser.request("PUT", "/api/me/code-system", { codeSystem });
      assert.equal(reply.status, 400, `codeSystem ${JSON.stringify(codeSystem)} should be rejected`);
      assert.equal(reply.body.field, "codeSystem");
    }
    const noBody = await browser.request("PUT", "/api/me/code-system");
    assert.equal(noBody.status, 400);

    const [row] = await query("SELECT code_system FROM users");
    assert.equal(row.code_system, 2, "rejected requests must not change the saved value");
  });

  it("requires login", async () => {
    const reply = await new TestBrowser(app.url).request("PUT", "/api/me/code-system", { codeSystem: 2 });
    assert.equal(reply.status, 401);
  });

  it("only ever changes the logged-in user's own setting", async () => {
    const a = await signedUpBrowser();
    const b = await signedUpBrowser();

    await a.browser.request("PUT", "/api/me/code-system", { codeSystem: 3 });
    // Trying to aim at someone else's id changes nothing about who gets updated.
    await b.browser.request("PUT", "/api/me/code-system", { codeSystem: 2, id: a.signup.body.user.id, userId: a.signup.body.user.id });

    const rows = await query("SELECT id, code_system FROM users ORDER BY id");
    assert.deepEqual(
      rows.map((r) => r.code_system),
      [3, 2],
    );
  });

  it("the database itself refuses a code system outside 1 to 3", async () => {
    await signedUpBrowser();
    await assert.rejects(() => query("UPDATE users SET code_system = 4"), /users_code_system_range/);
    await assert.rejects(() => query("UPDATE users SET code_system = 0"), /users_code_system_range/);
  });
});
