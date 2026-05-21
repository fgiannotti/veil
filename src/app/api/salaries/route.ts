import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta } from "@/server/companies/domains";
import { SalaryEntryInput } from "@/lib/zod-schemas";

export async function GET() {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(salaryEntries)
    .where(eq(salaryEntries.profileId, session.profileId))
    .orderBy(desc(salaryEntries.paymentMonth));

  return NextResponse.json({ entries: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = SalaryEntryInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const domain = await getCurrentCompany(session.profileId);
  if (!domain) {
    return NextResponse.json(
      { error: "needs_verification", message: "Verify your work email first" },
      { status: 403 },
    );
  }

  const meta = getCompanyMeta(domain);

  await db.insert(salaryEntries).values({
    profileId: session.profileId,
    role: parsed.data.role,
    seniority: parsed.data.seniority,
    companyDomain: domain,
    companySizeBucket: meta.sizeBucket,
    netArs: parsed.data.netArs,
    paymentMonth: parsed.data.paymentMonth,
    source: "user",
  });

  return NextResponse.json({ ok: true });
}
