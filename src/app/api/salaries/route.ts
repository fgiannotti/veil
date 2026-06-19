import { NextResponse } from "next/server";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta } from "@/server/companies/domains";
import { SalaryEntryInput } from "@/lib/zod-schemas";
import { SALARY_LIMITS } from "@/lib/salary-limits";

const MAX_ENTRIES_PER_MONTH = 2;

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
      { error: "needs_verification", message: "Primero verificá tu email laboral" },
      { status: 403 },
    );
  }

  // Max 2 entries per month
  const [{ value: countForMonth }] = await db
    .select({ value: count() })
    .from(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, session.profileId),
        eq(salaryEntries.paymentMonth, parsed.data.paymentMonth),
      ),
    );

  if (countForMonth >= MAX_ENTRIES_PER_MONTH) {
    return NextResponse.json(
      { error: "duplicate_entry", message: `Ya cargaste ${MAX_ENTRIES_PER_MONTH} sueldos para ese mes.` },
      { status: 409 },
    );
  }

  // Salary limits per seniority
  const limits = SALARY_LIMITS[parsed.data.seniority];
  if (parsed.data.netArs < limits.min) {
    return NextResponse.json(
      { error: "salary_out_of_range", message: "Ese monto está por debajo de los valores esperados para esta posición." },
      { status: 400 },
    );
  }
  if (parsed.data.netArs > limits.max) {
    return NextResponse.json(
      { error: "salary_out_of_range", message: "Ese monto está por encima de los valores esperados para esta posición." },
      { status: 400 },
    );
  }

  // Temporal consistency check: if there's any published entry from a later month
  // with a higher amount, the new entry looks suspicious → pending review.
  const laterHigherEntries = await db
    .select({ id: salaryEntries.id })
    .from(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, session.profileId),
        eq(salaryEntries.status, "published"),
        gt(salaryEntries.paymentMonth, parsed.data.paymentMonth),
        gt(salaryEntries.netArs, parsed.data.netArs),
      ),
    )
    .limit(1);

  const status = laterHigherEntries.length > 0 ? "pending" : "published";

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
    status,
  });

  return NextResponse.json({ ok: true, pending: status === "pending" });
}
