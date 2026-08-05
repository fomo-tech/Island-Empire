import {
  KINGDOM_BUILDING_LAYOUT,
  kingdomBuildingSprite,
  kingdomBuildingVisualMetrics,
  type KingdomBuildingType,
} from "../kingdomArchitecture";
import { territorySkinEffect } from "../cosmetics/territorySkinEffects";

const TAU = Math.PI * 2;
const avatarImages = new Map<string, HTMLImageElement>();
const knownAvatars = new Set([
  "emperor", "queen", "pirate", "assassin", "knight",
  "merchant", "alchemist", "scholar", "warlord", "nomad",
]);

export type BuildingOverlayGeometry = {
  groundX: number;
  groundY: number;
  roofX: number;
  roofY: number;
  radiusX: number;
  radiusY: number;
};

export function buildingOverlayGeometry(
  architectureId: string,
  buildingType: KingdomBuildingType,
  x: number,
  y: number,
  size: number,
  skinId: string | null = null,
): BuildingOverlayGeometry {
  const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
  const metrics = kingdomBuildingVisualMetrics(architectureId, buildingType, skinId);
  const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
  const width = buildingType === "flag"
    ? frame.premium ? size * 1.12 : size * (frame.sw / frame.sh)
    : size;
  return {
    groundX: x + width * (metrics.footX - layout.pivotX),
    groundY: y + size * (metrics.footY - layout.pivotY),
    roofX: x + width * (metrics.roofX - layout.pivotX),
    roofY: y + size * (metrics.roofY - layout.pivotY),
    radiusX: size * metrics.footprintWidth * 0.5,
    radiusY: size * metrics.footprintHeight,
  };
}

export function drawKingdomBuildingAura(options: {
  ctx: CanvasRenderingContext2D;
  tick: number;
  architectureId: string;
  buildingType: KingdomBuildingType;
  x: number;
  y: number;
  size: number;
  skinId?: string | null;
}) {
  const { ctx, tick, architectureId, buildingType, x, y, size } = options;
  const skinId = options.skinId ?? null;
  const colors: Record<string, [string, string]> = {
    vietnam: ["#dc2626", "#facc15"], china: ["#ef4444", "#fde68a"],
    japan: ["#1e3a8a", "#f8fafc"], england: ["#b91c1c", "#f8fafc"],
    viking: ["#0f766e", "#cbd5e1"], ottoman: ["#be123c", "#fbbf24"],
    france: ["#1d4ed8", "#facc15"], rome: ["#991b1b", "#f59e0b"],
  };
  const [accent, highlight] = colors[architectureId] || colors.vietnam;
  const effect = territorySkinEffect(skinId);
  const geometry = buildingOverlayGeometry(architectureId, buildingType, x, y, size, skinId);
  const pulse = 0.68 + Math.sin(tick * 2.4) * 0.12;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.23 * pulse;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(geometry.groundX, geometry.groundY, geometry.radiusX, geometry.radiusY, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.72;
  for (let index = 0; index < 5; index += 1) {
    const phase = tick * (0.35 + index * 0.025) + index * 1.31;
    ctx.fillStyle = index % 2 ? highlight : accent;
    ctx.beginPath();
    ctx.arc(
      geometry.groundX + Math.cos(phase) * size * (0.24 + (index % 2) * 0.08),
      geometry.groundY - size * (0.12 + ((phase * 0.11 + index * 0.17) % 0.5)),
      Math.max(1.3, size * 0.009), 0, TAU,
    );
    ctx.fill();
  }
  if (effect) {
    const skinPulse = 0.72 + Math.sin(tick * 2.8) * 0.16;
    ctx.globalAlpha = 0.62 + skinPulse * 0.18;
    ctx.shadowColor = effect.glow;
    ctx.shadowBlur = size * 0.07;
    ctx.strokeStyle = effect.border;
    ctx.lineWidth = Math.max(1.5, size * 0.012);
    ctx.setLineDash([size * 0.055, size * 0.035]);
    ctx.lineDashOffset = -tick * size * 0.035;
    ctx.beginPath();
    ctx.ellipse(geometry.groundX, geometry.groundY, geometry.radiusX * 0.98, geometry.radiusY * 0.94, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRulerAvatarBadge(options: {
  ctx: CanvasRenderingContext2D;
  zoom: number;
  architectureId: string;
  buildingType: KingdomBuildingType;
  x: number;
  y: number;
  size: number;
  skinId?: string | null;
  avatarId?: string | null;
  relation: "own" | "ally" | "enemy";
}) {
  const { ctx, zoom, architectureId, buildingType, x, y, size, relation } = options;
  if (buildingType !== "capital" && buildingType !== "district") return;
  if (zoom < (relation === "own" ? 0.38 : 0.5)) return;
  const skinId = options.skinId ?? null;
  const geometry = buildingOverlayGeometry(architectureId, buildingType, x, y, size, skinId);
  const radius = Math.max(12, Math.min(20, 14 / Math.max(zoom, 0.55)));
  // RoK-style owner badge: attached to the nameplate at the building foot,
  // never floating above the roof.
  const centerX = geometry.groundX;
  const centerY = geometry.groundY - radius * 0.72;
  const relationColor = relation === "own" ? "#27e0c1" : relation === "ally" ? "#5eb8ff" : "#ff5e5e";
  const id = knownAvatars.has(String(options.avatarId)) ? String(options.avatarId) : "emperor";
  let portrait = avatarImages.get(id);
  if (!portrait) {
    portrait = new Image();
    portrait.decoding = "async";
    portrait.src = `/assets/avatars/${id}.png`;
    avatarImages.set(id, portrait);
  }
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = radius * 0.42;
  ctx.fillStyle = "rgba(3,12,20,.98)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 3.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = relationColor;
  ctx.lineWidth = Math.max(2, radius * 0.15);
  ctx.stroke();
  ctx.strokeStyle = "#f5d36a";
  ctx.lineWidth = Math.max(1.2, radius * 0.08);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 0.8, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 1, 0, TAU);
  ctx.clip();
  if (portrait.complete && portrait.naturalWidth) {
    ctx.drawImage(portrait, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = relationColor;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  ctx.restore();
  ctx.restore();
}
