import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getBenchmark } from "@/server/benchmark";
import { BenchmarkQuery } from "@/lib/zod-schemas";
import { getCurrentCompany } from "@/server/verification";
import { getCompanyMeta } from "@/server/companies/domains";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
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

  let bucket = parsed.data.companySizeBucket;
  if (!bucket) {
    const domain = await getCurrentCompany(session.profileId);
    if (!domain) {
      return NextResponse.json(
        { error: "needs_verification", message: "Verify your work email or pass companySizeBucket" },
        { status: 403 },
      );
    }
    bucket = getCompanyMeta(domain).sizeBucket;
  }

  const result = await getBenchmark({
    role: parsed.data.role,
    seniority: parsed.data.seniority,
    companySizeBucket: bucket,
  });
  return NextResponse.json(result);
}
