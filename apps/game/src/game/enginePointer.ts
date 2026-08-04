// @ts-nocheck

export function createPointerHelpers(deps: {
  canvas: HTMLCanvasElement;
  WRef: () => number;
  HRef: () => number;
}) {
  const { canvas, WRef, HRef } = deps;

  let cachedRect: DOMRect | null = null;

  function updateCachedRect() {
    cachedRect = canvas.getBoundingClientRect();
  }

  const onWindowResize = () => {
    cachedRect = null;
  };

  const onWindowScroll = () => {
    cachedRect = null;
  };

  function registerRectInvalidation() {
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("scroll", onWindowScroll, { passive: true });
  }

  function unregisterRectInvalidation() {
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("scroll", onWindowScroll);
  }

  function pointer(e: any) {
    if (!cachedRect) updateCachedRect();
    const rect = cachedRect || canvas.getBoundingClientRect();
    if ((window as any).__isRotatedLandscape) {
      const physicalW = window.screen?.width || window.innerWidth;
      const rawX = e.clientY;
      const rawY = physicalW - e.clientX;
      return {
        x: rawX * (WRef() / (rect.width || 1)),
        y: rawY * (HRef() / (rect.height || 1)),
      };
    }
    return {
      x: (e.clientX - rect.left) * (WRef() / (rect.width || 1)),
      y: (e.clientY - rect.top) * (HRef() / (rect.height || 1)),
    };
  }

  return {
    updateCachedRect,
    pointer,
    registerRectInvalidation,
    unregisterRectInvalidation,
  };
}
