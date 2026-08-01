"use client";

import Link from "next/link";
import { useState } from "react";
import { RealWageChart } from "./RealWageChart";
import { MonthInput } from "./MonthInput";
import { formatArs, formatUsd, parseArsInput } from "@/lib/currency";
import { apiErrorMessage } from "@/lib/api-errors";
import { currentYearMonth } from "@/lib/dates";
import { withOnboardingPrefill } from "@/lib/onboarding";

const MIN_PAYMENT_MONTH = "2023-01";

interface Breakdown {
  netArs: number;
  paymentMonth: string;
  todayMonth: string;
  usdBlueAtPayment: number;
  usdBlueToday: number;
  usdValueAtPayment: number;
  realArsToday: number;
  usdValueToday: number;
  purchasingPowerChangePct: number;
  ipcDataStale: boolean;
}

interface Result {
  breakdown: Breakdown;
  chart: { month: string; usdValue: number }[];
}

export function CalculatorForm({ loggedIn = false }: { loggedIn?: boolean }) {
  const [arsRaw, setArsRaw] = useState("500000");
  const [month, setMonth] = useState(currentYearMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/calculator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          netArs: parseArsInput(arsRaw),
          paymentMonth: month,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json));
      setResult(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="ars">
            Sueldo neto (ARS)
          </label>
          <input
            id="ars"
            inputMode="numeric"
            className="input"
            value={arsRaw}
            onChange={(e) => setArsRaw(e.target.value)}
            placeholder="500000"
          />
        </div>
        <div>
          <label className="label" htmlFor="month">
            Mes cobrado
          </label>
          <MonthInput
            id="month"
            value={month}
            min={MIN_PAYMENT_MONTH}
            max={currentYearMonth()}
            onChange={setMonth}
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Calculando..." : "Calcular valor real"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <div className="card space-y-4">
          {result.breakdown.paymentMonth.slice(0, 7) === result.breakdown.todayMonth.slice(0, 7) ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Seleccionaste el mes actual. El dólar blue y el IPC son los mismos que "hoy",
              así que la variación es 0%. Probá con un mes anterior para ver la evolución.
            </p>
          ) : result.breakdown.ipcDataStale ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              El INDEC publica el IPC con ~30 días de demora. Los datos de inflación
              para este período todavía no están disponibles; el ajuste por IPC no se puede calcular.
            </p>
          ) : null}
          <Row label="ARS neto al cobro" value={formatArs(result.breakdown.netArs)} />
          <Row
            label="Sueldo en USD al cobro"
            value={`${formatUsd(result.breakdown.usdValueAtPayment)} (blue ${formatArs(result.breakdown.usdBlueAtPayment)}/USD)`}
          />
          <Row
            label="Sueldo en USD hoy"
            value={`${formatUsd(result.breakdown.usdValueToday)} (blue ${formatArs(result.breakdown.usdBlueToday)}/USD)`}
          />
          <Row
            label="Equivalente en pesos de hoy (IPC)"
            value={result.breakdown.ipcDataStale ? "—" : formatArs(result.breakdown.realArsToday)}
          />
          <div>
            <Row
              label="Variación del sueldo en USD"
              value={`${result.breakdown.purchasingPowerChangePct.toFixed(1)}%`}
              tone={result.breakdown.purchasingPowerChangePct >= 0 ? "good" : "bad"}
            />
            <p className="mt-1 text-xs text-ink/50">
              Si el blue sube, el mismo sueldo en pesos compra menos dólares (variación negativa).
            </p>
          </div>
          <div className="pt-2">
            <p className="label">Valor mensual en USD de ese sueldo</p>
            <RealWageChart data={result.chart} />
          </div>
          <div className="space-y-2 border-t border-ink/10 pt-4">
            {loggedIn ? (
              <>
                <p className="text-sm text-ink/70">
                  Registrá este sueldo para desbloquear los benchmarks.
                </p>
                <Link
                  href={withOnboardingPrefill("/salaries/new", {
                    netArs: String(Math.round(result.breakdown.netArs)),
                    month: result.breakdown.paymentMonth.slice(0, 7),
                  })}
                  className="btn inline-block"
                >
                  Cargar este sueldo
                </Link>
                <p className="text-xs text-ink/50">
                  O{" "}
                  <Link href="/dashboard" className="underline hover:text-ink">
                    abrí tu panel
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-ink/70">
                  Creá una cuenta para seguir la evolución de tu sueldo real y
                  compararte con los benchmarks.
                </p>
                <Link
                  href={withOnboardingPrefill("/signup", {
                    netArs: String(Math.round(result.breakdown.netArs)),
                    month: result.breakdown.paymentMonth.slice(0, 7),
                  })}
                  className="btn inline-block"
                >
                  Creá tu cuenta
                </Link>
                <p className="text-xs text-ink/50">
                  ¿Ya tenés cuenta?{" "}
                  <Link
                    href={withOnboardingPrefill("/login", {
                      netArs: String(Math.round(result.breakdown.netArs)),
                      month: result.breakdown.paymentMonth.slice(0, 7),
                    })}
                    className="underline hover:text-ink"
                  >
                    Ingresá
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-ink/60">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}
