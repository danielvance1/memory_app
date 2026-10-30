import path from "node:path";
import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { loadConfig, type AppConfig } from "./config";
import { loadUser } from "./auth/middleware";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { codesRouter } from "./routes/codes";
import { healthRouter } from "./routes/health";
import { meRouter } from "./routes/me";

// Builds the Express app without starting it, so tests can run it directly.
export function createApp(config: AppConfig = loadConfig()): Express {
  const app = express();
  app.disable("x-powered-by"); // don't advertise the framework

  // In production, Caddy sits in front of this server. Trusting one proxy hop
  // lets Express see the visitor's real IP address and whether they used HTTPS
  // (needed for rate limiting and for the Secure cookie flag).
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "10kb" })); // reject oversized request bodies
  app.use(cookieParser());

  // ---- API ------------------------------------------------------------------
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store"); // account data must never be cached
    next();
  });
  app.use("/api/health", healthRouter);

  app.use("/api", loadUser); // figure out who's logged in for everything below
  app.use("/api/auth", authRouter(config));
  app.use("/api/admin", adminRouter(config));
  app.use("/api/me", meRouter());
  app.use("/api/codes", codesRouter());

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
    // Malformed or oversized JSON is the caller's mistake, not a server bug.
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    if (status === 400 || status === 413) {
      res.status(status).json({ error: status === 413 ? "Request too large." : "Invalid request body." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
