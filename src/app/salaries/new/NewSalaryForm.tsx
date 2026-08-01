"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatArsInput, parseArsInput } from "@/lib/currency";
import { formatSeniority, SENIORITIES, type Seniority } from "@/lib/seniority";
import { ROLES, formatRole, type Role } from "@/lib/roles";
import { apiErrorMessage } from "@/lib/api-errors";
import { currentYearMonth } from "@/lib/dates";
import { BenefitTagsPicker } from "@/components/BenefitTagsPicker";
import { MonthInput } from "@/components/MonthInput";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { SalaryAmountField } from "@/components/SalaryAmountField";
import type { SalaryCurrency } from "@/lib/zod-schemas";
import {
  hasOnboardingPrefill,
  readOnboardingPrefill,
  withOnboardingPrefill,
} from "@/lib/onboarding";

const MIN_PAYMENT_MONTH = "2023-01";

export function NewSalaryForm({ companyName }: { companyName: string | null }) {
  return (
    <Suspense>
      <NewSalaryFormInner companyName={companyName} />
    </Suspense>
  );
}

function NewSalaryFormInner({ companyName }: { companyName: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = readOnboardingPrefill(searchParams);
  const fromOnboarding = hasOnboardingPrefill(prefill);

  const [role, setRole] = useState<Role>("backend");
  const [seniority, setSeniority] = useState<Seniority>("senior");
  const [currency, setCurrency] = useState<SalaryCurrency>("ARS");
  const [amountRaw, setAmountRaw] = useState(() =>
    prefill.netArs ? formatArsInput(prefill.netArs) : "",
  );
  const [paymentMonth, setPaymentMonth] = useState(
    prefill.month && prefill.month <= currentYearMonth()
      ? prefill.month
      : currentYearMonth(),
  );
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const amount = parseArsInput(amountRaw);
      if (amount <= 0) {
        throw new Error("Ingresá un monto válido.");
      }

      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role,
          seniority,
          currency,
          amount,
          paymentMonth,
          tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "needs_verification") {
          router.push(withOnboardingPrefill("/verify", prefill));
          return;
        }
        throw new Error(apiErrorMessage(json));
      }
      if (json.pending) {
        setPending(true);
        return;
      }
      router.push(fromOnboarding ? "/benchmark" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        {fromOnboarding ? <OnboardingSteps current={3} /> : null}
        <h1 className="text-xl font-semibold">Sueldo en revisión</h1>
        <div className="card space-y-2 text-sm text-ink/70">
          <p>
            Tu entrada quedó <strong>pendiente de revisión</strong> porque el monto es menor
            a sueldos posteriores que ya tenés cargados.
          </p>
          <p>
            Mientras esté en revisión no desbloquea el benchmark. Revisá el estado en tu
            dashboard.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/dashboard")}>
          Volver al panel
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {fromOnboarding ? <OnboardingSteps current={3} /> : null}
      <div>
        <h1 className="text-xl font-semibold">
          Registrar un sueldo
          {companyName ? (
            <>
              {" "}
              para <span className="whitespace-nowrap">{companyName}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          {fromOnboarding
            ? "Usamos el monto de la calculadora como punto de partida. Completá rol y seniority para compararte con los benchmarks."
            : "Guardamos rol, seniority, monto, mes, beneficios/tags y el dominio de tu email laboral verificado como insignia de empresa."}
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
        <SalaryAmountField
          currency={currency}
          amountRaw={amountRaw}
          paymentMonth={paymentMonth}
          onCurrencyChange={setCurrency}
          onAmountRawChange={setAmountRaw}
        />
        <BenefitTagsPicker value={tags} onChange={setTags} />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Guardando..." : fromOnboarding ? "Guardar y ver benchmark" : "Guardar"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
