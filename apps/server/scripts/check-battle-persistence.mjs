import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/http/app.ts", import.meta.url), "utf8");
const collections = readFileSync(
  new URL("../src/db/collections.ts", import.meta.url),
  "utf8",
);
const shared = readFileSync(
  new URL("../../../packages/shared/src/index.ts", import.meta.url),
  "utf8",
);
const normalizedApp = app.replace(/\s+/g, " ");

const requiredAppFragments = [
  "fromTerritoryId: battle.fromTerritoryId",
  "toTerritoryId: battle.toTerritoryId",
  "joinedMarchIds: battle.joinedMarchIds",
  "_id: `battle:${march._id}`",
  "$setOnInsert: battle",
  "$addToSet: { joinedMarchIds: march._id }",
  "if (joinedBattle.modifiedCount !== 1)",
  "battle: toPublicBattle(persistedBattle)",
  "battles: battles.map(toPublicBattle)",
  "function settlementKindForClaim",
  "const capturedSettlementKind = settlementKindForClaim(territory, connectionType)",
  "const settlementKind = settlementKindForClaim(territory, connectionType)",
  "const claimKindRepairs = claims.flatMap",
  "function isTerritoryRootClaim",
  "const disconnectedIds = disconnectedClaims.map",
  "rootTerritoryForNewClaim(",
  'parsed.data.kind === "attack" ||',
  'parsed.data.kind !== "attack" &&',
  'const capturedDefenderCapital =',
  'normalizedClaimKind(defenderClaim) === "capital"',
  'territoryClaims.deleteMany({ playerId: battle.defenderId })',
  'onboardingState: "needs_claim"',
  '? "capital_captured"',
  "function nearestLandFrontierClaim",
  "function resolvePlayerAttackRoute",
  "const captureParentTerritoryId =",
  "parentTerritoryId: captureParentTerritoryId",
];

for (const fragment of requiredAppFragments) {
  if (!normalizedApp.includes(fragment.replace(/\s+/g, " "))) {
    throw new Error(`Battle persistence thiếu bảo đảm: ${fragment}`);
  }
}

if (!collections.includes("activeBattles.createIndex({ marchId: 1 }, { unique: true, sparse: true })")) {
  throw new Error("Active battle chưa có unique index theo marchId");
}

if ((app.match(/resolvePlayerAttackRoute\(/g) || []).length < 3) {
  throw new Error("Luật biên giới cấp vương quốc chưa áp dụng cho cả gợi ý nguồn và tạo hành quân");
}

for (const field of ["marchId?: string", "fromTerritoryId?: number", "toTerritoryId?: number"]) {
  if (!shared.includes(field)) throw new Error(`Shared ActiveBattle thiếu ${field}`);
}

if (app.includes('const capitalId = explicitCapital\n      ? explicitCapital.territoryId')) {
  throw new Error("World payload vẫn tự biến lãnh thổ đầu tiên thành Hoàng Thành");
}
if (app.includes('claim.settlementKind === "capital" || claim.settlementKind === "sub_capital"')) {
  throw new Error("Sub-capital cũ chưa được chuyển về Quân Khu hoặc trụ cờ");
}

console.log("Battle persistence contract: OK");
