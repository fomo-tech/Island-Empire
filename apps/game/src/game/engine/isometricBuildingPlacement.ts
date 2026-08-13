import {
  KINGDOM_BUILDING_LAYOUT,
  kingdomBuildingSprite,
  kingdomBuildingVisualMetrics,
  type KingdomBuildingType,
} from "../kingdomArchitecture";

export type IsometricBuildingPlacement = {
  /** Canonical contact point on the isometric ground plane. */
  groundX: number;
  groundY: number;
  /** Anchor consumed by the atlas renderer. */
  anchorX: number;
  anchorY: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  footprintCenterX: number;
  footprintCenterY: number;
  footprintRadiusX: number;
  footprintRadiusY: number;
  roofX: number;
  roofY: number;
  depthKey: number;
};

export function kingdomBuildingDrawSize(
  architectureId: string,
  buildingType: KingdomBuildingType,
  size: number,
  skinId: string | null = null,
) {
  const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
  return {
    width:
      buildingType === "flag"
        ? frame.premium
          ? size * 1.12
          : size * (frame.sw / frame.sh)
        : size,
    height: size,
  };
}

/**
 * Resolves every building overlay from one ground contact point.
 *
 * Sprite cells contain different amounts of transparent padding. Aligning
 * their visual centre to a territory moves the actual feet of the building,
 * most noticeably for the short district row. Solving the atlas transform
 * from footX/footY keeps construction, completed buildings and overlays on
 * the same isometric ground plane.
 */
export function resolveIsometricBuildingPlacement(
  architectureId: string,
  buildingType: KingdomBuildingType,
  groundX: number,
  groundY: number,
  size: number,
  skinId: string | null = null,
): IsometricBuildingPlacement {
  const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
  const metrics = kingdomBuildingVisualMetrics(
    architectureId,
    buildingType,
    skinId,
  );
  const drawSize = kingdomBuildingDrawSize(
    architectureId,
    buildingType,
    size,
    skinId,
  );
  const anchorX =
    groundX - drawSize.width * (metrics.footX - layout.pivotX);
  const anchorY =
    groundY - drawSize.height * (metrics.footY - layout.pivotY);
  const footprintRadiusX =
    drawSize.width * metrics.footprintWidth * 0.5;
  const footprintRadiusY =
    drawSize.height * metrics.footprintHeight;
  const footprintCenterY = groundY - footprintRadiusY * 0.72;

  return {
    groundX,
    groundY,
    anchorX,
    anchorY,
    drawX: anchorX - drawSize.width * layout.pivotX,
    drawY: anchorY - drawSize.height * layout.pivotY,
    drawWidth: drawSize.width,
    drawHeight: drawSize.height,
    footprintCenterX: groundX,
    footprintCenterY,
    footprintRadiusX,
    footprintRadiusY,
    roofX:
      anchorX + drawSize.width * (metrics.roofX - layout.pivotX),
    roofY:
      anchorY + drawSize.height * (metrics.roofY - layout.pivotY),
    // The foremost edge of the footprint determines overlap on the ground.
    depthKey: footprintCenterY + footprintRadiusY,
  };
}

/**
 * Places the centre of the visible isometric footprint on a territory point.
 * The sprite's lowest foot pixel is the near edge, so it must sit slightly
 * below the surface centre rather than directly on it.
 */
export function resolveIsometricBuildingPlacementOnSurface(
  architectureId: string,
  buildingType: KingdomBuildingType,
  surfaceX: number,
  surfaceY: number,
  size: number,
  skinId: string | null = null,
) {
  const metrics = kingdomBuildingVisualMetrics(
    architectureId,
    buildingType,
    skinId,
  );
  const footprintRadiusY = size * metrics.footprintHeight;
  return resolveIsometricBuildingPlacement(
    architectureId,
    buildingType,
    surfaceX,
    surfaceY + footprintRadiusY * 0.72,
    size,
    skinId,
  );
}

export function resolveIsometricBuildingPlacementFromAnchor(
  architectureId: string,
  buildingType: KingdomBuildingType,
  anchorX: number,
  anchorY: number,
  size: number,
  skinId: string | null = null,
) {
  const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
  const metrics = kingdomBuildingVisualMetrics(
    architectureId,
    buildingType,
    skinId,
  );
  const drawSize = kingdomBuildingDrawSize(
    architectureId,
    buildingType,
    size,
    skinId,
  );
  return resolveIsometricBuildingPlacement(
    architectureId,
    buildingType,
    anchorX + drawSize.width * (metrics.footX - layout.pivotX),
    anchorY + drawSize.height * (metrics.footY - layout.pivotY),
    size,
    skinId,
  );
}
