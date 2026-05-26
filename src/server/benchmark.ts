import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import {
  indicatorAtOrBefore,
  latestIndicator,
  toRealARS,
  type IndicatorRow,
} from "@/server/inflation";

export const K_ANONYMITY_THRESHOLD = 3;

export interface BenchmarkInput {
  role: string;
  seniority: string;
  companySizeBucket: string;
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
  todayMonth?: string;
  avg?: number;
  p25?: number;
  p50?: number;
  p95?: number;
}

/**
 * Pure: given raw entries and the indicators needed to deflate each into
 * "today's ARS", returns the benchmark with k-anonymity applied.
 *
 * `indicatorFor(paymentMonth)` must return the indicator at-or-before that month.
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
      count: entries.length,
      threshold,
      cohort,
    };
  }

  const realToday = entries
    .map((e) => toRealARS(e.netArs, indicatorFor(e.paymentMonth), today))
    .sort((a, b) => a - b);

  const avg = realToday.reduce((s, x) => s + x, 0) / realToday.length;
  return {
    status: "ok",
    count: realToday.length,
    threshold,
    cohort,
    todayMonth: today.date,
    avg,
    p25: percentile(realToday, 0.25),
    p50: percentile(realToday, 0.5),
    p95: percentile(realToday, 0.95),
  };
}

/**
 * Linear-interpolated percentile. Input MUST be sorted ascending.
 */
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

export async function getBenchmark(input: BenchmarkInput): Promise<BenchmarkResult> {
  const rows = await db
    .select({ netArs: salaryEntries.netArs, paymentMonth: salaryEntries.paymentMonth })
    .from(salaryEntries)
    .where(
      and(
        eq(salaryEntries.role, input.role),
        eq(salaryEntries.seniority, input.seniority),
        eq(salaryEntries.companySizeBucket, input.companySizeBucket),
      ),
    );

  if (rows.length < K_ANONYMITY_THRESHOLD) {
    return {
      status: "insufficient_data",
      count: rows.length,
      threshold: K_ANONYMITY_THRESHOLD,
      cohort: input,
    };
  }

  const today = await latestIndicator();

  // Fetch each unique payment month's indicator once.
  const uniqueMonths = Array.from(new Set(rows.map((r) => r.paymentMonth)));
  const indicatorMap = new Map<string, IndicatorRow>();
  for (const m of uniqueMonths) {
    indicatorMap.set(m, await indicatorAtOrBefore(m));
  }

  return buildBenchmark(
    input,
    rows.map((r) => ({ netArs: Number(r.netArs), paymentMonth: r.paymentMonth })),
    today,
    (m) => {
      const i = indicatorMap.get(m);
      if (!i) throw new Error(`Missing indicator for ${m}`);
      return i;
    },
  );
}
