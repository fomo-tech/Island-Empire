import cors from "cors";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { generateWorldTerritories } from "@island/shared";
import { collections } from "../db/collections.js";
import { config, isAllowedCorsOrigin } from "../config.js";
import { requireAdmin, requireAuth, signToken } from "../security/auth.js";
import {
  connectedPlayerIds,
  publishRealtime,
  realtimeStats,
} from "../realtime/socket.js";
import {
  bumpWorldCacheVersion,
  cacheGetJson,
  cacheSetJson,
  getWorldCacheVersion,
} from "../cache.js";
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
const LoginSchema = z
  .object({
    username: z.string().min(3).max(40),
    password: z.string().min(8).max(200),
  })
  .merge(AntiBotProofSchema);
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
  starterLandId: z
    .enum(["north-forest", "west-hills", "east-coast", "south-river"])
    .default("north-forest"),
});
const StartClearingSchema = z.object({
  territoryId: z.number().int().nonnegative(),
});
const ActiveMapSchema = z.object({
  activeMap: z.enum(["world", "conquest"]),
});
const CreateMarchSchema = z.object({
  requestId: z.string().trim().min(12).max(120).optional(),
  fromTerritoryId: z.number().int().nonnegative(),
  toTerritoryId: z.number().int().nonnegative(),
  troops: z.number().int().positive().max(MAX_MARCH_UNIT_COUNT),
  infantry: z.number().int().nonnegative().max(MAX_MARCH_UNIT_COUNT).default(0),
  cavalry: z.number().int().nonnegative().max(MAX_MARCH_UNIT_COUNT).default(0),
  artillery: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_MARCH_UNIT_COUNT)
    .default(0),
  battleSide: z.enum(["attacker", "defender"]).optional(),
  kind: z.enum(["attack", "reinforce", "move"]).default("attack"),
});
const MarchSourceOptionsSchema = z.object({
  toTerritoryId: z.number().int().nonnegative(),
  kind: z.enum(["attack", "reinforce", "move"]).default("attack"),
});
const RecruitTroopsSchema = z.object({
  territoryId: z.number().int().nonnegative().optional(),
  townId: z.number().int().nonnegative().optional(),
  unitType: z.enum(["infantry", "cavalry", "artillery"]),
  count: z.number().int().positive().max(MAX_RECRUIT_BATCH).default(1),
  requestId: z.string().trim().min(12).max(120).optional(),
});
const SendMailSchema = z
  .object({
    recipientId: z.string().trim().min(3).max(120),
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(2000),
    requestId: z.string().trim().min(12).max(120),
  })
  .strict();
const ShopPurchaseSchema = z
  .object({
    productId: z.string().trim().min(3).max(80),
    requestId: z.string().trim().min(12).max(120),
    equipTarget: z.enum(["capital", "military_district"]).optional(),
  })
  .strict();
const ShopEquipSchema = z
  .object({
    skinId: z.string().trim().min(3).max(80),
    target: z.enum(["capital", "military_district"]),
  })
  .strict();
