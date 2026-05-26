import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { getCurrentCompany } from "@/server/verification";
import {
  computeRealWage,
  indicatorAtOrBefore,
  latestIndicator,
  type IndicatorRow,
} from "@/server/inflation";
import { formatArs, formatUsd } from "@/lib/currency";
import { formatSeniority } from "@/lib/seniority";
import { monthLabel } from "@/lib/dates";
import { RealWageChart } from "@/components/RealWageChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.profileId) redirect("/login?callbackUrl=/dashboard");

  const profileId = session.profileId;
  const domain = await getCurrentCompany(profileId);

  const entries = await db
    .select()
    .from(salaryEntries)
    .where(eq(salaryEntries.profileId, profileId))
    .orderBy(desc(salaryEntries.paymentMonth));

  let today: IndicatorRow | null = null;
  try {
    today = await latestIndicator();
  } catch {
    today = null;
  }

  const indicatorMap = new Map<string, IndicatorRow>();
  if (today) {
    for (const e of entries) {
      if (!indicatorMap.has(e.paymentMonth)) {
        indicatorMap.set(e.paymentMonth, await indicatorAtOrBefore(e.paymentMonth));
      }
    }
  }

  const chart =
    today && entries.length > 0
      ? entries
          .slice()
          .reverse()
          .map((e) => {
            const ind = indicatorMap.get(e.paymentMonth)!;
            const r = computeRealWage(Number(e.netArs), e.paymentMonth, ind, today!);
            return { month: e.paymentMonth, usdValue: r.usdValueAtPayment };
          })
      : [];

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-semibold">Your veil</h2>
        <p className="mt-1 text-sm text-ink/70">
          {domain ? (
            <>
              Verified at <strong>@{domain}</strong>.{" "}
              <Link href="/verify" className="underline">
                Change company
              </Link>
            </>
          ) : (
            <>
              You haven't verified a work email yet.{" "}
              <Link href="/verify" className="underline">
                Verify now
              </Link>{" "}
              to log salaries.
            </>
          )}
        </p>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Real wage history</h2>
          <div className="flex gap-2">
            <Link href="/companies" className="btn-secondary">
              Browse by company
            </Link>
            <Link href="/salaries/new" className="btn">
              Add salary
            </Link>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink/70">No entries yet.</p>
        ) : (
          <>
            {chart.length > 0 ? (
              <>
                <p className="label">USD Blue value at time of payment</p>
                <RealWageChart data={chart} />
              </>
            ) : null}

            <ul className="divide-y divide-ink/10">
              {entries.map((e) => {
                const ind = today ? indicatorMap.get(e.paymentMonth) : null;
                const r = ind && today
                  ? computeRealWage(Number(e.netArs), e.paymentMonth, ind, today)
                  : null;
                return (
                  <li key={`${e.id}-${e.paymentMonth}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                    <div>
                      <div className="font-medium">{monthLabel(e.paymentMonth)}</div>
                      <div className="text-xs text-ink/60">
                        {e.role} · {formatSeniority(e.seniority)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{formatArs(Number(e.netArs))}</div>
                      {r ? (
                        <div className="text-xs text-ink/60">
                          {formatUsd(r.usdValueAtPayment)} blue ·{" "}
                          {formatArs(r.realArsToday)} today
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
