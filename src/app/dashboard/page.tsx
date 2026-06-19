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
        <h2 className="text-lg font-semibold">Tu veil</h2>
        <p className="mt-1 text-sm text-ink/70">
          {domain ? (
            <>
              Verificado en <strong>@{domain}</strong>.{" "}
              <Link href="/verify" className="underline">
                Cambiar empresa
              </Link>
            </>
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
          <h2 className="text-lg font-semibold">Historial de sueldo real</h2>
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
                        {e.status === "pending" && (
                          <span className="ml-2 rounded bg-amber-100 px-1 py-0.5 text-amber-700">
                            en revisión
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{formatArs(Number(e.netArs))}</div>
                      {r ? (
                        <div className="text-xs text-ink/60">
                          {formatUsd(r.usdValueAtPayment)} blue ·{" "}
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
