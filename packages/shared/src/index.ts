export type ResourceKey = "gold" | "wood" | "stone" | "food" | "iron" | "coal" | "sulfur" | "gems";

export type ResourceBag = Record<ResourceKey, number>;

export type GameConfig = {
  maxBattleDuration: number;
  minBattleDuration: number;
  baseBattleSeconds: number;
  battlePowerPerSecond: number;
  townBattleSeconds: number;
  fortBattleSeconds: number;
  infantryAttackPower: number;
  infantryDefensePower: number;
  cavalryAttackPower: number;
  cavalryDefensePower: number;
  artilleryAttackPower: number;
  artilleryDefensePower: number;
  townLevelDefense: number;
  fortLevelDefense: number;
  retreatPercent: number;
  infantryCostGold: number;
  infantryCostWood: number;
  infantryTroopsValue: number;
  cavalryCostGold: number;
  cavalryCostWood: number;
  cavalryCostStone: number;
  cavalryTroopsValue: number;
  artilleryCostGold: number;
  artilleryCostStone: number;
  infantryCostFood: number;
  cavalryCostFood: number;
  cavalryCostIron: number;
  artilleryCostIron: number;
  artilleryCostCoal: number;
  artilleryCostSulfur: number;
  artilleryTroopsValue: number;
  infantryPopulationCost: number;
  cavalryPopulationCost: number;
  artilleryPopulationCost: number;
  settlerSpeed: number;
  infantrySpeed: number;
  cavalrySpeed: number;
  artillerySpeed: number;
  shipSpeed: number;
  gameHourSeconds: number;
  troopRecoveryEnabled: boolean;
  troopRecoverySeconds: number;
  troopRecoveryOfflineLimit: number;
  capitalTroopCapacityMultiplier: number;
  strongholdTroopCapacityMultiplier: number;
  seaInvasionMaxDistanceKm: number;
  battleStateBroadcastSeconds: number;
  shopResourcePackAmount: number;
  shopResourcePackPriceGems: number;
  shopSkinLongBaoThanhPrice: number;
  shopSkinHoaLongDienPrice: number;
  shopSkinPhongLongCacPrice: number;
  powerConnectedTerritory: number;
  powerIsolatedTerritory: number;
  powerNaturalHarborBonus: number;
  powerMilitaryResourceBonus: number;
  powerCapitalBase: number;
  powerMilitaryDistrictBase: number;
  powerCapitalLevel: number;
  powerMilitaryDistrictLevel: number;
  powerFortLevel: number;
  powerBarracksLevel: number;
  powerSiegeWorkshopLevel: number;
  powerWarehouseLevel: number;
  powerResourceBuildingLevel: number;
};

export type PlayerRole = "player" | "admin";

export type PublicPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  createdAt: string;
  lastSeenAt: string;
};

export type AdminPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  flagColor?: string;
  emblem?: string;
  starterLandId?: string;
  createdAt: string;
  lastSeenAt: string;
};

export type TownSnapshot = {
  id: number;
  territoryId?: number;
  kind?: "capital" | "sub_capital" | "military_district";
  level: number;
  ownerId: string;
  troops: number;
  infantryCount?: number;
  cavalryCount?: number;
  artilleryCount?: number;
  population?: number;
  x?: number;
  y?: number;
  buildings?: {
    barracks: number;
    lumberCamp: number;
    quarry: number;
    goldMine: number;
    gemCutter: number;
    fort?: number;
    siegeWorkshop?: number;
    warehouse?: number;
  };
  storage?: Partial<ResourceBag>;
  storageCapacity?: number | ResourceBag;
  productionPerSecond?: Partial<ResourceBag>;
  populationCapacity?: number;
  populationPerSecond?: number;
  lastPopulationAt?: string;
  maxTroops?: number;
  troopCapacity?: number;
  reservedTroops?: number;
  trainingSpecialty?: "infantry" | "cavalry" | "artillery";
  nextTroopRecoveryAt?: string;
  troopRecoverySeconds?: number;
  troopRecoveryBlockedReason?: "full" | "resources" | "battle" | "isolated" | null;
  recoveryCost?: Partial<ResourceBag>;
};

export type NationTownStatus = {
  townId: number;
  territoryId: number;
  kind: "capital" | "sub_capital" | "military_district";
  level: number;
  x: number;
  y: number;
  troops: number;
  maxTroops: number;
  population: number;
  populationCapacity: number;
  storageUsed: number;
  storageCapacity: number;
  storageUsagePercent: number;
  status: "normal" | "under_attack" | "building";
};

export type NationStatusAlert = {
  code: "under_attack" | "building" | "storage_near_full" | "population_near_full";
  count: number;
  severity: "info" | "warning" | "danger";
};

export type StrategicPowerBreakdown = {
  military: number;
  territory: number;
  settlements: number;
  buildings: number;
  total: number;
};

export type NationStatusSnapshot = {
  playerId: string;
  playerName: string;
  rank: "Lãnh Chúa" | "Bá Tước" | "Công Tước" | "Đế Vương" | "Đại Hoàng Đế";
  status: "peace" | "marching" | "building" | "under_attack";
  ownedTerritories: number;
  totalTerritories: number;
  townCount: number;
  ownedTroops: number;
  outboundTroops: number;
  ownMarches: number;
  ownClearings: number;
  activeBattles: number;
  strategicPower: number;
  strategicPowerBreakdown: StrategicPowerBreakdown;
  powerVersion: number;
  powerUpdatedAt: string;
  vipLevel: number;
  vipPoints: number;
  population: number;
  populationCapacity: number;
  resources: ResourceBag;
  resourceCapacity: ResourceBag;
  productionPerSecond: ResourceBag;
  towns: NationTownStatus[];
  alerts: NationStatusAlert[];
  serverTime: string;
};

export type ArmyStateSnapshot = {
  playerId: string;
  garrisonTroops: number;
  outboundTroops: number;
  totalTroops: number;
  infantry: number;
  cavalry: number;
  artillery: number;
  marches: MarchOrder[];
  battles: ActiveBattle[];
  towns: Array<{
    townId: number;
    territoryId: number;
    kind: "capital" | "sub_capital" | "military_district";
    level: number;
    x: number;
    y: number;
    troops: number;
    infantry: number;
    cavalry: number;
    artillery: number;
    maxTroops: number;
  }>;
  version: number;
  serverTime: string;
};

export type BattleReport = {
  id: string;
  regionId: number;
  territoryName: string;
  attackerId: string;
  attackerName: string;
  defenderId: string | null;
  defenderName: string;
  winnerId: string;
  isAttackerWin: boolean;
  attacker: any;
  defender: any;
  lootedResources: Partial<ResourceBag>;
  createdAt: string;
  read: boolean;
};

export type PlayerMail = {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
};

export type ShopProduct = {
  id: string;
  type: "resource_pack" | "skin";
  name: string;
  description: string;
  priceGems: number;
  testPrice: boolean;
  resources?: Partial<ResourceBag>;
  skinId?: string;
  skinTarget?: "capital" | "military_district";
  isNewbiePrice?: boolean;          // true nếu giá tân thủ đặc biệt
  newbiePriceExpiresAt?: string;    // ISO timestamp hết hạn giá tân thủ
};

export type ShopInventory = {
  ownedSkins: string[];
  equippedCapitalSkin: string | null;
  equippedDistrictSkin: string | null;
  version: number;
  newbieSkinExpiresAt?: string | null;   // skin tân thủ hết hạn lúc nào
};

export type ShopPurchase = {
  id: string;
  productId: string;
  priceGems: number;
  grantedResources?: Partial<ResourceBag>;
  grantedSkinId?: string;
  createdAt: string;
};

export type PlayerSyncResult = {
  ok: true;
  gameState: GameStateResult;
  nationState: NationStatusSnapshot;
  armyState: ArmyStateSnapshot;
  reportUnreadCount: number;
  mailUnreadCount: number;
  reports: BattleReport[];
  inbox: PlayerMail[];
  sent: PlayerMail[];
  shopCatalog: ShopProduct[];
  shopInventory: ShopInventory;
  version: number;
  serverTime: string;
  newbieWelcomeClaimed?: boolean;   // true nếu vừa được cấp gói chào mừng lần đầu
};

export type SaveSnapshot = {
  id: string;
  playerId: string;
  resources: ResourceBag;
  towns: TownSnapshot[];
  research?: {
    sword: number;
    stirrups: number;
    cannon: number;
    travel: number;
  };
  updatedAt: string;
};

export type ServerStatus = {
  ok: true;
  service: "island-empire-api";
  time: string;
};

export type AdminOverview = {
  players: number;
  saves: number;
  activeToday: number;
};

export type TerritoryInfo = {
  id: number;
  isIslet: boolean;
  biome: number;
  biomeName: string;
  rx: number;
  ry: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerName?: string | null;
  ownerFlagColor?: string;
  ownerEmblem?: string;
  ownerAllianceTag?: string;
  ownerAllianceEmblem?: string;
  settlementKind?: "capital" | "sub_capital" | "military";
  parentTerritoryId?: number;
  equippedCapitalSkin?: string | null;
  equippedDistrictSkin?: string | null;
  coastal?: boolean;
  connectionType?: "land" | "sea";
  isolated?: boolean;
  // Computed game balance fields
  clearingSeconds: number;   // time to clear (khai hoang)
  yieldGold: number;         // gold per second when owned
  yieldWood: number;         // wood per second when owned
  yieldStone: number;        // stone per second when owned
  yieldFood: number;         // food per second when owned
  yieldIron: number;         // iron per second when owned
  yieldCoal: number;         // coal per second when owned
  yieldSulfur: number;       // sulfur per second when owned
  yieldGems: number;         // gems per second when owned
  primaryResource: string;   // dominant resource label
  specialResources?: string[]; // strategic unlocks: horse pasture, harbor, etc.
  trainingSpecialty?: "infantry" | "cavalry" | "artillery";
};

