import type { KingdomBuildingType } from "./kingdomArchitecture";

/**
 * Canonical settlement classification used by map rendering and UI.
 * Keeping this decision in one pure function prevents flags, capitals and
 * military districts from drifting apart between different render paths.
 */
export type SettlementClassification = {
  isCapital: boolean;
  isSubCapital: boolean;
  isMilitaryDistrict: boolean;
  isTerritoryFlag: boolean;
  buildingType: KingdomBuildingType;
};

export type SettlementClassificationInput = {
  isIslet?: boolean;
  settlementKind?: string | null;
  connectionType?: string | null;
  capitalTerritoryConfirmed?: boolean;
  capitalTownConfirmed?: boolean;
};

/**
 * Only developed settlements have a player-facing progression level.
 * A territory flag can still carry an internal town snapshot for troops and
 * production calculations, but that implementation value must never leak
 * into the UI as “Trụ Cờ cấp N”.
 */
export function settlementHasLevel(settlementKind?: string | null): boolean {
  switch (settlementKind) {
    case "capital":
    case "sub_capital":
    case "military":
    case "military_district":
    case "stronghold":
      return true;
    default:
      return false;
  }
}

export function classifySettlement({
  isIslet = false,
  settlementKind,
  connectionType,
  capitalTerritoryConfirmed = false,
  capitalTownConfirmed = false,
}: SettlementClassificationInput): SettlementClassification {
  const isCapital =
    !isIslet &&
    (capitalTerritoryConfirmed ||
      capitalTownConfirmed ||
      settlementKind === "capital");
  const isSubCapital = !isIslet && settlementKind === "sub_capital";
  const isMilitaryDistrict =
    isIslet ||
    (!isCapital &&
      !isSubCapital &&
      (settlementKind === "military_district" || connectionType === "sea"));
  const isTerritoryFlag = !isCapital && !isSubCapital && !isMilitaryDistrict;
  const buildingType: KingdomBuildingType = isCapital
    ? "capital"
    : isSubCapital
      ? "fortress"
      : isMilitaryDistrict
        ? "district"
        : "flag";

  return {
    isCapital,
    isSubCapital,
    isMilitaryDistrict,
    isTerritoryFlag,
    buildingType,
  };
}
