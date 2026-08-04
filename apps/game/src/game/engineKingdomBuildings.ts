// @ts-nocheck

import {
  kingdomBuildingSprite,
  kingdomBuildingVisualCenter,
  KINGDOM_BUILDING_LAYOUT,
  normalizeKingdomArchitecture,
  type KingdomBuildingType,
} from "./kingdomArchitecture";

export function createKingdomBuildingHelpers(deps: {
  ctxRef: () => CanvasRenderingContext2D;
  tickRef: () => number;
  zoomRef: () => number;
  TAU: number;
  isFastPanning: () => boolean;
  isFastRenderMode: () => boolean;
  isCrowdedRenderMode: () => boolean;
}) {
  const {
    ctxRef,
    tickRef,
    zoomRef,
    TAU,
    isFastPanning,
    isFastRenderMode,
    isCrowdedRenderMode,
  } = deps;

  const kingdomBuildingImages = new Map<string, HTMLImageElement>();

  function drawKingdomBuildingEffect(
    architectureId: string,
    x: number,
    y: number,
    size: number,
  ) {
    const pulse = 0.68 + Math.sin(tickRef() * 2.4) * 0.12;
    const colors: Record<string, [string, string]> = {
      vietnam: ["#dc2626", "#facc15"],
      china: ["#ef4444", "#fde68a"],
      japan: ["#1e3a8a", "#f8fafc"],
      england: ["#b91c1c", "#f8fafc"],
      viking: ["#0f766e", "#cbd5e1"],
      ottoman: ["#be123c", "#fbbf24"],
      france: ["#1d4ed8", "#facc15"],
      rome: ["#991b1b", "#f59e0b"],
    };
    const [accent, highlight] = colors[architectureId] || colors.vietnam;
    const ctx = ctxRef();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.23 * pulse;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.12, size * 0.43, size * 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.72;
    for (let i = 0; i < 5; i++) {
      const phase = tickRef() * (0.35 + i * 0.025) + i * 1.31;
      const px = x + Math.cos(phase) * size * (0.24 + (i % 2) * 0.08);
      const py = y - size * (0.16 + ((phase * 0.11 + i * 0.17) % 0.5));
      ctx.fillStyle = i % 2 ? highlight : accent;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.3, size * 0.009), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawKingdomBuildingSprite(
    architectureId: string,
    buildingType: KingdomBuildingType,
    x: number,
    y: number,
    size: number,
    skinId: string | null = null,
  ) {
    const normalized = normalizeKingdomArchitecture(architectureId);
    const frame = kingdomBuildingSprite(normalized, buildingType, skinId);
    let image = kingdomBuildingImages.get(frame.src);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = frame.src;
      kingdomBuildingImages.set(frame.src, image);
    }
    if (!image.complete || !image.naturalWidth) return false;

    if (
      frame.premium &&
      zoomRef() >= 0.5 &&
      !isFastRenderMode() &&
      !isCrowdedRenderMode() &&
      !isFastPanning()
    ) {
      drawKingdomBuildingEffect(normalized, x, y, size);
    }

    const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
    const preserveFrameAspect = buildingType === "flag";
    const drawHeight = size;
    const drawWidth = preserveFrameAspect ? size * (frame.sw / frame.sh) : size;

    const ctx = ctxRef();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x - drawWidth * layout.pivotX,
      y - drawHeight * layout.pivotY,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }

  function territoryBuildingSize(
    r: any,
    buildingType: KingdomBuildingType,
    preferredSize: number,
  ) {
    const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
    const safeHalfWidth = Math.max(48, Number(r.rx || 0) * 0.72);
    const safeTopHeight = Math.max(54, Number(r.ry || 0) * 0.72);
    const widthLimit = (safeHalfWidth * 2) / layout.safeWidth;
    const heightLimit = safeTopHeight / (layout.safeHeight * layout.pivotY);
    const minSize =
      buildingType === "flag" ? 62 : buildingType === "district" ? 94 : 112;
    return Math.max(minSize, Math.min(preferredSize, widthLimit, heightLimit));
  }

  function territoryBuildingAnchor(
    centerX: number,
    centerY: number,
    architectureId: string,
    buildingType: KingdomBuildingType,
    size: number,
    skinId: string | null = null,
  ) {
    const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
    const visualCenter = kingdomBuildingVisualCenter(
      architectureId,
      buildingType,
      skinId,
    );
    const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
    const drawWidth =
      buildingType === "flag" ? size * (frame.sw / frame.sh) : size;
    return {
      x: centerX + drawWidth * (layout.pivotX - visualCenter.x),
      y: centerY + size * (layout.pivotY - visualCenter.y),
    };
  }

  return {
    drawKingdomBuildingSprite,
    territoryBuildingSize,
    territoryBuildingAnchor,
  };
}
