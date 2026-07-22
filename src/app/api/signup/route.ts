import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema/auth";
import { clientIp, rateLimit, rateLimitedResponse } from "@/server/rate-limit";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const ipRl = rateLimit(`signup:${clientIp(req)}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!ipRl.ok) {
    const { body, init } = rateLimitedResponse(ipRl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const json = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    // Avoid email enumeration: same shape as success from the client's perspective
    // after they try to sign in. Still return 409 so the form can show a useful message.
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Si ya tenés una, iniciá sesión." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const profileId = randomUUID();

  await db.insert(users).values({
    email,
    name: parsed.data.name ?? null,
    passwordHash,
    profileId,
  });

  return NextResponse.json({ ok: true });
}
