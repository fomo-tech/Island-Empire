import {
  KINGDOM_BUILDING_LAYOUT,
  type KingdomBuildingType,
} from "../kingdomArchitecture";

export const CAPITAL_PREFERRED_RENDER_SIZE = 190;
export const DISTRICT_PREFERRED_RENDER_SIZE = 165;
export const FLAG_PREFERRED_RENDER_SIZE = 105;

export type TerritorySizeBounds = {
  rx?: number;
  ry?: number;
};

export function territoryBuildingSize(
  territory: TerritorySizeBounds,
  buildingType: KingdomBuildingType,
  preferredSize: number,
) {
  const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
  const safeHalfWidth = Math.max(48, Number(territory.rx || 0) * 0.72);
  const safeTopHeight = Math.max(54, Number(territory.ry || 0) * 0.72);
  const widthLimit = (safeHalfWidth * 2) / layout.safeWidth;
  const heightLimit = safeTopHeight / (layout.safeHeight * layout.pivotY);
  const minSize =
    buildingType === "flag"
      ? 62
      : buildingType === "capital"
        ? 130
        : buildingType === "district"
          ? 94
          : 104;
  return Math.max(minSize, Math.min(preferredSize, widthLimit, heightLimit));
}

/**
 * Returns the canonical world-map building size.
 *
 * Every building is bounded by its own territory. A fixed capital size made
 * Hoàng Thành overflow smaller provinces and appear off-centre even with a
 * correct anchor.
 */
export function standardTerritoryBuildingSize(
  territory: TerritorySizeBounds,
  buildingType: KingdomBuildingType,
  isIslet = false,
) {
  const preferredSize = buildingType === "capital"
    ? CAPITAL_PREFERRED_RENDER_SIZE
    : buildingType === "district" || buildingType === "fortress"
      ? isIslet ? 150 : DISTRICT_PREFERRED_RENDER_SIZE
      : FLAG_PREFERRED_RENDER_SIZE;
  return territoryBuildingSize(territory, buildingType, preferredSize);
}
