// @ts-nocheck

import {
  MEDIEVAL_WORLD_SPRITES,
  TERRITORY_VEGETATION_SPRITES,
} from "./engineStaticData";

export function createSpriteAtlasHelpers(deps: {
  ctxRef: () => CanvasRenderingContext2D;
  clearRegionPass2Cache: () => void;
}) {
  const { ctxRef, clearRegionPass2Cache } = deps;

  let territoryVegetationAtlas: HTMLImageElement | null = null;
  let medievalWorldAtlas: HTMLImageElement | null = null;
  let medievalDetailAtlas: HTMLImageElement | null = null;

  const TERRITORY_VEGETATION_GRID = (() => {
    const coords = Object.values(TERRITORY_VEGETATION_SPRITES);
    const maxCol = coords.reduce((m, [col]) => Math.max(m, col), 0);
    const maxRow = coords.reduce((m, [, row]) => Math.max(m, row), 0);
    return { cols: maxCol + 1, rows: maxRow + 1 };
  })();

  function getTerritoryVegetationAtlas() {
    if (!territoryVegetationAtlas) {
      territoryVegetationAtlas = new Image();
      territoryVegetationAtlas.decoding = "async";
      territoryVegetationAtlas.onload = clearRegionPass2Cache;
      territoryVegetationAtlas.src =
        "/assets/world/territory_vegetation_atlas.webp";
    }
    return territoryVegetationAtlas;
  }

  function drawTerritoryVegetationSprite(
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
  ) {
    const image = getTerritoryVegetationAtlas();
    const cell = TERRITORY_VEGETATION_SPRITES[sprite];
    if (!cell || !image.complete || !image.naturalWidth) return false;
    const cellWidth = image.naturalWidth / TERRITORY_VEGETATION_GRID.cols;
    const cellHeight = image.naturalHeight / TERRITORY_VEGETATION_GRID.rows;
    const padX = Math.max(6, Math.round(cellWidth * 0.05));
    const padY = Math.max(6, Math.round(cellHeight * 0.05));
    const sx = cell[0] * cellWidth + padX;
    const sy = cell[1] * cellHeight + padY;
    const sw = cellWidth - padX * 2;
    const sh = cellHeight - padY * 2;
    const ctx = ctxRef();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      x - size / 2,
      y - size * 0.76,
      size,
      size,
    );
    ctx.restore();
    return true;
  }

  function getMedievalWorldAtlas() {
    if (!medievalWorldAtlas) {
      medievalWorldAtlas = new Image();
      medievalWorldAtlas.decoding = "async";
      medievalWorldAtlas.onload = clearRegionPass2Cache;
      medievalWorldAtlas.src = "/assets/world/medieval_world_atlas.webp";
    }
    return medievalWorldAtlas;
  }

  function drawMedievalWorldSprite(
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
  ) {
    const image = getMedievalWorldAtlas();
    const cell = MEDIEVAL_WORLD_SPRITES[sprite];
    if (!cell || cell[1] !== 0 || !image.complete || !image.naturalWidth) {
      return false;
    }
    const cellWidth = image.naturalWidth / 4;
    const cellHeight = image.naturalHeight / 4;
    const padX = Math.max(12, Math.round(cellWidth * 0.075));
    const padY = Math.max(12, Math.round(cellHeight * 0.075));
    const sx = cell[0] * cellWidth + padX;
    const sy = cell[1] * cellHeight + padY;
    const sw = cellWidth - padX * 2;
    const sh = cellHeight - padY * 2;
    const ctx = ctxRef();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      x - size / 2,
      y - size * 0.76,
      size,
      size,
    );
    ctx.restore();
    return true;
  }

  function drawGameEnvV2Sprite(
    _sprite: string,
    _x: number,
    _y: number,
    _size: number,
    _alpha = 1,
  ) {
    return false;
  }

  function drawMedievalDetailSprite(
    _column: number,
    _row: number,
    _x: number,
    _y: number,
    _size: number,
  ) {
    return false;
  }

  function getMedievalDetailAtlas() {
    if (!medievalDetailAtlas) {
      medievalDetailAtlas = new Image();
      medievalDetailAtlas.decoding = "async";
      medievalDetailAtlas.src = "/assets/world/medieval_detail_atlas.webp";
    }
    return medievalDetailAtlas;
  }

  return {
    getTerritoryVegetationAtlas,
    drawTerritoryVegetationSprite,
    getMedievalWorldAtlas,
    drawMedievalWorldSprite,
    drawGameEnvV2Sprite,
    drawMedievalDetailSprite,
    getMedievalDetailAtlas,
  };
}
