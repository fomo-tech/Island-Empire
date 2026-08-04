// @ts-nocheck

export function createBackendActionBridgeHelper(deps: {
  state: any;
  save: () => void;
  toast: (message: string) => void;
  reactToCanvasRegionId: (id: number) => number;
  syncTownOwnersForRegions: (regionIds: number[]) => void;
  cancelClearingIfTargetTaken: (regionIds: number[]) => void;
  cancelClearingIfOriginLost: () => void;
  applyBackendClearing: (payload: any) => void;
  applyBackendMarch: (payload: any, unitMix?: any) => any;
  applyBackendBattles: (battles: any[], merge?: boolean) => void;
  focusBackendMarch: (marchId?: string) => any;
  focusBackendClearing: (territoryId: number) => any;
}) {
  const {
    state,
    save,
    toast,
    reactToCanvasRegionId,
    syncTownOwnersForRegions,
    cancelClearingIfTargetTaken,
    cancelClearingIfOriginLost,
    applyBackendClearing,
    applyBackendMarch,
    applyBackendBattles,
    focusBackendMarch,
    focusBackendClearing,
  } = deps;

  function handled() {
    return { handled: true, hasResult: false as const, result: undefined };
  }

  function handledWith(result: any) {
    return { handled: true, hasResult: true as const, result };
  }

  function unhandled() {
    return { handled: false, hasResult: false as const, result: undefined };
  }

  function handleBackendBridgeAction(id: string, payload?: any) {
    if (id === "applyBackendBattles") {
      applyBackendBattles(payload?.battles || [], payload?.merge !== false);
      return handled();
    }

    if (id === "removeBackendMarch") {
      const marchId = payload?.marchId;
      if (marchId) {
        state.voyages = (state.voyages || []).filter(
          (voyage: any) => voyage.backendMarchId !== marchId,
        );
      }
      return handled();
    }

    if (id === "removeBackendBattle") {
      const battleId = payload?.battleId;
      if (battleId) {
        state.activeBattles = (state.activeBattles || []).filter(
          (battle: any) => battle.id !== battleId && battle._id !== battleId,
        );
      }
      return handled();
    }

    if (id === "applyWorldOwnership") {
      const touchedRegionIds = [];
      state.hasAuthoritativeOwnership = true;
      if (payload?.replace) {
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
      }
      (payload?.territories || []).forEach((territory: any) => {
        const ownerId = territory.ownerId || null;
        const ownerCode = ownerId
          ? ownerId === state.localPlayerId
            ? 1
            : 2
          : territory.ownerCode || 0;
        if (ownerCode === 1) {
          state.builderRegionId = territory.id;
          localStorage.setItem(
            "island_empire_builder_region_id",
            String(territory.id),
          );
        }
        touchedRegionIds.push(territory.id);
        state.regionOwnership[territory.id] = ownerCode;
        if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
        else delete state.regionOwnerIds[territory.id];
        if (territory.ownerName)
          state.regionOwnerNames[territory.id] =
            ownerCode === 1
              ? state.localPlayerName || "Báº N"
              : territory.ownerName;
        else delete state.regionOwnerNames[territory.id];
        if (territory.ownerFlagColor)
          state.regionOwnerFlagColors[territory.id] = territory.ownerFlagColor;
        else delete state.regionOwnerFlagColors[territory.id];
        if (territory.ownerEmblem)
          state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
        else delete state.regionOwnerEmblems[territory.id];
        if (territory.ownerArchitectureId)
          state.regionOwnerArchitectureIds[territory.id] =
            territory.ownerArchitectureId;
        else delete state.regionOwnerArchitectureIds[territory.id];
        if (territory.ownerAllianceTag)
          state.regionOwnerAllianceTags[territory.id] =
            territory.ownerAllianceTag;
        else delete state.regionOwnerAllianceTags[territory.id];
        if (territory.ownerAllianceEmblem)
          state.regionOwnerAllianceEmblems[territory.id] =
            territory.ownerAllianceEmblem;
        else delete state.regionOwnerAllianceEmblems[territory.id];
        if (territory.settlementKind)
          state.regionSettlementKinds[territory.id] = territory.settlementKind;
        else delete state.regionSettlementKinds[territory.id];
        if (territory.parentTerritoryId !== undefined)
          state.regionParentTerritoryIds[territory.id] =
            territory.parentTerritoryId;
        else delete state.regionParentTerritoryIds[territory.id];
        if (territory.rootTerritoryId !== undefined)
          state.regionRootTerritoryIds[territory.id] =
            territory.rootTerritoryId;
        else delete state.regionRootTerritoryIds[territory.id];
        if (territory.connectionType)
          state.regionConnectionTypes[territory.id] = territory.connectionType;
        else delete state.regionConnectionTypes[territory.id];
        if (Array.isArray(territory.specialResources))
          state.regionSpecialResources[territory.id] =
            territory.specialResources;
        else delete state.regionSpecialResources[territory.id];

        if (territory.equippedCapitalSkin)
          state.regionOwnerCapitalSkins[territory.id] =
            territory.equippedCapitalSkin;
        else delete state.regionOwnerCapitalSkins[territory.id];

        if (territory.equippedDistrictSkin)
          state.regionOwnerDistrictSkins[territory.id] =
            territory.equippedDistrictSkin;
        else delete state.regionOwnerDistrictSkins[territory.id];
      });
      syncTownOwnersForRegions(touchedRegionIds);
      cancelClearingIfTargetTaken(touchedRegionIds);
      cancelClearingIfOriginLost();
      state.activeBattles = (state.activeBattles || []).filter(
        (b: any) => !touchedRegionIds.includes(b.regionId),
      );
      save();
      return handled();
    }

    if (id === "applyBackendClearing") {
      applyBackendClearing(payload?.clearing || payload);
      save();
      return handled();
    }

    if (id === "applyBackendMarch") {
      const applied = applyBackendMarch(
        payload?.march || payload,
        payload?.unitMix || payload,
      );
      save();
      return handledWith(applied);
    }

    if (id === "focusBackendMarch") {
      return handledWith(focusBackendMarch(payload?.marchId));
    }

    if (id === "focusBackendClearing") {
      return handledWith(focusBackendClearing(payload?.territoryId));
    }

    if (id === "focusTerritory") {
      const territoryId = Number(payload?.territoryId);
      const focused = focusBackendClearing(territoryId);
      if (!focused) return handledWith(false);
      state.selected = null;
      state.selectedRegion = reactToCanvasRegionId(territoryId);
      toast(
        payload?.label
          ? `ÄÃƒ Äá»ŠNH Vá»Š ${String(payload.label).toUpperCase()}`
          : `ÄÃƒ Äá»ŠNH Vá»Š LÃƒNH THá»” ${territoryId + 1}`,
      );
      save();
      return handledWith(true);
    }

    return unhandled();
  }

  return {
    handleBackendBridgeAction,
  };
}
