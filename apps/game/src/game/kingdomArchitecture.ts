export type KingdomArchitectureId =
  | "lionheart"
  | "ironshield"
  | "firedragon"
  | "winddragon"
  | "goldencrown"
  | "blackeagle";

export type KingdomBuildingType = "capital" | "fortress" | "district";

export const KINGDOM_BUILDING_LAYOUT: Record<KingdomBuildingType, {
  pivotX: number;
  pivotY: number;
  safeWidth: number;
  safeHeight: number;
}> = {
  capital: { pivotX: 0.5, pivotY: 474 / 512, safeWidth: 0.84, safeHeight: 0.86 },
  fortress: { pivotX: 0.5, pivotY: 474 / 512, safeWidth: 0.84, safeHeight: 0.82 },
  district: { pivotX: 0.5, pivotY: 474 / 512, safeWidth: 0.88, safeHeight: 0.7 },
};

export const KINGDOM_ARCHITECTURES: Array<{
  id: KingdomArchitectureId;
  name: string;
  subtitle: string;
  emblem: string;
  effect: "royal" | "steel" | "fire" | "wind" | "gold" | "shadow";
}> = [
  { id: "lionheart", name: "Lam Sư", subtitle: "Vương thất đá trắng", emblem: "lion", effect: "royal" },
  { id: "ironshield", name: "Khiên Thép", subtitle: "Thành lũy thiết giáp", emblem: "shield", effect: "steel" },
  { id: "firedragon", name: "Hỏa Long", subtitle: "Hắc thành dung nham", emblem: "dragon", effect: "fire" },
  { id: "winddragon", name: "Phong Long", subtitle: "Điện thành bắc hải", emblem: "eagle", effect: "wind" },
  { id: "goldencrown", name: "Hoàng Kim", subtitle: "Thánh điện vương miện", emblem: "crown", effect: "gold" },
  { id: "blackeagle", name: "Hắc Ưng", subtitle: "Pháo đài bóng đêm", emblem: "swords", effect: "shadow" },
];

const ARCHITECTURE_IDS = new Set(KINGDOM_ARCHITECTURES.map((item) => item.id));

export function normalizeKingdomArchitecture(value?: string | null): KingdomArchitectureId {
  return ARCHITECTURE_IDS.has(value as KingdomArchitectureId)
    ? (value as KingdomArchitectureId)
    : "lionheart";
}

export function kingdomArchitectureFromEmblem(emblem?: string | null): KingdomArchitectureId {
  return KINGDOM_ARCHITECTURES.find((item) => item.emblem === emblem)?.id || "lionheart";
}

export function kingdomArchitectureFromSkin(skinId?: string | null): KingdomArchitectureId | null {
  if (!skinId) return null;
  if (skinId === "skin_long_bao_thanh") return "goldencrown";
  if (skinId === "skin_hoa_long_dien") return "firedragon";
  if (skinId === "skin_phong_long_cac") return "winddragon";
  if (skinId === "skin_khien_thep") return "ironshield";
  if (skinId === "skin_hac_ung") return "blackeagle";
  if (skinId === "skin_lam_su_thanh") return "lionheart";
  return null;
}

export function kingdomBuildingAsset(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
) {
  return `/assets/kingdoms/${normalizeKingdomArchitecture(architectureId)}_${buildingType}.webp`;
}

export function kingdomArchitectureMeta(architectureId?: string | null) {
  const normalized = normalizeKingdomArchitecture(architectureId);
  return KINGDOM_ARCHITECTURES.find((item) => item.id === normalized)!;
}