const CreateAllianceSchema = z.object({
  name: z.string().trim().min(3).max(32),
  tag: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(/^[a-zA-Z0-9]+$/),
  emblem: z
    .enum(["shield", "star", "tower", "anchor", "flame"])
    .default("shield"),
});
const JoinAllianceSchema = z.object({
  allianceId: z.string().min(3).max(80),
});
const SendAllianceAidSchema = z.object({
  toPlayerId: z.string().min(3).max(120),
  resources: z
    .object({
      gold: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      wood: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      stone: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      food: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      iron: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      coal: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      sulfur: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
      gems: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_AID_RESOURCE_AMOUNT)
        .default(0),
    })
    .default({}),
  troops: z
    .number()
    .int()
    .nonnegative()
    .max(ALLIANCE_AID_MAX_TROOPS)
    .default(0),
});
const RESOURCE_KEYS = [
  "gold",
  "wood",
  "stone",
  "food",
  "iron",
  "coal",
  "sulfur",
  "gems",
];
const DEFAULT_PLAYER_RESOURCES = {
  gold: 1250,
  wood: 830,
  stone: 670,
  food: 920,
  iron: 260,
  coal: 120,
  sulfur: 80,
  gems: 420,
};
const BASE_RESOURCE_CAPACITY = {
  gold: 1800,
  wood: 2800,
  stone: 2400,
  food: 3200,
  iron: 1400,
  coal: 900,
  sulfur: 520,
  gems: 1000,
};
const TERRITORY_RESOURCE_CAPACITY = {
  gold: 900,
  wood: 1400,
  stone: 1200,
  food: 1600,
  iron: 700,
  coal: 500,
  sulfur: 300,
  gems: 250,
};
const MAX_OFFLINE_RESOURCE_SECONDS = 24 * 60 * 60;
const MIN_OFFLINE_REPORT_SECONDS = 60;
const actionBuckets = new Map();
const playerMutationLocks = new Map();
const recruitRequestResults = new Map();
async function acquirePlayerMutationLock(playerId) {
  const previous = playerMutationLocks.get(playerId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => current);
  playerMutationLocks.set(playerId, chain);
  await previous;
  return () => {
    release();
    if (playerMutationLocks.get(playerId) === chain)
      playerMutationLocks.delete(playerId);
  };
}
async function acquirePlayerMutationLocks(playerIds) {
  const releases = [];
  const uniqueIds = [...new Set(playerIds.filter((id) => Boolean(id)))].sort();
  for (const playerId of uniqueIds) {
    releases.push(await acquirePlayerMutationLock(playerId));
  }
  return () => {
    releases.reverse().forEach((release) => release());
  };
}
async function withPlayerMutationLock(playerId, run) {
  const release = await acquirePlayerMutationLock(playerId);
  try {
    return await run();
  } finally {
    release();
  }
}
function cachedRecruitResult(playerId, requestId) {
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
function rememberRecruitResult(playerId, requestId, result) {
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
function consumeActionLimit(playerId, action, limit, windowMs) {
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
function enforceActionLimit(req, res, action, limit, windowMs) {
  const playerId = req.user?.id || req.ip || "anonymous";
  const result = consumeActionLimit(playerId, action, limit, windowMs);
  if (result.ok) return true;
  res.setHeader("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
  res
    .status(429)
    .json({
      error: "rate_limited",
      message: "Bạn thao tác quá nhanh, vui lòng chờ một chút",
    });
  return false;
}
const usedAntiBotChallenges = new Map();
const ANTI_BOT_DIFFICULTY = 3;
const ANTI_BOT_TTL_MS = 2 * 60_000;
function antiBotIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}
function signAntiBotPayload(payload) {
  return createHmac("sha256", config.ANTI_BOT_SECRET)
    .update(payload)
    .digest("base64url");
}
function createAntiBotChallenge(req) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: randomBytes(18).toString("base64url"),
      ip: antiBotIp(req),
      expiresAt: Date.now() + ANTI_BOT_TTL_MS,
      difficulty: ANTI_BOT_DIFFICULTY,
    }),
  ).toString("base64url");
  return {
    token: `${payload}.${signAntiBotPayload(payload)}`,
    difficulty: ANTI_BOT_DIFFICULTY,
    expiresInSeconds: ANTI_BOT_TTL_MS / 1000,
  };
}
function verifyAntiBotProof(req, proof) {
  const [payload, signature, extra] = proof.challengeToken.split(".");
  if (!payload || !signature || extra) return false;
  const expected = signAntiBotPayload(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return false;
  let challenge;
  try {
    challenge = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (
    !challenge.nonce ||
    challenge.ip !== antiBotIp(req) ||
    !Number.isFinite(challenge.expiresAt) ||
    challenge.expiresAt <= Date.now()
  )
    return false;
  if (usedAntiBotChallenges.has(proof.challengeToken)) return false;
  const prefix = "0".repeat(
    Math.max(1, Math.min(6, Math.floor(challenge.difficulty || 0))),
  );
  const digest = createHash("sha256")
    .update(`${challenge.nonce}:${proof.proof}`)
    .digest("hex");
  if (!digest.startsWith(prefix)) return false;
  usedAntiBotChallenges.set(proof.challengeToken, challenge.expiresAt);
  if (usedAntiBotChallenges.size > 10_000) {
    const now = Date.now();
    usedAntiBotChallenges.forEach((expiresAt, token) => {
      if (expiresAt <= now) usedAntiBotChallenges.delete(token);
    });
  }
  return true;
}
function enforceAuthAttempt(req, res, action, identity) {
  const ipResult = consumeActionLimit(
    `auth-ip:${antiBotIp(req)}`,
    action,
    action === "guest" ? 3 : 6,
    60_000,
  );
  const normalizedIdentity = String(identity || "")
    .trim()
    .toLowerCase();
  const identityResult = normalizedIdentity
    ? consumeActionLimit(
        `auth-id:${normalizedIdentity}`,
        action,
        action === "register" ? 3 : 5,
        60_000,
      )
    : { ok: true, retryAfterMs: 0 };
  const blocked = !ipResult.ok
    ? ipResult
    : !identityResult.ok
      ? identityResult
      : null;
  if (!blocked) return true;
  res.setHeader("Retry-After", String(Math.ceil(blocked.retryAfterMs / 1000)));
  res
    .status(429)
    .json({
      error: "rate_limited",
      message: "Bạn thao tác quá nhanh, vui lòng chờ một chút",
    });
  return false;
}
function emptyResources() {
  return {
    gold: 0,
    wood: 0,
    stone: 0,
    food: 0,
    iron: 0,
    coal: 0,
    sulfur: 0,
    gems: 0,
  };
}
function normalizeResources(resources) {
  const bag = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    const value = resources?.[key];
    bag[key] = Number.isFinite(value)
      ? Math.max(0, Number(value))
      : DEFAULT_PLAYER_RESOURCES[key];
  });
  return bag;
}
function normalizeStoredResources(resources) {
  const bag = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    const value = resources?.[key];
    bag[key] = Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  });
  return bag;
}
function compactResourceDelta(resources) {
  const compact = {};
  RESOURCE_KEYS.forEach((key) => {
    const value = Math.floor(Number(resources[key] || 0));
    if (value > 0) compact[key] = value;
  });
  return compact;
}
function resourceCapacityForOwnedTerritories(ownedCount) {
  const cap = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    cap[key] =
      BASE_RESOURCE_CAPACITY[key] +
      Math.max(0, ownedCount) * TERRITORY_RESOURCE_CAPACITY[key];
  });
  return cap;
}
// Static biome name map
const BIOME_NAMES = {
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
const BIOME_BASE_YIELDS = {
  0: {
    gold: 0.003,
    wood: 0.01,
    stone: 0.006,
    food: 0.03,
    iron: 0.0015,
    coal: 0.0008,
    sulfur: 0.0004,
    gems: 0.0002,
  }, // Đồng bằng: lương nhiều, gỗ/đá ít
  1: {
    gold: 0.018,
    wood: 0.001,
    stone: 0.012,
    food: 0.003,
    iron: 0.003,
    coal: 0.001,
    sulfur: 0.001,
    gems: 0.004,
  }, // Sa mạc: vàng/đá quý, thiếu gỗ/lương
  2: {
    gold: 0.002,
    wood: 0.003,
    stone: 0.02,
    food: 0.003,
    iron: 0.016,
    coal: 0.008,
    sulfur: 0.001,
    gems: 0.002,
  }, // Núi tuyết: đá, sắt, than
  3: {
    gold: 0.004,
    wood: 0.001,
    stone: 0.018,
    food: 0.001,
    iron: 0.02,
    coal: 0.018,
    sulfur: 0.014,
    gems: 0.002,
  }, // Núi lửa: khoáng sản nặng
  4: {
    gold: 0.005,
    wood: 0.003,
    stone: 0.01,
    food: 0.003,
    iron: 0.005,
    coal: 0.001,
    sulfur: 0.002,
    gems: 0.014,
  }, // Mỏ ngọc: đá quý
  5: {
    gold: 0.01,
    wood: 0.008,
    stone: 0.004,
    food: 0.022,
    iron: 0.002,
    coal: 0.001,
    sulfur: 0.0005,
    gems: 0.002,
  }, // Vùng màu mỡ: lương + vàng
  6: {
    gold: 0.002,
    wood: 0.026,
    stone: 0.012,
    food: 0.01,
    iron: 0.004,
    coal: 0.003,
    sulfur: 0.0005,
    gems: 0.0005,
  }, // Rừng/vùng cao: gỗ nhiều, đá vừa
  7: {
    gold: 0.003,
    wood: 0.016,
    stone: 0.003,
    food: 0.018,
    iron: 0.002,
    coal: 0.006,
    sulfur: 0.004,
    gems: 0.001,
  }, // Đầm lầy: lương/gỗ, than/lưu huỳnh ít
};
// Biome clearing difficulty multipliers (applied on top of area-based time)
const BIOME_CLEAR_MULT = {
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
const BIOME_PRIMARY = {
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
function calcClearingSeconds(
  rx,
  ry,
  biome,
  settlerSpeed = 35,
  gameHourSeconds = 30,
) {
  const area = rx * ry;
  const baseTime = (area / 650) * 1.8;
  const speedScale = 35 / Math.max(1, settlerSpeed);
  const clockScale = Math.max(1, gameHourSeconds) / 30;
  const finalTime =
    baseTime * (BIOME_CLEAR_MULT[biome] ?? 1.0) * speedScale * clockScale;
  return Math.max(15, Math.min(600, Math.round(finalTime)));
}
/**
 * Calculate scaled yields.
 * areaFactor = (rx * ry) / 10000    → 1.0 at "standard" size 100×100
 *
 * Islet bonus: gems × 2.8, sulfur × 1.25, gold × 1.25 (rare island treasures)
 * Islet penalty: wood × 0.3, stone × 0.5, food × 0.45, iron × 0.55, coal × 0.35
 */
function calcYields(rx, ry, biome, isIslet) {
  const base = BIOME_BASE_YIELDS[biome] ?? BIOME_BASE_YIELDS[0];
  const areaFactor = (rx * ry) / 10000;
  let gold = base.gold * areaFactor;
  let wood = base.wood * areaFactor;
  let stone = base.stone * areaFactor;
  let food = base.food * areaFactor;
  let iron = base.iron * areaFactor;
  let coal = base.coal * areaFactor;
  let sulfur = base.sulfur * areaFactor;
  let gems = base.gems * areaFactor;
  if (isIslet) {
    gold *= 1.25;
    wood *= 0.3;
    stone *= 0.5;
    food *= 0.45;
    iron *= 0.55;
    coal *= 0.35;
    sulfur *= 1.25;
    gems *= 2.8;
  }
  const round3 = (n) => Math.round(n * 1000) / 1000;
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
function calcSpecialResources(t) {
  const specials = [];
  const area = t.rx * t.ry;
  // Horse Pasture ("Bãi ngựa") - abundant (~40% of territories)
  if (
    t.biome === 0 ||
    t.biome === 1 ||
    t.biome === 5 ||
    t.biome === 6 ||
    t.id % 3 !== 0
  ) {
    if (area >= 6500) specials.push("Bãi ngựa");
  }
  // Siege Workshop ("Xưởng đúc pháo") - abundant (~40% of territories)
  if (
    t.biome === 2 ||
    t.biome === 3 ||
    t.biome === 4 ||
    t.biome === 6 ||
    t.biome === 7 ||
    t.id % 2 === 1
  ) {
    specials.push("Xưởng đúc pháo");
  }
  // Natural Harbor ("Bến tàu tự nhiên") - chỉ xuất hiện ở vùng ven biển
  if (t.isIslet || t.coastal) {
    specials.push("Bến tàu tự nhiên");
  }
  if (
    (t.biome === 2 || t.biome === 3 || t.biome === 4 || t.biome === 6) &&
    t.id % 2 === 0
  )
    specials.push("Mỏ sắt");
  if (
    (t.biome === 1 || t.biome === 2 || t.biome === 3 || t.biome === 6) &&
    area >= 14000
  )
    specials.push("Mỏ đá");
  if ((t.biome === 1 || t.biome === 5 || t.biome === 3) && t.id % 3 === 1)
    specials.push("Mạch vàng");
  if ((t.biome === 1 || t.biome === 4 || t.isIslet) && t.id % 4 === 2)
    specials.push("Mỏ đá quý");
  if ((t.biome === 2 || t.biome === 3 || t.biome === 7) && t.id % 3 === 0)
    specials.push("Vỉa than");
  if (t.biome === 3 || (t.biome === 7 && t.id % 4 === 0))
    specials.push("Mỏ lưu huỳnh");
  return Array.from(new Set(specials));
}
function trainingSpecialtyForTerritory(territory: any, settlementKind?: any) {
  const specials = territory?.specialResources || [];
  if (specials.includes("Bãi ngựa")) return "cavalry";
  if (specials.includes("Xưởng đúc pháo") || specials.includes("Xưởng pháo"))
    return "artillery";
  if (settlementKind === "capital" || settlementKind === "sub_capital")
    return "infantry";
  return "infantry";
}
// Static territory geometry never changes during a process lifetime.
let staticTerritoryCache = null;
let staticTerritoryByIdCache = null;
// Static territory list matching the game engine
function buildStaticTerritoryList() {
  if (staticTerritoryCache) return staticTerritoryCache;
  const territories = [];
  const baseList = generateWorldTerritories();
  baseList.forEach((t) => {
    const yields = calcYields(t.rx, t.ry, t.biome, t.isIslet);
    const specialResources = calcSpecialResources(t);
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
      specialResources,
      trainingSpecialty: trainingSpecialtyForTerritory({ specialResources }),
      ...yields,
    });
  });
  staticTerritoryCache = territories;
  return staticTerritoryCache;
}
function getStaticTerritory(id) {
  if (!staticTerritoryByIdCache) {
    staticTerritoryByIdCache = new Map(
      buildStaticTerritoryList().map((territory: any) => [
        territory.id,
        territory,
      ]),
    );
  }
  return staticTerritoryByIdCache.get(id);
}
function territoryConnectionType(source, target) {
  const dx = Math.abs(source.x - target.x);
  const dy = Math.abs(source.y - target.y);
  // Mainland expansion is always one connected land tile at a time.
  const sumRx = (source.rx || 100) + (target.rx || 100);
  const sumRy = (source.ry || 100) + (target.ry || 100);
  const normDistSq = (dx / sumRx) ** 2 + (dy / sumRy) ** 2;
  if (!source.isIslet && !target.isIslet && normDistSq <= 0.85) return "land";
  const targetIsCoastal = Boolean(
    target.isIslet ||
    target.coastal ||
    target.specialResources?.includes("Bến tàu tự nhiên"),
  );
  // Islands and mainland harbors can establish a beachhead on any coastal territory.
  // This is a direct harbor-to-coast route; no radius scan is involved.
  const sourceHasHarbor = Boolean(
    source.isIslet || source.specialResources?.includes("Bến tàu tự nhiên"),
  );
  if (sourceHasHarbor && targetIsCoastal) return "sea";
  return null;
}
function nearestExpansionSource(claims, target) {
  return claims
    .map((claim) => {
      const territory = getStaticTerritory(claim.territoryId);
      if (!territory || !isClaimConnectedToCapital(claims, claim.territoryId))
        return null;
      const connectionType = territoryConnectionType(territory, target);
      if (!connectionType) return null;
      return {
        claim,
        territory,
        connectionType,
        distance: Math.hypot(territory.x - target.x, territory.y - target.y),
      };
    })
    .filter((candidate) => candidate !== null)
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        (a.claim.claimedAt?.getTime() || 0) -
          (b.claim.claimedAt?.getTime() || 0) ||
        a.territory.id - b.territory.id,
    )[0];
}
function isClaimConnectedToCapital(claims, territoryId) {
  const byId = new Map(
    claims.map((claim: any) => [claim.territoryId, claim]) as any,
  );
  const capitals = claims.filter(
    (claim) =>
      claim.settlementKind === "capital" ||
      claim.settlementKind === "sub_capital",
  );
  if (capitals.length === 0) {
    const oldest = [...(claims as any[])].sort(
      (a, b) => (a.claimedAt?.getTime() || 0) - (b.claimedAt?.getTime() || 0),
    )[0];
    if (oldest) capitals.push(oldest);
  }
  const capitalIds = new Set(capitals.map((c) => c.territoryId));
  if (capitalIds.size === 0 || !byId.has(territoryId)) return false;
  const visited = new Set();
  let current = byId.get(territoryId) as any;
  while (current && !visited.has((current as any).territoryId)) {
    if (capitalIds.has((current as any).territoryId)) return true;
    visited.add((current as any).territoryId);
    if ((current as any).parentTerritoryId === undefined) return false;
    current = byId.get(current.parentTerritoryId) as any;
  }
  return false;
}
/** Land chains collapse when cut; overseas chains remain owned but isolated until their sea route is restored. */
async function pruneDisconnectedClaims(playerId) {
  if (!playerId) return [];
  const { territoryClaims, territoryClearings, saves } = await collections();
  const claims = await territoryClaims.find({ playerId }).toArray();
  if (claims.length <= 1) return [];
  const capitals = claims.filter(
    (c) => c.settlementKind === "capital" || c.settlementKind === "sub_capital",
  );
  if (capitals.length === 0) {
    const oldest = [...(claims as any[])].sort(
      (a, b) => (a.claimedAt?.getTime() || 0) - (b.claimedAt?.getTime() || 0),
    )[0];
    if (oldest) capitals.push(oldest);
  }
  if (capitals.length === 0) return [];
  const connectedIds = new Set();
  const queue = (capitals as any[]).map((c) => c.territoryId);
  (capitals as any[]).forEach((c) => connectedIds.add(c.territoryId));
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = (claims as any[]).filter(
      (c) =>
        !connectedIds.has(c.territoryId) && c.parentTerritoryId === currentId,
    );
    for (const child of children) {
      connectedIds.add(child.territoryId);
      queue.push(child.territoryId);
    }
  }
  const disconnectedClaims = (claims as any[]).filter(
    (c) => !connectedIds.has(c.territoryId),
  );
  if (disconnectedClaims.length === 0) {
    await territoryClaims.updateMany(
      { playerId, isolated: true },
      { $set: { isolated: false } },
    );
    return [];
  }
  const byId = new Map(
    claims.map((claim: any) => [claim.territoryId, claim]) as any,
  );
  const hasSeaLineage = (claim: any) => {
    const visited = new Set();
    let current = claim;
    while (current && !visited.has((current as any).territoryId)) {
      if (current.connectionType === "sea") return true;
      visited.add((current as any).territoryId);
      current =
        current.parentTerritoryId === undefined
          ? undefined
          : byId.get(current.parentTerritoryId);
    }
    return false;
  };
  const isolatedClaims = disconnectedClaims.filter(hasSeaLineage) as any[];
  const destroyedClaims = disconnectedClaims.filter(
    (claim: any) => !hasSeaLineage(claim),
  ) as any[];
  const isolatedIds = isolatedClaims.map((claim) => claim.territoryId);
  const disconnectedIds = destroyedClaims.map((claim) => claim.territoryId);
  await Promise.all([
    isolatedIds.length > 0
      ? territoryClaims.updateMany(
          { playerId, territoryId: { $in: isolatedIds } },
          { $set: { isolated: true } },
        )
      : Promise.resolve(),
    territoryClaims.updateMany(
      { playerId, territoryId: { $in: [...connectedIds] as number[] } },
      { $set: { isolated: false } },
    ),
  ]);
  if (disconnectedIds.length === 0) {
    await bumpWorldCacheVersion();
    publishRealtime(
      { type: "world_state_hint", reason: "server_resync" },
      `player:${playerId}`,
    );
    await publishPlayerState(playerId, "overseas_route_isolated");
    return [];
  }
  await Promise.all([
    territoryClaims.deleteMany({
      playerId,
      territoryId: { $in: disconnectedIds },
    }),
    territoryClearings.deleteMany({
      playerId,
      territoryId: { $in: disconnectedIds },
    }),
  ]);
  const saveDoc = await saves.findOne({ playerId });
  if (saveDoc && Array.isArray(saveDoc.towns)) {
    const remainingTowns = saveDoc.towns.filter(
      (town) =>
        !disconnectedIds.includes(
          normalizeWorldTerritoryId(town.territoryId ?? town.id),
        ),
    );
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
function townIdForTerritory(territoryId: any, requestedTownId?: any) {
  return Number.isInteger(requestedTownId) && requestedTownId >= 0
    ? requestedTownId
    : 9000 + territoryId;
}
function territoryAreaFactorForTown(territory) {
  return Math.max(0.7, Math.min(2.4, (territory.rx * territory.ry) / 10000));
}
function territoryStartingPopulationForTown(territory, ownerCode = 1) {
  const biomePopMult =
    [1.25, 0.65, 0.55, 0.45, 0.8, 1.35, 0.95, 0.75][territory.biome ?? 0] || 1;
  const isletPenalty = territory.isIslet ? 0.55 : 1;
  const base = ownerCode === 1 ? 24 : 48;
  // Every new capital must be able to send the minimum ten settlers and still retain its garrison village.
  return Math.max(
    80,
    Math.round(
      base +
        territoryAreaFactorForTown(territory) *
          28 *
          biomePopMult *
          isletPenalty,
    ),
  );
}
function townStorageCapacityForTerritory(town, territory) {
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1),
  );
  const warehouse = Math.max(
    0,
    Math.floor(Number(town?.buildings?.warehouse || 0) || 0),
  );
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const areaFactor = territory ? territoryAreaFactorForTown(territory) : 1;
  const capacity = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    const base = TERRITORY_RESOURCE_CAPACITY[key];
    const warehouseBonus = base * warehouse * 0.55;
    const fortBonus =
      key === "food" || key === "iron" || key === "sulfur"
        ? base * fort * 0.1
        : 0;
    const levelBonus = base * Math.max(0, level - 1) * 0.12;
    capacity[key] = Math.max(
      1,
      Math.round((base + warehouseBonus + fortBonus + levelBonus) * areaFactor),
    );
  });
  return capacity;
}
function townPopulationCapacityForTerritory(town: any, territory?: any) {
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1),
  );
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const areaBonus = territory
    ? Math.round(territoryAreaFactorForTown(territory) * 18)
    : 18;
  return Math.max(80, 64 + level * 36 + fort * 24 + areaBonus);
}
function townPopulationGrowthPerSecond(town) {
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1),
  );
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  return (
    Math.round(
      (1 / 120 + Math.max(0, level - 1) * (1 / 160) + fort * (1 / 240)) *
        100000,
    ) / 100000
  );
}
function settleTownPopulation(town, now = new Date()) {
  const capacity = Math.max(
    1,
    Math.floor(
      Number(town?.populationCapacity) ||
        townPopulationCapacityForTerritory(town),
    ),
  );
  const current = Math.max(
    0,
    Math.min(capacity, Number(town?.population ?? 0) || 0),
  );
  const lastAt = town?.lastPopulationAt ? new Date(town.lastPopulationAt) : now;
  const elapsedSeconds = Number.isFinite(lastAt.getTime())
    ? Math.max(
        0,
        Math.min(
          MAX_OFFLINE_RESOURCE_SECONDS,
          Math.floor((now.getTime() - lastAt.getTime()) / 1000),
        ),
      )
    : 0;
  const rate = townPopulationGrowthPerSecond(town);
  return {
    population: Math.min(
      capacity,
      Math.floor((current + rate * elapsedSeconds) * 100) / 100,
    ),
    populationCapacity: capacity,
    populationPerSecond: rate,
    lastPopulationAt: now.toISOString(),
  };
}
function defaultTownSnapshotForTerritory(
  territory: any,
  playerId: any,
  townId?: any,
) {
  const population = territoryStartingPopulationForTown(territory, 1);
  const gameConfig = cachedGameConfig || DEFAULT_CONFIG;
  const troopCapacity = Math.max(
    1,
    Math.floor(population * gameConfig.strongholdTroopCapacityMultiplier),
  );
  const now = new Date();
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
    productionPerSecond: compactResourceDelta(
      productionForClaims([{ territoryId: territory.id }]),
    ),
    populationCapacity: townPopulationCapacityForTerritory(
      { level: 2 },
      territory,
    ),
    populationPerSecond: townPopulationGrowthPerSecond({ level: 2 }),
    lastPopulationAt: now.toISOString(),
    maxTroops: troopCapacity,
    troopCapacity,
    reservedTroops: 0,
    trainingSpecialty: trainingSpecialtyForTerritory(territory),
    nextTroopRecoveryAt: new Date(
      now.getTime() + gameConfig.troopRecoverySeconds * 1000,
    ).toISOString(),
    troopRecoverySeconds: gameConfig.troopRecoverySeconds,
    troopRecoveryBlockedReason: null,
  };
}
function normalizeTownSnapshotForState(
  town: any,
  playerId: any,
  territory?: any,
  now: any = new Date(),
) {
  const gameConfig = cachedGameConfig || DEFAULT_CONFIG;
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 2) || 2),
  );
  const startingPopulation = territory
    ? territoryStartingPopulationForTown(territory, 1)
    : 32;
  const storedPopulation =
    town?.population === undefined || town?.population === null
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
  const storageCapacity = townStorageCapacityForTerritory(
    normalized,
    territory,
  );
  const populationState = settleTownPopulation(
    {
      ...normalized,
      populationCapacity: townPopulationCapacityForTerritory(
        normalized,
        territory,
      ),
    },
    now,
  );
  const territoryProduction = territory
    ? productionForClaims([{ territoryId: territory.id }])
    : emptyResources();
  const kind = territory?.settlementKind ?? town?.kind ?? "military_district";
  const infantryCount = Math.max(
    0,
    Math.floor(Number(town?.infantryCount ?? town?.troops ?? 0) || 0),
  );
  const cavalryCount = Math.max(
    0,
    Math.floor(Number(town?.cavalryCount ?? 0) || 0),
  );
  const artilleryCount = Math.max(
    0,
    Math.floor(Number(town?.artilleryCount ?? 0) || 0),
  );
  const unitCount = infantryCount + cavalryCount + artilleryCount;
  const capacityMultiplier =
    kind === "capital" || kind === "sub_capital"
      ? gameConfig.capitalTroopCapacityMultiplier
      : gameConfig.strongholdTroopCapacityMultiplier;
  const troopCapacity = Math.max(
    1,
    Math.floor(populationState.population * capacityMultiplier),
  );
  const specialty = trainingSpecialtyForTerritory(territory, kind);
  const storedRecoveryAt = town?.nextTroopRecoveryAt
    ? new Date(town.nextTroopRecoveryAt)
    : null;
  const nextTroopRecoveryAt =
    storedRecoveryAt && Number.isFinite(storedRecoveryAt.getTime())
      ? storedRecoveryAt.toISOString()
      : new Date(
          now.getTime() + gameConfig.troopRecoverySeconds * 1000,
        ).toISOString();
  return {
    ...town,
    territoryId: territory?.id ?? town?.territoryId,
    kind,
    level,
    lvl: level,
    ownerId: town?.ownerId || playerId,
    ...populationState,
    troops: unitCount,
    infantryCount,
    cavalryCount,
    artilleryCount,
    buildings,
    storage: { ...(town?.storage || {}) },
    storageCapacity,
    productionPerSecond: territoryProduction,
    maxTroops: troopCapacity,
    troopCapacity,
    reservedTroops: Math.max(0, Math.floor(Number(town?.reservedTroops || 0))),
    trainingSpecialty: specialty,
    nextTroopRecoveryAt,
    troopRecoverySeconds: gameConfig.troopRecoverySeconds,
    troopRecoveryBlockedReason: town?.troopRecoveryBlockedReason ?? null,
    recoveryCost: troopRecoveryCost(specialty, gameConfig),
  };
}
function townSnapshotsForPlayer(
  saveTowns,
  territories,
  playerId,
  resources,
  now = new Date(),
) {
  const towns = Array.isArray(saveTowns)
    ? saveTowns.map((town) => {
        const territory = territories.find(
          (item) =>
            Math.hypot((town?.x ?? 0) - item.x, (town?.y ?? 0) - item.y) < 96,
        );
        return normalizeTownSnapshotForState(town, playerId, territory, now);
      })
    : [];
  territories
    .filter((territory) => territory.ownerId === playerId)
    .forEach((territory) => {
      const townId = townIdForTerritory(territory.id);
      const existingIndex = towns.findIndex(
        (town) =>
          town?.id === townId ||
          Math.hypot(
            (town?.x ?? 0) - territory.x,
            (town?.y ?? 0) - territory.y,
          ) < 96,
      );
      const baseTown =
        existingIndex >= 0
          ? towns[existingIndex]
          : defaultTownSnapshotForTerritory(territory, playerId, townId);
      const normalized = normalizeTownSnapshotForState(
        {
          ...baseTown,
          ownerId: playerId,
          x: territory.x,
          y: territory.y,
        },
        playerId,
        territory,
        now,
      );
      if (existingIndex >= 0) towns[existingIndex] = normalized;
      else towns.push(normalized);
    });
  if (resources && towns.length > 0) {
    towns.forEach((town) => {
      town.storage = emptyResources();
    });
    RESOURCE_KEYS.forEach((key) => {
      const resourceTotal = Math.max(0, Math.floor(resources[key] || 0));
      const totalCapacity = towns.reduce((sum, town) => {
        const capacities = normalizeResources(town.storageCapacity);
        return sum + Math.max(1, Math.floor(capacities[key] || 1));
      }, 0);
      let assigned = 0;
      towns.forEach((town, townIndex) => {
        const capacities = normalizeResources(town.storageCapacity);
        const townCapacity = Math.max(1, Math.floor(capacities[key] || 1));
        const share =
          townIndex === towns.length - 1
            ? Math.max(0, Math.min(townCapacity, resourceTotal - assigned))
            : Math.min(
                townCapacity,
                Math.floor(
                  (resourceTotal * townCapacity) / Math.max(1, totalCapacity),
                ),
              );
        town.storage[key] = share;
        assigned += share;
      });
    });
  }
  return towns;
}
function applyTownMarchReservations(towns, marches) {
  const reservedByTerritory = new Map();
  marches.forEach((march) => {
    const territoryId = normalizeWorldTerritoryId(march?.fromTerritoryId);
    const units = Math.max(
      0,
      Math.floor(Number(march?.infantry || 0)) +
        Math.floor(Number(march?.cavalry || 0)) +
        Math.floor(Number(march?.artillery || 0)),
    );
    reservedByTerritory.set(
      territoryId,
      (reservedByTerritory.get(territoryId) || 0) + units,
    );
  });
  towns.forEach((town) => {
    const territoryId = Number(
      town?.territoryId ?? normalizeWorldTerritoryId(town?.id),
    );
    town.reservedTroops = reservedByTerritory.get(territoryId) || 0;
    town.troopCapacity = Math.max(
      1,
      Math.floor(Number(town?.troopCapacity ?? town?.maxTroops) || 1),
    );
    town.maxTroops = town.troopCapacity;
  });
  return towns;
}
function toPublicClearing(clearing) {
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
    arrivesAt: clearing.arrivesAt
      ? clearing.arrivesAt.toISOString()
      : clearing.startedAt.toISOString(),
    completesAt: clearing.completesAt.toISOString(),
  };
}
function normalizeWorldTerritoryId(value) {
  const id = Number(value);
  if (!Number.isInteger(id)) return id;
  return id >= 9000 ? id - 9000 : id;
}
function toPublicMarch(order) {
  const startedAtDate =
    order.startedAt instanceof Date
      ? order.startedAt
      : new Date(order.startedAt);
  const arrivesAtDate =
    order.arrivesAt instanceof Date
      ? order.arrivesAt
      : new Date(order.arrivesAt);
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
    travelSeconds:
      order.travelSeconds ??
      Math.max(
        1,
        Math.round((arrivesAtDate.getTime() - startedAtDate.getTime()) / 1000),
      ),
    usesShip: order.usesShip ?? false,
    battleSide: order.battleSide,
    kind: order.kind ?? "attack",
    startedAt: startedAtDate.toISOString(),
    arrivesAt: arrivesAtDate.toISOString(),
  };
}
function advanceBattleHealth(battle, now = new Date()) {
  const startedAt =
    battle.startedAt instanceof Date
      ? battle.startedAt
      : new Date(battle.startedAt);
  const updatedAt =
    battle.hpUpdatedAt instanceof Date
      ? battle.hpUpdatedAt
      : battle.hpUpdatedAt
        ? new Date(battle.hpUpdatedAt)
        : startedAt;
  const durationSeconds = Math.max(1, Number(battle.durationSeconds) || 1);
  const elapsedSeconds = clampNumber(
    (now.getTime() - updatedAt.getTime()) / 1000,
    0,
    durationSeconds,
  );
  const attackerMaxHp = Math.max(
    1,
    Number(battle.attackerMaxHp ?? battle.attackerPower) || 1,
  );
  const defenderMaxHp = Math.max(
    1,
    Number(battle.defenderMaxHp ?? battle.defenderPower) || 1,
  );
  const attackerLeads =
    Number(battle.attackerPower || 0) > Number(battle.defenderPower || 0);
  const attackerFloor = attackerLeads
    ? Math.max(1, Math.round(attackerMaxHp * 0.45))
    : 0;
  const defenderFloor = attackerLeads
    ? 0
    : Math.max(1, Math.round(defenderMaxHp * 0.45));
  const attackerDamagePerSecond =
    (attackerMaxHp - attackerFloor) / durationSeconds;
  const defenderDamagePerSecond =
    (defenderMaxHp - defenderFloor) / durationSeconds;
  const attackerCurrentHp = Math.max(
    attackerFloor,
    Math.min(
      attackerMaxHp,
      Math.round(
        Number(battle.attackerCurrentHp ?? attackerMaxHp) -
          attackerDamagePerSecond * elapsedSeconds,
      ),
    ),
  );
  const defenderCurrentHp = Math.max(
    defenderFloor,
    Math.min(
      defenderMaxHp,
      Math.round(
        Number(battle.defenderCurrentHp ?? defenderMaxHp) -
          defenderDamagePerSecond * elapsedSeconds,
      ),
    ),
  );
  return {
    attackerMaxHp,
    attackerCurrentHp,
    defenderMaxHp,
    defenderCurrentHp,
    hpUpdatedAt: now,
    battleVersion: Math.max(1, Math.floor(Number(battle.battleVersion || 1))),
  };
}
function toPublicBattle(battle) {
  const startedAtDate =
    battle.startedAt instanceof Date
      ? battle.startedAt
      : new Date(battle.startedAt);
  const resolvesAtDate =
    battle.resolvesAt instanceof Date
      ? battle.resolvesAt
      : new Date(battle.resolvesAt);
  const health = advanceBattleHealth(
    battle,
    battle.hpUpdatedAt instanceof Date
      ? battle.hpUpdatedAt
      : new Date(battle.hpUpdatedAt || Date.now()),
  );
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
    usesShip: Boolean(battle.usesShip),
    startedAt: startedAtDate.toISOString(),
    resolvesAt: resolvesAtDate.toISOString(),
    durationSeconds: battle.durationSeconds,
    attackerMaxHp: health.attackerMaxHp,
    attackerCurrentHp: health.attackerCurrentHp,
    defenderMaxHp: health.defenderMaxHp,
    defenderCurrentHp: health.defenderCurrentHp,
    hpUpdatedAt: health.hpUpdatedAt.toISOString(),
    battleVersion: health.battleVersion,
  };
}
function nationRankForPower(power) {
  if (power > 100_000) return "Đại Hoàng Đế";
  if (power > 50_000) return "Đế Vương";
  if (power > 20_000) return "Công Tước";
  if (power > 5_000) return "Bá Tước";
  return "Lãnh Chúa";
}
async function buildNationStatusSnapshot(
  playerId: any,
  resources: any,
  resourceCapacity: any,
  productionPerSecond: any,
  towns: any,
  context: any = {},
  now: any = new Date(),
) {
  const {
    players,
    territoryClaims,
    marchOrders,
    territoryClearings,
    activeBattles,
  } = await collections();
  const [player, claims, marches, clearings, battles] = await Promise.all([
    context.player !== undefined
      ? context.player
      : players.findOne({ _id: playerId }),
    context.claims !== undefined
      ? context.claims
      : territoryClaims.find({ playerId }).toArray(),
    context.marches !== undefined
      ? context.marches
      : marchOrders.find({ ownerId: playerId }).toArray(),
    context.clearings !== undefined
      ? context.clearings
      : territoryClearings.find({ playerId }).toArray(),
    context.battles !== undefined
      ? context.battles
      : activeBattles
          .find({ $or: [{ attackerId: playerId }, { defenderId: playerId }] })
          .toArray(),
  ]);
  const normalizedResources = normalizeResources(resources);
  const normalizedCapacity = normalizeResources(resourceCapacity);
  const normalizedProduction = normalizeResources(productionPerSecond);
  const gameConfig = await loadGameConfig();
  const outboundTroops = marches.reduce(
    (sum, march) => sum + Math.max(0, Number(march?.troops) || 0),
    0,
  );
  const garrisonTroops = towns.reduce(
    (sum, town) => sum + Math.max(0, Number(town?.troops) || 0),
    0,
  );
  const ownedTroops = garrisonTroops + outboundTroops;
  const defendedTerritoryIds = new Set(
    battles
      .filter((battle) => battle?.defenderId === playerId)
      .map((battle) => Number(battle?.regionId))
      .filter(Number.isFinite),
  );
  const unitPower = (unit: any, fallback = 0) => {
    const infantry = Math.max(0, Number(unit?.infantry ?? unit?.infantryCount) || 0);
    const cavalry = Math.max(0, Number(unit?.cavalry ?? unit?.cavalryCount) || 0);
    const artillery = Math.max(0, Number(unit?.artillery ?? unit?.artilleryCount) || 0);
    if (infantry + cavalry + artillery <= 0) return Math.max(0, Number(fallback) || 0);
    return (
      infantry * gameConfig.infantryTroopsValue +
      cavalry * gameConfig.cavalryTroopsValue +
      artillery * gameConfig.artilleryTroopsValue
    );
  };
  const military = Math.round(
    towns.reduce((sum, town) => {
      const territoryId = Number(town?.territoryId ?? town?.regionId ?? town?.id);
      return defendedTerritoryIds.has(territoryId)
        ? sum
        : sum + unitPower(town, town?.troops);
    }, 0) +
      marches.reduce((sum, march) => sum + unitPower(march, march?.troops), 0) +
      battles.reduce((sum, battle) => {
        if (battle?.attackerId === playerId) {
          return sum + unitPower({
            infantry: battle.attackerInfantry,
            cavalry: battle.attackerCavalry,
            artillery: battle.attackerArtillery,
          }, battle.attackerPower);
        }
        if (battle?.defenderId === playerId) {
          return sum + unitPower({
            infantry: battle.defenderInfantry,
            cavalry: battle.defenderCavalry,
            artillery: battle.defenderArtillery,
          }, battle.defenderPower);
        }
        return sum;
      }, 0),
  );
  let territoryPower = 0;
  let settlements = 0;
  let buildings = 0;
  const townByTerritoryId = new Map(
    towns.map((town) => [Number(town?.territoryId ?? town?.regionId ?? town?.id), town]),
  );
  claims.forEach((claim) => {
    const territoryId = Number(claim?.territoryId);
    const territory = getStaticTerritory(territoryId);
    const specials = territory?.specialResources || [];
    territoryPower += claim?.isolated
      ? gameConfig.powerIsolatedTerritory
      : gameConfig.powerConnectedTerritory;
    if (specials.includes("Bến tàu tự nhiên"))
      territoryPower += gameConfig.powerNaturalHarborBonus;
    if (specials.includes("Bãi ngựa") || specials.includes("Xưởng đúc pháo"))
      territoryPower += gameConfig.powerMilitaryResourceBonus;
    const town = townByTerritoryId.get(territoryId) as any;
    if (!town) return;
    const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl) || 1));
    const kind = town?.kind ?? claim?.settlementKind;
    if (kind === "capital" || kind === "sub_capital") {
      settlements += gameConfig.powerCapitalBase + level * gameConfig.powerCapitalLevel;
    } else {
      settlements += gameConfig.powerMilitaryDistrictBase + level * gameConfig.powerMilitaryDistrictLevel;
    }
    const townBuildings = town?.buildings || {};
    buildings += Math.max(0, Number(townBuildings.fort) || 0) * gameConfig.powerFortLevel;
    buildings += Math.max(0, Number(townBuildings.barracks) || 0) * gameConfig.powerBarracksLevel;
    buildings += Math.max(0, Number(townBuildings.siegeWorkshop) || 0) * gameConfig.powerSiegeWorkshopLevel;
    buildings += Math.max(0, Number(townBuildings.warehouse) || 0) * gameConfig.powerWarehouseLevel;
    buildings += ["lumberCamp", "quarry", "goldMine", "gemCutter"].reduce(
      (sum, key) => sum + Math.max(0, Number(townBuildings[key]) || 0),
      0,
    ) * gameConfig.powerResourceBuildingLevel;
  });
  const strategicPowerBreakdown = {
    military,
    territory: Math.round(territoryPower),
    settlements: Math.round(settlements),
    buildings: Math.round(buildings),
    total: Math.round(military + territoryPower + settlements + buildings),
  };
  const strategicPower = strategicPowerBreakdown.total;
  const previousPower = player?.strategicPowerSnapshot;
  const powerChanged = !previousPower ||
    ["military", "territory", "settlements", "buildings", "total"].some(
      (key) => Number(previousPower?.[key]) !== Number(strategicPowerBreakdown[key]),
    );
  const powerVersion = powerChanged
    ? Math.max(0, Number(previousPower?.version) || 0) + 1
    : Math.max(1, Number(previousPower?.version) || 1);
  const powerUpdatedAt = powerChanged ? now : (previousPower?.updatedAt || now);
  const vipLevel = Math.max(0, Math.floor(Number(player?.vipLevel) || 0));
  const vipPoints = Math.max(0, Math.floor(Number(player?.vipPoints) || 0));
  if (powerChanged || player?.vipLevel === undefined || player?.vipPoints === undefined) {
    await players.updateOne(
      { _id: playerId },
      { $set: {
        vipLevel,
        vipPoints,
        strategicPowerSnapshot: {
          ...strategicPowerBreakdown,
          version: powerVersion,
          updatedAt: powerUpdatedAt,
        },
      } },
    );
  }
  const attackedTerritoryIds = new Set(
    battles
      .filter((battle) => battle?.defenderId === playerId)
      .map((battle) => Number(battle?.regionId ?? battle?.territoryId))
      .filter(Number.isFinite),
  );
  const buildingTerritoryIds = new Set(
    clearings
      .map((clearing) => Number(clearing?.territoryId))
      .filter(Number.isFinite),
  );
  const claimByTerritoryId = new Map(
    claims.map((claim) => [Number(claim?.territoryId), claim]),
  );
  const townStatuses = towns
    .map((town, index) => {
      const territoryId = Number(
        town?.territoryId ?? town?.regionId ?? town?.id,
      );
      const claim = claimByTerritoryId.get(territoryId) as any;
      const kind =
        town?.kind ??
        claim?.settlementKind ??
        (index === 0 ? "capital" : "military_district");
      const storage = normalizeResources(town?.storage || {});
      const townCapacity =
        typeof town?.storageCapacity === "number"
          ? RESOURCE_KEYS.reduce(
              (bag, key) => ({
                ...bag,
                [key]: Number(town.storageCapacity) || 0,
              }),
              emptyResources(),
            )
          : normalizeResources(town?.storageCapacity || {});
      const storageUsed = RESOURCE_KEYS.reduce(
        (sum, key) => sum + storage[key],
        0,
      );
      const storageCapacity = RESOURCE_KEYS.reduce(
        (sum, key) => sum + townCapacity[key],
        0,
      );
      const population = Math.max(0, Math.floor(Number(town?.population) || 0));
      const populationCapacity = Math.max(
        population,
        Math.floor(Number(town?.populationCapacity) || population),
      );
      const status = attackedTerritoryIds.has(territoryId)
        ? "under_attack"
        : buildingTerritoryIds.has(territoryId)
          ? "building"
          : "normal";
      return {
        townId: Number(town?.id),
        territoryId,
        kind,
        level: Math.max(1, Math.floor(Number(town?.level ?? town?.lvl) || 1)),
        x: Number(town?.x) || 0,
        y: Number(town?.y) || 0,
        troops: Math.max(0, Math.floor(Number(town?.troops) || 0)),
        maxTroops: Math.max(
          0,
          Math.floor(Number(town?.maxTroops) || populationCapacity * 10),
        ),
        population,
        populationCapacity,
        storageUsed: Math.floor(storageUsed),
        storageCapacity: Math.floor(storageCapacity),
        storageUsagePercent:
          storageCapacity > 0
            ? Math.min(100, Math.round((storageUsed / storageCapacity) * 100))
            : 0,
        status,
      };
    })
    .sort((a, b) => {
      const statusWeight = { under_attack: 0, building: 1, normal: 2 };
      const kindWeight = { capital: 0, sub_capital: 1, military_district: 2 };
      return (
        statusWeight[a.status] - statusWeight[b.status] ||
        kindWeight[a.kind] - kindWeight[b.kind] ||
        a.townId - b.townId
      );
    });
  const population = townStatuses.reduce(
    (sum, town) => sum + town.population,
    0,
  );
  const populationCapacity = townStatuses.reduce(
    (sum, town) => sum + town.populationCapacity,
    0,
  );
  const underAttackCount = townStatuses.filter(
    (town) => town.status === "under_attack",
  ).length;
  const storageNearFullCount = townStatuses.filter(
    (town) => town.storageUsagePercent >= 90,
  ).length;
  const populationNearFullCount = townStatuses.filter(
    (town) =>
      town.populationCapacity > 0 &&
      town.population / town.populationCapacity >= 0.95,
  ).length;
  const alerts = [];
  if (underAttackCount > 0)
    alerts.push({
      code: "under_attack",
      count: underAttackCount,
      severity: "danger",
    });
  if (clearings.length > 0)
    alerts.push({
      code: "building",
      count: clearings.length,
      severity: "info",
    });
  if (storageNearFullCount > 0)
    alerts.push({
      code: "storage_near_full",
      count: storageNearFullCount,
      severity: "warning",
    });
  if (populationNearFullCount > 0)
    alerts.push({
      code: "population_near_full",
      count: populationNearFullCount,
      severity: "warning",
    });
  const status =
    underAttackCount > 0
      ? "under_attack"
      : marches.length > 0
        ? "marching"
        : clearings.length > 0
          ? "building"
          : "peace";
  return {
    playerId,
    playerName: String(player?.name || player?.username || playerId),
    rank: nationRankForPower(strategicPower) as any,
    status: status as any,
    ownedTerritories: claims.length,
    totalTerritories: buildStaticTerritoryList().length,
    townCount: townStatuses.length,
    ownedTroops,
    outboundTroops,
    ownMarches: marches.length,
    ownClearings: clearings.length,
    activeBattles: battles.length,
    strategicPower,
    strategicPowerBreakdown,
    powerVersion,
    powerUpdatedAt: new Date(powerUpdatedAt).toISOString(),
    vipLevel,
    vipPoints,
    population,
    populationCapacity,
    resources: normalizedResources,
    resourceCapacity: normalizedCapacity,
    productionPerSecond: normalizedProduction,
    towns: townStatuses,
    alerts,
    serverTime: now.toISOString(),
  };
}
async function publishPlayerState(
  playerId: any,
  reason: any,
  resources?: any,
  towns?: any,
  newbieShieldUntil?: any,
  context: any = {},
) {
  const { territoryClaims, saves } = await collections();
  const claims =
    context.claims ?? (await territoryClaims.find({ playerId }).toArray());
  const savedState =
    !resources || !Array.isArray(towns)
      ? await saves.findOne({ playerId })
      : null;
  const effectiveResources = normalizeResources(
    resources || savedState?.resources || {},
  );
  const effectiveTowns = Array.isArray(towns)
    ? towns
    : Array.isArray(savedState?.towns)
      ? savedState.towns
      : [];
  const resourceCapacity = resourceCapacityForOwnedTerritories(claims.length);
  const productionPerSecond = productionForClaims(claims);
  const nationStatus = await buildNationStatusSnapshot(
    playerId,
    effectiveResources,
    resourceCapacity,
    productionPerSecond,
    effectiveTowns,
    { ...context, claims },
  );
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const { marchOrders, activeBattles } = await collections();
  const [armyMarchDocs, armyBattleDocs] = await Promise.all([
    context.marches !== undefined
      ? context.marches
      : marchOrders.find({ ownerId: playerId }).toArray(),
    context.battles !== undefined
      ? context.battles
      : activeBattles
          .find({ $or: [{ attackerId: playerId }, { defenderId: playerId }] })
          .toArray(),
  ]);
  const armyState = buildArmyState(
    playerId,
    {
      playerId,
      territories: [],
      clearings: [],
      marches: armyMarchDocs.map(toPublicMarch),
      battles: armyBattleDocs.map(toPublicBattle),
      towns: effectiveTowns,
      resources: effectiveResources,
      resourceCapacity,
      productionPerSecond,
      offlineGain: emptyResources(),
      offlineSeconds: 0,
      serverTime: now,
      resourceUpdatedAt: now,
    },
    nowDate.getTime(),
  );
  publishRealtime(
    {
      type: "player_state_updated",
      playerId,
      resources: resources ? normalizeResources(resources) : undefined,
      resourceCapacity: resources ? resourceCapacity : undefined,
      productionPerSecond: resources ? productionPerSecond : undefined,
      resourceUpdatedAt: resources ? now : undefined,
      serverTime: now,
      towns: Array.isArray(towns) ? towns : undefined,
      nationStatus,
      newbieShieldUntil: newbieShieldUntil
        ? new Date(newbieShieldUntil).toISOString()
        : null,
      reason,
    },
    `player:${playerId}`,
  );
  publishRealtime(
    {
      type: "nation_state_updated",
      state: nationStatus,
      version: nowDate.getTime(),
      serverTime: now,
    },
    `player:${playerId}`,
  );
  publishRealtime(
    {
      type: "army_state_updated",
      state: armyState,
      version: nowDate.getTime(),
      serverTime: now,
    },
    `player:${playerId}`,
  );
}
function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function battleAttackPower(units, gameConfig) {
  return Math.max(
    0,
    Math.floor(Number(units.infantry || 0)) * gameConfig.infantryAttackPower +
      Math.floor(Number(units.cavalry || 0)) * gameConfig.cavalryAttackPower +
      Math.floor(Number(units.artillery || 0)) *
        gameConfig.artilleryAttackPower,
  );
}
function battleDefensePower(units, town, gameConfig) {
  const unitPower =
    Math.floor(Number(units.infantry || 0)) * gameConfig.infantryDefensePower +
    Math.floor(Number(units.cavalry || 0)) * gameConfig.cavalryDefensePower +
    Math.floor(Number(units.artillery || 0)) * gameConfig.artilleryDefensePower;
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1),
  );
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  return Math.max(
    0,
    unitPower +
      level * gameConfig.townLevelDefense +
      fort * gameConfig.fortLevelDefense,
  );
}
function battleDurationSeconds(attackerPower, defenderPower, town, gameConfig) {
  const level = Math.max(
    1,
    Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1),
  );
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const seconds =
    gameConfig.baseBattleSeconds +
    (attackerPower + defenderPower) /
      Math.max(1, gameConfig.battlePowerPerSecond) +
    level * gameConfig.townBattleSeconds +
    fort * gameConfig.fortBattleSeconds;
  return Math.round(
    clampNumber(
      seconds,
      gameConfig.minBattleDuration,
      gameConfig.maxBattleDuration,
    ),
  );
}
function inferInfantryFromTroops(troops, gameConfig) {
  return Math.max(
    0,
    Math.ceil(
      Math.max(0, troops) / Math.max(1, gameConfig.infantryTroopsValue),
    ),
  );
}
function findTownForTerritory(towns, territory) {
  const townId = townIdForTerritory(territory.id);
  return towns.find(
    (town) =>
      town?.id === townId ||
      Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) <
        96,
  );
}
function removeTownForTerritory(towns, territory) {
  const townId = townIdForTerritory(territory.id);
  return towns.filter(
    (town) =>
      town?.id !== townId &&
      Math.hypot((town?.x ?? 0) - territory.x, (town?.y ?? 0) - territory.y) >=
        96,
  );
}
async function buildWorldTerritoriesPayload() {
  const { players, territoryClaims, alliances } = await collections();
  const claims = await territoryClaims.find({}).toArray();
  const claimByTerritory = new Map(
    claims.map((claim) => [claim.territoryId, claim]),
  );
  const claimsByPlayer = new Map();
  claims.forEach((c) => {
    if (!claimsByPlayer.has(c.playerId)) claimsByPlayer.set(c.playerId, []);
    claimsByPlayer.get(c.playerId).push(c);
  });
  const capitalTerritoryByOwner = new Map();
  const subCapitalTerritoryByOwner = new Map();
  claimsByPlayer.forEach((playerClaims, playerId) => {
    playerClaims.sort((a, b) => a.claimedAt.getTime() - b.claimedAt.getTime());
    const explicitCapital = playerClaims.find(
      (c) => c.settlementKind === "capital",
    );
    const capitalId = explicitCapital
      ? explicitCapital.territoryId
      : playerClaims[0]?.territoryId;
    if (capitalId !== undefined)
      capitalTerritoryByOwner.set(playerId, capitalId);
    const explicitSubCapital = playerClaims.find(
      (c) => c.settlementKind === "sub_capital",
    );
    const subCapitalId = explicitSubCapital
      ? explicitSubCapital.territoryId
      : playerClaims.length >= 20
        ? playerClaims[19]?.territoryId
        : undefined;
    if (subCapitalId !== undefined)
      subCapitalTerritoryByOwner.set(playerId, subCapitalId);
  });
  const ownerIds = [...new Set(claims.map((claim) => claim.playerId))];
  const [ownerDocs, allianceDocs] = await Promise.all([
    ownerIds.length > 0
      ? players.find({ _id: { $in: ownerIds } }).toArray()
      : [],
    ownerIds.length > 0
      ? alliances.find({ memberIds: { $in: ownerIds } }).toArray()
      : [],
  ]);
  const nameByOwner = new Map(
    ownerDocs.map((player: any) => [player._id, player.name]) as any,
  );
  const flagColorByOwner = new Map(
    ownerDocs.map((player: any) => [player._id, player.flagColor]) as any,
  );
  const emblemByOwner = new Map(
    ownerDocs.map((player: any) => [player._id, player.emblem]) as any,
  );
  const capitalSkinByOwner = new Map(
    ownerDocs.map((player: any) => [
      player._id,
      player.shopInventory?.equippedCapitalSkin,
    ]) as any,
  );
  const districtSkinByOwner = new Map(
    ownerDocs.map((player: any) => [
      player._id,
      player.shopInventory?.equippedDistrictSkin,
    ]) as any,
  );
  const allianceByOwner = new Map();
  allianceDocs.forEach((alliance) => {
    alliance.memberIds.forEach((memberId) => {
      allianceByOwner.set(memberId, {
        tag: alliance.tag,
        emblem: alliance.emblem || "shield",
      });
    });
  });
  const territories = buildStaticTerritoryList().map((territory) => {
    const claim = claimByTerritory.get(territory.id);
    const ownerId = claim?.playerId ?? null;
    let computedKind = undefined;
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
      ownerName: ownerId ? (nameByOwner.get(ownerId) ?? ownerId) : null,
      ownerFlagColor: ownerId
        ? (flagColorByOwner.get(ownerId) ?? "#2f70d7")
        : undefined,
      ownerEmblem: ownerId
        ? (emblemByOwner.get(ownerId) ?? "shield")
        : undefined,
      ownerAllianceTag: ownerId ? allianceByOwner.get(ownerId)?.tag : undefined,
      ownerAllianceEmblem: ownerId
        ? allianceByOwner.get(ownerId)?.emblem
        : undefined,
      settlementKind: computedKind,
      trainingSpecialty: trainingSpecialtyForTerritory(territory, computedKind),
      parentTerritoryId: claim?.parentTerritoryId,
      connectionType: claim?.connectionType,
      isolated: claim?.isolated || false,
      equippedCapitalSkin: ownerId
        ? (capitalSkinByOwner.get(ownerId) ?? null)
        : null,
      equippedDistrictSkin: ownerId
        ? (districtSkinByOwner.get(ownerId) ?? null)
        : null,
    };
  });
  return { territories };
}
function productionForClaims(claims: any) {
  const production = emptyResources();
  const staticById = new Map(
    buildStaticTerritoryList().map((territory: any) => [
      territory.id,
      territory,
    ]),
  );
  claims.forEach((claim: any) => {
    const territory = staticById.get(claim.territoryId) as any;
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
function territoryBuildCost(territory) {
  const areaFactor = Math.max(0.85, (territory.rx * territory.ry) / 10000);
  return compactResourceDelta({
    gold: Math.round(
      180 +
        areaFactor * 32 +
        territory.yieldGold * 92 +
        territory.yieldGems * 70,
    ),
    wood: Math.round(130 + areaFactor * 28 + territory.yieldWood * 66),
    stone: Math.round(
      125 +
        areaFactor * 34 +
        territory.yieldStone * 76 +
        territory.yieldIron * 28,
    ),
    food: Math.round(80 + areaFactor * 18 + territory.yieldFood * 42),
    iron: Math.round(
      20 + territory.yieldIron * 95 + territory.yieldSulfur * 30,
    ),
    gems: Math.round(Math.max(0, territory.yieldGems - 0.28) * 22),
  });
}
function clearingBuildCostForRefund(clearing, territory, ownedCount) {
  if (clearing.buildCost) return clearing.buildCost;
  if (clearing.isStarterClaim || ownedCount === 0) return emptyResources();
  return territoryBuildCost(territory);
}
function canAfford(resources, cost) {
  return RESOURCE_KEYS.every(
    (key) => Math.floor(resources[key] || 0) >= Math.floor(cost[key] || 0),
  );
}
function troopRecoveryCost(unitType, gameConfig) {
  if (unitType === "cavalry") {
    return compactResourceDelta({
      gold: gameConfig.cavalryCostGold,
      wood: gameConfig.cavalryCostWood,
      stone: gameConfig.cavalryCostStone,
      food: gameConfig.cavalryCostFood,
      iron: gameConfig.cavalryCostIron,
    });
  }
  if (unitType === "artillery") {
    return compactResourceDelta({
      gold: gameConfig.artilleryCostGold,
      stone: gameConfig.artilleryCostStone,
      iron: gameConfig.artilleryCostIron,
      coal: gameConfig.artilleryCostCoal,
      sulfur: gameConfig.artilleryCostSulfur,
    });
  }
  return compactResourceDelta({
    gold: gameConfig.infantryCostGold,
    wood: gameConfig.infantryCostWood,
    food: gameConfig.infantryCostFood,
  });
}
function subtractCost(resources, cost) {
  const next = normalizeResources(resources);
  RESOURCE_KEYS.forEach((key) => {
    next[key] = Math.max(0, Math.floor(next[key] - Math.floor(cost[key] || 0)));
  });
  return next;
}
function troopPopulationCost(troopValue) {
  return Math.max(1, Math.ceil((troopValue || 0) / 5));
}
function maxDefendingTroopsForTown(town) {
  return Math.max(
    1,
    Math.floor(
      Number(town?.troopCapacity ?? town?.maxTroops) ||
        Number(town?.population || 0) ||
        1,
    ),
  );
}
function resourceCostMessage(cost) {
  const labels = {
    gold: "vàng",
    wood: "gỗ",
    stone: "đá",
    food: "lương",
    iron: "sắt",
    coal: "than",
    sulfur: "lưu huỳnh",
    gems: "kim cương",
  };
  return RESOURCE_KEYS.filter((key) => Math.floor(cost[key] || 0) > 0)
    .map((key) => `${Math.floor(cost[key] || 0)} ${labels[key]}`)
    .join(", ");
}
async function collectPlayerResources(playerId, now = new Date()) {
  const { players, territoryClaims, playerMails } = await collections();
  const [player, ownedClaims] = await Promise.all([
    players.findOne({ _id: playerId }),
    territoryClaims.find({ playerId }).toArray(),
  ]);
  const current = normalizeResources(player?.resources);
  const capacity = resourceCapacityForOwnedTerritories(ownedClaims.length);
  const productionPerSecond = productionForClaims(ownedClaims);
  const lastCollectedAt =
    player?.lastResourceCollectedAt ?? player?.createdAt ?? now;
  const elapsedSeconds = Math.max(
    0,
    Math.min(
      MAX_OFFLINE_RESOURCE_SECONDS,
      Math.floor((now.getTime() - lastCollectedAt.getTime()) / 1000),
    ),
  );
  const gained = emptyResources();
  const next = emptyResources();
  RESOURCE_KEYS.forEach((key) => {
    gained[key] = Math.max(
      0,
      Math.round(productionPerSecond[key] * elapsedSeconds),
    );
    next[key] =
      current[key] >= capacity[key]
        ? Math.floor(current[key])
        : Math.min(capacity[key], Math.floor(current[key] + gained[key]));
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
  const gainedEntries = RESOURCE_KEYS.filter((key) => gained[key] > 0).map(
    (key) => {
      const labels = {
        gold: "Vàng",
        wood: "Gỗ",
        stone: "Đá",
        food: "Lúa",
        iron: "Sắt",
        coal: "Than",
        sulfur: "Lưu huỳnh",
        gems: "Đá quý",
      };
      return `${labels[key]} +${Math.floor(gained[key]).toLocaleString("vi-VN")}`;
    },
  );
  if (
    elapsedSeconds >= MIN_OFFLINE_REPORT_SECONDS &&
    gainedEntries.length > 0
  ) {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const requestId = `offline-income:${playerId}:${lastCollectedAt.getTime()}`;
    const mailDoc = {
      _id: `mail:${requestId}`,
      senderId: "system",
      senderName: "Triều đình",
      recipientId: playerId,
      recipientName: player?.name || playerId,
      title: "Báo cáo tài nguyên offline",
      body: `${gainedEntries.join(", ")} trong ${minutes} phút offline. Tài nguyên đã được cộng theo sức chứa kho.`,
      requestId,
      sentAt: now,
      readAt: null,
    };
    const inserted = await playerMails.updateOne(
      { _id: mailDoc._id },
      { $setOnInsert: mailDoc },
      { upsert: true },
    );
    if (inserted.upsertedCount > 0) {
      const unreadCount = await playerMails.countDocuments({
        recipientId: playerId,
        readAt: null,
      });
      const version = now.getTime();
      publishRealtime(
        {
          type: "mail_received",
          mail: toPublicMail(mailDoc),
          unreadCount,
          version,
          serverTime: now.toISOString(),
        },
        `player:${playerId}`,
      );
    }
  }
  const shieldDate =
    player?.newbieShieldUntil ?? new Date(now.getTime() + 24 * 3600 * 1000);
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
async function buildGameStatePayload(playerId) {
  const releasePlayerLock = await acquirePlayerMutationLock(playerId);
  try {
    const { territoryClearings, marchOrders, activeBattles, players, saves } =
      await collections();
    const [world, clearings, marches, battles] = await Promise.all([
      cachedWorldTerritoriesPayload(),
      territoryClearings.find({}).toArray(),
      marchOrders.find({}).toArray(),
      activeBattles.find({}).toArray(),
    ]);
    const resourceState = await collectPlayerResources(playerId);
    const [player, save] = await Promise.all([
      players.findOne({ _id: playerId }),
      saves.findOne({ playerId }),
    ]);
    const towns = applyTownMarchReservations(
      townSnapshotsForPlayer(
        save?.towns,
        (world as any).territories,
        playerId,
        resourceState.resources,
      ),
      marches.filter((march) => march.ownerId === playerId),
    );
    const ownedClaims = (world as any).territories
      .filter((territory: any) => territory.ownerId === playerId)
      .map((territory) => ({
        territoryId: territory.id,
        settlementKind: territory.settlementKind,
      }));
    const playerMarches = marches.filter((march) => march.ownerId === playerId);
    const playerClearings = clearings.filter(
      (clearing) => clearing.playerId === playerId,
    );
    const playerBattles = battles.filter(
      (battle) =>
        battle.attackerId === playerId || battle.defenderId === playerId,
    );
    const nationStatus = await buildNationStatusSnapshot(
      playerId,
      resourceState.resources,
      resourceState.resourceCapacity,
      resourceState.productionPerSecond,
      towns,
      {
        player,
        claims: ownedClaims,
        marches: playerMarches,
        clearings: playerClearings,
        battles: playerBattles,
      },
    );
    if (towns.length > 0) {
      await saves.updateOne(
        { playerId },
        {
          $set: {
            towns,
            resources: resourceState.resources,
            updatedAt: new Date(),
          },
          $setOnInsert: { _id: `save:${playerId}`, playerId },
        },
        { upsert: true },
      );
    }
    return {
      playerId,
      activeMap: player?.activeMap === "conquest" ? "conquest" : "world",
      territories: (world as any).territories,
      clearings: clearings.map(toPublicClearing),
      marches: marches.map(toPublicMarch),
      battles: battles.map(toPublicBattle),
      towns,
      ...resourceState,
      nationStatus,
      playerProfile: player
        ? {
            flagColor: player.flagColor ?? "#2f70d7",
            emblem: player.emblem ?? "shield",
          }
        : null,
    };
  } finally {
    releasePlayerLock();
  }
}
const MAP_UNITS_TO_KM = 0.18;
const DEFAULT_MARCH_CONFIG = {
  infantrySpeed: 45,
  cavalrySpeed: 75,
  artillerySpeed: 30,
  shipSpeed: 25,
  gameHourSeconds: 30,
};
const DEFAULT_CONFIG = {
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
  artilleryCostCoal: 35,
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
  troopRecoveryEnabled: true,
  troopRecoverySeconds: 600,
  troopRecoveryOfflineLimit: 24,
  capitalTroopCapacityMultiplier: 2,
  strongholdTroopCapacityMultiplier: 1,
  seaInvasionMaxDistanceKm: 1200,
  battleStateBroadcastSeconds: 2,
  shopResourcePackAmount: 50000,
  shopResourcePackPriceGems: 100,
  shopSkinLongBaoThanhPrice: 1500,
  shopSkinHoaLongDienPrice: 2000,
  shopSkinPhongLongCacPrice: 1800,
  powerConnectedTerritory: 100,
  powerIsolatedTerritory: 25,
  powerNaturalHarborBonus: 30,
  powerMilitaryResourceBonus: 20,
  powerCapitalBase: 1000,
  powerMilitaryDistrictBase: 250,
  powerCapitalLevel: 200,
  powerMilitaryDistrictLevel: 80,
  powerFortLevel: 100,
  powerBarracksLevel: 60,
  powerSiegeWorkshopLevel: 80,
  powerWarehouseLevel: 30,
  powerResourceBuildingLevel: 20,
};
let cachedGameConfig = null;
let cachedGameConfigExpiresAt = 0;
function normalizeGameConfig(doc) {
  return { ...DEFAULT_CONFIG, ...(doc || {}) };
}
async function loadGameConfig() {
  const now = Date.now();
  if (cachedGameConfig && now < cachedGameConfigExpiresAt)
    return cachedGameConfig;
  const { configs } = await collections();
  const doc = await configs.findOne({ _id: "game_settings" });
  cachedGameConfig = normalizeGameConfig(doc || null);
  cachedGameConfigExpiresAt = now + 5000;
  return cachedGameConfig;
}
const NEWBIE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày tính bằng ms
const NEWBIE_WELCOME_SKIN_ID = "skin_long_bao_thanh"; // skin tặng cho tân thủ
const NEWBIE_RESOURCE_PRICE_GEMS = 1; // giá tân thủ tuần đầu

function isNewbieWeek(player: { createdAt?: Date | null }): boolean {
  if (!player?.createdAt) return false;
  return Date.now() - new Date(player.createdAt).getTime() < NEWBIE_WEEK_MS;
}

function shopCatalog(gameConfig, player?: { createdAt?: Date | null }) {
  const testPrice =
    config.SHOP_TEST_MODE && config.NODE_ENV !== "production" ? 1 : null;
  const packAmount = Math.max(
    100,
    Math.min(1500, Math.floor(gameConfig.shopResourcePackAmount || 500)),
  );
  const newbieWeek = player ? isNewbieWeek(player) : false;
  const newbiePriceExpiresAt = newbieWeek && player?.createdAt
    ? new Date(new Date(player.createdAt).getTime() + NEWBIE_WEEK_MS).toISOString()
    : undefined;

  return [
    {
      id: "pack_basic_all",
      type: "resource_pack",
      name: "Rương Quân Nhu Khởi Đầu",
      description: "Bổ sung đồng đều lương thực và vật liệu vào kho quốc gia.",
      priceGems: newbieWeek
        ? NEWBIE_RESOURCE_PRICE_GEMS
        : testPrice ?? gameConfig.shopResourcePackPriceGems,
      testPrice: testPrice !== null,
      resources: {
        food: packAmount,
        wood: packAmount,
        stone: packAmount,
        iron: packAmount,
        gold: Math.floor(packAmount * 0.8),
      },
      ...(newbieWeek && { isNewbiePrice: true, newbiePriceExpiresAt }),
    },
    {
      id: "pack_royal_all",
      type: "resource_pack",
      name: "Rương Quân Nhu Hoàng Gia",
      description: "Kho quân nhu lớn dành cho chiến dịch dài ngày.",
      priceGems: newbieWeek
        ? NEWBIE_RESOURCE_PRICE_GEMS
        : testPrice ?? Math.floor(gameConfig.shopResourcePackPriceGems * 2.5),
      testPrice: testPrice !== null,
      resources: {
        food: packAmount * 2,
        wood: packAmount * 2,
        stone: packAmount * 2,
        iron: packAmount * 2,
        gold: Math.floor(packAmount * 1.6),
      },
      ...(newbieWeek && { isNewbiePrice: true, newbiePriceExpiresAt }),
    },
    {
      id: "skin_long_bao_thanh",
      type: "skin",
      name: "Long Bảo Thành",
      description: "Ngoại trang Hoàng Thành rồng vàng.",
      priceGems: testPrice ?? gameConfig.shopSkinLongBaoThanhPrice,
      testPrice: testPrice !== null,
      skinId: "skin_long_bao_thanh",
      skinTarget: "capital",
    },
    {
      id: "skin_hoa_long_dien",
      type: "skin",
      name: "Hỏa Long Điện",
      description: "Ngoại trang Hoàng Thành dung nham.",
      priceGems: testPrice ?? gameConfig.shopSkinHoaLongDienPrice,
      testPrice: testPrice !== null,
      skinId: "skin_hoa_long_dien",
      skinTarget: "capital",
    },
    {
      id: "skin_phong_long_cac",
      type: "skin",
      name: "Phong Long Các",
      description: "Ngoại trang Hoàng Thành phong lôi.",
      priceGems: testPrice ?? gameConfig.shopSkinPhongLongCacPrice,
      testPrice: testPrice !== null,
      skinId: "skin_phong_long_cac",
      skinTarget: "capital",
    },
  ];
}
function normalizeShopInventory(value, player?: { newbieSkinExpiresAt?: Date | null }) {
  return {
    ownedSkins: [
      ...new Set(
        Array.isArray(value?.ownedSkins)
          ? value.ownedSkins.filter(Boolean)
          : [],
      ),
    ],
    equippedCapitalSkin: value?.equippedCapitalSkin || null,
    equippedDistrictSkin: value?.equippedDistrictSkin || null,
    version: Math.max(0, Math.floor(Number(value?.version) || 0)),
    newbieSkinExpiresAt: player?.newbieSkinExpiresAt
      ? new Date(player.newbieSkinExpiresAt).toISOString()
      : null,
  };
}
function toPublicMail(mail) {
  return {
    id: String(mail._id || mail.id),
    senderId: mail.senderId,
    senderName: mail.senderName || mail.senderId,
    recipientId: mail.recipientId,
    recipientName: mail.recipientName || mail.recipientId,
    title: mail.title,
    body: mail.body,
    sentAt: new Date(mail.sentAt).toISOString(),
    readAt: mail.readAt ? new Date(mail.readAt).toISOString() : null,
  };
}
function toPublicReport(report, playerId) {
  return {
    id: String(report._id || report.id),
    regionId: report.regionId,
    territoryName: report.territoryName,
    attackerId: report.attackerId,
    attackerName: report.attackerName,
    defenderId: report.defenderId,
    defenderName: report.defenderName,
    winnerId: report.winnerId,
    isAttackerWin: Boolean(report.isAttackerWin),
    attacker: report.attacker,
    defender: report.defender,
    lootedResources: report.lootedResources || {},
    createdAt: new Date(report.createdAt).toISOString(),
    read: Array.isArray(report.readBy) && report.readBy.includes(playerId),
  };
}
function buildArmyState(playerId, gameState, version = Date.now()) {
  const towns = (gameState.towns || []).map((town, index) => ({
    townId: town.id,
    territoryId: Number(town.territoryId ?? town.id),
    kind: town.kind || (index === 0 ? "capital" : "military_district"),
    level: town.level,
    x: Number(town.x) || 0,
    y: Number(town.y) || 0,
    troops: Math.max(0, Math.floor(Number(town.troops) || 0)),
    infantry: Math.max(0, Math.floor(Number(town.infantryCount) || 0)),
    cavalry: Math.max(0, Math.floor(Number(town.cavalryCount) || 0)),
    artillery: Math.max(0, Math.floor(Number(town.artilleryCount) || 0)),
    maxTroops: Math.max(0, Math.floor(Number(town.maxTroops) || 0)),
  }));
  const marches = gameState.marches.filter(
    (march) => march.ownerId === playerId,
  );
  const battles = (gameState.battles || []).filter(
    (battle) =>
      battle.attackerId === playerId || battle.defenderId === playerId,
  );
  const garrisonTroops = towns.reduce((sum, town) => sum + town.troops, 0);
  const outboundTroops = marches.reduce(
    (sum, march) => sum + Math.max(0, march.troops || 0),
    0,
  );
  const infantry =
    towns.reduce((sum, town) => sum + town.infantry, 0) +
    marches.reduce((sum, march) => sum + Math.max(0, march.infantry || 0), 0);
  const cavalry =
    towns.reduce((sum, town) => sum + town.cavalry, 0) +
    marches.reduce((sum, march) => sum + Math.max(0, march.cavalry || 0), 0);
  const artillery =
    towns.reduce((sum, town) => sum + town.artillery, 0) +
    marches.reduce((sum, march) => sum + Math.max(0, march.artillery || 0), 0);
  return {
    playerId,
    garrisonTroops,
    outboundTroops,
    totalTroops: garrisonTroops + outboundTroops,
    infantry,
    cavalry,
    artillery,
    marches,
    battles,
    towns,
    version,
    serverTime: new Date(version).toISOString(),
  };
}
async function processArrivedMarches(now = new Date()) {
  const {
    players,
    territoryClaims,
    territoryClearings,
    marchOrders,
    activeBattles,
    saves,
    alliances,
  } = await collections();
  const gameConfig = await loadGameConfig();
  const arrived = await marchOrders
    .find({ arrivesAt: { $lte: now } })
    .sort({ arrivesAt: 1 })
    .limit(WORLD_TICK_BATCH_SIZE)
    .toArray();
  for (const march of arrived) {
    const territory = getStaticTerritory(march.toTerritoryId);
    if (!territory) {
      await marchOrders.deleteOne({ _id: march._id });
      continue;
    }
    const targetClaim = await territoryClaims.findOne({
      territoryId: territory.id,
    });
    // Case A: Unclaimed wild land -> Instantly capture on march arrival
    if (!targetClaim || !targetClaim.playerId) {
      if (march.kind === "attack") {
        const attackerPlayer = await players.findOne({ _id: march.ownerId });
        const attackerSave = await saves.findOne({ playerId: march.ownerId });
        const attackerTowns = Array.isArray(attackerSave?.towns)
          ? removeTownForTerritory(attackerSave.towns, territory)
          : [];
        const newTown = normalizeTownSnapshotForState(
          {
            ...defaultTownSnapshotForTerritory(territory, march.ownerId),
            ownerId: march.ownerId,
            infantryCount: march.infantry || 50,
            cavalryCount: march.cavalry || 10,
            artilleryCount: march.artillery || 5,
            troops: march.troops || 65,
          },
          march.ownerId,
          territory,
        );
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
                connectionType: march.usesShip
                  ? "sea"
                  : territoryConnectionType(
                      getStaticTerritory(march.fromTerritoryId),
                      territory,
                    ) || "land",
                isolated: false,
              },
              $setOnInsert: {
                _id: `territory:${territory.id}`,
                territoryId: territory.id,
              },
            },
            { upsert: true },
          ),
          saves.updateOne(
            { playerId: march.ownerId },
            {
              $set: { towns: attackerTowns, updatedAt: now },
              $setOnInsert: {
                _id: `save:${march.ownerId}`,
                playerId: march.ownerId,
                resources: DEFAULT_PLAYER_RESOURCES,
              },
            },
            { upsert: true },
          ),
          marchOrders.deleteOne({ _id: march._id }),
        ]);
        const publicTerritory = {
          ...territory,
          ownerId: march.ownerId,
          ownerName: attackerPlayer?.name || "Bạn",
          ownerFlagColor: attackerPlayer?.flagColor || "#2f70d7",
          ownerEmblem: attackerPlayer?.emblem || "shield",
          settlementKind: "military",
          equippedCapitalSkin:
            attackerPlayer?.shopInventory?.equippedCapitalSkin ?? null,
          equippedDistrictSkin:
            attackerPlayer?.shopInventory?.equippedDistrictSkin ?? null,
        };
        publishRealtime({
          type: "territory_claimed",
          territory: publicTerritory,
        });
        publishRealtime({
          type: "march_removed",
          marchId: march._id,
          territoryId: territory.id,
          reason: "territory_claimed",
        });
        await publishPlayerState(
          march.ownerId,
          "march_claimed_territory",
          attackerPlayer?.resources,
          attackerTowns,
        );
        continue;
      } else {
        await marchOrders.deleteOne({ _id: march._id });
        publishRealtime({
          type: "march_removed",
          marchId: march._id,
          territoryId: territory.id,
          reason: "arrived_home",
        });
        continue;
      }
    }
    // Case B: Own town -> Arrived safely
    if (targetClaim.playerId === march.ownerId) {
      const ownerSave = await saves.findOne({ playerId: march.ownerId });
      const ownerTowns = Array.isArray(ownerSave?.towns)
        ? [...ownerSave.towns]
        : [];
      const targetTownIndex = ownerTowns.findIndex(
        (town) =>
          town?.id === townIdForTerritory(territory.id) ||
          Math.hypot(
            (town?.x ?? 0) - territory.x,
            (town?.y ?? 0) - territory.y,
          ) < 96,
      );
      const targetTown = normalizeTownSnapshotForState(
        targetTownIndex >= 0
          ? ownerTowns[targetTownIndex]
          : defaultTownSnapshotForTerritory(territory, march.ownerId),
        march.ownerId,
        territory,
      );
      targetTown.infantryCount += Math.max(
        0,
        Math.floor(Number(march.infantry || 0) || 0),
      );
      targetTown.cavalryCount += Math.max(
        0,
        Math.floor(Number(march.cavalry || 0) || 0),
      );
      targetTown.artilleryCount += Math.max(
        0,
        Math.floor(Number(march.artillery || 0) || 0),
      );
      targetTown.troops =
        targetTown.infantryCount +
        targetTown.cavalryCount +
        targetTown.artilleryCount;
      if (targetTownIndex >= 0) ownerTowns[targetTownIndex] = targetTown;
      else ownerTowns.push(targetTown);
      await Promise.all([
        marchOrders.deleteOne({ _id: march._id }),
        saves.updateOne(
          { playerId: march.ownerId },
          { $set: { towns: ownerTowns, updatedAt: now } },
        ),
      ]);
      publishRealtime({
        type: "march_removed",
        marchId: march._id,
        territoryId: territory.id,
        reason: "arrived_home",
      });
      await publishPlayerState(
        march.ownerId,
        "march_arrived_home",
        undefined,
        ownerTowns,
      );
      continue;
    }
    const existingBattle = await activeBattles.findOne({
      regionId: territory.id,
    });
    if (existingBattle) {
      const isAttackerSide =
        march.ownerId === existingBattle.attackerId || march.kind === "attack";
      const marchInfantry = Math.max(
        0,
        Math.floor(Number(march.infantry || 0) || 0),
      );
      const marchCavalry = Math.max(
        0,
        Math.floor(Number(march.cavalry || 0) || 0),
      );
      const marchArtillery = Math.max(
        0,
        Math.floor(Number(march.artillery || 0) || 0),
      );
      const addedPower = battleAttackPower(
        {
          infantry: marchInfantry,
          cavalry: marchCavalry,
          artillery: marchArtillery,
        },
        gameConfig,
      );
      const currentHealth = advanceBattleHealth(existingBattle, now);
      Object.assign(existingBattle, currentHealth);
      if (isAttackerSide) {
        existingBattle.attackerInfantry =
          (existingBattle.attackerInfantry || 0) + marchInfantry;
        existingBattle.attackerCavalry =
          (existingBattle.attackerCavalry || 0) + marchCavalry;
        existingBattle.attackerArtillery =
          (existingBattle.attackerArtillery || 0) + marchArtillery;
        existingBattle.attackerPower =
          (existingBattle.attackerPower || 0) + addedPower;
        existingBattle.attackerMaxHp =
          (existingBattle.attackerMaxHp ||
            existingBattle.attackerPower - addedPower) + addedPower;
        existingBattle.attackerCurrentHp = Math.min(
          existingBattle.attackerMaxHp,
          (existingBattle.attackerCurrentHp || 0) + addedPower,
        );
      } else {
        existingBattle.defenderInfantry =
          (existingBattle.defenderInfantry || 0) + marchInfantry;
        existingBattle.defenderCavalry =
          (existingBattle.defenderCavalry || 0) + marchCavalry;
        existingBattle.defenderArtillery =
          (existingBattle.defenderArtillery || 0) + marchArtillery;
        existingBattle.defenderPower =
          (existingBattle.defenderPower || 0) + addedPower;
        existingBattle.defenderMaxHp =
          (existingBattle.defenderMaxHp ||
            existingBattle.defenderPower - addedPower) + addedPower;
        existingBattle.defenderCurrentHp = Math.min(
          existingBattle.defenderMaxHp,
          (existingBattle.defenderCurrentHp || 0) + addedPower,
        );
      }
      existingBattle.battleVersion =
        Math.max(1, Number(existingBattle.battleVersion || 1)) + 1;
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
            attackerMaxHp: existingBattle.attackerMaxHp,
            attackerCurrentHp: existingBattle.attackerCurrentHp,
            defenderMaxHp: existingBattle.defenderMaxHp,
            defenderCurrentHp: existingBattle.defenderCurrentHp,
            hpUpdatedAt: now,
            battleVersion: existingBattle.battleVersion,
          },
        },
      );
      await marchOrders.deleteOne({ _id: march._id });
      publishRealtime({
        type: "battle_started",
        battle: toPublicBattle(existingBattle),
        consumedMarchId: march._id,
      });
      publishRealtime({
        type: "march_removed",
        marchId: march._id,
        territoryId: territory.id,
        reason: "joined_battle",
      });
      continue;
    }
    const defenderSave = await saves.findOne({
      playerId: targetClaim.playerId,
    });
    const defenderTowns = Array.isArray(defenderSave?.towns)
      ? defenderSave.towns
      : [];
    const defenderTown = normalizeTownSnapshotForState(
      findTownForTerritory(defenderTowns, territory) ||
        defaultTownSnapshotForTerritory(territory, targetClaim.playerId),
      targetClaim.playerId,
      territory,
    );
    const attackerInfantry =
      Math.max(0, Math.floor(Number(march.infantry || 0) || 0)) ||
      inferInfantryFromTroops(march.troops || 0, gameConfig);
    const attackerCavalry = Math.max(
      0,
      Math.floor(Number(march.cavalry || 0) || 0),
    );
    const attackerArtillery = Math.max(
      0,
      Math.floor(Number(march.artillery || 0) || 0),
    );
    const defenderInfantry = Math.max(
      0,
      Math.floor(
        Number(defenderTown.infantryCount || defenderTown.troops || 0) || 0,
      ),
    );
    const defenderCavalry = Math.max(
      0,
      Math.floor(Number(defenderTown.cavalryCount || 0) || 0),
    );
    const defenderArtillery = Math.max(
      0,
      Math.floor(Number(defenderTown.artilleryCount || 0) || 0),
    );
    const attackerPower = battleAttackPower(
      {
        infantry: attackerInfantry,
        cavalry: attackerCavalry,
        artillery: attackerArtillery,
      },
      gameConfig,
    );
    const defenderPower = battleDefensePower(
      {
        infantry: defenderInfantry,
        cavalry: defenderCavalry,
        artillery: defenderArtillery,
      },
      defenderTown,
      gameConfig,
    );
    const durationSeconds = battleDurationSeconds(
      attackerPower,
      defenderPower,
      defenderTown,
      gameConfig,
    );
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
      usesShip: Boolean(march.usesShip),
      startedAt: now,
      resolvesAt: new Date(now.getTime() + durationSeconds * 1000),
      durationSeconds,
      attackerMaxHp: Math.max(1, attackerPower),
      attackerCurrentHp: Math.max(1, attackerPower),
      defenderMaxHp: Math.max(1, defenderPower),
      defenderCurrentHp: Math.max(1, defenderPower),
      hpUpdatedAt: now,
      battleVersion: 1,
    };
    await activeBattles.insertOne(battle);
    await marchOrders.deleteOne({ _id: march._id });
    publishRealtime({
      type: "battle_started",
      battle: toPublicBattle(battle),
      consumedMarchId: march._id,
    });
    publishRealtime({
      type: "march_removed",
      marchId: march._id,
      territoryId: territory.id,
      reason: "battle_started",
    });
  }
  if (arrived.length > 0) {
    await bumpWorldCacheVersion();
  }
}
async function processActiveBattles(now = new Date()) {
  const {
    players,
    territoryClaims,
    territoryClearings,
    activeBattles,
    marchOrders,
    saves,
    alliances,
  } = await collections();
  const gameConfig = await loadGameConfig();
  const resolved = await activeBattles
    .find({ resolvesAt: { $lte: now } })
    .sort({ resolvesAt: 1 })
    .limit(WORLD_TICK_BATCH_SIZE)
    .toArray();
  for (const battle of resolved) {
    const battleStillActive = await activeBattles.findOne({ _id: battle._id });
    if (!battleStillActive) continue;
    const territory = getStaticTerritory(battle.regionId);
    if (!territory) {
      await activeBattles.deleteOne({ _id: battle._id });
      continue;
    }
    const releasePlayerLocks = await acquirePlayerMutationLocks([
      battle.attackerId,
      battle.defenderId,
    ]);
    try {
      const attackerWins = battle.attackerPower > battle.defenderPower;
      const totalPower = Math.max(
        1,
        battle.attackerPower + battle.defenderPower,
      );
      const winnerRatio = attackerWins
        ? clampNumber(battle.attackerPower / totalPower, 0.12, 0.82)
        : clampNumber(battle.defenderPower / totalPower, 0.12, 0.88);
      const troopValue = (infantry, cavalry, artillery) =>
        infantry * gameConfig.infantryTroopsValue +
        cavalry * gameConfig.cavalryTroopsValue +
        artillery * gameConfig.artilleryTroopsValue;
      const attackerPlayer = await players.findOne({ _id: battle.attackerId });
      const defenderPlayer = battle.defenderId
        ? await players.findOne({ _id: battle.defenderId })
        : null;
      let attackerSurvivors = {
        infantry: 0,
        cavalry: 0,
        artillery: 0,
        power: 0,
      };
      let attackerCasualties = {
        infantry: battle.attackerInfantry,
        cavalry: battle.attackerCavalry,
        artillery: battle.attackerArtillery,
        power: battle.attackerPower,
      };
      let defenderSurvivors = {
        infantry: 0,
        cavalry: 0,
        artillery: 0,
        power: 0,
      };
      let defenderCasualties = {
        infantry: battle.defenderInfantry,
        cavalry: battle.defenderCavalry,
        artillery: battle.defenderArtillery,
        power: battle.defenderPower,
      };
      let lootedResources = emptyResources();
      if (attackerWins) {
        const survivorRatio = winnerRatio;
        const nextInfantry = Math.max(
          1,
          Math.floor(battle.attackerInfantry * survivorRatio),
        );
        const nextCavalry = Math.max(
          0,
          Math.floor(battle.attackerCavalry * survivorRatio),
        );
        const nextArtillery = Math.max(
          0,
          Math.floor(battle.attackerArtillery * survivorRatio),
        );
        const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
        attackerSurvivors = {
          infantry: nextInfantry,
          cavalry: nextCavalry,
          artillery: nextArtillery,
          power: nextTroops,
        };
        attackerCasualties = {
          infantry: Math.max(0, battle.attackerInfantry - nextInfantry),
          cavalry: Math.max(0, battle.attackerCavalry - nextCavalry),
          artillery: Math.max(0, battle.attackerArtillery - nextArtillery),
          power: Math.max(0, battle.attackerPower - nextTroops),
        };
        const attackerSave = await saves.findOne({
          playerId: battle.attackerId,
        });
        const defenderSave = battle.defenderId
          ? await saves.findOne({ playerId: battle.defenderId })
          : null;
        const attackerTowns = Array.isArray(attackerSave?.towns)
          ? removeTownForTerritory(attackerSave.towns, territory)
          : [];
        const defenderStoredTown = Array.isArray(defenderSave?.towns)
          ? findTownForTerritory(defenderSave.towns, territory)
          : null;
        const capturedStorage = normalizeStoredResources(
          defenderStoredTown?.storage,
        );
        const capturedTown = normalizeTownSnapshotForState(
          {
            ...defaultTownSnapshotForTerritory(territory, battle.attackerId),
            id: battle.townId || townIdForTerritory(territory.id),
            ownerId: battle.attackerId,
            infantryCount: nextInfantry,
            cavalryCount: nextCavalry,
            artilleryCount: nextArtillery,
            troops: nextTroops,
            storage: emptyResources(),
          },
          battle.attackerId,
          territory,
        );
        attackerTowns.push(capturedTown);
        const defenderTowns = Array.isArray(defenderSave?.towns)
          ? removeTownForTerritory(defenderSave.towns, territory)
          : [];
        const defenderResources = normalizeResources(defenderPlayer?.resources);
        const attackerResources = normalizeResources(attackerPlayer?.resources);
        const attackerClaimCount = await territoryClaims.countDocuments({
          playerId: battle.attackerId,
        });
        const attackerCapacity = resourceCapacityForOwnedTerritories(
          attackerClaimCount + 1,
        );
        RESOURCE_KEYS.forEach((key) => {
          const stored = Math.min(
            defenderResources[key] || 0,
            capturedStorage[key] || 0,
          );
          const availableCapacity = Math.max(
            0,
            attackerCapacity[key] - (attackerResources[key] || 0),
          );
          lootedResources[key] = Math.floor(
            Math.min(stored, availableCapacity),
          );
          defenderResources[key] = Math.max(
            0,
            defenderResources[key] - lootedResources[key],
          );
          attackerResources[key] = Math.max(
            0,
            attackerResources[key] + lootedResources[key],
          );
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
                connectionType: battle.usesShip
                  ? "sea"
                  : territoryConnectionType(
                      getStaticTerritory(battle.fromTerritoryId),
                      territory,
                    ) || "land",
                isolated: false,
              },
              $setOnInsert: {
                _id: `territory:${territory.id}`,
                territoryId: territory.id,
              },
            },
            { upsert: true },
          ),
          territoryClearings.deleteMany({ territoryId: territory.id }),
          saves.updateOne(
            { playerId: battle.attackerId },
            {
              $set: { towns: attackerTowns, updatedAt: now },
              $setOnInsert: {
                _id: `save:${battle.attackerId}`,
                playerId: battle.attackerId,
                resources: DEFAULT_PLAYER_RESOURCES,
              },
            },
            { upsert: true },
          ),
          battle.defenderId
            ? saves.updateOne(
                { playerId: battle.defenderId },
                { $set: { towns: defenderTowns, updatedAt: now } },
              )
            : Promise.resolve(),
          players.updateOne(
            { _id: battle.attackerId },
            {
              $set: {
                resources: attackerResources,
                lastResourceCollectedAt: now,
                lastSeenAt: now,
              },
            },
          ),
          battle.defenderId
            ? players.updateOne(
                { _id: battle.defenderId },
                {
                  $set: {
                    resources: defenderResources,
                    lastResourceCollectedAt: now,
                    lastSeenAt: now,
                  },
                },
              )
            : Promise.resolve(),
        ]);
        await publishPlayerState(
          battle.attackerId,
          "battle_resolved",
          attackerResources,
          attackerTowns,
        );
        if (battle.defenderId) {
          await publishPlayerState(
            battle.defenderId,
            "battle_resolved",
            defenderResources,
            defenderTowns,
          );
          await cancelBrokenRouteClearings(battle.defenderId, now);
          // Automatically prune & destroy any disconnected territories for defender
          await pruneDisconnectedClaims(battle.defenderId);
        }
        if (battle.defenderId) {
          const defenderRemainingClaims = await territoryClaims.countDocuments({
            playerId: battle.defenderId,
          });
          if (defenderRemainingClaims === 0) {
            await Promise.all([
              territoryClaims.deleteMany({ playerId: battle.defenderId }),
              territoryClearings.deleteMany({ playerId: battle.defenderId }),
              marchOrders.deleteMany({ ownerId: battle.defenderId }),
              activeBattles.deleteMany({
                _id: { $ne: battle._id },
                $or: [
                  { attackerId: battle.defenderId },
                  { defenderId: battle.defenderId },
                ],
              }),
              saves.updateOne(
                { playerId: battle.defenderId },
                {
                  $set: { towns: [], updatedAt: now },
                  $setOnInsert: {
                    _id: `save:${battle.defenderId}`,
                    playerId: battle.defenderId,
                  },
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
                    newbieShieldUntil: new Date(
                      now.getTime() + 24 * 3600 * 1000,
                    ),
                  },
                },
              ),
            ]);
            publishRealtime({
              type: "player_eliminated",
              playerId: battle.defenderId,
              reason: "all_towns_captured",
            });
            await publishPlayerState(
              battle.defenderId,
              "player_eliminated",
              emptyResources(),
              [],
              new Date(now.getTime() + 24 * 3600 * 1000),
            );
          }
        }
      } else if (battle.defenderId) {
        const survivorRatio = winnerRatio;
        const nextInfantry = Math.max(
          1,
          Math.floor(battle.defenderInfantry * survivorRatio),
        );
        const nextCavalry = Math.max(
          0,
          Math.floor(battle.defenderCavalry * survivorRatio),
        );
        const nextArtillery = Math.max(
          0,
          Math.floor(battle.defenderArtillery * survivorRatio),
        );
        const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
        defenderSurvivors = {
          infantry: nextInfantry,
          cavalry: nextCavalry,
          artillery: nextArtillery,
          power: nextTroops,
        };
        defenderCasualties = {
          infantry: Math.max(0, battle.defenderInfantry - nextInfantry),
          cavalry: Math.max(0, battle.defenderCavalry - nextCavalry),
          artillery: Math.max(0, battle.defenderArtillery - nextArtillery),
          power: Math.max(0, battle.defenderPower - nextTroops),
        };
        const defenderSave = await saves.findOne({
          playerId: battle.defenderId,
        });
        const defenderTowns = Array.isArray(defenderSave?.towns)
          ? removeTownForTerritory(defenderSave.towns, territory)
          : [];
        const keptTown = normalizeTownSnapshotForState(
          {
            ...defaultTownSnapshotForTerritory(
              territory,
              battle.defenderId,
              battle.townId,
            ),
            ownerId: battle.defenderId,
            infantryCount: nextInfantry,
            cavalryCount: nextCavalry,
            artilleryCount: nextArtillery,
            troops: nextTroops,
          },
          battle.defenderId,
          territory,
        );
        defenderTowns.push(keptTown);
        await saves.updateOne(
          { playerId: battle.defenderId },
          {
            $set: { towns: defenderTowns, updatedAt: now },
            $setOnInsert: {
              _id: `save:${battle.defenderId}`,
              playerId: battle.defenderId,
              resources: DEFAULT_PLAYER_RESOURCES,
            },
          },
          { upsert: true },
        );
        const defenderCurrent = defenderPlayer
          ? normalizeResources(defenderPlayer.resources)
          : DEFAULT_PLAYER_RESOURCES;
        await publishPlayerState(
          battle.defenderId,
          "battle_resolved",
          defenderCurrent,
          defenderTowns,
        );
        const retreatRatio =
          clampNumber(gameConfig.retreatPercent, 0, 100) / 100;
        let retreatInfantry = 0;
        let retreatCavalry = 0;
        let retreatArtillery = 0;
        if (retreatRatio > 0) {
          const sourceTerritory = getStaticTerritory(battle.fromTerritoryId);
          if (sourceTerritory) {
            retreatInfantry = Math.floor(
              battle.attackerInfantry * retreatRatio,
            );
            retreatCavalry = Math.floor(battle.attackerCavalry * retreatRatio);
            retreatArtillery = Math.floor(
              battle.attackerArtillery * retreatRatio,
            );
            if (retreatInfantry + retreatCavalry + retreatArtillery > 0) {
              const attackerSave = await saves.findOne({
                playerId: battle.attackerId,
              });
              const attackerTowns = Array.isArray(attackerSave?.towns)
                ? removeTownForTerritory(attackerSave.towns, sourceTerritory)
                : [];
              const sourceTown = normalizeTownSnapshotForState(
                findTownForTerritory(
                  attackerSave?.towns || [],
                  sourceTerritory,
                ) ||
                  defaultTownSnapshotForTerritory(
                    sourceTerritory,
                    battle.attackerId,
                  ),
                battle.attackerId,
                sourceTerritory,
              );
              sourceTown.infantryCount = Math.max(
                0,
                (sourceTown.infantryCount || 0) + retreatInfantry,
              );
              sourceTown.cavalryCount = Math.max(
                0,
                (sourceTown.cavalryCount || 0) + retreatCavalry,
              );
              sourceTown.artilleryCount = Math.max(
                0,
                (sourceTown.artilleryCount || 0) + retreatArtillery,
              );
              sourceTown.troops = troopValue(
                sourceTown.infantryCount,
                sourceTown.cavalryCount,
                sourceTown.artilleryCount,
              );
              attackerTowns.push(sourceTown);
              await saves.updateOne(
                { playerId: battle.attackerId },
                {
                  $set: { towns: attackerTowns, updatedAt: now },
                  $setOnInsert: {
                    _id: `save:${battle.attackerId}`,
                    playerId: battle.attackerId,
                    resources: DEFAULT_PLAYER_RESOURCES,
                  },
                },
                { upsert: true },
              );
              const attackerCurrent = attackerPlayer
                ? normalizeResources(attackerPlayer.resources)
                : DEFAULT_PLAYER_RESOURCES;
              await publishPlayerState(
                battle.attackerId,
                "battle_retreat",
                attackerCurrent,
                attackerTowns,
              );
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
        winnerId: attackerWins
          ? battle.attackerId
          : battle.defenderId || "defender",
        isAttackerWin: attackerWins,
        attacker: {
          initial: {
            infantry: battle.attackerInfantry,
            cavalry: battle.attackerCavalry,
            artillery: battle.attackerArtillery,
            power: battle.attackerPower,
          },
          casualty: attackerCasualties,
          survivors: attackerSurvivors,
        },
        defender: {
          initial: {
            infantry: battle.defenderInfantry,
            cavalry: battle.defenderCavalry,
            artillery: battle.defenderArtillery,
            power: battle.defenderPower,
          },
          casualty: defenderCasualties,
          survivors: defenderSurvivors,
        },
        lootedResources,
        readBy: [],
        createdAt: now,
      };
      await battleReports.insertOne(reportDoc);
      await activeBattles.deleteOne({ _id: battle._id });
      const claim = await territoryClaims.findOne({
        territoryId: territory.id,
      });
      const [player, alliance] = claim?.playerId
        ? await Promise.all([
            players.findOne({ _id: claim.playerId }),
            alliances.findOne({ memberIds: claim.playerId }),
          ])
        : [null, null];
      const publicTerritory = {
        ...territory,
        ownerId: claim?.playerId ?? null,
        ownerName: claim?.playerId ? (player?.name ?? claim.playerId) : null,
        ownerFlagColor: claim?.playerId
          ? (player?.flagColor ?? "#2f70d7")
          : undefined,
        ownerEmblem: claim?.playerId ? (player?.emblem ?? "shield") : undefined,
        ownerAllianceTag: alliance?.tag,
        ownerAllianceEmblem: alliance?.emblem,
        settlementKind: claim?.settlementKind ?? "military",
        equippedCapitalSkin: player?.shopInventory?.equippedCapitalSkin ?? null,
        equippedDistrictSkin:
          player?.shopInventory?.equippedDistrictSkin ?? null,
      };
      publishRealtime({
        type: "battle_resolved",
        battleId: battle._id,
        territory: publicTerritory,
        winner: attackerWins ? "attacker" : "defender",
      });
      const reportRecipients = [
        ...new Set(
          [battle.attackerId, battle.defenderId].filter((id) => Boolean(id)),
        ),
      ];
      await Promise.all(
        reportRecipients.map(async (recipientId) => {
          const unreadCount = await battleReports.countDocuments({
            $or: [{ attackerId: recipientId }, { defenderId: recipientId }],
            readBy: { $ne: recipientId },
          });
          publishRealtime(
            {
              type: "battle_report_created",
              report: toPublicReport(reportDoc, recipientId),
              unreadCount,
              version: now.getTime(),
              serverTime: now.toISOString(),
            },
            `player:${recipientId}`,
          );
        }),
      );
      publishRealtime({
        type: "territory_claimed",
        territory: publicTerritory,
      });
    } finally {
      releasePlayerLocks();
    }
  }
  if (resolved.length > 0) {
    await bumpWorldCacheVersion();
  }
}
async function cancelBrokenRouteClearing(clearing, now) {
  if (clearing.isStarterClaim || clearing.sourceTerritoryId === undefined)
    return false;
  const { players, territoryClaims, territoryClearings, saves } =
    await collections();
  const claims = await territoryClaims
    .find({ playerId: clearing.playerId })
    .toArray();
  const sourceClaim = claims.find(
    (claim) => claim.territoryId === clearing.sourceTerritoryId,
  );
  const sourceStillOwned = Boolean(
    sourceClaim && sourceClaim.playerId === clearing.playerId,
  );
  const sourceConnected =
    sourceStillOwned &&
    isClaimConnectedToCapital(claims, clearing.sourceTerritoryId);
  if (sourceConnected) return false;
  const save = await saves.findOne({ playerId: clearing.playerId });
  const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
  const resources = normalizeResources(
    (await collectPlayerResources(clearing.playerId, now)).resources,
  );
  // A captured source or a severed chain destroys the expedition and its supplies.
  // Only the player's explicit cancel endpoint returns settlers and build costs.
  await Promise.all([
    territoryClearings.deleteOne({ _id: clearing._id }),
    players.updateOne(
      { _id: clearing.playerId },
      { $set: { resources, onboardingState: "settled", lastSeenAt: now } },
    ),
    saves.updateOne(
      { playerId: clearing.playerId },
      {
        $set: { towns, updatedAt: now },
        $setOnInsert: {
          _id: `save:${clearing.playerId}`,
          playerId: clearing.playerId,
          resources: DEFAULT_PLAYER_RESOURCES,
        },
      },
      { upsert: true },
    ),
  ]);
  publishRealtime({
    type: "territory_clearing_cancelled",
    territoryId: clearing.territoryId,
    playerId: clearing.playerId,
  });
  await publishPlayerState(
    clearing.playerId,
    sourceStillOwned ? "clearing_route_cut" : "clearing_source_lost",
    resources,
    towns,
  );
  return true;
}
async function cancelBrokenRouteClearings(playerId, now = new Date()) {
  const { territoryClearings } = await collections();
  const clearings = await territoryClearings.find({ playerId }).toArray();
  let cancelled = 0;
  for (const clearing of clearings) {
    if (await cancelBrokenRouteClearing(clearing, now)) cancelled += 1;
  }
  return cancelled;
}
async function processCompletedClearings(now = new Date()) {
  const { players, territoryClaims, territoryClearings, alliances, saves } =
    await collections();
  const completed = await territoryClearings
    .find({ completesAt: { $lte: now } })
    .sort({ completesAt: 1 })
    .limit(WORLD_TICK_BATCH_SIZE)
    .toArray();
  for (const clearing of completed) {
    if (await cancelBrokenRouteClearing(clearing, now)) continue;
    const territory = getStaticTerritory(clearing.territoryId);
    if (!territory) {
      await territoryClearings.deleteOne({ _id: clearing._id });
      continue;
    }
    const existingClaim = await territoryClaims.findOne({
      territoryId: territory.id,
    });
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
          parentTerritoryId: clearing.isStarterClaim
            ? undefined
            : clearing.sourceTerritoryId,
          connectionType: clearing.connectionType,
        },
      },
      { upsert: true },
    );
    await territoryClearings.deleteOne({ _id: clearing._id });
    await players.updateOne(
      { _id: clearing.playerId },
      { $set: { onboardingState: "settled", lastSeenAt: now } },
    );
    const resourceState = await collectPlayerResources(clearing.playerId, now);
    const saveDoc = await saves.findOne({ playerId: clearing.playerId });
    const towns = Array.isArray(saveDoc?.towns)
      ? removeTownForTerritory(saveDoc.towns, territory)
      : [];
    const town = normalizeTownSnapshotForState(
      defaultTownSnapshotForTerritory(territory, clearing.playerId),
      clearing.playerId,
      territory,
    );
    towns.push(town);
    await saves.updateOne(
      { playerId: clearing.playerId },
      {
        $set: { towns, updatedAt: now },
        $setOnInsert: {
          _id: `save:${clearing.playerId}`,
          playerId: clearing.playerId,
          resources: DEFAULT_PLAYER_RESOURCES,
        },
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
        settlementKind: clearing.isStarterClaim ? "capital" : "military",
        equippedCapitalSkin: player?.shopInventory?.equippedCapitalSkin ?? null,
        equippedDistrictSkin:
          player?.shopInventory?.equippedDistrictSkin ?? null,
      },
    });
    await publishPlayerState(
      clearing.playerId,
      "clearing_completed",
      resourceState.resources,
      towns,
    );
  }
  if (completed.length > 0) {
    await bumpWorldCacheVersion();
  }
}
let worldTickInFlight = false;
let lastRealtimeEconomyTickAt = 0;
let lastTroopRecoveryScanAt = 0;
let lastBattleStateBroadcastAt = 0;
const WORLD_TICK_BATCH_SIZE = 100;
const ECONOMY_SETTLE_INTERVAL_MS = 60_000;
const TROOP_RECOVERY_SCAN_INTERVAL_MS = 5_000;
async function publishRealtimeEconomyTick(now) {
  if (now.getTime() - lastRealtimeEconomyTickAt < ECONOMY_SETTLE_INTERVAL_MS)
    return;
  lastRealtimeEconomyTickAt = now.getTime();
  const playerIds = connectedPlayerIds();
  if (playerIds.length === 0) return;
  const { saves, territoryClaims } = await collections();
  const settlePlayer = async (playerId) => {
    const releasePlayerLock = await acquirePlayerMutationLock(playerId);
    try {
      const resourceState = await collectPlayerResources(playerId, now);
      const [save, claims] = await Promise.all([
        saves.findOne({ playerId }),
        territoryClaims.find({ playerId }).toArray(),
      ]);
      const territories = claims
        .map((claim) => {
          const territory = getStaticTerritory(claim.territoryId);
          return territory ? { ...territory, ownerId: playerId } : null;
        })
        .filter((territory) => Boolean(territory));
      const towns = townSnapshotsForPlayer(
        save?.towns,
        territories,
        playerId,
        resourceState.resources,
        now,
      );
      if (towns.length > 0) {
        await saves.updateOne(
          { playerId },
          {
            $set: { towns, resources: resourceState.resources, updatedAt: now },
            $setOnInsert: { _id: `save:${playerId}`, playerId },
          },
          { upsert: true },
        );
      }
      await publishPlayerState(
        playerId,
        "economy_tick",
        resourceState.resources,
        towns,
      );
    } finally {
      releasePlayerLock();
    }
  };
  for (let offset = 0; offset < playerIds.length; offset += 50) {
    await Promise.all(playerIds.slice(offset, offset + 50).map(settlePlayer));
  }
}
async function processDueTroopRecovery(now) {
  if (now.getTime() - lastTroopRecoveryScanAt < TROOP_RECOVERY_SCAN_INTERVAL_MS)
    return;
  lastTroopRecoveryScanAt = now.getTime();
  const gameConfig = await loadGameConfig();
  if (!gameConfig.troopRecoveryEnabled) return;
  const { saves, players, territoryClaims, marchOrders, activeBattles } =
    await collections();
  const dueSaves = await saves
    .find({
      "towns.nextTroopRecoveryAt": { $lte: now.toISOString() },
    })
    .limit(50)
    .toArray();
  for (const dueSave of dueSaves) {
    const releasePlayerLock = await acquirePlayerMutationLock(dueSave.playerId);
    try {
      const [save, claims, marches, battles, resourceState] = await Promise.all(
        [
          saves.findOne({ playerId: dueSave.playerId }),
          territoryClaims.find({ playerId: dueSave.playerId }).toArray(),
          marchOrders.find({ ownerId: dueSave.playerId }).toArray(),
          activeBattles
            .find({
              $or: [
                { attackerId: dueSave.playerId },
                { defenderId: dueSave.playerId },
              ],
            })
            .toArray(),
          collectPlayerResources(dueSave.playerId, now),
        ],
      );
      if (!save) continue;
      const territories = claims
        .map((claim) => {
          const territory = getStaticTerritory(claim.territoryId);
          return territory
            ? {
                ...territory,
                ownerId: dueSave.playerId,
                settlementKind: claim.settlementKind,
              }
            : null;
        })
        .filter((territory) => Boolean(territory));
      const towns = applyTownMarchReservations(
        townSnapshotsForPlayer(
          save.towns,
          territories,
          dueSave.playerId,
          undefined,
          now,
        ),
        marches,
      );
      let resources = normalizeResources(resourceState.resources);
      let changed = false;
      const updates = [];
      const battleTerritories = new Set(
        battles.map((battle) => Number(battle.regionId)),
      );
      const intervalMs = Math.max(10, gameConfig.troopRecoverySeconds) * 1000;
      for (const town of towns) {
        const territoryId = Number(
          town.territoryId ?? normalizeWorldTerritoryId(town.id),
        );
        const dueAt = town.nextTroopRecoveryAt
          ? new Date(town.nextTroopRecoveryAt)
          : new Date(now.getTime() + intervalMs);
        if (
          !Number.isFinite(dueAt.getTime()) ||
          dueAt.getTime() > now.getTime()
        )
          continue;
        const claim = claims.find((item) => item.territoryId === territoryId);
        const territory = getStaticTerritory(territoryId);
        const specialty = trainingSpecialtyForTerritory(
          territory,
          claim?.settlementKind || town.kind,
        );
        const cost = troopRecoveryCost(specialty, gameConfig);
        const elapsedSlots =
          1 +
          Math.floor(Math.max(0, now.getTime() - dueAt.getTime()) / intervalMs);
        const slots = Math.min(
          gameConfig.troopRecoveryOfflineLimit,
          elapsedSlots,
        );
        let recovered = 0;
        let blockedReason = null;
        for (let slot = 0; slot < slots; slot += 1) {
          const garrisonUnits = Math.max(
            0,
            Number(town.infantryCount || 0) +
              Number(town.cavalryCount || 0) +
              Number(town.artilleryCount || 0),
          );
          const usedCapacity =
            garrisonUnits + Math.max(0, Number(town.reservedTroops || 0));
          const capacity = Math.max(
            1,
            Number(town.troopCapacity ?? town.maxTroops) || 1,
          );
          if (!claim || !isClaimConnectedToCapital(claims, territoryId)) {
            blockedReason = "isolated";
            break;
          }
          if (battleTerritories.has(territoryId)) {
            blockedReason = "battle";
            break;
          }
          if (usedCapacity >= capacity) {
            blockedReason = "full";
            break;
          }
          if (!canAfford(resources, cost)) {
            blockedReason = "resources";
            break;
          }
          resources = subtractCost(resources, cost);
          if (specialty === "cavalry")
            town.cavalryCount = Math.max(0, Number(town.cavalryCount || 0)) + 1;
          else if (specialty === "artillery")
            town.artilleryCount =
              Math.max(0, Number(town.artilleryCount || 0)) + 1;
          else
            town.infantryCount =
              Math.max(0, Number(town.infantryCount || 0)) + 1;
          town.troops =
            Number(town.infantryCount || 0) +
            Number(town.cavalryCount || 0) +
            Number(town.artilleryCount || 0);
          recovered += 1;
          changed = true;
        }
        town.trainingSpecialty = specialty;
        town.recoveryCost = cost;
        town.troopRecoverySeconds = gameConfig.troopRecoverySeconds;
        town.troopRecoveryBlockedReason = blockedReason;
        town.nextTroopRecoveryAt = new Date(
          blockedReason
            ? now.getTime() + intervalMs
            : dueAt.getTime() + Math.max(1, recovered) * intervalMs,
        ).toISOString();
        updates.push({
          townId: town.id,
          territoryId,
          specialty,
          recovered,
          blockedReason,
          nextTroopRecoveryAt: town.nextTroopRecoveryAt,
          troops: town.troops,
          troopCapacity: town.troopCapacity,
          reservedTroops: town.reservedTroops,
        });
      }
      await Promise.all([
        saves.updateOne(
          { playerId: dueSave.playerId },
          { $set: { towns, resources, updatedAt: now } },
        ),
        players.updateOne(
          { _id: dueSave.playerId },
          {
            $set: { resources, lastResourceCollectedAt: now, lastSeenAt: now },
          },
        ),
      ]);
      if (updates.length > 0) {
        publishRealtime(
          {
            type: "troop_recovery_updated",
            playerId: dueSave.playerId,
            updates,
            towns,
            resources,
            resourceCapacity: resourceState.resourceCapacity,
            productionPerSecond: resourceState.productionPerSecond,
            serverTime: now.toISOString(),
          },
          `player:${dueSave.playerId}`,
        );
      }
      if (changed) {
        await publishPlayerState(
          dueSave.playerId,
          "troop_recovered",
          resources,
          towns,
        );
      }
    } finally {
      releasePlayerLock();
    }
  }
}
async function publishActiveBattleStates(now) {
  const gameConfig = await loadGameConfig();
  const intervalMs = Math.max(1, gameConfig.battleStateBroadcastSeconds) * 1000;
  if (now.getTime() - lastBattleStateBroadcastAt < intervalMs) return;
  lastBattleStateBroadcastAt = now.getTime();
  const { activeBattles } = await collections();
  const battles = await activeBattles
    .find({ resolvesAt: { $gt: now } })
    .limit(250)
    .toArray();
  if (battles.length === 0) return;
  const updatedBattles = battles.map((battle) => {
    const health = advanceBattleHealth(battle, now);
    health.battleVersion = Math.max(1, Number(battle.battleVersion || 1)) + 1;
    Object.assign(battle, health);
    return battle;
  });
  await activeBattles.bulkWrite(
    updatedBattles.map((battle) => ({
      updateOne: {
        filter: { _id: battle._id },
        update: {
          $set: {
            attackerMaxHp: battle.attackerMaxHp,
            attackerCurrentHp: battle.attackerCurrentHp,
            defenderMaxHp: battle.defenderMaxHp,
            defenderCurrentHp: battle.defenderCurrentHp,
            hpUpdatedAt: battle.hpUpdatedAt,
            battleVersion: battle.battleVersion,
          },
        },
      },
    })),
  );
  publishRealtime({
    type: "battle_state_updated",
    battles: updatedBattles.map(toPublicBattle),
    serverTime: now.toISOString(),
  });
}
async function processWorldTick(now = new Date()) {
  if (worldTickInFlight) return false;
  worldTickInFlight = true;
  try {
    await processArrivedMarches(now);
    await processActiveBattles(new Date());
    await processCompletedClearings(new Date());
    await processDueTroopRecovery(new Date());
    await publishActiveBattleStates(new Date());
    return true;
  } finally {
    worldTickInFlight = false;
  }
}
const BOT_CONFIGS = [
  {
    id: "bot-tao-thao",
    name: "Tào Tháo",
    flagColor: "#ef4444",
    emblem: "dragon",
  },
  {
    id: "bot-gia-cat-luong",
    name: "Gia Cát Lượng",
    flagColor: "#2563eb",
    emblem: "feather",
  },
  {
    id: "bot-trieu-tu-long",
    name: "Triệu Tử Long",
    flagColor: "#f59e0b",
    emblem: "spear",
  },
  {
    id: "bot-quang-trung",
    name: "Quang Trung",
    flagColor: "#10b981",
    emblem: "sun",
  },
  {
    id: "bot-vo-nguyen-giap",
    name: "Võ Nguyên Giáp",
    flagColor: "#8b5cf6",
    emblem: "star",
  },
  {
    id: "bot-doc-co-cau-bai",
    name: "Độc Cô Cầu Bại",
    flagColor: "#ec4899",
    emblem: "sword",
  },
];
async function retireLegacyBots() {
  const {
    players,
    saves,
    territoryClaims,
    territoryClearings,
    marchOrders,
    activeBattles,
    battleReports,
  } = await collections();
  const bots = await players
    .find({ $or: [{ isBot: true }, { _id: /^player:bot-/ }] })
    .toArray();
  const botIds = bots.map((bot) => bot._id);
  if (botIds.length === 0) return;
  await Promise.all([
    territoryClaims.deleteMany({ playerId: { $in: botIds } }),
    territoryClearings.deleteMany({ playerId: { $in: botIds } }),
    marchOrders.deleteMany({ ownerId: { $in: botIds } }),
    activeBattles.deleteMany({
      $or: [{ attackerId: { $in: botIds } }, { defenderId: { $in: botIds } }],
    }),
    battleReports.deleteMany({
      $or: [{ attackerId: { $in: botIds } }, { defenderId: { $in: botIds } }],
    }),
    saves.deleteMany({ playerId: { $in: botIds } }),
    players.deleteMany({ _id: { $in: botIds } }),
  ]);
  await bumpWorldCacheVersion();
  console.info(
    `Retired ${botIds.length} legacy bot accounts and released their territories.`,
  );
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
        // @ts-ignore
        // @ts-ignore
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
      });
      const ALL_LANDS = Array.from({ length: 60 }, (_, idx) =>
        getStaticTerritory(idx),
      ).filter((t) => Boolean(t));
      const starterLandId = (i * 12 + 5) % ALL_LANDS.length;
      const staticT = getStaticTerritory(starterLandId);
      if (staticT) {
        const claim = await territoryClaims.findOne({
          territoryId: starterLandId,
        });
        if (!claim) {
          const botTown = defaultTownSnapshotForTerritory(
            staticT,
            cfg.id,
            9000 + starterLandId,
          ) as any;
          await Promise.all([
            territoryClaims.insertOne({
              _id: `territory:${starterLandId}`,
              territoryId: starterLandId,
              playerId: cfg.id,
              claimedAt: now,
              settlementKind: "capital",
            }),
            saves.updateOne(
              { playerId: cfg.id },
              {
                $set: { towns: [botTown], updatedAt: now },
                $setOnInsert: {
                  _id: `save:${cfg.id}`,
                  playerId: cfg.id,
                  resources: DEFAULT_PLAYER_RESOURCES,
                },
              },
              { upsert: true },
            ),
          ]);
        }
      }
    }
  }
}
async function processBotAISimulation(now = new Date()) {
  try {
    const { players, saves, territoryClaims, territoryClearings, marchOrders } =
      await collections();
    const bots = await players.find({ isBot: true }).toArray();
    if (!bots || bots.length === 0) return;
    const ALL_LANDS = Array.from({ length: 60 }, (_, idx) =>
      getStaticTerritory(idx),
    ).filter((t) => Boolean(t));
    const calcTroopVal = (inf, cav, art) => inf * 18 + cav * 34 + art * 58;
    const botIds = bots.map((bot) => bot._id);
    const [allClaims, botSaves, activeBotClearings, botMarches] =
      await Promise.all([
        territoryClaims.find({}).toArray(),
        saves.find({ playerId: { $in: botIds } }).toArray(),
        territoryClearings.find({ playerId: { $in: botIds } }).toArray(),
        marchOrders
          .find({ ownerId: { $in: botIds } }, { projection: { ownerId: 1 } })
          .toArray(),
      ]);
    const claimsByPlayer = new Map();
    const allClaimedIds = new Set();
    allClaims.forEach((claim) => {
      allClaimedIds.add(claim.territoryId);
      const list = claimsByPlayer.get(claim.playerId) || [];
      list.push(claim);
      claimsByPlayer.set(claim.playerId, list);
    });
    const saveByPlayer = new Map(botSaves.map((save) => [save.playerId, save]));
    const clearingByPlayer = new Map(
      activeBotClearings.map((clearing) => [clearing.playerId, clearing]),
    );
    const marchCountByPlayer = new Map();
    botMarches.forEach((march) => {
      marchCountByPlayer.set(
        march.ownerId,
        (marchCountByPlayer.get(march.ownerId) || 0) + 1,
      );
    });
    let worldChanged = false;
    for (const bot of bots) {
      const claims = claimsByPlayer.get(bot._id) || [];
      const botTerritoryIds = new Set(claims.map((c) => c.territoryId));
      const botSave = saveByPlayer.get(bot._id);
      let botTowns = Array.isArray(botSave?.towns) ? botSave.towns : [];
      if (claims.length === 0) {
        const unclaimed = ALL_LANDS.filter((l) => !allClaimedIds.has(l.id));
        if (unclaimed.length > 0) {
          const pick = unclaimed[Math.floor(Math.random() * unclaimed.length)];
          const starterTown = defaultTownSnapshotForTerritory(
            pick,
            bot._id,
            9000 + pick.id,
          ) as any;
          await territoryClaims.insertOne({
            _id: `territory:${pick.id}`,
            territoryId: pick.id,
            playerId: bot._id,
            claimedAt: now,
            settlementKind: "capital" as const,
          });
          await saves.updateOne(
            { playerId: bot._id },
            {
              $set: { towns: [starterTown], updatedAt: now },
              $setOnInsert: {
                _id: `save:${bot._id}`,
                playerId: bot._id,
                resources: DEFAULT_PLAYER_RESOURCES,
              },
            },
            { upsert: true },
          );
          allClaimedIds.add(pick.id);
          const insertedClaim = {
            _id: `territory:${pick.id}`,
            territoryId: pick.id,
            playerId: bot._id,
            claimedAt: now,
            settlementKind: "capital" as const,
          };
          allClaims.push(insertedClaim);
          claimsByPlayer.set(bot._id, [insertedClaim]);
          saveByPlayer.set(bot._id, {
            ...(botSave || {}),
            playerId: bot._id,
            towns: [starterTown],
          } as any);
          worldChanged = true;
          publishRealtime({
            type: "territory_claimed",
            territory: {
              ...pick,
              ownerId: bot._id,
              ownerName: bot.name,
              ownerFlagColor: bot.flagColor ?? "#ef4444",
              ownerEmblem: bot.emblem ?? "dragon",
              settlementKind: "capital",
              equippedCapitalSkin: null,
              equippedDistrictSkin: null,
            },
          });
        }
        continue;
      }
      // 1. Train troops for bot towns over time
      let updatedTowns = false;
      botTowns = botTowns.map((town) => {
        const inf = Math.min(
          600,
          (town.infantryCount || 100) + Math.floor(Math.random() * 6 + 2),
        );
        const cav = Math.min(
          250,
          (town.cavalryCount || 30) + Math.floor(Math.random() * 3 + 1),
        );
        const art = Math.min(
          100,
          (town.artilleryCount || 10) + Math.floor(Math.random() * 2),
        );
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
        await saves.updateOne(
          { playerId: bot._id },
          { $set: { towns: botTowns, updatedAt: now } },
        );
      }
      // 2. Bot Decision A: Expand / Clear wild territory
      const activeClearing = clearingByPlayer.get(bot._id);
      if (!activeClearing && Math.random() < 0.4) {
        let wildTargetId = -1;
        for (const tid of botTerritoryIds) {
          const staticT = getStaticTerritory(tid);
          if (staticT) {
            const neighbors = ALL_LANDS.filter(
              (n) =>
                n.id !== staticT.id &&
                Math.hypot(n.x - staticT.x, n.y - staticT.y) < 320,
            );
            const wildNeighbors = neighbors.filter(
              (n) => !allClaimedIds.has(n.id),
            );
            if (wildNeighbors.length > 0) {
              wildTargetId =
                wildNeighbors[Math.floor(Math.random() * wildNeighbors.length)]
                  .id;
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
            { upsert: true },
          );
          clearingByPlayer.set(bot._id, {
            territoryId: wildTargetId,
            playerId: bot._id,
            startedAt: now,
            arrivesAt,
            completesAt,
          } as any);
          worldChanged = true;
          publishRealtime({
            type: "territory_clearing_started",
            clearing: toPublicClearing({
              territoryId: wildTargetId,
              playerId: bot._id,
              startedAt: now,
              arrivesAt,
              completesAt,
            }),
          });
        }
      }
      // 3. Bot Decision B: Launch March Attack
      const activeMarches = marchCountByPlayer.get(bot._id) || 0;
      if (activeMarches < 2 && Math.random() < 0.3 && botTowns.length > 0) {
        const enemyClaims = allClaims.filter(
          (claim) => claim.playerId !== bot._id,
        );
        if (enemyClaims.length > 0) {
          const targetClaim =
            enemyClaims[Math.floor(Math.random() * enemyClaims.length)];
          const sourceTown =
            botTowns[Math.floor(Math.random() * botTowns.length)];
          if (sourceTown && (sourceTown.troops || 0) > 80) {
            const attInf = Math.floor((sourceTown.infantryCount || 100) * 0.5);
            const attCav = Math.floor((sourceTown.cavalryCount || 30) * 0.5);
            const attArt = Math.floor((sourceTown.artilleryCount || 10) * 0.5);
            const attPower = calcTroopVal(attInf, attCav, attArt);
            sourceTown.infantryCount = Math.max(
              10,
              (sourceTown.infantryCount || 100) - attInf,
            );
            sourceTown.cavalryCount = Math.max(
              0,
              (sourceTown.cavalryCount || 30) - attCav,
            );
            sourceTown.artilleryCount = Math.max(
              0,
              (sourceTown.artilleryCount || 10) - attArt,
            );
            sourceTown.troops = calcTroopVal(
              sourceTown.infantryCount,
              sourceTown.cavalryCount,
              sourceTown.artilleryCount,
            );
            await saves.updateOne(
              { playerId: bot._id },
              { $set: { towns: botTowns, updatedAt: now } },
            );
            const marchDuration = 15000 + Math.floor(Math.random() * 15000);
            const marchId = `march:${bot._id}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
            const marchDoc: any = {
              _id: marchId,
              id: marchId,
              ownerId: bot._id,
              ownerName: bot.name,
              fromTerritoryId: normalizeWorldTerritoryId(
                (sourceTown as any).regionId ?? sourceTown.id ?? 0,
              ),
              toTerritoryId: Number(targetClaim.territoryId),
              isAttack: true,
              kind: "attack",
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
async function toPublicAlliance(alliance) {
  const { players } = await collections();
  const memberDocs =
    alliance.memberIds.length > 0
      ? await players.find({ _id: { $in: alliance.memberIds } }).toArray()
      : [];
  const nameById = new Map(
    memberDocs.map((player) => [player._id, player.name]),
  );
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
async function toPublicAllianceAid(aid) {
  const { players } = await collections();
  const docs = await players
    .find({ _id: { $in: [aid.fromPlayerId, aid.toPlayerId] } })
    .toArray();
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
async function buildAllianceState(playerId) {
  const { alliances, allianceAids, players } = await collections();
  const [mine, docs, aidInbox, aidOutbox, player] = await Promise.all([
    alliances.findOne({ memberIds: playerId }),
    alliances.find({}, { sort: { updatedAt: -1 }, limit: 20 }).toArray(),
    allianceAids
      .find(
        { toPlayerId: playerId, status: "pending" },
        { sort: { createdAt: -1 }, limit: 30 },
      )
      .toArray(),
    allianceAids
      .find({ fromPlayerId: playerId }, { sort: { createdAt: -1 }, limit: 30 })
      .toArray(),
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
  const cached = await cacheGetJson(key);
  if (cached) return cached;
  const payload = await buildWorldTerritoriesPayload();
  await cacheSetJson(key, payload, 8);
  return payload;
}
function calcTravelMetrics(
  from,
  to,
  units,
  marchConfig = DEFAULT_MARCH_CONFIG,
  forceShip = false,
) {
  const dist = Math.hypot(from.x - to.x, from.y - to.y);
  const distanceKm = Math.max(1, Math.round(dist * MAP_UNITS_TO_KM));
  const usesShip = forceShip || from.isIslet || to.isIslet;
  const speeds = [];
  if (usesShip) {
    speeds.push(marchConfig.shipSpeed);
  } else {
    if (units.infantry > 0) speeds.push(marchConfig.infantrySpeed);
    if (units.cavalry > 0) speeds.push(marchConfig.cavalrySpeed);
    if (units.artillery > 0) speeds.push(marchConfig.artillerySpeed);
  }
  const speedKmh =
    speeds.length > 0 ? Math.min(...speeds) : marchConfig.infantrySpeed;
  const travelSeconds = Math.max(
    6,
    Math.round((distanceKm / speedKmh) * marchConfig.gameHourSeconds),
  );
  return { distanceKm, speedKmh, travelSeconds, usesShip };
}
function territoryHasHarbor(territory) {
  return Boolean(
    territory.isIslet ||
    territory.specialResources?.includes("Bến tàu tự nhiên"),
  );
}
function territoryAcceptsLanding(territory) {
  return Boolean(
    territory.isIslet ||
    territory.coastal ||
    territory.specialResources?.includes("Bến tàu tự nhiên"),
  );
}
function resolveAttackRoute(from, to) {
  if (territoryConnectionType(from, to) === "land")
    return { valid: true, routeType: "land" };
  const hasPort = territoryHasHarbor(from);
  const coastalTarget = territoryAcceptsLanding(to);
  if (hasPort && coastalTarget) return { valid: true, routeType: "sea" };
  if (!hasPort && coastalTarget)
    return {
      valid: false,
      routeType: null,
      reason: "Thành này không có Bến tàu tự nhiên",
    };
  if (hasPort && !coastalTarget)
    return {
      valid: false,
      routeType: null,
      reason: "Không thể đổ bộ thẳng vào lãnh thổ nội địa",
    };
  return {
    valid: false,
    routeType: null,
    reason: "Thành không giáp mục tiêu và không có tuyến biển hợp lệ",
  };
}
export function createApp() {
  const app = express();
  app.set("trust proxy", config.TRUST_PROXY ? 1 : false);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression({ threshold: 1024, level: 1 }));
  app.use(express.json({ limit: "128kb" }));
  app.use((req, res, next) => {
    const startedAt = performance.now();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (!res.headersSent) {
        res.setHeader(
          "Server-Timing",
          `app;dur=${(performance.now() - startedAt).toFixed(1)}`,
        );
        res.setHeader("Timing-Allow-Origin", "*");
      }
      return originalJson(body);
    };
    res.on("finish", () => {
      const durationMs = performance.now() - startedAt;
      if (durationMs >= 250) {
        console.warn(
          `[slow-api] ${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(1)}ms`,
        );
      }
    });
    next();
  });
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
  const isDevLoopback = (req) => {
    const ip = req.ip || req.socket?.remoteAddress || "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  };
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: true,
      legacyHeaders: false,
      skip: isDevLoopback,
    }),
  );
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      skip: isDevLoopback,
    }),
  );
  app.use(
    "/api/game",
    rateLimit({
      windowMs: 60_000,
      limit: 90,
      standardHeaders: true,
      legacyHeaders: false,
      skip: isDevLoopback,
    }),
  );
  app.use(
    "/api/alliance",
    rateLimit({
      windowMs: 60_000,
      limit: 70,
      standardHeaders: true,
      legacyHeaders: false,
      skip: isDevLoopback,
    }),
  );
  app.use(
    "/api/admin",
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
      skip: isDevLoopback,
    }),
  );
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
    const payload = {
      ok: true,
      service: "island-empire-api",
      time: new Date().toISOString(),
    };
    res.json(payload);
  });
  app.get("/api/realtime/stats", requireAuth, requireAdmin, (_req, res) => {
    res.json(realtimeStats());
  });
  app.get("/api/chat/history", requireAuth, async (_req, res) => {
    const { chatMessages } = await collections();
    const docs = await chatMessages
      .find({}, { sort: { sentAt: -1 }, limit: 50 })
      .toArray();
    res.json({
      messages: docs.reverse().map((message) => ({
        id: message._id,
        kind: "user" as const,
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        sentAt: message.sentAt.toISOString(),
      })),
    });
  });
  app.get("/api/auth/challenge", (req, res) => {
    res.json(createAntiBotChallenge(req));
  });
  app.post("/api/auth/admin/login", async (req, res) => {
    const parsed = AdminLoginSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Invalid login payload" });
    const { username, password } = parsed.data;
    if (username !== config.ADMIN_USER || password !== config.ADMIN_PASSWORD) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "Invalid credentials" });
    }
    const token = signToken({ id: "admin", role: "admin" });
    res.json({ token });
  });
  app.post("/api/auth/player/register", async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: "bad_request",
          message:
            "Tài khoản (3-40 ký tự) hoặc mật khẩu (8-200 ký tự) không hợp lệ",
        });
    }
    const { username, password, flagColor, emblem, starterLandId } =
      parsed.data;
    if (!verifyAntiBotProof(req, parsed.data)) {
      return res
        .status(429)
        .json({
          error: "anti_bot_failed",
          message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn",
        });
    }
    if (!enforceAuthAttempt(req, res, "register", username)) return;
    const normalizedUsername = username.trim();
    const id = `player:${normalizedUsername.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const { players } = await collections();
    const existingPlayer = await players.findOne({ _id: id });
    if (existingPlayer) {
      return res
        .status(400)
        .json({ error: "username_taken", message: "Tên tài khoản đã tồn tại" });
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
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Tài khoản hoặc mật khẩu không hợp lệ",
        });
    }
    const { username, password } = parsed.data;
    if (!verifyAntiBotProof(req, parsed.data)) {
      return res
        .status(429)
        .json({
          error: "anti_bot_failed",
          message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn",
        });
    }
    if (!enforceAuthAttempt(req, res, "login", username)) return;
    const id = `player:${username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")}`;
    const { players } = await collections();
    const player = await players.findOne({ _id: id });
    if (!player || !player.passwordHash) {
      return res
        .status(401)
        .json({
          error: "unauthorized",
          message: "Sai tài khoản hoặc mật khẩu",
        });
    }
    const isPasswordValid = await bcrypt.compare(password, player.passwordHash);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({
          error: "unauthorized",
          message: "Sai tài khoản hoặc mật khẩu",
        });
    }
    const now = new Date();
    await players.updateOne({ _id: id }, { $set: { lastSeenAt: now } });
    const token = signToken({ id, role: "player" });
    res.json({ token, playerId: id });
  });
  app.post("/api/auth/player/guest", async (req, res) => {
    const antiBot = AntiBotProofSchema.safeParse(req.body);
    if (!antiBot.success || !verifyAntiBotProof(req, antiBot.data)) {
      return res
        .status(429)
        .json({
          error: "anti_bot_failed",
          message: "Xác minh chống spam không hợp lệ hoặc đã hết hạn",
        });
    }
    const name = z
      .string()
      .trim()
      .min(2)
      .max(24)
      .regex(/^[\p{L}\p{N} _-]+$/u)
      .catch(`PLAYER-${Math.floor(Math.random() * 9999)}`)
      .parse(req.body?.name);
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
      const playerId = req.user!.id;
      const reports = await battleReports
        .find({
          $or: [{ attackerId: playerId }, { defenderId: playerId }],
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      const unreadCount = await battleReports.countDocuments({
        $or: [{ attackerId: playerId }, { defenderId: playerId }],
        readBy: { $ne: playerId },
      });
      res.json({
        ok: true,
        reports: reports.map((report) => toPublicReport(report, playerId)),
        unreadCount,
      });
    } catch (e) {
      res
        .status(500)
        .json({
          ok: false,
          error: e.message || "Failed to fetch battle reports",
        });
    }
  });
  app.get("/api/reports/:id", requireAuth, async (req, res) => {
    const { battleReports } = await collections();
    const reportId = String(req.params.id);
    const report = await battleReports.findOne({
      _id: reportId,
      $or: [{ attackerId: req.user!.id }, { defenderId: req.user!.id }],
    });
    if (!report)
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy chiến báo" });
    res.json({ ok: true, report: toPublicReport(report, req.user!.id) });
  });
  app.post("/api/reports/:id/read", requireAuth, async (req, res) => {
    const { battleReports } = await collections();
    const playerId = req.user!.id;
    const reportId = String(req.params.id);
    const result = await battleReports.updateOne(
      {
        _id: reportId,
        $or: [{ attackerId: playerId }, { defenderId: playerId }],
      },
      { $addToSet: { readBy: playerId } },
    );
    if (!result.matchedCount)
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy chiến báo" });
    const unreadCount = await battleReports.countDocuments({
      $or: [{ attackerId: playerId }, { defenderId: playerId }],
      readBy: { $ne: playerId },
    });
    const version = Date.now();
    publishRealtime(
      {
        type: "battle_report_read",
        reportId,
        unreadCount,
        version,
        serverTime: new Date(version).toISOString(),
      },
      `player:${playerId}`,
    );
    res.json({ ok: true, unreadCount });
  });
  app.post("/api/reports/read-all", requireAuth, async (req, res) => {
    const { battleReports } = await collections();
    const playerId = req.user!.id;
    await battleReports.updateMany(
      {
        $or: [{ attackerId: playerId }, { defenderId: playerId }],
        readBy: { $ne: playerId },
      },
      { $addToSet: { readBy: playerId } },
    );
    const version = Date.now();
    publishRealtime(
      {
        type: "battle_report_read",
        unreadCount: 0,
        version,
        serverTime: new Date(version).toISOString(),
      },
      `player:${playerId}`,
    );
    res.json({ ok: true, unreadCount: 0 });
  });
  app.get("/api/mail/inbox", requireAuth, async (req, res) => {
    const { playerMails } = await collections();
    const mails = await playerMails
      .find({ recipientId: req.user!.id, deletedByRecipient: { $ne: true } })
      .sort({ sentAt: -1 })
      .limit(80)
      .toArray();
    const unreadCount = await playerMails.countDocuments({
      recipientId: req.user!.id,
      readAt: null,
      deletedByRecipient: { $ne: true },
    });
    res.json({ ok: true, mails: mails.map(toPublicMail), unreadCount });
  });
  app.get("/api/mail/sent", requireAuth, async (req, res) => {
    const { playerMails } = await collections();
    const mails = await playerMails
      .find({ senderId: req.user!.id, deletedBySender: { $ne: true } })
      .sort({ sentAt: -1 })
      .limit(80)
      .toArray();
    res.json({ ok: true, mails: mails.map(toPublicMail) });
  });
  app.post("/api/mail/send", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "mail:send", 8, 60_000)) return;
    const parsed = SendMailSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Thư không hợp lệ" });
    const { players, playerMails } = await collections();
    const senderId = req.user!.id;
    const existing = await playerMails.findOne({
      senderId,
      requestId: parsed.data.requestId,
    });
    if (existing)
      return res.json({
        ok: true,
        mail: toPublicMail(existing),
        duplicate: true,
      });
    const [sender, recipient] = await Promise.all([
      players.findOne({ _id: senderId }),
      players.findOne({
        $or: [
          { _id: parsed.data.recipientId },
          { name: parsed.data.recipientId },
        ],
      }),
    ]);
    if (!recipient)
      return res
        .status(404)
        .json({
          error: "recipient_not_found",
          message: "Không tìm thấy người nhận",
        });
    if (recipient._id === senderId)
      return res
        .status(400)
        .json({ error: "self_mail", message: "Không thể tự gửi thư cho mình" });
    const sentAt = new Date();
    const mailDoc = {
      _id: `mail:${senderId}:${sentAt.getTime()}:${randomBytes(4).toString("hex")}`,
      senderId,
      senderName: sender?.name || senderId,
      recipientId: recipient._id,
      recipientName: recipient.name || recipient._id,
      title: parsed.data.title,
      body: parsed.data.body,
      requestId: parsed.data.requestId,
      sentAt,
      readAt: null,
    };
    await playerMails.insertOne(mailDoc);
    const unreadCount = await playerMails.countDocuments({
      recipientId: recipient._id,
      readAt: null,
    });
    const version = sentAt.getTime();
    publishRealtime(
      {
        type: "mail_received",
        mail: toPublicMail(mailDoc),
        unreadCount,
        version,
        serverTime: sentAt.toISOString(),
      },
      `player:${recipient._id}`,
    );
    res.json({ ok: true, mail: toPublicMail(mailDoc) });
  });
  app.post("/api/mail/:id/read", requireAuth, async (req, res) => {
    const { playerMails } = await collections();
    const playerId = req.user!.id;
    const readAt = new Date();
    const mailId = String(req.params.id);
    const result = await playerMails.updateOne(
      { _id: mailId, recipientId: playerId },
      { $set: { readAt } },
    );
    if (!result.matchedCount)
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy thư" });
    const unreadCount = await playerMails.countDocuments({
      recipientId: playerId,
      readAt: null,
    });
    const version = readAt.getTime();
    publishRealtime(
      {
        type: "mail_read",
        mailId,
        unreadCount,
        version,
        serverTime: readAt.toISOString(),
      },
      `player:${playerId}`,
    );
    res.json({ ok: true, unreadCount, readAt: readAt.toISOString() });
  });
  app.delete("/api/mail/:id", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "mail:delete", 30, 60_000)) return;
    const { playerMails } = await collections();
    const playerId = req.user!.id;
    const mailId = String(req.params.id);
    const mail = await playerMails.findOne({ _id: mailId });
    if (!mail || (mail.recipientId !== playerId && mail.senderId !== playerId))
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy thư" });
    const update: Record<string, boolean> = {};
    if (mail.recipientId === playerId) update.deletedByRecipient = true;
    if (mail.senderId === playerId) update.deletedBySender = true;
    await playerMails.updateOne({ _id: mailId }, { $set: update });
    if (update.deletedByRecipient) {
      const unreadCount = await playerMails.countDocuments({
        recipientId: playerId,
        readAt: null,
        deletedByRecipient: { $ne: true },
      });
      publishRealtime(
        {
          type: "mail_read",
          mailId,
          unreadCount,
          version: Date.now(),
          serverTime: new Date().toISOString(),
        },
        `player:${playerId}`,
      );
    }
    res.json({ ok: true });
  });
  app.post("/api/mail/clear", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "mail:clear", 6, 60_000)) return;
    const folder = req.body?.folder === "sent" ? "sent" : "inbox";
    const { playerMails } = await collections();
    const playerId = req.user!.id;
    if (folder === "sent") {
      await playerMails.updateMany(
        { senderId: playerId, deletedBySender: { $ne: true } },
        { $set: { deletedBySender: true } },
      );
      return res.json({ ok: true, folder });
    }
    await playerMails.updateMany(
      { recipientId: playerId, deletedByRecipient: { $ne: true } },
      { $set: { deletedByRecipient: true } },
    );
    publishRealtime(
      {
        type: "mail_read",
        unreadCount: 0,
        version: Date.now(),
        serverTime: new Date().toISOString(),
      },
      `player:${playerId}`,
    );
    res.json({ ok: true, folder, unreadCount: 0 });
  });
  app.post("/api/player/profile", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "profile:update", 12, 60_000)) return;
    const parsed = z
      .object({
        flagColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        // Keep this list aligned with the kingdom-creation modal. The default
        // newbie emblem is `crown`; rejecting it prevented the clearing request
        // from ever being sent.
        emblem: z
          .enum([
            "crown",
            "swords",
            "shield",
            "eagle",
            "lion",
            "dragon",
            "tree",
            "mountain",
            "anchor",
            "star",
            "tower",
            "flame",
            "feather",
            "spear",
          ])
          .optional(),
        cityName: z.string().max(60).optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Màu cờ hoặc biểu tượng không hợp lệ",
        });
    }
    const { flagColor, emblem, cityName } = parsed.data;
    const { players } = await collections();
    const updateData: any = {};
    if (flagColor) updateData.flagColor = flagColor;
    if (emblem) updateData.emblem = emblem;
    if (cityName) updateData.cityName = cityName;
    if (Object.keys(updateData).length > 0 && req.user?.id) {
      await players.updateOne({ _id: req.user!.id }, { $set: updateData });
    }
    await bumpWorldCacheVersion();
    if (req.user?.id) {
      await publishPlayerState(req.user!.id, "profile_updated", null, null);
    }
    res.json({ ok: true });
  });
  app.post("/api/player/active-map", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "player:active-map", 30, 60_000)) return;
    const parsed = ActiveMapSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Bản đồ không hợp lệ" });
    const { players } = await collections();
    await players.updateOne(
      { _id: req.user!.id },
      { $set: { activeMap: parsed.data.activeMap, lastSeenAt: new Date() } },
      { upsert: true },
    );
    res.json({ ok: true, activeMap: parsed.data.activeMap });
  });
  app.get(
    "/api/world/territories",
    requireAuth,
    territoryReadLimiter,
    async (_req, res) => {
      const payload = await cachedWorldTerritoriesPayload();
      res.setHeader("X-World-Cache", "enabled");
      res.json(payload);
    },
  );
  app.get(
    "/api/game/state",
    requireAuth,
    stateReadLimiter,
    async (_req, res) => {
      const payload = await buildGameStatePayload(_req.user!.id);
      res.setHeader("X-World-Cache", "partial");
      res.json(payload);
    },
  );
  app.get(
    "/api/player/sync",
    requireAuth,
    stateReadLimiter,
    async (req, res) => {
      const playerId = req.user!.id;
      const gameState = await buildGameStatePayload(playerId);
      const { battleReports, playerMails, players } = await collections();
      const [
        reports,
        inbox,
        sent,
        reportUnreadCount,
        mailUnreadCount,
        player,
        gameConfig,
      ] = await Promise.all([
        battleReports
          .find({ $or: [{ attackerId: playerId }, { defenderId: playerId }] })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
        playerMails
          .find({ recipientId: playerId })
          .sort({ sentAt: -1 })
          .limit(80)
          .toArray(),
        playerMails
          .find({ senderId: playerId })
          .sort({ sentAt: -1 })
          .limit(80)
          .toArray(),
        battleReports.countDocuments({
          $or: [{ attackerId: playerId }, { defenderId: playerId }],
          readBy: { $ne: playerId },
        }),
        playerMails.countDocuments({ recipientId: playerId, readAt: null }),
        players.findOne({ _id: playerId }),
        loadGameConfig(),
      ]);
      const version = Date.now();
      const payload = {
        ok: true,
        gameState,
        nationState: gameState.nationStatus,
        armyState: buildArmyState(playerId, gameState, version),
        reportUnreadCount,
        mailUnreadCount,
        reports: reports.map((report) => toPublicReport(report, playerId)),
        inbox: inbox.map(toPublicMail),
        sent: sent.map(toPublicMail),
        shopCatalog: shopCatalog(gameConfig, player ?? undefined),
        shopInventory: normalizeShopInventory(player?.shopInventory, player ?? undefined),
        version,
        serverTime: new Date(version).toISOString(),
      };
      res.json(payload);
    },
  );
  app.get(
    "/api/nation/state",
    requireAuth,
    stateReadLimiter,
    async (req, res) => {
      const gameState = await buildGameStatePayload(req.user!.id);
      res.json({
        ok: true,
        state: gameState.nationStatus,
        version: Date.now(),
        serverTime: gameState.serverTime,
      });
    },
  );
  app.get(
    "/api/army/state",
    requireAuth,
    stateReadLimiter,
    async (req, res) => {
      const version = Date.now();
      const gameState = await buildGameStatePayload(req.user!.id);
      res.json({
        ok: true,
        state: buildArmyState(req.user!.id, gameState, version),
        version,
        serverTime: new Date(version).toISOString(),
      });
    },
  );
  app.get("/api/leaderboard/military", requireAuth, async (req, res) => {
    try {
      const { saves, players, marchOrders } = await collections();
      const [allSaves, allPlayers, allMarches] = await Promise.all([
        saves.find({}).toArray(),
        players.find({}).toArray(),
        marchOrders.find({}).toArray(),
      ]);
      const playerMap = new Map(allPlayers.map((p) => [p._id, p]));
      const marchTroopsMap = new Map();
      allMarches.forEach((march) => {
        const ownerId = march.ownerId;
        if (ownerId) {
          const current = marchTroopsMap.get(ownerId) || 0;
          marchTroopsMap.set(ownerId, current + (Number(march.troops) || 0));
        }
      });
      const leaderboardData = allSaves
        .map((save) => {
          const playerId = save.playerId;
          const player = playerMap.get(playerId) as any;
          if (!player) return null;
          const towns = Array.isArray(save.towns) ? save.towns : [];
          const garrisonTroops = towns.reduce(
            (sum, town) => sum + (Number(town.troops) || 0),
            0,
          );
          const outboundTroops = marchTroopsMap.get(playerId) || 0;
          const totalTroops = garrisonTroops + outboundTroops;
          return {
            playerId,
            name: String(player.name || player.username || playerId),
            flagColor: player.flagColor ?? "#ef4444",
            emblem: player.emblem ?? "shield",
            townCount: towns.length,
            totalTroops,
          };
        })
        .filter(Boolean);
      leaderboardData.sort((a: any, b: any) => b.totalTroops - a.totalTroops);
      const top100 = leaderboardData.slice(0, 100).map((entry: any, index) => ({
        rank: index + 1,
        ...entry,
      }));
      res.json({ ok: true, leaderboard: top100 });
    } catch (err: any) {
      console.error("Leaderboard error:", err);
      res
        .status(500)
        .json({
          error: "internal_server_error",
          message: "Lỗi tải bảng xếp hạng",
        });
    }
  });
  app.get("/api/shop/catalog", requireAuth, async (_req, res) => {
    res.json({
      ok: true,
      products: shopCatalog(await loadGameConfig()),
      testMode: config.SHOP_TEST_MODE && config.NODE_ENV !== "production",
    });
  });
  app.get("/api/shop/inventory", requireAuth, async (req, res) => {
    const { players } = await collections();
    const player = await players.findOne({ _id: req.user!.id });
    res.json({
      ok: true,
      inventory: normalizeShopInventory(player?.shopInventory),
    });
  });
  app.get("/api/shop/history", requireAuth, async (req, res) => {
    const { shopPurchases } = await collections();
    const purchases = await shopPurchases
      .find({ playerId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(80)
      .toArray();
    res.json({
      ok: true,
      purchases: purchases.map((purchase) => ({
        id: purchase._id,
        productId: purchase.productId,
        priceGems: purchase.priceGems,
        grantedResources: purchase.grantedResources,
        grantedSkinId: purchase.grantedSkinId,
        createdAt: purchase.createdAt.toISOString(),
      })),
    });
  });
  app.post("/api/shop/purchase", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "shop:purchase", 20, 60_000)) return;
    const parsed = ShopPurchaseSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Yêu cầu mua không hợp lệ" });
    const playerId = req.user!.id;
    const release = await acquirePlayerMutationLock(playerId);
    try {
      const { players, saves, shopPurchases } = await collections();
      const existing = await shopPurchases.findOne({
        playerId,
        requestId: parsed.data.requestId,
      });
      if (existing) {
        const player = await players.findOne({ _id: playerId });
        const currentInventory = normalizeShopInventory(player?.shopInventory);
        const needsEquipRepair = Boolean(
          existing.grantedSkinId &&
          parsed.data.equipTarget &&
          (parsed.data.equipTarget === "capital"
            ? currentInventory.equippedCapitalSkin !== existing.grantedSkinId
            : currentInventory.equippedDistrictSkin !== existing.grantedSkinId),
        );
        const repairedInventory: any = needsEquipRepair
          ? normalizeShopInventory({
              ...currentInventory,
              equippedCapitalSkin:
                parsed.data.equipTarget === "capital"
                  ? existing.grantedSkinId
                  : currentInventory.equippedCapitalSkin,
              equippedDistrictSkin:
                parsed.data.equipTarget === "military_district"
                  ? existing.grantedSkinId
                  : currentInventory.equippedDistrictSkin,
              version: currentInventory.version + 1,
            })
          : currentInventory;
        if (repairedInventory.version !== currentInventory.version) {
          await players.updateOne(
            { _id: playerId },
            { $set: { shopInventory: repairedInventory } },
          );
        }
        return res.json({
          ok: true,
          duplicate: true,
          purchase: {
            id: existing._id,
            productId: existing.productId,
            priceGems: existing.priceGems,
            grantedResources: existing.grantedResources,
            grantedSkinId: existing.grantedSkinId,
            createdAt: existing.createdAt.toISOString(),
          },
          inventory: repairedInventory,
          resources: normalizeResources(player?.resources),
        });
      }
      const gameConfig = await loadGameConfig();
      const product = shopCatalog(gameConfig).find(
        (item) => item.id === parsed.data.productId,
      );
      if (!product)
        return res
          .status(404)
          .json({
            error: "product_not_found",
            message: "Sản phẩm không tồn tại",
          });
      const productResources = "resources" in product ? product.resources : undefined;
      const productSkinId = "skinId" in product ? product.skinId : undefined;
      const resourceState = await collectPlayerResources(playerId);
      const player = await players.findOne({ _id: playerId });
      const currentResources = normalizeResources(resourceState.resources);
      if (currentResources.gems < product.priceGems) {
        return res
          .status(400)
          .json({
            error: "insufficient_gems",
            message: "Không đủ ngọc để mua",
          });
      }
      const inventory = normalizeShopInventory(player?.shopInventory);
      if (productSkinId && inventory.ownedSkins.includes(productSkinId)) {
        return res
          .status(409)
          .json({
            error: "already_owned",
            message: "Bạn đã sở hữu ngoại trang này",
          });
      }
      const nextResources = { ...currentResources };
      if (productResources) {
        for (const key of RESOURCE_KEYS) {
          const grant = Math.max(
            0,
            Math.floor(Number(productResources[key]) || 0),
          );
          if (
            grant > 0 &&
            nextResources[key] + grant > resourceState.resourceCapacity[key]
          ) {
            return res.status(409).json({
              error: "storage_full",
              message: `Kho ${key} không đủ chỗ, cần trống thêm ${Math.max(0, nextResources[key] + grant - resourceState.resourceCapacity[key])}`,
            });
          }
        }
        RESOURCE_KEYS.forEach((key) => {
          nextResources[key] += Math.max(
            0,
            Math.floor(Number(productResources[key]) || 0),
          );
        });
      }
      nextResources.gems -= product.priceGems;
      const nextInventory: any = normalizeShopInventory({
        ...inventory,
        ownedSkins: productSkinId
          ? [...(inventory.ownedSkins as any[]), productSkinId]
          : inventory.ownedSkins,
        equippedCapitalSkin:
          productSkinId && parsed.data.equipTarget === "capital"
            ? productSkinId
            : inventory.equippedCapitalSkin,
        equippedDistrictSkin:
          productSkinId && parsed.data.equipTarget === "military_district"
            ? productSkinId
            : inventory.equippedDistrictSkin,
        version: inventory.version + 1,
      } as any);
      const createdAt = new Date();
      const purchaseDoc = {
        _id: `purchase:${playerId}:${createdAt.getTime()}:${randomBytes(4).toString("hex")}`,
        playerId,
        productId: product.id,
        requestId: parsed.data.requestId,
        priceGems: product.priceGems,
        grantedResources: productResources,
        grantedSkinId: productSkinId,
        createdAt,
      };
      await players.updateOne(
        { _id: playerId },
        {
          $set: {
            resources: nextResources,
            shopInventory: nextInventory,
            lastResourceCollectedAt: createdAt,
            lastSeenAt: createdAt,
          },
        },
      );
      await saves.updateOne(
        { playerId },
        { $set: { resources: nextResources, updatedAt: createdAt } },
      );
      await shopPurchases.insertOne(purchaseDoc);
      const purchase = {
        id: purchaseDoc._id,
        productId: product.id,
        priceGems: product.priceGems,
        grantedResources: productResources,
        grantedSkinId: productSkinId,
        createdAt: createdAt.toISOString(),
      };
      const version = createdAt.getTime();
      publishRealtime(
        {
          type: "shop_purchase_completed",
          purchase,
          inventory: nextInventory,
          resources: nextResources,
          version,
          serverTime: createdAt.toISOString(),
        },
        `player:${playerId}`,
      );
      res.json({
        ok: true,
        purchase,
        inventory: nextInventory,
        resources: nextResources,
      });
      void publishPlayerState(
        playerId,
        "shop_purchase",
        nextResources,
        null,
      ).catch((error) => {
        console.error("Could not publish shop purchase state:", error);
      });
    } finally {
      release();
    }
  });
  app.post("/api/shop/equip", requireAuth, async (req, res) => {
    const parsed = ShopEquipSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Ngoại trang không hợp lệ" });
    const playerId = req.user!.id;
    const release = await acquirePlayerMutationLock(playerId);
    try {
      const { players } = await collections();
      const player = await players.findOne({ _id: playerId });
      const inventory = normalizeShopInventory(player?.shopInventory);
      if (!inventory.ownedSkins.includes(parsed.data.skinId)) {
        return res
          .status(403)
          .json({
            error: "not_owned",
            message: "Bạn chưa sở hữu ngoại trang này",
          });
      }
      const nextInventory: any = {
        ...inventory,
        equippedCapitalSkin:
          parsed.data.target === "capital"
            ? parsed.data.skinId
            : inventory.equippedCapitalSkin,
        equippedDistrictSkin:
          parsed.data.target === "military_district"
            ? parsed.data.skinId
            : inventory.equippedDistrictSkin,
        version: inventory.version + 1,
      };
      await players.updateOne(
        { _id: playerId },
        { $set: { shopInventory: nextInventory } },
      );
      const version = Date.now();
      publishRealtime(
        {
          type: "shop_inventory_updated",
          inventory: nextInventory,
          version,
          serverTime: new Date(version).toISOString(),
        },
        `player:${playerId}`,
      );
      res.json({ ok: true, inventory: nextInventory });
    } finally {
      release();
    }
  });
  app.get("/api/alliance/me", requireAuth, async (req, res) => {
    res.json(await buildAllianceState(req.user!.id));
  });
  app.post("/api/alliance/create", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:create", 4, 60_000)) return;
    const parsed = CreateAllianceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Tên liên minh hoặc TAG không hợp lệ",
        });
    }
    const { alliances, players } = await collections();
    const existingMembership = await alliances.findOne({
      memberIds: req.user!.id,
    });
    if (existingMembership) {
      return res
        .status(409)
        .json({
          error: "already_in_alliance",
          message: "Bạn đã ở trong một liên minh",
        });
    }
    const resourceState = await collectPlayerResources(req.user!.id);
    if (resourceState.resources.gems < ALLIANCE_CREATE_GEMS_COST) {
      return res
        .status(409)
        .json({
          error: "not_enough_gems",
          message: `Cần ${ALLIANCE_CREATE_GEMS_COST} kim cương để lập liên minh`,
        });
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
        {
          $set: {
            resources: {
              ...resourceState.resources,
              gems: resourceState.resources.gems - ALLIANCE_CREATE_GEMS_COST,
            },
          },
        },
      );
    } catch (err) {
      if (err?.code === 11000) {
        return res
          .status(409)
          .json({ error: "tag_taken", message: "TAG liên minh đã tồn tại" });
      }
      throw err;
    }
    await bumpWorldCacheVersion();
    const alliance = await alliances.findOne({ _id: id });
    const payload = {
      ok: true,
      alliance: alliance ? await toPublicAlliance(alliance) : null,
    };
    res.json(payload);
  });
  app.post("/api/alliance/join", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:join", 10, 60_000)) return;
    const parsed = JoinAllianceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "ID liên minh không hợp lệ" });
    }
    const { alliances } = await collections();
    const existingMembership = await alliances.findOne({
      memberIds: req.user!.id,
    });
    if (existingMembership) {
      return res
        .status(409)
        .json({
          error: "already_in_alliance",
          message: "Bạn đã ở trong một liên minh",
        });
    }
    const alliance = await alliances.findOne({ _id: parsed.data.allianceId });
    if (!alliance) {
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy liên minh" });
    }
    if (alliance.memberIds.length >= ALLIANCE_MAX_MEMBERS) {
      return res
        .status(409)
        .json({
          error: "alliance_full",
          message: "Liên minh đã đủ thành viên",
        });
    }
    await alliances.updateOne(
      { _id: alliance._id },
      {
        $addToSet: { memberIds: req.user!.id },
        $set: { updatedAt: new Date() },
      },
    );
    await bumpWorldCacheVersion();
    const updated = await alliances.findOne({ _id: alliance._id });
    const payload = {
      ok: true,
      alliance: updated ? await toPublicAlliance(updated) : null,
    };
    res.json(payload);
  });
  app.post("/api/alliance/leave", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:leave", 8, 60_000)) return;
    const { alliances } = await collections();
    const alliance = await alliances.findOne({ memberIds: req.user!.id });
    if (!alliance) {
      const payload = { ok: true, alliance: null };
      return res.json(payload);
    }
    if (alliance.leaderId === req.user!.id && alliance.memberIds.length > 1) {
      return res
        .status(409)
        .json({
          error: "leader_cannot_leave",
          message: "Minh chủ cần chuyển quyền trước khi rời liên minh",
        });
    }
    if (alliance.leaderId === req.user!.id) {
      await alliances.deleteOne({ _id: alliance._id });
      await bumpWorldCacheVersion();
      const payload = { ok: true, alliance: null };
      return res.json(payload);
    }
    await alliances.updateOne(
      { _id: alliance._id },
      { $pull: { memberIds: req.user!.id }, $set: { updatedAt: new Date() } },
    );
    await bumpWorldCacheVersion();
    const payload = { ok: true, alliance: null };
    res.json(payload);
  });
  app.post("/api/alliance/aid", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:aid", 20, 60_000)) return;
    const parsed = SendAllianceAidSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Dữ liệu viện trợ không hợp lệ",
        });
    }
    if (parsed.data.toPlayerId === req.user!.id) {
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Không thể tự viện trợ cho chính mình",
        });
    }
    const { alliances, players, allianceAids } = await collections();
    const alliance = await alliances.findOne({ memberIds: req.user!.id });
    if (!alliance || !alliance.memberIds.includes(parsed.data.toPlayerId)) {
      return res
        .status(403)
        .json({
          error: "not_alliance_member",
          message: "Người nhận không cùng liên minh",
        });
    }
    const targetPlayer = await players.findOne({ _id: parsed.data.toPlayerId });
    if (!targetPlayer) {
      return res
        .status(404)
        .json({
          error: "not_found",
          message: "Không tìm thấy thành viên nhận viện trợ",
        });
    }
    const resources = compactResourceDelta(parsed.data.resources);
    const troops = Math.min(
      ALLIANCE_AID_MAX_TROOPS,
      Math.floor(parsed.data.troops || 0),
    );
    const resourceTotal = RESOURCE_KEYS.reduce(
      (sum, key) => sum + (resources[key] || 0),
      0,
    );
    if (resourceTotal <= 0 && troops <= 0) {
      return res
        .status(400)
        .json({
          error: "empty_aid",
          message: "Cần chọn tài nguyên hoặc lính để viện trợ",
        });
    }
    const troopLogistics = {
      gold: troops,
      food: troops * 2,
    };
    const senderState = await collectPlayerResources(req.user!.id);
    const nextSender = { ...senderState.resources };
    for (const key of RESOURCE_KEYS) {
      const amount =
        Math.floor(resources[key] || 0) +
        (key === "gold" ? troopLogistics.gold : 0) +
        (key === "food" ? troopLogistics.food : 0);
      if (amount > nextSender[key]) {
        return res
          .status(409)
          .json({
            error: "not_enough_resources",
            message: `Không đủ ${key} để gửi viện trợ`,
          });
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
      status: "pending",
      createdAt: now,
    };
    await players.updateOne(
      { _id: req.user!.id },
      { $set: { resources: nextSender, lastSeenAt: now } },
    );
    await allianceAids.insertOne(aid as any);
    res.json(await buildAllianceState(req.user!.id));
  });
  app.post("/api/alliance/aid/:id/claim", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "alliance:aid:claim", 30, 60_000)) return;
    const { players, allianceAids, territoryClaims } = await collections();
    const aid = await allianceAids.findOne({
      _id: req.params.id,
      toPlayerId: req.user!.id,
      status: "pending",
    });
    if (!aid) {
      return res
        .status(404)
        .json({
          error: "not_found",
          message: "Không tìm thấy viện trợ đang chờ nhận",
        });
    }
    const resourceState = await collectPlayerResources(req.user!.id);
    const ownedCount = await territoryClaims.countDocuments({
      playerId: req.user!.id,
    });
    const capacity = resourceCapacityForOwnedTerritories(ownedCount);
    const nextResources = { ...resourceState.resources };
    RESOURCE_KEYS.forEach((key) => {
      nextResources[key] = Math.min(
        capacity[key],
        nextResources[key] + Math.floor(aid.resources[key] || 0),
      );
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
    if (!enforceActionLimit(req, res, "game:clearing:start", 20, 60_000))
      return;
    const parsed = StartClearingSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "ID lãnh thổ không hợp lệ" });
    const territory = getStaticTerritory(parsed.data.territoryId);
    if (!territory)
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    return withPlayerMutationLock(req.user!.id, async () => {
      const { players, territoryClaims, territoryClearings, alliances, saves } =
        await collections();
      const claim = await territoryClaims.findOne({
        territoryId: territory.id,
      });
      if (claim && claim.playerId !== req.user!.id) {
        return res
          .status(409)
          .json({
            error: "territory_taken",
            message: "Lãnh thổ này đã có người chiếm",
          });
      }
      if (claim && claim.playerId === req.user!.id) {
        return res
          .status(409)
          .json({
            error: "already_owned",
            message:
              "Bạn đã sở hữu lãnh thổ này, hãy chọn vùng đất hoang khác để xây thành",
          });
      }
      const existing = await territoryClearings.findOne({
        territoryId: territory.id,
      });
      if (existing && existing.playerId !== req.user!.id) {
        return res
          .status(409)
          .json({
            error: "already_clearing",
            message: "Đã có người khác đang xây thành trên lãnh thổ này",
          });
      }
      const activeByPlayer = await territoryClearings.findOne({
        playerId: req.user!.id,
      });
      if (activeByPlayer && activeByPlayer.territoryId !== territory.id) {
        return res.status(409).json({
          error: "active_clearing_limit",
          message: "Bạn chỉ có 1 đội thợ xây thành cùng lúc",
          territoryId: activeByPlayer.territoryId,
        });
      }
      const now = new Date();
      const ownedCount = await territoryClaims.countDocuments({
        playerId: req.user!.id,
      });
      const isStarterClaim = ownedCount === 0;
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
      const nextResources = existing
        ? resourceState.resources
        : subtractCost(resourceState.resources, buildCost);
      const ownedClaimsList = await territoryClaims
        .find({ playerId: req.user!.id })
        .toArray();
      const save = await saves.findOne({ playerId: req.user!.id });
      const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
      let sourceTownId;
      let sourceTerritoryId;
      let sourceX;
      let sourceY;
      let connectionType;
      let settlers = 0;
      if (!isStarterClaim && !existing) {
        const source = nearestExpansionSource(ownedClaimsList, territory);
        if (!source) {
          return res
            .status(409)
            .json({
              error: "frontier_not_connected",
              message:
                "Pháo đài mới phải nối bằng đường bộ hoặc Hải Lộ từ lãnh địa của bạn",
            });
        }
        sourceTerritoryId = source.territory.id;
        sourceTownId = townIdForTerritory(source.territory.id);
        sourceX = source.territory.x;
        sourceY = source.territory.y;
        connectionType = source.connectionType;
        settlers = 10;
        const sourceTownIndex = towns.findIndex(
          (town) =>
            town?.id === sourceTownId ||
            Math.hypot((town?.x ?? 0) - sourceX, (town?.y ?? 0) - sourceY) < 96,
        );
        const sourceTown = normalizeTownSnapshotForState(
          sourceTownIndex >= 0
            ? towns[sourceTownIndex]
            : defaultTownSnapshotForTerritory(
                source.territory,
                req.user!.id,
                sourceTownId,
              ),
          req.user!.id,
          source.territory,
          now,
        );
        if (sourceTown.population < settlers) {
          return res.status(409).json({
            error: "not_enough_population",
            message: `Pháo đài biên giới cần ${settlers} dân khả dụng để cử đội xây dựng`,
            town: sourceTown,
          });
        }
        sourceTown.population = Math.max(0, sourceTown.population - settlers);
        sourceTown.lastPopulationAt = now.toISOString();
        if (sourceTownIndex >= 0) towns[sourceTownIndex] = sourceTown;
        else towns.push(sourceTown);
      }
      const gameSettings = await loadGameConfig();
      const clearingSeconds = calcClearingSeconds(
        territory.rx,
        territory.ry,
        territory.biome,
        gameSettings.settlerSpeed,
        gameSettings.gameHourSeconds,
      );
      // Construction crews travel from the server-selected frontier stronghold.
      let originX =
        territory.x - Math.min(120, Math.max(45, territory.rx * 0.42));
      let originY =
        territory.y + Math.min(70, Math.max(24, territory.ry * 0.18));
      if (sourceTerritoryId !== undefined) {
        originX = sourceX;
        originY = sourceY;
      } else if (ownedClaimsList.length > 0) {
        const candidates = ownedClaimsList
          .map((c) => {
            const t = getStaticTerritory(c.territoryId);
            const dist = t
              ? Math.hypot(t.x - territory.x, t.y - territory.y)
              : Infinity;
            const isPort = Boolean(
              t &&
              (t.isIslet || t.specialResources?.includes("Bến tàu tự nhiên")),
            );
            return { t, dist, isPort };
          })
          .filter((item) => item.t !== undefined);
        if (territory.isIslet || candidates.some((c) => c.isPort)) {
          const portCandidates = candidates.filter((c) => c.isPort);
          if (portCandidates.length > 0) {
            portCandidates.sort((a, b) => a.dist - b.dist);
            originX = portCandidates[0].t.x;
            originY = portCandidates[0].t.y;
          } else {
            candidates.sort((a, b) => a.dist - b.dist);
            originX = candidates[0].t.x;
            originY = candidates[0].t.y;
          }
        } else if (candidates.length > 0) {
          candidates.sort((a, b) => a.dist - b.dist);
          originX = candidates[0].t.x;
          originY = candidates[0].t.y;
        }
      }
      const distanceKm =
        Math.hypot(originX - territory.x, originY - territory.y) *
        MAP_UNITS_TO_KM;
      const travelSeconds = Math.max(
        15,
        Math.round(
          (distanceKm / Math.max(1, gameSettings.settlerSpeed || 35)) *
            (gameSettings.gameHourSeconds || 30),
        ),
      );
      const arrivesAt = new Date(now.getTime() + travelSeconds * 1000);
      const completesAt = new Date(
        arrivesAt.getTime() + clearingSeconds * 1000,
      );
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
        settlers,
        connectionType,
        startedAt: now,
        arrivesAt,
        completesAt,
      };
      if (!existing) {
        try {
          await territoryClearings.insertOne(clearing);
        } catch (err) {
          if (err?.code === 11000) {
            const locked = await territoryClearings.findOne({
              territoryId: territory.id,
            });
            if (locked?.playerId === req.user!.id) {
              const payload = { ok: true, clearing: toPublicClearing(locked) };
              return res.json(payload);
            }
            return res
              .status(409)
              .json({
                error: "already_clearing",
                message: "Đã có người khác đang xây thành trên lãnh thổ này",
              });
          }
          throw err;
        }
        await Promise.all([
          saves.updateOne(
            { playerId: req.user!.id },
            {
              $set: { towns, updatedAt: now },
              $setOnInsert: {
                _id: `save:${req.user!.id}`,
                playerId: req.user!.id,
                resources: DEFAULT_PLAYER_RESOURCES,
              },
            },
            { upsert: true },
          ),
          players.updateOne(
            { _id: req.user!.id },
            {
              $set: {
                onboardingState: "claiming",
                lastSeenAt: now,
                resources: nextResources,
              },
            },
          ),
        ]);
      }
      const payload = { ok: true, clearing: toPublicClearing(clearing) };
      publishRealtime({
        type: "territory_clearing_started",
        clearing: payload.clearing,
      });
      res.json(payload);
      if (!existing) {
        void publishPlayerState(
          req.user!.id,
          "clearing_started",
          nextResources,
          towns,
        ).catch((error) => {
          console.error("Could not publish clearing state:", error);
        });
      }
    });
  });
  app.post(
    "/api/game/clearings/:id/complete",
    requireAuth,
    async (req, res) => {
      if (!enforceActionLimit(req, res, "game:clearing:complete", 30, 60_000))
        return;
      const id = Number(req.params.id);
      const territory = Number.isInteger(id)
        ? getStaticTerritory(id)
        : undefined;
      if (!territory)
        return res
          .status(404)
          .json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
      const { players, territoryClaims, territoryClearings, alliances, saves } =
        await collections();
      const existingClaim = await territoryClaims.findOne({
        territoryId: territory.id,
      });
      if (existingClaim && existingClaim.playerId !== req.user!.id) {
        return res
          .status(409)
          .json({
            error: "territory_taken",
            message: "Lãnh thổ này đã có người chiếm",
          });
      }
      if (existingClaim && existingClaim.playerId === req.user!.id) {
        return res
          .status(409)
          .json({
            error: "already_owned",
            message: "Bạn đã sở hữu lãnh thổ này",
          });
      }
      const clearing = await territoryClearings.findOne({
        territoryId: territory.id,
        playerId: req.user!.id,
      });
      const now = new Date();
      if (!clearing) {
        return res
          .status(404)
          .json({
            error: "no_active_clearing",
            message:
              "Bạn cần bắt đầu xây thành và trả chi phí trước khi hoàn tất",
          });
      }
      if (await cancelBrokenRouteClearing(clearing, now)) {
        return res
          .status(409)
          .json({
            error: "clearing_route_lost",
            message:
              "Đường tiếp tế đã bị cắt. Đoàn dân làng và vật tư đã thất lạc.",
          });
      }
      if (clearing.completesAt.getTime() > now.getTime()) {
        return res
          .status(409)
          .json({
            error: "clearing_not_ready",
            message: "Xây thành chưa hoàn tất",
            readyAt: clearing.completesAt.toISOString(),
          });
      }
      const userClaims = await territoryClaims
        .find({ playerId: req.user!.id })
        .toArray();
      const hasSubCapital = userClaims.some(
        (c) => c.settlementKind === "sub_capital",
      );
      const isSubCapital =
        !clearing.isStarterClaim && userClaims.length >= 19 && !hasSubCapital;
      const computedSettlementKind = clearing.isStarterClaim
        ? "capital"
        : isSubCapital
          ? "sub_capital"
          : "military";
      await territoryClaims.updateOne(
        { territoryId: territory.id },
        {
          $setOnInsert: {
            _id: `territory:${territory.id}`,
            territoryId: territory.id,
            playerId: req.user!.id,
            claimedAt: now,
            settlementKind: computedSettlementKind,
            parentTerritoryId: clearing.isStarterClaim
              ? undefined
              : clearing.sourceTerritoryId,
            connectionType: clearing.connectionType,
          },
        },
        { upsert: true },
      );
      await territoryClearings.deleteOne({
        territoryId: territory.id,
        playerId: req.user!.id,
      });
      await players.updateOne(
        { _id: req.user!.id },
        { $set: { onboardingState: "settled", lastSeenAt: now } },
      );
      const resourceState = await collectPlayerResources(req.user!.id, now);
      const saveDoc = await saves.findOne({ playerId: req.user!.id });
      const towns = Array.isArray(saveDoc?.towns)
        ? removeTownForTerritory(saveDoc.towns, territory)
        : [];
      const town = normalizeTownSnapshotForState(
        defaultTownSnapshotForTerritory(territory, req.user!.id),
        req.user!.id,
        territory,
      );
      towns.push(town);
      await saves.updateOne(
        { playerId: req.user!.id },
        {
          $set: { towns, updatedAt: now },
          $setOnInsert: {
            _id: `save:${req.user!.id}`,
            playerId: req.user!.id,
            resources: DEFAULT_PLAYER_RESOURCES,
          },
        },
        { upsert: true },
      );
      const [player, alliance] = await Promise.all([
        players.findOne({ _id: req.user!.id }),
        alliances.findOne({ memberIds: req.user!.id }),
      ]);
      await bumpWorldCacheVersion();
      const payload = {
        ok: true,
        territory: {
          ...territory,
          ownerId: req.user!.id,
          ownerName: player?.name ?? req.user!.id,
          ownerFlagColor: player?.flagColor,
          ownerEmblem: player?.emblem,
          ownerAllianceTag: alliance?.tag,
          ownerAllianceEmblem: alliance?.emblem,
          settlementKind: computedSettlementKind,
          equippedCapitalSkin:
            player?.shopInventory?.equippedCapitalSkin ?? null,
          equippedDistrictSkin:
            player?.shopInventory?.equippedDistrictSkin ?? null,
        },
      };
      publishRealtime({
        type: "territory_claimed",
        territory: payload.territory,
      });
      await publishPlayerState(
        req.user!.id,
        "territory_claimed",
        resourceState.resources,
        towns,
      );
      res.json(payload);
    },
  );
  app.delete("/api/game/clearings/:id", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:clearing:cancel", 20, 60_000))
      return;
    const id = Number(req.params.id);
    const territory = Number.isInteger(id) ? getStaticTerritory(id) : undefined;
    if (!territory)
      return res
        .status(404)
        .json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings, saves } =
      await collections();
    const clearing = await territoryClearings.findOne({
      territoryId: territory.id,
      playerId: req.user!.id,
    });
    if (!clearing) {
      return res
        .status(404)
        .json({
          error: "not_found",
          message: "Không có lệnh xây thành đang chạy",
        });
    }
    const now = new Date();
    if (await cancelBrokenRouteClearing(clearing, now)) {
      return res.status(409).json({
        error: "clearing_route_lost",
        message:
          "Đường tiếp tế đã bị cắt. Đoàn dân làng và vật tư đã thất lạc.",
      });
    }
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const ownedCount = await territoryClaims.countDocuments({
      playerId: req.user!.id,
    });
    const capacity = resourceCapacityForOwnedTerritories(ownedCount);
    const refund = clearingBuildCostForRefund(clearing, territory, ownedCount);
    const nextResources = { ...resourceState.resources };
    RESOURCE_KEYS.forEach((key) => {
      nextResources[key] = Math.min(
        capacity[key],
        Math.floor(nextResources[key] + Math.floor(refund[key] || 0)),
      );
    });
    const save = await saves.findOne({ playerId: req.user!.id });
    const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
    if (
      (clearing.settlers || 0) > 0 &&
      clearing.sourceTerritoryId !== undefined
    ) {
      const sourceTerritory = getStaticTerritory(clearing.sourceTerritoryId);
      if (sourceTerritory) {
        const sourceTownIndex = towns.findIndex(
          (town) =>
            town?.id === clearing.sourceTownId ||
            Math.hypot(
              (town?.x ?? 0) - sourceTerritory.x,
              (town?.y ?? 0) - sourceTerritory.y,
            ) < 96,
        );
        if (sourceTownIndex >= 0) {
          const sourceTown = normalizeTownSnapshotForState(
            towns[sourceTownIndex],
            req.user!.id,
            sourceTerritory,
            now,
          );
          sourceTown.population = Math.min(
            sourceTown.populationCapacity,
            sourceTown.population + Math.max(0, clearing.settlers || 0),
          );
          sourceTown.lastPopulationAt = now.toISOString();
          towns[sourceTownIndex] = sourceTown;
        }
      }
    }
    await Promise.all([
      territoryClearings.deleteOne({
        territoryId: territory.id,
        playerId: req.user!.id,
      }),
      players.updateOne(
        { _id: req.user!.id },
        {
          $set: {
            resources: nextResources,
            onboardingState: "settled",
            lastSeenAt: now,
          },
        },
      ),
      saves.updateOne(
        { playerId: req.user!.id },
        {
          $set: { towns, updatedAt: now },
          $setOnInsert: {
            _id: `save:${req.user!.id}`,
            playerId: req.user!.id,
            resources: DEFAULT_PLAYER_RESOURCES,
          },
        },
        { upsert: true },
      ),
    ]);
    await bumpWorldCacheVersion();
    publishRealtime({
      type: "territory_clearing_cancelled",
      territoryId: territory.id,
      playerId: req.user!.id,
    });
    await publishPlayerState(
      req.user!.id,
      "clearing_cancelled",
      nextResources,
      towns,
    );
    res.json({ ok: true, resources: nextResources, refund });
  });
  app.post("/api/game/marches/sources", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:march-sources", 80, 60_000)) return;
    const parsed = MarchSourceOptionsSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          error: "bad_request",
          message: "Yêu cầu tìm thành xuất quân không hợp lệ",
        });
    const target = getStaticTerritory(parsed.data.toTerritoryId);
    if (!target)
      return res
        .status(404)
        .json({
          error: "not_found",
          message: "Không tìm thấy lãnh thổ mục tiêu",
        });
    const { territoryClaims, saves } = await collections();
    const [claims, save, gameSettings] = await Promise.all([
      territoryClaims.find({ playerId: req.user.id }).toArray(),
      saves.findOne({ playerId: req.user.id }),
      loadGameConfig(),
    ]);
    const towns = Array.isArray(save?.towns) ? save.towns : [];
    const sources = claims
      .map((claim) => {
        const territory = getStaticTerritory(claim.territoryId);
        if (!territory) return null;
        const town = normalizeTownSnapshotForState(
          findTownForTerritory(towns, territory) ||
            defaultTownSnapshotForTerritory(territory, req.user.id),
          req.user.id,
          territory,
        );
        const route = resolveAttackRoute(territory, target);
        const connected = isClaimConnectedToCapital(claims, territory.id);
        const infantry = Math.max(
          0,
          Math.floor(Number(town.infantryCount || 0) || 0),
        );
        const cavalry = Math.max(
          0,
          Math.floor(Number(town.cavalryCount || 0) || 0),
        );
        const artillery = Math.max(
          0,
          Math.floor(Number(town.artilleryCount || 0) || 0),
        );
        const troops = infantry + cavalry + artillery;
        const valid = connected && route.valid && troops > 0;
        const travel = calcTravelMetrics(
          territory,
          target,
          troops > 0
            ? { infantry, cavalry, artillery }
            : { infantry: 1, cavalry: 0, artillery: 0 },
          gameSettings,
          route.routeType === "sea",
        );
        return {
          townId: town.id,
          territoryId: territory.id,
          valid,
          routeType: route.routeType,
          usesShip: route.routeType === "sea",
          hasPort: territoryHasHarbor(territory),
          distanceKm: travel.distanceKm,
          travelSeconds: travel.travelSeconds,
          infantry,
          cavalry,
          artillery,
          troops,
          reason: !connected
            ? "Thành đã bị cô lập khỏi Hoàng Thành"
            : troops <= 0
              ? "Thành không còn quân sẵn sàng"
              : route.reason,
        };
      })
      .filter(Boolean);
    sources.sort(
      (a, b) =>
        Number(b.valid) - Number(a.valid) ||
        a.travelSeconds - b.travelSeconds ||
        b.troops - a.troops ||
        a.territoryId - b.territoryId,
    );
    res.json({
      ok: true,
      targetTerritoryId: target.id,
      recommendedTownId: sources.find((source) => source.valid)?.townId ?? null,
      sources,
    });
  });
  app.post("/api/game/marches", requireAuth, async (req, res) => {
    if (!enforceActionLimit(req, res, "game:march", 35, 60_000)) return;
    const parsed = CreateMarchSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "bad_request", message: "Lệnh hành quân không hợp lệ" });
    const from = getStaticTerritory(parsed.data.fromTerritoryId);
    const to = getStaticTerritory(parsed.data.toTerritoryId);
    if (!from || !to)
      return res
        .status(404)
        .json({
          error: "not_found",
          message: "Không tìm thấy lãnh thổ hành quân",
        });
    return withPlayerMutationLock(req.user!.id, async () => {
      const { territoryClaims, marchOrders, players, saves } =
        await collections();
      if (parsed.data.requestId) {
        const existingMarch = await marchOrders.findOne({
          ownerId: req.user!.id,
          requestId: parsed.data.requestId,
        });
        if (existingMarch) {
          return res.json({
            ok: true,
            duplicate: true,
            march: toPublicMarch(existingMarch),
          });
        }
      }
      const sourceClaim = await territoryClaims.findOne({
        territoryId: from.id,
      });
      if (!sourceClaim || sourceClaim.playerId !== req.user!.id) {
        return res
          .status(403)
          .json({
            error: "not_owner",
            message: "Bạn không sở hữu lãnh thổ xuất phát",
          });
      }
      const playerClaims = await territoryClaims
        .find({ playerId: req.user!.id })
        .toArray();
      if (!isClaimConnectedToCapital(playerClaims, from.id)) {
        return res
          .status(409)
          .json({
            error: "isolated_stronghold",
            message: "Pháo đài xuất phát đã bị cô lập khỏi Hoàng Thành",
          });
      }
      const gameSettings = await loadGameConfig();
      let forceSeaRoute = false;
      if (parsed.data.kind === "attack") {
        const route = resolveAttackRoute(from, to);
        if (!route.valid) {
          const error = route.reason?.includes("Bến tàu")
            ? "source_port_required"
            : route.reason?.includes("nội địa")
              ? "target_not_coastal"
              : "target_not_on_frontier";
          return res
            .status(409)
            .json({
              error,
              message: route.reason || "Không có tuyến tấn công hợp lệ",
            });
        }
        forceSeaRoute = route.routeType === "sea";
      }
      const activeMarchCount = await marchOrders.countDocuments({
        ownerId: req.user!.id,
      });
      if (activeMarchCount >= MAX_ACTIVE_MARCHES_PER_PLAYER) {
        return res.status(409).json({
          error: "active_march_limit",
          message: `Bạn chỉ được có tối đa ${MAX_ACTIVE_MARCHES_PER_PLAYER} đạo quân đang hành quân cùng lúc`,
        });
      }
      const now = new Date();
      // Check newbie protection shield on target
      const targetClaim = await territoryClaims.findOne({ territoryId: to.id });
      if (
        parsed.data.kind === "attack" &&
        targetClaim &&
        targetClaim.playerId !== req.user!.id
      ) {
        const targetPlayer = await players.findOne({
          _id: targetClaim.playerId,
        });
        // Newbie shield check disabled
        // if (targetPlayer?.newbieShieldUntil && new Date(targetPlayer.newbieShieldUntil).getTime() > now.getTime()) {
        //   return res.status(403).json({ error: "target_protected", message: "Thành trì đối thủ đang trong thời gian bảo vệ tân thủ" });
        // }
      }
      // Break attacker's own shield if attacking another player
      const attacker = await players.findOne({ _id: req.user!.id });
      let finalShieldUntil = attacker?.newbieShieldUntil;
      if (
        parsed.data.kind === "attack" &&
        targetClaim &&
        targetClaim.playerId !== req.user!.id
      ) {
        if (
          attacker?.newbieShieldUntil &&
          new Date(attacker.newbieShieldUntil).getTime() > now.getTime()
        ) {
          finalShieldUntil = new Date(0);
          await players.updateOne(
            { _id: req.user!.id },
            { $set: { newbieShieldUntil: finalShieldUntil } },
          );
        }
      }
      let infantry = Math.max(
        0,
        Math.floor(Number(parsed.data.infantry || 0) || 0),
      );
      let cavalry = Math.max(
        0,
        Math.floor(Number(parsed.data.cavalry || 0) || 0),
      );
      let artillery = Math.max(
        0,
        Math.floor(Number(parsed.data.artillery || 0) || 0),
      );
      if (infantry + cavalry + artillery <= 0 && parsed.data.troops > 0) {
        infantry = inferInfantryFromTroops(parsed.data.troops, gameSettings);
      }
      const unitCount = infantry + cavalry + artillery;
      const troops = unitCount > 0 ? unitCount : parsed.data.troops;
      const save = await saves.findOne({ playerId: req.user!.id });
      const towns = Array.isArray(save?.towns) ? [...save.towns] : [];
      const sourceTownIndex = towns.findIndex(
        (town) =>
          town?.id === townIdForTerritory(from.id) ||
          Math.hypot((town?.x ?? 0) - from.x, (town?.y ?? 0) - from.y) < 96,
      );
      const sourceTown = normalizeTownSnapshotForState(
        sourceTownIndex >= 0
          ? towns[sourceTownIndex]
          : defaultTownSnapshotForTerritory(from, req.user!.id),
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
      sourceTown.infantryCount = Math.max(
        0,
        sourceTown.infantryCount - infantry,
      );
      sourceTown.cavalryCount = Math.max(0, sourceTown.cavalryCount - cavalry);
      sourceTown.artilleryCount = Math.max(
        0,
        sourceTown.artilleryCount - artillery,
      );
      sourceTown.troops = Math.max(
        0,
        sourceTown.infantryCount +
          sourceTown.cavalryCount +
          sourceTown.artilleryCount,
      );
      if (sourceTownIndex >= 0) towns[sourceTownIndex] = sourceTown;
      else towns.push(sourceTown);
      const travel = calcTravelMetrics(
        from,
        to,
        {
          infantry,
          cavalry,
          artillery,
        },
        gameSettings,
        forceSeaRoute,
      );
      const order = {
        _id: `march:${req.user!.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        ownerId: req.user!.id,
        requestId: parsed.data.requestId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        troops,
        infantry,
        cavalry,
        artillery,
        distanceKm: travel.distanceKm,
        travelSeconds: travel.travelSeconds,
        usesShip: travel.usesShip,
        battleSide:
          parsed.data.kind === "reinforce"
            ? parsed.data.battleSide || "defender"
            : undefined,
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
            $setOnInsert: {
              _id: `save:${req.user!.id}`,
              playerId: req.user!.id,
              resources: DEFAULT_PLAYER_RESOURCES,
            },
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
      const payload = {
        ok: true,
        march: toPublicMarch(order),
        town: sourceTown,
        newbieShieldUntil: finalShieldUntil
          ? new Date(finalShieldUntil).toISOString()
          : null,
      };
      publishRealtime({
        type: "march_created",
        march: payload.march,
        sourceTown,
      });
      res.json(payload);
      void publishPlayerState(
        req.user!.id,
        "march_created",
        null,
        towns,
        payload.newbieShieldUntil,
      ).catch((error) => {
        console.error("Could not publish march state:", error);
      });
    });
  });
  app.post("/api/game/recruit", requireAuth, async (req, res) => {
    return res.status(410).json({
      error: "automatic_troop_recovery",
      message:
        "Mộ binh thủ công đã được thay bằng bổ sung quân tự động theo đặc sản lãnh thổ",
    });
    /* Legacy handler kept temporarily for save migration reference.
        if (!enforceActionLimit(req, res, "game:recruit", 45, 60_000)) return;
        const parsed = RecruitTroopsSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "bad_request", message: "Loại binh sĩ hoặc số lượng không hợp lệ" });
        }
    
        const duplicateResult = cachedRecruitResult(req.user!.id, parsed.data.requestId);
        if (duplicateResult) return res.json(duplicateResult);
        const releasePlayerLock = await acquirePlayerMutationLock(req.user!.id);
        try {
        const duplicateAfterLock = cachedRecruitResult(req.user!.id, parsed.data.requestId);
        if (duplicateAfterLock) return res.json(duplicateAfterLock);
    
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
          unitCost.coal = (gameConfig.artilleryCostCoal ?? 10) * count;
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
        const populationNeeded = (
          unitType === "infantry" ? gameConfig.infantryPopulationCost :
          unitType === "cavalry" ? gameConfig.cavalryPopulationCost :
          gameConfig.artilleryPopulationCost
        ) * count;
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
        town.population = Math.max(0, Math.floor((town.population - populationNeeded) * 100) / 100);
        town.lastPopulationAt = now.toISOString();
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
        const hydratedTowns = townSnapshotsForPlayer(towns, ownedTerritoriesForTowns, req.user!.id, nextResources, now);
        const hydratedTown = hydratedTowns.find((item: any) => item.id === townId) || town;
    
        await Promise.all([
          saves.updateOne(
            { playerId: req.user!.id },
            {
              $set: { resources: nextResources, towns: hydratedTowns, updatedAt: now },
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
    
        const result = {
          ok: true,
          townId,
          territoryId: territory.id,
          unitType,
          count,
          unitCountAdded: count,
          troopsAdded,
          populationSpent: populationNeeded,
          town: hydratedTown,
          resources: nextResources,
          resourceCapacity: resourceState.resourceCapacity,
          productionPerSecond: resourceState.productionPerSecond,
          resourceUpdatedAt: now.toISOString(),
          serverTime: now.toISOString(),
          message: `Chiêu mộ thành công ${count} đợt binh sĩ (${unitType})`,
        };
        rememberRecruitResult(req.user!.id, parsed.data.requestId, result);
        res.json(result);
        } finally {
          releasePlayerLock();
        }
        */
  });
  app.post(
    "/api/world/territories/:id/claim",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 0) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "ID lãnh thổ không hợp lệ" });
      }
      const staticTerritory = buildStaticTerritoryList().find(
        (territory: any) => territory.id === id,
      );
      if (!staticTerritory) {
        return res
          .status(404)
          .json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
      }
      const { players, territoryClaims, territoryClearings, alliances, saves } =
        await collections();
      const existing = await territoryClaims.findOne({ territoryId: id });
      if (existing && existing.playerId !== req.user!.id) {
        return res
          .status(409)
          .json({
            error: "territory_taken",
            message: "Lãnh thổ này đã có người chiếm",
          });
      }
      if (existing && existing.playerId === req.user!.id) {
        return res
          .status(409)
          .json({
            error: "already_owned",
            message: "Bạn đã sở hữu lãnh thổ này",
          });
      }
      const ownedCount = await territoryClaims.countDocuments({
        playerId: req.user!.id,
      });
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
        {
          $setOnInsert: {
            _id: `territory:${id}`,
            territoryId: id,
            playerId: req.user!.id,
            claimedAt: now,
            settlementKind: "capital",
          },
        },
        { upsert: true },
      );
      await territoryClearings.deleteMany({ territoryId: id });
      await players.updateOne(
        { _id: req.user!.id },
        { $set: { onboardingState: "settled", lastSeenAt: now } },
      );
      const resourceState = await collectPlayerResources(req.user!.id, now);
      const saveDoc = await saves.findOne({ playerId: req.user!.id });
      const towns = Array.isArray(saveDoc?.towns)
        ? removeTownForTerritory(saveDoc.towns, staticTerritory)
        : [];
      const town = normalizeTownSnapshotForState(
        defaultTownSnapshotForTerritory(staticTerritory, req.user!.id),
        req.user!.id,
        staticTerritory,
      );
      towns.push(town);
      await saves.updateOne(
        { playerId: req.user!.id },
        {
          $set: { towns, updatedAt: now },
          $setOnInsert: {
            _id: `save:${req.user!.id}`,
            playerId: req.user!.id,
            resources: DEFAULT_PLAYER_RESOURCES,
          },
        },
        { upsert: true },
      );
      const [player, alliance] = await Promise.all([
        players.findOne({ _id: req.user!.id }),
        alliances.findOne({ memberIds: req.user!.id }),
      ]);
      await bumpWorldCacheVersion();
      const payload = {
        ok: true,
        territory: {
          ...staticTerritory,
          ownerId: req.user!.id,
          ownerName: player?.name ?? req.user!.id,
          ownerFlagColor: player?.flagColor,
          ownerEmblem: player?.emblem,
          ownerAllianceTag: alliance?.tag,
          ownerAllianceEmblem: alliance?.emblem,
          settlementKind: "capital",
          equippedCapitalSkin:
            player?.shopInventory?.equippedCapitalSkin ?? null,
          equippedDistrictSkin:
            player?.shopInventory?.equippedDistrictSkin ?? null,
        },
      };
      publishRealtime({
        type: "territory_claimed",
        territory: payload.territory,
      });
      await publishPlayerState(
        req.user!.id,
        "starter_territory_claimed",
        resourceState.resources,
        towns,
      );
      res.json(payload);
    },
  );
  app.post(
    "/api/world/territories/:id/conquer",
    requireAuth,
    async (req, res) => {
      return res.status(410).json({
        error: "backend_battle_required",
        message:
          "Công thành phải đi qua lệnh hành quân và active battle trên server",
      });
    },
  );
  app.get("/api/save/me", requireAuth, async (req, res) => {
    const { saves } = await collections();
    const save = await saves.findOne({ playerId: req.user!.id });
    res.json(save ?? null);
  });
  app.put("/api/save/me", requireAuth, async (req, res) => {
    return res.status(410).json({
      error: "server_authoritative_state",
      message:
        "Save client đã tắt. Tài nguyên, thành trì và quân đội phải cập nhật qua API gameplay trên server.",
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
    artilleryCostCoal: z.number().nonnegative(),
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
    troopRecoveryEnabled: z.boolean(),
    troopRecoverySeconds: z.number().int().min(10).max(86400),
    troopRecoveryOfflineLimit: z.number().int().min(1).max(1000),
    capitalTroopCapacityMultiplier: z.number().min(1).max(10),
    strongholdTroopCapacityMultiplier: z.number().min(0.1).max(10),
    seaInvasionMaxDistanceKm: z.number().positive(),
    battleStateBroadcastSeconds: z.number().min(0.5).max(30),
    shopResourcePackAmount: z.number().int().positive(),
    shopResourcePackPriceGems: z.number().int().positive(),
    shopSkinLongBaoThanhPrice: z.number().int().positive(),
    shopSkinHoaLongDienPrice: z.number().int().positive(),
    shopSkinPhongLongCacPrice: z.number().int().positive(),
    powerConnectedTerritory: z.number().nonnegative(),
    powerIsolatedTerritory: z.number().nonnegative(),
    powerNaturalHarborBonus: z.number().nonnegative(),
    powerMilitaryResourceBonus: z.number().nonnegative(),
    powerCapitalBase: z.number().nonnegative(),
    powerMilitaryDistrictBase: z.number().nonnegative(),
    powerCapitalLevel: z.number().nonnegative(),
    powerMilitaryDistrictLevel: z.number().nonnegative(),
    powerFortLevel: z.number().nonnegative(),
    powerBarracksLevel: z.number().nonnegative(),
    powerSiegeWorkshopLevel: z.number().nonnegative(),
    powerWarehouseLevel: z.number().nonnegative(),
    powerResourceBuildingLevel: z.number().nonnegative(),
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
      return res
        .status(400)
        .json({ error: "bad_request", message: "Invalid config payload" });
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
  app.get(
    "/api/admin/overview",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      const { players, saves } = await collections();
      const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [playerCount, saveCount, activeToday] = await Promise.all([
        players.countDocuments(),
        saves.countDocuments(),
        players.countDocuments({ lastSeenAt: { $gte: today } }),
      ]);
      const payload = { players: playerCount, saves: saveCount, activeToday };
      res.json(payload);
    },
  );
  // ─── ADMIN: Player List ───────────────────────────────────────────────────
  app.get(
    "/api/admin/players",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      const { players } = await collections();
      const docs = await players
        .find({}, { sort: { createdAt: -1 }, limit: 500 })
        .toArray();
      const result = {
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
    },
  );
  // ─── ADMIN: View Player Save ──────────────────────────────────────────────
  app.get(
    "/api/admin/players/:id/save",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { saves } = await collections();
      const save = await saves.findOne({ playerId: req.params.id });
      res.json(save ?? null);
    },
  );
  // ─── ADMIN: Reset Player Save ─────────────────────────────────────────────
  app.delete(
    "/api/admin/players/:id/save",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { saves, activeBattles } = await collections();
      await Promise.all([
        saves.deleteOne({ playerId: req.params.id }),
        activeBattles.deleteMany({
          $or: [{ attackerId: req.params.id }, { defenderId: req.params.id }],
        }),
      ]);
      res.json({ ok: true, message: `Save của ${req.params.id} đã bị xóa.` });
    },
  );
  // ─── ADMIN: Delete Player Account ────────────────────────────────────────
  app.delete(
    "/api/admin/players/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { players, saves, activeBattles } = await collections();
      const pid = req.params.id;
      await Promise.all([
        players.deleteOne({ _id: pid }),
        saves.deleteOne({ playerId: pid }),
        activeBattles.deleteMany({
          $or: [{ attackerId: pid }, { defenderId: pid }],
        }),
      ]);
      res.json({ ok: true, message: `Tài khoản ${pid} đã bị xóa.` });
    },
  );
  // ─── ADMIN: Territory List ────────────────────────────────────────────────
  app.get(
    "/api/admin/territories",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      const { territoryClaims } = await collections();
      const claims = await territoryClaims.find({}).toArray();
      const ownerByTerritory = new Map(
        claims.map((claim) => [claim.territoryId, claim.playerId]),
      );
      const staticList = buildStaticTerritoryList();
      const territories = staticList.map((t: any) => ({
        ...t,
        ownerId: ownerByTerritory.get(t.id) ?? null,
      }));
      const payload = { territories };
      res.json(payload);
    },
  );
  // ─── ADMIN: Reset Territory ───────────────────────────────────────────────
  app.post(
    "/api/admin/territories/:id/reset",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const id = Number(req.params.id);
      if (isNaN(id))
        return res
          .status(400)
          .json({ error: "bad_request", message: "ID không hợp lệ" });
      const {
        territoryClaims,
        territoryClearings,
        marchOrders,
        activeBattles,
      } = await collections();
      await Promise.all([
        territoryClaims.deleteOne({ territoryId: id }),
        territoryClearings.deleteOne({ territoryId: id }),
        marchOrders.deleteMany({
          $or: [{ fromTerritoryId: id }, { toTerritoryId: id }],
        }),
        activeBattles.deleteMany({ regionId: id }),
      ]);
      await bumpWorldCacheVersion();
      res.json({ ok: true, message: `Lãnh thổ ${id} đã reset về hoang dã.` });
    },
  );
  // ─── ADMIN: Reset All Territory Runtime Data ─────────────────────────────
  app.post(
    "/api/admin/territories/reset-all",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      const {
        players,
        saves,
        territoryClaims,
        territoryClearings,
        marchOrders,
        activeBattles,
        allianceAids,
      } = await collections();
      await Promise.all([
        territoryClaims.deleteMany({}),
        territoryClearings.deleteMany({}),
        marchOrders.deleteMany({}),
        activeBattles.deleteMany({}),
        allianceAids.deleteMany({}),
        saves.deleteMany({}),
        players.updateMany(
          { role: "player" },
          {
            $set: { onboardingState: "needs_claim" },
            $unset: { starterLandId: "" },
          },
        ),
      ]);
      await bumpWorldCacheVersion();
      res.json({
        ok: true,
        message:
          "Đã reset sạch toàn bộ lãnh thổ: không chủ sở hữu, không xây thành, không hành quân, không thành trì lưu.",
      });
    },
  );
  // ─── ADMIN: Claim Territory for Player ───────────────────────────────────
  app.post(
    "/api/admin/territories/:id/claim",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const id = Number(req.params.id);
      const playerId = z.string().min(1).safeParse(req.body?.playerId);
      if (isNaN(id) || !playerId.success) {
        return res
          .status(400)
          .json({
            error: "bad_request",
            message: "ID lãnh thổ hoặc playerId không hợp lệ",
          });
      }
      const { players, territoryClaims } = await collections();
      const player = await players.findOne({ _id: playerId.data });
      if (!player)
        return res
          .status(404)
          .json({ error: "not_found", message: "Người chơi không tồn tại" });
      const staticTerritory = getStaticTerritory(id);
      if (!staticTerritory)
        return res
          .status(404)
          .json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
      const now = new Date();
      await territoryClaims.updateOne(
        { territoryId: id },
        {
          $setOnInsert: { _id: `territory:${id}` },
          $set: { territoryId: id, playerId: playerId.data, claimedAt: now },
        },
        { upsert: true },
      );
      await bumpWorldCacheVersion();
      res.json({
        ok: true,
        message: `Lãnh thổ ${id} đã giao cho ${playerId.data}.`,
      });
    },
  );
  // Bot simulation is retired. The remaining world tick handles only real player actions.
  retireLegacyBots().catch(console.error);
  setInterval(async () => {
    try {
      const now = new Date();
      await processWorldTick(now);
    } catch (e) {
      console.error("Background tick error:", e);
    }
  }, 500).unref();
  setInterval(() => {
    void publishRealtimeEconomyTick(new Date()).catch((error) => {
      console.error("Economy settle error:", error);
    });
  }, ECONOMY_SETTLE_INTERVAL_MS).unref();
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Express API Error:", err);
    res.status(500).json({
      error: "internal_server_error",
      message: err?.message || String(err) || "Lỗi máy chủ nội bộ",
      stack: err?.stack || null,
    });
  });
  return app;
}
