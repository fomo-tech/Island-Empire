import { config } from "./config.js";
import { closeDb } from "./db/client.js";
import { ensureIndexes } from "./db/collections.js";
import { createApp } from "./http/app.js";

async function main() {
  await ensureIndexes();
  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`API listening on http://127.0.0.1:${config.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
