import type { ResourceBag, TownSnapshot } from "@island/shared";
import { getDb } from "./client.js";

export type PlayerDocument = {
  _id: string;
  name: string;
  passwordHash?: string;
  role: "player" | "admin";
  createdAt: Date;
  lastSeenAt: Date;
};

export type SaveDocument = {
  _id: string;
  playerId: string;
  resources: ResourceBag;
  towns: TownSnapshot[];
  updatedAt: Date;
};

export async function collections() {
  const db = await getDb();
  return {
    players: db.collection<PlayerDocument>("players"),
    saves: db.collection<SaveDocument>("saves"),
  };
}

export async function ensureIndexes() {
  const { players, saves } = await collections();
  await Promise.all([
    players.createIndex({ name: 1 }, { unique: true }),
    players.createIndex({ lastSeenAt: -1 }),
    saves.createIndex({ playerId: 1 }, { unique: true }),
    saves.createIndex({ updatedAt: -1 }),
  ]);
}
