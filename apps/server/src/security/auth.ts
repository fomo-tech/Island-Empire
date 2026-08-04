import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export type AuthUser = {
  id: string;
  role: "player" | "admin";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "unauthorized", message: "Missing token" });
  try {
    req.user = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin role required" });
  }
  return next();
}
