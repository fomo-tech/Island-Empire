import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  generateWorldTerritories,
} from "@island/shared";
import type {
  AdminOverview,
  AdminPlayer,
  AdminPlayersResult,
  AllianceActionResult,
  AllianceAid,
  AllianceInfo,
  AllianceStateResult,
  ResourceBag,
  ResourceKey,
  TerritoryInfo,
  AdminTerritoriesResult,
  ServerStatus,
  WorldTerritoriesResult,
  ClaimTerritoryResult,
  GameStateResult,
  StartClearingResult,
  CompleteClearingResult,
  CreateMarchResult,
  GameConfig,
  ActiveClearing,
  ActiveBattle,
} from "@island/shared";
import { collections, type TerritoryClearingDocument } from "../db/collections.js";
import { config, isAllowedCorsOrigin } from "../config.js";
import { requireAdmin, requireAuth, signToken } from "../security/auth.js";
import { publishRealtime, realtimeStats } from "../realtime/socket.js";
import { bumpWorldCacheVersion, cacheGetJson, cacheSetJson, getWorldCacheVersion } from "../cache.js";

const MAX_AID_RESOURCE_AMOUNT = 2_000_000;
const MAX_RECRUIT_BATCH = 25;
const MAX_MARCH_UNIT_COUNT = 250_000;
const MAX_ACTIVE_MARCHES_PER_PLAYER = 6;
const ALLIANCE_CREATE_GEMS_COST = 100;
const ALLIANCE_MAX_MEMBERS = 20;
const ALLIANCE_AID_MAX_TROOPS = 500;

const AntiBotProofSchema = z.object({
  challengeToken: z.string().min(32).max(600),
  proof: z.number().int().nonnegative().max(2_147_483_647),
});

const LoginSchema = z.object({
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(200),
}).merge(AntiBotProofSchema);

const AdminLoginSchema = z.object({
  username: z.string().min(3).max(80),
  password: z.string().min(8).max(200),
});

const RegisterSchema = LoginSchema.extend({
  flagColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#2f70d7"),
  emblem: z.enum(["shield", "tree", "mountain", "anchor"]).default("shield"),
  starterLandId: z.enum(["north-forest", "west-hills", "east-coast", "south-river"]).default("north-forest"),
});

const StartClearingSchema = z.object({
  territoryId: z.number().int().nonnegative(),
});

const ActiveMapSchema = z.object({
  activeMap: z.enum(["world", "conquest"]),
});

const CreateMarchSchema = z.object({
  fromTerritoryId: z.number().int().nonnegative(),
  toTerritoryId: z.number().int().nonnegative(),
  troops: z.number().int().positive().max(MAX_MARCH_UNIT_COUNT),
  infantry: z.number().int().nonnegative().max(MAX_MARCH_UNIT_COUNT).default(0),
  cavalry: z.number().int().nonnegative().max(MAX_MARCH_UNIT_COUNT).default(0),
  artillery: z.number().int().nonnegative().max(MAX_MARCH_UNIT_COUNT).default(0),
  battleSide: z.enum(["attacker", "defender"]).optional(),
  kind: z.enum(["attack", "reinforce", "move"]).default("attack"),
});

const RecruitTroopsSchema = z.object({
  territoryId: z.number().int().nonnegative().optional(),
  townId: z.number().int().nonnegative().optional(),
  unitType: z.enum(["infantry", "cavalry", "artillery"]),
  count: z.number().int().positive().max(MAX_RECRUIT_BATCH).default(1),
  requestId: z.string().trim().min(12).max(120).optional(),
});

const CreateAllianceSchema = z.object({
  name: z.string().trim().min(3).max(32),
  tag: z.string().trim().min(2).max(6).regex(/^[a-zA-Z0-9]+$/),
  emblem: z.enum(["shield", "star", "tower", "anchor", "flame"]).default("shield"),
});

const JoinAllianceSchema = z.object({
  allianceId: z.string().min(3).max(80),
});

const SendAllianceAidSchema = z.object({
  toPlayerId: z.string().min(3).max(120),
  resources: z.object({
    gold: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    wood: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    stone: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    food: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    iron: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    coal: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    sulfur: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
    gems: z.number().int().nonnegative().max(MAX_AID_RESOURCE_AMOUNT).default(0),
  }).default({}),
  troops: z.number().int().nonnegative().max(ALLIANCE_AID_MAX_TROOPS).default(0),
});

const RESOURCE_KEYS: ResourceKey[] = ["gold", "wood", "stone", "food", "iron", "coal", "sulfur", "gems"];
const DEFAULT_PLAYER_RESOURCES: ResourceBag = {
  gold: 1250,
  wood: 830,
  stone: 670,
  food: 920,
  iron: 260,
  coal: 120,
  sulfur: 80,
  gems: 420,
};
const BASE_RESOURCE_CAPACITY: ResourceBag = {
  gold: 1800,
  wood: 2800,
  stone: 2400,
  food: 3200,
  iron: 1400,
  coal: 900,
  sulfur: 520,
  gems: 240,
};
const TERRITORY_RESOURCE_CAPACITY: ResourceBag = {
  gold: 900,
  wood: 1400,
  stone: 1200,
  food: 1600,
  iron: 700,
  coal: 500,
  sulfur: 300,
  gems: 120,
};
const MAX_OFFLINE_RESOURCE_SECONDS = 24 * 60 * 60;

type ActionBucket = { count: number; resetAt: number };
const actionBuckets = new Map<string, ActionBucket>();
const playerMutationLocks = new Map<string, Promise<void>>();
const recruitRequestResults = new Map<string, { expiresAt: number; result: any }>();

async function acquirePlayerMutationLock(playerId: string) {
  const previous = playerMutationLocks.get(playerId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  playerMutationLocks.set(playerId, previous.then(() => current));
  await previous;
  return () => {
    release();
    if (playerMutationLocks.get(playerId) === current) playerMutationLocks.delete(playerId);
  };
}

function cachedRecruitResult(playerId: string, requestId?: string) {
  if (!requestId) return null;
  const key = `${playerId}:${requestId}`;
  const cached = recruitRequestResults.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    recruitRequestResults.delete(key);
    return null;
  }
  return cached.result;
}

function rememberRecruitResult(playerId: string, requestId: string | undefined, result: any) {
  if (!requestId) return;
  if (recruitRequestResults.size > 10_000) {
    const now = Date.now();
    recruitRequestResults.forEach((entry, key) => {
      if (entry.expiresAt <= now) recruitRequestResults.delete(key);
    });
  }
  recruitRequestResults.set(`${playerId}:${requestId}`, {
    expiresAt: Date.now() + 10 * 60_000,
    result,
  });
}

function consumeActionLimit(playerId: string, action: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (actionBuckets.size > 20_000) {
    actionBuckets.forEach((bucket, key) => {
      if (bucket.resetAt <= now) actionBuckets.delete(key);
    });
  }
  const key = `${playerId}:${action}`;
  const existing = actionBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    actionBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(250, existing.resetAt - now) };
  }
  existing.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

function enforceActionLimit(req: any, res: any, action: string, limit: number, windowMs: number) {
  const playerId = req.user?.id || req.ip || "anonymous";
  const result = consumeActionLimit(playerId, action, limit, windowMs);
  if (result.ok) return true;
  res.setHeader("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
  res.status(429).json({ error: "rate_limited", message: "Bạn thao tác quá nhanh, vui lòng chờ một chút" });
  return false;
}

const usedAntiBotChallenges = new Map<string, number>();
const ANTI_BOT_DIFFICULTY = 3;
const ANTI_BOT_TTL_MS = 2 * 60_000;

function antiBotIp(req: any) {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function signAntiBotPayload(payload: string) {
  return createHmac("sha256", config.ANTI_BOT_SECRET).update(payload).digest("base64url");
}

function createAntiBotChallenge(req: any) {
  const payload = Buffer.from(JSON.stringify({
    nonce: randomBytes(18).toString("base64url"),
    ip: antiBotIp(req),
    expiresAt: Date.now() + ANTI_BOT_TTL_MS,
    difficulty: ANTI_BOT_DIFFICULTY,
  })).toString("base64url");
  return { token: `${payload}.${signAntiBotPayload(payload)}`, difficulty: ANTI_BOT_DIFFICULTY, expiresInSeconds: ANTI_BOT_TTL_MS / 1000 };
}

function verifyAntiBotProof(req: any, proof: { challengeToken: string; proof: number }) {
  const [payload, signature, extra] = proof.challengeToken.split(".");
  if (!payload || !signature || extra) return false;
  const expected = signAntiBotPayload(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  let challenge: { nonce?: string; ip?: string; expiresAt?: number; difficulty?: number };
  try {
    challenge = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!challenge.nonce || challenge.ip !== antiBotIp(req) || !Number.isFinite(challenge.expiresAt) || challenge.expiresAt! <= Date.now()) return false;
  if (usedAntiBotChallenges.has(proof.challengeToken)) return false;
  const prefix = "0".repeat(Math.max(1, Math.min(6, Math.floor(challenge.difficulty || 0))));
  const digest = createHash("sha256").update(`${challenge.nonce}:${proof.proof}`).digest("hex");
  if (!digest.startsWith(prefix)) return false;
  usedAntiBotChallenges.set(proof.challengeToken, challenge.expiresAt!);
  if (usedAntiBotChallenges.size > 10_000) {
    const now = Date.now();
    usedAntiBotChallenges.forEach((expiresAt, token) => { if (expiresAt <= now) usedAntiBotChallenges.delete(token); });
  }
  return true;
}

function enforceAuthAttempt(req: any, res: any, action: "login" | "register" | "guest", identity?: string) {
  const ipResult = consumeActionLimit(`auth-ip:${antiBotIp(req)}`, action, action === "guest" ? 3 : 6, 60_000);
  const normalizedIdentity = String(identity || "").trim().toLowerCase();
  const identityResult = normalizedIdentity
    ? consumeActionLimit(`auth-id:${normalizedIdentity}`, action, action === "register" ? 3 : 5, 60_000)
    : { ok: true, retryAfterMs: 0 };
  const blocked = !ipResult.ok ? ipResult : !identityResult.ok ? identityResult : null;
  if (!blocked) return true;
  res.setHeader("Retry-After", String(Math.ceil(blocked.retryAfterMs / 1000)));
  res.status(429).json({ error: "rate_limited", message: "Bạn thao tác quá nhanh, vui lòng chờ một chút" });
  return false;
}

function emptyResources(): ResourceBag {
  return { gold: 0, wood: 0, stone: 0, food: 0, iron: 0, coal: 0, sulfur: 0, gems: 0 };
}

function normalizeResources(resources?: Partial<ResourceBag>): ResourceBag {
  const bag = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    const value = resources?.[key];
    bag[key] = Number.isFinite(value) ? Math.max(0, Number(value)) : DEFAULT_PLAYER_RESOURCES[key];
  });
  return bag;
}

function compactResourceDelta(resources: Partial<ResourceBag>) {
  const compact: Partial<ResourceBag> = {};
  RESOURCE_KEYS.forEach((key) => {
    const value = Math.floor(Number(resources[key] || 0));
    if (value > 0) compact[key] = value;
  });
  return compact;
}

function resourceCapacityForOwnedTerritories(ownedCount: number): ResourceBag {
  const cap = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    cap[key] = BASE_RESOURCE_CAPACITY[key] + Math.max(0, ownedCount) * TERRITORY_RESOURCE_CAPACITY[key];
  });
  return cap;
}

// Static biome name map
const BIOME_NAMES: Record<number, string> = {
  0: "Cỏ xanh",
  1: "Sa mạc",
  2: "Tuyết",
  3: "Lửa / Ember",
  4: "Ma thuật tím",
  5: "Hoa hồng",
  6: "Rừng thông",
  7: "Đầm lầy",
};

/**
 * BASE resource yield rates per second at "standard size" (rx=100, ry=100 → area=10,000).
 * Actual yield is scaled by (rx * ry / 10000).
 * Islets gain a ×2.5 rare-resource bonus on gems (they are harder to reach).
 */
const BIOME_BASE_YIELDS: Record<number, { gold: number; wood: number; stone: number; food: number; iron: number; coal: number; sulfur: number; gems: number }> = {
  0: { gold: 0.003, wood: 0.010, stone: 0.006, food: 0.030, iron: 0.0015, coal: 0.0008, sulfur: 0.0004, gems: 0.0002 }, // Đồng bằng: lương nhiều, gỗ/đá ít
  1: { gold: 0.018, wood: 0.001, stone: 0.012, food: 0.003, iron: 0.0030, coal: 0.0010, sulfur: 0.0010, gems: 0.0040 }, // Sa mạc: vàng/đá quý, thiếu gỗ/lương
  2: { gold: 0.002, wood: 0.003, stone: 0.020, food: 0.003, iron: 0.0160, coal: 0.0080, sulfur: 0.0010, gems: 0.0020 }, // Núi tuyết: đá, sắt, than
  3: { gold: 0.004, wood: 0.001, stone: 0.018, food: 0.001, iron: 0.0200, coal: 0.0180, sulfur: 0.0140, gems: 0.0020 }, // Núi lửa: khoáng sản nặng
  4: { gold: 0.005, wood: 0.003, stone: 0.010, food: 0.003, iron: 0.0050, coal: 0.0010, sulfur: 0.0020, gems: 0.0140 }, // Mỏ ngọc: đá quý
  5: { gold: 0.010, wood: 0.008, stone: 0.004, food: 0.022, iron: 0.0020, coal: 0.0010, sulfur: 0.0005, gems: 0.0020 }, // Vùng màu mỡ: lương + vàng
  6: { gold: 0.002, wood: 0.026, stone: 0.012, food: 0.010, iron: 0.0040, coal: 0.0030, sulfur: 0.0005, gems: 0.0005 }, // Rừng/vùng cao: gỗ nhiều, đá vừa
  7: { gold: 0.003, wood: 0.016, stone: 0.003, food: 0.018, iron: 0.0020, coal: 0.0060, sulfur: 0.0040, gems: 0.0010 }, // Đầm lầy: lương/gỗ, than/lưu huỳnh ít
};

// Biome clearing difficulty multipliers (applied on top of area-based time)
const BIOME_CLEAR_MULT: Record<number, number> = {
  0: 1.0,
  1: 1.25,
  2: 1.55,
  3: 1.75,
  4: 1.45,
  5: 1.1,
  6: 1.25,
  7: 1.65,
};

// Labels for the dominant resource of each biome
const BIOME_PRIMARY: Record<number, string> = {
  0: "Lương thực + Gỗ",
  1: "Vàng + Đá quý",
  2: "Sắt + Đá + Than",
  3: "Sắt + Lưu huỳnh + Than",
  4: "Đá quý + Đá",
  5: "Lương thực + Vàng",
  6: "Gỗ + Đá",
  7: "Gỗ + Lương thực + Than",
};

/**
 * Calculate clearing time (seconds) based on area and biome difficulty.
 *
 * Formula:
 *   area      = rx * ry
 *   baseTime  = area / 650          → standard area 10,000 → 15s base
 *   finalTime = baseTime * biomeMult
 *   Clamped between 8s (minimum) and 180s (maximum)
 */
function calcClearingSeconds(rx: number, ry: number, biome: number, settlerSpeed = 35, gameHourSeconds = 30): number {
  const area = rx * ry;
  const baseTime = (area / 650) * 1.8;
  const speedScale = 35 / Math.max(1, settlerSpeed);
  const clockScale = Math.max(1, gameHourSeconds) / 30;
  const finalTime = baseTime * (BIOME_CLEAR_MULT[biome] ?? 1.0) * speedScale * clockScale;
  return Math.max(15, Math.min(600, Math.round(finalTime)));
}

/**
 * Calculate scaled yields. 
 * areaFactor = (rx * ry) / 10000    → 1.0 at "standard" size 100×100
 *
 * Islet bonus: gems × 2.8, sulfur × 1.25, gold × 1.25 (rare island treasures)
 * Islet penalty: wood × 0.3, stone × 0.5, food × 0.45, iron × 0.55, coal × 0.35
 */
function calcYields(rx: number, ry: number, biome: number, isIslet: boolean) {
  const base = BIOME_BASE_YIELDS[biome] ?? BIOME_BASE_YIELDS[0];
  const areaFactor = (rx * ry) / 10000;

  let gold  = base.gold  * areaFactor;
  let wood  = base.wood  * areaFactor;
  let stone = base.stone * areaFactor;
  let food = base.food * areaFactor;
  let iron = base.iron * areaFactor;
  let coal = base.coal * areaFactor;
  let sulfur = base.sulfur * areaFactor;
  let gems  = base.gems  * areaFactor;

  if (isIslet) {
    gold  *= 1.25;
    wood  *= 0.3;
    stone *= 0.5;
    food *= 0.45;
    iron *= 0.55;
    coal *= 0.35;
    sulfur *= 1.25;
    gems  *= 2.8;
  }

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    yieldGold: round3(gold),
    yieldWood: round3(wood),
    yieldStone: round3(stone),
    yieldFood: round3(food),
    yieldIron: round3(iron),
    yieldCoal: round3(coal),
    yieldSulfur: round3(sulfur),
    yieldGems: round3(gems),
  };
}

function calcSpecialResources(t: { id: number; isIslet: boolean; biome: number; rx: number; ry: number; coastal?: boolean }) {
  const specials: string[] = [];
  const area = t.rx * t.ry;

  // Horse Pasture ("Bãi ngựa") - abundant (~40% of territories)
  if ((t.biome === 0 || t.biome === 1 || t.biome === 5 || t.biome === 6) || t.id % 3 !== 0) {
    if (area >= 6500) specials.push("Bãi ngựa");
  }

  // Siege Workshop ("Xưởng đúc pháo") - abundant (~40% of territories)
  if ((t.biome === 2 || t.biome === 3 || t.biome === 4 || t.biome === 6 || t.biome === 7) || t.id % 2 === 1) {
    specials.push("Xưởng đúc pháo");
  }

  // Natural Harbor ("Bến tàu tự nhiên") - chỉ xuất hiện ở vùng ven biển
  if (t.isIslet || t.coastal) {
    specials.push("Bến tàu tự nhiên");
  }

  if ((t.biome === 2 || t.biome === 3 || t.biome === 4 || t.biome === 6) && t.id % 2 === 0) specials.push("Mỏ sắt");
  if ((t.biome === 1 || t.biome === 2 || t.biome === 3 || t.biome === 6) && area >= 14000) specials.push("Mỏ đá");
  if ((t.biome === 1 || t.biome === 5 || t.biome === 3) && t.id % 3 === 1) specials.push("Mạch vàng");
  if ((t.biome === 1 || t.biome === 4 || t.isIslet) && t.id % 4 === 2) specials.push("Mỏ đá quý");
  if ((t.biome === 2 || t.biome === 3 || t.biome === 7) && t.id % 3 === 0) specials.push("Vỉa than");
  if (t.biome === 3 || (t.biome === 7 && t.id % 4 === 0)) specials.push("Mỏ lưu huỳnh");

  return Array.from(new Set(specials));
}

