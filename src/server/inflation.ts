import { desc, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { economicIndicators } from "@/server/db/schema/data";

export interface IndicatorRow {
  date: string;
  usdBlueBuy: number;
  usdBlueSell: number;
  ipcIndex: number;
}

/**
 * Returns the indicator row at-or-before the given date string ("YYYY-MM-DD").
 * Throws if no row exists.
 */
export async function indicatorAtOrBefore(date: string): Promise<IndicatorRow> {
  const [row] = await db
    .select()
    .from(economicIndicators)
    .where(lte(economicIndicators.date, date))
    .orderBy(desc(economicIndicators.date))
    .limit(1);
  if (!row) {
    throw new Error(`No economic indicator data available for ${date}`);
  }
  return {
    date: row.date,
    usdBlueBuy: row.usdBlueBuy,
    usdBlueSell: row.usdBlueSell,
    ipcIndex: row.ipcIndex,
  };
}

export async function latestIndicator(): Promise<IndicatorRow> {
  const [row] = await db
    .select()
    .from(economicIndicators)
    .orderBy(desc(economicIndicators.date))
    .limit(1);
  if (!row) throw new Error("No indicators in DB. Run migrations + indicators:refresh.");
  return {
    date: row.date,
    usdBlueBuy: row.usdBlueBuy,
    usdBlueSell: row.usdBlueSell,
    ipcIndex: row.ipcIndex,
  };
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
  usdValueAtPayment: number;
  realArsToday: number;
  usdValueToday: number;
  purchasingPowerChangePct: number;
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
  return {
    netArs,
    paymentMonth,
    todayMonth: todayIndicator.date,
    usdBlueAtPayment: paymentIndicator.usdBlueSell,
    usdValueAtPayment,
    realArsToday,
    usdValueToday,
    purchasingPowerChangePct,
  };
}
