// @ts-nocheck

export function createEngineActionPreludeHelper(deps: {
  state: any;
  towns: any[];
  setMinimapCanvas: (canvas: HTMLCanvasElement | null) => void;
  setUiOverlayActive: (active: boolean) => void;
  setRenderSuspended: (active: boolean) => void;
  toast: (message: string) => void;
  applyBackendTownSnapshots: (snapshots: any[]) => void;
  save: () => void;
  gameConfig: any;
  initTerritoryArrays: () => void;
}) {
  const {
    state,
    towns,
    setMinimapCanvas,
    setUiOverlayActive,
    setRenderSuspended,
    toast,
    applyBackendTownSnapshots,
    save,
    gameConfig,
    initTerritoryArrays,
  } = deps;

  function handlePreludeAction(id: string, payload?: any) {
    if (id === "setMinimapCanvas") {
      setMinimapCanvas(payload || null);
      return true;
    }
    if (id === "setUiOverlayActive") {
      setUiOverlayActive(Boolean(payload?.active ?? payload));
      return true;
    }
    if (id === "setRenderSuspended") {
      setRenderSuspended(Boolean(payload?.active ?? payload));
      return true;
    }
    if (id === "setToast") {
      toast(payload?.message || "KHÃ”NG THá»‚ THá»°C HIá»†N Lá»†NH");
      return true;
    }
    if (id === "setLocalPlayer") {
      state.localPlayerId = payload?.playerId || null;
      state.localPlayerName = payload?.playerName || "Báº N";
      return true;
    }
    if (id === "syncResources") {
      if (payload?.resources) {
        state.resources = { ...state.resources, ...payload.resources };
      }
      return true;
    }
    if (id === "setShopInventory") {
      state.equippedCapitalSkin =
        payload?.inventory?.equippedCapitalSkin || null;
      state.equippedDistrictSkin =
        payload?.inventory?.equippedDistrictSkin || null;
      if (Array.isArray(payload?.capitalTerritoryIds)) {
        state.capitalTerritoryIds = new Set(
          payload.capitalTerritoryIds.map(Number).filter(Number.isFinite),
        );
      }
      if (Array.isArray(payload?.capitalTownIds)) {
        state.capitalTownIds = new Set(
          payload.capitalTownIds.map(Number).filter(Number.isFinite),
        );
      }
      return true;
    }
    if (id === "updateRemoteSkin") {
      const ownerId = payload?.ownerId;
      if (!ownerId) return true;
      Object.keys(state.regionOwnerIds).forEach((key) => {
        const regionId = Number(key);
        if (state.regionOwnerIds[regionId] !== ownerId) return;
        if (payload?.equippedCapitalSkin !== undefined) {
          state.regionOwnerCapitalSkins[regionId] =
            payload.equippedCapitalSkin || null;
        }
        if (payload?.equippedDistrictSkin !== undefined) {
          state.regionOwnerDistrictSkins[regionId] =
            payload.equippedDistrictSkin || null;
        }
      });
      return true;
    }
    if (id === "syncTownSnapshots") {
      applyBackendTownSnapshots(payload?.towns || []);
      save();
      return true;
    }
    if (id === "applyConfig") {
      if (payload?.config) Object.assign(gameConfig, payload.config);
      return true;
    }
    if (id === "setExpansionSource") {
      const regionId = Number(payload?.regionId);
      state.expansionSourceRegionId =
        Number.isInteger(regionId) && regionId >= 0 ? regionId : null;
      state.toast =
        state.expansionSourceRegionId === null
          ? "ÄÃƒ Há»¦Y Má»ž Rá»˜NG LÃƒNH Äá»ŠA"
          : "CHá»ŒN VÃ™NG ÄÆ¯á»¢C VIá»€N VÃ€NG Äá»‚ Dá»°NG PHÃO ÄÃ€I";
      return true;
    }
    if (id === "prepareBackendWorld") {
      state.hasAuthoritativeOwnership = true;
      state.regionOwnership = [];
      state.regionOwnerIds = {};
      state.regionOwnerNames = {};
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
      state.regionClearing = [];
      state.activeClearingTimings = {};
      state.regionInProgress = -1;
      state.selected = null;
      state.selectedRegion = null;
      state.settlerTravel = {
        active: false,
        targetRegionId: -1,
        originTownId: null,
        originX: 0,
        originY: 0,
      };
      towns.splice(0, towns.length);
      initTerritoryArrays();
      state.toast = "ÄANG Äá»’NG Bá»˜ Dá»® LIá»†U SERVER";
      return true;
    }
    if (id === "updateNewbieShield") {
      const until = payload?.until ? new Date(payload.until).getTime() : 0;
      state.newbieShieldUntil = until;
      localStorage.setItem("island_empire_newbie_shield_until", String(until));
      return true;
    }

    return false;
  }

  return {
    handlePreludeAction,
  };
}
