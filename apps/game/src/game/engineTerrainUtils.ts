// @ts-nocheck

const CONTINENT_TERRAIN_CLUSTERS: Record<
  number,
  { core: number; mid: number; coast: number }
> = {
  0: { core: 6, mid: 0, coast: 5 },
  1: { core: 1, mid: 5, coast: 1 },
  2: { core: 2, mid: 2, coast: 4 },
  3: { core: 3, mid: 3, coast: 5 },
  4: { core: 4, mid: 6, coast: 0 },
  5: { core: 5, mid: 0, coast: 7 },
  6: { core: 6, mid: 4, coast: 0 },
  7: { core: 7, mid: 6, coast: 5 },
};

export function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function nearestContinent(r: any, megaContinents: any[]) {
  let best: any = null;
  for (const c of megaContinents) {
    const nx = (r.x - c.x) / c.rx;
    const ny = (r.y - c.y) / c.ry;
    const d = nx * nx + ny * ny;
    if (!best || d < best.d) best = { ...c, d };
  }
  return best;
}

export function visualBiomeIndex(
  r: any,
  idx: number,
  isIslet: boolean,
  visualBiomeCache: Map<string, number>,
  biomes: any[],
  megaContinents: any[],
) {
  const cacheKey = `${isIslet ? "i" : "r"}_${r.id ?? idx}`;
  const cached = visualBiomeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (isIslet) {
    const isletBiome = (r.id ?? idx) % 2 === 0 ? 4 : 0;
    visualBiomeCache.set(cacheKey, isletBiome);
    return isletBiome;
  }

  const continent = nearestContinent(r, megaContinents);
  let base = 0;
  if (continent) {
    const primaryBiome = (continent.biome ?? 0) % biomes.length;
    const cluster = CONTINENT_TERRAIN_CLUSTERS[primaryBiome] || {
      core: primaryBiome,
      mid: primaryBiome,
      coast: primaryBiome,
    };

    const nx = (r.x - continent.x) / (continent.rx || 300);
    const ny = (r.y - continent.y) / (continent.ry || 300);
    const distSq = nx * nx + ny * ny;
    const noise = (hash((r.id ?? idx) * 37 + (r.seed || 1) * 19) - 0.5) * 0.32;
    const effectiveDist = distSq + noise;

    if (effectiveDist < 0.28) base = cluster.core;
    else if (effectiveDist < 0.72) base = cluster.mid;
    else base = cluster.coast;
  } else {
    base = Math.max(0, Math.min(biomes.length - 1, Math.round(r.biome || 0)));
  }

  visualBiomeCache.set(cacheKey, base);
  return base;
}