export type AdminTerritoriesResult = {
  territories: TerritoryInfo[];
};

export type WorldTerritoriesResult = {
  territories: TerritoryInfo[];
};

export type ClaimTerritoryResult = {
  ok: true;
  territory: TerritoryInfo;
};

export type ActiveClearing = {
  territoryId: number;
  playerId: string;
  sourceTownId?: number;
  sourceTerritoryId?: number;
  settlers?: number;
  sourceX?: number;
  sourceY?: number;
  connectionType?: "land" | "sea";
  startedAt: string;
  arrivesAt?: string;
  completesAt: string;
};

export type MarchOrder = {
  id: string;
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
  startedAt: string;
  arrivesAt: string;
};

export type ActiveBattle = {
  id: string;
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
  usesShip?: boolean;
  startedAt: string;
  resolvesAt: string;
  durationSeconds: number;
  attackerMaxHp?: number;
  attackerCurrentHp?: number;
  defenderMaxHp?: number;
  defenderCurrentHp?: number;
  hpUpdatedAt?: string;
  battleVersion?: number;
};

export type MarchSourceOption = {
  townId: number;
  territoryId: number;
  valid: boolean;
  routeType: "land" | "sea" | null;
  usesShip: boolean;
  hasPort: boolean;
  distanceKm: number;
  travelSeconds: number;
  infantry: number;
  cavalry: number;
  artillery: number;
  troops: number;
  reason?: string;
};

export type MarchSourceOptionsResult = {
  ok: true;
  targetTerritoryId: number;
  recommendedTownId: number | null;
  sources: MarchSourceOption[];
};

export type GameStateResult = {
  playerId: string;
  activeMap?: "world" | "conquest";
  territories: TerritoryInfo[];
  clearings: ActiveClearing[];
  marches: MarchOrder[];
  battles?: ActiveBattle[];
  towns?: TownSnapshot[];
  resources: ResourceBag;
  resourceCapacity: ResourceBag;
  productionPerSecond: ResourceBag;
  offlineGain: ResourceBag;
  offlineSeconds: number;
  serverTime: string;
  resourceUpdatedAt: string;
  newbieShieldUntil?: string | null;
  playerProfile?: { flagColor: string; emblem: string } | null;
  nationStatus?: NationStatusSnapshot;
};

export type StartClearingResult = {
  ok: true;
  clearing: ActiveClearing;
};

export type CompleteClearingResult = ClaimTerritoryResult;

export type CreateMarchResult = {
  ok: true;
  duplicate?: boolean;
  march: MarchOrder;
  town?: any;
  newbieShieldUntil?: string | null;
};

export type RealtimeEvent =
  | { type: "hello"; playerId: string; serverTime: string }
  | { type: "world_chat"; playerId: string; playerName: string; message: string; sentAt: string }
  | {
      type: "player_state_updated";
      playerId: string;
      resources?: ResourceBag;
      resourceCapacity?: ResourceBag;
      productionPerSecond?: ResourceBag;
      resourceUpdatedAt?: string;
      serverTime?: string;
      towns?: TownSnapshot[];
      nationStatus?: NationStatusSnapshot;
      newbieShieldUntil?: string | null;
      reason?: string;
    }
  | { type: "territory_clearing_started"; clearing: ActiveClearing }
  | { type: "territory_clearing_cancelled"; territoryId: number; playerId: string }
  | { type: "territory_claimed"; territory: TerritoryInfo }
  | { type: "march_created"; march: MarchOrder; sourceTown?: any }
  | { type: "march_removed"; marchId: string; territoryId?: number; reason?: string }
  | { type: "battle_started"; battle: ActiveBattle; consumedMarchId?: string }
  | { type: "battle_state_updated"; battles: ActiveBattle[]; serverTime: string }
  | { type: "battle_resolved"; battleId?: string; territory?: TerritoryInfo; winner?: "attacker" | "defender"; report?: any }
  | {
      type: "troop_recovery_updated";
      playerId: string;
      towns: TownSnapshot[];
      resources: ResourceBag;
      resourceCapacity?: ResourceBag;
      productionPerSecond?: ResourceBag;
      updates: Array<{
        townId: number;
        territoryId: number;
        specialty: "infantry" | "cavalry" | "artillery";
        recovered: number;
        blockedReason: TownSnapshot["troopRecoveryBlockedReason"];
        nextTroopRecoveryAt?: string;
        troops: number;
        troopCapacity?: number;
        reservedTroops?: number;
      }>;
      serverTime: string;
    }
  | { type: "battle_report_created"; report: BattleReport; unreadCount: number; version: number; serverTime: string }
  | { type: "battle_report_read"; reportId?: string; unreadCount: number; version: number; serverTime: string }
  | { type: "mail_received"; mail: PlayerMail; unreadCount: number; version: number; serverTime: string }
  | { type: "mail_read"; mailId?: string; unreadCount: number; version: number; serverTime: string }
  | { type: "shop_purchase_completed"; purchase: ShopPurchase; inventory: ShopInventory; resources: ResourceBag; version: number; serverTime: string }
  | { type: "shop_inventory_updated"; inventory: ShopInventory; version: number; serverTime: string }
  | { type: "nation_state_updated"; state: NationStatusSnapshot; version: number; serverTime: string }
  | { type: "army_state_updated"; state: ArmyStateSnapshot; version: number; serverTime: string }
  | { type: "player_eliminated"; playerId: string; reason: "all_towns_captured" }
  | { type: "territories_pruned"; playerId: string; prunedTerritoryIds: number[] }
  | { type: "world_state_hint"; reason: "reconnect" | "server_resync" }
  | { type: "resync_required"; reason: "event_backlog" | "event_gap" };

export type RealtimeEnvelope = {
  seq: number;
  events: RealtimeEvent[];
};

export type AdminPlayersResult = {
  players: AdminPlayer[];
};

export type AllianceMember = {
  playerId: string;
  name: string;
  role: "leader" | "member";
};

export type AllianceInfo = {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  leaderId: string;
  members: AllianceMember[];
  memberCount: number;
  maxMembers: number;
  createdAt: string;
};

export type AllianceAid = {
  id: string;
  allianceId: string;
  fromPlayerId: string;
  fromName: string;
  toPlayerId: string;
  toName: string;
  resources: Partial<ResourceBag>;
  troops: number;
  status: "pending" | "claimed";
  createdAt: string;
  claimedAt?: string;
};

export type AllianceStateResult = {
  alliance: AllianceInfo | null;
  alliances: AllianceInfo[];
  aidInbox: AllianceAid[];
  aidOutbox: AllianceAid[];
  allianceTroopReserve: number;
};

export type AllianceActionResult = {
  ok: true;
  alliance: AllianceInfo | null;
};

export type ApiError = {
  error: string;
  message: string;
};

