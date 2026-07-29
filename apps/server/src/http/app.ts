import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
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
import { collections } from "../db/collections.js";
import { config, isAllowedCorsOrigin } from "../config.js";
import { requireAdmin, requireAuth, signToken } from "../security/auth.js";
import { publishRealtime, realtimeStats } from "../realtime/socket.js";
import { bumpWorldCacheVersion, cacheGetJson, cacheSetJson, getWorldCacheVersion } from "../cache.js";

const LoginSchema = z.object({
  username: z.string().min(3).max(40),
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

const SaveSchema = z.object({
  resources: z.object({
    gold: z.number().nonnegative(),
    wood: z.number().nonnegative(),
    stone: z.number().nonnegative(),
    food: z.number().nonnegative().default(0),
    iron: z.number().nonnegative().default(0),
    coal: z.number().nonnegative().default(0),
    sulfur: z.number().nonnegative().default(0),
    gems: z.number().nonnegative().default(0),
  }),
  towns: z.array(
    z.object({
      id: z.number().int().positive(),
      level: z.number().int().positive(),
      ownerId: z.string().min(1),
      troops: z.number().int().nonnegative(),
      population: z.number().int().nonnegative().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      buildings: z.object({
        barracks: z.number().int().nonnegative().default(0),
        lumberCamp: z.number().int().nonnegative().default(0),
        quarry: z.number().int().nonnegative().default(0),
        goldMine: z.number().int().nonnegative().default(0),
        gemCutter: z.number().int().nonnegative().default(0),
        fort: z.number().int().nonnegative().default(0),
        siegeWorkshop: z.number().int().nonnegative().default(0),
        warehouse: z.number().int().nonnegative().default(0),
      }).optional(),
      storage: z.record(z.string(), z.number().nonnegative()).optional(),
    }),
  ),
  research: z.object({
    sword: z.number().int().nonnegative().default(0),
    stirrups: z.number().int().nonnegative().default(0),
    cannon: z.number().int().nonnegative().default(0),
    travel: z.number().int().nonnegative().default(0),
  }).optional(),
});

const StartClearingSchema = z.object({
  territoryId: z.number().int().nonnegative(),
});

const CreateMarchSchema = z.object({
  fromTerritoryId: z.number().int().nonnegative(),
  toTerritoryId: z.number().int().nonnegative(),
  troops: z.number().int().positive(),
  infantry: z.number().int().nonnegative().default(0),
  cavalry: z.number().int().nonnegative().default(0),
  artillery: z.number().int().nonnegative().default(0),
  battleSide: z.enum(["attacker", "defender"]).optional(),
  kind: z.enum(["attack", "reinforce", "move"]).default("attack"),
});

const RecruitTroopsSchema = z.object({
  territoryId: z.number().int().nonnegative().optional(),
  townId: z.number().int().nonnegative().optional(),
  unitType: z.enum(["infantry", "cavalry", "artillery"]),
  count: z.number().int().positive().default(1),
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
    gold: z.number().int().nonnegative().default(0),
    wood: z.number().int().nonnegative().default(0),
    stone: z.number().int().nonnegative().default(0),
    food: z.number().int().nonnegative().default(0),
    iron: z.number().int().nonnegative().default(0),
    coal: z.number().int().nonnegative().default(0),
    sulfur: z.number().int().nonnegative().default(0),
    gems: z.number().int().nonnegative().default(0),
  }).default({}),
  troops: z.number().int().nonnegative().default(0),
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
const BASE_RESOURCE_CAPACITY = 3200;
const TERRITORY_RESOURCE_CAPACITY = 850;
const MAX_OFFLINE_RESOURCE_SECONDS = 24 * 60 * 60;
const ALLIANCE_CREATE_GEMS_COST = 100;
const ALLIANCE_MAX_MEMBERS = 20;
const ALLIANCE_AID_MAX_TROOPS = 500;

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
    const rarePenalty = key === "gems" || key === "sulfur" ? 0.55 : 1;
    cap[key] = Math.round((BASE_RESOURCE_CAPACITY + ownedCount * TERRITORY_RESOURCE_CAPACITY) * rarePenalty);
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

function calcSpecialResources(t: { id: number; isIslet: boolean; biome: number; rx: number; ry: number }) {
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

  // Natural Harbor ("Bến tàu tự nhiên")
  if (t.isIslet || t.id % 3 === 0 || t.id % 5 === 0 || t.id % 7 === 0) {
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
  return Math.round(base + territoryAreaFactorForTown(territory) * 28 * biomePopMult * isletPenalty);
}

function townStorageCapacityForTerritory(town: any, territory?: Pick<TerritoryInfo, "rx" | "ry">) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 1) || 1));
  const warehouse = Math.max(0, Math.floor(Number(town?.buildings?.warehouse || 0) || 0));
  const fort = Math.max(0, Math.floor(Number(town?.buildings?.fort || 0) || 0));
  const areaBonus = territory ? Math.round(territoryAreaFactorForTown(territory) * 120) : 0;
  return 250 + warehouse * 650 + fort * 180 + level * 120 + areaBonus;
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
    maxTroops: population * 10,
  };
}

