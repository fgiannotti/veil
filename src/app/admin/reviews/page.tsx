"use client";

import { useEffect, useState } from "react";
import { formatArs } from "@/lib/currency";
import { formatRole } from "@/lib/roles";
import { formatSeniority } from "@/lib/seniority";
import { monthLabel } from "@/lib/dates";

interface Entry {
  id: string;
  role: string;
  seniority: string;
  companyDomain: string;
  netArs: number;
  paymentMonth: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setEntries(j.entries);
      })
      .catch(() => setError("Error al cargar"));
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null);
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <p className="text-red-600">{error === "forbidden" ? "Acceso denegado." : error}</p>
      </div>
    );
  }

  if (!entries) {
    return <div className="mx-auto max-w-2xl py-8 text-sm text-ink/60">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Revisión de sueldos</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-ink/60">No hay entradas pendientes.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="space-y-0.5 text-sm">
                <div className="font-medium">
                  {monthLabel(e.paymentMonth)} · {formatArs(Number(e.netArs))}
                </div>
                <div className="text-xs text-ink/60">
                  {formatRole(e.role)} · {formatSeniority(e.seniority)} · @{e.companyDomain}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn"
                  disabled={acting === e.id}
                  onClick={() => act(e.id, "approve")}
                >
                  Aprobar
                </button>
                <button
                  className="btn-secondary"
                  disabled={acting === e.id}
                  onClick={() => act(e.id, "reject")}
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
