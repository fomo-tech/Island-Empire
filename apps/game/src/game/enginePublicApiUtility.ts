// @ts-nocheck

export function createEnginePublicApiUtilityHelper(deps: {
  towns: any[];
  regions: any[];
  islets: any[];
  mapToScreen: (x: number, y: number) => any;
  toggleHideTerritoryAssets: (forceValue?: boolean) => boolean;
  getConfig: () => any;
}) {
  const {
    towns,
    regions,
    islets,
    mapToScreen,
    toggleHideTerritoryAssets,
    getConfig,
  } = deps;

  function getTowns() {
    return towns;
  }

  function getRegions() {
    return regions;
  }

  function getIslets() {
    return islets;
  }

  function mapToScreenPublic(x: number, y: number) {
    return mapToScreen(x, y);
  }

  function setHideTerritoryAssets(hide: boolean) {
    toggleHideTerritoryAssets(hide);
  }

  function toggleHideTerritoryAssetsPublic(forceValue?: boolean) {
    return toggleHideTerritoryAssets(forceValue);
  }

  return {
    getTowns,
    getRegions,
    getIslets,
    mapToScreen: mapToScreenPublic,
    setHideTerritoryAssets,
    toggleHideTerritoryAssets: toggleHideTerritoryAssetsPublic,
    getConfig,
  };
}
