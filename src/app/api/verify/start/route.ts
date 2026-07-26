import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { startVerification, VerificationError } from "@/server/verification";
import { clientIp, rateLimit, rateLimitedResponse } from "@/server/rate-limit";

const Body = z.object({ workEmail: z.string().email() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const profileRl = rateLimit(`verify-start:${session.profileId}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!profileRl.ok) {
    const { body, init } = rateLimitedResponse(profileRl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const ipRl = rateLimit(`verify-start-ip:${clientIp(req)}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipRl.ok) {
    const { body, init } = rateLimitedResponse(ipRl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_email", message: "Email inválido" },
      { status: 400 },
    );
  }

  try {
    await startVerification(session.profileId, parsed.data.workEmail);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof VerificationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error("verify/start failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
