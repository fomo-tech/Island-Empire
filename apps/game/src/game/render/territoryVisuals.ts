export type TerritoryBiomePalette = {
  a: string;
  b?: string;
};

const FALLBACK_TERRAIN_COLOR = "#3b6939";
const FALLBACK_OWNER_COLORS = [
  "#3f7ed8",
  "#c94b43",
  "#4f9a55",
  "#b88435",
  "#7356b7",
  "#b85583",
  "#3b9088",
  "#737d89",
];

/**
 * A territory's terrain color must depend only on its biome. Keeping ownership
 * out of this layer prevents neighboring provinces from becoming randomly
 * lighter or darker and preserves contrast for vegetation drawn above it.
 */
export function territoryTerrainColor(
  biome: TerritoryBiomePalette | undefined,
): string {
  return biome?.a || biome?.b || FALLBACK_TERRAIN_COLOR;
}

function hashOwnerId(ownerId: string): number {
  let value = 2166136261;
  for (let index = 0; index < ownerId.length; index += 1) {
    value ^= ownerId.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value >>> 0);
}

/** Stable fallback used only when the server has not supplied a flag color. */
export function fallbackTerritoryOwnerColor(
  ownerId: string | null | undefined,
  localColor = "#2563eb",
): string {
  if (!ownerId) return localColor;
  return FALLBACK_OWNER_COLORS[
    hashOwnerId(ownerId) % FALLBACK_OWNER_COLORS.length
  ];
}

/** One opacity contract for every claimed territory. */
export const TERRITORY_OWNER_TINT_ALPHA = 0.22;

