import { hash } from "./random";

const BIOME_YIELDS = [
  { gold: 0.003, wood: 0.01, stone: 0.006, food: 0.03, iron: 0.0015, coal: 0.0008, sulfur: 0.0004, gems: 0.0002 },
  { gold: 0.018, wood: 0.001, stone: 0.012, food: 0.003, iron: 0.003, coal: 0.001, sulfur: 0.001, gems: 0.004 },
  { gold: 0.002, wood: 0.003, stone: 0.02, food: 0.003, iron: 0.016, coal: 0.008, sulfur: 0.001, gems: 0.002 },
  { gold: 0.004, wood: 0.001, stone: 0.018, food: 0.001, iron: 0.02, coal: 0.018, sulfur: 0.014, gems: 0.002 },
  { gold: 0.005, wood: 0.003, stone: 0.01, food: 0.003, iron: 0.005, coal: 0.001, sulfur: 0.002, gems: 0.014 },
  { gold: 0.01, wood: 0.008, stone: 0.004, food: 0.022, iron: 0.002, coal: 0.001, sulfur: 0.0005, gems: 0.002 },
  { gold: 0.002, wood: 0.026, stone: 0.012, food: 0.01, iron: 0.004, coal: 0.003, sulfur: 0.0005, gems: 0.0005 },
  { gold: 0.003, wood: 0.016, stone: 0.003, food: 0.018, iron: 0.002, coal: 0.006, sulfur: 0.004, gems: 0.001 },
];

export type SelectorDeps = {
  getRegion: (regionId: number) => any;
  getSpecialResources: (regionId: number) => string[];
  getRegionAtCoords: (x: number, y: number) => number;
  gameConfig: any;
};

export function territoryAreaFactor(
  regionOrId: any,
  getRegion: SelectorDeps["getRegion"],
) {
  const region =
    typeof regionOrId === "number" ? getRegion(regionOrId) : regionOrId;
  if (!region) return 1;
  const rx = region.rx || region.r || 100;
  const ry = region.ry || (region.r || 100) * 0.78;
  return Math.max(0.35, Math.min(6, (rx * ry) / 10000));
}

export function territoryYield(regionId: number, deps: SelectorDeps) {
  const region = deps.getRegion(regionId);
  const yields = BIOME_YIELDS[region?.biome ?? 0] || BIOME_YIELDS[0];
  const areaFactor = territoryAreaFactor(region, deps.getRegion);
  const isIslet = Boolean(region?.isIslet);
  const quality = 0.8 + hash((regionId + 1) * 51.715) * 0.4;
  const hasGemMine = deps.getSpecialResources(regionId).includes("Mỏ Ngọc");
  const multiplier = {
    gold: isIslet ? 1.15 : 1,
    wood: isIslet ? 0.3 : 1,
    stone: isIslet ? 0.5 : 1,
    food: isIslet ? 0.45 : 1,
  };
  return {
    gold: yields.gold * areaFactor * multiplier.gold * quality,
    wood: yields.wood * areaFactor * multiplier.wood * quality,
    stone: yields.stone * areaFactor * multiplier.stone * quality,
    food: yields.food * areaFactor * multiplier.food * quality,
    gems: hasGemMine ? Math.max(0.004, yields.gems * areaFactor * quality) : 0,
  };
}

export function territoryStartingPopulation(
  regionId: number,
  ownerCode = 1,
  getRegion: SelectorDeps["getRegion"],
) {
  const region = getRegion(regionId);
  if (!region) return ownerCode === 1 ? 32 : 64;
  const biomePopulationMultiplier =
    [1.25, 0.65, 0.55, 0.45, 0.8, 1.35, 0.95, 0.75][region.biome ?? 0] || 1;
  const isletPenalty = region.isIslet ? 0.55 : 1;
  const base = ownerCode === 1 ? 24 : 48;
  return Math.max(
    80,
    Math.round(
      base +
        territoryAreaFactor(region, getRegion) *
          28 *
          biomePopulationMultiplier *
          isletPenalty,
    ),
  );
}

