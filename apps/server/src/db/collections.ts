import type {
  ActiveBattle,
  ResourceBag,
  TownSnapshot,
  GameConfig,
  StrategicPowerBreakdown,
  UserChatMessage,
} from "@island/shared";
import { getDb } from "./client.js";

export type PlayerDocument = {
  _id: string;
  name: string;
  avatarId?: string;
  passwordHash?: string;
  flagColor?: string;
  emblem?: string;
  kingdomArchitectureId?: string;
  starterLandId?: string;
  cityName?: string;
  cityNameKey?: string;
  isBot?: boolean;
  activeMap?: "world" | "conquest";
  onboardingState?: "profile_required" | "needs_claim" | "claiming" | "settled";
  resources?: ResourceBag;
  lastResourceCollectedAt?: Date;
  allianceTroopReserve?: number;
  stateVersion?: number;
  vipLevel?: number;
  vipPoints?: number;
  strategicPowerSnapshot?: StrategicPowerBreakdown & {
    version: number;
    updatedAt: Date;
  };
  shopInventory?: {
    ownedSkins: string[];
    equippedCapitalSkin: string | null;
    equippedDistrictSkin: string | null;
    version: number;
  };
  role: "player" | "admin";
  newbieShieldUntil?: Date;
  newbieWelcomeGrantedAt?: Date; // timestamp khi đã cấp gói chào mừng (idempotent guard)
  newbieSkinExpiresAt?: Date; // skin tân thủ hết hạn sau 7 ngày
  newbieSkinId?: string; // skin được cấp miễn phí, dùng để thu hồi đúng skin
  newbieSkinClaimedAt?: Date; // đã dùng lượt skin miễn phí
  newbieFreeProductIds?: string[]; // các gói quân nhu đã dùng giá tân thủ
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
  settlementKind?:
    | "capital"
    | "sub_capital"
    | "military"
    | "military_district"
    | "flag";
  parentTerritoryId?: number;
  rootTerritoryId?: number;
  connectionType?: "land" | "sea";
  isolated?: boolean;
};

export type TerritoryClearingDocument = {
  _id: string;
  territoryId: number;
  playerId: string;
  buildCost?: Partial<ResourceBag>;
  isStarterClaim?: boolean;
  sourceTownId?: number;
  sourceTerritoryId?: number;
  settlers?: number;
  sourceX?: number;
  sourceY?: number;
  connectionType?: "land" | "sea";
  startedAt: Date;
  arrivesAt?: Date;
  completesAt: Date;
};

export type MarchOrderDocument = {
  _id: string;
  ownerId: string;
  requestId?: string;
  fromTerritoryId: number;
  sourceTownId?: number;
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

export type ActiveBattleDocument = Omit<
  ActiveBattle,
  "id" | "startedAt" | "resolvesAt" | "hpUpdatedAt"
> & {
  _id: string;
  startedAt: Date;
  resolvesAt: Date;
  fromTerritoryId: number;
  toTerritoryId: number;
  marchId: string;
  joinedMarchIds?: string[];
  status?: "fighting" | "resolved";
  hpUpdatedAt?: Date;
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
    initial: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
    casualty: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
    survivors: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
  };
  defender: {
    initial: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
    casualty: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
    survivors: {
      infantry: number;
      cavalry: number;
      artillery: number;
      power: number;
    };
  };
  lootedResources: { gold: number; wood: number; stone: number; gems: number };
  readBy?: string[];
  createdAt: Date;
};

export type PlayerMailDocument = {
  _id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  title: string;
  body: string;
  requestId: string;
  sentAt: Date;
  readAt?: Date | null;
  deletedByRecipient?: boolean;
  deletedBySender?: boolean;
};

export type ShopPurchaseDocument = {
  _id: string;
  playerId: string;
  productId: string;
  requestId: string;
  priceGems: number;
  grantedResources?: Partial<ResourceBag>;
  grantedSkinId?: string;
  createdAt: Date;
};

export type ChatMessageDocument = Omit<UserChatMessage, "id" | "sentAt"> & {
  _id: string;
  sentAt: Date;
  expiresAt: Date;
};

