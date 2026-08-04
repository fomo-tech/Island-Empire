// @ts-nocheck

export function createSpatialHelpers(deps: {
  state: any;
  towns: any[];
  WRef: () => number;
  HRef: () => number;
  canvas: HTMLCanvasElement;
  landQueryBuckets: Map<string, any[]>;
  landQueryCellSize: number;
  getSharedRegionPolygon: (
    r: any,
    idx: number,
    isIslet: boolean,
  ) => Array<[number, number]>;
}) {
  const {
    state,
    towns,
    WRef,
    HRef,
    canvas,
    landQueryBuckets,
    landQueryCellSize,
    getSharedRegionPolygon,
  } = deps;

  function townAt(x: number, y: number) {
    if (state.newbieMode && state.newbiePhase !== "done") return null;
    const W = WRef();
    const H = HRef();
    const wx = (x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const wy = (y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    let best: any = null;
    towns.forEach((t) => {
      const d = Math.hypot(t.x - wx, t.y - wy);
      if (d < 48 && (!best || d < best.d)) best = { t, d };
    });
    return best && best.t;
  }

  function screenToMap(x: number, y: number) {
    const W = WRef();
    const H = HRef();
    const tx = (1 - state.zoom) * W * 0.48 + state.panX;
    const ty = (1 - state.zoom) * H * 0.48 + state.panY;
    return {
      x: (x - tx) / state.zoom,
      y: (y - ty) / state.zoom,
    };
  }

  function mapToScreen(x: number, y: number) {
    const W = WRef();
    const H = HRef();
    const tx = (1 - state.zoom) * W * 0.48 + state.panX;
    const ty = (1 - state.zoom) * H * 0.48 + state.panY;
    const canvasX = x * state.zoom + tx;
    const canvasY = y * state.zoom + ty;
    if (typeof document !== "undefined" && canvas) {
      const rect = canvas.getBoundingClientRect();
      const cssX = rect.left + (canvasX / (canvas.width || W)) * rect.width;
      const cssY = rect.top + (canvasY / (canvas.height || H)) * rect.height;
      return { x: cssX, y: cssY };
    }
    return { x: canvasX, y: canvasY };
  }

  function canvasToReactRegionId(canvasId: number): number {
    return canvasId;
  }

  function reactToCanvasRegionId(reactId: number): number {
    return reactId;
  }

  function pointInPolygon(
    px: number,
    py: number,
    polygon: Array<[number, number]>,
  ) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi || 1) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function regionAtCoords(x: number, y: number): number {
    let bestRegion: { id: number; d: number } | null = null;
    const nearbyLands =
      landQueryBuckets.get(
        `${Math.floor(x / landQueryCellSize)}:${Math.floor(y / landQueryCellSize)}`,
      ) || [];
    nearbyLands.forEach((r) => {
      if (r.isIslet) return;
      const brx = (r.rx || r.r || 180) * 1.35;
      const bry = (r.ry || (r.r || 180) * 0.78) * 1.35;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry)
        return;
      const poly = getSharedRegionPolygon(r, r.id, false);
      if (pointInPolygon(x, y, poly)) {
        const d = Math.hypot(x - r.x, y - r.y);
        if (!bestRegion || d < bestRegion.d) bestRegion = { id: r.id, d };
      }
    });

    if (bestRegion !== null) return bestRegion.id;

    let bestIslet: { id: number; d: number } | null = null;
    nearbyLands.forEach((r) => {
      if (!r.isIslet) return;
      const brx = (r.rx || r.r || 120) * 1.05;
      const bry = (r.ry || (r.r || 120) * 0.78) * 1.05;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry)
        return;
      const poly = getSharedRegionPolygon(r, r.id, true);
      if (pointInPolygon(x, y, poly)) {
        const d = Math.hypot(x - r.x, y - r.y);
        if (!bestIslet || d < bestIslet.d) bestIslet = { id: r.id, d };
      }
    });

    return bestIslet !== null ? bestIslet.id : -1;
  }

  function regionAt(x: number, y: number) {
    const p = screenToMap(x, y);
    const canvasId = regionAtCoords(p.x, p.y);
    return canvasId >= 0 ? canvasId : null;
  }

  function derivedRegionOwnership(regionId: number) {
    const explicit = state.regionOwnership[regionId] ?? 0;
    const ownerId = state.regionOwnerIds[regionId];
    const ownerName = state.regionOwnerNames[regionId];
    if (ownerName === "ÄANG KHAI HOANG") return 0;
    if (ownerId) return ownerId === state.localPlayerId ? 1 : 2;
    if (explicit) return explicit;
    if (state.hasAuthoritativeOwnership) return 0;

    const townsInRegion = towns.filter(
      (t) => t.id === 9000 + regionId || t.regionId === regionId,
    );
    if (townsInRegion.some((t) => t.owner === 0)) return 1;
    if (townsInRegion.length > 0) return 2;
    return 0;
  }

  return {
    townAt,
    screenToMap,
    mapToScreen,
    canvasToReactRegionId,
    reactToCanvasRegionId,
    pointInPolygon,
    regionAtCoords,
    regionAt,
    derivedRegionOwnership,
  };
}
