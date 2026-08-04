// @ts-nocheck

export function createCanvasGestureInputHelpers(deps: {
  canvas: HTMLCanvasElement;
  state: any;
  pointer: (e: any) => { x: number; y: number };
  updateCachedRect: () => void;
  buttonAt: (x: number, y: number) => any;
  gearAt: (x: number, y: number) => boolean;
  townAt: (x: number, y: number) => any;
  screenToMap: (x: number, y: number) => { x: number; y: number };
  getMinZoom: () => number;
  getMaxZoom: () => number;
  WRef: () => number;
  HRef: () => number;
  clampPan: () => void;
  saveCamera: () => void;
}) {
  const {
    canvas,
    state,
    pointer,
    updateCachedRect,
    buttonAt,
    gearAt,
    townAt,
    screenToMap,
    getMinZoom,
    getMaxZoom,
    WRef,
    HRef,
    clampPan,
    saveCamera,
  } = deps;

  let dragStartPos = { x: 0, y: 0 };
  let panVelX = 0;
  let panVelY = 0;
  let lastDragTime = 0;
  let clickStartTime = 0;
  let initialPinchDistance = 0;
  let initialPinchZoom = 0;
  let pinchCenterWorld = { x: 0, y: 0 };
  let touchStartClient = { x: 0, y: 0 };

  const onCanvasMouseMove = (e: any) => {
    const p = pointer(e);
    if (state.drag) {
      const now = performance.now();
      const dtMs = Math.max(1, now - lastDragTime);
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;

      panVelX = panVelX * 0.35 + (dx / dtMs) * 16 * 0.65;
      panVelY = panVelY * 0.35 + (dy / dtMs) * 16 * 0.65;
      lastDragTime = now;

      state.panX += dx;
      state.panY += dy;
      state.drag = p;
      const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
      if (totalDist > 4) state.dragMoved = true;
      clampPan();
      return;
    }

    const b = buttonAt(p.x, p.y);
    const t = townAt(p.x, p.y);
    state.hover = gearAt(p.x, p.y)
      ? "fullscreen"
      : b
        ? b.id
        : t
          ? `town-${t.id}`
          : null;
  };

  const onCanvasMouseDown = (e: any) => {
    updateCachedRect();
    const p = pointer(e);
    dragStartPos = p;
    state.dragMoved = false;
    panVelX = 0;
    panVelY = 0;
    lastDragTime = performance.now();
    clickStartTime = performance.now();
    state.targetPanX = null;
    state.targetPanY = null;
    if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
  };

  const onWindowMouseUp = () => {
    if (state.drag) {
      if (performance.now() - lastDragTime > 60) {
        panVelX = 0;
        panVelY = 0;
      }
      state.drag = null;
      saveCamera();
    }
  };

  const onCanvasTouchStart = (e: any) => {
    updateCachedRect();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
      dragStartPos = p;
      touchStartClient = { x: touch.clientX, y: touch.clientY };
      state.dragMoved = false;
      panVelX = 0;
      panVelY = 0;
      lastDragTime = performance.now();
      clickStartTime = performance.now();
      state.targetPanX = null;
      state.targetPanY = null;
      if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
    } else if (e.touches.length === 2) {
      state.drag = null;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDistance = Math.hypot(
        t1.clientX - t2.clientX,
        t1.clientY - t2.clientY,
      );
      initialPinchZoom = state.zoom;
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const p = pointer({ clientX: cx, clientY: cy });
      pinchCenterWorld = screenToMap(p.x, p.y);
    }
  };

  const onCanvasTouchMove = (e: any) => {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length === 1 && state.drag) {
      const touch = e.touches[0];
      const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
      const now = performance.now();
      const dtMs = Math.max(1, now - lastDragTime);
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;

      panVelX = panVelX * 0.35 + (dx / dtMs) * 16 * 0.65;
      panVelY = panVelY * 0.35 + (dy / dtMs) * 16 * 0.65;
      lastDragTime = now;

      state.panX += dx;
      state.panY += dy;
      state.drag = p;
      const totalDist = Math.hypot(
        touch.clientX - touchStartClient.x,
        touch.clientY - touchStartClient.y,
      );
      if (totalDist > 4) state.dragMoved = true;
      clampPan();
    } else if (e.touches.length === 2 && initialPinchDistance > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(
        t1.clientX - t2.clientX,
        t1.clientY - t2.clientY,
      );
      const scale = currentDist / initialPinchDistance;
      const minZ = getMinZoom();
      const maxZ = getMaxZoom();
      const newZoom = Math.max(minZ, Math.min(maxZ, initialPinchZoom * scale));

      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const screenPos = pointer({ clientX: cx, clientY: cy });
      const W = WRef();
      const H = HRef();

      state.zoom = newZoom;
      state.targetZoom = newZoom;
      state.panX =
        screenPos.x - pinchCenterWorld.x * newZoom - (1 - newZoom) * W * 0.48;
      state.panY =
        screenPos.y - pinchCenterWorld.y * newZoom - (1 - newZoom) * H * 0.48;
      clampPan();
    }
  };

  const onTouchEnd = () => {
    if (state.drag) {
      if (performance.now() - lastDragTime > 60) {
        panVelX = 0;
        panVelY = 0;
      }
      state.drag = null;
      saveCamera();
    }
    initialPinchDistance = 0;
  };

  const onCanvasWheel = (e: any) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.86;
    const oldZoom = state.zoom;
    const minZ = getMinZoom();
    const maxZ = getMaxZoom();
    const newZoom = Math.max(minZ, Math.min(maxZ, oldZoom * zoomFactor));
    if (Math.abs(newZoom - oldZoom) > 0.001) {
      const p = pointer(e);
      const W = WRef();
      const H = HRef();
      const focalX = (p.x - (1 - oldZoom) * W * 0.48 - state.panX) / oldZoom;
      const focalY = (p.y - (1 - oldZoom) * H * 0.48 - state.panY) / oldZoom;
      state.zoom = newZoom;
      state.targetZoom = newZoom;
      state.panX = p.x - focalX * newZoom - (1 - newZoom) * W * 0.48;
      state.panY = p.y - focalY * newZoom - (1 - newZoom) * H * 0.48;
      clampPan();
      saveCamera();
    }
  };

  function registerCanvasGestureInput() {
    canvas.addEventListener("mousemove", onCanvasMouseMove);
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    window.addEventListener("mouseup", onWindowMouseUp);
    canvas.addEventListener("touchstart", onCanvasTouchStart, {
      passive: false,
    });
    canvas.addEventListener("touchmove", onCanvasTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
  }

  function unregisterCanvasGestureInput() {
    canvas.removeEventListener("mousemove", onCanvasMouseMove);
    canvas.removeEventListener("mousedown", onCanvasMouseDown);
    window.removeEventListener("mouseup", onWindowMouseUp);
    canvas.removeEventListener("touchstart", onCanvasTouchStart);
    canvas.removeEventListener("touchmove", onCanvasTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    canvas.removeEventListener("wheel", onCanvasWheel);
  }

  function shouldIgnoreCanvasClick(p: { x: number; y: number }) {
    const clickDuration = performance.now() - clickStartTime;
    const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
    if (state.dragMoved || totalDist > 4 || clickDuration > 220) {
      state.dragMoved = false;
      return true;
    }
    return false;
  }

  function isFastPanning(minimapDragging: boolean) {
    return (
      Boolean(state.drag) ||
      Math.abs(panVelX) > 0.35 ||
      Math.abs(panVelY) > 0.35 ||
      minimapDragging
    );
  }

  function applyCameraInertiaStep() {
    if (!state.drag && (Math.abs(panVelX) > 0.05 || Math.abs(panVelY) > 0.05)) {
      state.panX += panVelX;
      state.panY += panVelY;
      panVelX *= 0.82;
      panVelY *= 0.82;
      clampPan();
      if (Math.abs(panVelX) <= 0.05 && Math.abs(panVelY) <= 0.05) {
        panVelX = 0;
        panVelY = 0;
        saveCamera();
      }
    }
  }

  return {
    registerCanvasGestureInput,
    unregisterCanvasGestureInput,
    shouldIgnoreCanvasClick,
    isFastPanning,
    applyCameraInertiaStep,
  };
}
