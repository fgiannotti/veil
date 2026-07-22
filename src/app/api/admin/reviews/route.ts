import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { isAdmin } from "@/server/admin";

export async function GET() {
  const session = await auth();
  if (!session?.profileId || !(await isAdmin(session.profileId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: salaryEntries.id,
      role: salaryEntries.role,
      seniority: salaryEntries.seniority,
      companyDomain: salaryEntries.companyDomain,
      companySizeBucket: salaryEntries.companySizeBucket,
      netArs: salaryEntries.netArs,
      paymentMonth: salaryEntries.paymentMonth,
      status: salaryEntries.status,
      createdAt: salaryEntries.createdAt,
    })
    .from(salaryEntries)
    .where(eq(salaryEntries.status, "pending"))
    .orderBy(asc(salaryEntries.createdAt));

  return NextResponse.json({ entries: rows });
}
