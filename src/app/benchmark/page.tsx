"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatArs, formatUsd } from "@/lib/currency";
import { formatSeniority, SENIORITIES, type Seniority } from "@/lib/seniority";
import { ROLES, formatRole, type Role } from "@/lib/roles";
import tier1 from "@/server/companies/tier1.json";
import { apiErrorMessage } from "@/lib/api-errors";
import { SalaryDistributionChart } from "@/components/SalaryDistributionChart";
import { OnboardingSteps } from "@/components/OnboardingSteps";

const BUCKETS = ["1-50", "50-200", "200-1000", "1000-5000", "5000+"] as const;
type Bucket = (typeof BUCKETS)[number] | "auto" | "all";
type SeniorityFilter = Seniority | "all";

interface Comparison {
  status: "ok" | "insufficient_data";
  threshold: number;
  companyName?: string;
  companyMedian?: number;
  companyMedianUsd?: number;
  marketMedian?: number;
  marketMedianUsd?: number;
  rank?: number;
  companiesCompared?: number;
  percentile?: number;
  curve?: { salary: number; density: number }[];
  usdBlueSell?: number;
}

interface Result {
  status: "ok" | "insufficient_data";
  threshold: number;
  basis?: "net";
  avg?: number;
  p25?: number;
  p50?: number;
  p95?: number;
  avgUsd?: number;
  p25Usd?: number;
  p50Usd?: number;
  p95Usd?: number;
  todayMonth?: string;
  usdBlueSell?: number;
  comparison?: Comparison;
  topBenefits?: { label: string; count: number }[];
}

export default function BenchmarkPage() {
  return (
    <Suspense>
      <BenchmarkContent />
    </Suspense>
  );
}

