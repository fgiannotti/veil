import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { domainRequests } from "@/server/db/schema/data";
import { isAdmin } from "@/server/admin";

export async function GET() {
  const session = await auth();
  if (!session?.profileId || !(await isAdmin(session.profileId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: domainRequests.id,
      domain: domainRequests.domain,
      requestedAt: domainRequests.requestedAt,
      status: domainRequests.status,
    })
    .from(domainRequests)
    .where(eq(domainRequests.status, "pending"))
    .orderBy(asc(domainRequests.requestedAt));

  return NextResponse.json({ requests: rows });
}