// Static territory list matching the game engine
function buildStaticTerritoryList(): Omit<TerritoryInfo, "ownerId">[] {
  const territories: Omit<TerritoryInfo, "ownerId">[] = [];
  const baseList = generateWorldTerritories();

  baseList.forEach((t) => {
    const yields = calcYields(t.rx, t.ry, t.biome, t.isIslet);
    territories.push({
      id: t.id,
      isIslet: t.isIslet,
      coastal: t.coastal,
      biome: t.biome,
      biomeName: BIOME_NAMES[t.biome] ?? "Không rõ",
      rx: t.rx,
      ry: t.ry,
      x: t.x,
      y: t.y,
      clearingSeconds: calcClearingSeconds(t.rx, t.ry, t.biome),
      primaryResource: BIOME_PRIMARY[t.biome] ?? "—",
      specialResources: calcSpecialResources(t),
      ...yields,
    });
  });

  return territories;
}

function getStaticTerritory(id: number) {
  return buildStaticTerritoryList().find((territory) => territory.id === id);
}

function territoryConnectionType(
  source: NonNullable<ReturnType<typeof getStaticTerritory>>,
  target: NonNullable<ReturnType<typeof getStaticTerritory>>,
): "land" | "sea" | null {
  const dx = Math.abs(source.x - target.x);
  const dy = Math.abs(source.y - target.y);
  const centerDistance = Math.hypot(dx, dy);

  const sourceHasPort = Boolean(
    source.isIslet || source.coastal || source.specialResources?.includes("Bến tàu tự nhiên")
  );

  // RULE 1: If source is an Island (isIslet) or has Harbor, allow sea connection to any island/coastal within 2500px sea radius
  if (source.isIslet) {
    return centerDistance <= 2500 ? "sea" : null;
  }

  // RULE 2: If target is an Island (isIslet): source MUST have a harbor ("Bến tàu tự nhiên" or islet)!
  if (target.isIslet) {
    if (!sourceHasPort) return null;
    if (centerDistance > 2600) return null;
    const allTerritories = buildStaticTerritoryList();
    let minIslandDist = Infinity;
    for (const t of allTerritories) {
      if (t.id !== source.id && t.isIslet) {
        const d = Math.hypot(source.x - t.x, source.y - t.y);
        if (d < minIslandDist) minIslandDist = d;
      }
    }
    return centerDistance <= minIslandDist + 200 ? "sea" : null;
  }

  // RULE 3: Mainland to Mainland: strict 1-tile adjacent border touching
  const sumRx = (source.rx || 100) + (target.rx || 100);
  const sumRy = (source.ry || 100) + (target.ry || 100);
  const normDistSq = (dx / sumRx) ** 2 + (dy / sumRy) ** 2;
  return normDistSq <= 0.85 ? "land" : null;
}

function nearestExpansionSource(
  claims: Array<{ territoryId: number; parentTerritoryId?: number; settlementKind?: string; claimedAt?: Date }>,
  target: NonNullable<ReturnType<typeof getStaticTerritory>>,
) {
  return claims
    .map((claim) => {
      const territory = getStaticTerritory(claim.territoryId);
      if (!territory || !isClaimConnectedToCapital(claims, claim.territoryId)) return null;
      const connectionType = territoryConnectionType(territory, target);
      if (!connectionType) return null;
      return {
        claim,
        territory,
        connectionType,
        distance: Math.hypot(territory.x - target.x, territory.y - target.y),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) =>
      a.distance - b.distance
      || (a.claim.claimedAt?.getTime() || 0) - (b.claim.claimedAt?.getTime() || 0)
      || a.territory.id - b.territory.id,
    )[0];
}

function isClaimConnectedToCapital(claims: Array<{ territoryId: number; parentTerritoryId?: number; settlementKind?: string; claimedAt?: Date }>, territoryId: number) {
  const byId = new Map(claims.map((claim) => [claim.territoryId, claim]));
  const capitals = claims.filter((claim) => claim.settlementKind === "capital" || claim.settlementKind === "sub_capital");
  if (capitals.length === 0) {
    const oldest = [...claims].sort((a, b) => (a.claimedAt?.getTime() || 0) - (b.claimedAt?.getTime() || 0))[0];
    if (oldest) capitals.push(oldest);
  }
  const capitalIds = new Set(capitals.map((c) => c.territoryId));
  if (capitalIds.size === 0 || !byId.has(territoryId)) return false;
  const visited = new Set<number>();
  let current = byId.get(territoryId);
  while (current && !visited.has(current.territoryId)) {
    if (capitalIds.has(current.territoryId)) return true;
    visited.add(current.territoryId);
    if (current.parentTerritoryId === undefined) return false;
    current = byId.get(current.parentTerritoryId);
  }
  return false;
}

/** Automatically prunes & destroys any territories for playerId that lost their connectivity chain to the capital. */
async function pruneDisconnectedClaims(playerId: string) {
  if (!playerId) return [];
  const { territoryClaims, territoryClearings, saves } = await collections();
  const claims = await territoryClaims.find({ playerId }).toArray();
  if (claims.length <= 1) return [];

  const capitals = claims.filter((c) => c.settlementKind === "capital" || c.settlementKind === "sub_capital");
  if (capitals.length === 0) {
    const oldest = [...claims].sort((a, b) => (a.claimedAt?.getTime() || 0) - (b.claimedAt?.getTime() || 0))[0];
    if (oldest) capitals.push(oldest);
  }
  if (capitals.length === 0) return [];

  const connectedIds = new Set<number>();
  const queue: number[] = capitals.map((c) => c.territoryId);
  capitals.forEach((c) => connectedIds.add(c.territoryId));

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = claims.filter(
      (c) => !connectedIds.has(c.territoryId) && c.parentTerritoryId === currentId
    );
    for (const child of children) {
      connectedIds.add(child.territoryId);
      queue.push(child.territoryId);
    }
  }

  const disconnectedClaims = claims.filter((c) => !connectedIds.has(c.territoryId));
  if (disconnectedClaims.length === 0) return [];

  const disconnectedIds = disconnectedClaims.map((c) => c.territoryId);

  await Promise.all([
    territoryClaims.deleteMany({ playerId, territoryId: { $in: disconnectedIds } }),
    territoryClearings.deleteMany({ playerId, territoryId: { $in: disconnectedIds } }),
  ]);

  const saveDoc = await saves.findOne({ playerId });
  if (saveDoc && Array.isArray(saveDoc.towns)) {
    const remainingTowns = saveDoc.towns.filter((town: any) => !disconnectedIds.includes(town.id));
    await saves.updateOne({ playerId }, { $set: { towns: remainingTowns } });
  }

  publishRealtime({
    type: "territories_pruned",
    playerId,
    prunedTerritoryIds: disconnectedIds,
  });

  await bumpWorldCacheVersion();
  return disconnectedIds;
}


function townIdForTerritory(territoryId: number, requestedTownId?: number) {
  return Number.isInteger(requestedTownId) && requestedTownId! >= 0 ? requestedTownId! : 9000 + territoryId;
}

function territoryAreaFactorForTown(territory: Pick<TerritoryInfo, "rx" | "ry">) {
  return Math.max(0.7, Math.min(2.4, (territory.rx * territory.ry) / 10000));
}

function territoryStartingPopulationForTown(territory: Pick<TerritoryInfo, "rx" | "ry" | "biome" | "isIslet">, ownerCode = 1) {
  const biomePopMult = [1.25, 0.65, 0.55, 0.45, 0.8, 1.35, 0.95, 0.75][territory.biome ?? 0] || 1;
  const isletPenalty = territory.isIslet ? 0.55 : 1;
  const base = ownerCode === 1 ? 24 : 48;
  // Every new capital must be able to send the minimum ten settlers and still retain its garrison village.
  return Math.max(80, Math.round(base + territoryAreaFactorForTown(territory) * 28 * biomePopMult * isletPenalty));
}

function townStorageCapacityForTerritory(town: any, territory?: Pick<TerritoryInfo, "rx" | "ry">): ResourceBag {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const warehouse = Math.max(0, Math.floor(Number(town?.buildings?.warehouse || 0) || 0));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const areaFactor = territory ? territoryAreaFactorForTown(territory) : 1;
  const capacity = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    const base = TERRITORY_RESOURCE_CAPACITY[key];
    const warehouseBonus = base * warehouse * 0.55;
    const fortBonus = (key === "food" || key === "iron" || key === "sulfur") ? base * fort * 0.1 : 0;
    const levelBonus = base * Math.max(0, level - 1) * 0.12;
    capacity[key] = Math.max(1, Math.round((base + warehouseBonus + fortBonus + levelBonus) * areaFactor));
  });
  return capacity;
}

function townPopulationCapacityForTerritory(town: any, territory?: Pick<TerritoryInfo, "rx" | "ry">) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const areaBonus = territory ? Math.round(territoryAreaFactorForTown(territory) * 18) : 18;
  return Math.max(80, 64 + level * 36 + fort * 24 + areaBonus);
}

function townPopulationGrowthPerSecond(town: any) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  return Math.round(((1 / 120) + Math.max(0, level - 1) * (1 / 160) + fort * (1 / 240)) * 100000) / 100000;
}

function settleTownPopulation(town: any, now = new Date()) {
  const capacity = Math.max(1, Math.floor(Number(town?.populationCapacity) || townPopulationCapacityForTerritory(town)));
  const current = Math.max(0, Math.min(capacity, Number(town?.population ?? 0) || 0));
  const lastAt = town?.lastPopulationAt ? new Date(town.lastPopulationAt) : now;
  const elapsedSeconds = Number.isFinite(lastAt.getTime())
    ? Math.max(0, Math.min(MAX_OFFLINE_RESOURCE_SECONDS, Math.floor((now.getTime() - lastAt.getTime()) / 1000)))
    : 0;
  const rate = townPopulationGrowthPerSecond(town);
  return {
    population: Math.min(capacity, Math.floor((current + rate * elapsedSeconds) * 100) / 100),
    populationCapacity: capacity,
    populationPerSecond: rate,
    lastPopulationAt: now.toISOString(),
  };
}

function defaultTownSnapshotForTerritory(territory: NonNullable<ReturnType<typeof getStaticTerritory>>, playerId: string, townId?: number) {
  const population = territoryStartingPopulationForTown(territory, 1);
  return {
    id: townIdForTerritory(territory.id, townId),
    level: 2,
    lvl: 2,
    ownerId: playerId,
    troops: 24,
    population,
    x: territory.x,
    y: territory.y,
    infantryCount: 24,
    cavalryCount: 0,
    artilleryCount: 0,
    buildings: {
      barracks: 0,
      lumberCamp: 0,
      quarry: 0,
      goldMine: 0,
      gemCutter: 0,
      fort: 0,
      siegeWorkshop: 0,
      warehouse: 0,
    },
    storage: {},
    storageCapacity: townStorageCapacityForTerritory({ level: 2 }, territory),
    productionPerSecond: compactResourceDelta(productionForClaims([{ territoryId: territory.id }])),
    populationCapacity: townPopulationCapacityForTerritory({ level: 2 }, territory),
    populationPerSecond: townPopulationGrowthPerSecond({ level: 2 }),
    lastPopulationAt: new Date().toISOString(),
    maxTroops: population * 10,
  };
}

function normalizeTownSnapshotForState(town: any, playerId: string, territory?: NonNullable<ReturnType<typeof getStaticTerritory>> | TerritoryInfo, now = new Date()) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 2) || 2));
  const startingPopulation = territory ? territoryStartingPopulationForTown(territory, 1) : 32;
  const storedPopulation = town?.population === undefined || town?.population === null
    ? startingPopulation
    : Math.max(0, Number(town.population) || 0);
  const buildings = {
    barracks: 0,
    lumberCamp: 0,
    quarry: 0,
    goldMine: 0,
    gemCutter: 0,
    fort: 0,
    siegeWorkshop: 0,
    warehouse: 0,
    ...(town?.buildings || {}),
  };
  const normalized = {
    ...town,
    level,
    lvl: level,
    population: storedPopulation,
    buildings,
  };
  const storageCapacity = townStorageCapacityForTerritory(normalized, territory);
  const populationState = settleTownPopulation({
    ...normalized,
    populationCapacity: townPopulationCapacityForTerritory(normalized, territory),
  }, now);
  const territoryProduction = territory
    ? productionForClaims([{ territoryId: territory.id }])
    : emptyResources();
  return {
    ...town,
    level,
    lvl: level,
    ownerId: town?.ownerId || playerId,
    ...populationState,
    troops: Math.max(0, Math.floor(Number(town?.troops ?? 0) || 0)),
    infantryCount: Math.max(0, Math.floor(Number(town?.infantryCount ?? town?.troops ?? 0) || 0)),
    cavalryCount: Math.max(0, Math.floor(Number(town?.cavalryCount ?? 0) || 0)),
    artilleryCount: Math.max(0, Math.floor(Number(town?.artilleryCount ?? 0) || 0)),
    buildings,
    storage: { ...(town?.storage || {}) },
    storageCapacity,
    productionPerSecond: territoryProduction,
    maxTroops: populationState.populationCapacity * 10,
  };
}

function townSnapshotsForPlayer(
  saveTowns: any[] | undefined,
  territories: Array<NonNullable<ReturnType<typeof getStaticTerritory>> | TerritoryInfo>,
  playerId: string,
  resources?: ResourceBag,
  now = new Date(),
) {
  const towns = Array.isArray(saveTowns)
    ? saveTowns.map((town) => {
      const territory = territories.find((item) => Math.hypot((town?.x ?? 0) - item.x, (town?.y ?? 0) - item.y) < 96);
      return normalizeTownSnapshotForState(town, playerId, territory, now);
    })
    : [];
  territories
    .filter((territory) => (territory as any).ownerId === playerId)
    .forEach((territory) => {
      const townId = townIdForTerritory(territory.id);
      const existingIndex = towns.findIndex((town: any) =>
        town?.id === townId ||
        Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) < 96
      );
      const baseTown = existingIndex >= 0 ? towns[existingIndex] : defaultTownSnapshotForTerritory(territory, playerId, townId);
      const normalized = normalizeTownSnapshotForState({
        ...baseTown,
        ownerId: playerId,
        x: territory.x,
        y: territory.y,
      }, playerId, territory, now);
      if (existingIndex >= 0) towns[existingIndex] = normalized;
      else towns.push(normalized);
    });
  if (resources && towns.length > 0) {
    towns.forEach((town: any) => {
      town.storage = emptyResources();
    });
    RESOURCE_KEYS.forEach((key) => {
      const resourceTotal = Math.max(0, Math.floor(resources[key] || 0));
      const totalCapacity = towns.reduce((sum: number, town: any) => {
        const capacities = normalizeResources(town.storageCapacity as Partial<ResourceBag>);
        return sum + Math.max(1, Math.floor(capacities[key] || 1));
      }, 0);
      let assigned = 0;
      towns.forEach((town: any, townIndex: number) => {
        const capacities = normalizeResources(town.storageCapacity as Partial<ResourceBag>);
        const townCapacity = Math.max(1, Math.floor(capacities[key] || 1));
        const share = townIndex === towns.length - 1
          ? Math.max(0, Math.min(townCapacity, resourceTotal - assigned))
          : Math.min(townCapacity, Math.floor(resourceTotal * townCapacity / Math.max(1, totalCapacity)));
        town.storage[key] = share;
        assigned += share;
      });
    });
  }
  return towns;
}

function toPublicClearing(clearing: { territoryId: number; playerId: string; sourceTownId?: number; sourceTerritoryId?: number; settlers?: number; sourceX?: number; sourceY?: number; connectionType?: "land" | "sea"; startedAt: Date; arrivesAt?: Date; completesAt: Date }): ActiveClearing {
  return {
    territoryId: clearing.territoryId,
    playerId: clearing.playerId,
    sourceTownId: clearing.sourceTownId,
    sourceTerritoryId: clearing.sourceTerritoryId,
    settlers: clearing.settlers,
    sourceX: clearing.sourceX,
    sourceY: clearing.sourceY,
    connectionType: clearing.connectionType,
    startedAt: clearing.startedAt.toISOString(),
    arrivesAt: clearing.arrivesAt ? clearing.arrivesAt.toISOString() : clearing.startedAt.toISOString(),
    completesAt: clearing.completesAt.toISOString(),
  };
}

function normalizeWorldTerritoryId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id)) return id;
  return id >= 9000 ? id - 9000 : id;
}

function toPublicMarch(order: any) {
  const startedAtDate = order.startedAt instanceof Date ? order.startedAt : new Date(order.startedAt);
  const arrivesAtDate = order.arrivesAt instanceof Date ? order.arrivesAt : new Date(order.arrivesAt);
  return {
    id: order._id || order.id,
    ownerId: order.ownerId,
    fromTerritoryId: normalizeWorldTerritoryId(order.fromTerritoryId),
    toTerritoryId: normalizeWorldTerritoryId(order.toTerritoryId),
    troops: order.troops,
    infantry: order.infantry ?? 0,
    cavalry: order.cavalry ?? 0,
    artillery: order.artillery ?? 0,
    distanceKm: order.distanceKm ?? 0,
    travelSeconds: order.travelSeconds ?? Math.max(1, Math.round((arrivesAtDate.getTime() - startedAtDate.getTime()) / 1000)),
    usesShip: order.usesShip ?? false,
    battleSide: order.battleSide,
    kind: order.kind ?? "attack",
    startedAt: startedAtDate.toISOString(),
    arrivesAt: arrivesAtDate.toISOString(),
  };
}

function toPublicBattle(battle: any): ActiveBattle {
  const startedAtDate = battle.startedAt instanceof Date ? battle.startedAt : new Date(battle.startedAt);
  const resolvesAtDate = battle.resolvesAt instanceof Date ? battle.resolvesAt : new Date(battle.resolvesAt);
  return {
    id: battle._id || battle.id,
    regionId: battle.regionId,
    townId: battle.townId,
    attackerId: battle.attackerId,
    defenderId: battle.defenderId,
    attackerPower: battle.attackerPower,
    defenderPower: battle.defenderPower,
    attackerInfantry: battle.attackerInfantry,
    attackerCavalry: battle.attackerCavalry,
    attackerArtillery: battle.attackerArtillery,
    defenderInfantry: battle.defenderInfantry,
    defenderCavalry: battle.defenderCavalry,
    defenderArtillery: battle.defenderArtillery,
    startedAt: startedAtDate.toISOString(),
    resolvesAt: resolvesAtDate.toISOString(),
    durationSeconds: battle.durationSeconds,
  };
}

async function publishPlayerState(playerId: string, reason: string, resources?: ResourceBag | null, towns?: any[] | null, newbieShieldUntil?: Date | string | null) {
  let resourceCapacity: ResourceBag | undefined;
  let productionPerSecond: ResourceBag | undefined;
  if (resources) {
    const { territoryClaims } = await collections();
    const claims = await territoryClaims.find({ playerId }).toArray();
    resourceCapacity = resourceCapacityForOwnedTerritories(claims.length);
    productionPerSecond = productionForClaims(claims);
  }
  const now = new Date().toISOString();
  publishRealtime({
    type: "player_state_updated",
    playerId,
    resources: resources ? normalizeResources(resources) : undefined,
    resourceCapacity,
    productionPerSecond,
    resourceUpdatedAt: resources ? now : undefined,
    serverTime: now,
    towns: Array.isArray(towns) ? towns : undefined,
    newbieShieldUntil: newbieShieldUntil ? new Date(newbieShieldUntil).toISOString() : null,
    reason,
  }, `player:${playerId}`);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function battleAttackPower(units: { infantry?: number; cavalry?: number; artillery?: number }, gameConfig: GameConfig) {
  return Math.max(0,
    Math.floor(Number(units.infantry || 0)) * gameConfig.infantryAttackPower +
    Math.floor(Number(units.cavalry || 0)) * gameConfig.cavalryAttackPower +
    Math.floor(Number(units.artillery || 0)) * gameConfig.artilleryAttackPower
  );
}

function battleDefensePower(units: { infantry?: number; cavalry?: number; artillery?: number }, town: any, gameConfig: GameConfig) {
  const unitPower =
    Math.floor(Number(units.infantry || 0)) * gameConfig.infantryDefensePower +
    Math.floor(Number(units.cavalry || 0)) * gameConfig.cavalryDefensePower +
    Math.floor(Number(units.artillery || 0)) * gameConfig.artilleryDefensePower;
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  return Math.max(0, unitPower + level * gameConfig.townLevelDefense + fort * gameConfig.fortLevelDefense);
}

function battleDurationSeconds(attackerPower: number, defenderPower: number, town: any, gameConfig: GameConfig) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const seconds =
    gameConfig.baseBattleSeconds +
    (attackerPower + defenderPower) / Math.max(1, gameConfig.battlePowerPerSecond) +
    level * gameConfig.townBattleSeconds +
    fort * gameConfig.fortBattleSeconds;
  return Math.round(clampNumber(seconds, gameConfig.minBattleDuration, gameConfig.maxBattleDuration));
}

