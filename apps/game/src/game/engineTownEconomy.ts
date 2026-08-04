// @ts-nocheck

export function createTownEconomyHelpers(deps: {
  state: any;
  towns: any[];
  landById: (id: number) => any;
  regionAtCoords: (x: number, y: number) => number;
  derivedRegionOwnership: (regionId: number) => number;
  mainlandCoastalRegionIds: Set<number>;
  BIOME_YIELDS: any;
  hash: (n: number) => number;
  toast: (msg: string) => void;
  pushLog: (msg: string) => void;
}) {
  const {
    state,
    towns,
    landById,
    regionAtCoords,
    derivedRegionOwnership,
    mainlandCoastalRegionIds,
    BIOME_YIELDS,
    hash,
    toast,
    pushLog,
  } = deps;

  const SETTLER_POPULATION_COST = 4;

  function territoryAreaFactor(regionOrId: any) {
    const r =
      typeof regionOrId === "number" ? landById(regionOrId) : regionOrId;
    if (!r) return 1;
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    return Math.max(0.35, Math.min(6, (rx * ry) / 10000));
  }

  function territorySpecialResources(regionId: number) {
    const authoritative = state.regionSpecialResources?.[regionId];
    if (Array.isArray(authoritative)) return authoritative;
    const r = landById(regionId);
    if (!r) return [];
    const specials: string[] = [];
    const specialtyRoll = hash((regionId + 1) * 71.731);
    if (specialtyRoll < 0.12) specials.push("BÃ£i ngá»±a");
    else if (specialtyRoll < 0.23) specials.push("XÆ°á»Ÿng rÃ¨n");

    if (r.isIslet || r.coastal || mainlandCoastalRegionIds.has(r.id)) {
      specials.push("Báº¿n tÃ u tá»± nhiÃªn");
    }

    if (hash((regionId + 1) * 691.13) < 0.007) specials.push("Má» Ngá»c");

    return Array.from(new Set(specials));
  }

  function territoryYield(regionId: number) {
    const r = landById(regionId);
    const y = BIOME_YIELDS[r?.biome ?? 0] || BIOME_YIELDS[0];
    const areaFactor = territoryAreaFactor(r);
    const isIslet = Boolean(r?.isIslet);
    const quality = 0.8 + hash((regionId + 1) * 51.715) * 0.4;
    const hasGemMine =
      territorySpecialResources(regionId).includes("Má» Ngá»c");
    const mult = {
      gold: isIslet ? 1.15 : 1,
      wood: isIslet ? 0.3 : 1,
      stone: isIslet ? 0.5 : 1,
      food: isIslet ? 0.45 : 1,
    };
    return {
      gold: y.gold * areaFactor * mult.gold * quality,
      wood: y.wood * areaFactor * mult.wood * quality,
      stone: y.stone * areaFactor * mult.stone * quality,
      food: y.food * areaFactor * mult.food * quality,
      gems: hasGemMine ? Math.max(0.004, y.gems * areaFactor * quality) : 0,
    };
  }

  function territoryStartingPopulation(regionId: number, ownerCode = 1) {
    const r = landById(regionId);
    if (!r) return ownerCode === 1 ? 32 : 64;
    const biomePopMult =
      [1.25, 0.65, 0.55, 0.45, 0.8, 1.35, 0.95, 0.75][r.biome ?? 0] || 1;
    const isletPenalty = r?.isIslet ? 0.55 : 1;
    const base = ownerCode === 1 ? 24 : 48;
    return Math.max(
      80,
      Math.round(
        base + territoryAreaFactor(r) * 28 * biomePopMult * isletPenalty,
      ),
    );
  }

  function clearingDuration(rOrId?: any) {
    const r = typeof rOrId === "number" ? landById(rOrId) : rOrId;
    if (!r) return 45;
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    const biomeMult =
      [1.0, 1.25, 1.55, 1.75, 1.45, 1.1, 1.25, 1.65][r.biome ?? 0] || 1;
    return Math.max(
      15,
      Math.min(600, Math.round(((rx * ry) / 650) * 1.8 * biomeMult)),
    );
  }

  function defaultBuildings() {
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

  function defaultStorage() {
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

  function normalizeTown(town: any) {
    if (!town) return town;
    town.buildings = { ...defaultBuildings(), ...(town.buildings || {}) };
    town.storage = { ...defaultStorage(), ...(town.storage || {}) };
    town.population = Math.max(0, Number(town.population ?? 32) || 0);
    town.infantryCount = Math.max(
      0,
      Math.floor(Number(town.infantryCount ?? town.troops ?? 0) || 0),
    );
    town.cavalryCount = Math.max(
      0,
      Math.floor(Number(town.cavalryCount ?? 0) || 0),
    );
    town.artilleryCount = Math.max(
      0,
      Math.floor(Number(town.artilleryCount ?? 0) || 0),
    );
    return town;
  }

  function townPopulationCap(town: any) {
    normalizeTown(town);
    const lvl = town?.lvl || 1;
    const fort = town?.buildings?.fort || 0;
    const warehouse = town?.buildings?.warehouse || 0;
    const regionId = town ? regionAtCoords(town.x, town.y) : -1;
    const areaBonus =
      regionId >= 0 ? Math.round(territoryAreaFactor(regionId) * 18) : 0;
    return 64 + lvl * 36 + fort * 24 + warehouse * 8 + areaBonus;
  }

  function maxDefendingTroops(town: any) {
    normalizeTown(town);
    return Math.max(10, Math.floor((town.population || 0) * 10));
  }

  function refundSettlerPopulationForRegion(regionId: number) {
    const travel = state.settlerTravel;
    if (
      !travel ||
      travel.targetRegionId !== regionId ||
      !travel.populationCost ||
      travel.originTownId == null
    ) {
      return;
    }
    const originTown = towns.find(
      (town) => town.id === travel.originTownId && town.owner === 0,
    );
    if (!originTown) return;
    normalizeTown(originTown);
    originTown.population = Math.min(
      townPopulationCap(originTown),
      originTown.population + travel.populationCost,
    );
  }

  function beginSettlerReturn(
    regionId: number,
    reason = "Äá»˜I THá»¢ ÄÃƒ Há»¦Y XÃ‚Y THÃ€NH VÃ€ ÄANG QUAY Vá»€",
  ) {
    const travel = state.settlerTravel;
    if (!travel || travel.targetRegionId !== regionId) {
      toast(reason);
      return;
    }
    const originTown =
      travel.originTownId == null
        ? null
        : towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown
      ? regionAtCoords(originTown.x, originTown.y)
      : -1;
    const canReturnToTown =
      originTown &&
      originTown.owner === 0 &&
      originRegionId >= 0 &&
      derivedRegionOwnership(originRegionId) === 1;
    travel.returning = true;
    travel.returnProgress = 0;
    travel.active = true;
    state.regionInProgress = -1;
    state.regionClearing[regionId] = 0;
    delete state.activeClearingTimings[regionId];
    state.regionOwnership[regionId] = 0;
    delete state.regionOwnerNames[regionId];
    delete state.regionOwnerFlagColors[regionId];
    delete state.regionOwnerEmblems[regionId];
    delete state.regionOwnerIds[regionId];
    delete state.regionSettlementKinds[regionId];
    delete state.regionOwnerCapitalSkins[regionId];
    delete state.regionOwnerDistrictSkins[regionId];
    if (!canReturnToTown && travel.populationCost) {
      travel.populationCost = 0;
      pushLog(
        "SYSTEM: THÃ€NH XUáº¤T PHÃT ÄÃƒ Máº¤T, Äá»˜I THá»¢ XÃ‚Y THÃ€NH Bá»Š TAN RÃƒ",
      );
      toast("THÃ€NH XUáº¤T PHÃT ÄÃƒ Bá»Š CHIáº¾M, XÃ‚Y THÃ€NH Bá»Š Há»¦Y");
      return;
    }
    toast(reason);
  }

  function clearSettlerReturn() {
    const travel = state.settlerTravel;
    if (!travel?.returning) return;
    if (travel.populationCost && travel.originTownId != null) {
      const originTown = towns.find(
        (town) => town.id === travel.originTownId && town.owner === 0,
      );
      if (originTown) {
        normalizeTown(originTown);
        originTown.population = Math.min(
          townPopulationCap(originTown),
          originTown.population + travel.populationCost,
        );
      }
    }
    state.settlerTravel = {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    };
    toast("Äá»˜I THá»¢ ÄÃƒ QUAY Vá»€ THÃ€NH XUáº¤T PHÃT");
  }

  function cancelClearingIfOriginLost() {
    const travel = state.settlerTravel;
    if (
      !travel?.active ||
      travel.returning ||
      travel.targetRegionId < 0 ||
      travel.originTownId == null
    ) {
      return;
    }
    const originTown = towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown
      ? regionAtCoords(originTown.x, originTown.y)
      : -1;
    if (
      !originTown ||
      originTown.owner !== 0 ||
      originRegionId < 0 ||
      derivedRegionOwnership(originRegionId) !== 1
    ) {
      beginSettlerReturn(
        travel.targetRegionId,
        "THÃ€NH XUáº¤T PHÃT Bá»Š CHIáº¾M, XÃ‚Y THÃ€NH ÄÃƒ Há»¦Y",
      );
    }
  }

  function cancelClearingIfTargetTaken(regionIds: number[]) {
    const travel = state.settlerTravel;
    if (!travel?.active || travel.returning || travel.targetRegionId < 0)
      return;
    if (!regionIds.includes(travel.targetRegionId)) return;
    const ownerCode = derivedRegionOwnership(travel.targetRegionId);
    if (ownerCode === 1) {
      state.regionInProgress = -1;
      state.regionClearing[travel.targetRegionId] = 0;
      delete state.activeClearingTimings[travel.targetRegionId];
      state.settlerTravel = {
        active: false,
        targetRegionId: -1,
        originTownId: null,
        originX: 0,
        originY: 0,
      };
      toast("XÃ‚Y THÃ€NH HOÃ€N Táº¤T, SERVER ÄÃƒ XÃC NHáº¬N");
      return;
    }
    if (ownerCode !== 0) {
      beginSettlerReturn(
        travel.targetRegionId,
        "LÃƒNH THá»” ÄANG XÃ‚Y ÄÃƒ Bá»Š CHIáº¾M, Äá»˜I THá»¢ QUAY Vá»€",
      );
    }
  }

  function territoryBuildCost(regionId: number) {
    const r = landById(regionId);
    if (!r) return { gold: 0, wood: 0, stone: 0, food: 0 };
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    const areaFactor = Math.max(0.85, (rx * ry) / 10000);
    const y = territoryYield(regionId);
    return {
      gold: Math.round(180 + areaFactor * 32 + y.gold * 92),
      wood: Math.round(130 + areaFactor * 28 + y.wood * 66),
      stone: Math.round(125 + areaFactor * 34 + y.stone * 82),
      food: Math.round(80 + areaFactor * 18 + y.food * 42),
    };
  }

  return {
    SETTLER_POPULATION_COST,
    territoryAreaFactor,
    territoryYield,
    territoryStartingPopulation,
    clearingDuration,
    defaultBuildings,
    defaultStorage,
    normalizeTown,
    townPopulationCap,
    maxDefendingTroops,
    refundSettlerPopulationForRegion,
    beginSettlerReturn,
    clearSettlerReturn,
    cancelClearingIfOriginLost,
    cancelClearingIfTargetTaken,
    territoryBuildCost,
    territorySpecialResources,
  };
}
