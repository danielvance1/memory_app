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

describe("codes table rules (enforced by the database itself)", () => {
  let app: RunningApp;
  let userId: number;
  let otherId: number;
  before(async () => {
    app = await startApp(relaxedConfig);
  });
  after(() => app.close());
  beforeEach(async () => {
    userId = (await new TestBrowser(app.url).post("/api/auth/signup", newUser())).body.user.id;
    otherId = (await new TestBrowser(app.url).post("/api/auth/signup", newUser())).body.user.id;
  });

  const insert = (user: number, code: string, text: string) =>
    query("INSERT INTO codes (user_id, code, text) VALUES ($1, $2, $3)", [user, code, text]);

  it("code must be 1 to 3 digits and nothing else", async () => {
    for (const good of ["0", "7", "42", "007", "999"]) await insert(userId, good, "");
    for (const bad of ["", "1234", "ab", "1a", "-1", "1 2", " 12", "12 ", "1.5"]) {
      await assert.rejects(() => insert(userId, bad, ""), /codes_code_format/, `code ${JSON.stringify(bad)} should be refused`);
    }
  });

  it("text defaults to blank and is limited to 200 characters", async () => {
    await query("INSERT INTO codes (user_id, code) VALUES ($1, '1')", [userId]);
    assert.equal((await query("SELECT text FROM codes"))[0].text, "");
    await insert(userId, "2", "x".repeat(200));
    await assert.rejects(() => insert(userId, "3", "x".repeat(201)), /codes_text_length/);
  });

  it("text can't start or end with whitespace", async () => {
    for (const bad of [" a", "a ", "\ta", "a\n", " "]) {
      await assert.rejects(() => insert(userId, "4", bad), /codes_text_trimmed/, `${JSON.stringify(bad)} should be refused`);
    }
    await insert(userId, "4", "inner spaces are fine");
  });

  it("a user has one row per code", async () => {
    await insert(userId, "5", "one");
    await assert.rejects(() => insert(userId, "5", "two"), /codes_user_code_key/);
    await insert(otherId, "5", "someone else may use the same code"); // different user: fine
  });

  it("a user can't reuse non-blank text, ignoring letter case, but blank text can repeat", async () => {
    await insert(userId, "1", "Dog");
    await assert.rejects(() => insert(userId, "2", "Dog"), /codes_user_text_key/);
    await assert.rejects(() => insert(userId, "2", "dOG"), /codes_user_text_key/);
    await insert(userId, "2", "Cat");
    await insert(userId, "3", "");
    await insert(userId, "4", "");
    await insert(userId, "5", "");
    await insert(otherId, "1", "Dog"); // another user can use the same text
  });

  it("deleting an account removes its codes, and only its codes", async () => {
    await insert(userId, "1", "mine");
    await insert(otherId, "1", "theirs");
    await query("DELETE FROM users WHERE id = $1", [userId]);
    const rows = await query("SELECT user_id, text FROM codes");
    assert.deepEqual(rows, [{ user_id: otherId, text: "theirs" }]);
  });
});

