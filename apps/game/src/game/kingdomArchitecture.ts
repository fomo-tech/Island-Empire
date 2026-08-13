export type KingdomArchitectureId =
  | "vietnam"
  | "china"
  | "japan"
  | "england"
  | "viking"
  | "ottoman"
  | "france"
  | "rome";

export type KingdomBuildingType = "capital" | "fortress" | "district" | "flag" | "construction";

export const KINGDOM_PREMIUM_SHEET = "/assets/kingdoms/skins/kingdom-skin-bundles.webp?v=bundles-v1";
export const NATION_BUILDING_SHEET = "/assets/kingdoms/nations/nations_8_buildings.webp?v=nations-v2";
export const NATION_FLAG_SHEET = "/assets/kingdoms/nation_flags_atlas.webp?v=flags-v2";
export const KINGDOM_SPRITE_CELL = 512;
export const NATION_FLAG_CELL_WIDTH = 418;
export const NATION_FLAG_CELL_HEIGHT = 627;

const BUILDING_VISUAL_CENTERS = {
  capital: [
    [0.514, 0.547], [0.496, 0.561], [0.519, 0.497], [0.488, 0.51],
    [0.511, 0.517], [0.506, 0.5], [0.509, 0.431], [0.5, 0.426],
  ],
  district: [
    [0.5, 0.576], [0.474, 0.6], [0.5, 0.578], [0.479, 0.566],
    [0.494, 0.51], [0.489, 0.514], [0.5, 0.431], [0.477, 0.486],
  ],
  flag: [
    [0.58, 0.517], [0.5, 0.515], [0.446, 0.517], [0.402, 0.514],
    [0.566, 0.464], [0.488, 0.467], [0.45, 0.467], [0.388, 0.468],
  ],
} as const;
const KINGDOM_PREMIUM_SPRITE_CELL = 512;

const PREMIUM_COLUMNS: Record<string, number> = {
  skin_long_bao_thanh: 0,
  skin_hoa_long_dien: 1,
  skin_bang_vuong: 2,
  skin_phong_long_cac: 3,
  skin_hac_nguyet: 4,
};
const PREMIUM_BUILDING_FILES: Partial<
  Record<string, Record<"capital" | "district" | "flag", string>>
> = {
  skin_thien_loi_than_dien: {
    capital: "/assets/kingdoms/premium/stormgod/capital.png",
    district: "/assets/kingdoms/premium/stormgod/district.png",
    flag: "/assets/kingdoms/premium/stormgod/flag.png",
  },
  skin_thien_long_de_do: {
    capital: "/assets/kingdoms/premium/thousand-dragons/capital.png",
    district: "/assets/kingdoms/premium/thousand-dragons/district.png",
    flag: "/assets/kingdoms/premium/thousand-dragons/flag.png",
  },
};

export const KINGDOM_BUILDING_LAYOUT: Record<KingdomBuildingType, {
  pivotX: number;
  pivotY: number;
  safeWidth: number;
  safeHeight: number;
}> = {
  capital: { pivotX: 0.5, pivotY: 0.94, safeWidth: 0.94, safeHeight: 0.88 },
  fortress: { pivotX: 0.5, pivotY: 0.94, safeWidth: 0.92, safeHeight: 0.8 },
  district: { pivotX: 0.5, pivotY: 0.94, safeWidth: 0.92, safeHeight: 0.76 },
  flag: { pivotX: 0.5, pivotY: 0.965, safeWidth: 0.74, safeHeight: 0.92 },
  construction: { pivotX: 0.5, pivotY: 0.94, safeWidth: 0.92, safeHeight: 0.76 },
};

export type KingdomBuildingVisualMetrics = {
  /** Sprite-space coordinates (0..1) used for ground/portrait placement. */
  footX: number;
  footY: number;
  roofX: number;
  roofY: number;
  footprintWidth: number;
  footprintHeight: number;
};

const PREMIUM_BUILDING_METRICS: Record<
  "capital" | "district" | "flag",
  KingdomBuildingVisualMetrics
