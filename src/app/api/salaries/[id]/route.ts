import { NextResponse } from "next/server";
import { and, count, eq, gt, ne } from "drizzle-orm";
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

type Ctx = { params: Promise<{ id: string }> };

async function ownedEntry(profileId: string, id: string) {
  const [row] = await db
    .select()
    .from(salaryEntries)
    .where(and(eq(salaryEntries.id, id), eq(salaryEntries.profileId, profileId)))
    .limit(1);
  return row ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const row = await ownedEntry(session.profileId, id);
  if (!row) {
    return NextResponse.json({ error: "not_found", message: "Entrada no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    entry: {
      id: row.id,
      role: row.role,
      seniority: row.seniority,
      companyDomain: row.companyDomain,
      netArs: row.netArs,
      paymentMonth: row.paymentMonth,
      tags: row.tags,
      status: row.status,
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  const existing = await ownedEntry(session.profileId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found", message: "Entrada no encontrada" }, { status: 404 });
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
        ne(salaryEntries.id, id),
      ),
    );

  if (countForMonth >= 1) {
    return NextResponse.json(
      { error: "duplicate_entry", message: "Ya cargaste un sueldo para ese mes." },
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
      { error: "salary_too_low", message: `Para ${seniorityLabel}, el monto es muy bajo.` },
      { status: 400 },
    );
  }
  if (netArs > limits.max) {
    return NextResponse.json(
      { error: "salary_too_high", message: `Para ${seniorityLabel}, el monto es muy alto.` },
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
        ne(salaryEntries.id, id),
        gt(salaryEntries.paymentMonth, parsed.data.paymentMonth),
        gt(salaryEntries.netArs, netArs),
      ),
    )
    .limit(1);

  const status = laterHigherEntries.length > 0 ? "pending" : "published";
  const meta = await getCompanyMeta(domain);
  const normalized = normalizeTagList(parsed.data.tags ?? []);

  await db
    .update(salaryEntries)
    .set({
      role: parsed.data.role,
      seniority: parsed.data.seniority,
      companyDomain: domain,
      companySizeBucket: meta.sizeBucket,
      netArs,
      paymentMonth: parsed.data.paymentMonth,
      tags: normalized.map((t) => t.label),
      status,
    })
    .where(and(eq(salaryEntries.id, id), eq(salaryEntries.profileId, session.profileId)));

  if (normalized.length > 0) {
    await upsertBenefitTags(normalized);
  }

  return NextResponse.json({ ok: true, pending: status === "pending" });
}

export async function DELETE(req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  const existing = await ownedEntry(session.profileId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found", message: "Entrada no encontrada" }, { status: 404 });
  }

  await db
    .delete(salaryEntries)
    .where(and(eq(salaryEntries.id, id), eq(salaryEntries.profileId, session.profileId)));

  return NextResponse.json({ ok: true });
}
