import "dotenv/config";
import { refreshIndicators } from "../src/server/indicators/refresh";
import { pool } from "../src/server/db/client";

async function main() {
  const result = await refreshIndicators();
  console.log("Indicators refreshed:", result);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
