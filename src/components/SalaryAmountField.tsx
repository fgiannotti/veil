"use client";

import { useEffect, useState } from "react";
import { formatArs, formatArsInput, parseArsInput } from "@/lib/currency";
import type { SalaryCurrency } from "@/lib/zod-schemas";

export function SalaryAmountField({
  currency,
  amountRaw,
  paymentMonth,
  onCurrencyChange,
  onAmountRawChange,
}: {
  currency: SalaryCurrency;
  amountRaw: string;
  paymentMonth: string;
  onCurrencyChange: (c: SalaryCurrency) => void;
  onAmountRawChange: (raw: string) => void;
}) {
  const [blueSell, setBlueSell] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBlueSell(null);
    fetch(`/api/indicators/blue?month=${encodeURIComponent(paymentMonth)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && typeof j.sell === "number") setBlueSell(j.sell);
      })
      .catch(() => {
        if (!cancelled) setBlueSell(null);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentMonth]);

  const amount = parseArsInput(amountRaw);
  const convertedArs =
    currency === "USD" && blueSell && amount > 0
      ? Math.round(amount * blueSell)
      : null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="label !mb-0" htmlFor="amount">
          Sueldo neto del mes
        </label>
        <div
          className="inline-flex rounded-md border border-ink/15 p-0.5 text-xs"
          role="group"
          aria-label="Moneda"
        >
          {(["ARS", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={
                currency === c
                  ? "rounded px-2 py-0.5 font-medium bg-ink text-white"
                  : "rounded px-2 py-0.5 text-ink/60 hover:text-ink"
              }
              onClick={() => {
                if (c === currency) return;
                const n = parseArsInput(amountRaw);
                if (n > 0 && blueSell && blueSell > 0) {
                  if (c === "USD") {
                    onAmountRawChange(
                      formatArsInput(String(Math.round(n / blueSell))),
                    );
                  } else {
                    onAmountRawChange(
                      formatArsInput(String(Math.round(n * blueSell))),
                    );
                  }
                }
                onCurrencyChange(c);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <input
        id="amount"
        inputMode="numeric"
        className="input"
        value={amountRaw}
        onChange={(e) => onAmountRawChange(formatArsInput(e.target.value))}
        placeholder={currency === "USD" ? "5.000" : "1.500.000"}
        required
      />
      {currency === "USD" ? (
        <p className="mt-1.5 text-xs text-ink/55">
          {convertedArs != null && blueSell != null ? (
            <>
              ≈ {formatArs(convertedArs)} al blue del mes (
              {formatArs(Math.round(blueSell))}/USD). Guardamos en ARS.
            </>
          ) : (
            <>Convertimos al blue del mes de pago y guardamos en ARS.</>
          )}
        </p>
      ) : null}
    </div>
  );
}