function inferInfantryFromTroops(troops: number, gameConfig: GameConfig) {
  return Math.max(0, Math.ceil(Math.max(0, troops) / Math.max(1, gameConfig.infantryTroopsValue)));
}

function findTownForTerritory(towns: any[], territory: Pick<TerritoryInfo, "id" | "x" | "y">) {
  const townId = townIdForTerritory(territory.id);
  return towns.find((town: any) =>
    town?.id === townId ||
    Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) < 96
  );
}

function removeTownForTerritory(towns: any[], territory: Pick<TerritoryInfo, "id" | "x" | "y">) {
  const townId = townIdForTerritory(territory.id);
  return towns.filter((town: any) =>
    town?.id !== townId &&
    Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) >= 96
  );
}


async function buildWorldTerritoriesPayload(): Promise<WorldTerritoriesResult> {
  const { players, territoryClaims, alliances } = await collections();
  const claims = await territoryClaims.find({}).toArray();
  const claimByTerritory = new Map(claims.map((claim) => [claim.territoryId, claim]));
  const claimsByPlayer = new Map<string, typeof claims>();
  claims.forEach((c) => {
    if (!claimsByPlayer.has(c.playerId)) claimsByPlayer.set(c.playerId, []);
    claimsByPlayer.get(c.playerId)!.push(c);
  });

  const capitalTerritoryByOwner = new Map<string, number>();
  const subCapitalTerritoryByOwner = new Map<string, number>();

  claimsByPlayer.forEach((playerClaims, playerId) => {
    playerClaims.sort((a, b) => a.claimedAt.getTime() - b.claimedAt.getTime());
    const explicitCapital = playerClaims.find((c) => c.settlementKind === "capital");
    const capitalId = explicitCapital ? explicitCapital.territoryId : playerClaims[0]?.territoryId;
    if (capitalId !== undefined) capitalTerritoryByOwner.set(playerId, capitalId);

    const explicitSubCapital = playerClaims.find((c) => c.settlementKind === "sub_capital");
    const subCapitalId = explicitSubCapital ? explicitSubCapital.territoryId : (playerClaims.length >= 20 ? playerClaims[19]?.territoryId : undefined);
    if (subCapitalId !== undefined) subCapitalTerritoryByOwner.set(playerId, subCapitalId);
  });

  const ownerIds = [...new Set(claims.map((claim) => claim.playerId))];
  const [ownerDocs, allianceDocs] = await Promise.all([
    ownerIds.length > 0 ? players.find({ _id: { $in: ownerIds } }).toArray() : [],
    ownerIds.length > 0 ? alliances.find({ memberIds: { $in: ownerIds } }).toArray() : [],
  ]);
  const nameByOwner = new Map(ownerDocs.map((player) => [player._id, player.name]));
  const flagColorByOwner = new Map(ownerDocs.map((player) => [player._id, player.flagColor]));
  const emblemByOwner = new Map(ownerDocs.map((player) => [player._id, player.emblem]));
  const allianceByOwner = new Map<string, { tag: string; emblem: string }>();
  allianceDocs.forEach((alliance) => {
    alliance.memberIds.forEach((memberId) => {
      allianceByOwner.set(memberId, { tag: alliance.tag, emblem: alliance.emblem || "shield" });
    });
  });

  const territories: TerritoryInfo[] = buildStaticTerritoryList().map((territory) => {
    const claim = claimByTerritory.get(territory.id);
    const ownerId = claim?.playerId ?? null;
    let computedKind: "capital" | "sub_capital" | "military" | undefined = undefined;
    if (ownerId) {
      if (capitalTerritoryByOwner.get(ownerId) === territory.id) {
        computedKind = "capital";
      } else if (subCapitalTerritoryByOwner.get(ownerId) === territory.id) {
        computedKind = "sub_capital";
      } else {
        computedKind = "military";
      }
    }
    return {
      ...territory,
      ownerId,
      ownerName: ownerId ? nameByOwner.get(ownerId) ?? ownerId : null,
      ownerFlagColor: ownerId ? flagColorByOwner.get(ownerId) ?? "#2f70d7" : undefined,
      ownerEmblem: ownerId ? emblemByOwner.get(ownerId) ?? "shield" : undefined,
      ownerAllianceTag: ownerId ? allianceByOwner.get(ownerId)?.tag : undefined,
      ownerAllianceEmblem: ownerId ? allianceByOwner.get(ownerId)?.emblem : undefined,
      settlementKind: computedKind,
      parentTerritoryId: claim?.parentTerritoryId,
      connectionType: claim?.connectionType,
    };
  });
  return { territories };
}

function productionForClaims(claims: Array<{ territoryId: number }>): ResourceBag {
  const production = emptyResources();
  const staticById = new Map(buildStaticTerritoryList().map((territory) => [territory.id, territory]));
  claims.forEach((claim) => {
    const territory = staticById.get(claim.territoryId);
    if (!territory) return;
    production.gold += territory.yieldGold * 2.5;
    production.wood += territory.yieldWood * 2.5;
    production.stone += territory.yieldStone * 2.5;
    production.food += territory.yieldFood * 2.5;
    production.iron += territory.yieldIron * 2.5;
    production.coal += territory.yieldCoal * 2.5;
    production.sulfur += territory.yieldSulfur * 2.5;
    production.gems += territory.yieldGems * 2.5;
  });
  RESOURCE_KEYS.forEach((key) => {
    production[key] = Math.round(production[key] * 100) / 100;
  });
  return production;
}

function territoryBuildCost(territory: Pick<TerritoryInfo,
  "rx" | "ry" | "isIslet" | "yieldGold" | "yieldWood" | "yieldStone" | "yieldFood" | "yieldIron" | "yieldSulfur" | "yieldGems"
>): Partial<ResourceBag> {
  const areaFactor = Math.max(0.85, (territory.rx * territory.ry) / 10000);
  return compactResourceDelta({
    gold: Math.round(180 + areaFactor * 32 + territory.yieldGold * 92 + territory.yieldGems * 70),
    wood: Math.round(130 + areaFactor * 28 + territory.yieldWood * 66),
    stone: Math.round(125 + areaFactor * 34 + territory.yieldStone * 76 + territory.yieldIron * 28),
    food: Math.round(80 + areaFactor * 18 + territory.yieldFood * 42),
    iron: Math.round(20 + territory.yieldIron * 95 + territory.yieldSulfur * 30),
    gems: Math.round(Math.max(0, territory.yieldGems - 0.28) * 22),
  });
}

function clearingBuildCostForRefund(clearing: { buildCost?: Partial<ResourceBag>; isStarterClaim?: boolean }, territory: Parameters<typeof territoryBuildCost>[0], ownedCount: number) {
  if (clearing.buildCost) return clearing.buildCost;
  if (clearing.isStarterClaim || ownedCount === 0) return emptyResources();
  return territoryBuildCost(territory);
}

function canAfford(resources: ResourceBag, cost: Partial<ResourceBag>) {
  return RESOURCE_KEYS.every((key) => Math.floor(resources[key] || 0) >= Math.floor(cost[key] || 0));
}

function subtractCost(resources: ResourceBag, cost: Partial<ResourceBag>) {
  const next = normalizeResources(resources);
  RESOURCE_KEYS.forEach((key) => {
    next[key] = Math.max(0, Math.floor(next[key] - Math.floor(cost[key] || 0)));
  });
  return next;
}

function troopPopulationCost(troopValue: number) {
  return Math.max(1, Math.ceil((troopValue || 0) / 5));
}

function maxDefendingTroopsForTown(town: any) {
  return Math.max(10, Math.floor(Number(town?.maxTroops || 0) || ((Number(town?.population || 0) || 0) * 10)));
}

function resourceCostMessage(cost: Partial<ResourceBag>) {
  const labels: Record<ResourceKey, string> = {
    gold: "vàng",
    wood: "gỗ",
    stone: "đá",
    food: "lương",
    iron: "sắt",
    coal: "than",
    sulfur: "lưu huỳnh",
    gems: "kim cương",
  };
  return RESOURCE_KEYS
    .filter((key) => Math.floor(cost[key] || 0) > 0)
    .map((key) => `${Math.floor(cost[key] || 0)} ${labels[key]}`)
    .join(", ");
}

async function collectPlayerResources(playerId: string, now = new Date()) {
  const { players, territoryClaims } = await collections();
  const [player, ownedClaims] = await Promise.all([
    players.findOne({ _id: playerId }),
    territoryClaims.find({ playerId }).toArray(),
  ]);
  const current = normalizeResources(player?.resources);
  const capacity = resourceCapacityForOwnedTerritories(ownedClaims.length);
  const productionPerSecond = productionForClaims(ownedClaims);
  const lastCollectedAt = player?.lastResourceCollectedAt ?? player?.createdAt ?? now;
  const elapsedSeconds = Math.max(
    0,
    Math.min(MAX_OFFLINE_RESOURCE_SECONDS, Math.floor((now.getTime() - lastCollectedAt.getTime()) / 1000)),
  );
  const gained = emptyResources();
  const next = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    gained[key] = Math.max(0, Math.round(productionPerSecond[key] * elapsedSeconds));
    next[key] = Math.min(capacity[key], Math.floor(current[key] + gained[key]));
    gained[key] = Math.max(0, next[key] - Math.floor(current[key]));
  });
  await players.updateOne(
    { _id: playerId },
    {
      $set: {
        resources: next,
        lastResourceCollectedAt: now,
        lastSeenAt: now,
      },
      $setOnInsert: {
        name: playerId,
        role: "player",
        createdAt: now,
        newbieShieldUntil: new Date(now.getTime() + 24 * 3600 * 1000),
      },
    },
    { upsert: true },
  );
  const shieldDate = player?.newbieShieldUntil ?? new Date(now.getTime() + 24 * 3600 * 1000);
  return {
    resources: next,
    resourceCapacity: capacity,
    productionPerSecond,
    offlineGain: gained,
    offlineSeconds: elapsedSeconds,
    serverTime: now.toISOString(),
    resourceUpdatedAt: now.toISOString(),
    newbieShieldUntil: shieldDate ? new Date(shieldDate).toISOString() : null,
  };
}

async function buildGameStatePayload(playerId: string): Promise<GameStateResult> {
  const { territoryClearings, marchOrders, activeBattles, players, saves } = await collections();
  const [world, clearings, marches, battles, resourceState, player, save] = await Promise.all([
    cachedWorldTerritoriesPayload(),
    territoryClearings.find({}).toArray(),
    marchOrders.find({}).toArray(),
    activeBattles.find({}).toArray(),
    collectPlayerResources(playerId),
    players.findOne({ _id: playerId }),
    saves.findOne({ playerId }),
  ]);
  const towns = townSnapshotsForPlayer(save?.towns, world.territories, playerId, resourceState.resources);
  if (towns.length > 0) {
    await saves.updateOne(
      { playerId },
      {
        $set: { towns, resources: resourceState.resources, updatedAt: new Date() },
        $setOnInsert: { _id: `save:${playerId}`, playerId },
      },
      { upsert: true },
    );
  }
  return {
    playerId,
    activeMap: player?.activeMap === "conquest" ? "conquest" : "world",
    territories: world.territories,
    clearings: clearings.map(toPublicClearing),
    marches: marches.map(toPublicMarch),
    battles: battles.map(toPublicBattle),
    towns,
    ...resourceState,
    playerProfile: player ? { flagColor: player.flagColor ?? "#2f70d7", emblem: player.emblem ?? "shield" } : null,
  };
}

const MAP_UNITS_TO_KM = 0.18;
const DEFAULT_MARCH_CONFIG = {
  infantrySpeed: 45,
  cavalrySpeed: 75,
  artillerySpeed: 30,
  shipSpeed: 25,
  gameHourSeconds: 30,
};

const DEFAULT_CONFIG: GameConfig = {
  maxBattleDuration: 300,
  minBattleDuration: 30,
  baseBattleSeconds: 30,
  battlePowerPerSecond: 80,
  townBattleSeconds: 8,
  fortBattleSeconds: 20,
  infantryAttackPower: 10,
  infantryDefensePower: 12,
  cavalryAttackPower: 18,
  cavalryDefensePower: 8,
  artilleryAttackPower: 30,
  artilleryDefensePower: 3,
  townLevelDefense: 40,
  fortLevelDefense: 120,
  lootPercent: 20,
  retreatPercent: 35,
  infantryCostGold: 100,
  infantryCostWood: 30,
  infantryCostFood: 55,
  infantryTroopsValue: 18,
  cavalryCostGold: 170,
  cavalryCostWood: 40,
  cavalryCostStone: 45,
  cavalryCostFood: 90,
  cavalryCostIron: 12,
  cavalryTroopsValue: 34,
  artilleryCostGold: 240,
  artilleryCostStone: 120,
  artilleryCostIron: 85,
  artilleryCostSulfur: 25,
  artilleryTroopsValue: 58,
  infantryPopulationCost: 4,
  cavalryPopulationCost: 7,
  artilleryPopulationCost: 12,
  settlerSpeed: 35,
  infantrySpeed: DEFAULT_MARCH_CONFIG.infantrySpeed,
  cavalrySpeed: DEFAULT_MARCH_CONFIG.cavalrySpeed,
  artillerySpeed: DEFAULT_MARCH_CONFIG.artillerySpeed,
  shipSpeed: DEFAULT_MARCH_CONFIG.shipSpeed,
  gameHourSeconds: DEFAULT_MARCH_CONFIG.gameHourSeconds,
  shopResourcePackAmount: 50000,
  shopResourcePackPriceGems: 100,
  shopSkinLongBaoThanhPrice: 1500,
  shopSkinHoaLongDienPrice: 2000,
  shopSkinPhongLongCacPrice: 1800,
};

let cachedGameConfig: GameConfig | null = null;
let cachedGameConfigExpiresAt = 0;

function normalizeGameConfig(doc?: Partial<GameConfig> | null): GameConfig {
  return { ...DEFAULT_CONFIG, ...(doc || {}) };
}

async function loadGameConfig(): Promise<GameConfig> {
  const now = Date.now();
  if (cachedGameConfig && now < cachedGameConfigExpiresAt) return cachedGameConfig;
  const { configs } = await collections();
  const doc = await configs.findOne({ _id: "game_settings" });
  cachedGameConfig = normalizeGameConfig(doc || null);
  cachedGameConfigExpiresAt = now + 5000;
  return cachedGameConfig;
}

