// @ts-nocheck

export function createViewportHelpers(deps: {
  state: any;
  getWidth: () => number;
  getHeight: () => number;
}) {
  const { state, getWidth, getHeight } = deps;

  function getWorldViewport() {
    const W = getWidth();
    const H = getHeight();
    const invZoom = 1 / (state.zoom || 1);
    const offX = -((1 - state.zoom) * W * 0.48 + state.panX) * invZoom;
    const offY = -((1 - state.zoom) * H * 0.48 + state.panY) * invZoom;
    const margin = 200;
    return {
      minX: offX - margin,
      minY: offY - margin,
      maxX: offX + W * invZoom + margin,
      maxY: offY + H * invZoom + margin,
    };
  }

  function isRegionInViewport(r: any, vp: any) {
    if (!r) return false;
    const rx = r.rx || 150;
    const ry = r.ry || 120;
    return (
      r.x + rx >= vp.minX &&
      r.x - rx <= vp.maxX &&
      r.y + ry >= vp.minY &&
      r.y - ry <= vp.maxY
    );
  }

  function isPointInViewport(x: number, y: number, vp: any, margin = 200) {
    if (!vp) return true;
    return (
      x >= vp.minX - margin &&
      x <= vp.maxX + margin &&
      y >= vp.minY - margin &&
      y <= vp.maxY + margin
    );
  }

  return {
    getWorldViewport,
    isRegionInViewport,
    isPointInViewport,
  };
}
