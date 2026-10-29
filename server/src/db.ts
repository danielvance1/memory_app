import { Pool } from "pg";

// One shared connection pool for the whole app. The connection string comes
// from the DATABASE_URL environment variable (never hard-code credentials).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
});

// An idle connection can drop (e.g. the database restarts). Without this
// listener Node would treat the error as fatal and crash the process.
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});
