import { Router } from "express";
import { pool } from "../db";

export const healthRouter = Router();

// GET /api/health
// Used by Docker's healthcheck, the deploy pipeline, and the status card on the
// home page. Returns 200 only if the app is running AND can reach the database.
healthRouter.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "up" });
  } catch (err) {
    console.error("Health check failed: database unreachable", err);
    res.status(503).json({ status: "degraded", database: "down" });
  }
});
