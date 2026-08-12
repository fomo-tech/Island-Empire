import { config } from "./config.js";
import { closeDb } from "./db/client.js";
import { ensureIndexes, repairLegacyMarchTerritoryIds } from "./db/collections.js";
import { createApp } from "./http/app.js";
import { attachRealtime } from "./realtime/socket.js";

async function main() {
  await ensureIndexes();
  await repairLegacyMarchTerritoryIds();
  const app = createApp();
  const server = app.listen(config.PORT, config.HOST, () => {
    console.log(`API listening on http://${config.HOST}:${config.PORT}`);
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  attachRealtime(server);

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
