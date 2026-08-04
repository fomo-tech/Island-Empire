import { MongoClient, type Db } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(config.MONGO_URI, {
      maxPoolSize: 12,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 4000,
    });
    await client.connect();
  }
  return client.db();
}

export async function closeDb() {
  await client?.close();
  client = null;
}
