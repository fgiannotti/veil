import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getBenchmark } from "@/server/benchmark";
import { BenchmarkQuery } from "@/lib/zod-schemas";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta, isKnownDomain } from "@/server/companies/domains";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [ownEntry] = await db
    .select({ id: salaryEntries.id })
    .from(salaryEntries)
    .where(
      and(
        eq(salaryEntries.profileId, session.profileId),
        eq(salaryEntries.status, "published"),
      ),
    )
    .limit(1);

  if (!ownEntry) {
    return NextResponse.json(
      {
        error: "needs_salary_entry",
        message: "Cargá al menos un sueldo verificado para ver el benchmark.",
      },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const seniorityParam = url.searchParams.get("seniority");
  const parsed = BenchmarkQuery.safeParse({
    role: url.searchParams.get("role"),
    seniority:
      seniorityParam && seniorityParam !== "all" ? seniorityParam : undefined,
    companySizeBucket: url.searchParams.get("companySizeBucket") ?? undefined,
    companyDomain: url.searchParams.get("companyDomain") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Datos inválidos" },
      { status: 400 },
    );
  }

  let companyDomain = parsed.data.companyDomain;
  if (companyDomain && !isKnownDomain(companyDomain)) {
    return NextResponse.json(
      { error: "unknown_company", message: "Empresa desconocida" },
      { status: 400 },
    );
  }

  let bucket = parsed.data.companySizeBucket;
  if (!companyDomain && bucket === "auto") {
    const domain = await getCurrentCompany(session.profileId);
    bucket = domain ? getCompanyMeta(domain).sizeBucket : undefined;
  }

  const result = await getBenchmark({
    role: parsed.data.role,
    seniority: parsed.data.seniority,
    companySizeBucket: companyDomain ? undefined : bucket === "auto" ? undefined : bucket,
    companyDomain,
  });
  return NextResponse.json(result);
}
