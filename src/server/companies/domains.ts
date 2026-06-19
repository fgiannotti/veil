import tier1 from "./tier1.json";

export type SizeBucket = "1-50" | "50-200" | "200-1000" | "1000-5000" | "5000+";

interface CompanyMeta {
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

export function isKnownDomain(domain: string): boolean {
  return domain.toLowerCase() in TIER1;
}

export function getCompanyMeta(domain: string): CompanyMeta {
  const meta = TIER1[domain.toLowerCase()];
  if (meta) return meta;
  return { name: domain, sizeBucket: inferSizeFromDomain(domain) };
}

/**
 * Without a known company we cannot know the headcount; default to a small
 * bucket so unknown companies don't pollute large-cohort benchmarks.
 */
function inferSizeFromDomain(_domain: string): SizeBucket {
  return "1-50";
}

export function listKnownCompanies(): { domain: string; name: string; sizeBucket: SizeBucket }[] {
  return Object.entries(TIER1).map(([domain, meta]) => ({ domain, ...meta }));
}

/**
 * Resolve user input (company name or email domain) to a company domain.
 * Returns null when the input cannot be matched unambiguously.
 */
export function resolveCompanyQuery(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asDomain = normalizeCompanyDomain(trimmed);
  if (asDomain.startsWith("_")) return null;

  if (asDomain.includes(".")) return asDomain;

  const lower = trimmed.toLowerCase();

  const byName = Object.entries(TIER1).filter(([, meta]) => meta.name.toLowerCase() === lower);
  if (byName.length === 1) return byName[0]![0];
  if (byName.length > 1) return null;

  const byDomainPrefix = Object.keys(TIER1).filter(
    (d) => d === asDomain || d.startsWith(`${asDomain}.`),
  );
  if (byDomainPrefix.length === 1) return byDomainPrefix[0]!;

  return null;
}

/** Resolve input to a tier-1 company domain + size bucket, or null if unknown. */
export function resolveKnownCompany(
  input: string,
): { domain: string; name: string; sizeBucket: SizeBucket } | null {
  const domain = resolveCompanyQuery(input);
  if (!domain) return null;
  const meta = TIER1[domain.toLowerCase()];
  if (!meta) return null;
  return { domain, ...meta };
}
