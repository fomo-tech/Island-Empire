import { collections } from "../db/collections.js";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    const colls = await collections();
    console.log("Connected. Collections stats:");
    for (const [name, coll] of Object.entries(colls)) {
      const start = Date.now();
      const count = await coll.countDocuments();
      const duration = Date.now() - start;
      console.log(`- ${name}: ${count} documents (${duration}ms)`);
    }
  } catch (err) {
    console.error("Error connecting or querying:", err);
  } finally {
    process.exit(0);
  }
}

main();
