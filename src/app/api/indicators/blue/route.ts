import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { indicatorAtOrBefore } from "@/server/inflation";

const Query = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .transform((s) => `${s}-01`),
});

/** Blue sell rate for a payment month (YYYY-MM). Used by salary forms for USD→ARS preview. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = Query.safeParse({ month: url.searchParams.get("month") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Mes inválido" },
      { status: 400 },
    );
  }

  try {
    const row = await indicatorAtOrBefore(parsed.data.month);
    return NextResponse.json({
      date: row.date,
      sell: row.usdBlueSell,
      buy: row.usdBlueBuy,
    });
  } catch {
    return NextResponse.json(
      { error: "no_indicators", message: "Indicadores económicos no disponibles" },
      { status: 503 },
    );
  }
}
