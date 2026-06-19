import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { domainRequests } from "@/server/db/schema/data";
import { extractDomain, isPersonalDomain } from "@/server/companies/domains";

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

  const domain = extractDomain(parsed.data.workEmail);
  if (!domain || isPersonalDomain(domain)) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  await db.insert(domainRequests).values({ domain });

  return NextResponse.json({ ok: true });
}