function BenchmarkContent() {
  const params = useSearchParams();
  const companyDomain = params.get("company");
  const companyMeta = companyDomain
    ? (tier1 as Record<string, { name: string; sizeBucket: Bucket }>)[companyDomain]
    : null;
  const companyName = companyMeta?.name ?? null;

  const [role, setRole] = useState<Role>("backend");
  const [seniority, setSeniority] = useState<SeniorityFilter>("senior");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [hasEntry, setHasEntry] = useState<boolean | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    fetch("/api/salaries")
      .then((r) => r.json())
      .then((j) => {
        setHasEntry(Boolean(j.hasPublishedEntry));
        setVerified(Boolean(j.verified));
        setHasPending(Boolean(j.hasPendingEntry));
      })
      .catch(() => {
        setHasEntry(false);
        setVerified(false);
        setHasPending(false);
      });
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ role });
      if (seniority !== "all") q.set("seniority", seniority);
      if (companyDomain) {
        q.set("companyDomain", companyDomain);
      } else if (bucket !== "all") {
        q.set("companySizeBucket", bucket);
      }
      const res = await fetch(`/api/benchmark?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json));
      setResult(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const gated = hasEntry === false;
  const comparison = result?.comparison;
  const topBenefits = result?.topBenefits ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">
          {companyName ? `Sueldos en ${companyName}` : "Vista general de sueldos"}
        </h1>
        <p className="max-w-prose text-sm text-ink/70">
          {companyName
            ? `Mediana de ${companyName} para el rol elegido, y su posición frente a otras empresas con datos suficientes. Los sueldos históricos se actualizan usando el IPC.`
            : "Agregado de sueldos netos de todas las empresas verificadas. Filtrá por rol y, si querés, por seniority o tamaño. Los históricos se actualizan con IPC."}
        </p>
        {companyName ? (
          <p className="text-sm">
            <Link href="/benchmark" className="underline text-ink/70 hover:text-ink">
              ← Volver a la vista general
            </Link>
          </p>
        ) : (
          <p className="text-sm">
            <Link href="/companies" className="underline text-ink/70 hover:text-ink">
              Ver por empresa →
            </Link>
          </p>
        )}
      </div>

      {gated ? (
        <div className="card space-y-4">
          <OnboardingSteps current={verified ? 3 : 2} />
          <div>
            <p className="text-sm font-medium text-ink">
              El benchmark se desbloquea con un sueldo publicado
            </p>
            <p className="mt-1 text-sm text-ink/70">
              Así protegemos la anonimidad: solo quien aporta datos puede ver los benchmarks.
            </p>
          </div>
          <ol className="space-y-2 text-sm">
            <ChecklistItem
              done={verified === true}
              label="Verificá tu email laboral"
              hint={verified ? "Empresa vinculada" : "Probá tu dominio de trabajo"}
              href={verified ? undefined : "/verify"}
              cta="Verificar"
            />
            <ChecklistItem
              done={false}
              label="Publicá al menos un sueldo"
              hint={
                hasPending
                  ? "Tenés una entrada en revisión; el benchmark se abre cuando se apruebe."
                  : verified
                    ? "Rol, seniority, monto y mes"
                    : "Primero completá la verificación"
              }
              href={verified ? "/salaries/new" : undefined}
              cta="Cargar sueldo"
            />
            <ChecklistItem
              done={false}
              label="Compararte con los benchmarks"
              hint="Disponible cuando el sueldo esté publicado"
            />
          </ol>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {formatRole(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Seniority (opcional)</label>
            <select
              className="input"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as SeniorityFilter)}
            >
              <option value="all">Todos</option>
              {SENIORITIES.map((s) => (
                <option key={s} value={s}>
                  {formatSeniority(s)}
                </option>
              ))}
            </select>
          </div>
          {!companyDomain ? (
            <div>
              <label className="label">Tamaño de empresa (opcional)</label>
              <select
                className="input"
                value={bucket}
                onChange={(e) => setBucket(e.target.value as Bucket)}
              >
                <option value="all">Todos los tamaños</option>
                <option value="auto">El de mi empresa</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b} empleados
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-ink/60">
              Comparando <code>@{companyDomain}</code> contra el resto del mercado
            </p>
          )}
          <button className="btn self-start" type="submit" disabled={loading}>
            {loading ? "Cargando..." : companyDomain ? "Comparar empresa" : "Ver mercado"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}

      {result ? (
        <div className="space-y-4">
          {result.status === "insufficient_data" ? (
            <div className="card">
              <p className="text-sm">
                <strong>
                  {companyName
                    ? `Todavía no hay suficientes sueldos verificados en ${companyName} para este filtro.`
                    : "Todavía no hay suficientes sueldos verificados para este grupo."}
                </strong>
              </p>
            </div>
          ) : (
            <div className="card space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  Sueldo <span className="underline decoration-ink/30">neto</span>
                  {companyName ? ` · ${companyName}` : " · mercado"}
                </p>
                <p className="text-xs text-ink/50">
                  Ajustado IPC
                  {result.todayMonth ? ` · ${result.todayMonth.slice(0, 7)}` : ""}
                  {result.usdBlueSell
                    ? ` · blue $${Math.round(result.usdBlueSell).toLocaleString("es-AR")}`
                    : ""}
                </p>
              </div>

              <StatTile
                label="Mediana"
                ars={result.p50 ?? 0}
                usd={result.p50Usd}
                emphasize
              />

              <div className="grid grid-cols-3 gap-2">
                <StatTile label="p25" ars={result.p25 ?? 0} usd={result.p25Usd} />
                <StatTile label="Promedio" ars={result.avg ?? 0} usd={result.avgUsd} />
                <StatTile label="p95" ars={result.p95 ?? 0} usd={result.p95Usd} />
              </div>
            </div>
          )}

          {companyDomain && topBenefits.length > 0 ? (
            <div className="card space-y-2">
              <h2 className="text-base font-semibold">Beneficios más reportados</h2>
              <div className="flex flex-wrap gap-1.5">
                {topBenefits.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex rounded-full border border-ink/15 bg-ink/[0.04] px-2.5 py-1 text-xs font-medium text-ink/80"
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {companyDomain && comparison ? (
            <div className="card space-y-3">
              <h2 className="text-base font-semibold">Posición vs otras empresas</h2>
              {comparison.status === "insufficient_data" ? (
                <p className="text-sm text-ink/70">
                  Todavía no hay suficientes empresas con datos para armar la comparación
                  (mínimo {comparison.threshold}).
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {comparison.rank != null && comparison.companiesCompared != null ? (
                      <MiniStat
                        label="Ranking"
                        value={`#${comparison.rank}`}
                        hint={`de ${comparison.companiesCompared}`}
                      />
                    ) : null}
                    {comparison.percentile != null ? (
                      <MiniStat
                        label="Percentil"
                        value={`${comparison.percentile}%`}
                        hint="mejor o igual"
                      />
                    ) : null}
                    {comparison.companyMedian != null ? (
                      <StatTile
                        label={comparison.companyName ?? "Empresa"}
                        ars={comparison.companyMedian}
                        usd={comparison.companyMedianUsd}
                      />
                    ) : null}
                    {comparison.marketMedian != null ? (
                      <StatTile
                        label="Mercado"
                        ars={comparison.marketMedian}
                        usd={comparison.marketMedianUsd}
                      />
                    ) : null}
                  </div>
                  {comparison.companyMedian == null ? (
                    <p className="text-sm text-ink/70">
                      Esta empresa aún no tiene suficientes entradas propias para marcarla en
                      la curva, pero sí hay mercado suficiente.
                    </p>
                  ) : null}
                  {comparison.curve?.length ? (
                    <div>
                      <p className="mb-2 text-xs text-ink/60">
                        Distribución de medianas netas por empresa
                      </p>
                      <SalaryDistributionChart
                        curve={comparison.curve}
                        companyMedian={comparison.companyMedian}
                        companyLabel={comparison.companyName ?? "Esta empresa"}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  hint,
  href,
  cta,
}: {
  done: boolean;
  label: string;
  hint: string;
  href?: string;
  cta?: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-ink/10 px-3 py-2.5">
      <span
        className={
          done
            ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink"
            : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink/25"
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={done ? "font-medium text-ink/60 line-through" : "font-medium text-ink"}>
          {label}
        </p>
        <p className="text-xs text-ink/55">{hint}</p>
        {href && cta && !done ? (
          <Link href={href} className="mt-2 inline-block text-xs font-medium underline">
            {cta} →
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function StatTile({
  label,
  ars,
  usd,
  emphasize = false,
}: {
  label: string;
  ars: number;
  usd?: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        emphasize
          ? "rounded-md border border-ink/15 bg-ink/[0.03] px-3 py-2.5"
          : "rounded-md border border-ink/10 px-2.5 py-2"
      }
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink/50">{label}</div>
      <div className={emphasize ? "mt-0.5 text-lg font-semibold" : "mt-0.5 text-sm font-semibold"}>
        {formatArs(ars)}
      </div>
      <div className="text-xs text-ink/55">
        {usd != null ? `${formatUsd(usd)} blue` : "neto"}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink/50">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      {hint ? <div className="text-xs text-ink/55">{hint}</div> : null}
    </div>
  );
}
