import { and, eq, SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import {
  indicatorAtOrBefore,
  latestIndicator,
  toRealARS,
  toUSDBlue,
  type IndicatorRow,
} from "@/server/inflation";
import { getCompanyMeta } from "@/server/companies/domains";
import { slugifyTag } from "@/lib/benefit-tags";

export const K_ANONYMITY_THRESHOLD = 3;

export interface BenchmarkInput {
  role: string;
  seniority?: string;
  companySizeBucket?: string;
  companyDomain?: string;
}

interface RawEntry {
  netArs: number;
  paymentMonth: string;
}

export interface BenchmarkResult {
  status: "ok" | "insufficient_data";
  count: number;
  threshold: number;
  cohort: BenchmarkInput;
  /** Always net salary (sueldo neto), IPC-adjusted to todayMonth. */
  basis?: "net";
  todayMonth?: string;
  usdBlueSell?: number;
  avg?: number;
  p25?: number;
  p50?: number;
  p95?: number;
  avgUsd?: number;
  p25Usd?: number;
  p50Usd?: number;
  p95Usd?: number;
  comparison?: CompanyComparison;
  /** Top benefits reported for this company (company view only). */
  topBenefits?: { label: string; count: number }[];
}

export interface CompanyComparison {
  status: "ok" | "insufficient_data";
  threshold: number;
  companyName?: string;
  companyMedian?: number;
  companyMedianUsd?: number;
  marketMedian?: number;
  marketMedianUsd?: number;
  /** 1 = highest median among eligible companies */
  rank?: number;
  companiesCompared?: number;
  /** 0–100; higher means better paid vs other companies */
  percentile?: number;
  curve?: { salary: number; density: number }[];
  usdBlueSell?: number;
}

/**
 * Pure: given raw entries and the indicators needed to deflate each into
 * "today's ARS", returns the benchmark with k-anonymity applied.
 */
export function buildBenchmark(
  cohort: BenchmarkInput,
  entries: RawEntry[],
  today: IndicatorRow,
  indicatorFor: (paymentMonth: string) => IndicatorRow,
  threshold = K_ANONYMITY_THRESHOLD,
): BenchmarkResult {
  if (entries.length < threshold) {
    return {
      status: "insufficient_data",
      count: 0,
      threshold,
      cohort,
    };
  }

  const realToday = entries
    .map((e) => toRealARS(e.netArs, indicatorFor(e.paymentMonth), today))
    .sort((a, b) => a - b);

  const avg = realToday.reduce((s, x) => s + x, 0) / realToday.length;
  const p25 = percentile(realToday, 0.25);
  const p50 = percentile(realToday, 0.5);
  const p95 = percentile(realToday, 0.95);
  return {
    status: "ok",
    count: realToday.length,
    threshold,
    cohort,
    basis: "net",
    todayMonth: today.date,
    usdBlueSell: today.usdBlueSell,
    avg,
    p25,
    p50,
    p95,
    avgUsd: toUSDBlue(avg, today),
    p25Usd: toUSDBlue(p25, today),
    p50Usd: toUSDBlue(p50, today),
    p95Usd: toUSDBlue(p95, today),
  };
}

/** Linear-interpolated percentile. Input MUST be sorted ascending. */
export function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, x) => s + x, 0) / values.length;
}

