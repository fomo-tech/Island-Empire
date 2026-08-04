// @ts-nocheck

type MapPoint = { x: number; y: number };

export function createRouteUtils(deps: {
  allGenerated: any[];
  landById: (id: number) => any;
  regionAtCoords: (x: number, y: number) => number;
  territorySpecialResources: (regionId: number) => string[];
  mainlandCoastalRegionIds: Set<number>;
  megaContinents: any[];
  derivedRegionOwnership: (regionId: number) => number;
  lerp: (a: number, b: number, t: number) => number;
}) {
  const {
    allGenerated,
    landById,
    regionAtCoords,
    territorySpecialResources,
    mainlandCoastalRegionIds,
    megaContinents,
    derivedRegionOwnership,
    lerp,
  } = deps;

  function segmentTouchesSea(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const steps = Math.max(
      12,
      Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 42),
    );
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const x = lerp(a.x, b.x, p);
      const y = lerp(a.y, b.y, p);
      if (regionAtCoords(x, y) < 0) return true;
    }
    return false;
  }

  function isWaterAt(x: number, y: number) {
    return regionAtCoords(x, y) < 0;
  }

  function findCoastPortCandidates(
    regionId: number,
    toward: { x: number; y: number },
    limit = 10,
  ) {
    const r = landById(regionId);
    if (!r) return [];
    const rx = r.rx || r.r || 120;
    const ry = r.ry || (r.r || 120) * 0.78;
    const baseAngle = Math.atan2(toward.y - r.y, toward.x - r.x);
    const candidates: {
      score: number;
      land: { x: number; y: number };
      water: { x: number; y: number };
      dir: { x: number; y: number };
    }[] = [];
    for (let i = 0; i < 64; i++) {
      const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 32);
      const a = baseAngle + offset;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const shoreLand = { x: r.x + dx * rx * 0.88, y: r.y + dy * ry * 0.88 };
      if (regionAtCoords(shoreLand.x, shoreLand.y) < 0) continue;

      let waterPoint: { x: number; y: number } | null = null;
      for (const mult of [1.05, 1.12, 1.2, 1.3]) {
        const wx = r.x + dx * rx * mult;
        const wy = r.y + dy * ry * mult;
        if (regionAtCoords(wx, wy) < 0) {
          waterPoint = { x: wx, y: wy };
          break;
        }
      }
      if (!waterPoint) continue;
      const distToTarget = Math.hypot(
        waterPoint.x - toward.x,
        waterPoint.y - toward.y,
      );
      const score = Math.abs(offset) * 250 + distToTarget;
      candidates.push({
        score,
        land: shoreLand,
        water: waterPoint,
        dir: { x: dx, y: dy },
      });
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, limit);
  }

  function polylineLength(points: MapPoint[]) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      );
    }
    return total;
  }

  function waterSegmentClear(a: MapPoint, b: MapPoint) {
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!isWaterAt(lerp(a.x, b.x, t), lerp(a.y, b.y, t))) return false;
    }
    return true;
  }

  const seaRouteBounds = allGenerated.reduce(
    (bounds: any, r: any) => {
      const rx = (r.rx || r.r || 180) * 1.55;
      const ry = (r.ry || (r.r || 180) * 0.78) * 1.55;
      bounds.minX = Math.min(bounds.minX, r.x - rx);
      bounds.maxX = Math.max(bounds.maxX, r.x + rx);
      bounds.minY = Math.min(bounds.minY, r.y - ry);
      bounds.maxY = Math.max(bounds.maxY, r.y + ry);
      return bounds;
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  const shortestWaterPathCache = new Map<string, MapPoint[] | null>();

  function findShortestWaterPath(
    start: MapPoint,
    goal: MapPoint,
  ): MapPoint[] | null {
    if (waterSegmentClear(start, goal)) return [start, goal];
    const cacheKey = `${Math.round(start.x / 12)}:${Math.round(start.y / 12)}:${Math.round(goal.x / 12)}:${Math.round(goal.y / 12)}`;
    if (shortestWaterPathCache.has(cacheKey)) {
      return shortestWaterPathCache.get(cacheKey) || null;
    }

    const step = 92;
    const margin = 460;
    const minX = Math.floor((seaRouteBounds.minX - margin) / step) * step;
    const minY = Math.floor((seaRouteBounds.minY - margin) / step) * step;
    const maxX = Math.ceil((seaRouteBounds.maxX + margin) / step) * step;
    const maxY = Math.ceil((seaRouteBounds.maxY + margin) / step) * step;
    const cols = Math.floor((maxX - minX) / step) + 1;
    const rows = Math.floor((maxY - minY) / step) + 1;
    const count = cols * rows;
    if (count <= 0 || count > 180000) return null;

    const pointFor = (index: number) => ({
      x: minX + (index % cols) * step,
      y: minY + Math.floor(index / cols) * step,
    });
    const waterMemo = new Int8Array(count);
    const isWaterNode = (index: number) => {
      if (waterMemo[index] !== 0) return waterMemo[index] === 1;
      const point = pointFor(index);
      const water = isWaterAt(point.x, point.y);
      waterMemo[index] = water ? 1 : 2;
      return water;
    };
    const nearestReachableNode = (point: MapPoint) => {
      const cx = Math.round((point.x - minX) / step);
      const cy = Math.round((point.y - minY) / step);
      let best = -1;
      let bestDistance = Infinity;
      for (let radius = 0; radius <= 5; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (
              radius > 0 &&
              Math.abs(dx) !== radius &&
              Math.abs(dy) !== radius
            )
              continue;
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue;
            const index = gy * cols + gx;
            if (!isWaterNode(index)) continue;
            const candidate = pointFor(index);
            const distance = Math.hypot(
              candidate.x - point.x,
              candidate.y - point.y,
            );
            if (
              distance < bestDistance &&
              waterSegmentClear(point, candidate)
            ) {
              best = index;
              bestDistance = distance;
            }
          }
        }
        if (best >= 0) return best;
      }
      return best;
    };

    const startIndex = nearestReachableNode(start);
    const goalIndex = nearestReachableNode(goal);
    if (startIndex < 0 || goalIndex < 0) {
      shortestWaterPathCache.set(cacheKey, null);
      return null;
    }

    const scores = new Float64Array(count);
    scores.fill(Infinity);
    const previous = new Int32Array(count);
    previous.fill(-1);
    const closed = new Uint8Array(count);
    const heap: Array<{ index: number; score: number }> = [];
    const heapPush = (item: { index: number; score: number }) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (heap[parent].score <= item.score) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = item;
    };
    const heapPop = () => {
      const first = heap[0];
      const last = heap.pop();
      if (!first || !last || heap.length === 0) return first;
      let i = 0;
      while (true) {
        const left = i * 2 + 1;
        const right = left + 1;
        if (left >= heap.length) break;
        const child =
          right < heap.length && heap[right].score < heap[left].score
            ? right
            : left;
        if (heap[child].score >= last.score) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = last;
      return first;
    };
    const heuristic = (index: number) => {
      const p = pointFor(index);
      return Math.hypot(p.x - goal.x, p.y - goal.y);
    };

    scores[startIndex] = 0;
    heapPush({ index: startIndex, score: heuristic(startIndex) });
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    let visited = 0;
    while (heap.length > 0 && visited < 100000) {
      const current = heapPop();
      if (!current || closed[current.index]) continue;
      if (current.index === goalIndex) break;
      closed[current.index] = 1;
      visited++;
      const gx = current.index % cols;
      const gy = Math.floor(current.index / cols);
      const currentPoint = pointFor(current.index);
      for (const [dx, dy] of directions) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const nextIndex = ny * cols + nx;
        if (closed[nextIndex] || !isWaterNode(nextIndex)) continue;
        const nextPoint = pointFor(nextIndex);
        if (
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.25),
            lerp(currentPoint.y, nextPoint.y, 0.25),
          ) ||
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.5),
            lerp(currentPoint.y, nextPoint.y, 0.5),
          ) ||
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.75),
            lerp(currentPoint.y, nextPoint.y, 0.75),
          )
        ) {
          continue;
        }
        if (dx !== 0 && dy !== 0) {
          const horizontalIndex = gy * cols + nx;
          const verticalIndex = ny * cols + gx;
          if (!isWaterNode(horizontalIndex) || !isWaterNode(verticalIndex))
            continue;
        }
        const tentative = scores[current.index] + Math.hypot(dx, dy) * step;
        if (tentative >= scores[nextIndex]) continue;
        scores[nextIndex] = tentative;
        previous[nextIndex] = current.index;
        heapPush({ index: nextIndex, score: tentative + heuristic(nextIndex) });
      }
    }

    if (startIndex !== goalIndex && previous[goalIndex] < 0) {
      shortestWaterPathCache.set(cacheKey, null);
      return null;
    }
    const raw: MapPoint[] = [goal];
    let cursor = goalIndex;
    raw.push(pointFor(cursor));
    while (cursor !== startIndex) {
      cursor = previous[cursor];
      if (cursor < 0) break;
      raw.push(pointFor(cursor));
    }
    raw.push(start);
    raw.reverse();

    const compact: MapPoint[] = [raw[0]];
    let anchor = 0;
    while (anchor < raw.length - 1) {
      let next = raw.length - 1;
      while (next > anchor + 1 && !waterSegmentClear(raw[anchor], raw[next])) {
        next--;
      }
      compact.push(raw[next]);
      anchor = next;
    }
    shortestWaterPathCache.set(cacheKey, compact);
    const reverseKey = `${Math.round(goal.x / 12)}:${Math.round(goal.y / 12)}:${Math.round(start.x / 12)}:${Math.round(start.y / 12)}`;
    shortestWaterPathCache.set(reverseKey, [...compact].reverse());
    return compact;
  }

  function findBestSeaRoute(
    sourceRegionId: number,
    targetRegionId: number,
    sourcePoint: { x: number; y: number },
    targetPoint: { x: number; y: number },
  ) {
    const sourcePorts = findCoastPortCandidates(
      sourceRegionId,
      targetPoint,
      14,
    );
    const targetPorts = findCoastPortCandidates(
      targetRegionId,
      sourcePoint,
      14,
    );
    if (sourcePorts.length === 0) return { error: "source_port" };
    if (targetPorts.length === 0) return { error: "target_port" };
    const pairs: any[] = [];
    sourcePorts.slice(0, 8).forEach((sourceCoast) => {
      targetPorts.slice(0, 8).forEach((targetCoast) => {
        pairs.push({
          sourceCoast,
          targetCoast,
          estimate:
            sourceCoast.score +
            targetCoast.score +
            Math.hypot(
              sourceCoast.water.x - targetCoast.water.x,
              sourceCoast.water.y - targetCoast.water.y,
            ),
        });
      });
    });
    pairs.sort((a, b) => a.estimate - b.estimate);

    let best: any = null;
    for (const pair of pairs.slice(0, 10)) {
      const seaPath = findShortestWaterPath(
        pair.sourceCoast.water,
        pair.targetCoast.water,
      );
      if (!seaPath) continue;
      const score =
        Math.hypot(
          sourcePoint.x - pair.sourceCoast.water.x,
          sourcePoint.y - pair.sourceCoast.water.y,
        ) +
        polylineLength(seaPath) +
        Math.hypot(
          targetPoint.x - pair.targetCoast.water.x,
          targetPoint.y - pair.targetCoast.water.y,
        );
      if (!best || score < best.score) {
        best = {
          sourceCoast: pair.sourceCoast,
          targetCoast: pair.targetCoast,
          sourcePort: pair.sourceCoast.water,
          targetPort: pair.targetCoast.water,
          seaPath,
          score,
        };
      }
    }
    return best || { error: "blocked" };
  }

  function continentOfRegion(r: any) {
    if (!r) return null;
    let best = null;
    for (const c of megaContinents) {
      const nx = (r.x - c.x) / c.rx;
      const ny = (r.y - c.y) / c.ry;
      const d = nx * nx + ny * ny;
      if (!best || d < best.d) best = { name: c.name, d };
    }
    return best ? best.name : null;
  }

  function landTravelAllowed(sourceRegionId: number, targetRegionId: number) {
    if (sourceRegionId < 0 || targetRegionId < 0) return false;
    if (sourceRegionId === targetRegionId) return true;
    const a = landById(sourceRegionId);
    const b = landById(targetRegionId);
    if (!a || !b || a.isIslet || b.isIslet) return false;

    if (segmentTouchesSea(a, b)) return false;

    const cA = continentOfRegion(a);
    const cB = continentOfRegion(b);
    if (!cA || !cB || cA !== cB) return false;

    const arx = a.rx || a.r || 100;
    const ary = a.ry || (a.r || 100) * 0.78;
    const brx = b.rx || b.r || 100;
    const bry = b.ry || (b.r || 100) * 0.78;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const closeEnough = dx <= (arx + brx) * 1.28 && dy <= (ary + bry) * 1.42;
    const centerDistance = Math.hypot(a.x - b.x, a.y - b.y);
    const bridgeDistance = centerDistance - (arx + brx) * 0.72;
    return closeEnough || bridgeDistance <= 130;
  }

  function getMarchRouteStatus(source: any, targetRegionId: number) {
    const targetLand = landById(targetRegionId);
    if (!source || !targetLand) {
      return {
        ok: false,
        message:
          "KhÃ´ng tÃ¬m tháº¥y Ä‘iá»ƒm xuáº¥t quÃ¢n hoáº·c lÃ£nh thá»• Ä‘Ã­ch",
        requiresShip: false,
      };
    }
    const targetPoint = { x: targetLand.x, y: targetLand.y };
    const sourceRegionId = regionAtCoords(source.x, source.y);
    if (landTravelAllowed(sourceRegionId, targetRegionId)) {
      return {
        ok: true,
        message: "ÄÆ°á»ng bá»™ trong cÃ¹ng cá»¥m lá»¥c Ä‘á»‹a há»£p lá»‡",
        requiresShip: false,
      };
    }
    const crossesSea = segmentTouchesSea(source, targetPoint);
    if (!crossesSea) {
      return {
        ok: true,
        message: "ÄÆ°á»ng bá»™ há»£p lá»‡",
        requiresShip: false,
      };
    }
    if (sourceRegionId < 0) {
      return {
        ok: false,
        message: "KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c lÃ£nh thá»• xuáº¥t phÃ¡t",
        requiresShip: true,
      };
    }
    if (derivedRegionOwnership(sourceRegionId) !== 1) {
      return {
        ok: false,
        message: `ThÃ nh xuáº¥t quÃ¢n Ä‘ang náº±m trÃªn lÃ£nh thá»• #${sourceRegionId + 1} chÆ°a thuá»™c vá» báº¡n trÃªn server`,
        requiresShip: true,
      };
    }
    const sourceLand = landById(sourceRegionId);
    const sourceHasPort = Boolean(
      sourceLand?.isIslet ||
      territorySpecialResources(sourceRegionId).includes(
        "Báº¿n tÃ u tá»± nhiÃªn",
      ),
    );
    const targetIsCoastal = Boolean(
      targetLand.isIslet ||
      targetLand.coastal ||
      mainlandCoastalRegionIds.has(targetRegionId) ||
      territorySpecialResources(targetRegionId).includes(
        "Báº¿n tÃ u tá»± nhiÃªn",
      ),
    );
    if (!sourceHasPort) {
      return {
        ok: false,
        message: "ThÃ nh xuáº¥t quÃ¢n khÃ´ng cÃ³ Báº¿n tÃ u tá»± nhiÃªn",
        requiresShip: true,
      };
    }
    if (!targetIsCoastal) {
      return {
        ok: false,
        message:
          "KhÃ´ng thá»ƒ Ä‘á»• bá»™ tháº³ng vÃ o lÃ£nh thá»• ná»™i Ä‘á»‹a",
        requiresShip: true,
      };
    }
    const route = findBestSeaRoute(
      sourceRegionId,
      targetRegionId,
      source,
      targetPoint,
    );
    if (route.error === "source_port") {
      return {
        ok: false,
        message:
          "LÃ£nh thá»• xuáº¥t phÃ¡t chÆ°a cÃ³ bá» biá»ƒn/cáº£ng Ä‘á»ƒ Ä‘Ã³ng thuyá»n",
        requiresShip: true,
      };
    }
    if (route.error === "target_port") {
      return {
        ok: false,
        message:
          "ÄÃ­ch khÃ´ng pháº£i vÃ¹ng ven biá»ƒn, pháº£i chiáº¿m bá» biá»ƒn trÆ°á»›c",
        requiresShip: true,
      };
    }
    if (route.error === "blocked") {
      return {
        ok: false,
        message:
          "Tuyáº¿n biá»ƒn Ä‘ang bá»‹ lá»¥c Ä‘á»‹a cháº¯n, hÃ£y chá»n cáº£ng/vÃ¹ng ven biá»ƒn khÃ¡c gáº§n Ä‘Æ°á»ng biá»ƒn hÆ¡n",
        requiresShip: true,
      };
    }
    return {
      ok: true,
      message: "Tuyáº¿n thuyá»n há»£p lá»‡",
      requiresShip: true,
    };
  }

  return {
    segmentTouchesSea,
    isWaterAt,
    findCoastPortCandidates,
    polylineLength,
    waterSegmentClear,
    findShortestWaterPath,
    findBestSeaRoute,
    continentOfRegion,
    landTravelAllowed,
    getMarchRouteStatus,
  };
}
