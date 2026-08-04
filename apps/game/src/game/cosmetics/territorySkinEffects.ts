export type TerritorySkinEffect = {
  fill: string;
  border: string;
  glow: string;
  fillAlpha: number;
};

const TERRITORY_SKIN_EFFECTS: Record<string, TerritorySkinEffect> = {
  skin_long_bao_thanh: {
    fill: "#d3aa45",
    border: "#ffe08a",
    glow: "rgba(255, 206, 84, 0.7)",
    fillAlpha: 0.16,
  },
  skin_hoa_long_dien: {
    fill: "#a33c28",
    border: "#ff8a47",
    glow: "rgba(255, 82, 35, 0.72)",
    fillAlpha: 0.15,
  },
  skin_bang_vuong: {
    fill: "#54a7c4",
    border: "#b8f3ff",
    glow: "rgba(92, 220, 255, 0.72)",
    fillAlpha: 0.15,
  },
  skin_phong_long_cac: {
    fill: "#6f9eb0",
    border: "#f3dda0",
    glow: "rgba(169, 224, 242, 0.68)",
    fillAlpha: 0.14,
  },
  skin_hac_nguyet: {
    fill: "#665080",
    border: "#c59aff",
    glow: "rgba(164, 105, 255, 0.72)",
    fillAlpha: 0.16,
  },
};

export function territorySkinEffect(
  skinId: string | null | undefined,
): TerritorySkinEffect | null {
  return skinId ? TERRITORY_SKIN_EFFECTS[skinId] || null : null;
}
