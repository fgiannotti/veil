import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getBenchmark } from "@/server/benchmark";
import { BenchmarkQuery } from "@/lib/zod-schemas";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta } from "@/server/companies/domains";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Gate: must have at least one salary entry
  const [ownEntry] = await db
    .select({ id: salaryEntries.id })
    .from(salaryEntries)
    .where(eq(salaryEntries.profileId, session.profileId))
    .limit(1);

  if (!ownEntry) {
    return NextResponse.json(
      { error: "needs_salary_entry", message: "Cargá al menos un sueldo verificado para ver el benchmark." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const parsed = BenchmarkQuery.safeParse({
    role: url.searchParams.get("role"),
    seniority: url.searchParams.get("seniority"),
    companySizeBucket: url.searchParams.get("companySizeBucket") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Resolve bucket: explicit > user's company > none (all sizes)
  let bucket = parsed.data.companySizeBucket;
  if (bucket === "auto") {
    const domain = await getCurrentCompany(session.profileId);
    bucket = domain ? getCompanyMeta(domain).sizeBucket : undefined;
  }

  const result = await getBenchmark({
    role: parsed.data.role,
    seniority: parsed.data.seniority,
    companySizeBucket: bucket,
  });
  return NextResponse.json(result);
}
