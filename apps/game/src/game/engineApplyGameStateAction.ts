// @ts-nocheck

export function createApplyGameStateActionHelper(deps: {
  state: any;
  onboardingKey: string;
  save: () => void;
  syncTownOwnersForRegions: (regionIds: number[]) => void;
  applyBackendTownSnapshots: (snapshots: any[]) => void;
  cancelClearingIfTargetTaken: (regionIds: number[]) => void;
  cancelClearingIfOriginLost: () => void;
  applyBackendMarch: (payload: any, unitMix?: any) => any;
  applyBackendBattles: (battles: any[], merge?: boolean) => void;
  applyBackendClearing: (payload: any) => void;
  regionAtCoords: (x: number, y: number) => number;
  normalizeKingdomArchitecture: (id: string) => string;
  kingdomArchitectureFromEmblem: (emblem: string) => string;
}) {
  const {
    state,
    onboardingKey,
    save,
    syncTownOwnersForRegions,
    applyBackendTownSnapshots,
    cancelClearingIfTargetTaken,
    cancelClearingIfOriginLost,
    applyBackendMarch,
    applyBackendBattles,
    applyBackendClearing,
    regionAtCoords,
    normalizeKingdomArchitecture,
    kingdomArchitectureFromEmblem,
  } = deps;

  function handleApplyGameStateAction(id: string, payload?: any) {
    if (id !== "applyGameState") return false;

    if (payload?.resources) {
      state.resources = { ...state.resources, ...payload.resources };
    }
    if (payload?.newbieShieldUntil !== undefined) {
      state.newbieShieldUntil = payload.newbieShieldUntil
        ? new Date(payload.newbieShieldUntil).getTime()
        : 0;
      localStorage.setItem(
        "island_empire_newbie_shield_until",
        String(state.newbieShieldUntil),
      );
    }
    if (payload?.playerProfile) {
      state.newbieFlagColor = payload.playerProfile.flagColor;
      state.newbieEmblem = payload.playerProfile.emblem;
      state.newbieArchitectureId = normalizeKingdomArchitecture(
        payload.playerProfile.kingdomArchitectureId ||
          kingdomArchitectureFromEmblem(payload.playerProfile.emblem),
      );
    }
    const touchedRegionIds = [];
    state.hasAuthoritativeOwnership = true;
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
    state.regionOwnerCapitalSkins = {};
    state.regionOwnerDistrictSkins = {};
    state.activeClearingTimings = {};
    state.regionInProgress = -1;
    state.settlerTravel = {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    };
    let hasOwnedTerritory = false;
    (payload?.territories || []).forEach((territory: any) => {
      const ownerId = territory.ownerId || null;
      const ownerCode = ownerId
        ? ownerId === state.localPlayerId
          ? 1
          : 2
        : territory.ownerCode || 0;
      if (ownerCode === 1) {
        hasOwnedTerritory = true;
      }
      touchedRegionIds.push(territory.id);
      state.regionOwnership[territory.id] = ownerCode;
      if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
      if (territory.ownerName)
        state.regionOwnerNames[territory.id] =
          ownerCode === 1
            ? state.localPlayerName || "Báº N"
            : territory.ownerName;
      if (territory.ownerFlagColor)
        state.regionOwnerFlagColors[territory.id] = territory.ownerFlagColor;
      if (territory.ownerEmblem)
        state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
      if (territory.ownerArchitectureId)
        state.regionOwnerArchitectureIds[territory.id] =
          territory.ownerArchitectureId;
      if (territory.ownerAllianceTag)
        state.regionOwnerAllianceTags[territory.id] =
          territory.ownerAllianceTag;
      if (territory.ownerAllianceEmblem)
        state.regionOwnerAllianceEmblems[territory.id] =
          territory.ownerAllianceEmblem;
      if (territory.settlementKind)
        state.regionSettlementKinds[territory.id] = territory.settlementKind;
      if (territory.parentTerritoryId !== undefined)
        state.regionParentTerritoryIds[territory.id] =
          territory.parentTerritoryId;
      if (territory.rootTerritoryId !== undefined)
        state.regionRootTerritoryIds[territory.id] = territory.rootTerritoryId;
      if (territory.connectionType)
        state.regionConnectionTypes[territory.id] = territory.connectionType;
      if (Array.isArray(territory.specialResources))
        state.regionSpecialResources[territory.id] = territory.specialResources;
      if (territory.equippedCapitalSkin)
        state.regionOwnerCapitalSkins[territory.id] =
          territory.equippedCapitalSkin;
      if (territory.equippedDistrictSkin)
        state.regionOwnerDistrictSkins[territory.id] =
          territory.equippedDistrictSkin;
    });
    if (hasOwnedTerritory) {
      if (state.newbieMode) {
        state.newbieMode = false;
        state.newbiePhase = "done";
        localStorage.removeItem(onboardingKey);
      }
    } else {
      state.newbieMode = true;
      if (state.newbiePhase === "none" || state.newbiePhase === "done") {
        state.newbiePhase = "select_land";
      }
      state.toast = "TÃ‚N THá»¦: CHá»ŒN Máº¢NH Äáº¤T HOANG Äá»‚ XÃ‚Y THÃ€NH";
    }
    syncTownOwnersForRegions(touchedRegionIds);
    applyBackendTownSnapshots(payload?.towns || []);
    cancelClearingIfTargetTaken(touchedRegionIds);
    cancelClearingIfOriginLost();
    state.voyages = state.voyages.filter((voyage: any) => {
      const targetReg =
        voyage.targetRegionId ??
        (voyage.to ? regionAtCoords(voyage.to.x, voyage.to.y) : -1);
      const isServerActive = (payload?.marches || []).some((m: any) => {
        const mId = m._id || m.id || m.marchId;
        return mId === voyage.backendMarchId;
      });
      return isServerActive && voyage.t < voyage.duration;
    });
    (payload?.marches || []).forEach((march: any) => {
      try {
        applyBackendMarch(march);
      } catch (err) {
        console.warn("Failed to hydrate march:", march, err);
      }
    });
    try {
      applyBackendBattles(payload?.battles || [], false);
    } catch (err) {
      console.warn("Failed to hydrate battles:", err);
    }

    if (Array.isArray(payload?.clearings) && payload.clearings.length > 0) {
      payload.clearings.forEach((clearing: any) => {
        try {
          applyBackendClearing(clearing);
        } catch (err) {
          console.warn("Failed to hydrate clearing:", clearing, err);
        }
      });
    }

    save();
    return true;
  }

  return {
    handleApplyGameStateAction,
  };
}
