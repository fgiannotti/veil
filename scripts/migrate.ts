import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

function redactDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "[invalid-database-url]";
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://bench:bench@localhost:5432/bench";
  const pool = new Pool({ connectionString: url });

  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Applying ${files.length} migration(s) to ${redactDatabaseUrl(url)}`);

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`  -> ${file}`);
    await pool.query(sql);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
