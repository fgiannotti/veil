import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { startVerification, VerificationError } from "@/server/verification";

const Body = z.object({ workEmail: z.string().email() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await startVerification(session.profileId, parsed.data.workEmail);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof VerificationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
