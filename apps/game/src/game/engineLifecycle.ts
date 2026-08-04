// @ts-nocheck

export function createEngineLifecycleHelper(deps: {
  setDestroyed: (value: boolean) => void;
  saveCamera: (force?: boolean) => void;
  clearAllRegionCache: () => void;
  resizeCanvas: () => void;
  flushCameraOnPageHide: () => void;
  unregisterRectInvalidation: () => void;
  unregisterCanvasGestureInput: () => void;
  canvas: HTMLCanvasElement;
  onCanvasClick: (e: MouseEvent) => void;
  unregisterKeyboardShortcuts: () => void;
  cleanupMinimapWindowListeners: () => void;
  unbindMinimapMouseDown: () => void;
  rafRef: () => number;
}) {
  const {
    setDestroyed,
    saveCamera,
    clearAllRegionCache,
    resizeCanvas,
    flushCameraOnPageHide,
    unregisterRectInvalidation,
    unregisterCanvasGestureInput,
    canvas,
    onCanvasClick,
    unregisterKeyboardShortcuts,
    cleanupMinimapWindowListeners,
    unbindMinimapMouseDown,
    rafRef,
  } = deps;

  function destroy() {
    setDestroyed(true);
    saveCamera(true);
    clearAllRegionCache();
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("pagehide", flushCameraOnPageHide);
    unregisterRectInvalidation();
    unregisterCanvasGestureInput();
    canvas.removeEventListener("click", onCanvasClick);
    unregisterKeyboardShortcuts();
    cleanupMinimapWindowListeners();
    unbindMinimapMouseDown();
    const raf = rafRef();
    if (raf) cancelAnimationFrame(raf);
  }

  return {
    destroy,
  };
}
