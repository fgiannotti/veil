"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatArs } from "@/lib/currency";
import { formatSeniority, SENIORITIES, type Seniority } from "@/lib/seniority";
import { ROLES, formatRole, type Role } from "@/lib/roles";
import tier1 from "@/server/companies/tier1.json";

const BUCKETS = ["1-50", "50-200", "200-1000", "1000-5000", "5000+"] as const;
type Bucket = (typeof BUCKETS)[number] | "auto" | "all";

interface Result {
  status: "ok" | "insufficient_data";
  count: number;
  threshold: number;
  avg?: number;
  p25?: number;
  p50?: number;
  p95?: number;
  todayMonth?: string;
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
  const companyMeta = companyDomain ? (tier1 as Record<string, { name: string; sizeBucket: Bucket }>)[companyDomain] : null;
  const companyName = companyMeta?.name ?? null;
  const initialBucket = companyMeta?.sizeBucket ?? "all";

  const [role, setRole] = useState<Role>("developer");
  const [seniority, setSeniority] = useState<Seniority>("senior");
  const [bucket, setBucket] = useState<Bucket>(initialBucket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [hasEntry, setHasEntry] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/salaries")
      .then((r) => r.json())
      .then((j) => setHasEntry(Array.isArray(j.entries) && j.entries.length > 0))
      .catch(() => setHasEntry(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ role, seniority });
      if (bucket !== "all") q.set("companySizeBucket", bucket);
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

  const gated = hasEntry === false;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        {companyName ? `Sueldos en ${companyName}` : "Benchmarks"}
      </h1>
      <p className="max-w-prose text-sm text-ink/70">
        Solo mostramos datos cuando una cohorte (rol + seniority + tamaño de empresa) tiene
        suficientes entradas verificadas. Todos los sueldos históricos se ajustan a pesos de
        hoy usando el IPC.
      </p>

      {gated ? (
        <div className="card space-y-3">
          <p className="text-sm text-ink/70">
            Para ver el benchmark necesitás haber cargado al menos un sueldo verificado.
          </p>
          <Link href="/salaries/new" className="btn inline-block">
            Cargar mi sueldo
          </Link>
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
            <label className="label">Seniority</label>
            <select
              className="input"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as Seniority)}
            >
              {SENIORITIES.map((s) => (
                <option key={s} value={s}>
                  {formatSeniority(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tamaño de empresa</label>
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
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Comparar"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}

      {result ? (
        <div className="card">
          {result.status === "insufficient_data" ? (
            <p className="text-sm">
              <strong>Todavía no hay suficientes sueldos verificados para este grupo.</strong>
            </p>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="Entradas en la cohorte" value={`${result.count}`} />
              <Row label="Ajustado a" value={result.todayMonth ?? ""} />
              <Row label="p25" value={formatArs(result.p25 ?? 0)} />
              <Row label="mediana" value={formatArs(result.p50 ?? 0)} />
              <Row label="promedio" value={formatArs(result.avg ?? 0)} />
              <Row label="p95" value={formatArs(result.p95 ?? 0)} />
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
