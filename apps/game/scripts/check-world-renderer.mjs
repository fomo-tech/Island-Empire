import { existsSync, readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/game/engine.ts", import.meta.url), "utf8");
const onboarding = readFileSync(
  new URL("../src/components/KingdomCreationModal.tsx", import.meta.url),
  "utf8",
);
const shop = readFileSync(
  new URL("../src/components/ShopModal.tsx", import.meta.url),
  "utf8",
);
const architecture = readFileSync(
  new URL("../src/game/kingdomArchitecture.ts", import.meta.url),
  "utf8",
);

for (const asset of [
  "../public/assets/kingdoms/kingdom_base.webp",
  "../public/assets/kingdoms/kingdom_premium.webp",
  "../public/assets/units/medieval/medieval_army.webp",
]) {
  if (!existsSync(new URL(asset, import.meta.url))) {
    throw new Error(`Thiếu sprite atlas: ${asset}`);
  }
}

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
const troops = section(
  "function renderTroopSprites",
  "function drawHarborDock(",
);
const voyageShip = section(
  "function drawVoyageShip(",
  "function renderTroopSprites",
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
if (!architecture.includes("kingdom_base.webp") || !architecture.includes("kingdom_premium.webp")) {
  throw new Error("Kiến trúc chưa dùng sprite atlas chuẩn");
}
rejectCalls("Quân hành quân", troops, [
  "drawLegacyPixelCavalry(",
  "drawLegacyPixelArtillery(",
  "drawPixelInfantry(",
]);
if (!troops.includes('drawMedievalUnitSprite("infantry"')
  || !troops.includes('drawMedievalUnitSprite("cavalry"')
  || !troops.includes('drawMedievalUnitSprite("artillery"')) {
  throw new Error("Quân hành quân chưa dùng đủ atlas bộ binh, kỵ binh và pháo binh");
}
if (!voyageShip.includes("medievalArmySheet") || voyageShip.includes("fillRect(")) {
  throw new Error("Thuyền hành quân chưa dùng sprite atlas sạch");
}

console.log("World renderer atlas-only: OK");
