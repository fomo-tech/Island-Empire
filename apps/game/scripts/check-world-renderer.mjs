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
  "../public/assets/kingdoms/nations/japan.webp",
  "../public/assets/kingdoms/nations/china.webp",
  "../public/assets/kingdoms/nations/vietnam.webp",
  "../public/assets/kingdoms/nations/rome.webp",
  "../public/assets/kingdoms/nations/persia.webp",
  "../public/assets/kingdoms/nations/gothic.webp",
  "../public/assets/kingdoms/kingdom_premium.webp",
  "../public/assets/units/medieval/medieval_builder.webp",
  "../public/assets/units/medieval/medieval_infantry.webp",
  "../public/assets/units/medieval/medieval_cavalry.webp",
  "../public/assets/units/medieval/medieval_artillery.webp",
  "../public/assets/units/medieval/medieval_ship.webp",
  "../public/assets/units/medieval/medieval_infantry_8dir.webp",
  "../public/assets/units/medieval/medieval_cavalry_8dir.webp",
  "../public/assets/units/medieval/medieval_artillery_8dir.webp",
  "../public/assets/units/medieval/medieval_builder_8dir.webp",
  "../public/assets/units/medieval/medieval_ship_8dir.webp",
  "../public/assets/world/territory_vegetation_atlas.webp",
  "../public/assets/kingdoms/nation_flags_atlas.webp",
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
const settlers = section(
  "function drawSettlerForRegion(",
  "function getNewbieShieldRemainingMs(",
);

if (!source.includes("TERRITORY_VEGETATION_SPRITES")
  || !terrain.includes("drawNaturalTerritoryVegetation(")) {
  throw new Error("Bản đồ lãnh thổ chưa dùng atlas cây và bụi riêng");
}
if (source.includes("drawTerritoryResources(visibleRegions, visibleIslets)")) {
  throw new Error("Bản đồ vẫn còn pass icon tài nguyên rải trên lãnh thổ");
}

rejectCalls("Bản đồ thành trì", castles, [
  "drawEmpireCastleSprite(",
  "drawMilitaryDistrictSprite(",
  "drawCastleSilhouette(",
  "drawMedievalCastleBanner(",
  "getCachedPremiumCastleSprite(",
  "getCachedMiniCastleSprite(",
  "drawMedievalCastleSprite(",
  "drawAllianceBadge(",
  "getRegionAllianceRelation(",
]);

if (!castles.includes("drawKingdomBuildingSprite(")) {
  throw new Error("Thành trì chưa dùng asset vuông có pivot");
}
if (!castles.includes("? 270") || !castles.includes("? 170") || !castles.includes(": 105")) {
  throw new Error("Kích thước Hoàng Thành, Quân Khu và trụ cờ chưa được chuẩn hóa");
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
if (!architecture.includes("/kingdoms/nations/") || !architecture.includes("kingdom_premium.webp")) {
  throw new Error("Kiến trúc chưa dùng sprite atlas chuẩn");
}
if (!architecture.includes("KINGDOM_PREMIUM_SPRITE_CELL = 512")) {
  throw new Error("Skin premium chưa dùng đúng grid 512px");
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
if (!source.includes("medievalInfantrySheet")
  || !source.includes("? infantryColumn")) {
  throw new Error("Bộ binh chưa dùng atlas animation riêng");
}
if (!source.includes("medievalCavalrySheet")
  || !source.includes("cavalryWalkColumns[gait]")) {
  throw new Error("Kỵ binh chưa dùng atlas animation riêng");
}
if (!source.includes("medievalArtillerySheet")
  || !source.includes("artilleryWalkColumns[gait]")) {
  throw new Error("Pháo binh chưa dùng atlas animation riêng");
}
for (const directionalSheet of [
  "medievalInfantry8DirSheet",
  "medievalCavalry8DirSheet",
  "medievalArtillery8DirSheet",
  "medievalBuilder8DirSheet",
  "medievalShip8DirSheet",
]) {
  if (!source.includes(directionalSheet)) {
    throw new Error(`Thiếu atlas đa hướng: ${directionalSheet}`);
  }
}
if (!source.includes("stableMarchDirection")
  || !source.includes("directionSpriteCell")
  || !source.includes("Math.PI / 8 + 0.14")) {
  throw new Error("Renderer chưa chọn 8 hướng theo tiếp tuyến có hysteresis");
}
if (!voyageShip.includes("medievalShipSheet") || voyageShip.includes("fillRect(")) {
  throw new Error("Thuyền hành quân chưa dùng sprite atlas sạch");
}
if (source.includes("medievalArmySheet")) {
  throw new Error("Renderer vẫn còn phụ thuộc atlas quân đội cũ");
}
if (!source.includes("displayProgress") || !source.includes("targetProgress")) {
  throw new Error("Hành quân chưa nội suy tiến trình server");
}
if (!source.includes("drawActiveBattleConnections")
  || !source.includes("battle.fromTerritoryId")
  || !source.includes('type: "battle_source"')) {
  throw new Error("Reload giao tranh chưa giữ đường quân và hai vùng đang giao chiến");
}
if (!architecture.includes("NATION_FLAG_SHEET")
  || !architecture.includes('buildingType === "flag"')
  || !source.includes('? "district"\n          : "flag"')) {
  throw new Error("Vùng mở rộng chưa dùng atlas trụ cờ Nation riêng");
}
if (!source.includes('drawVoyageShip(\n            shipPoint.x')
  || !source.includes("travelled <= sourceLandLength + seaLength")) {
  throw new Error("Đoạn hành quân trên biển chưa khóa renderer về sprite thuyền");
}
if (!source.includes("function voyageUsesShip")
  || !source.includes("if (voyageUsesShip(v))")
  || !source.includes("usesShip: crossingSea")) {
  throw new Error("Hành quân chưa chuẩn hóa cờ usesShip từ server");
}
if (!source.includes("easedRouteProgress")
  || !source.includes("routeMovementState")
  || !source.includes("distanceTravelled / strideLength")) {
  throw new Error("Hành quân chưa dùng state và animation theo quãng đường");
}
if (!source.includes("medievalBuilderSheet") || source.includes("builder_idle.png")) {
  throw new Error("Công binh chưa dùng WebP sprite atlas");
}
if (!settlers.includes("allowLegacyBuilderFallback = false")) {
  throw new Error("Công binh vẫn có thể rơi về renderer pixel cũ");
}
if (!settlers.includes("now < arrivesMs")
  || !settlers.includes("x = r.x;")
  || !settlers.includes("y = r.y;")) {
  throw new Error("Công binh chưa đứng đúng tâm lãnh thổ sau thời điểm đến nơi");
}
if (!settlers.includes("builderMotionPhase")
  || !settlers.includes("constructionStage")
  || !settlers.includes("drawKingdomBuildingSprite(")) {
  throw new Error("Công binh chưa có nhịp theo quãng đường và tiến độ xây nhiều giai đoạn");
}
for (const frame of [
  '"walk"',
  '"hammer_up"',
  '"hammer_down"',
  '"complete"',
]) {
  if (!settlers.includes(frame)) {
    throw new Error(`Công binh chưa tích hợp trạng thái ${frame}`);
  }
}

console.log("World renderer atlas-only: OK");
