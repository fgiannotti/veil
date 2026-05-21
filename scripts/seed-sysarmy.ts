import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/server/db/client";
import { salaryEntries } from "../src/server/db/schema/data";

interface Row {
  role: string;
  seniority: string;
  companyDomain: string;
  companySizeBucket: string;
  low: number;
  mid: number;
  high: number;
}

interface SeedFile {
  notes: string;
  paymentMonth: string;
  sentinelProfileId: string;
  rows: Row[];
}

async function main() {
  const data: SeedFile = JSON.parse(
    readFileSync(join(process.cwd(), "scripts/sysarmy-seed-data.json"), "utf8"),
  );

  // Wipe prior seeded entries so re-runs are idempotent.
  await db
    .delete(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, data.sentinelProfileId),
        eq(salaryEntries.source, "seed:sysarmy"),
      ),
    );

  let inserted = 0;
  for (const r of data.rows) {
    for (const amount of [r.low, r.mid, r.high]) {
      await db.insert(salaryEntries).values({
        profileId: data.sentinelProfileId,
        role: r.role,
        seniority: r.seniority,
        companyDomain: r.companyDomain,
        companySizeBucket: r.companySizeBucket,
        netArs: amount,
        paymentMonth: data.paymentMonth,
        source: "seed:sysarmy",
      });
      inserted++;
    }
  }

  console.log(`Inserted ${inserted} seeded entries across ${data.rows.length} cohorts.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
