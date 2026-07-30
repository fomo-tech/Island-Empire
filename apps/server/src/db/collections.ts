import type { ActiveBattle, ResourceBag, TownSnapshot, GameConfig } from "@island/shared";
import { getDb } from "./client.js";

export type PlayerDocument = {
  _id: string;
  name: string;
  passwordHash?: string;
  flagColor?: string;
  emblem?: string;
  starterLandId?: string;
  onboardingState?: "needs_claim" | "claiming" | "settled";
  resources?: ResourceBag;
  lastResourceCollectedAt?: Date;
  allianceTroopReserve?: number;
  role: "player" | "admin";
  newbieShieldUntil?: Date;
  createdAt: Date;
  lastSeenAt: Date;
};

export type SaveDocument = {
  _id: string;
  playerId: string;
  resources: ResourceBag;
  towns: TownSnapshot[];
  updatedAt: Date;
};

export type ConfigDocument = GameConfig & {
  _id: "game_settings";
  updatedAt: Date;
};

export type TerritoryClaimDocument = {
  _id: string;
  territoryId: number;
  playerId: string;
  claimedAt: Date;
};

export type TerritoryClearingDocument = {
  _id: string;
  territoryId: number;
  playerId: string;
  buildCost?: Partial<ResourceBag>;
  isStarterClaim?: boolean;
  startedAt: Date;
  arrivesAt?: Date;
  completesAt: Date;
};

export type MarchOrderDocument = {
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
};

export type ActiveBattleDocument = Omit<ActiveBattle, "id" | "startedAt" | "resolvesAt"> & {
  _id: string;
  startedAt: Date;
  resolvesAt: Date;
  fromTerritoryId: number;
  toTerritoryId: number;
  marchId: string;
};

export type AllianceDocument = {
  _id: string;
  name: string;
  tag: string;
  emblem: string;
  leaderId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type AllianceAidDocument = {
  _id: string;
  allianceId: string;
  fromPlayerId: string;
  toPlayerId: string;
  resources: Partial<ResourceBag>;
  troops: number;
  status: "pending" | "claimed";
  createdAt: Date;
  claimedAt?: Date;
};

export type BattleReportDocument = {
  _id: string;
  regionId: number;
  territoryName: string;
  attackerId: string;
  attackerName: string;
  defenderId: string | null;
  defenderName: string;
  winnerId: string;
  isAttackerWin: boolean;
  attacker: {
    initial: { infantry: number; cavalry: number; artillery: number; power: number };
    casualty: { infantry: number; cavalry: number; artillery: number; power: number };
    survivors: { infantry: number; cavalry: number; artillery: number; power: number };
  };
  defender: {
    initial: { infantry: number; cavalry: number; artillery: number; power: number };
    casualty: { infantry: number; cavalry: number; artillery: number; power: number };
    survivors: { infantry: number; cavalry: number; artillery: number; power: number };
  };
  lootedResources: { gold: number; wood: number; stone: number; gems: number };
  createdAt: Date;
};

export async function collections() {
  const db = await getDb();
  return {
    players: db.collection<PlayerDocument>("players"),
    saves: db.collection<SaveDocument>("saves"),
    configs: db.collection<ConfigDocument>("configs"),
    territoryClaims: db.collection<TerritoryClaimDocument>("territory_claims"),
    territoryClearings: db.collection<TerritoryClearingDocument>("territory_clearings"),
    marchOrders: db.collection<MarchOrderDocument>("march_orders"),
    activeBattles: db.collection<ActiveBattleDocument>("active_battles"),
    alliances: db.collection<AllianceDocument>("alliances"),
    allianceAids: db.collection<AllianceAidDocument>("alliance_aids"),
    battleReports: db.collection<BattleReportDocument>("battle_reports"),
  };
}

export async function ensureIndexes() {
  const { players, saves, territoryClaims, territoryClearings, marchOrders, activeBattles, alliances, allianceAids, battleReports } = await collections();
  await Promise.all([
    players.createIndex({ name: 1 }, { unique: true }),
    players.createIndex({ lastSeenAt: -1 }),
    saves.createIndex({ playerId: 1 }, { unique: true }),
    saves.createIndex({ updatedAt: -1 }),
    territoryClaims.createIndex({ territoryId: 1 }, { unique: true }),
    territoryClaims.createIndex({ playerId: 1 }),
    territoryClearings.createIndex({ territoryId: 1 }, { unique: true }),
    territoryClearings.createIndex({ playerId: 1 }),
    territoryClearings.createIndex({ completesAt: 1 }),
    marchOrders.createIndex({ ownerId: 1 }),
    marchOrders.createIndex({ arrivesAt: 1 }),
    activeBattles.createIndex({ regionId: 1 }),
    activeBattles.createIndex({ resolvesAt: 1 }),
    alliances.createIndex({ tag: 1 }, { unique: true }),
    alliances.createIndex({ memberIds: 1 }),
    alliances.createIndex({ leaderId: 1 }),
    allianceAids.createIndex({ toPlayerId: 1, status: 1 }),
    allianceAids.createIndex({ fromPlayerId: 1, createdAt: -1 }),
    allianceAids.createIndex({ allianceId: 1, createdAt: -1 }),
    battleReports.createIndex({ attackerId: 1 }),
    battleReports.createIndex({ defenderId: 1 }),
    battleReports.createIndex({ createdAt: -1 }),
  ]);
}
