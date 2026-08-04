// @ts-nocheck

export function createOnboardingHelpers(deps: {
  state: any;
  towns: any[];
  factions: any[];
  onboardingKey: string;
}) {
  const { state, towns, factions, onboardingKey } = deps;

  function isNewbieOnboarding() {
    const params = new URLSearchParams(window.location.search);
    return params.has("newbie") || localStorage.getItem(onboardingKey) === "1";
  }

  function resetStarterTownsForNewbie() {
    if (!isNewbieOnboarding()) return;
    towns.forEach((t, i) => {
      if (t.owner === 0) {
        t.owner = 1 + (i % Math.max(1, factions.length - 1));
        t.troops = Math.max(36, t.troops || 36);
      }
    });
    state.selected = null;
    state.selectedRegion = null;
    state.regionOwnership = [];
    state.regionOwnerNames = {};
    state.regionOwnerIds = {};
    state.regionOwnerFlagColors = {};
    state.regionOwnerEmblems = {};
    state.regionOwnerArchitectureIds = {};
    state.regionOwnerAllianceTags = {};
    state.regionOwnerAllianceEmblems = {};
    state.regionSettlementKinds = {};
    state.regionParentTerritoryIds = {};
    state.regionRootTerritoryIds = {};
    state.regionConnectionTypes = {};
    state.regionSpecialResources = {};
    state.regionOwnerCapitalSkins = {};
    state.regionOwnerDistrictSkins = {};
    state.hasAuthoritativeOwnership = false;
    state.regionClearing = [];
    state.regionInProgress = -1;
    state.newbieMode = true;
    state.newbiePhase = "select_land";
    state.newbieSelectedRegion = null;
    state.settlerTravel = {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    };
    state.pendingBackendClearingStarts = [];
    state.pendingBackendClaims = [];
    state.toast = "TÃ‚N THá»¦: CHá»ŒN Máº¢NH Äáº¤T HOANG Äá»‚ XÃ‚Y THÃ€NH";
  }

  return {
    resetStarterTownsForNewbie,
  };
}
