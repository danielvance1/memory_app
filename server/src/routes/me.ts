import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth/middleware";

// Settings of the logged-in user ("me"). Everything here needs a login, and
// every query is scoped to req.user.id so nobody can touch anyone else's data.
export function meRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  // PUT /api/me/code-system  { codeSystem: 1 | 2 | 3 }
  // "Set it to this value" (not "add one"), so repeating the same request,
  // for example from a double tap, is harmless.
  router.put("/code-system", async (req, res) => {
    const value: unknown = req.body?.codeSystem;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 3) {
      res.status(400).json({ field: "codeSystem", error: "Code system must be 1, 2, or 3." });
      return;
    }

    const { rows } = await pool.query<{
      id: number;
      username: string;
      email: string;
      is_admin: boolean;
      code_system: number;
    }>(
      `UPDATE users SET code_system = $1 WHERE id = $2
       RETURNING id, username, email, is_admin, code_system`,
      [value, req.user!.id],
    );
    const row = rows[0];
    res.json({
      user: { id: row.id, username: row.username, email: row.email, isAdmin: row.is_admin, codeSystem: row.code_system },
    });
  });

  return router;
}
