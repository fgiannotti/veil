import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { economicIndicators } from "@/server/db/schema/data";
import { fetchUsdBlue } from "@/server/indicators/usdBlue";
import { getSeed } from "@/server/indicators/ipc";
import { firstOfMonth } from "@/lib/dates";

/**
 * Refresh strategy:
 *   1) Upsert the full seed (gives full IPC + USD Blue history for back-tests).
 *   2) Upsert today's USD Blue (overwrites the current-month row's blue rates
 *      with the latest live observation, keeping the seeded IPC index).
 */
export async function refreshIndicators(): Promise<{
  seededRows: number;
  liveDate: string;
}> {
  const seed = getSeed();

  for (const r of seed) {
    await db
      .insert(economicIndicators)
      .values({
        date: r.date,
        usdBlueBuy: r.usdBlueBuy,
        usdBlueSell: r.usdBlueSell,
        ipcIndex: r.ipcIndex,
        source: "seed",
      })
      .onConflictDoUpdate({
        target: economicIndicators.date,
        set: {
          usdBlueBuy: r.usdBlueBuy,
          usdBlueSell: r.usdBlueSell,
          ipcIndex: r.ipcIndex,
          source: sql`CASE WHEN ${economicIndicators.source} = 'live' THEN ${economicIndicators.source} ELSE 'seed' END`,
          updatedAt: sql`now()`,
        },
      });
  }

  let liveDate = "";
  try {
    const quote = await fetchUsdBlue();
    const today = firstOfMonth(new Date());
    liveDate = today;

    const [existing] = await db
      .select()
      .from(economicIndicators)
      .where(sql`${economicIndicators.date} = ${today}`)
      .limit(1);

    const ipcIndex = existing?.ipcIndex ?? seed[seed.length - 1].ipcIndex;

    await db
      .insert(economicIndicators)
      .values({
        date: today,
        usdBlueBuy: quote.buy,
        usdBlueSell: quote.sell,
        ipcIndex,
        source: "live",
      })
      .onConflictDoUpdate({
        target: economicIndicators.date,
        set: {
          usdBlueBuy: quote.buy,
          usdBlueSell: quote.sell,
          source: "live",
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    console.warn("Live USD Blue fetch failed; seeded data still applied.", err);
  }

  return { seededRows: seed.length, liveDate };
}
