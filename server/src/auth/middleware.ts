import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, findUserBySessionToken } from "./sessions";
import "./types"; // brings in the `req.user` type

// Runs on every /api request. If the browser sent a valid session cookie,
// attach the logged-in user to the request; otherwise leave `req.user` empty.
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token.length > 0) {
    req.user = (await findUserBySessionToken(token)) ?? undefined;
  }
  next();
}

// Use on routes that need a logged-in user.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please log in." });
    return;
  }
  next();
}

// Use on routes that only admins may call. 401 = not logged in, 403 = logged in but not allowed.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please log in." });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Admins only." });
    return;
  }
  next();
}