export async function collections() {
  const db = await getDb();
  return {
    players: db.collection<PlayerDocument>("players"),
    saves: db.collection<SaveDocument>("saves"),
    configs: db.collection<ConfigDocument>("configs"),
    territoryClaims: db.collection<TerritoryClaimDocument>("territory_claims"),
    territoryClearings: db.collection<TerritoryClearingDocument>(
      "territory_clearings",
    ),
    marchOrders: db.collection<MarchOrderDocument>("march_orders"),
    activeBattles: db.collection<ActiveBattleDocument>("active_battles"),
    alliances: db.collection<AllianceDocument>("alliances"),
    allianceAids: db.collection<AllianceAidDocument>("alliance_aids"),
    battleReports: db.collection<BattleReportDocument>("battle_reports"),
    playerMails: db.collection<PlayerMailDocument>("player_mails"),
    shopPurchases: db.collection<ShopPurchaseDocument>("shop_purchases"),
    chatMessages: db.collection<ChatMessageDocument>("chat_messages"),
  };
}

export async function ensureIndexes() {
  const {
    players,
    saves,
    territoryClaims,
    territoryClearings,
    marchOrders,
    activeBattles,
    alliances,
    allianceAids,
    battleReports,
    playerMails,
    shopPurchases,
    chatMessages,
  } = await collections();
  // Legacy databases used a plain unique name index. MongoDB treats multiple
  // missing/null names as duplicates, which made authenticated upserts crash
  // the API before onboarding had assigned a name. Migrate it to a partial
  // unique index that only applies to real string names.
  const playerIndexList = await players.listIndexes().toArray();
  const legacyNameIndex = playerIndexList.find(
    (index) => index.name === "name_1",
  );
  if (legacyNameIndex && !legacyNameIndex.partialFilterExpression) {
    await players.dropIndex("name_1");
  }
  await Promise.all([
    players.createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { name: { $type: "string" } } },
    ),
    players.createIndex({ lastSeenAt: -1 }),
    players.createIndex({ cityNameKey: 1 }, { unique: true, sparse: true }),
    saves.createIndex({ playerId: 1 }, { unique: true }),
    saves.createIndex({ updatedAt: -1 }),
    saves.createIndex({ "towns.nextTroopRecoveryAt": 1 }),
    territoryClaims.createIndex({ territoryId: 1 }, { unique: true }),
    territoryClaims.createIndex({ playerId: 1 }),
    territoryClearings.createIndex({ territoryId: 1 }, { unique: true }),
    territoryClearings.createIndex({ playerId: 1 }),
    territoryClearings.createIndex({ completesAt: 1 }),
    marchOrders.createIndex({ ownerId: 1 }),
    marchOrders.createIndex(
      { ownerId: 1, requestId: 1 },
      {
        unique: true,
        partialFilterExpression: { requestId: { $type: "string" } },
      },
    ),
    marchOrders.createIndex({ arrivesAt: 1 }),
    marchOrders.createIndex({ fromTerritoryId: 1 }),
    marchOrders.createIndex({ toTerritoryId: 1 }),
    activeBattles.createIndex({ regionId: 1 }),
    activeBattles.createIndex({ marchId: 1 }, { unique: true, sparse: true }),
    activeBattles.createIndex({ resolvesAt: 1 }),
    activeBattles.createIndex({ attackerId: 1 }),
    activeBattles.createIndex({ defenderId: 1 }),
    alliances.createIndex({ tag: 1 }, { unique: true }),
    alliances.createIndex({ memberIds: 1 }),
    alliances.createIndex({ leaderId: 1 }),
    allianceAids.createIndex({ toPlayerId: 1, status: 1 }),
    allianceAids.createIndex({ fromPlayerId: 1, createdAt: -1 }),
    allianceAids.createIndex({ allianceId: 1, createdAt: -1 }),
    battleReports.createIndex({ attackerId: 1 }),
    battleReports.createIndex({ defenderId: 1 }),
    battleReports.createIndex({ createdAt: -1 }),
    playerMails.createIndex({ recipientId: 1, sentAt: -1 }),
    playerMails.createIndex({ senderId: 1, sentAt: -1 }),
    playerMails.createIndex({ senderId: 1, requestId: 1 }, { unique: true }),
    shopPurchases.createIndex({ playerId: 1, requestId: 1 }, { unique: true }),
    shopPurchases.createIndex({ playerId: 1, createdAt: -1 }),
    chatMessages.createIndex({ sentAt: -1 }),
    chatMessages.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

// Repair old bot orders that stored a town id (9000 + territory id) as the
// march origin. Territory ids are the only ids consumed by the map renderer.
export async function repairLegacyMarchTerritoryIds() {
  const { marchOrders } = await collections();
  const legacy = await marchOrders
    .find({ fromTerritoryId: { $gte: 9000 } })
    .toArray();
  if (legacy.length === 0) return;
  await Promise.all(
    legacy.map((march: any) =>
      marchOrders.updateOne(
        { _id: march._id },
        { $set: { fromTerritoryId: Number(march.fromTerritoryId) - 9000 } },
      ),
    ),
  );
}
