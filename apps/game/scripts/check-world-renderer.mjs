import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/game/engine.ts", import.meta.url), "utf8");
const onboarding = readFileSync(
  new URL("../src/components/KingdomCreationModal.tsx", import.meta.url),
  "utf8",
);
const shop = readFileSync(
  new URL("../src/components/ShopModal.tsx", import.meta.url),
  "utf8",
);

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Không tìm thấy renderer: ${startMarker}`);
  return source.slice(start, end);
}

function rejectCalls(label, body, calls) {
  const found = calls.filter((call) => body.includes(call));
  if (found.length) {
    throw new Error(`${label} còn gọi renderer cũ: ${found.join(", ")}`);
  }
}

const terrain = section(
  "function drawRegionTerrain(",
  "function drawPaintedForestCluster(",
);
const castles = section(
  "function drawTerritoryCastle(",
  "function drawClaimedTerritoryMarkers(",
);

rejectCalls("Bản đồ môi trường", terrain, [
  "drawResourceIcon(",
  "drawTree(",
  "drawOakTree(",
  "drawRockPile(",
  "drawMountain(",
  "drawFarmPatch(",
  "drawRuins(",
  "drawBerryBush(",
]);

rejectCalls("Bản đồ thành trì", castles, [
  "drawEmpireCastleSprite(",
  "drawMilitaryDistrictSprite(",
  "getCachedPremiumCastleSprite(",
  "getCachedMiniCastleSprite(",
  "drawMedievalCastleSprite(",
  "drawAllianceBadge(",
  "getRegionAllianceRelation(",
]);

if (!castles.includes("drawKingdomBuildingSprite(")) {
  throw new Error("Thành trì chưa dùng asset vuông có pivot");
}
if (!castles.includes("const x = r.x;") || !castles.includes("const y = r.y;")) {
  throw new Error("Thành trì chưa được căn giữa lãnh thổ");
}
if (onboarding.includes("getCastleSprite") || onboarding.includes("<canvas")) {
  throw new Error("Màn tân thủ còn dùng renderer Canvas 3D cũ");
}
if (shop.includes("<CastleSkinArt")) {
  throw new Error("Cửa hàng còn dùng preview SVG 3D cũ");
}

console.log("World renderer atlas-only: OK");