export interface BaseTerritory {
  id: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  biome: number;
  seed: number;
  isIslet: boolean;
  isWater?: boolean;
  coastal?: boolean; // true nếu ô này nằm ở ven biển (riên ngoài cùng của một lục địa)
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function generateWorldTerritories(): BaseTerritory[] {
  const territories: BaseTerritory[] = [];

  const baseRegions = [
    { x: 2500, y: 350, rx: 200, ry: 140, biome: 2, seed: 1 },
    { x: 2720, y: 300, rx: 220, ry: 150, biome: 2, seed: 2 },
    { x: 2940, y: 380, rx: 210, ry: 140, biome: 2, seed: 3 },
    { x: 3160, y: 320, rx: 220, ry: 150, biome: 2, seed: 4 },
    { x: 3380, y: 400, rx: 210, ry: 140, biome: 2, seed: 5 },
    { x: 3600, y: 350, rx: 220, ry: 150, biome: 2, seed: 6 },
    { x: 3820, y: 420, rx: 200, ry: 140, biome: 2, seed: 7 },
    { x: 4040, y: 380, rx: 210, ry: 140, biome: 2, seed: 8 },
    { x: 2400, y: 1500, rx: 220, ry: 160, biome: 0, seed: 9 },
    { x: 2620, y: 1450, rx: 230, ry: 165, biome: 6, seed: 10 },
    { x: 2840, y: 1600, rx: 240, ry: 170, biome: 0, seed: 11 },
    { x: 3060, y: 1500, rx: 220, ry: 160, biome: 6, seed: 12 },
    { x: 3280, y: 1650, rx: 230, ry: 165, biome: 0, seed: 13 },
    { x: 3500, y: 1550, rx: 220, ry: 160, biome: 7, seed: 14 },
    { x: 3720, y: 1700, rx: 240, ry: 170, biome: 0, seed: 15 },
    { x: 2500, y: 2100, rx: 210, ry: 150, biome: 0, seed: 16 },
    { x: 2720, y: 2250, rx: 230, ry: 160, biome: 6, seed: 17 },
    { x: 2940, y: 2200, rx: 220, ry: 155, biome: 0, seed: 18 },
    { x: 3160, y: 2350, rx: 240, ry: 170, biome: 6, seed: 19 },
    { x: 3380, y: 2250, rx: 230, ry: 160, biome: 0, seed: 20 },
    { x: 3600, y: 2400, rx: 240, ry: 170, biome: 7, seed: 21 },
    { x: 3820, y: 2300, rx: 220, ry: 155, biome: 0, seed: 22 },
    { x: 450, y: 4200, rx: 210, ry: 150, biome: 3, seed: 23 },
    { x: 670, y: 4150, rx: 220, ry: 160, biome: 3, seed: 24 },
    { x: 890, y: 4250, rx: 210, ry: 150, biome: 3, seed: 25 },
    { x: 400, y: 4600, rx: 220, ry: 160, biome: 3, seed: 26 },
    { x: 620, y: 4650, rx: 230, ry: 165, biome: 3, seed: 27 },
    { x: 840, y: 4550, rx: 210, ry: 150, biome: 3, seed: 28 },
    { x: 550, y: 4950, rx: 220, ry: 160, biome: 3, seed: 29 },
    { x: 770, y: 5000, rx: 210, ry: 150, biome: 3, seed: 30 },
    { x: 6800, y: 4300, rx: 220, ry: 160, biome: 1, seed: 31 },
    { x: 7020, y: 4250, rx: 230, ry: 165, biome: 1, seed: 32 },
    { x: 7240, y: 4350, rx: 210, ry: 150, biome: 1, seed: 33 },
    { x: 7460, y: 4300, rx: 200, ry: 145, biome: 1, seed: 34 },
    { x: 6950, y: 4700, rx: 220, ry: 160, biome: 1, seed: 35 },
    { x: 7170, y: 4750, rx: 230, ry: 165, biome: 1, seed: 36 },
    { x: 7390, y: 4650, rx: 210, ry: 150, biome: 1, seed: 37 },
    { x: 7100, y: 5050, rx: 220, ry: 160, biome: 1, seed: 38 },
    { x: 7320, y: 5100, rx: 210, ry: 150, biome: 1, seed: 39 },
    { x: 6800, y: 350, rx: 180, ry: 130, biome: 4, seed: 40 },
    { x: 7100, y: 300, rx: 170, ry: 125, biome: 4, seed: 41 },
    { x: 7400, y: 400, rx: 190, ry: 140, biome: 5, seed: 42 },
    { x: 7700, y: 350, rx: 180, ry: 135, biome: 5, seed: 43 },
    { x: 6950, y: 700, rx: 185, ry: 140, biome: 4, seed: 44 },
    { x: 7250, y: 750, rx: 190, ry: 140, biome: 5, seed: 45 },
    { x: 7550, y: 650, rx: 170, ry: 125, biome: 4, seed: 46 },
    { x: 7300, y: 900, rx: 160, ry: 120, biome: 5, seed: 47 },
    { x: 3500, y: 4300, rx: 220, ry: 160, biome: 7, seed: 48 },
    { x: 3720, y: 4250, rx: 230, ry: 165, biome: 7, seed: 49 },
    { x: 3940, y: 4400, rx: 210, ry: 150, biome: 7, seed: 50 },
    { x: 4160, y: 4350, rx: 240, ry: 170, biome: 7, seed: 51 },
    { x: 4380, y: 4450, rx: 220, ry: 160, biome: 7, seed: 52 },
    { x: 3650, y: 4700, rx: 230, ry: 165, biome: 7, seed: 53 },
    { x: 3870, y: 4800, rx: 240, ry: 170, biome: 7, seed: 54 },
    { x: 4090, y: 4750, rx: 220, ry: 160, biome: 7, seed: 55 },
    { x: 4310, y: 4850, rx: 230, ry: 165, biome: 7, seed: 56 },
    { x: 4530, y: 4700, rx: 210, ry: 150, biome: 7, seed: 57 },
    { x: 450, y: 300, rx: 140, ry: 105, biome: 0, seed: 58 },
    { x: 750, y: 250, rx: 150, ry: 110, biome: 1, seed: 59 },
    { x: 1050, y: 350, rx: 130, ry: 100, biome: 0, seed: 60 },
    { x: 400, y: 600, rx: 145, ry: 110, biome: 1, seed: 61 },
    { x: 700, y: 650, rx: 160, ry: 120, biome: 0, seed: 62 },
    { x: 1000, y: 550, rx: 135, ry: 105, biome: 1, seed: 63 },
    { x: 550, y: 850, rx: 150, ry: 115, biome: 0, seed: 64 },
    { x: 850, y: 900, rx: 140, ry: 105, biome: 1, seed: 65 },
    { x: 300, y: 450, rx: 120, ry: 95, biome: 0, seed: 66 },
    { x: 1150, y: 480, rx: 130, ry: 100, biome: 1, seed: 67 },
    { x: 480, y: 1150, rx: 140, ry: 105, biome: 0, seed: 68 },
    { x: 780, y: 1200, rx: 150, ry: 110, biome: 1, seed: 69 },
    { x: 7000, y: 1550, rx: 210, ry: 150, biome: 4, seed: 70 },
    { x: 7220, y: 1500, rx: 220, ry: 160, biome: 4, seed: 71 },
    { x: 7440, y: 1600, rx: 210, ry: 150, biome: 5, seed: 72 },
    { x: 7050, y: 1950, rx: 220, ry: 160, biome: 5, seed: 73 },
    { x: 7270, y: 2000, rx: 230, ry: 165, biome: 1, seed: 74 },
    { x: 7490, y: 1900, rx: 210, ry: 150, biome: 1, seed: 75 },
    { x: 7100, y: 2350, rx: 220, ry: 160, biome: 4, seed: 76 },
    { x: 7320, y: 2400, rx: 210, ry: 150, biome: 5, seed: 77 },
    { x: 7540, y: 2300, rx: 200, ry: 145, biome: 1, seed: 78 },
    { x: 7400, y: 2750, rx: 220, ry: 160, biome: 4, seed: 79 },
    { x: 300, y: 2000, rx: 210, ry: 150, biome: 4, seed: 80 },
    { x: 520, y: 1950, rx: 220, ry: 160, biome: 4, seed: 81 },
    { x: 740, y: 2050, rx: 210, ry: 150, biome: 4, seed: 82 },
    { x: 960, y: 2000, rx: 200, ry: 145, biome: 4, seed: 83 },
    { x: 410, y: 2350, rx: 220, ry: 160, biome: 4, seed: 84 },
    { x: 630, y: 2400, rx: 230, ry: 165, biome: 4, seed: 85 },
    { x: 850, y: 2300, rx: 210, ry: 150, biome: 4, seed: 86 },
    { x: 740, y: 2700, rx: 220, ry: 160, biome: 4, seed: 87 },
    { x: 6500, y: 2900, rx: 210, ry: 150, biome: 5, seed: 88 },
    { x: 6720, y: 2850, rx: 220, ry: 160, biome: 5, seed: 89 },
    { x: 6940, y: 2950, rx: 210, ry: 150, biome: 5, seed: 90 },
    { x: 7160, y: 2900, rx: 200, ry: 145, biome: 5, seed: 91 },
    { x: 6610, y: 3250, rx: 220, ry: 160, biome: 5, seed: 92 },
    { x: 6830, y: 3300, rx: 230, ry: 165, biome: 5, seed: 93 },
    { x: 7050, y: 3200, rx: 210, ry: 150, biome: 5, seed: 94 },
    { x: 7270, y: 3350, rx: 220, ry: 160, biome: 5, seed: 95 },
    { x: 500, y: 1500, rx: 210, ry: 150, biome: 2, seed: 150 },
    { x: 720, y: 1450, rx: 220, ry: 160, biome: 2, seed: 151 },
    { x: 940, y: 1550, rx: 210, ry: 150, biome: 2, seed: 152 },
    { x: 1160, y: 1500, rx: 220, ry: 160, biome: 2, seed: 153 },
    { x: 1380, y: 1600, rx: 210, ry: 150, biome: 2, seed: 154 },
    { x: 610, y: 1850, rx: 230, ry: 165, biome: 2, seed: 155 },
    { x: 830, y: 1900, rx: 220, ry: 160, biome: 2, seed: 156 },
    { x: 1050, y: 1800, rx: 240, ry: 170, biome: 2, seed: 157 },
    { x: 1270, y: 1950, rx: 230, ry: 165, biome: 2, seed: 158 },
    { x: 940, y: 2200, rx: 220, ry: 160, biome: 2, seed: 159 },
    { x: 2300, y: 5200, rx: 180, ry: 130, biome: 4, seed: 160 },
    { x: 2520, y: 5150, rx: 190, ry: 140, biome: 4, seed: 161 },
    { x: 2740, y: 5250, rx: 185, ry: 135, biome: 5, seed: 162 },
    { x: 2960, y: 5200, rx: 180, ry: 130, biome: 5, seed: 163 },
    { x: 2410, y: 5550, rx: 190, ry: 140, biome: 4, seed: 164 },
    { x: 2630, y: 5600, rx: 200, ry: 145, biome: 5, seed: 165 },
    { x: 2850, y: 5500, rx: 185, ry: 135, biome: 4, seed: 166 },
    { x: 3070, y: 5550, rx: 180, ry: 130, biome: 5, seed: 167 },
    { x: 2740, y: 5800, rx: 190, ry: 140, biome: 4, seed: 168 },
    { x: 2960, y: 5850, rx: 185, ry: 135, biome: 5, seed: 169 },
    { x: 6100, y: 5200, rx: 210, ry: 150, biome: 6, seed: 170 },
    { x: 6320, y: 5150, rx: 220, ry: 160, biome: 6, seed: 171 },
    { x: 6540, y: 5250, rx: 210, ry: 150, biome: 0, seed: 172 },
    { x: 6760, y: 5200, rx: 230, ry: 165, biome: 0, seed: 173 },
    { x: 6210, y: 5550, rx: 220, ry: 160, biome: 6, seed: 174 },
    { x: 6430, y: 5600, rx: 230, ry: 165, biome: 0, seed: 175 },
    { x: 6650, y: 5500, rx: 210, ry: 150, biome: 6, seed: 176 },
    { x: 6870, y: 5550, rx: 220, ry: 160, biome: 0, seed: 177 },
    { x: 6540, y: 5800, rx: 230, ry: 165, biome: 6, seed: 178 },
    { x: 6760, y: 5850, rx: 210, ry: 150, biome: 0, seed: 179 },
    { x: 7100, y: 1000, rx: 200, ry: 140, biome: 4, seed: 200 },
    { x: 7320, y: 950, rx: 210, ry: 150, biome: 4, seed: 201 },
    { x: 7540, y: 1050, rx: 220, ry: 160, biome: 5, seed: 202 },
    { x: 7760, y: 1000, rx: 200, ry: 145, biome: 5, seed: 203 },
    { x: 7210, y: 1300, rx: 210, ry: 150, biome: 4, seed: 204 },
    { x: 7430, y: 1350, rx: 220, ry: 160, biome: 5, seed: 205 },
    { x: 7650, y: 1250, rx: 210, ry: 150, biome: 4, seed: 206 },
    { x: 7870, y: 1300, rx: 200, ry: 145, biome: 5, seed: 207 },
    { x: 7320, y: 1600, rx: 210, ry: 150, biome: 4, seed: 208 },
    { x: 7540, y: 1650, rx: 220, ry: 160, biome: 5, seed: 209 },
    { x: 7760, y: 1550, rx: 210, ry: 150, biome: 4, seed: 210 },
    { x: 7540, y: 1900, rx: 200, ry: 145, biome: 5, seed: 211 },
    { x: 500, y: 3000, rx: 180, ry: 130, biome: 7, seed: 212 },
    { x: 720, y: 2950, rx: 190, ry: 140, biome: 7, seed: 213 },
    { x: 940, y: 3050, rx: 185, ry: 135, biome: 7, seed: 214 },
    { x: 1160, y: 3000, rx: 180, ry: 130, biome: 7, seed: 215 },
    { x: 610, y: 3350, rx: 190, ry: 140, biome: 7, seed: 216 },
    { x: 830, y: 3400, rx: 200, ry: 145, biome: 7, seed: 217 },
    { x: 1050, y: 3300, rx: 185, ry: 135, biome: 7, seed: 218 },
    { x: 1270, y: 3350, rx: 180, ry: 130, biome: 7, seed: 219 },
    { x: 720, y: 3700, rx: 190, ry: 140, biome: 7, seed: 220 },
    { x: 940, y: 3750, rx: 185, ry: 135, biome: 7, seed: 221 },
    { x: 1160, y: 3650, rx: 180, ry: 130, biome: 7, seed: 222 },
    { x: 940, y: 4000, rx: 190, ry: 140, biome: 7, seed: 223 },
    { x: 1200, y: 4500, rx: 210, ry: 150, biome: 3, seed: 224 },
    { x: 1420, y: 4450, rx: 220, ry: 160, biome: 3, seed: 225 },
    { x: 1640, y: 4550, rx: 210, ry: 150, biome: 1, seed: 226 },
    { x: 1860, y: 4500, rx: 230, ry: 165, biome: 1, seed: 227 },
    { x: 1310, y: 4850, rx: 220, ry: 160, biome: 3, seed: 228 },
    { x: 1530, y: 4900, rx: 230, ry: 165, biome: 1, seed: 229 },
    { x: 1750, y: 4800, rx: 210, ry: 150, biome: 3, seed: 230 },
    { x: 1970, y: 4850, rx: 220, ry: 160, biome: 1, seed: 231 },
    { x: 1540, y: 5200, rx: 230, ry: 165, biome: 3, seed: 232 },
    { x: 1760, y: 5250, rx: 210, ry: 150, biome: 1, seed: 233 },
    { x: 1980, y: 5150, rx: 220, ry: 160, biome: 3, seed: 234 },
    { x: 1760, y: 5550, rx: 230, ry: 165, biome: 1, seed: 235 },
    { x: 5100, y: 4400, rx: 210, ry: 150, biome: 6, seed: 236 },
    { x: 5320, y: 4350, rx: 220, ry: 160, biome: 6, seed: 237 },
    { x: 5540, y: 4450, rx: 210, ry: 150, biome: 0, seed: 238 },
    { x: 5760, y: 4400, rx: 230, ry: 165, biome: 0, seed: 239 },
    { x: 5210, y: 4750, rx: 220, ry: 160, biome: 6, seed: 240 },
    { x: 5430, y: 4800, rx: 230, ry: 165, biome: 0, seed: 241 },
    { x: 5650, y: 4700, rx: 210, ry: 150, biome: 6, seed: 242 },
    { x: 5870, y: 4750, rx: 220, ry: 160, biome: 0, seed: 243 },
    { x: 5320, y: 5100, rx: 230, ry: 165, biome: 6, seed: 244 },
    { x: 5540, y: 5150, rx: 210, ry: 150, biome: 0, seed: 245 },
    { x: 5760, y: 5050, rx: 220, ry: 160, biome: 6, seed: 246 },
    { x: 5430, y: 5450, rx: 230, ry: 165, biome: 0, seed: 247 },
    { x: 5650, y: 5500, rx: 210, ry: 150, biome: 6, seed: 248 },
    { x: 5870, y: 5400, rx: 220, ry: 160, biome: 0, seed: 249 },
    { x: 4200, y: 500, rx: 220, ry: 155, biome: 2, seed: 300 },
    { x: 4420, y: 450, rx: 210, ry: 150, biome: 2, seed: 301 },
    { x: 4640, y: 550, rx: 230, ry: 160, biome: 2, seed: 302 },
    { x: 4860, y: 500, rx: 220, ry: 155, biome: 0, seed: 303 },
    { x: 5080, y: 600, rx: 210, ry: 150, biome: 0, seed: 304 },
    { x: 5300, y: 540, rx: 230, ry: 165, biome: 0, seed: 305 },
    { x: 5520, y: 620, rx: 220, ry: 155, biome: 6, seed: 306 },
    { x: 5740, y: 560, rx: 210, ry: 150, biome: 6, seed: 307 },
    { x: 4310, y: 850, rx: 230, ry: 165, biome: 0, seed: 308 },
    { x: 4530, y: 900, rx: 220, ry: 155, biome: 6, seed: 309 },
    { x: 4750, y: 850, rx: 210, ry: 150, biome: 0, seed: 310 },
    { x: 4970, y: 950, rx: 230, ry: 165, biome: 6, seed: 311 },
    { x: 5190, y: 880, rx: 220, ry: 155, biome: 0, seed: 312 },
    { x: 4200, y: 3100, rx: 220, ry: 160, biome: 0, seed: 313 },
    { x: 4420, y: 3050, rx: 230, ry: 165, biome: 7, seed: 314 },
    { x: 4640, y: 3200, rx: 210, ry: 150, biome: 0, seed: 315 },
    { x: 4860, y: 3150, rx: 220, ry: 160, biome: 7, seed: 316 },
    { x: 5080, y: 3250, rx: 230, ry: 165, biome: 0, seed: 317 },
    { x: 5300, y: 3200, rx: 220, ry: 160, biome: 6, seed: 318 },
    { x: 4310, y: 3500, rx: 230, ry: 165, biome: 7, seed: 319 },
    { x: 4530, y: 3550, rx: 220, ry: 160, biome: 0, seed: 320 },
    { x: 4750, y: 3450, rx: 210, ry: 150, biome: 7, seed: 321 },
    { x: 4970, y: 3500, rx: 230, ry: 165, biome: 0, seed: 322 },
    { x: 5190, y: 3400, rx: 220, ry: 160, biome: 6, seed: 323 },
    { x: 5410, y: 3500, rx: 210, ry: 150, biome: 7, seed: 324 },
    { x: 5700, y: 1200, rx: 220, ry: 155, biome: 1, seed: 325 },
    { x: 5920, y: 1150, rx: 210, ry: 150, biome: 1, seed: 326 },
    { x: 6140, y: 1250, rx: 230, ry: 165, biome: 1, seed: 327 },
    { x: 6360, y: 1200, rx: 220, ry: 155, biome: 1, seed: 328 },
    { x: 5810, y: 1550, rx: 230, ry: 165, biome: 1, seed: 329 },
    { x: 6030, y: 1600, rx: 220, ry: 155, biome: 3, seed: 330 },
    { x: 6250, y: 1500, rx: 210, ry: 150, biome: 3, seed: 331 },
    { x: 6470, y: 1550, rx: 230, ry: 165, biome: 1, seed: 332 },
    { x: 5920, y: 1900, rx: 220, ry: 155, biome: 3, seed: 333 },
    { x: 6140, y: 1950, rx: 210, ry: 150, biome: 3, seed: 334 },
    { x: 1800, y: 300, rx: 210, ry: 148, biome: 2, seed: 335 },
    { x: 2020, y: 250, rx: 220, ry: 155, biome: 2, seed: 336 },
    { x: 2240, y: 350, rx: 215, ry: 150, biome: 2, seed: 337 },
    { x: 1910, y: 620, rx: 220, ry: 155, biome: 2, seed: 338 },
    { x: 2130, y: 680, rx: 210, ry: 148, biome: 2, seed: 339 },
    { x: 2350, y: 580, rx: 225, ry: 158, biome: 0, seed: 340 },
    { x: 1800, y: 950, rx: 210, ry: 148, biome: 0, seed: 341 },
    { x: 2020, y: 1000, rx: 220, ry: 155, biome: 0, seed: 342 },
    { x: 1200, y: 3200, rx: 200, ry: 142, biome: 3, seed: 343 },
    { x: 1420, y: 3150, rx: 215, ry: 152, biome: 3, seed: 344 },
    { x: 1640, y: 3250, rx: 210, ry: 148, biome: 3, seed: 345 },
    { x: 1860, y: 3200, rx: 220, ry: 155, biome: 1, seed: 346 },
    { x: 1310, y: 3550, rx: 215, ry: 152, biome: 3, seed: 347 },
    { x: 1530, y: 3600, rx: 210, ry: 148, biome: 1, seed: 348 },
    { x: 1750, y: 3500, rx: 220, ry: 155, biome: 3, seed: 349 },
    { x: 1970, y: 3550, rx: 215, ry: 152, biome: 1, seed: 350 },
    { x: 1420, y: 3900, rx: 210, ry: 148, biome: 3, seed: 351 },
    { x: 1640, y: 3950, rx: 220, ry: 155, biome: 3, seed: 352 },
    { x: 2100, y: 4700, rx: 215, ry: 152, biome: 7, seed: 353 },
    { x: 2320, y: 4650, rx: 210, ry: 148, biome: 7, seed: 354 },
    { x: 2540, y: 4750, rx: 220, ry: 155, biome: 7, seed: 355 },
    { x: 2760, y: 4700, rx: 215, ry: 152, biome: 0, seed: 356 },
    { x: 2210, y: 5050, rx: 210, ry: 148, biome: 7, seed: 357 },
    { x: 2430, y: 5100, rx: 220, ry: 155, biome: 7, seed: 358 },
    { x: 2650, y: 5000, rx: 215, ry: 152, biome: 0, seed: 359 },
    { x: 2870, y: 5050, rx: 210, ry: 148, biome: 7, seed: 360 },
    { x: 2320, y: 5400, rx: 220, ry: 155, biome: 7, seed: 361 },
    { x: 2540, y: 5450, rx: 215, ry: 152, biome: 7, seed: 362 },
    { x: 3900, y: 350, rx: 185, ry: 132, biome: 4, seed: 363 },
    { x: 4080, y: 300, rx: 195, ry: 138, biome: 4, seed: 364 },
    { x: 4260, y: 400, rx: 190, ry: 135, biome: 5, seed: 365 },
    { x: 4080, y: 620, rx: 195, ry: 138, biome: 5, seed: 366 },
    { x: 4260, y: 680, rx: 185, ry: 132, biome: 4, seed: 367 },
    { x: 4440, y: 580, rx: 200, ry: 142, biome: 5, seed: 368 },
    { x: 5900, y: 350, rx: 185, ry: 132, biome: 5, seed: 369 },
    { x: 6080, y: 300, rx: 195, ry: 138, biome: 5, seed: 370 },
    { x: 6260, y: 400, rx: 190, ry: 135, biome: 5, seed: 371 },
    { x: 6440, y: 340, rx: 185, ry: 132, biome: 5, seed: 372 },
    { x: 5990, y: 650, rx: 195, ry: 138, biome: 5, seed: 373 },
    { x: 6170, y: 700, rx: 190, ry: 135, biome: 4, seed: 374 },
    { x: 6350, y: 640, rx: 185, ry: 132, biome: 4, seed: 375 },
    { x: 6120, y: 950, rx: 195, ry: 138, biome: 5, seed: 376 },
    { x: 1700, y: 1500, rx: 220, ry: 158, biome: 0, seed: 377 },
    { x: 1920, y: 1450, rx: 215, ry: 152, biome: 0, seed: 378 },
    { x: 2140, y: 1550, rx: 225, ry: 160, biome: 0, seed: 379 },
    { x: 2360, y: 1500, rx: 215, ry: 152, biome: 6, seed: 380 },
    { x: 1810, y: 1850, rx: 220, ry: 158, biome: 6, seed: 381 },
    { x: 2030, y: 1900, rx: 215, ry: 152, biome: 0, seed: 382 },
    { x: 2250, y: 1800, rx: 225, ry: 160, biome: 6, seed: 383 },
    { x: 2470, y: 1850, rx: 215, ry: 152, biome: 0, seed: 384 },
    { x: 1920, y: 2200, rx: 220, ry: 158, biome: 0, seed: 385 },
    { x: 2140, y: 2250, rx: 215, ry: 152, biome: 7, seed: 386 },
    { x: 2360, y: 2150, rx: 225, ry: 160, biome: 0, seed: 387 },
    { x: 1700, y: 2500, rx: 220, ry: 158, biome: 6, seed: 388 },
    { x: 1920, y: 2550, rx: 215, ry: 152, biome: 0, seed: 389 },
    { x: 4100, y: 1650, rx: 215, ry: 152, biome: 1, seed: 390 },
    { x: 4320, y: 1600, rx: 220, ry: 158, biome: 1, seed: 391 },
    { x: 4540, y: 1700, rx: 210, ry: 148, biome: 1, seed: 392 },
    { x: 4760, y: 1650, rx: 225, ry: 160, biome: 1, seed: 393 },
    { x: 4210, y: 2000, rx: 215, ry: 152, biome: 1, seed: 394 },
    { x: 4430, y: 2050, rx: 220, ry: 158, biome: 3, seed: 395 },
    { x: 4650, y: 1950, rx: 210, ry: 148, biome: 1, seed: 396 },
    { x: 4870, y: 2000, rx: 225, ry: 160, biome: 3, seed: 397 },
    { x: 4320, y: 2400, rx: 215, ry: 152, biome: 3, seed: 398 },
    { x: 4540, y: 2450, rx: 220, ry: 158, biome: 1, seed: 399 },
    { x: 4760, y: 2350, rx: 210, ry: 148, biome: 3, seed: 400 },
    { x: 2600, y: 3000, rx: 220, ry: 158, biome: 6, seed: 401 },
    { x: 2820, y: 2950, rx: 215, ry: 152, biome: 6, seed: 402 },
    { x: 3040, y: 3050, rx: 225, ry: 160, biome: 6, seed: 403 },
    { x: 3260, y: 3000, rx: 215, ry: 152, biome: 0, seed: 404 },
    { x: 2710, y: 3350, rx: 220, ry: 158, biome: 0, seed: 405 },
    { x: 2930, y: 3400, rx: 215, ry: 152, biome: 6, seed: 406 },
    { x: 3150, y: 3300, rx: 225, ry: 160, biome: 0, seed: 407 },
    { x: 3370, y: 3350, rx: 215, ry: 152, biome: 6, seed: 408 },
    { x: 2820, y: 3700, rx: 220, ry: 158, biome: 6, seed: 409 },
    { x: 3040, y: 3750, rx: 215, ry: 152, biome: 0, seed: 410 },
    { x: 3260, y: 3650, rx: 225, ry: 160, biome: 6, seed: 411 },
    { x: 5800, y: 2200, rx: 190, ry: 135, biome: 4, seed: 412 },
    { x: 6020, y: 2150, rx: 200, ry: 142, biome: 4, seed: 413 },
    { x: 6240, y: 2250, rx: 190, ry: 135, biome: 5, seed: 414 },
    { x: 6460, y: 2200, rx: 200, ry: 142, biome: 5, seed: 415 },
    { x: 5910, y: 2550, rx: 195, ry: 138, biome: 5, seed: 416 },
    { x: 6130, y: 2600, rx: 190, ry: 135, biome: 4, seed: 417 },
    { x: 6350, y: 2500, rx: 200, ry: 142, biome: 5, seed: 418 },
    { x: 6570, y: 2550, rx: 190, ry: 135, biome: 4, seed: 419 },
    { x: 6020, y: 2900, rx: 195, ry: 138, biome: 4, seed: 420 },
    { x: 6240, y: 2950, rx: 190, ry: 135, biome: 5, seed: 421 },
    { x: 5500, y: 3600, rx: 215, ry: 152, biome: 0, seed: 422 },
    { x: 5720, y: 3550, rx: 220, ry: 158, biome: 0, seed: 423 },
    { x: 5940, y: 3650, rx: 210, ry: 148, biome: 6, seed: 424 },
    { x: 6160, y: 3600, rx: 220, ry: 158, biome: 0, seed: 425 },
    { x: 5610, y: 3900, rx: 215, ry: 152, biome: 6, seed: 426 },
    { x: 5830, y: 3950, rx: 220, ry: 158, biome: 0, seed: 427 },
    { x: 6050, y: 3850, rx: 210, ry: 148, biome: 6, seed: 428 },
    { x: 6270, y: 3900, rx: 215, ry: 152, biome: 0, seed: 429 },
    { x: 5720, y: 4250, rx: 220, ry: 158, biome: 0, seed: 430 },
    { x: 5940, y: 4300, rx: 215, ry: 152, biome: 6, seed: 431 },
    { x: 6900, y: 3700, rx: 210, ry: 148, biome: 3, seed: 432 },
    { x: 7120, y: 3650, rx: 220, ry: 158, biome: 3, seed: 433 },
    { x: 7340, y: 3750, rx: 215, ry: 152, biome: 3, seed: 434 },
    { x: 7560, y: 3700, rx: 210, ry: 148, biome: 1, seed: 435 },
    { x: 7010, y: 4050, rx: 220, ry: 158, biome: 1, seed: 436 },
    { x: 7230, y: 4100, rx: 215, ry: 152, biome: 3, seed: 437 },
    { x: 7450, y: 4000, rx: 210, ry: 148, biome: 1, seed: 438 },
    { x: 7670, y: 4050, rx: 220, ry: 158, biome: 3, seed: 439 },
    { x: 7120, y: 4400, rx: 215, ry: 152, biome: 3, seed: 440 },
    { x: 7340, y: 4450, rx: 210, ry: 148, biome: 1, seed: 441 },
    { x: 5000, y: 5300, rx: 215, ry: 152, biome: 1, seed: 442 },
    { x: 5220, y: 5250, rx: 220, ry: 158, biome: 1, seed: 443 },
    { x: 5440, y: 5350, rx: 210, ry: 148, biome: 1, seed: 444 },
    { x: 5660, y: 5300, rx: 220, ry: 158, biome: 3, seed: 445 },
    { x: 5110, y: 5650, rx: 215, ry: 152, biome: 3, seed: 446 },
    { x: 5330, y: 5700, rx: 210, ry: 148, biome: 1, seed: 447 },
    { x: 5550, y: 5600, rx: 220, ry: 158, biome: 3, seed: 448 },
    { x: 5220, y: 5950, rx: 215, ry: 152, biome: 1, seed: 449 },
    { x: 5440, y: 6000, rx: 210, ry: 148, biome: 3, seed: 450 },
    { x: 3200, y: 5900, rx: 215, ry: 152, biome: 2, seed: 451 },
    { x: 3420, y: 5850, rx: 220, ry: 158, biome: 2, seed: 452 },
    { x: 3640, y: 5950, rx: 210, ry: 148, biome: 2, seed: 453 },
    { x: 3860, y: 5900, rx: 220, ry: 158, biome: 2, seed: 454 },
    { x: 3310, y: 6200, rx: 215, ry: 152, biome: 2, seed: 455 },
    { x: 3530, y: 6250, rx: 210, ry: 148, biome: 2, seed: 456 },
    { x: 3750, y: 6150, rx: 220, ry: 158, biome: 2, seed: 457 },
    { x: 3970, y: 6200, rx: 215, ry: 152, biome: 2, seed: 458 },
    { x: 4400, y: 5700, rx: 190, ry: 135, biome: 4, seed: 459 },
    { x: 4600, y: 5650, rx: 200, ry: 142, biome: 4, seed: 460 },
    { x: 4800, y: 5750, rx: 190, ry: 135, biome: 5, seed: 461 },
    { x: 4500, y: 6000, rx: 200, ry: 142, biome: 5, seed: 462 },
    { x: 4700, y: 6050, rx: 190, ry: 135, biome: 4, seed: 463 },
    { x: 4900, y: 5950, rx: 200, ry: 142, biome: 5, seed: 464 },
    { x: 4600, y: 6300, rx: 195, ry: 138, biome: 4, seed: 465 },
    { x: 4800, y: 6350, rx: 190, ry: 135, biome: 5, seed: 466 }
  ];

  const baseIslets = [
    { x: 200, y: 200, rx: 50, ry: 40, biome: 2, seed: 100 },
    { x: 600, y: 100, rx: 45, ry: 35, biome: 2, seed: 101 },
    { x: 1200, y: 150, rx: 55, ry: 45, biome: 2, seed: 102 },
    { x: 1600, y: 100, rx: 48, ry: 38, biome: 2, seed: 103 },
    { x: 3500, y: 150, rx: 52, ry: 42, biome: 4, seed: 104 },
    { x: 4900, y: 100, rx: 45, ry: 35, biome: 4, seed: 105 },
    { x: 4950, y: 600, rx: 60, ry: 48, biome: 5, seed: 106 },
    { x: 4900, y: 1400, rx: 50, ry: 40, biome: 1, seed: 107 },
    { x: 4980, y: 2200, rx: 55, ry: 45, biome: 4, seed: 108 },
    { x: 4900, y: 3000, rx: 48, ry: 38, biome: 1, seed: 109 },
    { x: 4950, y: 3700, rx: 52, ry: 42, biome: 1, seed: 110 },
    { x: 3200, y: 3750, rx: 45, ry: 35, biome: 7, seed: 111 },
    { x: 2200, y: 3780, rx: 60, ry: 48, biome: 7, seed: 112 },
    { x: 1200, y: 3750, rx: 50, ry: 40, biome: 7, seed: 113 },
    { x: 100, y: 3700, rx: 55, ry: 45, biome: 3, seed: 114 },
    { x: 150, y: 2900, rx: 48, ry: 38, biome: 3, seed: 115 },
    { x: 100, y: 2100, rx: 52, ry: 42, biome: 3, seed: 116 },
    { x: 150, y: 1300, rx: 45, ry: 35, biome: 0, seed: 117 },
    { x: 200, y: 700, rx: 60, ry: 48, biome: 0, seed: 118 },
    { x: 100, y: 100, rx: 50, ry: 40, biome: 2, seed: 119 },
    { x: 2500, y: 900, rx: 70, ry: 50, biome: 6, seed: 120 },
    { x: 3500, y: 1600, rx: 65, ry: 48, biome: 7, seed: 121 },
    { x: 1500, y: 2500, rx: 58, ry: 44, biome: 0, seed: 122 },
    { x: 800, y: 1800, rx: 62, ry: 46, biome: 1, seed: 123 },
    { x: 4200, y: 2500, rx: 68, ry: 52, biome: 4, seed: 124 },
    { x: 2800, y: 2200, rx: 54, ry: 42, biome: 0, seed: 125 },
    { x: 3200, y: 2500, rx: 60, ry: 48, biome: 6, seed: 126 },
    { x: 1100, y: 2200, rx: 48, ry: 38, biome: 1, seed: 127 },
    { x: 2700, y: 700, rx: 52, ry: 42, biome: 2, seed: 128 },
    { x: 3100, y: 800, rx: 58, ry: 44, biome: 6, seed: 129 },
    { x: 3700, y: 1100, rx: 62, ry: 46, biome: 7, seed: 130 },
    { x: 1100, y: 1500, rx: 50, ry: 40, biome: 0, seed: 131 },
    { x: 900, y: 1300, rx: 55, ry: 45, biome: 1, seed: 132 },
    { x: 1300, y: 900, rx: 48, ry: 38, biome: 7, seed: 133 },
    { x: 300, y: 2300, rx: 52, ry: 42, biome: 3, seed: 134 },
    { x: 4400, y: 200, rx: 58, ry: 44, biome: 4, seed: 500 },
    { x: 5200, y: 150, rx: 52, ry: 40, biome: 5, seed: 501 },
    { x: 5600, y: 250, rx: 60, ry: 46, biome: 4, seed: 502 },
    { x: 6000, y: 200, rx: 55, ry: 42, biome: 5, seed: 503 },
    { x: 6400, y: 180, rx: 50, ry: 38, biome: 4, seed: 504 },
    { x: 6800, y: 200, rx: 58, ry: 44, biome: 5, seed: 505 },
    { x: 7200, y: 150, rx: 52, ry: 40, biome: 4, seed: 506 },
    { x: 7600, y: 220, rx: 60, ry: 46, biome: 5, seed: 507 },
    { x: 7900, y: 180, rx: 55, ry: 42, biome: 4, seed: 508 },
    { x: 200, y: 5000, rx: 50, ry: 38, biome: 3, seed: 509 },
    { x: 150, y: 5600, rx: 58, ry: 44, biome: 3, seed: 510 },
    { x: 200, y: 6200, rx: 52, ry: 40, biome: 2, seed: 511 },
    { x: 700, y: 6100, rx: 60, ry: 46, biome: 2, seed: 512 },
    { x: 1200, y: 6200, rx: 55, ry: 42, biome: 2, seed: 513 },
    { x: 1800, y: 6100, rx: 50, ry: 38, biome: 7, seed: 514 },
    { x: 2300, y: 6200, rx: 58, ry: 44, biome: 7, seed: 515 },
    { x: 2900, y: 6300, rx: 52, ry: 40, biome: 2, seed: 516 },
    { x: 3500, y: 6400, rx: 60, ry: 46, biome: 2, seed: 517 },
    { x: 4100, y: 6400, rx: 55, ry: 42, biome: 4, seed: 518 },
    { x: 4700, y: 6500, rx: 50, ry: 38, biome: 5, seed: 519 },
    { x: 5300, y: 6300, rx: 58, ry: 44, biome: 4, seed: 520 },
    { x: 5900, y: 6200, rx: 52, ry: 40, biome: 5, seed: 521 },
    { x: 6400, y: 6100, rx: 60, ry: 46, biome: 1, seed: 522 },
    { x: 7000, y: 6000, rx: 55, ry: 42, biome: 1, seed: 523 },
    { x: 7500, y: 5800, rx: 50, ry: 38, biome: 3, seed: 524 },
    { x: 7900, y: 5500, rx: 58, ry: 44, biome: 3, seed: 525 },
    { x: 7900, y: 4700, rx: 52, ry: 40, biome: 1, seed: 526 },
    { x: 7950, y: 3900, rx: 60, ry: 46, biome: 3, seed: 527 },
    { x: 7900, y: 3100, rx: 55, ry: 42, biome: 4, seed: 528 },
    { x: 7950, y: 2300, rx: 50, ry: 38, biome: 5, seed: 529 },
    { x: 7900, y: 1600, rx: 58, ry: 44, biome: 4, seed: 530 },
    { x: 7950, y: 900, rx: 52, ry: 40, biome: 5, seed: 531 },
    { x: 4500, y: 1200, rx: 60, ry: 46, biome: 4, seed: 532 },
    { x: 3800, y: 2800, rx: 55, ry: 42, biome: 5, seed: 533 },
    { x: 2400, y: 3500, rx: 50, ry: 38, biome: 7, seed: 534 },
    { x: 1600, y: 4300, rx: 58, ry: 44, biome: 3, seed: 535 },
    { x: 800, y: 5200, rx: 52, ry: 40, biome: 3, seed: 536 },
    { x: 1500, y: 5700, rx: 60, ry: 46, biome: 7, seed: 537 },
    { x: 2100, y: 5800, rx: 55, ry: 42, biome: 4, seed: 538 },
    { x: 3100, y: 5100, rx: 50, ry: 38, biome: 5, seed: 539 },
    { x: 4100, y: 5100, rx: 58, ry: 44, biome: 4, seed: 540 },
    { x: 5000, y: 2700, rx: 52, ry: 40, biome: 5, seed: 541 },
    { x: 5500, y: 1700, rx: 60, ry: 46, biome: 4, seed: 542 },
    { x: 4600, y: 3900, rx: 55, ry: 42, biome: 5, seed: 543 },
    { x: 3600, y: 4900, rx: 50, ry: 38, biome: 4, seed: 544 },
    { x: 6600, y: 2300, rx: 58, ry: 44, biome: 5, seed: 545 },
    { x: 6700, y: 1700, rx: 52, ry: 40, biome: 4, seed: 546 },
    { x: 7800, y: 700, rx: 60, ry: 46, biome: 5, seed: 547 },
    { x: 300, y: 1700, rx: 55, ry: 42, biome: 0, seed: 548 },
    { x: 3300, y: 6300, rx: 50, ry: 38, biome: 2, seed: 549 },
    { x: 1600, y: 5400, rx: 62, ry: 46, biome: 7, seed: 550 },
    { x: 2600, y: 4300, rx: 56, ry: 42, biome: 7, seed: 551 },
    { x: 4350, y: 3100, rx: 54, ry: 40, biome: 4, seed: 552 },
    { x: 5700, y: 2800, rx: 60, ry: 44, biome: 5, seed: 553 },
    { x: 6800, y: 3200, rx: 56, ry: 42, biome: 4, seed: 554 },
    { x: 7300, y: 5600, rx: 54, ry: 40, biome: 1, seed: 555 },
    { x: 6100, y: 5700, rx: 60, ry: 46, biome: 3, seed: 556 },
    { x: 3900, y: 5500, rx: 52, ry: 38, biome: 2, seed: 557 },
    { x: 1900, y: 3100, rx: 58, ry: 44, biome: 3, seed: 558 },
    { x: 1100, y: 4800, rx: 54, ry: 40, biome: 3, seed: 559 },
    { x: 5900, y: 4600, rx: 60, ry: 46, biome: 1, seed: 560 },
    { x: 4800, y: 4900, rx: 56, ry: 42, biome: 7, seed: 561 },
    { x: 7600, y: 3400, rx: 54, ry: 40, biome: 5, seed: 562 },
    { x: 6300, y: 5900, rx: 58, ry: 44, biome: 3, seed: 563 },
    { x: 2700, y: 5700, rx: 52, ry: 38, biome: 4, seed: 564 }
  ];

  // Add regions to territories
  let nextRegionId = 0;
  baseRegions.forEach((r) => {
    territories.push({
      id: nextRegionId++,
      x: r.x,
      y: r.y,
      rx: r.rx,
      ry: r.ry,
      biome: r.biome,
      seed: r.seed,
      isIslet: false
    });
  });

  const random = mulberry32(12345);

  const centers = [
    // 16 Vị trí Châu Lục phân bố so le tự do, tự nhiên (phá vỡ ma trận 4x4)
    { cx: 2800,  cy: 1800,  name: "BẮC ĐẨU BĂNG ĐẢO" },
    { cx: 9800,  cy: 1500,  name: "THIÊN LONG TÍCH ĐẠI LỤC" },
    { cx: 16800, cy: 2100,  name: "VƯƠNG QUỐC PHA LÊ" },
    { cx: 22200, cy: 3800,  name: "THƯỢNG CỔ ĐẢO" },

    { cx: 4800,  cy: 5400,  name: "HOÀNG KIM THỔ" },
    { cx: 12500, cy: 6200,  name: "THÁI BÌNH ĐẠI LỤC" },
    { cx: 19500, cy: 7500,  name: "BẠCH HỔ LỤC ĐỊA" },

    { cx: 2100,  cy: 9800,  name: "LINH QUY ĐẢO" },
    { cx: 8200,  cy: 10800, name: "ĐÔNG HẢI LONG CUNG" },
    { cx: 15200, cy: 11500, name: "SAN HÔ ĐẠI LỤC" },
    { cx: 21800, cy: 11800, name: "VẠN AN ĐẢO" },

    { cx: 4200,  cy: 14800, name: "TỬ PHONG ĐẢO" },
    { cx: 10800, cy: 15800, name: "HỎA LONG MA THỔ" },
    { cx: 17200, cy: 15200, name: "KỲ LÂN BĂNG SƠN" },
    { cx: 22500, cy: 16200, name: "CHU TƯỚC ĐẢO" },

    { cx: 12000, cy: 8800,  name: "TRUNG NGUYÊN THƯỢNG CỔ" },
  ];

  const totalAutoRegions = 4550;
  const regionsPerContinent = Math.floor(totalAutoRegions / centers.length);
  const remainingRegions = totalAutoRegions % centers.length;

  nextRegionId = territories.filter((territory) => !territory.isIslet).length;

  centers.forEach((center, cIdx) => {
    let themeBiome = 0; // Default to Grass (0)
    if (center.name.includes("BĂNG")) {
      themeBiome = 2; // Băng Tuyết (Snow)
    } else if (center.name.includes("HỎA") || center.name.includes("CHU TƯỚC")) {
      themeBiome = 3; // Hỏa Sơn (Volcanic)
    } else if (center.name.includes("SA MẠC")) {
      themeBiome = 1; // Sa Mạc (Desert)
    } else if (center.name.includes("PHA LÊ") || center.name.includes("LONG CUNG") || center.name.includes("SAN HÔ")) {
      themeBiome = 4; // Lục Lam (Ngọc bích/San hô/Crystal)
    } else if (center.name.includes("HOÀNG KIM")) {
      themeBiome = 5; // Vàng Cam (Cam đất)
    } else if (center.name.includes("HỔ") || center.name.includes("LONG")) {
      themeBiome = 6; // Rừng Thông (Pine Forest)
    } else {
      const allowedBiomes = [0, 6, 7, 0, 6, 5];
      themeBiome = allowedBiomes[cIdx % allowedBiomes.length];
    }

    // Kích thước & Tỷ lệ Dài/Ngắn khác biệt hoàn toàn cho từng Châu Lục (Xóa bỏ cảm giác trùng khuôn)
    const sizePresets = [
      { rx: 2500, ry: 1900 }, // 0: Siêu đại lục khổng lồ rộng lớn
      { rx: 2700, ry: 950 },  // 1: Dải lục địa dẹt dài ngang (Horizontal Belt)
      { rx: 1250, ry: 1250 }, // 2: Lục địa vừa tròn nhỏ gọn (Compact Isle)
      { rx: 1000, ry: 2400 }, // 3: Lục địa dải dài đứng (Vertical Spine)
      { rx: 1400, ry: 980 },  // 4: Lục địa vương quốc nhỏ (Small Realm)
      { rx: 2300, ry: 1650 }, // 5: Đại lục rộng lớn uốn cong (Grand Curved Mainland)
      { rx: 2800, ry: 1100 }, // 6: Dải đại lục bờ biển dài (Long Coastal Belt)
      { rx: 1100, ry: 2150 }, // 7: Châu lục cao dẹt đứng (Tall Southern Realm)
    ];

    const preset = sizePresets[cIdx % sizePresets.length];
    const maxRadiusX = preset.rx;
    const maxRadiusY = preset.ry;

    const stepX = 255;
    const stepY = 200;

    const maxCols = Math.floor(maxRadiusX / stepX);
    const maxRows = Math.floor(maxRadiusY / stepY);

    for (let rRow = -maxRows; rRow <= maxRows; rRow++) {
      for (let rCol = -maxCols; rCol <= maxCols; rCol++) {
        // Hàng lẻ dịch sang ngang nửa bước stepX để tạo lưới tổ ong 6 cạnh
        const rowOffset = (Math.abs(rRow) % 2 === 1) ? stepX * 0.5 : 0;
        const relX = rCol * stepX + rowOffset;
        const relY = rRow * stepY;

        const angle = Math.atan2(relY, relX);
        const normDist = Math.hypot(relX / maxRadiusX, relY / maxRadiusY);

        // Biến dạng Bán đảo Lớn (Big Peninsulas) & Bán đảo Nhỏ (Small Peninsulas/Capes) tự nhiên
        const bigPeninsula   = Math.cos(angle * 3.0 + cIdx * 1.6) * 0.35; // 2-3 bán đảo lớn vươn xa
        const smallPeninsula = Math.sin(angle * 7.0 + cIdx * 2.7) * 0.18; // 4-6 bán đảo nhỏ & mũi đất
        const bayCarving     = Math.sin(angle * 2.0 - cIdx * 0.9) * -0.15; // Vịnh ăn sâu giữa các bán đảo

        const peninsulaSpurs = bigPeninsula + smallPeninsula + bayCarving;

        // 8 Phong cách Bán đảo Đa dạng Độc bản cho tất cả Châu Lục
        const contType = cIdx % 8;
        let wave = 1.0;

        if (contType === 0) {
          // 1. Bán đảo Vuốt Rồng Móc (Hooked Claw Peninsula)
          const claw = Math.cos(angle * 1.8 + normDist * 2.5 + cIdx) * 0.48;
          const bay  = Math.sin(angle * 3.5 - cIdx) * -0.22;
          wave = 0.90 + claw + bay;
        } else if (contType === 1) {
          // 2. Bán đảo 3 Chạc Đinh Ba (Trident 3-Pronged Peninsula)
          const trident = Math.cos(angle * 3.0 + cIdx * 1.5) * 0.45 + Math.sin(angle * 6.0) * 0.15;
          wave = 0.88 + trident;
        } else if (contType === 2) {
          // 3. Bán đảo Dải Kim Ngạc Thuôn Dài (Elongated Spine Peninsula)
          const spineAngle = (cIdx * 0.75) % Math.PI;
          const align = Math.abs(Math.cos(angle - spineAngle));
          const undulate = Math.sin(angle * 5.0 + cIdx) * 0.22;
          wave = 0.62 + align * 0.68 + undulate;
        } else if (contType === 3) {
          // 4. Bán đảo Tù Sừng Bán Nguyệt (Crescent Horn Peninsula)
          const horn = Math.sin(angle * 1.4 + cIdx * 0.8) * 0.44;
          const gulf = Math.cos(angle * 3.2 - cIdx) * -0.24;
          wave = 0.92 + horn + gulf;
        } else if (contType === 4) {
          // 5. Bán đảo Sừng Đôi Kẹp Vịnh (Double Horn Parallel Peninsula)
          const doubleHorn = Math.abs(Math.cos(angle * 2.0 + cIdx * 1.3)) * 0.48;
          const fjordCut   = Math.sin(angle * 4.0) * 0.18;
          wave = 0.78 + doubleHorn + fjordCut;
        } else if (contType === 5) {
          // 6. Bán đảo Đầu Búa Chữ T (Hammerhead T-Spur Peninsula)
          const hammer = Math.cos(angle * 2.0 + cIdx * 0.9) * 0.40 + Math.cos(angle * 4.0 + 1.2) * 0.22;
          wave = 0.85 + hammer;
        } else if (contType === 6) {
          // 7. Bán đảo Fjord Răng Cưa Xẻ Rãnh (Jagged Fjord Coast Peninsula)
          const fjords = Math.sin(angle * 6.0 + cIdx * 2.2) * 0.38 + Math.cos(angle * 9.0) * 0.16;
          wave = 0.95 + fjords;
        } else {
          // 8. Bán đảo Vành Nhẫn Vịnh Nội Địa (Ring Atoll Gulf Peninsula)
          if (normDist < 0.26) continue; // Vịnh nội địa trung tâm
          const ring = Math.sin(angle * 3.0 + cIdx * 1.1) * 0.28;
          wave = 1.15 + ring;
        }

        if (normDist > wave) {
          continue; // Nằm ngoài đường bờ biển đại lục
        }

        // Tọa độ lệch ngẫu nhiên phong phú (jitter ±65px) tạo hình dạng lãnh thổ tự nhiên đa dạng
        const seedVal = cIdx * 1000 + (rRow + 50) * 100 + (rCol + 50);
        const randFunc = mulberry32(seedVal);
        const jitterX = (randFunc() - 0.5) * 65;
        const jitterY = (randFunc() - 0.5) * 55;

        const x = Math.round(center.cx + relX + jitterX);
        const y = Math.round(center.cy + relY + jitterY);

        const rx = Math.round(170 + randFunc() * 75);
        const aspect = 0.68 + randFunc() * 0.44;
        const ry = Math.round(rx * aspect);

        const biome = themeBiome;
        const seed = Math.floor(randFunc() * 1000);

        territories.push({
          id: nextRegionId++,
          x, y,
          rx, ry,
          biome,
          seed,
          isIslet: false
        });
      }
    }
  });

  // Islets start after all mainland regions
  let nextIsletId = nextRegionId;

  const isOverlap = (px: number, py: number, prx: number, pry: number, bufferScale: number = 1.0): boolean => {
    const prMax = Math.max(prx, pry);
    for (let j = 0; j < territories.length; j++) {
      const r = territories[j];
      const dx = px - r.x;
      const dy = py - r.y;
      const dist = Math.hypot(dx, dy);
      
      const rMax = Math.max(r.rx, r.ry);
      const baseBuffer = r.isIslet ? 200 : 130;
      const buffer = baseBuffer * bufferScale;
      if (dist < rMax + prMax + buffer) {
        return true;
      }
    }
    return false;
  };

  // 1. Sinh các Chuỗi Quần Đảo Ven Bờ & Cụm Eo Biển (Coastal & Strait Archipelagos)
  // Gom đảo thành các cụm quần đảo hợp lý quanh 16 Châu Lục thay vì rải rác vô lý
  centers.forEach((center, cIdx) => {
    // 4 đến 5 cụm quần đảo gom lại với nhau xung quanh mỗi đại lục
    const numClusters = 4 + (cIdx % 2);
    for (let cl = 0; cl < numClusters; cl++) {
      const clusterAngle = (cl / numClusters) * Math.PI * 2 + (cIdx * 1.3);
      // Khoảng cách cụm quần đảo cách rìa bờ biển ~1900-2400px
      const distFromCoast = 2050 + ((cl * 7) % 5) * 120;
      const clusterCenterX = Math.round(center.cx + Math.cos(clusterAngle) * distFromCoast);
      const clusterCenterY = Math.round(center.cy + Math.sin(clusterAngle) * distFromCoast * 0.75);

      // Mỗi cụm gom từ 5 đến 8 đảo đứng sát nhau tạo thành quần đảo sinh động
      const islandsInCluster = 5 + (cl % 4);
      for (let i = 0; i < islandsInCluster; i++) {
        const islandAngle = (i / islandsInCluster) * Math.PI * 2 + (random() * 0.25);
        const islandDist = 160 + (i * 95) + (random() * 40);

        const x = Math.round(clusterCenterX + Math.cos(islandAngle) * islandDist);
        const y = Math.round(clusterCenterY + Math.sin(islandAngle) * islandDist * 0.78);

        // Đảm bảo nằm trong giới hạn bản đồ
        if (x < 350 || x > 23650 || y < 350 || y > 17650) continue;

        // 50% số đảo trong từng cụm quần đảo là vùng lãnh thổ có thể chiếm đóng
        const makeTerritory = (i % 2 === 0);
        const baseR = makeTerritory ? (110 + random() * 45) : (45 + random() * 25);
        const rx = Math.round(baseR);
        const ry = Math.round(rx * 0.78);

        if (isOverlap(x, y, rx, ry, 0.45)) continue;

        let biome = (cIdx + i) % 8;
        const seed = Math.floor(random() * 1000);

        territories.push({
          id: nextIsletId++,
          x, y,
          rx, ry,
          biome,
          seed,
          isIslet: !makeTerritory
        });
      }
    }
  });

  // Tính coastal cho mỗi ô lục địa (mainland) bằng thuật toán openSeaSamples thực sự:
  // Phát tia ra 5 hướng xung quanh ô, nếu không có ô đất kề nào trong vùng scanRadius
  // thì hướng đó là "biển mở". Nếu có >= 2 hướng biển mở thì ô là ven biển.
  // (Giống logic engine nhưng dùng danh sách territories thay vì regionAtCoords)
  const mainlandTerritories = territories.filter((t) => !t.isIslet && !t.isWater);

  // Xây spatial grid để tra cứu nhanh ô kề
  const GRID_CELL = 600;
  const spatialGrid = new Map<string, BaseTerritory[]>();
  for (const t of mainlandTerritories) {
    const gx = Math.floor(t.x / GRID_CELL);
    const gy = Math.floor(t.y / GRID_CELL);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = `${gx + ox}:${gy + oy}`;
        if (!spatialGrid.has(key)) spatialGrid.set(key, []);
        spatialGrid.get(key)!.push(t);
      }
    }
  }

  function hasLandNeighborAt(fromT: BaseTerritory, angle: number): boolean {
    // Phát điểm thăm dò ra ngoài tại góc `angle`, cách biên ô ~1.3 lần rx
    const scanDist = (fromT.rx || 200) * 1.35;
    const px = fromT.x + Math.cos(angle) * scanDist;
    const py = fromT.y + Math.sin(angle) * scanDist;
    const gx = Math.floor(px / GRID_CELL);
    const gy = Math.floor(py / GRID_CELL);
    const bucket = spatialGrid.get(`${gx}:${gy}`);
    if (!bucket) return false;
    for (const other of bucket) {
      if (other.id === fromT.id) continue;
      const dx = px - other.x;
      const dy = py - other.y;
      const rx = other.rx || 200;
      const ry = other.ry || 160;
      // Kiểm tra điểm thăm dò nằm trong vùng của ô kề
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.18) return true;
    }
    return false;
  }

  const outwardAngle = (t: BaseTerritory) => Math.atan2(t.y - 9000, t.x - 12000); // hướng từ tâm bản đồ ra ngoài

  mainlandTerritories.forEach((t) => {
    const baseAngle = outwardAngle(t);
    let openSeaCount = 0;
    // Phát 5 tia: hướng ra ngoài ±0, ±PI/8, ±PI/4, ±3PI/8 để kiểm tra
    for (let i = -2; i <= 2; i++) {
      const angle = baseAngle + i * (Math.PI / 8);
      if (!hasLandNeighborAt(t, angle)) openSeaCount++;
    }
    // Ô có >= 2 hướng không có đất kề = ven biển thực sự
    t.coastal = (openSeaCount >= 2);
  });


  return territories;
}

