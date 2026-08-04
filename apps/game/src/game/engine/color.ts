const darkerColorCache = new Map<string, string>();
const lighterColorCache = new Map<string, string>();

function scaleHexColor(hex: string, factor: number, fallback: string) {
  if (!hex || typeof hex !== "string") return fallback;
  const clean = hex.replace("#", "");
  const fullHex =
    clean.length === 3
      ? clean
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : clean;
  const channels = [
    parseInt(fullHex.slice(0, 2), 16) || 0,
    parseInt(fullHex.slice(2, 4), 16) || 0,
    parseInt(fullHex.slice(4, 6), 16) || 0,
  ].map((channel) =>
    Math.max(0, Math.min(255, Math.floor(channel * factor))),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getDarkerColor(hex: string, factor = 0.6) {
  if (!hex || typeof hex !== "string") return "#1e3a8a";
  const cacheKey = `${hex}:${factor}`;
  const cached = darkerColorCache.get(cacheKey);
  if (cached) return cached;
  const result = scaleHexColor(hex, factor, "#1e3a8a");
  darkerColorCache.set(cacheKey, result);
  return result;
}

export function getLighterColor(hex: string, factor = 1.3) {
  if (!hex || typeof hex !== "string") return "#60a5fa";
  const cacheKey = `${hex}:${factor}`;
  const cached = lighterColorCache.get(cacheKey);
  if (cached) return cached;
  const result = scaleHexColor(hex, factor, "#60a5fa");
  lighterColorCache.set(cacheKey, result);
  return result;
}
