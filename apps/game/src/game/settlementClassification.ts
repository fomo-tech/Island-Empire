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