> = {
  capital: {
    footX: 0.5,
    // Premium capital artwork ends around 79% of its square atlas cell.
    // The remaining transparent pixels must not be treated as its ground.
    footY: 0.79,
    roofX: 0.5,
    roofY: 0.065,
    footprintWidth: 0.82,
    footprintHeight: 0.105,
  },
  district: {
    footX: 0.5,
    // Districts are shorter inside the shared 512px cell.
    footY: 0.60,
    roofX: 0.5,
    roofY: 0.12,
    footprintWidth: 0.78,
    footprintHeight: 0.095,
  },
  flag: {
    footX: 0.5,
    footY: 0.98,
    roofX: 0.5,
    roofY: 0.06,
    footprintWidth: 0.4,
    footprintHeight: 0.1,
  },
};

const CUSTOM_PREMIUM_BUILDING_METRICS: Partial<
  Record<string, Record<"capital" | "district" | "flag", KingdomBuildingVisualMetrics>>
> = {
  skin_thien_loi_than_dien: {
    capital: { footX: 0.5, footY: 0.94, roofX: 0.5, roofY: 0.025, footprintWidth: 0.72, footprintHeight: 0.12 },
    district: { footX: 0.5, footY: 0.86, roofX: 0.5, roofY: 0.11, footprintWidth: 0.72, footprintHeight: 0.12 },
    flag: { footX: 0.5, footY: 0.985, roofX: 0.5, roofY: 0.025, footprintWidth: 0.28, footprintHeight: 0.1 },
  },
  skin_thien_long_de_do: {
    capital: { footX: 0.5, footY: 0.91, roofX: 0.5, roofY: 0.07, footprintWidth: 0.84, footprintHeight: 0.12 },
    district: { footX: 0.5, footY: 0.84, roofX: 0.5, roofY: 0.16, footprintWidth: 0.78, footprintHeight: 0.11 },
    flag: { footX: 0.5, footY: 0.96, roofX: 0.5, roofY: 0.035, footprintWidth: 0.4, footprintHeight: 0.1 },
  },
};

const DEFAULT_BUILDING_METRICS: Record<KingdomBuildingType, KingdomBuildingVisualMetrics> = {
  capital: { footX: 0.5, footY: 0.96, roofX: 0.5, roofY: 0.08, footprintWidth: 0.78, footprintHeight: 0.18 },
  fortress: { footX: 0.5, footY: 0.96, roofX: 0.5, roofY: 0.1, footprintWidth: 0.76, footprintHeight: 0.17 },
  district: { footX: 0.5, footY: 0.96, roofX: 0.5, roofY: 0.12, footprintWidth: 0.74, footprintHeight: 0.16 },
  flag: { footX: 0.5, footY: 0.97, roofX: 0.5, roofY: 0.08, footprintWidth: 0.42, footprintHeight: 0.1 },
  construction: { footX: 0.5, footY: 0.96, roofX: 0.5, roofY: 0.1, footprintWidth: 0.76, footprintHeight: 0.17 },
};

// Alpha bounds measured from nations_8_buildings.webp. Later rows contain
// substantially more transparent space below the artwork, so a shared 0.96
// footY makes French/Roman buildings float far above their ground anchor.
const NATION_BUILDING_VERTICAL_BOUNDS = {
  capital: [
    [0.1172, 0.9766],
    [0.1367, 0.9844],
    [0.0352, 0.959],
    [0.0195, 1],
    [0.0332, 1],
    [0, 1],
    [0, 0.8613],
    [0, 0.8516],
  ],
  district: [
    [0.1973, 0.9551],
    [0.2188, 0.9805],
    [0.207, 0.9492],
    [0.1797, 0.9531],
    [0.1172, 0.9023],
    [0.1309, 0.8965],
    [0.0195, 0.8418],
    [0.0938, 0.8789],
  ],
} as const;

function nationBuildingMetrics(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
) {
  const index = kingdomArchitectureIndex(architectureId);
  const metricType = buildingType === "capital" ? "capital" : "district";
  const [roofY, footY] =
    NATION_BUILDING_VERTICAL_BOUNDS[metricType][index] ||
    NATION_BUILDING_VERTICAL_BOUNDS[metricType][0];
  const [footX] =
    metricType === "capital"
      ? BUILDING_VISUAL_CENTERS.capital[index]
      : BUILDING_VISUAL_CENTERS.district[index];
  const defaults = DEFAULT_BUILDING_METRICS[buildingType];
  return {
    ...defaults,
    footX,
    footY,
    roofX: footX,
    roofY,
  };
}

