// Gives (or takes away) admin rights. There is deliberately no way to do this
// through the website: only someone who can run commands on the server can.
//
// On the server, from ~/memodeum:
//   docker compose exec app node server/dist/scripts/make-admin.js <username-or-email>
//   docker compose exec app node server/dist/scripts/make-admin.js <username-or-email> --remove
import { pool } from "../db";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const remove = args.includes("--remove");
  const who = args.find((arg) => !arg.startsWith("--"));

  if (!who) {
    console.error("Usage: make-admin <username-or-email> [--remove]");
    return 2;
  }

  const { rows } = await pool.query<{ username: string; email: string; is_admin: boolean }>(
    `UPDATE users
        SET is_admin = $2
      WHERE lower(username) = lower($1) OR lower(email) = lower($1)
      RETURNING username, email, is_admin`,
    [who, !remove],
  );

  if (rows.length === 0) {
    console.error(`No user found with username or email "${who}"`);
    return 1;
  }
  for (const row of rows) {
    console.log(`${row.username} <${row.email}> is ${row.is_admin ? "now an admin" : "no longer an admin"}`);
  }
  return 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