export function clearingDuration(
  regionOrId: any,
  getRegion: SelectorDeps["getRegion"],
) {
  const region =
    typeof regionOrId === "number" ? getRegion(regionOrId) : regionOrId;
  if (!region) return 45;
  const rx = region.rx || region.r || 100;
  const ry = region.ry || (region.r || 100) * 0.78;
  const biomeMultiplier =
    [1, 1.25, 1.55, 1.75, 1.45, 1.1, 1.25, 1.65][region.biome ?? 0] || 1;
  return Math.max(
    15,
    Math.min(600, Math.round(((rx * ry) / 650) * 1.8 * biomeMultiplier)),
  );
}

export function defaultBuildings() {
  return {
    barracks: 0,
    lumberCamp: 0,
    quarry: 0,
    goldMine: 0,
    gemCutter: 0,
    fort: 0,
    siegeWorkshop: 0,
    warehouse: 0,
  };
}

export function defaultStorage() {
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

export function unitExtraCosts(gameConfig: any) {
  return {
    infantry: { food: gameConfig.infantryCostFood },
    cavalry: {
      food: gameConfig.cavalryCostFood,
      iron: gameConfig.cavalryCostIron,
    },
    artillery: {
      iron: gameConfig.artilleryCostIron,
      sulfur: gameConfig.artilleryCostSulfur,
    },
  };
}

export function normalizeTown(town: any) {
  if (!town) return town;
  town.buildings = { ...defaultBuildings(), ...(town.buildings || {}) };
  town.storage = { ...defaultStorage(), ...(town.storage || {}) };
  town.population = Math.max(0, Number(town.population ?? 32) || 0);
  town.infantryCount = Math.max(
    0,
    Math.floor(Number(town.infantryCount ?? town.troops ?? 0) || 0),
  );
  town.cavalryCount = Math.max(0, Math.floor(Number(town.cavalryCount ?? 0) || 0));
  town.artilleryCount = Math.max(0, Math.floor(Number(town.artilleryCount ?? 0) || 0));
  return town;
}

export function townPopulationCap(town: any, deps: SelectorDeps) {
  normalizeTown(town);
  const level = town?.lvl || 1;
  const fort = town?.buildings?.fort || 0;
  const warehouse = town?.buildings?.warehouse || 0;
  const regionId = town ? deps.getRegionAtCoords(town.x, town.y) : -1;
  const areaBonus =
    regionId >= 0
      ? Math.round(territoryAreaFactor(regionId, deps.getRegion) * 18)
      : 0;
  return 64 + level * 36 + fort * 24 + warehouse * 8 + areaBonus;
}

export function townPopulationGrowthPerSecond(town: any) {
  normalizeTown(town);
  const level = town?.lvl || 1;
  const fort = town?.buildings?.fort || 0;
  return 1 / 120 + Math.max(0, level - 1) * (1 / 160) + fort * (1 / 240);
}

export function troopPopulationCost(troopValue: number) {
  return Math.max(1, Math.ceil((troopValue || 0) / 5));
}

export function maxDefendingTroops(town: any) {
  normalizeTown(town);
  return Math.max(10, Math.floor((town.population || 0) * 10));
}

export function territoryBuildCost(regionId: number, deps: SelectorDeps) {
  const region = deps.getRegion(regionId);
  if (!region) return { gold: 0, wood: 0, stone: 0, food: 0 };
  const rx = region.rx || region.r || 100;
  const ry = region.ry || (region.r || 100) * 0.78;
  const areaFactor = Math.max(0.85, (rx * ry) / 10000);
  const yields = territoryYield(regionId, deps);
  return {
    gold: Math.round(180 + areaFactor * 32 + yields.gold * 92),
    wood: Math.round(130 + areaFactor * 28 + yields.wood * 66),
    stone: Math.round(125 + areaFactor * 34 + yields.stone * 82),
    food: Math.round(80 + areaFactor * 18 + yields.food * 42),
  };
}

export function resourceCostText(cost: Record<string, number>) {
  const labels: Record<string, string> = {
    gold: "VÀNG",
    wood: "GỖ",
    stone: "ĐÁ",
    food: "LƯƠNG",
    gems: "KIM CƯƠNG",
  };
  return Object.entries(cost)
    .filter(([, amount]) => Math.floor(amount || 0) > 0)
    .map(([key, amount]) => `${Math.floor(amount)} ${labels[key] || key.toUpperCase()}`)
    .join(" · ");
}
