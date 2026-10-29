import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { pool } from "./db";
import { healthRouter } from "./routes/health";

const app = express();
app.disable("x-powered-by"); // don't advertise the framework
app.use(express.json());

// ---- API routes -----------------------------------------------------------
app.use("/api/health", healthRouter);

// Any other /api/... URL is a JSON 404 (not the React page).
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---- Frontend -------------------------------------------------------------
// In production this server also serves the built React app (client/dist).
// The path is the same whether we run from src/ (dev) or dist/ (production):
// both sit two levels below the folder that contains client/.
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));

// React handles its own page routes (e.g. /login), so for any other GET
// request we send back index.html and let React decide what to show.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next(); // client isn't built (normal in dev) -> falls through to 404
  });
});

// ---- Errors ---------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ---- Start and stop -------------------------------------------------------
const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
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
