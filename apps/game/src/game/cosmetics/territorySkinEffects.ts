export type TerritorySkinEffect = {
  fill: string;
  border: string;
  glow: string;
  fillAlpha: number;
  auraIntensity: number;
  orbitingEmbers: number;
};

const TERRITORY_SKIN_EFFECTS: Record<string, TerritorySkinEffect> = {
  skin_long_bao_thanh: {
    fill: "#d3aa45",
    border: "#ffe08a",
    glow: "rgba(255, 206, 84, 0.7)",
    fillAlpha: 0.16,
    auraIntensity: 1.12,
    orbitingEmbers: 7,
  },
  skin_hoa_long_dien: {
    fill: "#a33c28",
    border: "#ff8a47",
    glow: "rgba(255, 82, 35, 0.72)",
    fillAlpha: 0.15,
    auraIntensity: 1.2,
    orbitingEmbers: 9,
  },
  skin_bang_vuong: {
    fill: "#54a7c4",
    border: "#b8f3ff",
    glow: "rgba(92, 220, 255, 0.72)",
    fillAlpha: 0.15,
    auraIntensity: 1.16,
    orbitingEmbers: 8,
  },
  skin_phong_long_cac: {
    fill: "#6f9eb0",
    border: "#f3dda0",
    glow: "rgba(169, 224, 242, 0.68)",
    fillAlpha: 0.14,
    auraIntensity: 1.1,
    orbitingEmbers: 7,
  },
  skin_hac_nguyet: {
    fill: "#665080",
    border: "#c59aff",
    glow: "rgba(164, 105, 255, 0.72)",
    fillAlpha: 0.16,
    auraIntensity: 1.26,
    orbitingEmbers: 10,
  },
  skin_thien_loi_than_dien: {
    fill: "#256fa1",
    border: "#a9f4ff",
    glow: "rgba(57, 218, 255, 0.88)",
    fillAlpha: 0.19,
    auraIntensity: 1.42,
    orbitingEmbers: 13,
  },
  skin_thien_long_de_do: {
    fill: "#9a651f",
    border: "#ffe08a",
    glow: "rgba(255, 176, 52, 0.92)",
    fillAlpha: 0.2,
    auraIntensity: 1.52,
    orbitingEmbers: 15,
  },
};

export function territorySkinEffect(
  skinId: string | null | undefined,
): TerritorySkinEffect | null {
  return skinId ? TERRITORY_SKIN_EFFECTS[skinId] || null : null;
}
