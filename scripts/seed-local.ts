/**
 * Local demo seed — synthetic salaries so benchmarks / company curves work offline.
 *
 * Usage:
 *   npm run db:migrate
 *   npm run indicators:refresh
 *   npm run seed:local
 *
 * Idempotent: deletes prior `source = seed:local` rows, then re-inserts.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { type Role } from "../src/lib/roles";
import { type Seniority } from "../src/lib/seniority";
import { SUGGESTED_BENEFIT_TAGS, slugifyTag } from "../src/lib/benefit-tags";
import { getCompanyMeta } from "../src/server/companies/domains";
import { db, pool } from "../src/server/db/client";
import { benefitTags, salaryEntries } from "../src/server/db/schema/data";

const SOURCE = "seed:local";
const SENTINEL_PROFILE = "00000000-0000-4000-8000-00000000bbbb";

/** Pay multipliers vs a baseline (higher = better paying company in the demo). */
const COMPANIES: { domain: string; factor: number }[] = [
  { domain: "mercadolibre.com", factor: 1.25 },
  { domain: "auth0.com", factor: 1.2 },
  { domain: "globant.com", factor: 1.05 },
  { domain: "accenture.com", factor: 0.95 },
  { domain: "despegar.com", factor: 1.0 },
  { domain: "uala.com.ar", factor: 1.1 },
  { domain: "tiendanube.com", factor: 1.08 },
  { domain: "10pines.com", factor: 1.12 },
  { domain: "etermax.com", factor: 1.02 },
  { domain: "naranjax.com", factor: 0.98 },
];

const BASE_BY_SENIORITY: Record<Seniority, number> = {
  junior: 900_000,
  ssr: 1_700_000,
  senior: 2_900_000,
  staff: 4_200_000,
  principal: 5_500_000,
  lead: 4_500_000,
};

const ROLE_FACTOR: Partial<Record<Role, number>> = {
  backend: 1.06,
  frontend: 1.0,
  fullstack: 1.04,
  mobile: 1.03,
  devops: 1.08,
  data: 1.1,
  qa: 0.92,
  design: 0.95,
  product: 1.12,
  manager: 1.2,
};

const DEMO_ROLES: Role[] = ["backend", "frontend", "fullstack", "devops", "data"];
const DEMO_SENIORITIES: Seniority[] = ["junior", "ssr", "senior"];
const MONTHS = ["2025-11-01", "2026-01-01", "2026-03-01", "2026-05-01", "2026-07-01"];

function jitter(base: number, i: number, n: number): number {
  const t = n <= 1 ? 0.5 : i / (n - 1);
  const factor = 0.88 + t * 0.28; // ~±14% spread
  return Math.round(base * factor);
}

function pickTags(seed: number): string[] {
  const pool = [
    "Remoto",
    "Híbrido",
    "Presencial",
    "Sueldo en USD",
    "Contractor",
    "Relación de dependencia",
    "UPTO",
    "Prepaga",
    "Bono anual",
    "Horario flexible",
  ];
  const count = 1 + (seed % 3);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[(seed + i * 3) % pool.length]!);
  }
  return [...new Set(out)];
}

async function main() {
  await db.delete(salaryEntries).where(eq(salaryEntries.source, SOURCE));

  let inserted = 0;
  const tagUse = new Map<string, { label: string; count: number }>();

  for (const company of COMPANIES) {
    const meta = await getCompanyMeta(company.domain);

    for (const role of DEMO_ROLES) {
      for (const seniority of DEMO_SENIORITIES) {
        const base =
          BASE_BY_SENIORITY[seniority] *
          company.factor *
          (ROLE_FACTOR[role] ?? 1);

        // 4 entries per cohort → clears k-anonymity (3) for company + market views
        const n = 4;
        for (let i = 0; i < n; i++) {
          const tags = pickTags(inserted + i);
          const paymentMonth = MONTHS[(inserted + i) % MONTHS.length]!;
          await db.insert(salaryEntries).values({
            profileId: SENTINEL_PROFILE,
            role,
            seniority,
            companyDomain: company.domain,
            companySizeBucket: meta.sizeBucket,
            netArs: jitter(base, i, n),
            paymentMonth,
            tags,
            source: SOURCE,
            status: "published",
          });
          inserted++;
          for (const label of tags) {
            const slug = slugifyTag(label);
            const prev = tagUse.get(slug);
            tagUse.set(slug, { label, count: (prev?.count ?? 0) + 1 });
          }
        }
      }
    }

    // Extra staff backend band so staff filters aren't empty
    const staffBase = BASE_BY_SENIORITY.staff * company.factor * (ROLE_FACTOR.backend ?? 1);
    for (let i = 0; i < 3; i++) {
      await db.insert(salaryEntries).values({
        profileId: SENTINEL_PROFILE,
        role: "backend",
        seniority: "staff",
        companyDomain: company.domain,
        companySizeBucket: meta.sizeBucket,
        netArs: jitter(staffBase, i, 3),
        paymentMonth: MONTHS[i % MONTHS.length]!,
        tags: ["Sueldo en USD", "Remoto"],
        source: SOURCE,
        status: "published",
      });
      inserted++;
    }
  }

  // Warm the dynamic tag catalog
  for (const label of SUGGESTED_BENEFIT_TAGS) {
    const slug = slugifyTag(label);
    if (!tagUse.has(slug)) tagUse.set(slug, { label, count: 0 });
  }
  for (const [slug, { label, count }] of tagUse) {
    await db
      .insert(benefitTags)
      .values({ slug, label, useCount: Math.max(count, 1) })
      .onConflictDoUpdate({
        target: benefitTags.slug,
        set: { useCount: Math.max(count, 1) },
      });
  }

  console.log(`seed:local — inserted ${inserted} salary entries across ${COMPANIES.length} companies`);
  console.log(`Roles: ${DEMO_ROLES.join(", ")}`);
  console.log(`Seniorities: ${DEMO_SENIORITIES.join(", ")}, staff (backend)`);
  console.log("Try: /benchmark (Backend + Senior) and /companies → Mercado Libre");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
