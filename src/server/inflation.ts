import { asc, desc, gte, lte } from "drizzle-orm";
import { todayFirstOfMonth } from "@/lib/dates";
import { db } from "@/server/db/client";
import { economicIndicators } from "@/server/db/schema/data";

/** True when both dates are first-of-month strings in the same YYYY-MM. */
export function sameCalendarMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export interface IndicatorRow {
  date: string;
  usdBlueBuy: number;
  usdBlueSell: number;
  ipcIndex: number;
}

function toIndicatorRow(row: {
  date: string;
  usdBlueBuy: number;
  usdBlueSell: number;
  ipcIndex: number;
}): IndicatorRow {
  return {
    date: row.date,
    usdBlueBuy: row.usdBlueBuy,
    usdBlueSell: row.usdBlueSell,
    ipcIndex: row.ipcIndex,
  };
}

/**
 * Picks the indicator for a payment month. Prefers at-or-before; may use a later row
 * in the same calendar month only (e.g. 2026-03-01 → 2026-03-06).
 */
export function resolveIndicatorForDate(
  date: string,
  atOrBefore: IndicatorRow | undefined,
  sameMonthAfter: IndicatorRow | undefined,
): IndicatorRow {
  if (atOrBefore) return atOrBefore;
  if (sameMonthAfter && sameCalendarMonth(date, sameMonthAfter.date)) {
    return sameMonthAfter;
  }
  throw new Error(`No economic indicator data available for ${date}`);
}

/**
 * Returns the indicator row at-or-before the given date string ("YYYY-MM-DD").
 * If none exists, may use a later row in the same month only (not a future month).
 * Throws if the indicators table has no usable row for that date.
 */
export async function indicatorAtOrBefore(date: string): Promise<IndicatorRow> {
  const [before] = await db
    .select()
    .from(economicIndicators)
    .where(lte(economicIndicators.date, date))
    .orderBy(desc(economicIndicators.date))
    .limit(1);

  if (before) return toIndicatorRow(before);

  const [after] = await db
    .select()
    .from(economicIndicators)
    .where(gte(economicIndicators.date, date))
    .orderBy(asc(economicIndicators.date))
    .limit(1);

  const sameMonthAfter =
    after && sameCalendarMonth(date, after.date) ? toIndicatorRow(after) : undefined;

  return resolveIndicatorForDate(date, undefined, sameMonthAfter);
}

/**
 * Indicator for adjusting salaries to "today" — the latest row on or before the
 * current calendar month, not merely the newest row in the DB.
 */
export async function latestIndicator(): Promise<IndicatorRow> {
  const target = todayFirstOfMonth();
  try {
    return await indicatorAtOrBefore(target);
  } catch {
    const [row] = await db
      .select()
      .from(economicIndicators)
      .orderBy(desc(economicIndicators.date))
      .limit(1);
    if (!row) throw new Error("No indicators in DB. Run migrations + indicators:refresh.");
    return toIndicatorRow(row);
  }
}

/**
 * Convert ARS amount paid on `paymentDate` into USD using the USD Blue
 * SELL rate at-or-before that date.
 */
export function toUSDBlue(arsAmount: number, indicator: IndicatorRow): number {
  if (indicator.usdBlueSell <= 0) return 0;
  return arsAmount / indicator.usdBlueSell;
}

/**
 * Inflate `arsAmount` from `from` to `to` using IPC index ratio.
 * If `to` is more recent than `from`, the result reflects the equivalent
 * purchasing power in the target month.
 */
export function toRealARS(
  arsAmount: number,
  from: IndicatorRow,
  to: IndicatorRow,
): number {
  if (from.ipcIndex <= 0) return 0;
  return (arsAmount * to.ipcIndex) / from.ipcIndex;
}

/**
 * Compute the "real wage" of a historical salary expressed in today's pesos
 * and today's USD Blue. Useful for the calculator and dashboard.
 */
export interface RealWageBreakdown {
  netArs: number;
  paymentMonth: string;
  todayMonth: string;
  usdBlueAtPayment: number;
  usdBlueToday: number;
  usdValueAtPayment: number;
  realArsToday: number;
  usdValueToday: number;
  /** Change in USD value of the same ARS salary (not the ARS/USD quote change). */
  purchasingPowerChangePct: number;
  ipcDataStale: boolean;
}

export function computeRealWage(
  netArs: number,
  paymentMonth: string,
  paymentIndicator: IndicatorRow,
  todayIndicator: IndicatorRow,
): RealWageBreakdown {
  const usdValueAtPayment = toUSDBlue(netArs, paymentIndicator);
  const realArsToday = toRealARS(netArs, paymentIndicator, todayIndicator);
  const usdValueToday = toUSDBlue(netArs, todayIndicator);
  const purchasingPowerChangePct =
    usdValueAtPayment > 0
      ? ((usdValueToday - usdValueAtPayment) / usdValueAtPayment) * 100
      : 0;
  const ipcDataStale =
    paymentIndicator.ipcIndex === todayIndicator.ipcIndex &&
    !sameCalendarMonth(paymentIndicator.date, todayIndicator.date);

  return {
    netArs,
    paymentMonth,
    todayMonth: todayIndicator.date,
    usdBlueAtPayment: paymentIndicator.usdBlueSell,
    usdBlueToday: todayIndicator.usdBlueSell,
    usdValueAtPayment,
    realArsToday,
    usdValueToday,
    purchasingPowerChangePct,
    ipcDataStale,
  };
}
