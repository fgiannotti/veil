import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://veil:veil@localhost:5432/veil";

declare global {
  // eslint-disable-next-line no-var
  var __veilPool: Pool | undefined;
}

export const pool: Pool =
  global.__veilPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__veilPool = pool;
}

export const db = drizzle(pool);
