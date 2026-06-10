import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { resolveKnownCompany } from "../src/server/companies/domains";
import { db, pool } from "../src/server/db/client";
import { salaryEntries } from "../src/server/db/schema/data";

interface Row {
  role: string;
  seniority: string;
  /** Aggregated range — creates 3 entries (low/mid/high). */
  low?: number;
  mid?: number;
  high?: number;
  /** Single anecdotal entry (e.g. hand-reported salary). */
  netArs?: number;
  paymentMonth?: string;
  note?: string;
}

interface SeedFile {
  notes: string;
  paymentMonth: string;
  sentinelProfileId: string;
  companies: Record<string, Row[]>;
}

async function main() {
  const data: SeedFile = JSON.parse(
    readFileSync(join(process.cwd(), "scripts/sysarmy-seed-data.json"), "utf8"),
  );

  await db
    .delete(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, data.sentinelProfileId),
        eq(salaryEntries.source, "seed:sysarmy"),
      ),
    );

  let inserted = 0;
  let skippedCompanies = 0;
  let skippedRows = 0;

  for (const [companyKey, rows] of Object.entries(data.companies)) {
    const company = resolveKnownCompany(companyKey);
    if (!company) {
      console.warn(`Skipping unknown company group: ${companyKey} (${rows.length} row(s))`);
      skippedCompanies++;
      skippedRows += rows.length;
      continue;
    }

    for (const r of rows) {
      const amounts =
        r.netArs != null
          ? [r.netArs]
          : [r.low, r.mid, r.high].filter((n): n is number => n != null);
      if (amounts.length === 0) {
        throw new Error(`Row missing netArs or low/mid/high: ${JSON.stringify({ company: companyKey, ...r })}`);
      }

      for (const amount of amounts) {
        await db.insert(salaryEntries).values({
          profileId: data.sentinelProfileId,
          role: r.role,
          seniority: r.seniority,
          companyDomain: company.domain,
          companySizeBucket: company.sizeBucket,
          netArs: amount,
          paymentMonth: r.paymentMonth ?? data.paymentMonth,
          source: "seed:sysarmy",
        });
        inserted++;
      }
    }
  }

  console.log(
    `Inserted ${inserted} seeded entries (${skippedCompanies} unknown company group(s), ${skippedRows} row(s) skipped).`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
