import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const source = read("src/game/engine.ts");
const vegetation = read("src/game/engineVegetation.ts");
const architecture = read("src/game/kingdomArchitecture.ts");
const onboarding = read("src/components/KingdomCreationModal.tsx");
const shop = read("src/components/ShopModal.tsx");
const townManagement = read("src/components/TownManagementModal.tsx");
const gameApp = read("src/components/GameApp.tsx");

for (const asset of [
  "public/assets/kingdoms/nations/japan.webp",
  "public/assets/kingdoms/nations/china.webp",
  "public/assets/kingdoms/nations/vietnam.webp",
  "public/assets/kingdoms/nations/rome.webp",
  "public/assets/kingdoms/nations/persia.webp",
  "public/assets/kingdoms/nations/gothic.webp",
  "public/assets/kingdoms/kingdom_premium.webp",
  "public/assets/world/territory_vegetation_atlas.webp",
  "public/assets/kingdoms/nation_flags_atlas.webp",
]) {
  if (!existsSync(new URL(asset, root))) {
    throw new Error(`Missing renderer asset: ${asset}`);
  }
}

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Missing current renderer section: ${startMarker}`);
  }
  return source.slice(start, end);
}

const terrain = section(
  "function drawRegionTerrain(",
  "function drawDecoration(",
);
const castles = section(
  "function drawTerritoryCastle(",
  "function drawClaimedTerritoryMarkers(",
);
const voyages = section(
  "function drawVoyages(",
  "function drawSettlerForRegion(",
);
const settlers = section(
  "function drawSettlerForRegion(",
  "function drawTerritoryCastle(",
);

if (
  !source.includes("getTerritoryVegetationAtlas") ||
  !vegetation.includes("drawTerritoryVegetationSprite") ||
  !terrain.includes("drawNaturalTerritoryVegetation(")
) {
  throw new Error("Territory rendering is not wired to the vegetation atlas");
}
if (
  !castles.includes("drawKingdomBuildingSprite(") ||
  !castles.includes("territoryBuildingAnchor(") ||
  !castles.includes("const preferredSize")
) {
  throw new Error(
    "Claimed territory rendering is not wired to kingdom buildings",
  );
}
if (
  !source.includes("function drawClaimedTerritoryMarkers(") ||
  !source.includes("function getNewbieShieldRemainingMs()")
) {
  throw new Error("World marker runtime helpers are missing");
}
if (
  !voyages.includes("displayProgress") ||
  !voyages.includes("usesShip") ||
  !voyages.includes("drawMedievalWorldSprite(")
) {
  throw new Error(
    "Voyage rendering is not driven by server progress and atlas sprites",
  );
}
if (
  !settlers.includes("state.activeClearingTimings") ||
  !settlers.includes("drawKingdomBuildingSprite(")
) {
  throw new Error("Settler rendering is not driven by clearing state");
}
if (onboarding.includes("getCastleSprite") || onboarding.includes("<canvas")) {
  throw new Error("Onboarding still uses the removed legacy castle renderer");
}
if (shop.includes("<CastleSkinArt")) {
  throw new Error("Shop still uses the removed legacy castle preview");
}
if (
  !architecture.includes("/kingdoms/nations/") ||
  !architecture.includes("kingdom_premium.webp") ||
  !architecture.includes("KINGDOM_PREMIUM_SPRITE_CELL = 512")
) {
  throw new Error(
    "Kingdom architecture is not using the canonical sprite atlas",
  );
}
if (
  townManagement.includes("<svg") ||
  townManagement.includes("EuropeanUnitArt")
) {
  throw new Error("Town management still uses legacy SVG/unit art");
}
if (
  !townManagement.includes("SPECIALTY_META[specialty]") ||
  !townManagement.includes("town-specialty-image") ||
  !townManagement.includes("specialtyMeta.countKey")
) {
  throw new Error("Town management is missing specialty sprite metadata");
}
if (
  !gameApp.includes("const selectedServerSource = marchSourceOptions?.find(") ||
  !gameApp.includes("selectedServerSource?.territoryId ??")
) {
  throw new Error("Attack flow is not using the server-confirmed march source");
}
if (
  !source.includes("displayProgress") ||
  !source.includes("targetProgress") ||
  !source.includes("usesShip: crossingSea")
) {
  throw new Error("Voyage state is missing server progress or ship state");
}

console.log("World renderer current architecture: OK");
