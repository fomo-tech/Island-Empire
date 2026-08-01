export type KingdomArchitectureId =
  | "lionheart"
  | "ironshield"
  | "firedragon"
  | "winddragon"
  | "goldencrown"
  | "blackeagle";

export type KingdomBuildingType = "capital" | "fortress" | "district" | "construction";

export const KINGDOM_PREMIUM_SHEET = "/assets/kingdoms/kingdom_premium.webp";
export const KINGDOM_SPRITE_CELL = 1024;
const KINGDOM_PREMIUM_SPRITE_CELL = 320;

const BUILDING_CELLS: Record<KingdomBuildingType, { column: number; row: number }> = {
  capital: { column: 0, row: 0 },
  fortress: { column: 1, row: 0 },
  district: { column: 0, row: 1 },
  construction: { column: 1, row: 1 },
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
  capital: { pivotX: 0.5, pivotY: 0.965, safeWidth: 0.91, safeHeight: 0.91 },
  fortress: { pivotX: 0.5, pivotY: 0.95, safeWidth: 0.88, safeHeight: 0.82 },
  district: { pivotX: 0.5, pivotY: 0.95, safeWidth: 0.88, safeHeight: 0.72 },
  construction: { pivotX: 0.5, pivotY: 0.95, safeWidth: 0.88, safeHeight: 0.68 },
};

const KINGDOM_ARCHITECTURE_BASE: Array<{
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

const CIVILIZATION_META: Record<KingdomArchitectureId, { name: string; subtitle: string }> = {
  lionheart: { name: "Nhật Bản", subtitle: "Thành quách Mạc Phủ" },
  ironshield: { name: "Trung Quốc", subtitle: "Hoàng cung Trung Hoa" },
  firedragon: { name: "Đại Việt", subtitle: "Hoàng thành Đại Việt" },
  winddragon: { name: "La Mã", subtitle: "Pháo đài Đế quốc" },
  goldencrown: { name: "Ba Tư", subtitle: "Thánh điện sa mạc" },
  blackeagle: { name: "Gothic", subtitle: "Thành trì Tây Âu" },
};

const NATION_SHEETS: Record<KingdomArchitectureId, string> = {
  lionheart: "/assets/kingdoms/nations/japan.webp?v=nations-v1",
  ironshield: "/assets/kingdoms/nations/china.webp?v=nations-v1",
  firedragon: "/assets/kingdoms/nations/vietnam.webp?v=nations-v1",
  winddragon: "/assets/kingdoms/nations/rome.webp?v=nations-v1",
  goldencrown: "/assets/kingdoms/nations/persia.webp?v=nations-v1",
  blackeagle: "/assets/kingdoms/nations/gothic.webp?v=nations-v1",
};

export const KINGDOM_ARCHITECTURES = KINGDOM_ARCHITECTURE_BASE.map((item) => ({
  ...item,
  ...CIVILIZATION_META[item.id],
}));

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
      sx: premiumColumn * KINGDOM_PREMIUM_SPRITE_CELL,
      sy: 0,
      sw: KINGDOM_PREMIUM_SPRITE_CELL,
      sh: KINGDOM_PREMIUM_SPRITE_CELL,
      columns: 3,
      rows: 1,
      premium: true,
    };
  }

  const normalized = normalizeKingdomArchitecture(architectureId);
  const cell = BUILDING_CELLS[buildingType];
  return {
    src: NATION_SHEETS[normalized],
    sx: cell.column * KINGDOM_SPRITE_CELL,
    sy: cell.row * KINGDOM_SPRITE_CELL,
    sw: KINGDOM_SPRITE_CELL,
    sh: KINGDOM_SPRITE_CELL,
    columns: 2,
    rows: 2,
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