export function stddev(values: number[], avg = mean(values)): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, x) => s + (x - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Normal PDF. */
export function gaussianPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x === mu ? 1 : 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Sample a bell curve around mean±3σ for charting. */
export function buildGaussianCurve(
  values: number[],
  points = 48,
): { salary: number; density: number }[] {
  if (values.length === 0) return [];
  const mu = mean(values);
  let sigma = stddev(values, mu);
  if (sigma <= 0) sigma = Math.max(mu * 0.08, 1);

  const min = mu - 3 * sigma;
  const max = mu + 3 * sigma;
  const step = (max - min) / (points - 1);
  const curve: { salary: number; density: number }[] = [];
  for (let i = 0; i < points; i++) {
    const salary = min + step * i;
    curve.push({ salary, density: gaussianPdf(salary, mu, sigma) });
  }
  return curve;
}

/**
 * Rank among company medians (descending: higher pay = better rank).
 * Percentile = share of companies this one beats or ties.
 */
export function rankCompanyMedian(
  companyMedians: number[],
  companyMedian: number,
): { rank: number; total: number; percentile: number; marketMedian: number } {
  const sortedDesc = [...companyMedians].sort((a, b) => b - a);
  const sortedAsc = [...companyMedians].sort((a, b) => a - b);
  const rank = sortedDesc.findIndex((v) => v === companyMedian) + 1 || sortedDesc.length;
  const beaten = companyMedians.filter((v) => v <= companyMedian).length;
  const percentile = Math.round((beaten / companyMedians.length) * 100);
  return {
    rank,
    total: companyMedians.length,
    percentile,
    marketMedian: percentile_from_unsorted(sortedAsc, 0.5),
  };
}

function percentile_from_unsorted(sortedAsc: number[], q: number): number {
  return percentile(sortedAsc, q);
}

export function buildCompanyComparison(
  companyMediansByDomain: Map<string, number>,
  focusDomain: string,
  companyName?: string,
  usdBlueSell?: number,
  threshold = K_ANONYMITY_THRESHOLD,
): CompanyComparison {
  const eligible = [...companyMediansByDomain.entries()];
  if (eligible.length < threshold) {
    return { status: "insufficient_data", threshold };
  }

  const toUsd = (ars: number) =>
    usdBlueSell && usdBlueSell > 0 ? ars / usdBlueSell : undefined;

  const medians = eligible.map(([, m]) => m);
  const companyMedian = companyMediansByDomain.get(focusDomain);
  const curve = buildGaussianCurve(medians);

  if (companyMedian == null) {
    const marketMedian = percentile([...medians].sort((a, b) => a - b), 0.5);
    return {
      status: "ok",
      threshold,
      marketMedian,
      marketMedianUsd: toUsd(marketMedian),
      companiesCompared: medians.length,
      curve,
      usdBlueSell,
    };
  }

  const { rank, total, percentile: pct, marketMedian } = rankCompanyMedian(medians, companyMedian);
  return {
    status: "ok",
    threshold,
    companyName,
    companyMedian,
    companyMedianUsd: toUsd(companyMedian),
    marketMedian,
    marketMedianUsd: toUsd(marketMedian),
    rank,
    companiesCompared: total,
    percentile: pct,
    curve,
    usdBlueSell,
  };
}

async function loadIndicatorMap(months: string[]): Promise<{
  today: IndicatorRow;
  indicatorFor: (m: string) => IndicatorRow;
}> {
  const today = await latestIndicator();
  const uniqueMonths = Array.from(new Set(months));
  const indicatorMap = new Map<string, IndicatorRow>();
  for (const m of uniqueMonths) {
    indicatorMap.set(m, await indicatorAtOrBefore(m));
  }
  return {
    today,
    indicatorFor: (m) => {
      const i = indicatorMap.get(m);
      if (!i) throw new Error(`Missing indicator for ${m}`);
      return i;
    },
  };
}

function baseConditions(input: BenchmarkInput): SQL[] {
  const conditions: SQL[] = [
    eq(salaryEntries.role, input.role),
    eq(salaryEntries.status, "published"),
  ];
  if (input.seniority) {
    conditions.push(eq(salaryEntries.seniority, input.seniority));
  }
  return conditions;
}

/** Aggregate tag frequency; returns top N by count (ties keep first-seen label). */
export function rankTopBenefits(
  tagLists: (string[] | null | undefined)[],
  limit = 5,
): { label: string; count: number }[] {
  const bySlug = new Map<string, { label: string; count: number }>();
  for (const tags of tagLists) {
    if (!tags?.length) continue;
    const seenInEntry = new Set<string>();
    for (const raw of tags) {
      const slug = slugifyTag(raw);
      if (!slug || seenInEntry.has(slug)) continue;
      seenInEntry.add(slug);
      const prev = bySlug.get(slug);
      if (prev) prev.count += 1;
      else bySlug.set(slug, { label: raw.trim(), count: 1 });
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

async function getTopCompanyBenefits(input: BenchmarkInput): Promise<{ label: string; count: number }[]> {
  if (!input.companyDomain) return [];
  const conditions = [
    ...baseConditions(input),
    eq(salaryEntries.companyDomain, input.companyDomain),
  ];
  const rows = await db
    .select({ tags: salaryEntries.tags })
    .from(salaryEntries)
    .where(and(...conditions));
  return rankTopBenefits(
    rows.map((r) => r.tags),
    5,
  );
}

export async function getBenchmark(input: BenchmarkInput): Promise<BenchmarkResult> {
  const conditions = baseConditions(input);
  if (input.companyDomain) {
    conditions.push(eq(salaryEntries.companyDomain, input.companyDomain));
  } else if (input.companySizeBucket) {
    conditions.push(eq(salaryEntries.companySizeBucket, input.companySizeBucket));
  }

  const rows = await db
    .select({ netArs: salaryEntries.netArs, paymentMonth: salaryEntries.paymentMonth })
    .from(salaryEntries)
    .where(and(...conditions));

  if (rows.length < K_ANONYMITY_THRESHOLD) {
    const result: BenchmarkResult = {
      status: "insufficient_data",
      count: 0,
      threshold: K_ANONYMITY_THRESHOLD,
      cohort: input,
    };
    if (input.companyDomain) {
      result.comparison = await getCompanyMarketComparison(input);
      result.topBenefits = await getTopCompanyBenefits(input);
    }
    return result;
  }

  const { today, indicatorFor } = await loadIndicatorMap(rows.map((r) => r.paymentMonth));
  const result = buildBenchmark(
    input,
    rows.map((r) => ({ netArs: Number(r.netArs), paymentMonth: r.paymentMonth })),
    today,
    indicatorFor,
  );

  if (input.companyDomain) {
    result.comparison = await getCompanyMarketComparison(input);
    result.topBenefits = await getTopCompanyBenefits(input);
  }
  return result;
}

async function getCompanyMarketComparison(input: BenchmarkInput): Promise<CompanyComparison> {
  if (!input.companyDomain) {
    return { status: "insufficient_data", threshold: K_ANONYMITY_THRESHOLD };
  }

  const conditions = baseConditions(input);
  const rows = await db
    .select({
      companyDomain: salaryEntries.companyDomain,
      netArs: salaryEntries.netArs,
      paymentMonth: salaryEntries.paymentMonth,
    })
    .from(salaryEntries)
    .where(and(...conditions));

  if (rows.length === 0) {
    return { status: "insufficient_data", threshold: K_ANONYMITY_THRESHOLD };
  }

  const { today, indicatorFor } = await loadIndicatorMap(rows.map((r) => r.paymentMonth));

  const byCompany = new Map<string, number[]>();
  for (const r of rows) {
    const real = toRealARS(Number(r.netArs), indicatorFor(r.paymentMonth), today);
    const list = byCompany.get(r.companyDomain) ?? [];
    list.push(real);
    byCompany.set(r.companyDomain, list);
  }

  const medians = new Map<string, number>();
  for (const [domain, values] of byCompany) {
    if (values.length < K_ANONYMITY_THRESHOLD) continue;
    const sorted = [...values].sort((a, b) => a - b);
    medians.set(domain, percentile(sorted, 0.5));
  }

  return buildCompanyComparison(
    medians,
    input.companyDomain,
    getCompanyMeta(input.companyDomain).name,
    today.usdBlueSell,
  );
}
