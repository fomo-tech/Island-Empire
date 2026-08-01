import type { CSSProperties } from "react";
import {
  kingdomBuildingSpriteStyle,
  type KingdomBuildingType,
} from "../game/kingdomArchitecture";

export function KingdomBuildingSprite({
  architectureId,
  buildingType,
  skinId,
  className = "",
  label,
}: {
  architectureId?: string | null;
  buildingType: KingdomBuildingType;
  skinId?: string | null;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`kingdom-building-sprite ${className}`.trim()}
      style={kingdomBuildingSpriteStyle(
        architectureId,
        buildingType,
        skinId,
      ) as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
