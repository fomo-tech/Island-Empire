import {
  KINGDOM_BUILDING_LAYOUT,
  type KingdomBuildingType,
} from "../kingdomArchitecture";

export const MAINLAND_CAPITAL_RENDER_SIZE = 240;
export const ISLET_DISTRICT_RENDER_SIZE = 170;

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
    buildingType === "flag" ? 62 : buildingType === "district" ? 94 : 112;
  return Math.max(minSize, Math.min(preferredSize, widthLimit, heightLimit));
}

/**
 * Returns the canonical world-map building size.
 *
 * Capitals intentionally do not depend on territory polygon dimensions so
 * every mainland nation has the same visual weight. Islets are districts and
 * use their own fixed scale; other building types retain safe-area clamping.
 */
export function standardTerritoryBuildingSize(
  territory: TerritorySizeBounds,
  buildingType: KingdomBuildingType,
  isIslet = false,
) {
  if (buildingType === "capital") return MAINLAND_CAPITAL_RENDER_SIZE;
  if (buildingType === "district" && isIslet) {
    return ISLET_DISTRICT_RENDER_SIZE;
  }
  const preferredSize =
    buildingType === "district" || buildingType === "fortress" ? 170 : 105;
  return territoryBuildingSize(territory, buildingType, preferredSize);
}
