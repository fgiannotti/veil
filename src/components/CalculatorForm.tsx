"use client";

import { useState } from "react";
import { RealWageChart } from "./RealWageChart";
import { formatArs, formatUsd, parseArsInput } from "@/lib/currency";

interface Breakdown {
  netArs: number;
  paymentMonth: string;
  todayMonth: string;
  usdBlueAtPayment: number;
  usdValueAtPayment: number;
  realArsToday: number;
  usdValueToday: number;
  purchasingPowerChangePct: number;
}

interface Result {
  breakdown: Breakdown;
  chart: { month: string; usdValue: number }[];
}

export function CalculatorForm() {
  const [arsRaw, setArsRaw] = useState("500000");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
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
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Error");
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
            Net salary (ARS)
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
            Month received
          </label>
          <input
            id="month"
            type="month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Calculating..." : "Calculate real value"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <div className="card space-y-4">
          <Row label="Net ARS at payment" value={formatArs(result.breakdown.netArs)} />
          <Row
            label="USD Blue at payment"
            value={`${formatUsd(result.breakdown.usdValueAtPayment)} (at ${result.breakdown.usdBlueAtPayment.toLocaleString("es-AR")} ARS/USD)`}
          />
          <Row
            label="USD Blue today"
            value={formatUsd(result.breakdown.usdValueToday)}
          />
          <Row
            label="Equivalent in today's pesos (IPC)"
            value={formatArs(result.breakdown.realArsToday)}
          />
          <Row
            label="Purchasing power change (USD)"
            value={`${result.breakdown.purchasingPowerChangePct.toFixed(1)}%`}
            tone={result.breakdown.purchasingPowerChangePct >= 0 ? "good" : "bad"}
          />
          <div className="pt-2">
            <p className="label">Monthly USD value of that wage</p>
            <RealWageChart data={result.chart} />
          </div>
          <p className="text-xs text-ink/50">
            Sign up to track your real salary over time and benchmark against your cohort.
          </p>
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