function normalizeTownSnapshotForState(town: any, playerId: string, territory?: NonNullable<ReturnType<typeof getStaticTerritory>> | TerritoryInfo) {
  const level = Math.max(1, Math.floor(Number(town?.level ?? town?.lvl ?? 2) || 2));
  const startingPopulation = territory ? territoryStartingPopulationForTown(territory, 1) : 32;
  const population = Math.max(startingPopulation, Math.floor(Number(town?.population ?? startingPopulation) || startingPopulation));
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
    buildings,
  };
  const storageCapacity = townStorageCapacityForTerritory(normalized, territory);
  return {
    ...town,
    level,
    lvl: level,
    ownerId: town?.ownerId || playerId,
    population,
    troops: Math.max(0, Math.floor(Number(town?.troops ?? 0) || 0)),
    infantryCount: Math.max(0, Math.floor(Number(town?.infantryCount ?? town?.troops ?? 0) || 0)),
    cavalryCount: Math.max(0, Math.floor(Number(town?.cavalryCount ?? 0) || 0)),
    artilleryCount: Math.max(0, Math.floor(Number(town?.artilleryCount ?? 0) || 0)),
    buildings,
    storage: { ...(town?.storage || {}) },
    storageCapacity,
    maxTroops: population * 10,
  };
}

function townSnapshotsForPlayer(
  saveTowns: any[] | undefined,
  territories: Array<NonNullable<ReturnType<typeof getStaticTerritory>> | TerritoryInfo>,
  playerId: string,
  resources?: ResourceBag,
) {
  const towns = Array.isArray(saveTowns)
    ? saveTowns.map((town) => {
      const territory = territories.find((item) => Math.hypot((town?.x ?? 0) - item.x, (town?.y ?? 0) - item.y) < 96);
      return normalizeTownSnapshotForState(town, playerId, territory);
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
      }, playerId, territory);
      if (existingIndex >= 0) towns[existingIndex] = normalized;
      else towns.push(normalized);
    });
  if (resources && towns.length > 0) {
    const totalResources = RESOURCE_KEYS.reduce((sum, key) => sum + Math.max(0, Math.floor(resources[key] || 0)), 0);
    const totalCapacity = towns.reduce((sum: number, town: any) => sum + Math.max(1, Math.floor(Number(town.storageCapacity || 1))), 0);
    towns.forEach((town: any, townIndex: number) => {
      const townCapacity = Math.max(1, Math.floor(Number(town.storageCapacity || 1)));
      const townBudget = totalResources <= 0
        ? 0
        : Math.min(
          townCapacity,
          townIndex === towns.length - 1
            ? Math.max(0, Math.min(totalResources, totalCapacity) - towns.slice(0, townIndex).reduce((sum: number, item: any) => sum + Object.values(item.storage || {}).reduce((innerSum: number, value: any) => innerSum + Math.max(0, Math.floor(Number(value) || 0)), 0), 0))
            : Math.floor(Math.min(totalResources, totalCapacity) * townCapacity / Math.max(1, totalCapacity)),
        );
      let assigned = 0;
      town.storage = {};
      RESOURCE_KEYS.forEach((key, keyIndex) => {
        const resourceTotal = Math.max(0, Math.floor(resources[key] || 0));
        const share = totalResources <= 0
          ? 0
          : keyIndex === RESOURCE_KEYS.length - 1
            ? Math.max(0, townBudget - assigned)
            : Math.min(Math.floor(townBudget * resourceTotal / totalResources), townBudget - assigned);
        town.storage[key] = share;
        assigned += share;
      });
    });
  }
  return towns;
}

