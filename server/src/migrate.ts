import path from "node:path";
import { Pool } from "pg";

// Applies any database migrations (the .sql files in server/migrations) that
// have not been applied yet. Already-applied ones are skipped, so this is safe
// to run on every startup. The migration library tracks what has run in a
// table called "pgmigrations" and takes a lock, so two copies of the app
// starting at once can't apply the same migration twice.
export async function runMigrations(pool: Pool): Promise<void> {
  // node-pg-migrate is an "ES module" package and this project compiles to
  // CommonJS, so it has to be loaded with a dynamic import().
  const { runner } = await import("node-pg-migrate");

  const client = await pool.connect();
  try {
    const applied = await runner({
      dbClient: client,
      dir: path.resolve(__dirname, "../migrations"),
      direction: "up",
      migrationsTable: "pgmigrations",
      singleTransaction: true, // all-or-nothing: a failure leaves no half-applied changes
      advisoryLockMode: "wait", // if another instance is migrating, wait for it
      log: () => {}, // quiet; we print our own summary below
    });
    if (applied.length === 0) {
      console.log("Database is up to date");
    } else {
      console.log(`Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(", ")}`);
    }
  } finally {
    client.release();
  }
}
