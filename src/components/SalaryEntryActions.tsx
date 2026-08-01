"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-errors";

export function SalaryEntryActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("¿Borrar este sueldo? No se puede deshacer.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/salaries/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, "No se pudo borrar"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
      <Link href={`/salaries/${id}/edit`} className="underline text-ink/60 hover:text-ink">
        editar
      </Link>
      <button
        type="button"
        className="underline text-ink/60 hover:text-ink disabled:opacity-50"
        disabled={busy}
        onClick={remove}
      >
        {busy ? "borrando…" : "borrar"}
      </button>
      {status === "rejected" ? (
        <Link href="/salaries/new" className="underline text-ink/60 hover:text-ink">
          cargar de nuevo
        </Link>
      ) : null}
      {error ? <span className="text-red-600">{error}</span> : null}
    </div>
  );
}

export function SalaryStatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
        en revisión
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-700">
        rechazado
      </span>
    );
  }
  if (status === "published") {
    return (
      <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
        publicado
      </span>
    );
  }
  return null;
}
