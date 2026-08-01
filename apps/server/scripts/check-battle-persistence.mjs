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
];

for (const fragment of requiredAppFragments) {
  if (!app.includes(fragment)) {
    throw new Error(`Battle persistence thiếu bảo đảm: ${fragment}`);
  }
}

if (!collections.includes("activeBattles.createIndex({ marchId: 1 }, { unique: true, sparse: true })")) {
  throw new Error("Active battle chưa có unique index theo marchId");
}

for (const field of ["marchId?: string", "fromTerritoryId?: number", "toTerritoryId?: number"]) {
  if (!shared.includes(field)) throw new Error(`Shared ActiveBattle thiếu ${field}`);
}

console.log("Battle persistence contract: OK");
