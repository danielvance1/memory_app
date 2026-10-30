// Shared helpers for the integration tests. These talk to a real PostgreSQL
// database and a real running copy of the app (on a random free port).
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { AppConfig } from "../config";

// The tests wipe the users table, so they only ever run against a database
// named in TEST_DATABASE_URL. They never touch DATABASE_URL, which is what a
// development or production database would use.
export function connectToTestDatabase(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set TEST_DATABASE_URL to a throwaway database, e.g.\n" +
        "  TEST_DATABASE_URL=postgres://memodeum:devpassword@localhost:5432/memodeum_test npm test",
    );
  }
  process.env.DATABASE_URL = url;
}

// Generous limits so a test only hits a limit when it is deliberately testing one.
export const relaxedConfig: AppConfig = {
  maxUsers: 500,
  sessionDays: 30,
  signupsPerHourPerIp: 10_000,
  failedLoginsPerIp: 10_000,
  failedLoginsPerAccount: 10_000,
};

export interface Reply {
  status: number;
  body: any;
  setCookie: string[];
}

// A tiny stand-in for a browser: it remembers cookies between requests.
export class TestBrowser {
  cookies = new Map<string, string>();

  constructor(private baseUrl: string) {}

  async request(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<Reply> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.cookies.size > 0) {
      headers.cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    }

    const res = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });

    const setCookie = res.headers.getSetCookie();
    for (const line of setCookie) {
      const [pair] = line.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value === "" || /expires=thu, 01 jan 1970/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON; keep the raw text */
    }
    return { status: res.status, body: parsed, setCookie };
  }

  get(path: string) {
    return this.request("GET", path);
  }
  post(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request("POST", path, body, headers);
  }
}

export interface RunningApp {
  url: string;
  close(): Promise<void>;
}

export async function startApp(config: AppConfig): Promise<RunningApp> {
  const { createApp } = await import("../app.js"); // loaded late, after DATABASE_URL is set
  const server: Server = await new Promise((resolve) => {
    const s = createApp(config).listen(0, () => resolve(s)); // port 0 = any free port
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export async function resetDatabase(): Promise<void> {
  const { pool } = await import("../db.js");
  await pool.query("TRUNCATE users, sessions RESTART IDENTITY CASCADE");
}

export async function prepareDatabase(): Promise<void> {
  const { pool } = await import("../db.js");
  const { runMigrations } = await import("../migrate.js");
  await runMigrations(pool);
}

export async function closeDatabase(): Promise<void> {
  const { pool } = await import("../db.js");
  await pool.end();
}

let counter = 0;
export function newUser(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  counter += 1;
  return {
    username: `user_${counter}`,
    email: `user${counter}@example.com`,
    password: "correct-horse-battery",
    ...overrides,
  };
}