export const KINGDOM_ARCHITECTURES: Array<{
  id: KingdomArchitectureId;
  name: string;
  subtitle: string;
  emblem: string;
  effect: "royal" | "steel" | "fire" | "wind" | "gold" | "shadow";
  unitColor: string;
}> = [
  { id: "vietnam", name: "Đại Việt", subtitle: "Hoàng thành Đại Việt", emblem: "dragon", effect: "fire", unitColor: "#b3261e" },
  { id: "china", name: "Trung Hoa", subtitle: "Hoàng cung Trung Hoa", emblem: "shield", effect: "gold", unitColor: "#d33a22" },
  { id: "japan", name: "Nhật Bản", subtitle: "Thành quách Mạc Phủ", emblem: "star", effect: "wind", unitColor: "#253f6d" },
  { id: "england", name: "Anh", subtitle: "Thành trì Sư Tử", emblem: "lion", effect: "royal", unitColor: "#b91c1c" },
  { id: "viking", name: "Viking", subtitle: "Pháo đài Bắc Hải", emblem: "swords", effect: "shadow", unitColor: "#155e75" },
  { id: "ottoman", name: "Ottoman", subtitle: "Cung thành Trăng Khuyết", emblem: "crown", effect: "gold", unitColor: "#be1831" },
  { id: "france", name: "Pháp", subtitle: "Thành trì Hoa Bách Hợp", emblem: "tree", effect: "steel", unitColor: "#1d4ed8" },
  { id: "rome", name: "La Mã", subtitle: "Pháo đài Đế quốc", emblem: "eagle", effect: "fire", unitColor: "#9f1239" },
];

const ARCHITECTURE_IDS = new Set(KINGDOM_ARCHITECTURES.map((item) => item.id));
const LEGACY_ARCHITECTURES: Record<string, KingdomArchitectureId> = {
  firedragon: "vietnam",
  ironshield: "china",
  lionheart: "japan",
  winddragon: "rome",
  goldencrown: "ottoman",
  blackeagle: "england",
};

export function normalizeKingdomArchitecture(value?: string | null): KingdomArchitectureId {
  if (value && ARCHITECTURE_IDS.has(value as KingdomArchitectureId)) return value as KingdomArchitectureId;
  return value && LEGACY_ARCHITECTURES[value] ? LEGACY_ARCHITECTURES[value] : "vietnam";
}

export function kingdomArchitectureIndex(value?: string | null) {
  const normalized = normalizeKingdomArchitecture(value);
  return Math.max(0, KINGDOM_ARCHITECTURES.findIndex((item) => item.id === normalized));
}

export function kingdomBuildingVisualCenter(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
  skinId?: string | null,
) {
  if ((buildingType === "capital" || buildingType === "district" || buildingType === "flag") &&
    skinId && PREMIUM_BUILDING_FILES[skinId]?.[buildingType]) {
    return { x: 0.5, y: 0.51 };
  }
  if ((buildingType === "capital" || buildingType === "district" || buildingType === "flag")
    && skinId && PREMIUM_COLUMNS[skinId] !== undefined) {
    return { x: 0.5, y: 0.51 };
  }
  const index = kingdomArchitectureIndex(architectureId);
  const centers = buildingType === "capital"
    ? BUILDING_VISUAL_CENTERS.capital
    : buildingType === "flag"
      ? BUILDING_VISUAL_CENTERS.flag
      : BUILDING_VISUAL_CENTERS.district;
  const [x, y] = centers[index] || [0.5, 0.5];
  return { x, y };
}

