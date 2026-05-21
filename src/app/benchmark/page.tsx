"use client";

import { useState } from "react";
import { formatArs } from "@/lib/currency";

const SENIORITIES = ["junior", "ssr", "senior", "staff", "principal", "lead"] as const;
const BUCKETS = ["1-50", "50-200", "200-1000", "1000-5000", "5000+"] as const;

interface Result {
  status: "ok" | "insufficient_data";
  count: number;
  threshold: number;
  avg?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  todayMonth?: string;
}

export default function BenchmarkPage() {
  const [role, setRole] = useState("backend developer");
  const [seniority, setSeniority] = useState<(typeof SENIORITIES)[number]>("senior");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number] | "auto">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ role, seniority });
      if (bucket !== "auto") q.set("companySizeBucket", bucket);
      const res = await fetch(`/api/benchmark?${q.toString()}`);
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
      <h1 className="text-xl font-semibold">Cohort benchmark</h1>
      <p className="max-w-prose text-sm text-ink/70">
        We only show numbers once a cohort (role + seniority + company size) has{" "}
        <strong>3 or more verified entries</strong>. All historical entries are
        inflation-adjusted to today's pesos using IPC.
      </p>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label">Role</label>
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Seniority</label>
          <select
            className="input"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value as (typeof SENIORITIES)[number])}
          >
            {SENIORITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Company size</label>
          <select
            className="input"
            value={bucket}
            onChange={(e) => setBucket(e.target.value as typeof bucket)}
          >
            <option value="auto">Use my company's size</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Compare"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <div className="card">
          {result.status === "insufficient_data" ? (
            <p className="text-sm">
              <strong>Not enough entries yet.</strong> We need at least{" "}
              {result.threshold} verified salaries in this cohort (we have{" "}
              {result.count}). Add yours to help unlock the benchmark.
            </p>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="Entries in cohort" value={`${result.count}`} />
              <Row label="Adjusted to" value={result.todayMonth ?? ""} />
              <Row label="p25" value={formatArs(result.p25 ?? 0)} />
              <Row label="median" value={formatArs(result.p50 ?? 0)} />
              <Row label="average" value={formatArs(result.avg ?? 0)} />
              <Row label="p75" value={formatArs(result.p75 ?? 0)} />
            </dl>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-xs uppercase tracking-wide text-ink/60">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
