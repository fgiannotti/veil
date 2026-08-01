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
import { formatRole } from "@/lib/roles";
import { monthLabel } from "@/lib/dates";
import { RealWageChart } from "@/components/RealWageChart";
import { SalaryEntryActions, SalaryStatusBadge } from "@/components/SalaryEntryActions";

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
          .filter((e) => e.status === "published")
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
        <h2 className="text-lg font-semibold">Tu bench</h2>
        <p className="mt-1 text-sm text-ink/70">
          {domain ? (
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-4 w-4 shrink-0 text-emerald-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 10.94 7.28 9.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Verificado en <strong>@{domain}</strong>.{" "}
                <Link href="/verify" className="underline">
                  Cambiar empresa
                </Link>
              </span>
            </span>
          ) : (
            <>
              Todavía no verificaste un email laboral.{" "}
              <Link href="/verify" className="underline">
                Verificá ahora
              </Link>{" "}
              para cargar sueldos.
            </>
          )}
        </p>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Historial de sueldo real</h2>
            {today ? (
              <p className="mt-0.5 text-xs text-ink/55">
                Dólar blue hoy: {formatArs(Math.round(today.usdBlueSell))}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Link href="/companies" className="btn-secondary">
              Ver por empresa
            </Link>
            <Link href="/salaries/new" className="btn">
              Agregar sueldo
            </Link>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink/70">Sin entradas todavía.</p>
        ) : (
          <>
            {chart.length > 0 ? (
              <>
                <p className="label">Valor en USD Blue al momento del pago</p>
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
                        {formatRole(e.role)} · {formatSeniority(e.seniority)}
                        <SalaryStatusBadge status={e.status} />
                      </div>
                      {Array.isArray(e.tags) && e.tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {e.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] text-ink/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <SalaryEntryActions id={e.id} status={e.status} />
                    </div>
                    <div className="text-right">
                      <div>{formatArs(Number(e.netArs))}</div>
                      {r ? (
                        <div className="text-xs text-ink/60">
                          {formatUsd(r.usdValueAtPayment)} blue
                          <span className="text-ink/40">
                            {" "}
                            @ {formatArs(Math.round(r.usdBlueAtPayment))}
                          </span>
                          {" · "}
                          {formatArs(r.realArsToday)} hoy
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
