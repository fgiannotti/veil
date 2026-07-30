import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: ["./src/server/db/schema/auth.ts", "./src/server/db/schema/data.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://bench:bench@localhost:5432/bench",
  },
  schemaFilter: ["auth", "data"],
  verbose: true,
} satisfies Config;
