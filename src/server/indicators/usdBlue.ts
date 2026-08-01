/**
 * Live USD Blue adapter. Defaults to Bluelytics
 * (aggregates Dolarito/Ambito; free + CORS-friendly).
 * Override latest quote with USD_BLUE_API_URL.
 */

export interface UsdBlueQuote {
  buy: number;
  sell: number;
  observedAt: string;
}

/** First-of-month blue observation (date = YYYY-MM-01). */
export interface UsdBlueMonthQuote {
  date: string;
  buy: number;
  sell: number;
}

interface BluelyticsResponse {
  blue: { value_buy: number; value_sell: number };
  last_update: string;
}

interface BluelyticsEvolutionPoint {
  date: string;
  source: string;
  value_sell: number;
  value_buy: number;
}

const DEFAULT_LATEST = "https://api.bluelytics.com.ar/v2/latest";
const DEFAULT_EVOLUTION = "https://api.bluelytics.com.ar/v2/evolution.json";

export async function fetchUsdBlue(): Promise<UsdBlueQuote> {
  const url = process.env.USD_BLUE_API_URL ?? DEFAULT_LATEST;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`USD Blue fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as BluelyticsResponse;
  if (!json?.blue?.value_buy || !json?.blue?.value_sell) {
    throw new Error("Unexpected USD Blue response shape");
  }
  return {
    buy: json.blue.value_buy,
    sell: json.blue.value_sell,
    observedAt: json.last_update ?? new Date().toISOString(),
  };
}

/**
 * Monthly USD Blue from Bluelytics evolution (~1 obs near the 1st of each month).
 * Used to overwrite invented seed blues for recent months.
 */
export async function fetchUsdBlueMonthlyHistory(
  days = 400,
): Promise<UsdBlueMonthQuote[]> {
  const res = await fetch(`${DEFAULT_EVOLUTION}?days=${days}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`USD Blue history fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as BluelyticsEvolutionPoint[];
  if (!Array.isArray(json)) {
    throw new Error("Unexpected USD Blue evolution shape");
  }

  const byMonth = new Map<string, BluelyticsEvolutionPoint[]>();
  for (const point of json) {
    if (point.source !== "Blue") continue;
    if (!point.date || !(point.value_sell > 0) || !(point.value_buy > 0)) continue;
    const month = point.date.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(point);
    byMonth.set(month, list);
  }

  const months: UsdBlueMonthQuote[] = [];
  for (const [month, points] of byMonth) {
    // Prefer the observation closest to the 1st (stable month anchor).
    const sorted = points.slice().sort((a, b) => a.date.localeCompare(b.date));
    const anchor = sorted[0]!;
    months.push({
      date: `${month}-01`,
      buy: anchor.value_buy,
      sell: anchor.value_sell,
    });
  }

  return months.sort((a, b) => a.date.localeCompare(b.date));
}
