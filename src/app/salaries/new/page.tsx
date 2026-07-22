"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseArsInput } from "@/lib/currency";
import { formatSeniority, SENIORITIES, type Seniority } from "@/lib/seniority";
import { ROLES, formatRole, type Role } from "@/lib/roles";
import { SALARY_LIMITS } from "@/lib/salary-limits";
import { apiErrorMessage } from "@/lib/api-errors";
import { currentYearMonth } from "@/lib/dates";
import { BenefitTagsPicker } from "@/components/BenefitTagsPicker";

const MIN_PAYMENT_MONTH = "2023-01";

export default function NewSalaryPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("backend");
  const [seniority, setSeniority] = useState<Seniority>("senior");
  const [arsRaw, setArsRaw] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(currentYearMonth);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const limits = SALARY_LIMITS[seniority];

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

      const res = await fetch("/api/salaries", {
        method: "POST",
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
      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Sueldo en revisión</h1>
        <div className="card space-y-2 text-sm text-ink/70">
          <p>
            Tu entrada quedó <strong>pendiente de revisión</strong> porque el monto es menor
            a sueldos posteriores que ya tenés cargados.
          </p>
          <p>
            Esto puede ser completamente válido (por ejemplo, si cambiaste de trabajo),
            pero lo revisamos manualmente para mantener la calidad de los datos.
            Revisá el estado en tu dashboard.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/dashboard")}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Registrar un sueldo</h1>
      <p className="text-sm text-ink/70">
        Guardamos rol, seniority, monto, mes, beneficios/tags y el dominio de tu email laboral
        verificado como insignia de empresa.
      </p>
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
            placeholder="1.500.000"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="month">
            Mes de pago
          </label>
          <input
            id="month"
            type="month"
            className="input"
            lang="es-AR"
            value={paymentMonth}
            min={MIN_PAYMENT_MONTH}
            max={currentYearMonth()}
            onChange={(e) => setPaymentMonth(e.target.value)}
            required
          />
        </div>
        <BenefitTagsPicker value={tags} onChange={setTags} />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
