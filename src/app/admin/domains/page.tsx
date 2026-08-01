"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api-errors";

const SIZE_BUCKETS = ["1-50", "50-200", "200-1000", "1000-5000", "5000+"] as const;

interface DomainRequest {
  id: string;
  domain: string;
  requestedAt: string;
  status: string;
}

export default function AdminDomainsPage() {
  const [requests, setRequests] = useState<DomainRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; sizeBucket: (typeof SIZE_BUCKETS)[number] }>
  >({});

  useEffect(() => {
    fetch("/api/admin/domains")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(apiErrorMessage(j));
        else {
          setRequests(j.requests);
          const initial: typeof drafts = {};
          for (const req of j.requests as DomainRequest[]) {
            const base = req.domain.split(".")[0] ?? req.domain;
            initial[req.id] = {
              name: base.charAt(0).toUpperCase() + base.slice(1),
              sizeBucket: "1-50",
            };
          }
          setDrafts(initial);
        }
      })
      .catch(() => setError("Error al cargar"));
  }, []);

  async function approve(id: string) {
    const draft = drafts[id];
    if (!draft?.name.trim()) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          name: draft.name.trim(),
          sizeBucket: draft.sizeBucket,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(apiErrorMessage(j));
        return;
      }
      setRequests((prev) => prev?.filter((r) => r.id !== id) ?? null);
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(apiErrorMessage(j));
        return;
      }
      setRequests((prev) => prev?.filter((r) => r.id !== id) ?? null);
    } finally {
      setActing(null);
    }
  }

  if (error && !requests) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!requests) {
    return <p className="text-sm text-ink/60">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Solicitudes de dominio</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {requests.length === 0 ? (
        <p className="text-sm text-ink/60">No hay solicitudes pendientes.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {requests.map((r) => {
            const draft = drafts[r.id] ?? { name: "", sizeBucket: "1-50" as const };
            return (
              <li key={r.id} className="space-y-3 py-4">
                <div className="text-sm">
                  <div className="font-medium">@{r.domain}</div>
                  <div className="text-xs text-ink/50">
                    pedida {new Date(r.requestedAt).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block text-xs text-ink/60">
                    Nombre
                    <input
                      className="mt-1 block w-44 rounded border border-ink/15 px-2 py-1.5 text-sm"
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.id]: { ...draft, name: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-xs text-ink/60">
                    Tamaño
                    <select
                      className="mt-1 block rounded border border-ink/15 px-2 py-1.5 text-sm"
                      value={draft.sizeBucket}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.id]: {
                            ...draft,
                            sizeBucket: e.target.value as (typeof SIZE_BUCKETS)[number],
                          },
                        }))
                      }
                    >
                      {SIZE_BUCKETS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn"
                    type="button"
                    disabled={acting === r.id || !draft.name.trim()}
                    onClick={() => approve(r.id)}
                  >
                    Aprobar
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => reject(r.id)}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
