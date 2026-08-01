import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { economicIndicators } from "@/server/db/schema/data";
import { fetchUsdBlue, fetchUsdBlueMonthlyHistory } from "@/server/indicators/usdBlue";
import { getSeed } from "@/server/indicators/ipc";
import { firstOfMonth } from "@/lib/dates";

/**
 * Refresh strategy:
 *   1) Upsert seed (IPC history + fallback blues for older months).
 *      On conflict, only refresh IPC — never clobber live/history blues.
 *   2) Overlay Bluelytics monthly evolution onto recent months' blue rates.
 *   3) Upsert today's live USD Blue (keeps IPC from seed / prior row).
 */
export async function refreshIndicators(): Promise<{
  seededRows: number;
  historyMonths: number;
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
          ipcIndex: r.ipcIndex,
          // Keep existing blues when the row was filled from live/history.
          usdBlueBuy: sql`CASE WHEN ${economicIndicators.source} IN ('live', 'history') THEN ${economicIndicators.usdBlueBuy} ELSE ${r.usdBlueBuy} END`,
          usdBlueSell: sql`CASE WHEN ${economicIndicators.source} IN ('live', 'history') THEN ${economicIndicators.usdBlueSell} ELSE ${r.usdBlueSell} END`,
          source: sql`CASE WHEN ${economicIndicators.source} IN ('live', 'history') THEN ${economicIndicators.source} ELSE 'seed' END`,
          updatedAt: sql`now()`,
        },
      });
  }

  let historyMonths = 0;
  try {
    const history = await fetchUsdBlueMonthlyHistory();
    for (const quote of history) {
      const [existing] = await db
        .select()
        .from(economicIndicators)
        .where(sql`${economicIndicators.date} = ${quote.date}`)
        .limit(1);

      const ipcIndex = existing?.ipcIndex ?? seed[seed.length - 1]?.ipcIndex;
      if (ipcIndex == null) continue;

      await db
        .insert(economicIndicators)
        .values({
          date: quote.date,
          usdBlueBuy: quote.buy,
          usdBlueSell: quote.sell,
          ipcIndex,
          source: "history",
        })
        .onConflictDoUpdate({
          target: economicIndicators.date,
          set: {
            usdBlueBuy: quote.buy,
            usdBlueSell: quote.sell,
            source: "history",
            updatedAt: sql`now()`,
          },
        });
      historyMonths += 1;
    }
  } catch (err) {
    console.warn("USD Blue history fetch failed; seed blues kept for older months.", err);
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
    console.warn("Live USD Blue fetch failed; seeded/history data still applied.", err);
  }

  return { seededRows: seed.length, historyMonths, liveDate };
}