async function processArrivedMarches(now = new Date()) {
  const { players, territoryClaims, territoryClearings, marchOrders, activeBattles, saves, alliances } = await collections();
  const gameConfig = await loadGameConfig();
  const arrived = await marchOrders.find({ arrivesAt: { $lte: now } }).toArray();
  for (const march of arrived) {
    const territory = getStaticTerritory(march.toTerritoryId);
    if (!territory) {
      await marchOrders.deleteOne({ _id: march._id });
      continue;
    }
    const targetClaim = await territoryClaims.findOne({ territoryId: territory.id });

    // Case A: Unclaimed wild land -> Instantly capture on march arrival
    if (!targetClaim || !targetClaim.playerId) {
      if (march.kind === "attack") {
        const attackerPlayer = await players.findOne({ _id: march.ownerId });
        const attackerSave = (await saves.findOne({ playerId: march.ownerId })) as any;
        const attackerTowns = Array.isArray(attackerSave?.towns) ? removeTownForTerritory(attackerSave.towns, territory) : [];
        const newTown = normalizeTownSnapshotForState({
          ...defaultTownSnapshotForTerritory(territory, march.ownerId),
          ownerId: march.ownerId,
          infantryCount: march.infantry || 50,
          cavalryCount: march.cavalry || 10,
          artilleryCount: march.artillery || 5,
          troops: march.troops || 65,
        }, march.ownerId, territory);
        attackerTowns.push(newTown);

        await Promise.all([
          territoryClaims.updateOne(
            { territoryId: territory.id },
            {
              $set: {
                playerId: march.ownerId,
                claimedAt: now,
                settlementKind: "military",
                parentTerritoryId: march.fromTerritoryId,
                connectionType: territoryConnectionType(getStaticTerritory(march.fromTerritoryId)!, territory) || "land",
              },
              $setOnInsert: { _id: `territory:${territory.id}`, territoryId: territory.id },
            },
            { upsert: true }
          ),
          saves.updateOne(
            { playerId: march.ownerId },
            { $set: { towns: attackerTowns, updatedAt: now }, $setOnInsert: { _id: `save:${march.ownerId}`, playerId: march.ownerId, resources: DEFAULT_PLAYER_RESOURCES } },
            { upsert: true }
          ),
          marchOrders.deleteOne({ _id: march._id }),
        ]);

        const publicTerritory = {
          ...territory,
          ownerId: march.ownerId,
          ownerName: attackerPlayer?.name || "Bạn",
          ownerFlagColor: attackerPlayer?.flagColor || "#2f70d7",
          ownerEmblem: attackerPlayer?.emblem || "shield",
        };
        publishRealtime({ type: "territory_claimed", territory: publicTerritory });
        publishRealtime({ type: "march_removed", marchId: march._id, territoryId: territory.id, reason: "territory_claimed" });
        await publishPlayerState(march.ownerId, "march_claimed_territory", attackerPlayer?.resources, attackerTowns);
        continue;
      } else {
        await marchOrders.deleteOne({ _id: march._id });
        publishRealtime({ type: "march_removed", marchId: march._id, territoryId: territory.id, reason: "arrived_home" });
        continue;
      }
    }

    // Case B: Own town -> Arrived safely
    if (targetClaim.playerId === march.ownerId) {
      await marchOrders.deleteOne({ _id: march._id });
      publishRealtime({ type: "march_removed", marchId: march._id, territoryId: territory.id, reason: "arrived_home" });
      continue;
    }
    const existingBattle = await activeBattles.findOne({ regionId: territory.id });
    if (existingBattle) {
      const isAttackerSide = march.ownerId === existingBattle.attackerId || march.kind === "attack";
      const marchInfantry = Math.max(0, Math.floor(Number(march.infantry || 0) || 0));
      const marchCavalry = Math.max(0, Math.floor(Number(march.cavalry || 0) || 0));
      const marchArtillery = Math.max(0, Math.floor(Number(march.artillery || 0) || 0));
      const addedPower = battleAttackPower({ infantry: marchInfantry, cavalry: marchCavalry, artillery: marchArtillery }, gameConfig);

      if (isAttackerSide) {
        existingBattle.attackerInfantry = (existingBattle.attackerInfantry || 0) + marchInfantry;
        existingBattle.attackerCavalry = (existingBattle.attackerCavalry || 0) + marchCavalry;
        existingBattle.attackerArtillery = (existingBattle.attackerArtillery || 0) + marchArtillery;
        existingBattle.attackerPower = (existingBattle.attackerPower || 0) + addedPower;
      } else {
        existingBattle.defenderInfantry = (existingBattle.defenderInfantry || 0) + marchInfantry;
        existingBattle.defenderCavalry = (existingBattle.defenderCavalry || 0) + marchCavalry;
        existingBattle.defenderArtillery = (existingBattle.defenderArtillery || 0) + marchArtillery;
        existingBattle.defenderPower = (existingBattle.defenderPower || 0) + addedPower;
      }

      await activeBattles.updateOne(
        { _id: existingBattle._id },
        {
          $set: {
            attackerInfantry: existingBattle.attackerInfantry,
            attackerCavalry: existingBattle.attackerCavalry,
            attackerArtillery: existingBattle.attackerArtillery,
            attackerPower: existingBattle.attackerPower,
            defenderInfantry: existingBattle.defenderInfantry,
            defenderCavalry: existingBattle.defenderCavalry,
            defenderArtillery: existingBattle.defenderArtillery,
            defenderPower: existingBattle.defenderPower,
          },
        }
      );
      await marchOrders.deleteOne({ _id: march._id });
      publishRealtime({ type: "battle_started", battle: toPublicBattle(existingBattle), consumedMarchId: march._id });
      publishRealtime({ type: "march_removed", marchId: march._id, territoryId: territory.id, reason: "joined_battle" });
      continue;
    }
    const defenderSave = (await saves.findOne({ playerId: targetClaim.playerId })) as any;
    const defenderTowns = Array.isArray(defenderSave?.towns) ? defenderSave.towns : [];
    const defenderTown = normalizeTownSnapshotForState(
      findTownForTerritory(defenderTowns, territory) || defaultTownSnapshotForTerritory(territory, targetClaim.playerId),
      targetClaim.playerId,
      territory,
    );
    const attackerInfantry = Math.max(0, Math.floor(Number(march.infantry || 0) || 0)) || inferInfantryFromTroops(march.troops || 0, gameConfig);
    const attackerCavalry = Math.max(0, Math.floor(Number(march.cavalry || 0) || 0));
    const attackerArtillery = Math.max(0, Math.floor(Number(march.artillery || 0) || 0));
    const defenderInfantry = Math.max(0, Math.floor(Number(defenderTown.infantryCount || defenderTown.troops || 0) || 0));
    const defenderCavalry = Math.max(0, Math.floor(Number(defenderTown.cavalryCount || 0) || 0));
    const defenderArtillery = Math.max(0, Math.floor(Number(defenderTown.artilleryCount || 0) || 0));
    const attackerPower = battleAttackPower({ infantry: attackerInfantry, cavalry: attackerCavalry, artillery: attackerArtillery }, gameConfig);
    const defenderPower = battleDefensePower({ infantry: defenderInfantry, cavalry: defenderCavalry, artillery: defenderArtillery }, defenderTown, gameConfig);
    const durationSeconds = battleDurationSeconds(attackerPower, defenderPower, defenderTown, gameConfig);
    const battle = {
      _id: `battle:${territory.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      regionId: territory.id,
      townId: defenderTown.id,
      fromTerritoryId: march.fromTerritoryId,
      toTerritoryId: march.toTerritoryId,
      marchId: march._id,
      attackerId: march.ownerId,
      defenderId: targetClaim.playerId,
      attackerPower,
      defenderPower,
      attackerInfantry,
      attackerCavalry,
      attackerArtillery,
      defenderInfantry,
      defenderCavalry,
      defenderArtillery,
      startedAt: now,
      resolvesAt: new Date(now.getTime() + durationSeconds * 1000),
      durationSeconds,
    };
    await activeBattles.insertOne(battle);
    await marchOrders.deleteOne({ _id: march._id });
    publishRealtime({ type: "battle_started", battle: toPublicBattle(battle), consumedMarchId: march._id });
    publishRealtime({ type: "march_removed", marchId: march._id, territoryId: territory.id, reason: "battle_started" });
  }
  if (arrived.length > 0) {
    await bumpWorldCacheVersion();
  }
}

async function processActiveBattles(now = new Date()) {
  const { players, territoryClaims, territoryClearings, activeBattles, marchOrders, saves, alliances } = await collections();
  const gameConfig = await loadGameConfig();
  const resolved = await activeBattles.find({ resolvesAt: { $lte: now } }).toArray();
  for (const battle of resolved) {
    const battleStillActive = await activeBattles.findOne({ _id: battle._id });
    if (!battleStillActive) continue;
    const territory = getStaticTerritory(battle.regionId);
    if (!territory) {
      await activeBattles.deleteOne({ _id: battle._id });
      continue;
    }
    const attackerWins = battle.attackerPower > battle.defenderPower;
    const totalPower = Math.max(1, battle.attackerPower + battle.defenderPower);
    const winnerRatio = attackerWins
      ? clampNumber(battle.attackerPower / totalPower, 0.12, 0.82)
      : clampNumber(battle.defenderPower / totalPower, 0.12, 0.88);
    const troopValue = (infantry: number, cavalry: number, artillery: number) =>
      infantry * gameConfig.infantryTroopsValue + cavalry * gameConfig.cavalryTroopsValue + artillery * gameConfig.artilleryTroopsValue;

    const attackerPlayer = await players.findOne({ _id: battle.attackerId });
    const defenderPlayer = battle.defenderId ? await players.findOne({ _id: battle.defenderId }) : null;
    let attackerSurvivors = { infantry: 0, cavalry: 0, artillery: 0, power: 0 };
    let attackerCasualties = { infantry: battle.attackerInfantry, cavalry: battle.attackerCavalry, artillery: battle.attackerArtillery, power: battle.attackerPower };
    let defenderSurvivors = { infantry: 0, cavalry: 0, artillery: 0, power: 0 };
    let defenderCasualties = { infantry: battle.defenderInfantry, cavalry: battle.defenderCavalry, artillery: battle.defenderArtillery, power: battle.defenderPower };
    let lootedResources = emptyResources();

    if (attackerWins) {
      const survivorRatio = winnerRatio;
      const nextInfantry = Math.max(1, Math.floor(battle.attackerInfantry * survivorRatio));
      const nextCavalry = Math.max(0, Math.floor(battle.attackerCavalry * survivorRatio));
      const nextArtillery = Math.max(0, Math.floor(battle.attackerArtillery * survivorRatio));
      const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
      attackerSurvivors = { infantry: nextInfantry, cavalry: nextCavalry, artillery: nextArtillery, power: nextTroops };
      attackerCasualties = {
        infantry: Math.max(0, battle.attackerInfantry - nextInfantry),
        cavalry: Math.max(0, battle.attackerCavalry - nextCavalry),
        artillery: Math.max(0, battle.attackerArtillery - nextArtillery),
        power: Math.max(0, battle.attackerPower - nextTroops),
      };

      const attackerSave = (await saves.findOne({ playerId: battle.attackerId })) as any;
      const defenderSave = battle.defenderId ? (await saves.findOne({ playerId: battle.defenderId })) as any : null;
      const attackerTowns = Array.isArray(attackerSave?.towns) ? removeTownForTerritory(attackerSave.towns, territory) : [];
      const capturedTown = normalizeTownSnapshotForState({
        ...defaultTownSnapshotForTerritory(territory, battle.attackerId),
        id: battle.townId || townIdForTerritory(territory.id),
        ownerId: battle.attackerId,
        infantryCount: nextInfantry,
        cavalryCount: nextCavalry,
        artilleryCount: nextArtillery,
        troops: nextTroops,
      }, battle.attackerId, territory);
      attackerTowns.push(capturedTown);
      const defenderTowns = Array.isArray(defenderSave?.towns) ? removeTownForTerritory(defenderSave.towns, territory) : [];
      const lootPercent = clampNumber(gameConfig.lootPercent, 0, 100) / 100;
      const defenderResources = normalizeResources(defenderPlayer?.resources);
      const attackerResources = normalizeResources(attackerPlayer?.resources);
      RESOURCE_KEYS.forEach((key) => {
        lootedResources[key] = Math.floor((defenderResources[key] || 0) * lootPercent);
        defenderResources[key] = Math.max(0, defenderResources[key] - lootedResources[key]);
        attackerResources[key] = Math.max(0, attackerResources[key] + lootedResources[key]);
      });
      await Promise.all([
        territoryClaims.updateOne(
          { territoryId: territory.id },
          {
            $set: {
              playerId: battle.attackerId,
              claimedAt: now,
              settlementKind: "military",
              parentTerritoryId: battle.fromTerritoryId,
              connectionType: territoryConnectionType(getStaticTerritory(battle.fromTerritoryId)!, territory) || "land",
            },
            $setOnInsert: { _id: `territory:${territory.id}`, territoryId: territory.id },
          },
          { upsert: true },
        ),
        territoryClearings.deleteMany({ territoryId: territory.id }),
        saves.updateOne(
          { playerId: battle.attackerId },
          { $set: { towns: attackerTowns, updatedAt: now }, $setOnInsert: { _id: `save:${battle.attackerId}`, playerId: battle.attackerId, resources: DEFAULT_PLAYER_RESOURCES } },
          { upsert: true },
        ),
        battle.defenderId ? saves.updateOne({ playerId: battle.defenderId }, { $set: { towns: defenderTowns, updatedAt: now } }) : Promise.resolve(),
        players.updateOne({ _id: battle.attackerId }, { $set: { resources: attackerResources, lastResourceCollectedAt: now, lastSeenAt: now } }),
        battle.defenderId ? players.updateOne({ _id: battle.defenderId }, { $set: { resources: defenderResources, lastResourceCollectedAt: now, lastSeenAt: now } }) : Promise.resolve(),
      ]);
      await publishPlayerState(battle.attackerId, "battle_resolved", attackerResources, attackerTowns);
      if (battle.defenderId) {
        await publishPlayerState(battle.defenderId, "battle_resolved", defenderResources, defenderTowns);
        await cancelBrokenRouteClearings(battle.defenderId, now);
        // Automatically prune & destroy any disconnected territories for defender
        await pruneDisconnectedClaims(battle.defenderId);
      }
      if (battle.defenderId) {
        const defenderRemainingClaims = await territoryClaims.countDocuments({ playerId: battle.defenderId });
        if (defenderRemainingClaims === 0) {
          await Promise.all([
            territoryClaims.deleteMany({ playerId: battle.defenderId }),
            territoryClearings.deleteMany({ playerId: battle.defenderId }),
            marchOrders.deleteMany({ ownerId: battle.defenderId }),
            activeBattles.deleteMany({
              _id: { $ne: battle._id },
              $or: [{ attackerId: battle.defenderId }, { defenderId: battle.defenderId }],
            }),
            saves.updateOne(
              { playerId: battle.defenderId },
              {
                $set: { towns: [], updatedAt: now },
                $setOnInsert: { _id: `save:${battle.defenderId}`, playerId: battle.defenderId },
              },
              { upsert: true },
            ),
            players.updateOne(
              { _id: battle.defenderId },
              {
                $set: {
                  resources: emptyResources(),
                  onboardingState: "needs_claim",
                  lastResourceCollectedAt: now,
                  lastSeenAt: now,
                  newbieShieldUntil: new Date(now.getTime() + 24 * 3600 * 1000),
                },
              },
            ),
          ]);
          publishRealtime({ type: "player_eliminated", playerId: battle.defenderId, reason: "all_towns_captured" });
          await publishPlayerState(battle.defenderId, "player_eliminated", emptyResources(), [], new Date(now.getTime() + 24 * 3600 * 1000));
        }
      }
    } else if (battle.defenderId) {
      const survivorRatio = winnerRatio;
      const nextInfantry = Math.max(1, Math.floor(battle.defenderInfantry * survivorRatio));
      const nextCavalry = Math.max(0, Math.floor(battle.defenderCavalry * survivorRatio));
      const nextArtillery = Math.max(0, Math.floor(battle.defenderArtillery * survivorRatio));
      const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
      defenderSurvivors = { infantry: nextInfantry, cavalry: nextCavalry, artillery: nextArtillery, power: nextTroops };
      defenderCasualties = {
        infantry: Math.max(0, battle.defenderInfantry - nextInfantry),
        cavalry: Math.max(0, battle.defenderCavalry - nextCavalry),
        artillery: Math.max(0, battle.defenderArtillery - nextArtillery),
        power: Math.max(0, battle.defenderPower - nextTroops),
      };

      const defenderSave = (await saves.findOne({ playerId: battle.defenderId })) as any;
      const defenderTowns = Array.isArray(defenderSave?.towns) ? removeTownForTerritory(defenderSave.towns, territory) : [];
      const keptTown = normalizeTownSnapshotForState({
        ...defaultTownSnapshotForTerritory(territory, battle.defenderId, battle.townId),
        ownerId: battle.defenderId,
        infantryCount: nextInfantry,
        cavalryCount: nextCavalry,
        artilleryCount: nextArtillery,
        troops: nextTroops,
      }, battle.defenderId, territory);
      defenderTowns.push(keptTown);
      await saves.updateOne(
        { playerId: battle.defenderId },
        { $set: { towns: defenderTowns, updatedAt: now }, $setOnInsert: { _id: `save:${battle.defenderId}`, playerId: battle.defenderId, resources: DEFAULT_PLAYER_RESOURCES } },
        { upsert: true },
      );
      const defenderCurrent = defenderPlayer ? normalizeResources(defenderPlayer.resources) : DEFAULT_PLAYER_RESOURCES;
      await publishPlayerState(battle.defenderId, "battle_resolved", defenderCurrent, defenderTowns);
      const retreatRatio = clampNumber(gameConfig.retreatPercent, 0, 100) / 100;
      let retreatInfantry = 0;
      let retreatCavalry = 0;
      let retreatArtillery = 0;
      if (retreatRatio > 0) {
        const sourceTerritory = getStaticTerritory(battle.fromTerritoryId);
        if (sourceTerritory) {
          retreatInfantry = Math.floor(battle.attackerInfantry * retreatRatio);
          retreatCavalry = Math.floor(battle.attackerCavalry * retreatRatio);
          retreatArtillery = Math.floor(battle.attackerArtillery * retreatRatio);
          if (retreatInfantry + retreatCavalry + retreatArtillery > 0) {
            const attackerSave = (await saves.findOne({ playerId: battle.attackerId })) as any;
            const attackerTowns = Array.isArray(attackerSave?.towns) ? removeTownForTerritory(attackerSave.towns, sourceTerritory) : [];
            const sourceTown = normalizeTownSnapshotForState(
              findTownForTerritory(attackerSave?.towns || [], sourceTerritory) || defaultTownSnapshotForTerritory(sourceTerritory, battle.attackerId),
              battle.attackerId,
              sourceTerritory,
            );
            sourceTown.infantryCount = Math.max(0, (sourceTown.infantryCount || 0) + retreatInfantry);
            sourceTown.cavalryCount = Math.max(0, (sourceTown.cavalryCount || 0) + retreatCavalry);
            sourceTown.artilleryCount = Math.max(0, (sourceTown.artilleryCount || 0) + retreatArtillery);
            sourceTown.troops = troopValue(sourceTown.infantryCount, sourceTown.cavalryCount, sourceTown.artilleryCount);
            attackerTowns.push(sourceTown);
            await saves.updateOne(
              { playerId: battle.attackerId },
              { $set: { towns: attackerTowns, updatedAt: now }, $setOnInsert: { _id: `save:${battle.attackerId}`, playerId: battle.attackerId, resources: DEFAULT_PLAYER_RESOURCES } },
              { upsert: true },
            );
            const attackerCurrent = attackerPlayer ? normalizeResources(attackerPlayer.resources) : DEFAULT_PLAYER_RESOURCES;
            await publishPlayerState(battle.attackerId, "battle_retreat", attackerCurrent, attackerTowns);
          }
        }
      }
      attackerSurvivors = {
        infantry: retreatInfantry,
        cavalry: retreatCavalry,
        artillery: retreatArtillery,
        power: troopValue(retreatInfantry, retreatCavalry, retreatArtillery),
      };
      attackerCasualties = {
        infantry: Math.max(0, battle.attackerInfantry - retreatInfantry),
        cavalry: Math.max(0, battle.attackerCavalry - retreatCavalry),
        artillery: Math.max(0, battle.attackerArtillery - retreatArtillery),
        power: Math.max(0, battle.attackerPower - attackerSurvivors.power),
      };
    }

    const { battleReports } = await collections();
    const reportDoc = {
      _id: `report:${territory.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      regionId: territory.id,
      territoryName: `LÃNH THỔ #${territory.id + 1}`,
      attackerId: battle.attackerId,
      attackerName: attackerPlayer?.name || "Bá Vương",
      defenderId: battle.defenderId || null,
      defenderName: defenderPlayer?.name || "Thủ Thành",
      winnerId: attackerWins ? battle.attackerId : (battle.defenderId || "defender"),
      isAttackerWin: attackerWins,
      attacker: {
        initial: { infantry: battle.attackerInfantry, cavalry: battle.attackerCavalry, artillery: battle.attackerArtillery, power: battle.attackerPower },
        casualty: attackerCasualties,
        survivors: attackerSurvivors,
      },
      defender: {
        initial: { infantry: battle.defenderInfantry, cavalry: battle.defenderCavalry, artillery: battle.defenderArtillery, power: battle.defenderPower },
        casualty: defenderCasualties,
        survivors: defenderSurvivors,
      },
      lootedResources,
      createdAt: now,
    };
    await battleReports.insertOne(reportDoc as any);
    await activeBattles.deleteOne({ _id: battle._id });

    const claim = await territoryClaims.findOne({ territoryId: territory.id });
    const [player, alliance] = claim?.playerId
      ? await Promise.all([
        players.findOne({ _id: claim.playerId }),
        alliances.findOne({ memberIds: claim.playerId }),
      ])
      : [null, null];
    const publicTerritory = {
      ...territory,
      ownerId: claim?.playerId ?? null,
      ownerName: claim?.playerId ? player?.name ?? claim.playerId : null,
      ownerFlagColor: claim?.playerId ? player?.flagColor ?? "#2f70d7" : undefined,
      ownerEmblem: claim?.playerId ? player?.emblem ?? "shield" : undefined,
      ownerAllianceTag: alliance?.tag,
      ownerAllianceEmblem: alliance?.emblem,
    };
    publishRealtime({
      type: "battle_resolved",
      battleId: battle._id,
      territory: publicTerritory,
      winner: attackerWins ? "attacker" : "defender",
      report: reportDoc,
    });
    publishRealtime({ type: "territory_claimed", territory: publicTerritory });
  }
  if (resolved.length > 0) {
    await bumpWorldCacheVersion();
  }
}

async function cancelBrokenRouteClearing(
  clearing: TerritoryClearingDocument,
  now: Date,
) {
  if (clearing.isStarterClaim || clearing.sourceTerritoryId === undefined) return false;
  const { players, territoryClaims, territoryClearings, saves } = await collections();
  const claims = await territoryClaims.find({ playerId: clearing.playerId }).toArray();
  const sourceClaim = claims.find((claim) => claim.territoryId === clearing.sourceTerritoryId);
  const sourceStillOwned = Boolean(sourceClaim && sourceClaim.playerId === clearing.playerId);
  const sourceConnected = sourceStillOwned && isClaimConnectedToCapital(claims, clearing.sourceTerritoryId);
  if (sourceConnected) return false;

  const save = (await saves.findOne({ playerId: clearing.playerId })) as any;
  const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
  const resources = normalizeResources((await collectPlayerResources(clearing.playerId, now)).resources);

  // A captured source or a severed chain destroys the expedition and its supplies.
  // Only the player's explicit cancel endpoint returns settlers and build costs.

  await Promise.all([
    territoryClearings.deleteOne({ _id: clearing._id }),
    players.updateOne({ _id: clearing.playerId }, { $set: { resources, onboardingState: "settled", lastSeenAt: now } }),
    saves.updateOne(
      { playerId: clearing.playerId },
      { $set: { towns, updatedAt: now }, $setOnInsert: { _id: `save:${clearing.playerId}`, playerId: clearing.playerId, resources: DEFAULT_PLAYER_RESOURCES } },
      { upsert: true },
    ),
  ]);
  publishRealtime({ type: "territory_clearing_cancelled", territoryId: clearing.territoryId, playerId: clearing.playerId });
  await publishPlayerState(clearing.playerId, sourceStillOwned ? "clearing_route_cut" : "clearing_source_lost", resources, towns);
  return true;
}

async function cancelBrokenRouteClearings(playerId: string, now = new Date()) {
  const { territoryClearings } = await collections();
  const clearings = await territoryClearings.find({ playerId }).toArray();
  let cancelled = 0;
  for (const clearing of clearings) {
    if (await cancelBrokenRouteClearing(clearing, now)) cancelled += 1;
  }
  return cancelled;
}

async function processCompletedClearings(now = new Date()) {
  const { players, territoryClaims, territoryClearings, alliances, saves } = await collections();
  const completed = await territoryClearings.find({ completesAt: { $lte: now } }).toArray();
  for (const clearing of completed) {
    if (await cancelBrokenRouteClearing(clearing, now)) continue;
    const territory = getStaticTerritory(clearing.territoryId);
    if (!territory) {
      await territoryClearings.deleteOne({ _id: clearing._id });
      continue;
    }
    const existingClaim = await territoryClaims.findOne({ territoryId: territory.id });
    if (existingClaim && existingClaim.playerId !== clearing.playerId) {
      await territoryClearings.deleteOne({ _id: clearing._id });
      continue;
    }
    await territoryClaims.updateOne(
      { territoryId: territory.id },
      {
        $setOnInsert: {
          _id: `territory:${territory.id}`,
          territoryId: territory.id,
          playerId: clearing.playerId,
          claimedAt: now,
          settlementKind: clearing.isStarterClaim ? "capital" : "military",
          parentTerritoryId: clearing.isStarterClaim ? undefined : clearing.sourceTerritoryId,
          connectionType: clearing.connectionType,
        },
      },
      { upsert: true },
    );
    await territoryClearings.deleteOne({ _id: clearing._id });
    await players.updateOne({ _id: clearing.playerId }, { $set: { onboardingState: "settled", lastSeenAt: now } });
    const resourceState = await collectPlayerResources(clearing.playerId, now);
    const saveDoc = (await saves.findOne({ playerId: clearing.playerId })) as any;
    const towns = Array.isArray(saveDoc?.towns) ? removeTownForTerritory(saveDoc.towns, territory) : [];
    const town = normalizeTownSnapshotForState(defaultTownSnapshotForTerritory(territory, clearing.playerId), clearing.playerId, territory);
    towns.push(town);
    await saves.updateOne(
      { playerId: clearing.playerId },
      {
        $set: { towns, updatedAt: now },
        $setOnInsert: { _id: `save:${clearing.playerId}`, playerId: clearing.playerId, resources: DEFAULT_PLAYER_RESOURCES },
      },
      { upsert: true },
    );
    const [player, alliance] = await Promise.all([
      players.findOne({ _id: clearing.playerId }),
      alliances.findOne({ memberIds: clearing.playerId }),
    ]);
    publishRealtime({
      type: "territory_claimed",
      territory: {
        ...territory,
        ownerId: clearing.playerId,
        ownerName: player?.name ?? clearing.playerId,
        ownerFlagColor: player?.flagColor ?? "#2f70d7",
        ownerEmblem: player?.emblem ?? "shield",
        ownerAllianceTag: alliance?.tag,
        ownerAllianceEmblem: alliance?.emblem,
      },
    });
    await publishPlayerState(clearing.playerId, "clearing_completed", resourceState.resources, towns);
  }
  if (completed.length > 0) {
    await bumpWorldCacheVersion();
  }
}

let worldTickInFlight = false;

async function processWorldTick(now = new Date()) {
  if (worldTickInFlight) return false;
  worldTickInFlight = true;
  try {
    await processArrivedMarches(now);
    await processActiveBattles(new Date());
    await processCompletedClearings(new Date());
    return true;
  } finally {
    worldTickInFlight = false;
  }
}

const BOT_CONFIGS = [
  { id: "bot-tao-thao", name: "Tào Tháo", flagColor: "#ef4444", emblem: "dragon" },
  { id: "bot-gia-cat-luong", name: "Gia Cát Lượng", flagColor: "#2563eb", emblem: "feather" },
  { id: "bot-trieu-tu-long", name: "Triệu Tử Long", flagColor: "#f59e0b", emblem: "spear" },
  { id: "bot-quang-trung", name: "Quang Trung", flagColor: "#10b981", emblem: "sun" },
  { id: "bot-vo-nguyen-giap", name: "Võ Nguyên Giáp", flagColor: "#8b5cf6", emblem: "star" },
  { id: "bot-doc-co-cau-bai", name: "Độc Cô Cầu Bại", flagColor: "#ec4899", emblem: "sword" },
];

async function retireLegacyBots() {
  const { players, saves, territoryClaims, territoryClearings, marchOrders, activeBattles, battleReports } = await collections();
  const bots = await players.find({ $or: [{ isBot: true }, { _id: /^player:bot-/ }] } as any).toArray();
  const botIds = bots.map((bot) => bot._id);
  if (botIds.length === 0) return;

  await Promise.all([
    territoryClaims.deleteMany({ playerId: { $in: botIds } }),
    territoryClearings.deleteMany({ playerId: { $in: botIds } }),
    marchOrders.deleteMany({ ownerId: { $in: botIds } }),
    activeBattles.deleteMany({ $or: [{ attackerId: { $in: botIds } }, { defenderId: { $in: botIds } }] }),
    battleReports.deleteMany({ $or: [{ attackerId: { $in: botIds } }, { defenderId: { $in: botIds } }] }),
    saves.deleteMany({ playerId: { $in: botIds } }),
    players.deleteMany({ _id: { $in: botIds } }),
  ]);
  await bumpWorldCacheVersion();
  console.info(`Retired ${botIds.length} legacy bot accounts and released their territories.`);
}

async function ensureSeededBots() {
  const { players, saves, territoryClaims } = await collections();
  const now = new Date();

  for (let i = 0; i < BOT_CONFIGS.length; i++) {
    const cfg = BOT_CONFIGS[i];
    const existing = await players.findOne({ _id: cfg.id });
    if (!existing) {
      await players.insertOne({
        _id: cfg.id,
        email: `${cfg.id}@bot.game`,
        passwordHash: "bot-hash",
        name: cfg.name,
        role: "player",
        isBot: true,
        flagColor: cfg.flagColor,
        emblem: cfg.emblem,
        onboardingState: "settled",
        createdAt: now,
        lastSeenAt: now,
        lastResourceCollectedAt: now,
        resources: DEFAULT_PLAYER_RESOURCES,
      } as any);

      const ALL_LANDS = Array.from({ length: 60 }, (_, idx) => getStaticTerritory(idx)).filter((t): t is NonNullable<typeof t> => Boolean(t));
      const starterLandId = (i * 12 + 5) % ALL_LANDS.length;
      const staticT = getStaticTerritory(starterLandId);
      if (staticT) {
        const claim = await territoryClaims.findOne({ territoryId: starterLandId });
        if (!claim) {
          const botTown = defaultTownSnapshotForTerritory(staticT, cfg.id, 9000 + starterLandId);
          await Promise.all([
            territoryClaims.insertOne({ _id: `territory:${starterLandId}`, territoryId: starterLandId, playerId: cfg.id, claimedAt: now }),
            saves.updateOne(
              { playerId: cfg.id },
              { $set: { towns: [botTown], updatedAt: now }, $setOnInsert: { _id: `save:${cfg.id}`, playerId: cfg.id, resources: DEFAULT_PLAYER_RESOURCES } },
              { upsert: true }
            ),
          ]);
        }
      }
    }
  }
}

async function processBotAISimulation(now = new Date()) {
  try {
    const { players, saves, territoryClaims, territoryClearings, marchOrders } = await collections();
    const bots = await players.find({ isBot: true }).toArray();
    if (!bots || bots.length === 0) return;

    const ALL_LANDS = Array.from({ length: 60 }, (_, idx) => getStaticTerritory(idx)).filter((t): t is NonNullable<typeof t> => Boolean(t));
    const calcTroopVal = (inf: number, cav: number, art: number) => inf * 18 + cav * 34 + art * 58;
    const botIds = bots.map((bot) => bot._id);
    const [allClaims, botSaves, activeBotClearings, botMarches] = await Promise.all([
      territoryClaims.find({}).toArray(),
      saves.find({ playerId: { $in: botIds } }).toArray(),
      territoryClearings.find({ playerId: { $in: botIds } }).toArray(),
      marchOrders.find({ ownerId: { $in: botIds } }, { projection: { ownerId: 1 } }).toArray(),
    ]);
    const claimsByPlayer = new Map<string, typeof allClaims>();
    const allClaimedIds = new Set<number>();
    allClaims.forEach((claim: any) => {
      allClaimedIds.add(claim.territoryId);
      const list = claimsByPlayer.get(claim.playerId) || [];
      list.push(claim);
      claimsByPlayer.set(claim.playerId, list);
    });
    const saveByPlayer = new Map(botSaves.map((save: any) => [save.playerId, save]));
    const clearingByPlayer = new Map(activeBotClearings.map((clearing: any) => [clearing.playerId, clearing]));
    const marchCountByPlayer = new Map<string, number>();
    botMarches.forEach((march: any) => {
      marchCountByPlayer.set(march.ownerId, (marchCountByPlayer.get(march.ownerId) || 0) + 1);
    });
    let worldChanged = false;

    for (const bot of bots) {
      const claims = claimsByPlayer.get(bot._id) || [];
      const botTerritoryIds = new Set(claims.map((c: any) => c.territoryId));

      const botSave = saveByPlayer.get(bot._id) as any;
      let botTowns = Array.isArray(botSave?.towns) ? botSave.towns : [];

      if (claims.length === 0) {
        const unclaimed = ALL_LANDS.filter(l => !allClaimedIds.has(l.id));
        if (unclaimed.length > 0) {
          const pick = unclaimed[Math.floor(Math.random() * unclaimed.length)];
          const starterTown = defaultTownSnapshotForTerritory(pick, bot._id, 9000 + pick.id);
          await territoryClaims.insertOne({ _id: `territory:${pick.id}`, territoryId: pick.id, playerId: bot._id, claimedAt: now });
          await saves.updateOne(
            { playerId: bot._id },
            { $set: { towns: [starterTown], updatedAt: now }, $setOnInsert: { _id: `save:${bot._id}`, playerId: bot._id, resources: DEFAULT_PLAYER_RESOURCES } },
            { upsert: true }
          );
          allClaimedIds.add(pick.id);
          const insertedClaim = { _id: `territory:${pick.id}`, territoryId: pick.id, playerId: bot._id, claimedAt: now } as any;
          allClaims.push(insertedClaim);
          claimsByPlayer.set(bot._id, [insertedClaim]);
          saveByPlayer.set(bot._id, { ...(botSave || {}), playerId: bot._id, towns: [starterTown] });
          worldChanged = true;
          publishRealtime({
            type: "territory_claimed",
            territory: {
              ...pick,
              ownerId: bot._id,
              ownerName: bot.name,
              ownerFlagColor: bot.flagColor ?? "#ef4444",
              ownerEmblem: bot.emblem ?? "dragon",
            },
          });
        }
        continue;
      }

      // 1. Train troops for bot towns over time
      let updatedTowns = false;
      botTowns = botTowns.map((town: any) => {
        const inf = Math.min(600, (town.infantryCount || 100) + Math.floor(Math.random() * 6 + 2));
        const cav = Math.min(250, (town.cavalryCount || 30) + Math.floor(Math.random() * 3 + 1));
        const art = Math.min(100, (town.artilleryCount || 10) + Math.floor(Math.random() * 2));
        const totalTroops = calcTroopVal(inf, cav, art);
        updatedTowns = true;
        return {
          ...town,
          infantryCount: inf,
          cavalryCount: cav,
          artilleryCount: art,
          troops: totalTroops,
        };
      });

      if (updatedTowns) {
        await saves.updateOne({ playerId: bot._id }, { $set: { towns: botTowns, updatedAt: now } });
      }

      // 2. Bot Decision A: Expand / Clear wild territory
      const activeClearing = clearingByPlayer.get(bot._id);
      if (!activeClearing && Math.random() < 0.40) {
        let wildTargetId = -1;

        for (const tid of botTerritoryIds) {
          const staticT = getStaticTerritory(tid);
          if (staticT) {
            const neighbors = ALL_LANDS.filter(n => n.id !== staticT.id && Math.hypot(n.x - staticT.x, n.y - staticT.y) < 320);
            const wildNeighbors = neighbors.filter(n => !allClaimedIds.has(n.id));
            if (wildNeighbors.length > 0) {
              wildTargetId = wildNeighbors[Math.floor(Math.random() * wildNeighbors.length)].id;
              break;
            }
          }
        }

        if (wildTargetId >= 0) {
          const durationMs = 15000 + Math.floor(Math.random() * 10000);
          const arrivesAt = new Date(now.getTime() + durationMs);
          const completesAt = new Date(arrivesAt.getTime() + durationMs);
          await territoryClearings.updateOne(
            { territoryId: wildTargetId },
            {
              $set: {
                territoryId: wildTargetId,
                playerId: bot._id,
                startedAt: now,
                arrivesAt,
                completesAt,
              },
              $setOnInsert: { _id: `clearing:${wildTargetId}` },
            },
            { upsert: true }
          );
          clearingByPlayer.set(bot._id, { territoryId: wildTargetId, playerId: bot._id, startedAt: now, arrivesAt, completesAt });
          worldChanged = true;
          publishRealtime({
            type: "territory_clearing_started",
            clearing: toPublicClearing({ territoryId: wildTargetId, playerId: bot._id, startedAt: now, arrivesAt, completesAt }),
          });
        }
      }

      // 3. Bot Decision B: Launch March Attack
      const activeMarches = marchCountByPlayer.get(bot._id) || 0;
      if (activeMarches < 2 && Math.random() < 0.30 && botTowns.length > 0) {
        const enemyClaims = allClaims.filter((claim: any) => claim.playerId !== bot._id);
        if (enemyClaims.length > 0) {
          const targetClaim = enemyClaims[Math.floor(Math.random() * enemyClaims.length)];
          const sourceTown = botTowns[Math.floor(Math.random() * botTowns.length)];

          if (sourceTown && (sourceTown.troops || 0) > 80) {
            const attInf = Math.floor((sourceTown.infantryCount || 100) * 0.5);
            const attCav = Math.floor((sourceTown.cavalryCount || 30) * 0.5);
            const attArt = Math.floor((sourceTown.artilleryCount || 10) * 0.5);
            const attPower = calcTroopVal(attInf, attCav, attArt);

            sourceTown.infantryCount = Math.max(10, (sourceTown.infantryCount || 100) - attInf);
            sourceTown.cavalryCount = Math.max(0, (sourceTown.cavalryCount || 30) - attCav);
            sourceTown.artilleryCount = Math.max(0, (sourceTown.artilleryCount || 10) - attArt);
            sourceTown.troops = calcTroopVal(sourceTown.infantryCount, sourceTown.cavalryCount, sourceTown.artilleryCount);
            await saves.updateOne({ playerId: bot._id }, { $set: { towns: botTowns, updatedAt: now } });

            const marchDuration = 15000 + Math.floor(Math.random() * 15000);
            const marchId = `march:${bot._id}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
            const marchDoc = {
              _id: marchId,
              id: marchId,
              ownerId: bot._id,
              ownerName: bot.name,
      fromTerritoryId: normalizeWorldTerritoryId(sourceTown.regionId ?? sourceTown.id ?? 0),
              toTerritoryId: Number(targetClaim.territoryId),
              isAttack: true,
              kind: "attack" as const,
              power: attPower,
              troops: attInf + attCav + attArt,
              infantry: attInf,
              cavalry: attCav,
              artillery: attArt,
              startedAt: now.toISOString(),
              arrivesAt: new Date(now.getTime() + marchDuration).toISOString(),
            };
            await marchOrders.insertOne(marchDoc as any);
            marchCountByPlayer.set(bot._id, activeMarches + 1);
            publishRealtime({ type: "march_created", march: marchDoc });
          }
        }
      }
    }
    if (worldChanged) {
      await bumpWorldCacheVersion();
    }
  } catch (err) {
    console.error("Bot AI simulation error:", err);
  }
}

async function toPublicAlliance(alliance: {
  _id: string;
  name: string;
  tag: string;
  emblem?: string;
  leaderId: string;
  memberIds: string[];
  createdAt: Date;
}): Promise<AllianceInfo> {
  const { players } = await collections();
  const memberDocs = alliance.memberIds.length > 0
    ? await players.find({ _id: { $in: alliance.memberIds } }).toArray()
    : [];
  const nameById = new Map(memberDocs.map((player) => [player._id, player.name]));
  return {
    id: alliance._id,
    name: alliance.name,
    tag: alliance.tag,
    emblem: alliance.emblem || "shield",
    leaderId: alliance.leaderId,
    members: alliance.memberIds.map((playerId) => ({
      playerId,
      name: nameById.get(playerId) ?? playerId,
      role: playerId === alliance.leaderId ? "leader" : "member",
    })),
    memberCount: alliance.memberIds.length,
    maxMembers: ALLIANCE_MAX_MEMBERS,
    createdAt: alliance.createdAt.toISOString(),
  };
}

async function toPublicAllianceAid(aid: {
  _id: string;
  allianceId: string;
  fromPlayerId: string;
  toPlayerId: string;
  resources: Partial<ResourceBag>;
  troops: number;
  status: "pending" | "claimed";
  createdAt: Date;
  claimedAt?: Date;
}): Promise<AllianceAid> {
  const { players } = await collections();
  const docs = await players.find({ _id: { $in: [aid.fromPlayerId, aid.toPlayerId] } }).toArray();
  const nameById = new Map(docs.map((player) => [player._id, player.name]));
  return {
    id: aid._id,
    allianceId: aid.allianceId,
    fromPlayerId: aid.fromPlayerId,
    fromName: nameById.get(aid.fromPlayerId) ?? aid.fromPlayerId,
    toPlayerId: aid.toPlayerId,
    toName: nameById.get(aid.toPlayerId) ?? aid.toPlayerId,
    resources: aid.resources,
    troops: aid.troops,
    status: aid.status,
    createdAt: aid.createdAt.toISOString(),
    claimedAt: aid.claimedAt?.toISOString(),
  };
}

async function buildAllianceState(playerId: string): Promise<AllianceStateResult> {
  const { alliances, allianceAids, players } = await collections();
  const [mine, docs, aidInbox, aidOutbox, player] = await Promise.all([
    alliances.findOne({ memberIds: playerId }),
    alliances.find({}, { sort: { updatedAt: -1 }, limit: 20 }).toArray(),
    allianceAids.find({ toPlayerId: playerId, status: "pending" }, { sort: { createdAt: -1 }, limit: 30 }).toArray(),
    allianceAids.find({ fromPlayerId: playerId }, { sort: { createdAt: -1 }, limit: 30 }).toArray(),
    players.findOne({ _id: playerId }),
  ]);
  return {
    alliance: mine ? await toPublicAlliance(mine) : null,
    alliances: await Promise.all(docs.map(toPublicAlliance)),
    aidInbox: await Promise.all(aidInbox.map(toPublicAllianceAid)),
    aidOutbox: await Promise.all(aidOutbox.map(toPublicAllianceAid)),
    allianceTroopReserve: player?.allianceTroopReserve ?? 0,
  };
}

async function cachedWorldTerritoriesPayload() {
  const version = await getWorldCacheVersion();
  const key = `island:world:territories:v${version}`;
  const cached = await cacheGetJson<WorldTerritoriesResult>(key);
  if (cached) return cached;
  const payload = await buildWorldTerritoriesPayload();
  await cacheSetJson(key, payload, 8);
  return payload;
}





function calcTravelMetrics(
  from: Pick<TerritoryInfo, "x" | "y" | "isIslet">,
  to: Pick<TerritoryInfo, "x" | "y" | "isIslet">,
  units: { infantry: number; cavalry: number; artillery: number },
  marchConfig: Pick<GameConfig, "infantrySpeed" | "cavalrySpeed" | "artillerySpeed" | "shipSpeed" | "gameHourSeconds"> = DEFAULT_MARCH_CONFIG,
) {
  const dist = Math.hypot(from.x - to.x, from.y - to.y);
  const distanceKm = Math.max(1, Math.round(dist * MAP_UNITS_TO_KM));
  const usesShip = from.isIslet || to.isIslet;
  const speeds: number[] = [];
  if (usesShip) {
    speeds.push(marchConfig.shipSpeed);
  } else {
    if (units.infantry > 0) speeds.push(marchConfig.infantrySpeed);
    if (units.cavalry > 0) speeds.push(marchConfig.cavalrySpeed);
    if (units.artillery > 0) speeds.push(marchConfig.artillerySpeed);
  }
  const speedKmh = speeds.length > 0 ? Math.min(...speeds) : marchConfig.infantrySpeed;
  const travelSeconds = Math.max(6, Math.round((distanceKm / speedKmh) * marchConfig.gameHourSeconds));
  return { distanceKm, speedKmh, travelSeconds, usesShip };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", config.TRUST_PROXY ? 1 : false);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "128kb" }));
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (e.g. server-to-server, curl)
        if (!origin) return callback(null, true);
        if (isAllowedCorsOrigin(origin)) return callback(null, true);
        // Silently deny instead of throwing (avoids log spam & crashes)
        return callback(null, false);
      },
      credentials: false,
    }),
  );
  const isDevLoopback = (req: any) => {
    const ip = req.ip || req.socket?.remoteAddress || "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  };

  app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false, skip: isDevLoopback }));
  app.use("/api/auth", rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, skip: isDevLoopback }));
  app.use("/api/game", rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false, skip: isDevLoopback }));
  app.use("/api/alliance", rateLimit({ windowMs: 60_000, limit: 70, standardHeaders: true, legacyHeaders: false, skip: isDevLoopback }));
  app.use("/api/admin", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false, skip: isDevLoopback }));

  const stateReadLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?.id || req.ip || "anonymous"),
    skip: isDevLoopback,
  });
  const territoryReadLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?.id || req.ip || "anonymous"),
    skip: isDevLoopback,
  });

  app.get("/api/health", (_req, res) => {
    const payload: ServerStatus = { ok: true, service: "island-empire-api", time: new Date().toISOString() };
    res.json(payload);
  });

  app.get("/api/realtime/stats", requireAuth, requireAdmin, (_req, res) => {
    res.json(realtimeStats());
  });

  app.get("/api/auth/challenge", (req, res) => {
    res.json(createAntiBotChallenge(req));
  });

  app.post("/api/auth/admin/login", async (req, res) => {
    const parsed = AdminLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "Invalid login payload" });
    const { username, password } = parsed.data;
    if (username !== config.ADMIN_USER || password !== config.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    }
    const token = signToken({ id: "admin", role: "admin" });
    res.json({ token });
  });

  app.post("/api/auth/player/register", async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Tài khoản (3-40 ký tự) hoặc mật khẩu (8-200 ký tự) không hợp lệ" });
    }
    const { username, password, flagColor, emblem, starterLandId } = parsed.data;
    if (!verifyAntiBotProof(req, parsed.data)) {
      return res.status(429).json({ error: "anti_bot_failed", message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn" });
    }
    if (!enforceAuthAttempt(req, res, "register", username)) return;
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
      flagColor,
      emblem,
      starterLandId,
      onboardingState: "needs_claim",
      resources: DEFAULT_PLAYER_RESOURCES,
      lastResourceCollectedAt: now,
      role: "player",
      newbieShieldUntil: new Date(now.getTime() + 24 * 3600 * 1000),
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
    if (!verifyAntiBotProof(req, parsed.data)) {
      return res.status(429).json({ error: "anti_bot_failed", message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn" });
    }
    if (!enforceAuthAttempt(req, res, "login", username)) return;
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
    const antiBot = AntiBotProofSchema.safeParse(req.body);
    if (!antiBot.success || !verifyAntiBotProof(req, antiBot.data)) {
      return res.status(429).json({ error: "anti_bot_failed", message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn" });
    }
    const name = z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N} _-]+$/u).catch(`PLAYER-${Math.floor(Math.random() * 9999)}`).parse(req.body?.name);
    if (!enforceAuthAttempt(req, res, "guest", name)) return;
    const id = `guest:${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const { players } = await collections();
    const now = new Date();
    await players.updateOne(
      { _id: id },
      {
        $set: { name, role: "player", lastSeenAt: now },
        $setOnInsert: {
          flagColor: "#2f70d7",
          emblem: "shield",
          createdAt: now,
          onboardingState: "needs_claim",
          resources: DEFAULT_PLAYER_RESOURCES,
          lastResourceCollectedAt: now,
          newbieShieldUntil: new Date(now.getTime() + 24 * 3600 * 1000),
        },
      },
      { upsert: true },
    );
    res.json({ token: signToken({ id, role: "player" }), playerId: id });
  });

  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const { battleReports } = await collections();
      const reports = await battleReports
        .find({
          $or: [{ attackerId: req.user!.id }, { defenderId: req.user!.id }],
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      res.json({ ok: true, reports });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message || "Failed to fetch battle reports" });
    }
  });

  app.post("/api/player/profile", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "profile:update", 12, 60_000)) return;
    const parsed = z.object({
      flagColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      // Keep this list aligned with the kingdom-creation modal. The default
      // newbie emblem is `crown`; rejecting it prevented the clearing request
      // from ever being sent.
      emblem: z.enum([
        "crown", "swords", "shield", "eagle", "lion", "dragon",
        "tree", "mountain", "anchor", "star", "tower", "flame", "feather", "spear",
      ]).optional(),
      cityName: z.string().max(60).optional(),
    }).strict().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Màu cờ hoặc biểu tượng không hợp lệ" });
    }
    const { flagColor, emblem, cityName } = parsed.data;
    const { players } = await collections();
    const updateData: any = {};
    if (flagColor) updateData.flagColor = flagColor;
    if (emblem) updateData.emblem = emblem;
    if (cityName) updateData.cityName = cityName;

    if (Object.keys(updateData).length > 0 && req.user?.id) {
      await players.updateOne(
        { _id: req.user.id },
        { $set: updateData }
      );
    }
    await bumpWorldCacheVersion();
    if (req.user?.id) {
      await publishPlayerState(req.user.id, "profile_updated", null, null);
    }
    res.json({ ok: true });
  });

  app.post("/api/player/active-map", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "player:active-map", 30, 60_000)) return;
    const parsed = ActiveMapSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "Bản đồ không hợp lệ" });
    const { players } = await collections();
    await players.updateOne(
      { _id: req.user!.id },
      { $set: { activeMap: parsed.data.activeMap, lastSeenAt: new Date() } },
      { upsert: true },
    );
    res.json({ ok: true, activeMap: parsed.data.activeMap });
  });

  app.get("/api/world/territories", requireAuth, territoryReadLimiter, async (_req, res) => {
    const payload = await cachedWorldTerritoriesPayload();
    res.setHeader("X-World-Cache", "enabled");
    res.json(payload);
  });

  app.get("/api/game/state", requireAuth, stateReadLimiter, async (_req, res) => {
    await processWorldTick(new Date());
    const payload = await buildGameStatePayload(_req.user!.id);
    res.setHeader("X-World-Cache", "partial");
    res.json(payload);
  });

  app.get("/api/alliance/me", requireAuth, async (req, res) => {
    res.json(await buildAllianceState(req.user!.id));
  });

  app.post("/api/alliance/create", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:create", 4, 60_000)) return;
    const parsed = CreateAllianceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Tên liên minh hoặc TAG không hợp lệ" });
    }
    const { alliances, players } = await collections();
    const existingMembership = await alliances.findOne({ memberIds: req.user!.id });
    if (existingMembership) {
      return res.status(409).json({ error: "already_in_alliance", message: "Bạn đã ở trong một liên minh" });
    }
    const resourceState = await collectPlayerResources(req.user!.id);
    if (resourceState.resources.gems < ALLIANCE_CREATE_GEMS_COST) {
      return res.status(409).json({ error: "not_enough_gems", message: `Cần ${ALLIANCE_CREATE_GEMS_COST} kim cương để lập liên minh` });
    }
    const tag = parsed.data.tag.toUpperCase();
    const id = `alliance:${tag.toLowerCase()}`;
    const now = new Date();
    try {
      await alliances.insertOne({
        _id: id,
        name: parsed.data.name,
        tag,
        emblem: parsed.data.emblem,
        leaderId: req.user!.id,
        memberIds: [req.user!.id],
        createdAt: now,
        updatedAt: now,
      });
      await players.updateOne(
        { _id: req.user!.id },
        { $set: { resources: { ...resourceState.resources, gems: resourceState.resources.gems - ALLIANCE_CREATE_GEMS_COST } } },
      );
    } catch (err: any) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: "tag_taken", message: "TAG liên minh đã tồn tại" });
      }
      throw err;
    }
    await bumpWorldCacheVersion();
    const alliance = await alliances.findOne({ _id: id });
    const payload: AllianceActionResult = { ok: true, alliance: alliance ? await toPublicAlliance(alliance) : null };
    res.json(payload);
  });

  app.post("/api/alliance/join", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:join", 10, 60_000)) return;
    const parsed = JoinAllianceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "ID liên minh không hợp lệ" });
    }
    const { alliances } = await collections();
    const existingMembership = await alliances.findOne({ memberIds: req.user!.id });
    if (existingMembership) {
      return res.status(409).json({ error: "already_in_alliance", message: "Bạn đã ở trong một liên minh" });
    }
    const alliance = await alliances.findOne({ _id: parsed.data.allianceId });
    if (!alliance) {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy liên minh" });
    }
    if (alliance.memberIds.length >= ALLIANCE_MAX_MEMBERS) {
      return res.status(409).json({ error: "alliance_full", message: "Liên minh đã đủ thành viên" });
    }
    await alliances.updateOne(
      { _id: alliance._id },
      { $addToSet: { memberIds: req.user!.id }, $set: { updatedAt: new Date() } },
    );
    await bumpWorldCacheVersion();
    const updated = await alliances.findOne({ _id: alliance._id });
    const payload: AllianceActionResult = { ok: true, alliance: updated ? await toPublicAlliance(updated) : null };
    res.json(payload);
  });

  app.post("/api/alliance/leave", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:leave", 8, 60_000)) return;
    const { alliances } = await collections();
    const alliance = await alliances.findOne({ memberIds: req.user!.id });
    if (!alliance) {
      const payload: AllianceActionResult = { ok: true, alliance: null };
      return res.json(payload);
    }
    if (alliance.leaderId === req.user!.id && alliance.memberIds.length > 1) {
      return res.status(409).json({ error: "leader_cannot_leave", message: "Minh chủ cần chuyển quyền trước khi rời liên minh" });
    }
    if (alliance.leaderId === req.user!.id) {
      await alliances.deleteOne({ _id: alliance._id });
      await bumpWorldCacheVersion();
      const payload: AllianceActionResult = { ok: true, alliance: null };
      return res.json(payload);
    }
    await alliances.updateOne(
      { _id: alliance._id },
      { $pull: { memberIds: req.user!.id }, $set: { updatedAt: new Date() } },
    );
    await bumpWorldCacheVersion();
    const payload: AllianceActionResult = { ok: true, alliance: null };
    res.json(payload);
  });

  app.post("/api/alliance/aid", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:aid", 20, 60_000)) return;
    const parsed = SendAllianceAidSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Dữ liệu viện trợ không hợp lệ" });
    }
    if (parsed.data.toPlayerId === req.user!.id) {
      return res.status(400).json({ error: "bad_request", message: "Không thể tự viện trợ cho chính mình" });
    }
    const { alliances, players, allianceAids } = await collections();
    const alliance = await alliances.findOne({ memberIds: req.user!.id });
    if (!alliance || !alliance.memberIds.includes(parsed.data.toPlayerId)) {
      return res.status(403).json({ error: "not_alliance_member", message: "Người nhận không cùng liên minh" });
    }
    const targetPlayer = await players.findOne({ _id: parsed.data.toPlayerId });
    if (!targetPlayer) {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy thành viên nhận viện trợ" });
    }
    const resources = compactResourceDelta(parsed.data.resources);
    const troops = Math.min(ALLIANCE_AID_MAX_TROOPS, Math.floor(parsed.data.troops || 0));
    const resourceTotal = RESOURCE_KEYS.reduce((sum, key) => sum + (resources[key] || 0), 0);
    if (resourceTotal <= 0 && troops <= 0) {
      return res.status(400).json({ error: "empty_aid", message: "Cần chọn tài nguyên hoặc lính để viện trợ" });
    }
    const troopLogistics = {
      gold: troops,
      food: troops * 2,
    };
    const senderState = await collectPlayerResources(req.user!.id);
    const nextSender = { ...senderState.resources };
    for (const key of RESOURCE_KEYS) {
      const amount = Math.floor(resources[key] || 0) + (key === "gold" ? troopLogistics.gold : 0) + (key === "food" ? troopLogistics.food : 0);
      if (amount > nextSender[key]) {
        return res.status(409).json({ error: "not_enough_resources", message: `Không đủ ${key} để gửi viện trợ` });
      }
      nextSender[key] -= amount;
    }
    const now = new Date();
    const aid = {
      _id: `aid:${alliance._id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      allianceId: alliance._id,
      fromPlayerId: req.user!.id,
      toPlayerId: parsed.data.toPlayerId,
      resources,
      troops,
      status: "pending" as const,
      createdAt: now,
    };
    await players.updateOne({ _id: req.user!.id }, { $set: { resources: nextSender, lastSeenAt: now } });
    await allianceAids.insertOne(aid);
    res.json(await buildAllianceState(req.user!.id));
  });

  app.post("/api/alliance/aid/:id/claim", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:aid:claim", 30, 60_000)) return;
    const { players, allianceAids, territoryClaims } = await collections();
    const aid = await allianceAids.findOne({ _id: req.params.id, toPlayerId: req.user!.id, status: "pending" });
    if (!aid) {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy viện trợ đang chờ nhận" });
    }
    const resourceState = await collectPlayerResources(req.user!.id);
    const ownedCount = await territoryClaims.countDocuments({ playerId: req.user!.id });
    const capacity = resourceCapacityForOwnedTerritories(ownedCount);
    const nextResources = { ...resourceState.resources };
    RESOURCE_KEYS.forEach((key) => {
      nextResources[key] = Math.min(capacity[key], nextResources[key] + Math.floor(aid.resources[key] || 0));
    });
    const now = new Date();
    await players.updateOne(
      { _id: req.user!.id },
      {
        $set: { resources: nextResources, lastSeenAt: now },
        $inc: { allianceTroopReserve: aid.troops },
      },
    );
    await allianceAids.updateOne(
      { _id: aid._id },
      { $set: { status: "claimed", claimedAt: now } },
    );
    res.json(await buildAllianceState(req.user!.id));
  });

  app.post("/api/game/clearings", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:clearing:start", 20, 60_000)) return;
    const parsed = StartClearingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "ID lãnh thổ không hợp lệ" });
    const territory = getStaticTerritory(parsed.data.territoryId);
    if (!territory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings, alliances, saves } = await collections();
    const claim = await territoryClaims.findOne({ territoryId: territory.id });
    if (claim && claim.playerId !== req.user!.id) {
      return res.status(409).json({ error: "territory_taken", message: "Lãnh thổ này đã có người chiếm" });
    }
    if (claim && claim.playerId === req.user!.id) {
      return res.status(409).json({ error: "already_owned", message: "Bạn đã sở hữu lãnh thổ này, hãy chọn vùng đất hoang khác để xây thành" });
    }
    const existing = await territoryClearings.findOne({ territoryId: territory.id });
    if (existing && existing.playerId !== req.user!.id) {
      return res.status(409).json({ error: "already_clearing", message: "Đã có người khác đang xây thành trên lãnh thổ này" });
    }
    const activeByPlayer = await territoryClearings.findOne({ playerId: req.user!.id });
    if (activeByPlayer && activeByPlayer.territoryId !== territory.id) {
      return res.status(409).json({
        error: "active_clearing_limit",
        message: "Bạn chỉ có 1 đội thợ xây thành cùng lúc",
        territoryId: activeByPlayer.territoryId,
      });
    }
    const now = new Date();
    const ownedCount = await territoryClaims.countDocuments({ playerId: req.user!.id });
    
    const isStarterClaim = (ownedCount === 0);

    const buildCost = isStarterClaim
      ? emptyResources()
      : territoryBuildCost(territory);

    const resourceState = await collectPlayerResources(req.user!.id, now);
    if (!existing && !canAfford(resourceState.resources, buildCost)) {
      return res.status(409).json({
        error: "not_enough_resources",
        message: `Không đủ tài nguyên xây thành. Cần ${resourceCostMessage(buildCost)}`,
        cost: buildCost,
        resources: resourceState.resources,
      });
    }
    const nextResources = existing ? resourceState.resources : subtractCost(resourceState.resources, buildCost);
    const ownedClaimsList = await territoryClaims.find({ playerId: req.user!.id }).toArray();
    const save = (await saves.findOne({ playerId: req.user!.id })) as any;
    const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
    let sourceTownId: number | undefined;
    let sourceTerritoryId: number | undefined;
    let sourceX: number | undefined;
    let sourceY: number | undefined;
    let connectionType: "land" | "sea" | undefined;
    if (!isStarterClaim && !existing) {
      const source = nearestExpansionSource(ownedClaimsList, territory);
      if (!source) {
        return res.status(409).json({ error: "frontier_not_connected", message: "Pháo đài mới phải nối bằng đường bộ hoặc Hải Lộ từ lãnh địa của bạn" });
      }
      sourceTerritoryId = source.territory.id;
      sourceTownId = townIdForTerritory(source.territory.id);
      sourceX = source.territory.x;
      sourceY = source.territory.y;
      connectionType = source.connectionType;
    }
    const gameSettings = await loadGameConfig();
    const clearingSeconds = calcClearingSeconds(territory.rx, territory.ry, territory.biome, gameSettings.settlerSpeed, gameSettings.gameHourSeconds);
    
    // Construction crews travel from the server-selected frontier stronghold.
    let originX = territory.x - Math.min(120, Math.max(45, territory.rx * 0.42));
    let originY = territory.y + Math.min(70, Math.max(24, territory.ry * 0.18));
    if (sourceTerritoryId !== undefined) {
      originX = sourceX!;
      originY = sourceY!;
    } else if (ownedClaimsList.length > 0) {
      const candidates = ownedClaimsList.map((c) => {
        const t = getStaticTerritory(c.territoryId);
        const dist = t ? Math.hypot(t.x - territory.x, t.y - territory.y) : Infinity;
        const isPort = Boolean(t && (t.isIslet || t.specialResources?.includes("Bến tàu tự nhiên")));
        return { t, dist, isPort };
      }).filter((item) => item.t !== undefined);

      if (territory.isIslet || candidates.some((c) => c.isPort)) {
        const portCandidates = candidates.filter((c) => c.isPort);
        if (portCandidates.length > 0) {
          portCandidates.sort((a, b) => a.dist - b.dist);
          originX = portCandidates[0].t!.x;
          originY = portCandidates[0].t!.y;
        } else {
          candidates.sort((a, b) => a.dist - b.dist);
          originX = candidates[0].t!.x;
          originY = candidates[0].t!.y;
        }
      } else if (candidates.length > 0) {
        candidates.sort((a, b) => a.dist - b.dist);
        originX = candidates[0].t!.x;
        originY = candidates[0].t!.y;
      }
    }
    const distanceKm = Math.hypot(originX - territory.x, originY - territory.y) * MAP_UNITS_TO_KM;
    const travelSeconds = Math.max(15, Math.round((distanceKm / Math.max(1, gameSettings.settlerSpeed || 35)) * (gameSettings.gameHourSeconds || 30)));
    const arrivesAt = new Date(now.getTime() + travelSeconds * 1000);
    const completesAt = new Date(arrivesAt.getTime() + clearingSeconds * 1000);

    const clearing = existing ?? {
      _id: `clearing:${territory.id}`,
      territoryId: territory.id,
      playerId: req.user!.id,
      buildCost,
      isStarterClaim,
      sourceTownId,
      sourceTerritoryId,
      sourceX,
      sourceY,
      connectionType,
      startedAt: now,
      arrivesAt,
      completesAt,
    };
    if (!existing) {
      try {
        await territoryClearings.insertOne(clearing);
      } catch (err: any) {
        if (err?.code === 11000) {
          const locked = await territoryClearings.findOne({ territoryId: territory.id });
          if (locked?.playerId === req.user!.id) {
            const payload: StartClearingResult = { ok: true, clearing: toPublicClearing(locked) };
            return res.json(payload);
          }
          return res.status(409).json({ error: "already_clearing", message: "Đã có người khác đang xây thành trên lãnh thổ này" });
        }
        throw err;
      }
      await Promise.all([
        saves.updateOne(
          { playerId: req.user!.id },
          { $set: { towns, updatedAt: now }, $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id, resources: DEFAULT_PLAYER_RESOURCES } },
          { upsert: true },
        ),
        players.updateOne(
          { _id: req.user!.id },
          { $set: { onboardingState: "claiming", lastSeenAt: now, resources: nextResources } },
        ),
      ]);
      await bumpWorldCacheVersion();
    }
    const payload: StartClearingResult = { ok: true, clearing: toPublicClearing(clearing) };
    publishRealtime({ type: "territory_clearing_started", clearing: payload.clearing });
    if (!existing) {
      await publishPlayerState(req.user!.id, "clearing_started", nextResources, towns);
    }
    res.json(payload);
  });

  app.post("/api/game/clearings/:id/complete", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:clearing:complete", 30, 60_000)) return;
    const id = Number(req.params.id);
    const territory = Number.isInteger(id) ? getStaticTerritory(id) : undefined;
    if (!territory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings, alliances, saves } = await collections();
    const existingClaim = await territoryClaims.findOne({ territoryId: territory.id });
    if (existingClaim && existingClaim.playerId !== req.user!.id) {
      return res.status(409).json({ error: "territory_taken", message: "Lãnh thổ này đã có người chiếm" });
    }
    if (existingClaim && existingClaim.playerId === req.user!.id) {
      return res.status(409).json({ error: "already_owned", message: "Bạn đã sở hữu lãnh thổ này" });
    }
    const clearing = await territoryClearings.findOne({ territoryId: territory.id, playerId: req.user!.id });
    const now = new Date();
    if (!clearing) {
      return res.status(404).json({ error: "no_active_clearing", message: "Bạn cần bắt đầu xây thành và trả chi phí trước khi hoàn tất" });
    }
    if (await cancelBrokenRouteClearing(clearing, now)) {
      return res.status(409).json({ error: "clearing_route_lost", message: "Đường tiếp tế đã bị cắt. Đoàn dân làng và vật tư đã thất lạc." });
    }
    if (clearing.completesAt.getTime() > now.getTime()) {
      return res.status(409).json({ error: "clearing_not_ready", message: "Xây thành chưa hoàn tất", readyAt: clearing.completesAt.toISOString() });
    }
    const userClaims = await territoryClaims.find({ playerId: req.user!.id }).toArray();
    const hasSubCapital = userClaims.some((c) => c.settlementKind === "sub_capital");
    const isSubCapital = !clearing.isStarterClaim && userClaims.length >= 19 && !hasSubCapital;
    const computedSettlementKind = clearing.isStarterClaim ? "capital" : (isSubCapital ? "sub_capital" : "military");

    await territoryClaims.updateOne(
      { territoryId: territory.id },
      {
        $setOnInsert: {
          _id: `territory:${territory.id}`,
          territoryId: territory.id,
          playerId: req.user!.id,
          claimedAt: now,
          settlementKind: computedSettlementKind,
          parentTerritoryId: clearing.isStarterClaim ? undefined : clearing.sourceTerritoryId,
          connectionType: clearing.connectionType,
        },
      },
      { upsert: true },
    );
    await territoryClearings.deleteOne({ territoryId: territory.id, playerId: req.user!.id });
    await players.updateOne({ _id: req.user!.id }, { $set: { onboardingState: "settled", lastSeenAt: now } });
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const saveDoc = (await saves.findOne({ playerId: req.user!.id })) as any;
    const towns = Array.isArray(saveDoc?.towns) ? removeTownForTerritory(saveDoc.towns, territory) : [];
    const town = normalizeTownSnapshotForState(defaultTownSnapshotForTerritory(territory, req.user!.id), req.user!.id, territory);
    towns.push(town);
    await saves.updateOne(
      { playerId: req.user!.id },
      {
        $set: { towns, updatedAt: now },
        $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id, resources: DEFAULT_PLAYER_RESOURCES },
      },
      { upsert: true },
    );
    const [player, alliance] = await Promise.all([
      players.findOne({ _id: req.user!.id }),
      alliances.findOne({ memberIds: req.user!.id }),
    ]);
    await bumpWorldCacheVersion();
    const payload: CompleteClearingResult = {
      ok: true,
      territory: { 
        ...territory, 
        ownerId: req.user!.id, 
        ownerName: player?.name ?? req.user!.id,
        ownerFlagColor: player?.flagColor,
        ownerEmblem: player?.emblem,
        ownerAllianceTag: alliance?.tag,
        ownerAllianceEmblem: alliance?.emblem,
      },
    };
    publishRealtime({ type: "territory_claimed", territory: payload.territory });
    await publishPlayerState(req.user!.id, "territory_claimed", resourceState.resources, towns);
    res.json(payload);
  });

  app.delete("/api/game/clearings/:id", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:clearing:cancel", 20, 60_000)) return;
    const id = Number(req.params.id);
    const territory = Number.isInteger(id) ? getStaticTerritory(id) : undefined;
    if (!territory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings, saves } = await collections();
    const clearing = await territoryClearings.findOne({ territoryId: territory.id, playerId: req.user!.id });
    if (!clearing) {
      return res.status(404).json({ error: "not_found", message: "Không có lệnh xây thành đang chạy" });
    }
    const now = new Date();
    if (await cancelBrokenRouteClearing(clearing, now)) {
      return res.status(409).json({
        error: "clearing_route_lost",
        message: "Đường tiếp tế đã bị cắt. Đoàn dân làng và vật tư đã thất lạc.",
      });
    }
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const ownedCount = await territoryClaims.countDocuments({ playerId: req.user!.id });
    const capacity = resourceCapacityForOwnedTerritories(ownedCount);
    const refund = clearingBuildCostForRefund(clearing, territory, ownedCount);
    const nextResources = { ...resourceState.resources };
    RESOURCE_KEYS.forEach((key) => {
      nextResources[key] = Math.min(capacity[key], Math.floor(nextResources[key] + Math.floor(refund[key] || 0)));
    });
    const save = (await saves.findOne({ playerId: req.user!.id })) as any;
    const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
    await Promise.all([
      territoryClearings.deleteOne({ territoryId: territory.id, playerId: req.user!.id }),
      players.updateOne({ _id: req.user!.id }, { $set: { resources: nextResources, onboardingState: "settled", lastSeenAt: now } }),
      saves.updateOne(
        { playerId: req.user!.id },
        { $set: { towns, updatedAt: now }, $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id, resources: DEFAULT_PLAYER_RESOURCES } },
        { upsert: true },
      ),
    ]);
    await bumpWorldCacheVersion();
    publishRealtime({ type: "territory_clearing_cancelled", territoryId: territory.id, playerId: req.user!.id });
    await publishPlayerState(req.user!.id, "clearing_cancelled", nextResources, towns);
    res.json({ ok: true, resources: nextResources, refund });
  });

  app.post("/api/game/marches", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:march", 35, 60_000)) return;
    const parsed = CreateMarchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request", message: "Lệnh hành quân không hợp lệ" });
    const from = getStaticTerritory(parsed.data.fromTerritoryId);
    const to = getStaticTerritory(parsed.data.toTerritoryId);
    if (!from || !to) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ hành quân" });
    const { territoryClaims, marchOrders, players, saves } = await collections();
    const sourceClaim = await territoryClaims.findOne({ territoryId: from.id });
    if (!sourceClaim || sourceClaim.playerId !== req.user!.id) {
      return res.status(403).json({ error: "not_owner", message: "Bạn không sở hữu lãnh thổ xuất phát" });
    }
    const playerClaims = await territoryClaims.find({ playerId: req.user!.id }).toArray();
    if (!isClaimConnectedToCapital(playerClaims, from.id)) {
      return res.status(409).json({ error: "isolated_stronghold", message: "Pháo đài xuất phát đã bị cô lập khỏi Hoàng Thành" });
    }
    
    if (parsed.data.kind === "attack") {
      const hasPlayerPort = playerClaims.some(claim => {
        const t = getStaticTerritory(claim.territoryId);
        return t && (t.isIslet || t.coastal || t.specialResources?.includes("Bến tàu tự nhiên"));
      });
      
      const borderingClaims = playerClaims.filter(claim => {
        const claimTerritory = getStaticTerritory(claim.territoryId);
        return claimTerritory && territoryConnectionType(claimTerritory, to) !== null;
      });
      
      let isAttackAllowed = false;
      
      if (to.isIslet && hasPlayerPort) {
        // Exception: Islands can be attacked freely if the player has at least one port
        isAttackAllowed = true;
      } else if (borderingClaims.length > 0) {
        // Normal Adjacency rule
        const hasLandBorder = borderingClaims.some(claim => {
          const claimTerritory = getStaticTerritory(claim.territoryId);
          return claimTerritory && territoryConnectionType(claimTerritory, to) === "land";
        });
        
        if (hasLandBorder) {
          isAttackAllowed = true;
        } else {
          // If only sea connected, target must be coastal/island
          const isTargetCoastal = to.isIslet || to.coastal || to.specialResources?.includes("Bến tàu tự nhiên");
          if (isTargetCoastal) {
            isAttackAllowed = true;
          } else {
            return res.status(409).json({ error: "target_not_coastal", message: "Nếu tấn công vượt biển/đảo, lãnh thổ đích bắt buộc phải là vùng giáp biển hoặc hải đảo" });
          }
        }
      }
      
      if (!isAttackAllowed) {
        return res.status(409).json({ error: "target_not_on_frontier", message: "Không thể tấn công: Mục tiêu không giáp ranh với lãnh thổ của bạn và bạn chưa sở hữu bến tàu nào" });
      }
    }
    const activeMarchCount = await marchOrders.countDocuments({ ownerId: req.user!.id });
    if (activeMarchCount >= MAX_ACTIVE_MARCHES_PER_PLAYER) {
      return res.status(409).json({
        error: "active_march_limit",
        message: `Bạn chỉ được có tối đa ${MAX_ACTIVE_MARCHES_PER_PLAYER} đạo quân đang hành quân cùng lúc`,
      });
    }
    const now = new Date();

    // Check newbie protection shield on target
    const targetClaim = await territoryClaims.findOne({ territoryId: to.id });
    if (parsed.data.kind === "attack" && targetClaim && targetClaim.playerId !== req.user!.id) {
      const targetPlayer = await players.findOne({ _id: targetClaim.playerId });
      // Newbie shield check disabled
      // if (targetPlayer?.newbieShieldUntil && new Date(targetPlayer.newbieShieldUntil).getTime() > now.getTime()) {
      //   return res.status(403).json({ error: "target_protected", message: "Thành trì đối thủ đang trong thời gian bảo vệ tân thủ" });
      // }
    }

    // Break attacker's own shield if attacking another player
    const attacker = await players.findOne({ _id: req.user!.id });
    let finalShieldUntil = attacker?.newbieShieldUntil;
    if (parsed.data.kind === "attack" && targetClaim && targetClaim.playerId !== req.user!.id) {
      if (attacker?.newbieShieldUntil && new Date(attacker.newbieShieldUntil).getTime() > now.getTime()) {
        finalShieldUntil = new Date(0);
        await players.updateOne({ _id: req.user!.id }, { $set: { newbieShieldUntil: finalShieldUntil } });
      }
    }

    const gameSettings = await loadGameConfig();
    let infantry = Math.max(0, Math.floor(Number(parsed.data.infantry || 0) || 0));
    let cavalry = Math.max(0, Math.floor(Number(parsed.data.cavalry || 0) || 0));
    let artillery = Math.max(0, Math.floor(Number(parsed.data.artillery || 0) || 0));
    if (infantry + cavalry + artillery <= 0 && parsed.data.troops > 0) {
      infantry = inferInfantryFromTroops(parsed.data.troops, gameSettings);
    }
    const unitPower = infantry * gameSettings.infantryTroopsValue +
      cavalry * gameSettings.cavalryTroopsValue +
      artillery * gameSettings.artilleryTroopsValue;
    const troops = unitPower > 0 ? unitPower : parsed.data.troops;
    const save = (await saves.findOne({ playerId: req.user!.id })) as any;
    const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
    const sourceTownIndex = towns.findIndex((town: any) =>
      town?.id === townIdForTerritory(from.id) ||
      Math.hypot((town?.x ?? 0) - from.x, (town?.y ?? 0) - from.y) < 96
    );
    const sourceTown = normalizeTownSnapshotForState(
      sourceTownIndex >= 0 ? towns[sourceTownIndex] : defaultTownSnapshotForTerritory(from, req.user!.id),
      req.user!.id,
      from,
    );
    if (
      sourceTown.infantryCount < infantry ||
      sourceTown.cavalryCount < cavalry ||
      sourceTown.artilleryCount < artillery
    ) {
      return res.status(409).json({
        error: "not_enough_troops",
        message: "Thành xuất phát không đủ quân để hành quân",
        town: sourceTown,
      });
    }
    sourceTown.infantryCount = Math.max(0, sourceTown.infantryCount - infantry);
    sourceTown.cavalryCount = Math.max(0, sourceTown.cavalryCount - cavalry);
    sourceTown.artilleryCount = Math.max(0, sourceTown.artilleryCount - artillery);
    sourceTown.troops = Math.max(0,
      sourceTown.infantryCount * gameSettings.infantryTroopsValue +
      sourceTown.cavalryCount * gameSettings.cavalryTroopsValue +
      sourceTown.artilleryCount * gameSettings.artilleryTroopsValue
    );
    if (sourceTownIndex >= 0) towns[sourceTownIndex] = sourceTown;
    else towns.push(sourceTown);
    const travel = calcTravelMetrics(from, to, {
      infantry,
      cavalry,
      artillery,
    }, gameSettings);
    const order = {
      _id: `march:${req.user!.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      ownerId: req.user!.id,
      fromTerritoryId: from.id,
      toTerritoryId: to.id,
      troops,
      infantry,
      cavalry,
      artillery,
      distanceKm: travel.distanceKm,
      travelSeconds: travel.travelSeconds,
      usesShip: travel.usesShip,
      battleSide: parsed.data.kind === "reinforce" ? parsed.data.battleSide || "defender" : undefined,
      kind: parsed.data.kind,
      startedAt: now,
      arrivesAt: new Date(now.getTime() + travel.travelSeconds * 1000),
    };
    await Promise.all([
      marchOrders.insertOne(order),
      saves.updateOne(
        { playerId: req.user!.id },
        {
          $set: { towns, updatedAt: now },
          $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id, resources: DEFAULT_PLAYER_RESOURCES },
        },
        { upsert: true },
      ),
    ]);
    // Do not acknowledge a march until the durable order is visible again.
    // This catches partial writes and prevents the client from showing a
    // locally-created march that cannot survive a reload.
    const persistedOrder = await marchOrders.findOne({ _id: order._id });
    if (!persistedOrder) {
      return res.status(503).json({
        error: "march_not_persisted",
        message: "Máy chủ chưa lưu được lệnh hành quân, vui lòng thử lại",
      });
    }
    await bumpWorldCacheVersion();
    const payload: CreateMarchResult = { 
      ok: true, 
      march: toPublicMarch(order),
      town: sourceTown,
      newbieShieldUntil: finalShieldUntil ? new Date(finalShieldUntil).toISOString() : null
    };
    publishRealtime({ type: "march_created", march: payload.march, sourceTown });
    await publishPlayerState(req.user!.id, "march_created", null, towns, payload.newbieShieldUntil);
    res.json(payload);
  });

  app.post("/api/game/recruit", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:recruit", 45, 60_000)) return;
    const parsed = RecruitTroopsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Loại binh sĩ hoặc số lượng không hợp lệ" });
    }

    const { unitType, count } = parsed.data;
    const now = new Date();

    const { players, saves, territoryClaims } = await collections();
    const gameConfig = await loadGameConfig();

    const territoryId =
      parsed.data.territoryId ??
      (parsed.data.townId !== undefined && parsed.data.townId >= 9000 ? parsed.data.townId - 9000 : undefined);
    const territory = territoryId !== undefined ? getStaticTerritory(territoryId) : undefined;
    if (!territory) {
      return res.status(400).json({ error: "bad_request", message: "Không xác định được lãnh thổ tuyển quân" });
    }
    const claim = await territoryClaims.findOne({ territoryId: territory.id });
    if (!claim || claim.playerId !== req.user!.id) {
      return res.status(403).json({ error: "not_owner", message: "Bạn không sở hữu thành/lãnh thổ này" });
    }

    // Collect current resources from DB
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const currentRes = resourceState.resources;

    // Calculate troop recruitment cost
    const unitCost = emptyResources();
    if (unitType === "infantry") {
      unitCost.gold = (gameConfig.infantryCostGold ?? 24) * count;
      unitCost.wood = (gameConfig.infantryCostWood ?? 12) * count;
      unitCost.food = (gameConfig.infantryCostFood ?? 10) * count;
    } else if (unitType === "cavalry") {
      unitCost.gold = (gameConfig.cavalryCostGold ?? 48) * count;
      unitCost.wood = (gameConfig.cavalryCostWood ?? 24) * count;
      unitCost.stone = (gameConfig.cavalryCostStone ?? 18) * count;
      unitCost.food = (gameConfig.cavalryCostFood ?? 20) * count;
      unitCost.iron = (gameConfig.cavalryCostIron ?? 10) * count;
    } else if (unitType === "artillery") {
      unitCost.gold = (gameConfig.artilleryCostGold ?? 72) * count;
      unitCost.stone = (gameConfig.artilleryCostStone ?? 36) * count;
      unitCost.iron = (gameConfig.artilleryCostIron ?? 24) * count;
      unitCost.sulfur = (gameConfig.artilleryCostSulfur ?? 12) * count;
    }

    // Check affordability
    if (!canAfford(currentRes, unitCost)) {
      return res.status(409).json({
        error: "not_enough_resources",
        message: `Không đủ tài nguyên mộ binh. Cần ${resourceCostMessage(unitCost)}`,
        cost: unitCost,
        resources: currentRes,
      });
    }

    const nextResources = subtractCost(currentRes, unitCost);

    const unitValue =
      unitType === "infantry" ? (gameConfig.infantryTroopsValue ?? 18) :
      unitType === "cavalry" ? (gameConfig.cavalryTroopsValue ?? 34) :
      (gameConfig.artilleryTroopsValue ?? 58);
    const troopsAdded = unitValue * count;

    const save = (await saves.findOne({ playerId: req.user!.id })) as any;
    const townId = townIdForTerritory(territory.id, parsed.data.townId);
    const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
    const townIndex = towns.findIndex((town: any) => town?.id === townId || Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) < 96);
    const rawTown = townIndex >= 0 ? { ...towns[townIndex] } : defaultTownSnapshotForTerritory(territory, req.user!.id, townId);
    const town = normalizeTownSnapshotForState({
      ...rawTown,
      id: townId,
      ownerId: req.user!.id,
      x: territory.x,
      y: territory.y,
    }, req.user!.id, territory);

    const specialResources = calcSpecialResources(territory);
    if (unitType === "cavalry" && !specialResources.includes("Bãi ngựa")) {
      return res.status(409).json({
        error: "missing_horse_pasture",
        message: "Thành này cần lãnh thổ có Bãi ngựa để mộ kị binh",
        town,
        resources: currentRes,
      });
    }
    if (
      unitType === "artillery" &&
      !specialResources.includes("Xưởng đúc pháo") &&
      Math.floor(Number(town.buildings.siegeWorkshop || 0)) <= 0
    ) {
      return res.status(409).json({
        error: "missing_siege_workshop",
        message: "Thành này cần Xưởng đúc pháo hoặc công trình xưởng pháo để mộ pháo binh",
        town,
        resources: currentRes,
      });
    }
    const populationNeeded = troopPopulationCost(unitValue) * count;
    if (town.population < populationNeeded) {
      return res.status(409).json({
        error: "not_enough_population",
        message: `Không đủ dân để mộ binh. Cần ${populationNeeded} dân khả dụng`,
        town,
        resources: currentRes,
      });
    }
    const maxDefendingTroops = maxDefendingTroopsForTown(town);
    if ((town.troops || 0) + troopsAdded > maxDefendingTroops) {
      return res.status(409).json({
        error: "town_troop_cap",
        message: `Thành đã gần đầy quân đồn trú (${town.troops || 0}/${maxDefendingTroops})`,
        town,
        resources: currentRes,
      });
    }
    if (unitType === "infantry") town.infantryCount += count;
    else if (unitType === "cavalry") town.cavalryCount += count;
    else town.artilleryCount += count;
    town.troops = Math.max(0, Math.floor(Number(town.troops ?? 0) || 0)) + troopsAdded;
    if (townIndex >= 0) towns[townIndex] = town;
    else towns.push(town);
    const ownedClaimsForTowns = await territoryClaims.find({ playerId: req.user!.id }).toArray();
    const ownedTerritoriesForTowns = ownedClaimsForTowns
      .map((ownedClaim) => {
        const ownedTerritory = getStaticTerritory(ownedClaim.territoryId);
        return ownedTerritory ? { ...ownedTerritory, ownerId: req.user!.id } : null;
      })
      .filter((ownedTerritory): ownedTerritory is NonNullable<ReturnType<typeof getStaticTerritory>> & { ownerId: string } => Boolean(ownedTerritory));
    const hydratedTowns = townSnapshotsForPlayer(towns, ownedTerritoriesForTowns, req.user!.id, nextResources);
    const hydratedTown = hydratedTowns.find((item: any) => item.id === townId) || town;

    await Promise.all([
      saves.updateOne(
        { playerId: req.user!.id },
        {
          $set: { resources: nextResources, towns, updatedAt: now },
          $setOnInsert: {
            _id: `save:${req.user!.id}`,
            playerId: req.user!.id,
            research: { sword: 0, stirrups: 0, cannon: 0, travel: 0 },
          },
        },
        { upsert: true },
      ),
      players.updateOne(
        { _id: req.user!.id },
        { $set: { resources: nextResources, lastResourceCollectedAt: now, lastSeenAt: now } },
      ),
    ]);

    await bumpWorldCacheVersion();
    await publishPlayerState(req.user!.id, "troops_recruited", nextResources, hydratedTowns);

    res.json({
      ok: true,
      townId,
      territoryId: territory.id,
      unitType,
      count,
      unitCountAdded: count,
      troopsAdded,
      town: hydratedTown,
      resources: nextResources,
      message: `Chiêu mộ thành công ${count} đợt binh sĩ (${unitType})`,
    });
  });

  app.post("/api/world/territories/:id/claim", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) {
      return res.status(400).json({ error: "bad_request", message: "ID lãnh thổ không hợp lệ" });
    }
    const staticTerritory = buildStaticTerritoryList().find((territory) => territory.id === id);
    if (!staticTerritory) {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    }
    const { players, territoryClaims, territoryClearings, alliances, saves } = await collections();
    const existing = await territoryClaims.findOne({ territoryId: id });
    if (existing && existing.playerId !== req.user!.id) {
      return res.status(409).json({ error: "territory_taken", message: "Lãnh thổ này đã có người chiếm" });
    }
    if (existing && existing.playerId === req.user!.id) {
      return res.status(409).json({ error: "already_owned", message: "Bạn đã sở hữu lãnh thổ này" });
    }
    const ownedCount = await territoryClaims.countDocuments({ playerId: req.user!.id });
    if (ownedCount > 0) {
      return res.status(410).json({
        error: "clearing_required",
        message: "Xây thành mới phải qua lệnh khai hoang và tốn tài nguyên",
        cost: territoryBuildCost(staticTerritory),
      });
    }
    const now = new Date();
    await territoryClaims.updateOne(
      { territoryId: id },
      { $setOnInsert: { _id: `territory:${id}`, territoryId: id, playerId: req.user!.id, claimedAt: now } },
      { upsert: true },
    );
    await territoryClearings.deleteMany({ territoryId: id });
    await players.updateOne({ _id: req.user!.id }, { $set: { onboardingState: "settled", lastSeenAt: now } });
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const saveDoc = (await saves.findOne({ playerId: req.user!.id })) as any;
    const towns = Array.isArray(saveDoc?.towns) ? removeTownForTerritory(saveDoc.towns, staticTerritory) : [];
    const town = normalizeTownSnapshotForState(defaultTownSnapshotForTerritory(staticTerritory, req.user!.id), req.user!.id, staticTerritory);
    towns.push(town);
    await saves.updateOne(
      { playerId: req.user!.id },
      {
        $set: { towns, updatedAt: now },
        $setOnInsert: { _id: `save:${req.user!.id}`, playerId: req.user!.id, resources: DEFAULT_PLAYER_RESOURCES },
      },
      { upsert: true },
    );
    const [player, alliance] = await Promise.all([
      players.findOne({ _id: req.user!.id }),
      alliances.findOne({ memberIds: req.user!.id }),
    ]);
    await bumpWorldCacheVersion();
    const payload: ClaimTerritoryResult = {
      ok: true,
      territory: { 
        ...staticTerritory, 
        ownerId: req.user!.id, 
        ownerName: player?.name ?? req.user!.id,
        ownerFlagColor: player?.flagColor,
        ownerEmblem: player?.emblem,
        ownerAllianceTag: alliance?.tag,
        ownerAllianceEmblem: alliance?.emblem,
      },
    };
    publishRealtime({ type: "territory_claimed", territory: payload.territory });
    await publishPlayerState(req.user!.id, "starter_territory_claimed", resourceState.resources, towns);
    res.json(payload);
  });

  app.post("/api/world/territories/:id/conquer", requireAuth, async (req, res) => {
    return res.status(410).json({
      error: "backend_battle_required",
      message: "Công thành phải đi qua lệnh hành quân và active battle trên server",
    });
  });

  app.get("/api/save/me", requireAuth, async (req, res) => {
    const { saves } = await collections();
    const save = await saves.findOne({ playerId: req.user!.id });
    res.json(save ?? null);
  });

  app.put("/api/save/me", requireAuth, async (req, res) => {
    return res.status(410).json({
      error: "server_authoritative_state",
      message: "Save client đã tắt. Tài nguyên, thành trì và quân đội phải cập nhật qua API gameplay trên server.",
    });
  });

  const ConfigSchema = z.object({
    maxBattleDuration: z.number().positive(),
    minBattleDuration: z.number().positive(),
    baseBattleSeconds: z.number().nonnegative(),
    battlePowerPerSecond: z.number().positive(),
    townBattleSeconds: z.number().nonnegative(),
    fortBattleSeconds: z.number().nonnegative(),
    infantryAttackPower: z.number().nonnegative(),
    infantryDefensePower: z.number().nonnegative(),
    cavalryAttackPower: z.number().nonnegative(),
    cavalryDefensePower: z.number().nonnegative(),
    artilleryAttackPower: z.number().nonnegative(),
    artilleryDefensePower: z.number().nonnegative(),
    townLevelDefense: z.number().nonnegative(),
    fortLevelDefense: z.number().nonnegative(),
    lootPercent: z.number().min(0).max(100),
    retreatPercent: z.number().min(0).max(100),
    infantryCostGold: z.number().nonnegative(),
    infantryCostWood: z.number().nonnegative(),
    infantryCostFood: z.number().nonnegative(),
    infantryTroopsValue: z.number().positive(),
    cavalryCostGold: z.number().nonnegative(),
    cavalryCostWood: z.number().nonnegative(),
    cavalryCostStone: z.number().nonnegative(),
    cavalryCostFood: z.number().nonnegative(),
    cavalryCostIron: z.number().nonnegative(),
    cavalryTroopsValue: z.number().positive(),
    artilleryCostGold: z.number().nonnegative(),
    artilleryCostStone: z.number().nonnegative(),
    artilleryCostIron: z.number().nonnegative(),
    artilleryCostSulfur: z.number().nonnegative(),
    artilleryTroopsValue: z.number().positive(),
    infantryPopulationCost: z.number().int().positive(),
    cavalryPopulationCost: z.number().int().positive(),
    artilleryPopulationCost: z.number().int().positive(),
    settlerSpeed: z.number().positive(),
    infantrySpeed: z.number().positive(),
    cavalrySpeed: z.number().positive(),
    artillerySpeed: z.number().positive(),
    shipSpeed: z.number().positive(),
    gameHourSeconds: z.number().positive(),
    shopResourcePackAmount: z.number().int().positive(),
    shopResourcePackPriceGems: z.number().int().positive(),
    shopSkinLongBaoThanhPrice: z.number().int().positive(),
    shopSkinHoaLongDienPrice: z.number().int().positive(),
    shopSkinPhongLongCacPrice: z.number().int().positive(),
  });

  app.get("/api/config", async (_req, res) => {
    try {
      res.json(await loadGameConfig());
    } catch {
      res.json(DEFAULT_CONFIG);
    }
  });

  app.post("/api/config", requireAuth, requireAdmin, async (req, res) => {
    const parsed = ConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Invalid config payload" });
    }
    const { configs } = await collections();
    const now = new Date();
    await configs.updateOne(
      { _id: "game_settings" },
      { $set: { ...parsed.data, updatedAt: now } },
      { upsert: true },
    );
    cachedGameConfig = normalizeGameConfig(parsed.data);
    cachedGameConfigExpiresAt = Date.now() + 5000;
    res.json({ ok: true, config: parsed.data });
  });

  // ─── ADMIN: Overview ──────────────────────────────────────────────────────
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

  // ─── ADMIN: Player List ───────────────────────────────────────────────────
  app.get("/api/admin/players", requireAuth, requireAdmin, async (_req, res) => {
    const { players } = await collections();
    const docs = await players.find({}, { sort: { createdAt: -1 }, limit: 500 }).toArray();
    const result: AdminPlayersResult = {
      players: docs.map((d) => ({
        id: d._id,
        name: d.name,
        role: d.role,
        flagColor: d.flagColor,
        emblem: d.emblem,
        starterLandId: d.starterLandId,
        createdAt: d.createdAt?.toISOString() ?? "",
        lastSeenAt: d.lastSeenAt?.toISOString() ?? "",
      })),
    };
    res.json(result);
  });

  // ─── ADMIN: View Player Save ──────────────────────────────────────────────
  app.get("/api/admin/players/:id/save", requireAuth, requireAdmin, async (req, res) => {
    const { saves } = await collections();
    const save = await saves.findOne({ playerId: req.params.id });
    res.json(save ?? null);
  });

  // ─── ADMIN: Reset Player Save ─────────────────────────────────────────────
  app.delete("/api/admin/players/:id/save", requireAuth, requireAdmin, async (req, res) => {
    const { saves, activeBattles } = await collections();
    await Promise.all([
      saves.deleteOne({ playerId: req.params.id }),
      activeBattles.deleteMany({ $or: [{ attackerId: req.params.id }, { defenderId: req.params.id }] }),
    ]);
    res.json({ ok: true, message: `Save của ${req.params.id} đã bị xóa.` });
  });

  // ─── ADMIN: Delete Player Account ────────────────────────────────────────
  app.delete("/api/admin/players/:id", requireAuth, requireAdmin, async (req, res) => {
    const { players, saves, activeBattles } = await collections();
    const pid = req.params.id;
    await Promise.all([
      players.deleteOne({ _id: pid }),
      saves.deleteOne({ playerId: pid }),
      activeBattles.deleteMany({ $or: [{ attackerId: pid }, { defenderId: pid }] }),
    ]);
    res.json({ ok: true, message: `Tài khoản ${pid} đã bị xóa.` });
  });

  // ─── ADMIN: Territory List ────────────────────────────────────────────────
  app.get("/api/admin/territories", requireAuth, requireAdmin, async (_req, res) => {
    const { territoryClaims } = await collections();
    const claims = await territoryClaims.find({}).toArray();
    const ownerByTerritory = new Map(claims.map((claim) => [claim.territoryId, claim.playerId]));
    const staticList = buildStaticTerritoryList();
    const territories: TerritoryInfo[] = staticList.map((t) => ({
      ...t,
      ownerId: ownerByTerritory.get(t.id) ?? null,
    }));
    const payload: AdminTerritoriesResult = { territories };
    res.json(payload);
  });

  // ─── ADMIN: Reset Territory ───────────────────────────────────────────────
  app.post("/api/admin/territories/:id/reset", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "bad_request", message: "ID không hợp lệ" });
    const { territoryClaims, territoryClearings, marchOrders, activeBattles } = await collections();
    await Promise.all([
      territoryClaims.deleteOne({ territoryId: id }),
      territoryClearings.deleteOne({ territoryId: id }),
      marchOrders.deleteMany({ $or: [{ fromTerritoryId: id }, { toTerritoryId: id }] }),
      activeBattles.deleteMany({ regionId: id }),
    ]);
    await bumpWorldCacheVersion();
    res.json({ ok: true, message: `Lãnh thổ ${id} đã reset về hoang dã.` });
  });

  // ─── ADMIN: Reset All Territory Runtime Data ─────────────────────────────
  app.post("/api/admin/territories/reset-all", requireAuth, requireAdmin, async (_req, res) => {
    const { players, saves, territoryClaims, territoryClearings, marchOrders, activeBattles, allianceAids } = await collections();
    await Promise.all([
      territoryClaims.deleteMany({}),
      territoryClearings.deleteMany({}),
      marchOrders.deleteMany({}),
      activeBattles.deleteMany({}),
      allianceAids.deleteMany({}),
      saves.deleteMany({}),
      players.updateMany({ role: "player" }, { $set: { onboardingState: "needs_claim" }, $unset: { starterLandId: "" } }),
    ]);
    await bumpWorldCacheVersion();
    res.json({ ok: true, message: "Đã reset sạch toàn bộ lãnh thổ: không chủ sở hữu, không xây thành, không hành quân, không thành trì lưu." });
  });

  // ─── ADMIN: Claim Territory for Player ───────────────────────────────────
  app.post("/api/admin/territories/:id/claim", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const playerId = z.string().min(1).safeParse(req.body?.playerId);
    if (isNaN(id) || !playerId.success) {
      return res.status(400).json({ error: "bad_request", message: "ID lãnh thổ hoặc playerId không hợp lệ" });
    }
    const { players, territoryClaims } = await collections();
    const player = await players.findOne({ _id: playerId.data });
    if (!player) return res.status(404).json({ error: "not_found", message: "Người chơi không tồn tại" });
    const staticTerritory = getStaticTerritory(id);
    if (!staticTerritory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const now = new Date();
    await territoryClaims.updateOne(
      { territoryId: id },
      {
        $setOnInsert: { _id: `territory:${id}` },
        $set: { territoryId: id, playerId: playerId.data, claimedAt: now },
      },
      { upsert: true }
    );
    await bumpWorldCacheVersion();
    res.json({ ok: true, message: `Lãnh thổ ${id} đã giao cho ${playerId.data}.` });
  });

  // Bot simulation is retired. The remaining world tick handles only real player actions.
  retireLegacyBots().catch(console.error);
  setInterval(async () => {
    try {
      const now = new Date();
      await processWorldTick(now);
    } catch (e) {
      console.error("Background tick error:", e);
    }
  }, 4000).unref();

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Express API Error:", err);
    res.status(500).json({
      error: "internal_server_error",
      message: err?.message || String(err) || "Lỗi máy chủ nội bộ",
      stack: err?.stack || null
    });
  });

  return app;
}
