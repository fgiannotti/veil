import { NextResponse } from "next/server";
import { and, asc, gte, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { economicIndicators } from "@/server/db/schema/data";
import {
  computeRealWage,
  indicatorAtOrBefore,
  latestIndicator,
  toUSDBlue,
  type IndicatorRow,
} from "@/server/inflation";
import { CalculatorInput } from "@/lib/zod-schemas";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CalculatorInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Datos inválidos" },
      { status: 400 },
    );
  }
  const { netArs, paymentMonth } = parsed.data;

  let paymentInd: IndicatorRow;
  let todayInd: IndicatorRow;
  try {
    paymentInd = await indicatorAtOrBefore(paymentMonth);
    todayInd = await latestIndicator();
  } catch {
    return NextResponse.json(
      { error: "no_indicators", message: "Indicadores económicos no disponibles." },
      { status: 503 },
    );
  }

  const breakdown = computeRealWage(netArs, paymentMonth, paymentInd, todayInd);

  const series = await db
    .select()
    .from(economicIndicators)
    .where(
      and(
        gte(economicIndicators.date, paymentMonth),
        lte(economicIndicators.date, todayInd.date),
      ),
    )
    .orderBy(asc(economicIndicators.date));

  const chart = series.map((r) => ({
    month: r.date,
    usdValue: toUSDBlue(netArs, {
      date: r.date,
      usdBlueBuy: r.usdBlueBuy,
      usdBlueSell: r.usdBlueSell,
      ipcIndex: r.ipcIndex,
    }),
  }));

  return NextResponse.json({ breakdown, chart });
}
