import { kingdomArchitectureIndex } from "../kingdomArchitecture";
import { marchDirectionCells, type MarchDirection } from "./marchDirection";

export type NationUnitKind =
  | "builder"
  | "infantry"
  | "cavalry"
  | "artillery"
  | "ship";

export type NationUnitAction = "idle" | "walk" | "attack" | "work";

const CELL = 64;
const NATION_BLOCK = CELL * 4;

const MOVEMENT_SHEET = "/assets/units/medieval/nation_units_8.webp?v=units-v10";
const ATTACK_SHEET =
  "/assets/units/medieval/nation_units_attack_8.webp?v=units-v9";

const MOVEMENT_SIZE = { width: 10240, height: 2048 } as const;
const ATTACK_SIZE = { width: 5376, height: 2048 } as const;

const MOVEMENT_LAYOUT: Record<NationUnitKind, { offset: number; frames: number }> = {
  infantry: { offset: 0, frames: 16 },
  cavalry: { offset: 32, frames: 16 },
  artillery: { offset: 64, frames: 16 },
  builder: { offset: 96, frames: 16 },
  ship: { offset: 128, frames: 16 },
};

const ACTION_LAYOUT: Record<NationUnitKind, { offset: number; frames: number }> = {
  infantry: { offset: 0, frames: 8 },
  cavalry: { offset: 16, frames: 10 },
  artillery: { offset: 36, frames: 8 },
  ship: { offset: 52, frames: 8 },
  builder: { offset: 68, frames: 8 },
};

const BUILDER_ACTION_FRAMES: Record<string, number> = {
  carry: 1,
  hammer_up: 2,
  hammer_down: 5,
  complete: 7,
};

export type NationUnitAtlases = {
  movement: HTMLImageElement;
  action: HTMLImageElement;
};

export function createNationUnitAtlases(): NationUnitAtlases {
  const movement = new Image();
  movement.decoding = "async";
  movement.src = MOVEMENT_SHEET;

  const action = new Image();
  action.decoding = "async";
  action.src = ATTACK_SHEET;

  return { movement, action };
}

function imageReady(
  image: HTMLImageElement,
  expected: { width: number; height: number },
) {
  return (
    image.complete &&
    image.naturalWidth === expected.width &&
    image.naturalHeight === expected.height
  );
}

export function nationUnitAtlasReady(
  atlases: NationUnitAtlases,
  action: NationUnitAction = "walk",
) {
  return action === "attack" || action === "work"
    ? imageReady(atlases.action, ATTACK_SIZE)
    : imageReady(atlases.movement, MOVEMENT_SIZE);
}

export function nationUnitAction(
  kind: NationUnitKind,
  animationName?: string,
): NationUnitAction {
  if (!animationName || animationName === "idle") return "idle";
  if (animationName.includes("walk")) return "walk";
  if (kind === "builder") return "work";
  return "attack";
}

function frameIndex(
  kind: NationUnitKind,
  action: NationUnitAction,
  animationName: string | undefined,
  motionPhase: number,
) {
  const layout = action === "attack" || action === "work"
    ? ACTION_LAYOUT[kind]
    : MOVEMENT_LAYOUT[kind];
  if (action === "idle") return 0;
  if (kind === "builder" && action === "work" && animationName) {
    const explicit = BUILDER_ACTION_FRAMES[animationName];
    if (explicit !== undefined) return explicit;
  }
  return Math.floor(Math.abs(motionPhase) * layout.frames) % layout.frames;
}

function sourceFrame(
  kind: NationUnitKind,
  action: NationUnitAction,
  animationName: string | undefined,
  motionPhase: number,
  direction: MarchDirection,
  architectureId?: string,
) {
  const layout = action === "attack" || action === "work"
    ? ACTION_LAYOUT[kind]
    : MOVEMENT_LAYOUT[kind];
  const directionCell = marchDirectionCells[direction];
  return {
    x:
      (layout.offset +
        directionCell.pair * layout.frames +
        frameIndex(kind, action, animationName, motionPhase)) *
      CELL,
    y:
      kingdomArchitectureIndex(architectureId) * NATION_BLOCK +
      directionCell.row * CELL,
  };
}

export function drawNationUnitSprite(options: {
  ctx: CanvasRenderingContext2D;
  atlases: NationUnitAtlases;
  kind: Exclude<NationUnitKind, "ship">;
  x: number;
  y: number;
  size: number;
  factionColor?: string;
  animationName?: string;
  motionPhase?: number;
  direction?: MarchDirection;
  architectureId?: string;
  drawFootRing?: (x: number, y: number, color: string) => void;
}) {
  const action = nationUnitAction(options.kind, options.animationName);
  if (!nationUnitAtlasReady(options.atlases, action)) return false;

  const image = action === "attack" || action === "work"
    ? options.atlases.action
    : options.atlases.movement;
  const source = sourceFrame(
    options.kind,
    action,
    options.animationName,
    options.motionPhase ?? 0,
    options.direction ?? "S",
    options.architectureId,
  );
  const footY = CELL - 2;
  const drawX = options.x - options.size / 2;
  const drawY = options.y - options.size * (footY / CELL);

  options.ctx.save();
  options.ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  options.ctx.beginPath();
  options.ctx.ellipse(
    options.x,
    options.y + 1,
    options.size * 0.38,
    options.size * 0.12,
    0,
    0,
    Math.PI * 2,
  );
  options.ctx.fill();
  options.drawFootRing?.(
    options.x,
    options.y,
    options.factionColor || "#d6aa4a",
  );
  options.ctx.imageSmoothingEnabled = true;
  options.ctx.imageSmoothingQuality = "high";
  options.ctx.drawImage(
    image,
    source.x,
    source.y,
    CELL,
    CELL,
    drawX,
    drawY,
    options.size,
    options.size,
  );
  options.ctx.restore();
  return true;
}

export function drawNationShipSprite(options: {
  ctx: CanvasRenderingContext2D;
  atlases: NationUnitAtlases;
  x: number;
  y: number;
  size: number;
  motionPhase?: number;
  direction?: MarchDirection;
  architectureId?: string;
  action?: "walk" | "attack";
}) {
  const action = options.action === "attack" ? "attack" : "walk";
  if (!nationUnitAtlasReady(options.atlases, action)) return false;
  const source = sourceFrame(
    "ship",
    action,
    action,
    options.motionPhase ?? 0,
    options.direction ?? "E",
    options.architectureId,
  );
  const image = action === "attack"
    ? options.atlases.action
    : options.atlases.movement;
  options.ctx.drawImage(
    image,
    source.x,
    source.y,
    CELL,
    CELL,
    options.x - options.size / 2,
    options.y - options.size * ((CELL - 2) / CELL),
    options.size,
    options.size,
  );
  return true;
}

export const NATION_UNIT_ATLAS_DEBUG = {
  cell: CELL,
  movementSize: MOVEMENT_SIZE,
  attackSize: ATTACK_SIZE,
  movementLayout: MOVEMENT_LAYOUT,
  actionLayout: ACTION_LAYOUT,
} as const;
