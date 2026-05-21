import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: ["./src/server/db/schema/auth.ts", "./src/server/db/schema/data.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://veil:veil@localhost:5432/veil",
  },
  schemaFilter: ["auth", "data"],
  verbose: true,
} satisfies Config;
