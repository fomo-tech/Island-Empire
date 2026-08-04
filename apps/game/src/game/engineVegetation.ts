// @ts-nocheck

export function createVegetationHelpers(deps: {
  state: any;
  TAU: number;
  hash: (n: number) => number;
  hasTownRegionId: (regionId: number) => boolean;
  getTerritoryVegetationAtlas: () => HTMLImageElement;
  drawTerritoryVegetationSprite: (
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha?: number,
  ) => boolean;
  drawGameEnvV2Sprite: (
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha?: number,
  ) => boolean;
  drawMedievalWorldSprite: (
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha?: number,
  ) => boolean;
  drawMedievalDetailSprite: (
    col: number,
    row: number,
    x: number,
    y: number,
    size: number,
  ) => void;
}) {
  const {
    state,
    TAU,
    hash,
    hasTownRegionId,
    getTerritoryVegetationAtlas,
    drawTerritoryVegetationSprite,
    drawGameEnvV2Sprite,
    drawMedievalWorldSprite,
    drawMedievalDetailSprite,
  } = deps;

  function drawBush(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    const sprite = rnd > 0.5 ? "v2_bush_round" : "v2_bush_leafy";
    if (!drawGameEnvV2Sprite(sprite, x, y, 42 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 42 * sc);
    }
  }

  function drawPalmTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_dead_tree", x, y, 78 * sc, 0.95)) {
      drawMedievalWorldSprite("desert", x, y, 78 * sc, 0.95);
    }
  }

  function drawChest(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    drawMedievalWorldSprite("gold", x, y, 54 * sc, 0.95);
  }

  function drawFlower(
    x: number,
    y: number,
    scale?: number,
    _color1?: string,
    _color2?: string,
  ) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_flowers", x, y, 40 * sc, 0.95)) {
      drawMedievalDetailSprite(1, 0, x, y, 40 * sc);
    }
  }

  function drawBerryBush(
    x: number,
    y: number,
    scale?: number,
    _berryColor?: string,
  ) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_bush_berry", x, y, 44 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 44 * sc);
    }
  }

  function drawMushrooms(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_log", x, y, 52 * sc, 0.95)) {
      drawMedievalDetailSprite(1, 1, x, y, 36 * sc);
    }
  }

  function drawLakeInRegion(_r: any, _seed: number, _rx: number, _ry: number) {
    return;
  }

  function drawRiverInRegion(_r: any, _seed: number, _rx: number, _ry: number) {
    return;
  }

  function drawNaturalTerritoryVegetation(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    biome: number,
  ) {
    const hasTown = hasTownRegionId(Number(r.id));
    const vegDensity = hash(seed * 83 + r.id * 29);
    if (!hasTown && vegDensity > 0.7) return;

    const atlas = getTerritoryVegetationAtlas();
    if (!atlas.complete || !atlas.naturalWidth) return;

    const palettes: Record<number, { canopy: string[]; ground: string[] }> = {
      0: {
        canopy: ["oak", "blossomTree", "broadleaf"],
        ground: ["roundBush", "leafyBush", "flowerBush"],
      },
      1: {
        canopy: ["cactusTall", "cactusGroup", "cactusPad"],
        ground: ["cactusRound", "agave", "cactusPad"],
      },
      2: {
        canopy: ["pine", "cypress", "oak"],
        ground: ["roundBush", "fern", "leafyBush"],
      },
      3: {
        canopy: ["pine", "cypress", "broadleaf"],
        ground: ["leafyBush", "fern", "roundBush"],
      },
      4: {
        canopy: ["palm", "blossomTree", "broadleaf"],
        ground: ["fern", "flowerBush", "leafyBush"],
      },
      5: {
        canopy: ["autumn", "oak", "broadleaf"],
        ground: ["berryBush", "leafyBush", "roundBush"],
      },
      6: {
        canopy: ["pine", "cypress", "broadleaf"],
        ground: ["berryBush", "fern", "leafyBush"],
      },
      7: {
        canopy: ["willow", "oak", "broadleaf"],
        ground: ["fern", "leafyBush", "roundBush"],
      },
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
    const clusterCount = 1;
    const items: Array<{
      sprite: string;
      x: number;
      y: number;
      size: number;
      medieval?: boolean;
    }> = [];
    const baseAngle = hash(seed * 79.3) * TAU;

    for (let cluster = 0; cluster < clusterCount; cluster++) {
      const clusterSeed = seed * 137 + cluster * 83;
      const angle =
        baseAngle +
        cluster * (TAU / clusterCount) +
        (hash(clusterSeed * 1.71) - 0.5) * 0.42;
      const minRadius = hasTown ? 0.34 : 0.12;
      const maxRadius = hasTown ? 0.5 : 0.46;
      const radius =
        minRadius + hash(clusterSeed * 2.13) * (maxRadius - minRadius);
      const cx = r.x + Math.cos(angle) * rx * radius;
      const cy = r.y + Math.sin(angle) * ry * radius * 0.82;
      const useMedievalCluster = hash(clusterSeed * 7.17) < 0.42;
      const itemCount =
        state.zoom < 0.52 ? 1 : 1 + Math.floor(hash(clusterSeed * 3.19) * 2);

      for (let item = 0; item < itemCount; item++) {
        const itemSeed = clusterSeed * 5.31 + item * 47;
        const groundLayer = useMedievalCluster
          ? item > 0
          : item >= Math.ceil(itemCount * 0.58);
        const slot = item % 4;
        const offsets = [
          [0, -4],
          [-19, 3],
          [19, 4],
          [-10, 12],
        ];
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
        const variation = 0.94 + hash(itemSeed * 4.91) * 0.12;
        items.push({
          sprite,
          x,
          y,
          size: baseSize * variation,
          medieval,
        });
      }
    }

    items.sort((a, b) => a.y - b.y);
    items.forEach((item) => {
      if (item.medieval) {
        drawMedievalWorldSprite(
          item.sprite,
          item.x,
          item.y,
          item.size * 1.05,
          0.94,
        );
      } else {
        drawTerritoryVegetationSprite(
          item.sprite,
          item.x,
          item.y,
          item.size,
          0.97,
        );
      }
    });
  }

  return {
    drawBush,
    drawPalmTree,
    drawChest,
    drawFlower,
    drawBerryBush,
    drawMushrooms,
    drawLakeInRegion,
    drawRiverInRegion,
    drawNaturalTerritoryVegetation,
  };
}
