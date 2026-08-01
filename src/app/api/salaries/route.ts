import { NextResponse } from "next/server";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta } from "@/server/companies/domains";
import { SalaryEntryInput } from "@/lib/zod-schemas";
import { SALARY_LIMITS } from "@/lib/salary-limits";
import { formatSeniority } from "@/lib/seniority";
import { clientIp, rateLimit, rateLimitedResponse } from "@/server/rate-limit";
import { normalizeTagList } from "@/lib/benefit-tags";
import { upsertBenefitTags } from "@/server/tags";
import { resolveNetArs } from "@/server/salaries/resolve-net-ars";

const MAX_ENTRIES_PER_MONTH = 1;

export async function GET() {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
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
      tags: salaryEntries.tags,
      status: salaryEntries.status,
      createdAt: salaryEntries.createdAt,
    })
    .from(salaryEntries)
    .where(eq(salaryEntries.profileId, session.profileId))
    .orderBy(desc(salaryEntries.paymentMonth));

  const hasPublishedEntry = rows.some((r) => r.status === "published");
  const hasPendingEntry = rows.some((r) => r.status === "pending");
  const companyDomain = await getCurrentCompany(session.profileId);

  return NextResponse.json({
    entries: rows,
    hasPublishedEntry,
    hasPendingEntry,
    verified: Boolean(companyDomain),
    companyDomain,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = rateLimit(`salaries:${session.profileId}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    const { body, init } = rateLimitedResponse(rl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const ipRl = rateLimit(`salaries-ip:${clientIp(req)}`, { limit: 40, windowMs: 60 * 60 * 1000 });
  if (!ipRl.ok) {
    const { body, init } = rateLimitedResponse(ipRl.retryAfterSec);
    return NextResponse.json(body, init);
  }

  const json = await req.json().catch(() => null);
  const parsed = SalaryEntryInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Datos inválidos", details: parsed.error.flatten() },
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
      {
        error: "duplicate_entry",
        message: "Ya cargaste un sueldo para ese mes.",
      },
      { status: 409 },
    );
  }

  let netArs: number;
  try {
    ({ netArs } = await resolveNetArs(
      parsed.data.currency,
      parsed.data.amount,
      parsed.data.paymentMonth,
    ));
  } catch {
    return NextResponse.json(
      { error: "no_indicators", message: "Indicadores económicos no disponibles" },
      { status: 503 },
    );
  }

  const limits = SALARY_LIMITS[parsed.data.seniority];
  const seniorityLabel = formatSeniority(parsed.data.seniority);

  if (netArs < limits.min) {
    return NextResponse.json(
      {
        error: "salary_too_low",
        message: `Para ${seniorityLabel}, el monto es muy bajo.`,
      },
      { status: 400 },
    );
  }
  if (netArs > limits.max) {
    return NextResponse.json(
      {
        error: "salary_too_high",
        message: `Para ${seniorityLabel}, el monto es muy alto.`,
      },
      { status: 400 },
    );
  }

  const laterHigherEntries = await db
    .select({ id: salaryEntries.id })
    .from(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, session.profileId),
        eq(salaryEntries.status, "published"),
        gt(salaryEntries.paymentMonth, parsed.data.paymentMonth),
        gt(salaryEntries.netArs, netArs),
      ),
    )
    .limit(1);

  const status = laterHigherEntries.length > 0 ? "pending" : "published";
  const meta = await getCompanyMeta(domain);
  const normalized = normalizeTagList(parsed.data.tags ?? []);

  await db.insert(salaryEntries).values({
    profileId: session.profileId,
    role: parsed.data.role,
    seniority: parsed.data.seniority,
    companyDomain: domain,
    companySizeBucket: meta.sizeBucket,
    netArs,
    paymentMonth: parsed.data.paymentMonth,
    tags: normalized.map((t) => t.label),
    source: "user",
    status,
  });

  if (normalized.length > 0) {
    await upsertBenefitTags(normalized);
  }

  return NextResponse.json({ ok: true, pending: status === "pending" });
}
