import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshIndicators } from "@/server/indicators/refresh";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  const expected = getEnv().indicatorsRefreshToken;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !token || !tokensEqual(token, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshIndicators();
  return NextResponse.json({ ok: true, ...result });
}
