// @ts-nocheck

export function createCameraPersistenceHelpers(deps: {
  state: any;
  cameraKey: string;
  getDefaultFarZoom: () => number;
  getMinZoom: () => number;
  getMaxZoom: () => number;
  clampPan: () => void;
}) {
  const {
    state,
    cameraKey,
    getDefaultFarZoom,
    getMinZoom,
    getMaxZoom,
    clampPan,
  } = deps;

  let lastCameraSaveAt = 0;
  let cameraSavePending = false;

  function saveCamera(force = false) {
    try {
      const now = performance.now();
      if (!force && now - lastCameraSaveAt < 500) {
        cameraSavePending = true;
        return;
      }
      lastCameraSaveAt = now;
      cameraSavePending = false;
      localStorage.setItem(
        cameraKey,
        JSON.stringify({
          zoom: state.zoom,
          targetZoom: state.targetZoom,
          panX: state.panX,
          panY: state.panY,
          selected: state.selected,
          selectedRegion: state.selectedRegion,
        }),
      );
    } catch {}
  }

  function shouldFlushPendingCameraSave(
    now: number,
    isFastPanning: () => boolean,
  ) {
    return (
      !isFastPanning() && cameraSavePending && now - lastCameraSaveAt >= 500
    );
  }

  function loadCamera() {
    const minZ = getMinZoom();
    const maxZ = getMaxZoom();
    const fallbackZoom = getDefaultFarZoom();

    try {
      const raw = localStorage.getItem(cameraKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const loadedZoom = Number(parsed?.zoom);
        const loadedTargetZoom = Number(parsed?.targetZoom);
        const loadedPanX = Number(parsed?.panX);
        const loadedPanY = Number(parsed?.panY);

        if (Number.isFinite(loadedZoom)) {
          state.zoom = Math.max(minZ, Math.min(maxZ, loadedZoom));
        }
        if (Number.isFinite(loadedTargetZoom)) {
          state.targetZoom = Math.max(minZ, Math.min(maxZ, loadedTargetZoom));
        }
        if (Number.isFinite(loadedPanX)) {
          state.panX = loadedPanX;
        }
        if (Number.isFinite(loadedPanY)) {
          state.panY = loadedPanY;
        }
        if (parsed?.selected !== undefined) {
          state.selected = parsed.selected;
        }
        if (parsed?.selectedRegion !== undefined) {
          state.selectedRegion = parsed.selectedRegion;
        }
      }
    } catch {}

    if (!Number.isFinite(state.zoom) || state.zoom <= 0) {
      state.zoom = fallbackZoom;
    }
    if (!Number.isFinite(state.targetZoom)) {
      state.targetZoom = state.zoom;
    }
    state.zoom = Math.max(minZ, Math.min(maxZ, state.zoom));
    state.targetZoom = Math.max(minZ, Math.min(maxZ, state.targetZoom));
    clampPan();
  }

  return {
    saveCamera,
    loadCamera,
    shouldFlushPendingCameraSave,
  };
}
