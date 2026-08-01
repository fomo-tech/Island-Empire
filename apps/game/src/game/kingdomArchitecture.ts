export type KingdomArchitectureId =
  | "lionheart"
  | "ironshield"
  | "firedragon"
  | "winddragon"
  | "goldencrown"
  | "blackeagle";

export type KingdomBuildingType = "capital" | "fortress" | "district";

export const KINGDOM_BASE_SHEET = "/assets/kingdoms/kingdom_base.webp";
export const KINGDOM_PREMIUM_SHEET = "/assets/kingdoms/kingdom_premium.webp";
export const KINGDOM_SPRITE_CELL = 320;
export const KINGDOM_PREMIUM_CELL = 512;

const ARCHITECTURE_COLUMNS: Record<KingdomArchitectureId, number> = {
  lionheart: 0,
  ironshield: 1,
  firedragon: 2,
  winddragon: 3,
  goldencrown: 4,
  blackeagle: 5,
};

const BUILDING_ROWS: Record<KingdomBuildingType, number> = {
  capital: 0,
  fortress: 1,
  district: 2,
};

const PREMIUM_COLUMNS: Record<string, number> = {
  skin_long_bao_thanh: 0,
  skin_hoa_long_dien: 1,
  skin_phong_long_cac: 2,
};

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

export function kingdomBuildingSprite(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
  skinId?: string | null,
) {
  const premiumColumn = buildingType === "capital" && skinId
    ? PREMIUM_COLUMNS[skinId]
    : undefined;
  if (premiumColumn !== undefined) {
    return {
      src: KINGDOM_PREMIUM_SHEET,
      sx: premiumColumn * KINGDOM_PREMIUM_CELL,
      sy: 0,
      sw: KINGDOM_PREMIUM_CELL,
      sh: KINGDOM_PREMIUM_CELL,
      columns: 3,
      rows: 1,
      premium: true,
    };
  }

  const normalized = normalizeKingdomArchitecture(architectureId);
  return {
    src: KINGDOM_BASE_SHEET,
    sx: ARCHITECTURE_COLUMNS[normalized] * KINGDOM_SPRITE_CELL,
    sy: BUILDING_ROWS[buildingType] * KINGDOM_SPRITE_CELL,
    sw: KINGDOM_SPRITE_CELL,
    sh: KINGDOM_SPRITE_CELL,
    columns: 6,
    rows: 3,
    premium: false,
  };
}

export function kingdomBuildingSpriteStyle(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
  skinId?: string | null,
) {
  const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
  const column = frame.sx / frame.sw;
  const row = frame.sy / frame.sh;
  return {
    backgroundImage: `url(${frame.src})`,
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.columns > 1 ? column / (frame.columns - 1) * 100 : 0}% ${frame.rows > 1 ? row / (frame.rows - 1) * 100 : 0}%`,
    backgroundRepeat: "no-repeat",
  };
}

export function kingdomArchitectureMeta(architectureId?: string | null) {
  const normalized = normalizeKingdomArchitecture(architectureId);
  return KINGDOM_ARCHITECTURES.find((item) => item.id === normalized)!;
}
