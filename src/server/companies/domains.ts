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

export function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase().trim();
}

export function isPersonalDomain(domain: string): boolean {
  return BLOCKED_PERSONAL.has(domain.toLowerCase());
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
