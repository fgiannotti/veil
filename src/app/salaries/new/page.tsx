"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseArsInput } from "@/lib/currency";

const SENIORITIES = ["junior", "ssr", "senior", "staff", "principal", "lead"] as const;

export default function NewSalaryPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState<(typeof SENIORITIES)[number]>("senior");
  const [arsRaw, setArsRaw] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role,
          seniority,
          netArs: parseArsInput(arsRaw),
          paymentMonth,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "needs_verification") {
          router.push("/verify");
          return;
        }
        throw new Error(json.message ?? json.error ?? "Error");
      }
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Log a salary entry</h1>
      <p className="text-sm text-ink/70">
        Only the role, seniority, company size bucket, amount, and month are stored
        against your opaque profile id. Nothing links this to your email.
      </p>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <input
            id="role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="backend developer"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="seniority">
            Seniority
          </label>
          <select
            id="seniority"
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
          <label className="label" htmlFor="ars">
            Net ARS this month
          </label>
          <input
            id="ars"
            inputMode="numeric"
            className="input"
            value={arsRaw}
            onChange={(e) => setArsRaw(e.target.value)}
            placeholder="1500000"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="month">
            Payment month
          </label>
          <input
            id="month"
            type="month"
            className="input"
            value={paymentMonth}
            onChange={(e) => setPaymentMonth(e.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save entry"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
