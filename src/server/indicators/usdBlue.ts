/**
 * Live USD Blue adapter. Defaults to https://api.bluelytics.com.ar/v2/latest
 * (Bluelytics aggregates Dolarito/Ambito and is free + CORS-friendly).
 * Override with USD_BLUE_API_URL.
 */

export interface UsdBlueQuote {
  buy: number;
  sell: number;
  observedAt: string;
}

interface BluelyticsResponse {
  blue: { value_buy: number; value_sell: number };
  last_update: string;
}

export async function fetchUsdBlue(): Promise<UsdBlueQuote> {
  const url = process.env.USD_BLUE_API_URL ?? "https://api.bluelytics.com.ar/v2/latest";
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
