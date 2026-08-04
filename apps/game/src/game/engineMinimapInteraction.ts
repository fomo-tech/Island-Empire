// @ts-nocheck

export function createMinimapInteractionHelpers(deps: {
  getMinimapCanvas: () => HTMLCanvasElement | null | undefined;
  getZoom: () => number;
  WRef: () => number;
  HRef: () => number;
  clampPan: () => void;
  saveCamera: () => void;
  setPan: (x: number, y: number) => void;
  isMinimapDragging: () => boolean;
  setMinimapDragging: (value: boolean) => void;
}) {
  const {
    getMinimapCanvas,
    getZoom,
    WRef,
    HRef,
    clampPan,
    saveCamera,
    setPan,
    isMinimapDragging,
    setMinimapDragging,
  } = deps;

  function panToMinimapCoords(e: any) {
    const minimapCanvas = getMinimapCanvas();
    if (!minimapCanvas) return;
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (160 / rect.width);
    const my = (e.clientY - rect.top) * (120 / rect.height);
    const worldX = Math.max(0, Math.min(24000, mx * 150));
    const worldY = Math.max(0, Math.min(18000, my * 150));

    const zoom = getZoom();
    const W = WRef();
    const H = HRef();
    setPan(
      -worldX * zoom + W * 0.5 - (1 - zoom) * W * 0.48,
      -worldY * zoom + H * 0.5 - (1 - zoom) * H * 0.48,
    );
    clampPan();
    saveCamera();
  }

  const onMinimapMouseMove = (e: any) => {
    if (isMinimapDragging()) panToMinimapCoords(e);
  };

  const onMinimapMouseUp = () => {
    setMinimapDragging(false);
    window.removeEventListener("mousemove", onMinimapMouseMove);
    window.removeEventListener("mouseup", onMinimapMouseUp);
  };

  const onMinimapMouseDown = (e: any) => {
    setMinimapDragging(true);
    panToMinimapCoords(e);
    window.addEventListener("mousemove", onMinimapMouseMove);
    window.addEventListener("mouseup", onMinimapMouseUp);
  };

  function bindMinimapMouseDown() {
    const minimapCanvas = getMinimapCanvas();
    if (minimapCanvas) {
      minimapCanvas.addEventListener("mousedown", onMinimapMouseDown);
    }
  }

  function unbindMinimapMouseDown() {
    const minimapCanvas = getMinimapCanvas();
    if (minimapCanvas) {
      minimapCanvas.removeEventListener("mousedown", onMinimapMouseDown);
    }
  }

  function cleanupMinimapWindowListeners() {
    setMinimapDragging(false);
    window.removeEventListener("mousemove", onMinimapMouseMove);
    window.removeEventListener("mouseup", onMinimapMouseUp);
  }

  return {
    bindMinimapMouseDown,
    unbindMinimapMouseDown,
    cleanupMinimapWindowListeners,
  };
}
