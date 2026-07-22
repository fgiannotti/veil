import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/server/env";

const { databaseUrl, isProd } = getEnv();

declare global {
  // eslint-disable-next-line no-var
  var __veilPool: Pool | undefined;
}

// Prefer `?sslmode=require` (or equivalent) on DATABASE_URL for managed Postgres.
export const pool: Pool =
  global.__veilPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
  });

if (!isProd) {
  global.__veilPool = pool;
}

export const db = drizzle(pool);
