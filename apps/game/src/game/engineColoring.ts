// @ts-nocheck

export function createColorHelpers(deps: {
  state: any;
  factions: any[];
  derivedRegionOwnership: (regionId: number) => number;
}) {
  const { state, factions, derivedRegionOwnership } = deps;

  const darkerColorCache = new Map<string, string>();
  const lighterColorCache = new Map<string, string>();

  function getDarkerColor(hex: string, factor = 0.6): string {
    if (!hex || typeof hex !== "string") return "#2563eb";
    const cacheKey = `${hex}:${factor}`;
    const cached = darkerColorCache.get(cacheKey);
    if (cached) return cached;
    const clean = hex.replace("#", "");
    const fullHex =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    let r = parseInt(fullHex.slice(0, 2), 16) || 0;
    let g = parseInt(fullHex.slice(2, 4), 16) || 0;
    let b = parseInt(fullHex.slice(4, 6), 16) || 0;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const result = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    darkerColorCache.set(cacheKey, result);
    return result;
  }

  function getLighterColor(hex: string, factor = 1.3): string {
    if (!hex || typeof hex !== "string") return "#60a5fa";
    const cacheKey = `${hex}:${factor}`;
    const cached = lighterColorCache.get(cacheKey);
    if (cached) return cached;
    const clean = hex.replace("#", "");
    const fullHex =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    let r = parseInt(fullHex.slice(0, 2), 16) || 0;
    let g = parseInt(fullHex.slice(2, 4), 16) || 0;
    let b = parseInt(fullHex.slice(4, 6), 16) || 0;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const result = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    lighterColorCache.set(cacheKey, result);
    return result;
  }

  function getRegionFlagColor(regionId: number): string {
    if (regionId < 0) return state.newbieFlagColor || "#2563eb";
    const ownerCode = derivedRegionOwnership(regionId);
    if (ownerCode === 1) {
      return (
        state.newbieFlagColor ||
        state.regionOwnerFlagColors[regionId] ||
        "#2563eb"
      );
    }
    if (state.regionOwnerFlagColors[regionId]) {
      return state.regionOwnerFlagColors[regionId];
    }
    const timing = state.activeClearingTimings?.[regionId];
    if (timing?.ownerFlagColor) {
      return timing.ownerFlagColor;
    }
    if (timing?.playerId && timing.playerId === state.localPlayerId) {
      return state.newbieFlagColor || "#2563eb";
    }

    const isClearing =
      state.regionInProgress === regionId ||
      Boolean(state.activeClearingTimings?.[regionId]) ||
      (state.regionClearing[regionId] > 0 &&
        state.regionClearing[regionId] < 1) ||
      state.regionOwnerNames[regionId] === "ÄANG KHAI HOANG";

    const isLocalClearing =
      isClearing &&
      (state.regionInProgress === regionId ||
        state.regionOwnerIds[regionId] === state.localPlayerId ||
        state.activeClearingTimings?.[regionId]?.playerId ===
          state.localPlayerId);

    if (isLocalClearing) {
      return state.newbieFlagColor || "#2563eb";
    }
    if (isClearing) {
      return "#ef4444";
    }
    if (ownerCode > 1) {
      return factions[ownerCode]?.color || "#ef4444";
    }
    return state.newbieFlagColor || "#2563eb";
  }

  return {
    getDarkerColor,
    getLighterColor,
    getRegionFlagColor,
  };
}