function toPublicClearing(clearing: { territoryId: number; playerId: string; startedAt: Date; arrivesAt?: Date; completesAt: Date }): ActiveClearing {
  return {
    territoryId: clearing.territoryId,
    playerId: clearing.playerId,
    startedAt: clearing.startedAt.toISOString(),
    arrivesAt: clearing.arrivesAt ? clearing.arrivesAt.toISOString() : clearing.startedAt.toISOString(),
    completesAt: clearing.completesAt.toISOString(),
  };
}

function toPublicMarch(order: {
  _id: string;
  ownerId: string;
  fromTerritoryId: number;
  toTerritoryId: number;
  troops: number;
  infantry?: number;
  cavalry?: number;
  artillery?: number;
  distanceKm?: number;
  travelSeconds?: number;
  usesShip?: boolean;
  battleSide?: "attacker" | "defender";
  kind: "attack" | "reinforce" | "move";
  startedAt: Date;
  arrivesAt: Date;
}) {
  return {
    id: order._id,
    ownerId: order.ownerId,
    fromTerritoryId: order.fromTerritoryId,
    toTerritoryId: order.toTerritoryId,
    troops: order.troops,
    infantry: order.infantry ?? 0,
    cavalry: order.cavalry ?? 0,
    artillery: order.artillery ?? 0,
    distanceKm: order.distanceKm ?? 0,
    travelSeconds: order.travelSeconds ?? Math.max(1, Math.round((order.arrivesAt.getTime() - order.startedAt.getTime()) / 1000)),
    usesShip: order.usesShip ?? false,
    battleSide: order.battleSide,
    kind: order.kind,
    startedAt: order.startedAt.toISOString(),
    arrivesAt: order.arrivesAt.toISOString(),
  };
}

function toPublicBattle(battle: {
  _id: string;
  regionId: number;
  townId?: number;
  attackerId: string;
  defenderId: string | null;
  attackerPower: number;
  defenderPower: number;
  attackerInfantry: number;
  attackerCavalry: number;
  attackerArtillery: number;
  defenderInfantry: number;
  defenderCavalry: number;
  defenderArtillery: number;
  startedAt: Date;
  resolvesAt: Date;
  durationSeconds: number;
}): ActiveBattle {
  return {
    id: battle._id,
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
    startedAt: battle.startedAt.toISOString(),
    resolvesAt: battle.resolvesAt.toISOString(),
    durationSeconds: battle.durationSeconds,
  };
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
  const ownerByTerritory = new Map(claims.map((claim) => [claim.territoryId, claim.playerId]));
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
    const ownerId = ownerByTerritory.get(territory.id) ?? null;
    return {
      ...territory,
      ownerId,
      ownerName: ownerId ? nameByOwner.get(ownerId) ?? ownerId : null,
      ownerFlagColor: ownerId ? flagColorByOwner.get(ownerId) ?? "#2f70d7" : undefined,
      ownerEmblem: ownerId ? emblemByOwner.get(ownerId) ?? "shield" : undefined,
      ownerAllianceTag: ownerId ? allianceByOwner.get(ownerId)?.tag : undefined,
      ownerAllianceEmblem: ownerId ? allianceByOwner.get(ownerId)?.emblem : undefined,
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
    newbieShieldUntil: shieldDate ? new Date(shieldDate).toISOString() : null,
  };
}

