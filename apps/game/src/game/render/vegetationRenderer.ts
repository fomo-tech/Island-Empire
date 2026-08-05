import { hash } from "../engine/random";

export type VegetationRendererDeps = {
  hasTown: (regionId: number) => boolean;
  zoom: number;
  getAtlas: () => HTMLImageElement;
  drawMedievalWorldSprite: (...args: any[]) => void;
  drawTerritoryVegetationSprite: (...args: any[]) => void;
};

export type VegetationRenderMode = {
  hideAssets?: boolean;
  lightweight?: boolean;
};

export function drawNaturalTerritoryVegetation(
  deps: VegetationRendererDeps,
  region: any,
  seed: number,
  rx: number,
  ry: number,
  biome: number,
) {
  const hasTown = deps.hasTown(Number(region.id));
  const vegetationDensity = hash(seed * 83 + region.id * 29);
  const farZoom = deps.zoom < 0.38;
  const ultraFarZoom = deps.zoom < 0.22;
  // Far zoom uses one representative sprite per territory instead of
  // removing vegetation entirely. This keeps the map legible during zoom-out
  // without paying for the full diorama cluster.
  const farZoomKeepRate = ultraFarZoom ? 0.58 : 0.88;
  if (!hasTown && vegetationDensity > (farZoom ? farZoomKeepRate : 0.7)) return;

  const atlas = deps.getAtlas();
  if (!atlas.complete || !atlas.naturalWidth) return;

  const palettes: Record<number, { canopy: string[]; ground: string[] }> = {
    0: { canopy: ["oak", "blossomTree", "broadleaf"], ground: ["roundBush", "leafyBush", "flowerBush"] },
    1: { canopy: ["cactusTall", "cactusGroup", "cactusPad"], ground: ["cactusRound", "agave", "cactusPad"] },
    2: { canopy: ["pine", "cypress", "oak"], ground: ["roundBush", "fern", "leafyBush"] },
    3: { canopy: ["pine", "cypress", "broadleaf"], ground: ["leafyBush", "fern", "roundBush"] },
    4: { canopy: ["palm", "blossomTree", "broadleaf"], ground: ["fern", "flowerBush", "leafyBush"] },
    5: { canopy: ["autumn", "oak", "broadleaf"], ground: ["berryBush", "leafyBush", "roundBush"] },
    6: { canopy: ["pine", "cypress", "broadleaf"], ground: ["berryBush", "fern", "leafyBush"] },
    7: { canopy: ["willow", "oak", "broadleaf"], ground: ["fern", "leafyBush", "roundBush"] },
  };
  const palette = palettes[biome] || palettes[0];
  const medievalCanopy: Record<number, string> = {
    0: "forest_oak",
    1: "desert",
    2: "forest_snow",
    3: "forest_pine",
    4: "forest_oak",
    5: "forest_autumn",
    6: "forest_pine",
    7: "forest_oak",
  };
  const items: Array<{
    sprite: string;
    x: number;
    y: number;
    size: number;
    medieval?: boolean;
  }> = [];
  const baseAngle = hash(seed * 79.3) * Math.PI * 2;
  const clusterCount = 1;

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const clusterSeed = seed * 137 + cluster * 83;
    const angle =
      baseAngle +
      cluster * ((Math.PI * 2) / clusterCount) +
      (hash(clusterSeed * 1.71) - 0.5) * 0.42;
    const minRadius = hasTown ? 0.34 : 0.12;
    const maxRadius = hasTown ? 0.5 : 0.46;
    const radius =
      minRadius + hash(clusterSeed * 2.13) * (maxRadius - minRadius);
    const cx = region.x + Math.cos(angle) * rx * radius;
    const cy = region.y + Math.sin(angle) * ry * radius * 0.82;
    const useMedievalCluster = hash(clusterSeed * 7.17) < 0.42;
    const itemCount = farZoom
      ? 1
      : deps.zoom < 0.52
        ? 1
        : 1 + Math.floor(hash(clusterSeed * 3.19) * 2);

    for (let item = 0; item < itemCount; item++) {
      const itemSeed = clusterSeed * 5.31 + item * 47;
      const groundLayer = useMedievalCluster
        ? item > 0
        : item >= Math.ceil(itemCount * 0.58);
      const offsets = [[0, -4], [-19, 3], [19, 4], [-10, 12]];
      const slot = item % offsets.length;
      const jitterX = (hash(itemSeed * 1.37) - 0.5) * 7;
      const jitterY = (hash(itemSeed * 2.47) - 0.5) * 4;
      const x = cx + offsets[slot][0] + jitterX;
      const y = cy + offsets[slot][1] + jitterY + (groundLayer ? 9 : 0);
      const spritePool = groundLayer ? palette.ground : palette.canopy;
      const medieval = useMedievalCluster && item === 0;
      const sprite = medieval
        ? medievalCanopy[biome] || "forest_oak"
        : spritePool[Math.floor(hash(itemSeed * 3.83) * spritePool.length)];
      const isLowPlant = [
        "roundBush",
        "leafyBush",
        "berryBush",
        "fern",
        "flowerBush",
        "agave",
        "cactusRound",
        "cactusPad",
      ].includes(sprite);
      const baseSize = isLowPlant ? 34 : 68;
      items.push({
        sprite,
        x,
        y,
        size: baseSize * (0.94 + hash(itemSeed * 4.91) * 0.12),
        medieval,
      });
    }
  }

  items.sort((a, b) => a.y - b.y);
  items.forEach((item) => {
    if (item.medieval) {
      deps.drawMedievalWorldSprite(
        item.sprite,
        item.x,
        item.y,
        item.size * 1.05,
        0.94,
      );
    } else {
      deps.drawTerritoryVegetationSprite(
        item.sprite,
        item.x,
        item.y,
        item.size,
        0.97,
      );
    }
  });
}

/**
 * Owns the zoom/pan LOD decision for territory vegetation. The world engine
 * only needs to know whether the expensive diorama pass should continue.
 */
export function renderTerritoryVegetation(
  deps: VegetationRendererDeps,
  region: any,
  seed: number,
  rx: number,
  ry: number,
  biome: number,
  mode: VegetationRenderMode = {},
) {
  if (mode.hideAssets) return "hidden" as const;

  const farZoom = deps.zoom < 0.28;
  const lightweight = Boolean(mode.lightweight) || farZoom;
  drawNaturalTerritoryVegetation(deps, region, seed, rx, ry, biome);

  // At far zoom or while the camera is moving, the representative vegetation
  // is the complete layer for this territory. Do not build the full diorama.
  return lightweight ? ("complete" as const) : ("continue" as const);
}
