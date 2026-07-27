import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { AdminOverview, ServerStatus } from "@island/shared";
import { collections } from "../db/collections.js";
import { config, corsOrigins } from "../config.js";
import { requireAdmin, requireAuth, signToken } from "../security/auth.js";

const LoginSchema = z.object({
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(200),
});

const SaveSchema = z.object({
  resources: z.object({
    gold: z.number().nonnegative(),
    wood: z.number().nonnegative(),
    stone: z.number().nonnegative(),
    gems: z.number().nonnegative(),
  }),
  towns: z.array(
    z.object({
      id: z.number().int().positive(),
      level: z.number().int().positive(),
      ownerId: z.string().min(1),
      troops: z.number().int().nonnegative(),
    }),
  ),
});

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "128kb" }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("CORS origin blocked"));
      },
      credentials: false,
    }),
  );
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

  app.get("/api/health", (_req, res) => {
    const payload: ServerStatus = { ok: true, service: "island-empire-api", time: new Date().toISOString() };
    res.json(payload);
  });

  app.post("/api/auth/admin/login", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "Invalid login payload" });
    const { username, password } = parsed.data;
    if (username !== config.ADMIN_USER || password !== config.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    }
    const token = signToken({ id: "admin", role: "admin" });
    res.json({ token });
  });

  app.post("/api/auth/player/register", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Tài khoản (3-40 ký tự) hoặc mật khẩu (8-200 ký tự) không hợp lệ" });
    }
    const { username, password } = parsed.data;
    const normalizedUsername = username.trim();
    const id = `player:${normalizedUsername.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    
    const { players } = await collections();
    
    const existingPlayer = await players.findOne({ _id: id });
    if (existingPlayer) {
      return res.status(400).json({ error: "username_taken", message: "Tên tài khoản đã tồn tại" });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    await players.insertOne({
      _id: id,
      name: normalizedUsername,
      passwordHash,
      role: "player",
      createdAt: now,
      lastSeenAt: now,
    });
    
    const token = signToken({ id, role: "player" });
    res.json({ token, playerId: id });
  });

  app.post("/api/auth/player/login", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Tài khoản hoặc mật khẩu không hợp lệ" });
    }
    const { username, password } = parsed.data;
    const id = `player:${username.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    
    const { players } = await collections();
    const player = await players.findOne({ _id: id });
    
    if (!player || !player.passwordHash) {
      return res.status(401).json({ error: "unauthorized", message: "Sai tài khoản hoặc mật khẩu" });
    }
    
    const isPasswordValid = await bcrypt.compare(password, player.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "unauthorized", message: "Sai tài khoản hoặc mật khẩu" });
    }
    
    const now = new Date();
    await players.updateOne({ _id: id }, { $set: { lastSeenAt: now } });
    
    const token = signToken({ id, role: "player" });
    res.json({ token, playerId: id });
  });

  app.post("/api/auth/player/guest", async (req, res) => {
    const name = z.string().min(2).max(24).catch(`PLAYER-${Math.floor(Math.random() * 9999)}`).parse(req.body?.name);
    const id = `guest:${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const { players } = await collections();
    const now = new Date();
    await players.updateOne(
      { _id: id },
      { $set: { name, role: "player", lastSeenAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    res.json({ token: signToken({ id, role: "player" }), playerId: id });
  });

  app.get("/api/save/me", requireAuth, async (req, res) => {
    const { saves } = await collections();
    const save = await saves.findOne({ playerId: req.user!.id });
    res.json(save ?? null);
  });

  app.put("/api/save/me", requireAuth, async (req, res) => {
    const parsed = SaveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "Invalid save payload" });
    const { saves } = await collections();
    const now = new Date();
    await saves.updateOne(
      { playerId: req.user!.id },
      { $set: { ...parsed.data, updatedAt: now }, $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id } },
      { upsert: true },
    );
    res.json({ ok: true, updatedAt: now.toISOString() });
  });

  app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res) => {
    const { players, saves } = await collections();
    const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [playerCount, saveCount, activeToday] = await Promise.all([
      players.countDocuments(),
      saves.countDocuments(),
      players.countDocuments({ lastSeenAt: { $gte: today } }),
    ]);
    const payload: AdminOverview = { players: playerCount, saves: saveCount, activeToday };
    res.json(payload);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });

  return app;
}
