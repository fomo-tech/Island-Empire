import "dotenv/config";
import bcrypt from "bcryptjs";
import type { ResourceBag } from "@island/shared";
import { closeDb } from "../db/client.js";
import { collections } from "../db/collections.js";

const username = process.env.SEED_TEST_USERNAME || "testfull";
const password = process.env.SEED_TEST_PASSWORD || "123123123";
const normalizedUsername = username.trim();
const playerId = `player:${normalizedUsername.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;

const fullResources: ResourceBag = {
  gold: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  wood: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  stone: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  food: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  iron: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  coal: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  sulfur: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
  gems: Number(process.env.SEED_TEST_RESOURCE_AMOUNT || 9999999),
};

async function main() {
  const { players, saves } = await collections();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);

  await players.updateOne(
    { _id: playerId },
    {
      $set: {
        name: normalizedUsername,
        passwordHash,
        role: "player",
        flagColor: "#2f70d7",
        emblem: "shield",
        starterLandId: "north-forest",
        onboardingState: "needs_claim",
        resources: fullResources,
        lastResourceCollectedAt: now,
        lastSeenAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  await saves.updateOne(
    { playerId },
    {
      $set: {
        resources: fullResources,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: `save:${playerId}`,
        playerId,
        towns: [],
        research: { sword: 0, stirrups: 0, cannon: 0, travel: 0 },
      },
    },
    { upsert: true },
  );

  console.log(`Seeded full-resource test player: ${normalizedUsername}`);
  console.log(`Player ID: ${playerId}`);
  console.log(`Password: ${password}`);
  console.log(`Resources each: ${fullResources.gold.toLocaleString("en-US")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