// Single Connected 1,000-Territory Megacontinent Layout matching reference sample image.
export function generateConquestTerritories(): BaseTerritory[] {
  const territories: BaseTerritory[] = [];
  let id = 0;
  const random = mulberry32(90917);
  const centerX = 2800;
  const centerY = 2100;

  // Generate 1000 connected spacious territories (~2x larger size)
  for (let row = -14; row <= 13; row++) {
    for (let col = -18; col <= 17; col++) {
      const px = Math.round(centerX + col * 135 + (row & 1 ? 67 : 0) + (random() - 0.5) * 20);
      const py = Math.round(centerY + row * 105 + (random() - 0.5) * 16);

      // Check rectangular continent bounding box
      if (px >= 500 && px <= 5100 && py >= 500 && py <= 3700) {
        const dx = (px - centerX) / 2300;
        const dy = (py - centerY) / 1500;
        const distSq = dx * dx + dy * dy;

        // Solid Unified Conquest Green Biome (biome = 0) matching Screenshot 2
        const biome = 0;

        territories.push({
          id: id++,
          x: px,
          y: py,
          rx: Math.round(130 + random() * 16),
          ry: Math.round(98 + random() * 14),
          biome,
          seed: 1000 + row * 37 + col,
          isIslet: false,
        });
      }
    }
  }

  // Mountain Pass Corridors (Cửa Ải 8, 5, 4, 6, 7)
  [
    [2500, 560], [3500, 560], [1040, 1300], [960, 2600], [4640, 1300], [4640, 2700], [2100, 3540], [3500, 3540], // Pass 8
    [1600, 1100], [2400, 1040], [3960, 1100], [1500, 2900], [1760, 3100], [3700, 3100], // Pass 5
    [1240, 1460], [1240, 1760], [3200, 880], [3440, 880], [4040, 2200], [4040, 2500], [2040, 3240], [2300, 3240], // Pass 4
    [1640, 1560], [2100, 1440], [2800, 1300], [3700, 1440], [3960, 1760], [3900, 2160], [1640, 2200], [1840, 2500], [2160, 2700], [3360, 2700], // Pass 6
    [2800, 1720], [3120, 1800], [3280, 2100], [3120, 2400], [2800, 2480], [2480, 2400], [2320, 2100], [2480, 1800], // Pass 7 Ring
  ].forEach(([x, y], index) => territories.push({
    id: id++, x, y, rx: 135, ry: 104,
    biome: 5, seed: 8000 + index, isIslet: false,
  }));

  return territories;
}
