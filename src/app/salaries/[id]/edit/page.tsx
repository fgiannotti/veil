"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { parseArsInput } from "@/lib/currency";
import { formatSeniority, SENIORITIES, type Seniority } from "@/lib/seniority";
import { ROLES, formatRole, type Role } from "@/lib/roles";
import { SALARY_LIMITS } from "@/lib/salary-limits";
import { apiErrorMessage } from "@/lib/api-errors";
import { currentYearMonth } from "@/lib/dates";
import { BenefitTagsPicker } from "@/components/BenefitTagsPicker";
import { MonthInput } from "@/components/MonthInput";

const MIN_PAYMENT_MONTH = "2023-01";

export default function EditSalaryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [role, setRole] = useState<Role>("backend");
  const [seniority, setSeniority] = useState<Seniority>("senior");
  const [arsRaw, setArsRaw] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(currentYearMonth);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  const limits = SALARY_LIMITS[seniority];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/salaries/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(apiErrorMessage(json, "No se pudo cargar"));
        if (cancelled) return;
        const e = json.entry;
        setRole(e.role as Role);
        setSeniority(e.seniority as Seniority);
        setArsRaw(String(e.netArs));
        setPaymentMonth(String(e.paymentMonth).slice(0, 7));
        setTags(Array.isArray(e.tags) ? e.tags : []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const netArs = parseArsInput(arsRaw);
      if (netArs < limits.min) {
        throw new Error(`Para ${formatSeniority(seniority)}, el monto es muy bajo.`);
      }
      if (netArs > limits.max) {
        throw new Error(`Para ${formatSeniority(seniority)}, el monto es muy alto.`);
      }

      const res = await fetch(`/api/salaries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role,
          seniority,
          netArs,
          paymentMonth,
          tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "needs_verification") {
          router.push("/verify");
          return;
        }
        throw new Error(apiErrorMessage(json));
      }
      if (json.pending) {
        setPending(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="mx-auto max-w-md">
        <p className="text-sm text-ink/60">Cargando…</p>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Sueldo en revisión</h1>
        <div className="card space-y-2 text-sm text-ink/70">
          <p>
            La edición quedó <strong>pendiente de revisión</strong> porque el monto es menor
            a sueldos posteriores publicados.
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary inline-block">
          Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Editar sueldo</h1>
        <p className="mt-2 text-sm text-ink/70">
          Corregí monto, rol o mes. Si el cambio dispara revisión manual, vas a ver el estado
          en el panel.
        </p>
      </div>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="role">
            Rol
          </label>
          <select
            id="role"
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
          <label className="label" htmlFor="seniority">
            Seniority
          </label>
          <select
            id="seniority"
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
          <label className="label" htmlFor="ars">
            Sueldo neto del mes (ARS)
          </label>
          <input
            id="ars"
            inputMode="numeric"
            className="input"
            value={arsRaw}
            onChange={(e) => setArsRaw(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="month">
            Mes de pago
          </label>
          <MonthInput
            id="month"
            value={paymentMonth}
            min={MIN_PAYMENT_MONTH}
            max={currentYearMonth()}
            required
            onChange={setPaymentMonth}
          />
        </div>
        <BenefitTagsPicker value={tags} onChange={setTags} />
        <div className="flex flex-wrap gap-2">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Cancelar
          </Link>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
