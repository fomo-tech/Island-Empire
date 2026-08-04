// @ts-nocheck

export function createEngineActionFollowupHelper(deps: {
  state: any;
  towns: any[];
  W: number;
  H: number;
  toast: (message: string) => void;
  save: () => void;
  saveCamera: () => void;
  clampPan: () => void;
  worldContentBounds: () => any;
  getDefaultFarZoom: () => number;
  landById: (id: number) => any;
  reactToCanvasRegionId: (id: number) => number;
  refundSettlerPopulationForRegion: (regionId: number) => void;
  beginSettlerReturn: (regionId: number, message: string) => void;
  ensureTownForRegion: (regionId: number, owner: number) => any;
}) {
  const {
    state,
    towns,
    W,
    H,
    toast,
    save,
    saveCamera,
    clampPan,
    worldContentBounds,
    getDefaultFarZoom,
    landById,
    reactToCanvasRegionId,
    refundSettlerPopulationForRegion,
    beginSettlerReturn,
    ensureTownForRegion,
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

  function handleFollowupAction(id: string, payload?: any) {
    if (id === "markClearingRejected") {
      const regionId = payload?.regionId;
      if (regionId !== undefined && regionId !== null) {
        refundSettlerPopulationForRegion(regionId);
        state.regionOwnership[regionId] = 0;
        delete state.regionOwnerIds[regionId];
        delete state.regionOwnerNames[regionId];
        delete state.regionOwnerAllianceTags[regionId];
        delete state.regionOwnerAllianceEmblems[regionId];
        state.regionClearing[regionId] = 0;
        delete state.activeClearingTimings[regionId];
        if (state.regionInProgress === regionId) state.regionInProgress = -1;
      }
      state.settlerTravel = {
        active: false,
        targetRegionId: -1,
        originTownId: null,
        originX: 0,
        originY: 0,
      };
      state.pendingBackendClearingStarts =
        state.pendingBackendClearingStarts.filter(
          (id: number) => id !== regionId,
        );
      toast(
        payload?.message ||
          "SERVER Tá»ª CHá»I XÃ‚Y THÃ€NH, ÄÃƒ HOÃ€N TÃ€I NGUYÃŠN",
      );
      return handled();
    }

    if (id === "consumeBackendClaims") {
      state.pendingBackendClaims = [];
      return handled();
    }

    if (id === "consumeBackendClaim") {
      const regionId = payload?.regionId ?? payload;
      state.pendingBackendClaims = state.pendingBackendClaims.filter(
        (id: number) => id !== regionId,
      );
      return handled();
    }

    if (id === "consumeBackendConquests") {
      state.pendingBackendConquests = [];
      return handled();
    }

    if (id === "consumeBackendClearingStarts") {
      state.pendingBackendClearingStarts = [];
      return handled();
    }

    if (id === "markClaimRejected") {
      const regionId = payload?.regionId;
      if (regionId !== undefined && regionId !== null) {
        state.regionOwnership[regionId] = 0;
        state.regionClearing[regionId] = 0;
        delete state.activeClearingTimings[regionId];
        delete state.regionOwnerIds[regionId];
        delete state.regionOwnerNames[regionId];
        for (let i = towns.length - 1; i >= 0; i--) {
          if (towns[i].owner === 0 && towns[i].regionId === regionId)
            towns.splice(i, 1);
        }
      }
      state.pendingBackendClaims = state.pendingBackendClaims.filter(
        (id: number) => id !== regionId,
      );
      toast("SERVER Tá»ª CHá»I: LÃƒNH THá»” NÃ€Y ÄÃƒ CÃ“ NGÆ¯á»œI CHIáº¾M");
      return handled();
    }

    if (id === "claimRegion") {
      toast("XÃ‚Y THÃ€NH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return handled();
    }

    if (id === "cancelClaimRegion") {
      const canvasId = reactToCanvasRegionId(payload);
      state.regionInProgress = -1;
      state.regionClearing[canvasId] = 0;
      delete state.activeClearingTimings[canvasId];
      state.regionOwnership[canvasId] = 0;
      delete state.regionOwnerNames[canvasId];
      delete state.regionOwnerFlagColors[canvasId];
      delete state.regionOwnerEmblems[canvasId];
      delete state.regionOwnerIds[canvasId];
      delete state.regionSettlementKinds[canvasId];
      beginSettlerReturn(
        canvasId,
        "ÄÃƒ Há»¦Y XÃ‚Y THÃ€NH: Äá»˜I THá»¢ QUAY Vá»€, Äáº¤T ÄÃƒ RESET TRá»ž Vá»€ HOANG DÃƒ",
      );
      return handled();
    }

    if (id === "marchAttack") {
      toast("HÃ€NH QUÃ‚N PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return handledWith(false);
    }

    if (id === "marchReinforce") {
      toast("HÃ€NH QUÃ‚N PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return handledWith(false);
    }

    if (id === "selectTown") {
      let townId = payload.townId;
      if (payload.regionId !== undefined && payload.regionId !== null) {
        const t = ensureTownForRegion(payload.regionId, 1);
        if (t) townId = t.id;
      }
      state.selected = townId;
      state.selectedRegion = null;
      save();
      return handled();
    }

    if (id === "centerCamera") {
      const b = worldContentBounds();
      const x = Math.max(b.minX, Math.min(b.maxX, Number(payload?.x) || b.cx));
      const y = Math.max(b.minY, Math.min(b.maxY, Number(payload?.y) || b.cy));
      const farZ = getDefaultFarZoom();
      state.zoom = farZ;
      state.targetZoom = farZ;
      state.panX = W / 2 - x * state.zoom - (1 - state.zoom) * W * 0.48;
      state.panY = H / 2 - y * state.zoom - (1 - state.zoom) * H * 0.48;
      state.selected = null;
      state.selectedRegion = null;
      clampPan();
      toast(
        payload?.label
          ? `ÄÃƒ NHáº¢Y Äáº¾N ${payload.label}`
          : `ÄÃƒ NHáº¢Y Äáº¾N X:${Math.round(x)} Y:${Math.round(y)}`,
      );
      saveCamera();
      save();
      return handled();
    }

    if (id === "setStarterRegion") {
      if (state.cameraRestored && !payload?.force) return handled();
      const regionId = reactToCanvasRegionId(payload.regionId);
      const r = landById(regionId);
      if (!r) return handled();
      const farZ = getDefaultFarZoom();
      state.zoom = farZ;
      state.targetZoom = farZ;
      state.panX = W / 2 - r.x * state.zoom - (1 - state.zoom) * W * 0.48;
      state.panY = H / 2 - r.y * state.zoom - (1 - state.zoom) * H * 0.48;
      state.selected = null;
      state.selectedRegion = null;
      state.newbieSelectedRegion = regionId;
      clampPan();
      toast(`Gá»¢I Ã VÃ™NG KHá»žI Äáº¦U: LÃƒNH THá»” ${regionId + 1}`);
      saveCamera();
      return handled();
    }

    if (id === "buildStructure") {
      toast(
        "TÃNH NÄ‚NG XÃ‚Y CÃ”NG TRÃŒNH ÄÃƒ Táº M áº¨N Äá»‚ CHá» Äá»’NG Bá»˜ SERVER",
      );
      return handled();
    }

    if (id === "upgradeResearch") {
      toast(
        "TÃNH NÄ‚NG NGHIÃŠN Cá»¨U ÄÃƒ Táº M áº¨N Äá»‚ CHá» Äá»’NG Bá»˜ SERVER",
      );
      return handled();
    }

    if (id === "allyTrade") {
      toast("GIAO THÆ¯Æ NG LIÃŠN MINH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return handled();
    }

    if (id === "allyHire") {
      toast("THUÃŠ VIá»†N BINH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return handled();
    }

    if (id === "triggerEvent") {
      toast(
        "TÃNH NÄ‚NG Sá»° KIá»†N BUFF ÄÃƒ Táº M áº¨N Äá»‚ CHá» Äá»’NG Bá»˜ SERVER",
      );
      return handled();
    }

    return unhandled();
  }

  return {
    handleFollowupAction,
  };
}