export function kingdomBuildingVisualMetrics(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
  skinId?: string | null,
): KingdomBuildingVisualMetrics {
  const customMetrics = skinId &&
    (buildingType === "capital" || buildingType === "district" || buildingType === "flag")
      ? CUSTOM_PREMIUM_BUILDING_METRICS[skinId]?.[buildingType]
      : undefined;
  if (customMetrics) return customMetrics;
  const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
  if (
    frame.premium &&
    (buildingType === "capital" ||
      buildingType === "district" ||
      buildingType === "flag")
  ) {
    return PREMIUM_BUILDING_METRICS[buildingType];
  }
  if (
    buildingType === "capital" ||
    buildingType === "district" ||
    buildingType === "fortress" ||
    buildingType === "construction"
  ) {
    return nationBuildingMetrics(architectureId, buildingType);
  }
  return DEFAULT_BUILDING_METRICS[buildingType];
}

export function kingdomArchitectureFromEmblem(emblem?: string | null): KingdomArchitectureId {
  return KINGDOM_ARCHITECTURES.find((item) => item.emblem === emblem)?.id || "vietnam";
}

// Legacy helper retained for old saves. Rendering must not derive a nation from a skin.
export function kingdomArchitectureFromSkin(skinId?: string | null): KingdomArchitectureId | null {
  if (!skinId) return null;
  if (skinId === "skin_hoa_long_dien") return "vietnam";
  if (skinId === "skin_khien_thep") return "china";
  if (skinId === "skin_lam_su_thanh") return "japan";
  if (skinId === "skin_hac_ung") return "england";
  if (skinId === "skin_long_bao_thanh") return "ottoman";
  if (skinId === "skin_phong_long_cac") return "rome";
  if (skinId === "skin_bang_vuong") return "france";
  if (skinId === "skin_hac_nguyet") return "england";
  return null;
}

export function kingdomBuildingSprite(
  architectureId: string | null | undefined,
  buildingType: KingdomBuildingType,
  skinId?: string | null,
) {
  const nationIndex = kingdomArchitectureIndex(architectureId);
  const customPremiumFile = skinId &&
    (buildingType === "capital" || buildingType === "district" || buildingType === "flag")
      ? PREMIUM_BUILDING_FILES[skinId]?.[buildingType]
      : undefined;
  if (customPremiumFile) {
    return {
      src: customPremiumFile,
      sx: 0,
      sy: 0,
      sw: KINGDOM_PREMIUM_SPRITE_CELL,
      sh: KINGDOM_PREMIUM_SPRITE_CELL,
      columns: 1,
      rows: 1,
      premium: true,
    };
  }
  const premiumColumn = (buildingType === "capital" || buildingType === "district" || buildingType === "flag") && skinId
    ? PREMIUM_COLUMNS[skinId]
    : undefined;
  if (premiumColumn !== undefined) {
    const premiumRow = buildingType === "capital" ? 0 : buildingType === "district" ? 1 : 2;
    return {
      src: KINGDOM_PREMIUM_SHEET,
      sx: premiumColumn * KINGDOM_PREMIUM_SPRITE_CELL,
      sy: premiumRow * KINGDOM_PREMIUM_SPRITE_CELL,
      sw: KINGDOM_PREMIUM_SPRITE_CELL,
      sh: KINGDOM_PREMIUM_SPRITE_CELL,
      columns: 5,
      rows: 3,
      premium: true,
    };
  }
  if (buildingType === "flag") {
    return {
      src: NATION_FLAG_SHEET,
      sx: (nationIndex % 4) * NATION_FLAG_CELL_WIDTH,
      sy: Math.floor(nationIndex / 4) * NATION_FLAG_CELL_HEIGHT,
      sw: NATION_FLAG_CELL_WIDTH,
      sh: NATION_FLAG_CELL_HEIGHT,
      columns: 4,
      rows: 2,
      premium: false,
    };
  }

  const cellIndex = nationIndex * 2 + (buildingType === "capital" ? 0 : 1);
  return {
    src: NATION_BUILDING_SHEET,
    sx: (cellIndex % 4) * KINGDOM_SPRITE_CELL,
    sy: Math.floor(cellIndex / 4) * KINGDOM_SPRITE_CELL,
    sw: KINGDOM_SPRITE_CELL,
    sh: KINGDOM_SPRITE_CELL,
    columns: 4,
    rows: 4,
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
