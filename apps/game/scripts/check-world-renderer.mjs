import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/game/engine.ts", import.meta.url), "utf8");

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
const castles = section("function drawCastle(t)", "function drawShip(s, i)");

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
]);

console.log("World renderer atlas-only: OK");