async function buildGameStatePayload(playerId: string): Promise<GameStateResult> {
  await processArrivedMarches();
  await processActiveBattles();
  await processCompletedClearings();
  const { territoryClearings, marchOrders, activeBattles, players, saves } = await collections();
  const [world, clearings, marches, battles, resourceState, player, save] = await Promise.all([
    buildWorldTerritoriesPayload(),
    territoryClearings.find({}).toArray(),
    marchOrders.find({}).toArray(),
    activeBattles.find({}).toArray(),
    collectPlayerResources(playerId),
    players.findOne({ _id: playerId }),
    saves.findOne({ playerId }),
  ]);
  return {
    territories: world.territories,
    clearings: clearings.map(toPublicClearing),
    marches: marches.map(toPublicMarch),
    battles: battles.map(toPublicBattle),
    towns: townSnapshotsForPlayer(save?.towns, world.territories, playerId, resourceState.resources),
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
  settlerSpeed: 35,
  infantrySpeed: DEFAULT_MARCH_CONFIG.infantrySpeed,
  cavalrySpeed: DEFAULT_MARCH_CONFIG.cavalrySpeed,
  artillerySpeed: DEFAULT_MARCH_CONFIG.artillerySpeed,
  shipSpeed: DEFAULT_MARCH_CONFIG.shipSpeed,
  gameHourSeconds: DEFAULT_MARCH_CONFIG.gameHourSeconds,
};

function normalizeGameConfig(doc?: Partial<GameConfig> | null): GameConfig {
  return { ...DEFAULT_CONFIG, ...(doc || {}) };
}

async function loadGameConfig(): Promise<GameConfig> {
  const { configs } = await collections();
  const doc = await configs.findOne({ _id: "game_settings" });
  return normalizeGameConfig(doc || null);
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
    if (march.kind !== "attack" || !targetClaim || targetClaim.playerId === march.ownerId) {
      await marchOrders.deleteOne({ _id: march._id });
      continue;
    }
    const existingBattle = await activeBattles.findOne({ regionId: territory.id });
    if (existingBattle) {
      await marchOrders.deleteOne({ _id: march._id });
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
    publishRealtime({ type: "battle_started", battle: toPublicBattle(battle) });
  }
  if (arrived.length > 0) {
    await bumpWorldCacheVersion();
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });
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

    if (attackerWins) {
      const survivorRatio = winnerRatio;
      const nextInfantry = Math.max(1, Math.floor(battle.attackerInfantry * survivorRatio));
      const nextCavalry = Math.max(0, Math.floor(battle.attackerCavalry * survivorRatio));
      const nextArtillery = Math.max(0, Math.floor(battle.attackerArtillery * survivorRatio));
      const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
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
      const defenderPlayer = battle.defenderId ? await players.findOne({ _id: battle.defenderId }) : null;
      const attackerPlayer = await players.findOne({ _id: battle.attackerId });
      const defenderResources = normalizeResources(defenderPlayer?.resources);
      const attackerResources = normalizeResources(attackerPlayer?.resources);
      const lootedResources = emptyResources();
      RESOURCE_KEYS.forEach((key) => {
        lootedResources[key] = Math.floor((defenderResources[key] || 0) * lootPercent);
        defenderResources[key] = Math.max(0, defenderResources[key] - lootedResources[key]);
        attackerResources[key] = Math.max(0, attackerResources[key] + lootedResources[key]);
      });
      await Promise.all([
        territoryClaims.updateOne(
          { territoryId: territory.id },
          { $set: { playerId: battle.attackerId, claimedAt: now }, $setOnInsert: { _id: `territory:${territory.id}`, territoryId: territory.id } },
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
        }
      }
    } else if (battle.defenderId) {
      const survivorRatio = winnerRatio;
      const nextInfantry = Math.max(1, Math.floor(battle.defenderInfantry * survivorRatio));
      const nextCavalry = Math.max(0, Math.floor(battle.defenderCavalry * survivorRatio));
      const nextArtillery = Math.max(0, Math.floor(battle.defenderArtillery * survivorRatio));
      const nextTroops = troopValue(nextInfantry, nextCavalry, nextArtillery);
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
      const retreatRatio = clampNumber(gameConfig.retreatPercent, 0, 100) / 100;
      if (retreatRatio > 0) {
        const sourceTerritory = getStaticTerritory(battle.fromTerritoryId);
        if (sourceTerritory) {
          const retreatInfantry = Math.floor(battle.attackerInfantry * retreatRatio);
          const retreatCavalry = Math.floor(battle.attackerCavalry * retreatRatio);
          const retreatArtillery = Math.floor(battle.attackerArtillery * retreatRatio);
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
          }
        }
      }
    }

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
    });
    publishRealtime({ type: "territory_claimed", territory: publicTerritory });
  }
  if (resolved.length > 0) {
    await bumpWorldCacheVersion();
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });
  }
}

