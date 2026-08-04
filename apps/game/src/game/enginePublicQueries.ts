// @ts-nocheck

export function createEnginePublicQueriesHelper(deps: {
  state: any;
  towns: any[];
  expansionTargetState: (regionId: number) => any;
  expansionConnectionType: (
    sourceRegionId: number,
    targetRegionId: number,
  ) => any;
  expansionSourceRegionsForTarget: (regionId: number) => number[];
  sourceTown: () => any;
  isPlayerOwnedTown: (town: any) => boolean;
  townRegionId: (town: any) => number;
  landById: (id: number) => any;
  reactToCanvasRegionId: (id: number) => number;
  mapToScreen: (x: number, y: number) => any;
  territorySpecialResources: (regionId: number) => any;
  getMarchRouteStatus: (sourceTown: any, targetRegionId: number) => any;
  derivedRegionOwnership: (id: number) => any;
}) {
  const {
    state,
    towns,
    expansionTargetState,
    expansionConnectionType,
    expansionSourceRegionsForTarget,
    sourceTown,
    isPlayerOwnedTown,
    townRegionId,
    landById,
    reactToCanvasRegionId,
    mapToScreen,
    territorySpecialResources,
    getMarchRouteStatus,
    derivedRegionOwnership,
  } = deps;

  function canBuildStronghold(regionId: number) {
    return expansionTargetState(regionId) !== null;
  }

  function getExpansionConnectionType(regionId: number) {
    const preferred = state.expansionSourceRegionId;
    if (preferred !== null) return expansionConnectionType(preferred, regionId);
    for (const sourceId of expansionSourceRegionsForTarget(regionId)) {
      const type = expansionConnectionType(sourceId, regionId);
      if (type) return type;
    }
    return null;
  }

  function getExpansionSourceRegionsForTarget(regionId: number) {
    return expansionSourceRegionsForTarget(regionId);
  }

  function getRegionOwnership(id: number) {
    return derivedRegionOwnership(id);
  }

  function getSourceTown() {
    return sourceTown();
  }

  function getPlayerOwnedTowns() {
    return towns.filter(isPlayerOwnedTown);
  }

  function getTownRegionId(town: any) {
    return townRegionId(town);
  }

  function getRegion(id: number) {
    return landById(reactToCanvasRegionId(id));
  }

  function getRegionCenter(id: number) {
    const r = landById(reactToCanvasRegionId(id));
    if (!r) return null;
    return mapToScreen(r.x, r.y);
  }

  function getTerritorySpecialResources(id: number) {
    return territorySpecialResources(reactToCanvasRegionId(id));
  }

  function getActiveBattleForRegion(id: number) {
    return (
      state.activeBattles.find(
        (battle: any) => Number(battle.regionId) === Number(id),
      ) || null
    );
  }

  function isPlayerOwnedTownPublic(town: any) {
    return isPlayerOwnedTown(town);
  }

  function getMarchRouteStatusPublic(source: any, targetRegionId: number) {
    return getMarchRouteStatus(source, reactToCanvasRegionId(targetRegionId));
  }

  return {
    canBuildStronghold,
    getExpansionConnectionType,
    getExpansionSourceRegionsForTarget,
    getRegionOwnership,
    getSourceTown,
    getPlayerOwnedTowns,
    getTownRegionId,
    getRegion,
    getRegionCenter,
    getTerritorySpecialResources,
    getActiveBattleForRegion,
    isPlayerOwnedTown: isPlayerOwnedTownPublic,
    getMarchRouteStatus: getMarchRouteStatusPublic,
  };
}