describe("codes API", () => {
  let app: RunningApp;
  before(async () => {
    app = await startApp(relaxedConfig);
  });
  after(() => app.close());

  async function loggedIn(system = 3) {
    const browser = new TestBrowser(app.url);
    const signup = await browser.post("/api/auth/signup", newUser());
    assert.equal(signup.status, 201);
    if (system !== 1) await browser.request("PUT", "/api/me/code-system", { codeSystem: system });
    return { browser, id: signup.body.user.id as number };
  }
  const put = (b: TestBrowser, code: string, body: unknown) => b.request("PUT", `/api/codes/${code}`, body);

  it("requires login", async () => {
    const stranger = new TestBrowser(app.url);
    assert.equal((await stranger.get("/api/codes")).status, 401);
    assert.equal((await put(stranger, "1", { text: "x" })).status, 401);
  });

  it("starts empty, and nothing is created automatically", async () => {
    const { browser } = await loggedIn();
    assert.deepEqual((await browser.get("/api/codes")).body, { codes: [] });
    assert.equal((await query("SELECT count(*)::int AS n FROM codes"))[0].n, 0);
  });

  it("creates a code, returns it, and lists it", async () => {
    const { browser } = await loggedIn();
    const reply = await put(browser, "042", { text: "a dog on a skateboard" });
    assert.equal(reply.status, 200);
    assert.deepEqual(reply.body, { code: { code: "042", text: "a dog on a skateboard" } });
    assert.deepEqual((await browser.get("/api/codes")).body, { codes: [{ code: "042", text: "a dog on a skateboard" }] });
  });

  it("updates an existing code in place (one row)", async () => {
    const { browser } = await loggedIn();
    await put(browser, "7", { text: "first" });
    await put(browser, "7", { text: "second" });
    const rows = await query("SELECT code, text FROM codes");
    assert.deepEqual(rows, [{ code: "7", text: "second" }]);
  });

  it("trims leading and trailing whitespace before saving", async () => {
    const { browser } = await loggedIn();
    const reply = await put(browser, "8", { text: "  \n hello world \t " });
    assert.equal(reply.body.code.text, "hello world");
    assert.equal((await query("SELECT text FROM codes"))[0].text, "hello world");
  });

  it("blank text never creates a row", async () => {
    const { browser } = await loggedIn();
    for (const text of ["", "   ", "\n\t "]) {
      const reply = await put(browser, "9", { text });
      assert.equal(reply.status, 200);
      assert.equal(reply.body.code.text, "");
    }
    assert.equal((await query("SELECT count(*)::int AS n FROM codes"))[0].n, 0);
  });

  it("blank text on an existing code keeps the row and just blanks it", async () => {
    const { browser } = await loggedIn();
    await put(browser, "9", { text: "something" });
    await put(browser, "9", { text: "  " });
    assert.deepEqual(await query("SELECT code, text FROM codes"), [{ code: "9", text: "" }]);
    assert.deepEqual((await browser.get("/api/codes")).body, { codes: [{ code: "9", text: "" }] });
  });

  it("accepts exactly 200 characters (after trimming) and refuses 201", async () => {
    const { browser } = await loggedIn();
    assert.equal((await put(browser, "1", { text: ` ${"x".repeat(200)} ` })).status, 200);
    const tooLong = await put(browser, "2", { text: "x".repeat(201) });
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.field, "text");
    assert.match(tooLong.body.error, /at most 200 characters/);
  });

  it("rejects bad codes and bad text", async () => {
    const { browser } = await loggedIn();
    for (const code of ["1234", "ab", "1a", "-1", "1.5", "%20"]) {
      const reply = await put(browser, code, { text: "x" });
      assert.equal(reply.status, 400, `code ${code}`);
    }
    for (const body of [{}, { text: 5 }, { text: null }, { text: ["a"] }, undefined]) {
      const reply = await put(browser, "1", body);
      assert.equal(reply.status, 400, JSON.stringify(body));
      assert.equal(reply.body.field, "text");
    }
    assert.equal((await query("SELECT count(*)::int AS n FROM codes"))[0].n, 0);
  });

  it("only accepts codes that fit the user's current system", async () => {
    const { browser } = await loggedIn(1);
    assert.equal((await put(browser, "5", { text: "ok" })).status, 200);
    const two = await put(browser, "55", { text: "too long" });
    assert.equal(two.status, 400);
    assert.equal(two.body.field, "code");
    assert.equal((await put(browser, "174", { text: "too long" })).status, 400);
    await browser.request("PUT", "/api/me/code-system", { codeSystem: 2 });
    assert.equal((await put(browser, "55", { text: "now ok" })).status, 200);
    assert.equal((await put(browser, "174", { text: "still too long" })).status, 400);
  });

  it("keeps codes from a higher system when the user switches down, and still lists them", async () => {
    const { browser } = await loggedIn(3);
    await put(browser, "174", { text: "triple" });
    await put(browser, "42", { text: "double" });
    await browser.request("PUT", "/api/me/code-system", { codeSystem: 1 });
    const rows = await query("SELECT code FROM codes ORDER BY code");
    assert.deepEqual(rows.map((r) => r.code), ["174", "42"]);
    assert.deepEqual(
      (await browser.get("/api/codes")).body.codes.map((c: any) => c.code),
      ["42", "174"],
    );
  });

  it("refuses text another of the user's codes already uses (any letter case) and says which code", async () => {
    const { browser } = await loggedIn();
    await put(browser, "1", { text: "Dog" });
    const dup = await put(browser, "2", { text: "dOG" });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.field, "text");
    assert.match(dup.body.error, /Code 1 already uses that text/);
    assert.equal((await query("SELECT count(*)::int AS n FROM codes"))[0].n, 1, "the refused save must not create a row");
    // Saving the SAME code with its own text again is fine.
    assert.equal((await put(browser, "1", { text: "dog" })).status, 200);
  });

  it("a cleared code frees its text for another code", async () => {
    const { browser } = await loggedIn();
    await put(browser, "1", { text: "Dog" });
    await put(browser, "1", { text: "" });
    assert.equal((await put(browser, "2", { text: "Dog" })).status, 200);
  });

  it("different users can use the same code and the same text", async () => {
    const a = await loggedIn();
    const b = await loggedIn();
    assert.equal((await put(a.browser, "1", { text: "Dog" })).status, 200);
    assert.equal((await put(b.browser, "1", { text: "Dog" })).status, 200);
  });

  it("people only see and change their own codes", async () => {
    const a = await loggedIn();
    const b = await loggedIn();
    await put(a.browser, "1", { text: "A's code" });
    await put(b.browser, "2", { text: "B's code" });
    assert.deepEqual((await a.browser.get("/api/codes")).body.codes, [{ code: "1", text: "A's code" }]);
    assert.deepEqual((await b.browser.get("/api/codes")).body.codes, [{ code: "2", text: "B's code" }]);

    // B tries to reach A's row by every route they have: a PUT to the same code touches only B's own row.
    await put(b.browser, "1", { text: "B writes code 1", userId: a.id, user_id: a.id });
    const rows = await query("SELECT user_id, code, text FROM codes ORDER BY user_id, code");
    assert.deepEqual(rows, [
      { user_id: a.id, code: "1", text: "A's code" },
      { user_id: b.id, code: "1", text: "B writes code 1" },
      { user_id: b.id, code: "2", text: "B's code" },
    ]);
  });

  it("clearing a code only blanks the clearer's own row, never another user's", async () => {
    const a = await loggedIn();
    const b = await loggedIn();
    await put(a.browser, "1", { text: "A's text" });
    await put(b.browser, "1", { text: "B's text" });
    await put(b.browser, "1", { text: "" });
    assert.deepEqual((await a.browser.get("/api/codes")).body.codes, [{ code: "1", text: "A's text" }]);
    assert.deepEqual((await b.browser.get("/api/codes")).body.codes, [{ code: "1", text: "" }]);
  });

  it("there is no way to delete a code through the API", async () => {
    const { browser } = await loggedIn();
    await put(browser, "1", { text: "keep me" });
    for (const [method, path] of [["DELETE", "/api/codes/1"], ["DELETE", "/api/codes"], ["POST", "/api/codes"]]) {
      const reply = await browser.request(method, path);
      assert.ok(reply.status === 404 || reply.status === 405, `${method} ${path} -> ${reply.status}`);
    }
    assert.equal((await query("SELECT count(*)::int AS n FROM codes"))[0].n, 1);
  });

  it("codes are not shared through /me or login, and logging out stops access", async () => {
    const { browser } = await loggedIn();
    await put(browser, "1", { text: "secret-ish" });
    assert.ok(!JSON.stringify((await browser.get("/api/auth/me")).body).includes("secret-ish"));
    await browser.post("/api/auth/logout");
    assert.equal((await browser.get("/api/codes")).status, 401);
  });
});
