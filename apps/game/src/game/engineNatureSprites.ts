// @ts-nocheck

type DrawSpriteFn = (
  sprite: string,
  x: number,
  y: number,
  size: number,
  alpha?: number,
) => boolean;

type DrawWorldSpriteFn = (
  sprite: string,
  x: number,
  y: number,
  size: number,
  alpha?: number,
) => boolean;

type DrawDetailFn = (
  col: number,
  row: number,
  x: number,
  y: number,
  size: number,
) => void;

export function createNatureSpriteDrawers(deps: {
  drawGameEnvV2Sprite: DrawSpriteFn;
  drawMedievalWorldSprite: DrawWorldSpriteFn;
  drawMedievalDetailSprite: DrawDetailFn;
}) {
  const {
    drawGameEnvV2Sprite,
    drawMedievalWorldSprite,
    drawMedievalDetailSprite,
  } = deps;

  function drawOakTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 84 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 84 * sc, 0.95);
    }
  }

  function drawAutumnTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_autumn", x, y, 82 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_autumn", x, y, 82 * sc, 0.95);
    }
  }

  function drawPineTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_pine", x, y, 86 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_pine", x, y, 86 * sc, 0.95);
    }
  }

  function drawGrassPatch(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_grass_patch", x, y, 42 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 42 * sc);
    }
  }

  function drawRockPile(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    const sprite = rnd > 0.5 ? "v2_rock_big" : "v2_rock_cluster";
    if (!drawGameEnvV2Sprite(sprite, x, y, 64 * sc, 0.95)) {
      drawMedievalWorldSprite("stone", x, y, 64 * sc, 0.95);
    }
  }

  function drawElephant(x: number, y: number, scale = 1.0) {
    drawMedievalWorldSprite("horse", x, y, 82 * scale, 0.95);
  }

  function drawDeer(x: number, y: number, scale = 1.0) {
    drawMedievalWorldSprite("horse", x, y, 68 * scale, 0.95);
  }

  function drawBoar(x: number, y: number, scale = 1.0) {
    drawMedievalWorldSprite("horse", x, y, 68 * scale, 0.95);
  }

  function drawCave(x: number, y: number, scale = 1.0) {
    drawMedievalWorldSprite("ruins", x, y, 78 * scale, 0.95);
  }

  function drawRuins(x: number, y: number, scale = 1.0) {
    if (!drawGameEnvV2Sprite("v2_ruin_wall", x, y, 76 * scale, 0.95)) {
      drawMedievalWorldSprite("ruins", x, y, 76 * scale, 0.95);
    }
  }

  return {
    drawOakTree,
    drawAutumnTree,
    drawPineTree,
    drawGrassPatch,
    drawRockPile,
    drawElephant,
    drawDeer,
    drawBoar,
    drawCave,
    drawRuins,
  };
}
