import { NextResponse } from "next/server";
import { refreshIndicators } from "@/server/indicators/refresh";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.INDICATORS_REFRESH_TOKEN || token !== process.env.INDICATORS_REFRESH_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshIndicators();
  return NextResponse.json({ ok: true, ...result });
}
