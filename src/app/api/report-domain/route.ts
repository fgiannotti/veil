import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { domainRequests } from "@/server/db/schema/data";
import { extractDomain, isPersonalDomain } from "@/server/companies/domains";
import { rateLimit, rateLimitedResponse } from "@/server/rate-limit";

const Body = z.object({ workEmail: z.string().email() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = rateLimit(`report-domain:${session.profileId}`, {
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!rl.ok) {
    const { body, init } = rateLimitedResponse(rl.retryAfterSec);
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

  const domain = extractDomain(parsed.data.workEmail);
  if (!domain || isPersonalDomain(domain)) {
    return NextResponse.json(
      { error: "invalid_domain", message: "Dominio inválido" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: domainRequests.id })
    .from(domainRequests)
    .where(eq(domainRequests.domain, domain))
    .limit(1);

  if (!existing) {
    await db.insert(domainRequests).values({ domain });
  }

  return NextResponse.json({ ok: true });
}
