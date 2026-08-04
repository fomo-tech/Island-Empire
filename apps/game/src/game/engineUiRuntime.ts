// @ts-nocheck

export function createUiRuntimeHelpers(deps: {
  state: any;
  reactToCanvasRegionId: (id: number) => number;
  landById: (id: number) => any;
  getDefaultFarZoom: () => number;
  getMinZoom: () => number;
  getMaxZoom: () => number;
  WRef: () => number;
  HRef: () => number;
  clampPan: () => void;
  saveCamera: () => void;
}) {
  const {
    state,
    reactToCanvasRegionId,
    landById,
    getDefaultFarZoom,
    getMinZoom,
    getMaxZoom,
    WRef,
    HRef,
    clampPan,
    saveCamera,
  } = deps;

  let toastTimeout: any = null;

  function focusBackendMarch(marchId?: string) {
    const voyage = state.voyages.find(
      (item: any) =>
        item.backendMarchId === marchId || (!marchId && item.owner === 1),
    );
    if (!voyage?.from || !voyage?.to) return false;

    const W = WRef();
    const H = HRef();
    const centerX = (voyage.from.x + voyage.to.x) / 2;
    const centerY = (voyage.from.y + voyage.to.y) / 2;
    const routeWidth = Math.abs(voyage.to.x - voyage.from.x) + 520;
    const routeHeight = Math.abs(voyage.to.y - voyage.from.y) + 420;
    const fittedZoom = Math.min(
      getDefaultFarZoom(),
      (W * 0.82) / Math.max(1, routeWidth),
      (H * 0.68) / Math.max(1, routeHeight),
    );
    state.zoom = Math.max(getMinZoom(), Math.min(getMaxZoom(), fittedZoom));
    state.targetZoom = state.zoom;
    state.panX = W / 2 - centerX * state.zoom - (1 - state.zoom) * W * 0.48;
    state.panY = H / 2 - centerY * state.zoom - (1 - state.zoom) * H * 0.48;
    state.targetPanX = null;
    state.targetPanY = null;
    clampPan();
    saveCamera();
    return true;
  }

  function focusBackendClearing(territoryId: number) {
    const regionId = reactToCanvasRegionId(Number(territoryId));
    const region = landById(regionId);
    if (!region) return false;
    const W = WRef();
    const H = HRef();
    const zoom = getDefaultFarZoom();
    state.zoom = zoom;
    state.targetZoom = zoom;
    state.panX = W / 2 - region.x * zoom - (1 - zoom) * W * 0.48;
    state.panY = H / 2 - region.y * zoom - (1 - zoom) * H * 0.48;
    state.targetPanX = null;
    state.targetPanY = null;
    clampPan();
    saveCamera();
    return true;
  }

  function toast(msg: string) {
    state.toast = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (
      msg &&
      msg !== "TÃ‚N THá»¦: CHá»ŒN Máº¢NH Äáº¤T HOANG Äá»‚ XÃ‚Y THÃ€NH" &&
      msg !== "CHá»ŒN Cá»œ VÃ€ BIá»‚U TÆ¯á»¢NG Rá»’I XÃC NHáº¬N XÃ‚Y THÃ€NH"
    ) {
      toastTimeout = setTimeout(() => {
        if (state.toast === msg) {
          state.toast = "CHá»ŒN THÃ€NH Cá»¦A Báº N Äá»‚ RA Lá»†NH";
        }
      }, 3000);
    }
  }

  function pushLog(msg: string) {
    state.log.push(msg);
    if (state.log.length > 8) state.log.shift();
  }

  return {
    focusBackendMarch,
    focusBackendClearing,
    toast,
    pushLog,
  };
}
