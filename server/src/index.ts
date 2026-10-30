import { createApp } from "./app";
import { deleteExpiredSessions } from "./auth/sessions";
import { loadConfig } from "./config";
import { pool } from "./db";
import { runMigrations } from "./migrate";

async function main(): Promise<void> {
  const config = loadConfig();

  // Bring the database schema up to date BEFORE accepting any requests. If this
  // fails the app exits, the container's health check never passes, and the
  // deploy reports the failure instead of serving a broken site.
  await runMigrations(pool);

  const removed = await deleteExpiredSessions();
  if (removed > 0) console.log(`Removed ${removed} expired session(s)`);
  // Then tidy up once an hour. unref() means this timer alone won't keep the process alive.
  setInterval(() => {
    deleteExpiredSessions().catch((err) => console.error("Session cleanup failed", err));
  }, 60 * 60 * 1000).unref();

  const port = Number(process.env.PORT ?? 3000);
  const server = createApp(config).listen(port, () => {
    console.log(`Server listening on port ${port} (user limit: ${config.maxUsers})`);
  });

  // Docker sends SIGTERM when it stops the container. Finish in-flight requests
  // and close database connections instead of being killed mid-request.
  function shutdown(signal: string): void {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // safety net
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
