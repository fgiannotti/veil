import { eq } from "drizzle-orm";
import tier1 from "./tier1.json";
import { db } from "@/server/db/client";
import { companies } from "@/server/db/schema/data";

export type SizeBucket = "1-50" | "50-200" | "200-1000" | "1000-5000" | "5000+";

export const SIZE_BUCKETS: SizeBucket[] = [
  "1-50",
  "50-200",
  "200-1000",
  "1000-5000",
  "5000+",
];

export interface CompanyMeta {
  name: string;
  sizeBucket: SizeBucket;
}

const TIER1 = tier1 as Record<string, CompanyMeta>;

const BLOCKED_PERSONAL = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.com.ar",
  "hotmail.com",
  "hotmail.com.ar",
  "outlook.com",
  "live.com",
  "icloud.com",
  "protonmail.com",
  "proton.me",
  "fastmail.com",
  "aol.com",
  "msn.com",
]);

/** Normalize a company domain from user input (`globant.com`, `@globant.com`, URLs). */
export function normalizeCompanyDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^@/, "");
  try {
    if (s.includes("://")) {
      s = new URL(s).hostname;
    }
  } catch {
    // keep as-is
  }
  s = s.replace(/^www\./, "");
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

export function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase().trim();
}

export function isPersonalDomain(domain: string): boolean {
  return BLOCKED_PERSONAL.has(domain.toLowerCase());
}

async function dbCompany(domain: string): Promise<CompanyMeta | null> {
  try {
    const [row] = await db
      .select({
        name: companies.name,
        sizeBucket: companies.sizeBucket,
      })
      .from(companies)
      .where(eq(companies.domain, domain.toLowerCase()))
      .limit(1);
    if (!row) return null;
    return { name: row.name, sizeBucket: row.sizeBucket as SizeBucket };
  } catch {
    // Unit tests / offline — fall back to static seed only.
    return null;
  }
}

/** Known = static tier-1 seed ∪ admin-approved rows in `data.companies`. */
export async function isKnownDomain(domain: string): Promise<boolean> {
  const d = domain.toLowerCase();
  if (d in TIER1) return true;
  return Boolean(await dbCompany(d));
}

export async function getCompanyMeta(domain: string): Promise<CompanyMeta> {
  const d = domain.toLowerCase();
  const seeded = TIER1[d];
  if (seeded) return seeded;
  const fromDb = await dbCompany(d);
  if (fromDb) return fromDb;
  return { name: domain, sizeBucket: "1-50" };
}

export async function listKnownCompanies(): Promise<
  { domain: string; name: string; sizeBucket: SizeBucket }[]
> {
  const seeded = Object.entries(TIER1).map(([domain, meta]) => ({ domain, ...meta }));
  let rows: { domain: string; name: string; sizeBucket: string }[] = [];
  try {
    rows = await db
      .select({
        domain: companies.domain,
        name: companies.name,
        sizeBucket: companies.sizeBucket,
      })
      .from(companies);
  } catch {
    // Unit tests / offline — static seed only.
  }

  const byDomain = new Map<string, { domain: string; name: string; sizeBucket: SizeBucket }>();
  for (const c of seeded) byDomain.set(c.domain, c);
  for (const r of rows) {
    byDomain.set(r.domain, {
      domain: r.domain,
      name: r.name,
      sizeBucket: r.sizeBucket as SizeBucket,
    });
  }
  return [...byDomain.values()];
}

/**
 * Resolve user input (company name or email domain) to a company domain.
 * Returns null when the input cannot be matched unambiguously.
 */
export async function resolveCompanyQuery(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asDomain = normalizeCompanyDomain(trimmed);
  if (asDomain.startsWith("_")) return null;

  if (asDomain.includes(".")) {
    if (await isKnownDomain(asDomain)) return asDomain;
    return asDomain;
  }

  const lower = trimmed.toLowerCase();
  const all = await listKnownCompanies();

  const byName = all.filter((c) => c.name.toLowerCase() === lower);
  if (byName.length === 1) return byName[0]!.domain;
  if (byName.length > 1) return null;

  const byDomainPrefix = all.filter(
    (c) => c.domain === asDomain || c.domain.startsWith(`${asDomain}.`),
  );
  if (byDomainPrefix.length === 1) return byDomainPrefix[0]!.domain;

  return null;
}

/** Resolve input to a known company domain + size bucket, or null if unknown. */
export async function resolveKnownCompany(
  input: string,
): Promise<{ domain: string; name: string; sizeBucket: SizeBucket } | null> {
  const domain = await resolveCompanyQuery(input);
  if (!domain) return null;
  if (!(await isKnownDomain(domain))) return null;
  const meta = await getCompanyMeta(domain);
  return { domain, ...meta };
}