async function processCompletedClearings(now = new Date()) {
  const { players, territoryClaims, territoryClearings, alliances } = await collections();
  const completed = await territoryClearings.find({ completesAt: { $lte: now } }).toArray();
  for (const clearing of completed) {
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
      { $setOnInsert: { _id: `territory:${territory.id}`, territoryId: territory.id, playerId: clearing.playerId, claimedAt: now } },
      { upsert: true },
    );
    await territoryClearings.deleteOne({ _id: clearing._id });
    await players.updateOne({ _id: clearing.playerId }, { $set: { onboardingState: "settled", lastSeenAt: now } });
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
  }
  if (completed.length > 0) {
    await bumpWorldCacheVersion();
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });
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
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

  app.get("/api/health", (_req, res) => {
    const payload: ServerStatus = { ok: true, service: "island-empire-api", time: new Date().toISOString() };
    res.json(payload);
  });

  app.get("/api/realtime/stats", requireAuth, requireAdmin, (_req, res) => {
    res.json(realtimeStats());
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
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "bad_request", message: "Tài khoản (3-40 ký tự) hoặc mật khẩu (8-200 ký tự) không hợp lệ" });
    }
    const { username, password, flagColor, emblem, starterLandId } = parsed.data;
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

  app.post("/api/player/profile", requireAuth, async (req, res) => {
    const parsed = z.object({
      flagColor: z.string().min(3).max(20).optional(),
      emblem: z.string().min(2).max(40).optional(),
      cityName: z.string().max(60).optional(),
    }).passthrough().safeParse(req.body);
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
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });
    res.json({ ok: true });
  });

  app.get("/api/world/territories", requireAuth, async (_req, res) => {
    const payload = await cachedWorldTerritoriesPayload();
    res.setHeader("X-World-Cache", "enabled");
    res.json(payload);
  });

  app.get("/api/game/state", requireAuth, async (_req, res) => {
    const payload = await buildGameStatePayload(_req.user!.id);
    res.setHeader("X-World-Cache", "partial");
    res.json(payload);
  });

  app.get("/api/alliance/me", requireAuth, async (req, res) => {
    res.json(await buildAllianceState(req.user!.id));
  });

  app.post("/api/alliance/create", requireAuth, async (req, res) => {
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
      ? { gold: 0, wood: 0, stone: 0, food: 0, iron: 0, gems: 0 } 
      : territoryBuildCost(territory);

    console.log("[DEBUG CLEARINGS] playerId:", req.user!.id, "ownedCount:", ownedCount, "isStarterClaim:", isStarterClaim, "buildCost:", buildCost);
    const resourceState = await collectPlayerResources(req.user!.id, now);
    if (!existing && !canAfford(resourceState.resources, buildCost)) {
      return res.status(409).json({
        error: "not_enough_resources",
        message: `Không đủ tài nguyên xây thành. Cần ${resourceCostMessage(buildCost)}`,
        cost: buildCost,
        resources: resourceState.resources,
      });
    }
    const gameSettings = await loadGameConfig();
    const clearingSeconds = calcClearingSeconds(territory.rx, territory.ry, territory.biome, gameSettings.settlerSpeed, gameSettings.gameHourSeconds);
    
    // Calculate settler travel time from nearest owned territory or port town
    const ownedClaimsList = await territoryClaims.find({ playerId: req.user!.id }).toArray();
    let originX = territory.x - Math.min(120, Math.max(45, territory.rx * 0.42));
    let originY = territory.y + Math.min(70, Math.max(24, territory.ry * 0.18));
    if (ownedClaimsList.length > 0) {
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
    const travelSeconds = Math.max(4, Math.round((distanceKm / Math.max(1, gameSettings.settlerSpeed || 35)) * (gameSettings.gameHourSeconds || 30)));
    const arrivesAt = new Date(now.getTime() + travelSeconds * 1000);
    const completesAt = new Date(arrivesAt.getTime() + clearingSeconds * 1000);

    const clearing = existing ?? {
      _id: `clearing:${territory.id}`,
      territoryId: territory.id,
      playerId: req.user!.id,
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
      await players.updateOne(
        { _id: req.user!.id },
        { $set: { onboardingState: "claiming", lastSeenAt: now, resources: subtractCost(resourceState.resources, buildCost) } },
      );
      await bumpWorldCacheVersion();
    }
    const payload: StartClearingResult = { ok: true, clearing: toPublicClearing(clearing) };
    publishRealtime({ type: "territory_clearing_started", clearing: payload.clearing });
    res.json(payload);
  });

  app.post("/api/game/clearings/:id/complete", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const territory = Number.isInteger(id) ? getStaticTerritory(id) : undefined;
    if (!territory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings, alliances } = await collections();
    const existingClaim = await territoryClaims.findOne({ territoryId: territory.id });
    if (existingClaim && existingClaim.playerId !== req.user!.id) {
      return res.status(409).json({ error: "territory_taken", message: "Lãnh thổ này đã có người chiếm" });
    }
    const clearing = await territoryClearings.findOne({ territoryId: territory.id, playerId: req.user!.id });
    const now = new Date();
    if (clearing && clearing.completesAt.getTime() > now.getTime()) {
      return res.status(409).json({ error: "clearing_not_ready", message: "Xây thành chưa hoàn tất", readyAt: clearing.completesAt.toISOString() });
    }
    await territoryClaims.updateOne(
      { territoryId: territory.id },
      { $setOnInsert: { _id: `territory:${territory.id}`, territoryId: territory.id, playerId: req.user!.id, claimedAt: now } },
      { upsert: true },
    );
    await territoryClearings.deleteOne({ territoryId: territory.id, playerId: req.user!.id });
    await players.updateOne({ _id: req.user!.id }, { $set: { onboardingState: "settled", lastSeenAt: now } });
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
    res.json(payload);
  });

  app.delete("/api/game/clearings/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const territory = Number.isInteger(id) ? getStaticTerritory(id) : undefined;
    if (!territory) return res.status(404).json({ error: "not_found", message: "Không tìm thấy lãnh thổ" });
    const { players, territoryClaims, territoryClearings } = await collections();
    const clearing = await territoryClearings.findOne({ territoryId: territory.id, playerId: req.user!.id });
    if (!clearing) {
      return res.status(404).json({ error: "not_found", message: "Không có lệnh xây thành đang chạy" });
    }
    const now = new Date();
    const resourceState = await collectPlayerResources(req.user!.id, now);
    const ownedCount = await territoryClaims.countDocuments({ playerId: req.user!.id });
    const capacity = resourceCapacityForOwnedTerritories(ownedCount);
    const refund = territoryBuildCost(territory);
    const nextResources = { ...resourceState.resources };
    RESOURCE_KEYS.forEach((key) => {
      nextResources[key] = Math.min(capacity[key], Math.floor(nextResources[key] + Math.floor(refund[key] || 0)));
    });
    await Promise.all([
      territoryClearings.deleteOne({ territoryId: territory.id, playerId: req.user!.id }),
      players.updateOne({ _id: req.user!.id }, { $set: { resources: nextResources, onboardingState: "settled", lastSeenAt: now } }),
    ]);
    await bumpWorldCacheVersion();
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });
    res.json({ ok: true, resources: nextResources, refund });
  });

  app.post("/api/game/marches", requireAuth, async (req, res) => {
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
    const now = new Date();

    // Check newbie protection shield on target
    const targetClaim = await territoryClaims.findOne({ territoryId: to.id });
    if (parsed.data.kind === "attack" && targetClaim && targetClaim.playerId !== req.user!.id) {
      const targetPlayer = await players.findOne({ _id: targetClaim.playerId });
      if (targetPlayer?.newbieShieldUntil && new Date(targetPlayer.newbieShieldUntil).getTime() > now.getTime()) {
        return res.status(403).json({
          error: "target_protected",
          message: "⚠️ Thành trì đối thủ đang trong thời gian bảo vệ tân thủ! Không thể tấn công."
        });
      }
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
    await bumpWorldCacheVersion();
    const payload: CreateMarchResult = { 
      ok: true, 
      march: toPublicMarch(order),
      newbieShieldUntil: finalShieldUntil ? new Date(finalShieldUntil).toISOString() : null
    };
    publishRealtime({ type: "march_created", march: payload.march });
    res.json(payload);
  });

  app.post("/api/game/recruit", requireAuth, async (req, res) => {
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
    publishRealtime({ type: "world_state_hint", reason: "server_resync" });

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
    const { players, territoryClaims, territoryClearings, alliances } = await collections();
    const existing = await territoryClaims.findOne({ territoryId: id });
    if (existing && existing.playerId !== req.user!.id) {
      return res.status(409).json({ error: "territory_taken", message: "Lãnh thổ này đã có người chiếm" });
    }
    const now = new Date();
    await territoryClaims.updateOne(
      { territoryId: id },
      { $setOnInsert: { _id: `territory:${id}`, territoryId: id, playerId: req.user!.id, claimedAt: now } },
      { upsert: true },
    );
    await territoryClearings.deleteMany({ territoryId: id });
    await players.updateOne({ _id: req.user!.id }, { $set: { onboardingState: "settled", lastSeenAt: now } });
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
    settlerSpeed: z.number().positive(),
    infantrySpeed: z.number().positive(),
    cavalrySpeed: z.number().positive(),
    artillerySpeed: z.number().positive(),
    shipSpeed: z.number().positive(),
    gameHourSeconds: z.number().positive(),
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

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });

  return app;
}
