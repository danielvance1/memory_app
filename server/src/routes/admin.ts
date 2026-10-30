import { Router } from "express";
import type { AppConfig } from "../config";
import { pool } from "../db";
import { requireAdmin } from "../auth/middleware";

export function adminRouter(config: AppConfig): Router {
  const router = Router();

  // Everything in this router is admin-only.
  router.use(requireAdmin);

  // GET /api/admin/users
  // Never selects password_hash: the hash never leaves the database.
  router.get("/users", async (_req, res) => {
    const { rows } = await pool.query<{
      id: number;
      username: string;
      email: string;
      is_admin: boolean;
      created_at: Date;
      last_login_at: Date | null;
    }>(
      `SELECT id, username, email, is_admin, created_at, last_login_at
         FROM users
        ORDER BY created_at DESC, id DESC`,
    );

    res.json({
      users: rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        isAdmin: row.is_admin,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      })),
      total: rows.length,
      max: config.maxUsers,
    });
  });

  return router;
}
