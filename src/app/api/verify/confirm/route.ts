import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { confirmVerification, VerificationError } from "@/server/verification";
import { rateLimit, rateLimitedResponse } from "@/server/rate-limit";

const Body = z.object({
  workEmail: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = rateLimit(`verify-confirm:${session.profileId}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    const { body, init } = rateLimitedResponse(rl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Código o email inválido" },
      { status: 400 },
    );
  }

  try {
    const { domain } = await confirmVerification(
      session.profileId,
      parsed.data.workEmail,
      parsed.data.code,
    );
    return NextResponse.json({ ok: true, domain });
  } catch (err) {
    if (err instanceof VerificationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error("verify/confirm failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
