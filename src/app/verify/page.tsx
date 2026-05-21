"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [workEmail, setWorkEmail] = useState("");
  const [stage, setStage] = useState<"start" | "confirm">("start");
  const [code, setCode] = useState("");
  const [domain, setDomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Error");
      setStage("confirm");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workEmail, code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Error");
      setDomain(json.domain);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Verify your work email</h1>
      <p className="text-sm text-ink/70">
        We send a 6-digit code to your work email. We only persist the{" "}
        <strong>domain</strong> (e.g. <code>@globant.com</code>) as your company badge.
        The full email is discarded once you confirm.
      </p>

      {domain ? (
        <div className="card text-sm">
          Verified! Your badge: <strong>@{domain}</strong>. Redirecting…
        </div>
      ) : stage === "start" ? (
        <form onSubmit={start} className="card space-y-3">
          <div>
            <label className="label" htmlFor="workEmail">
              Work email
            </label>
            <input
              id="workEmail"
              type="email"
              className="input"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              required
            />
          </div>
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Sending..." : "Send code"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : (
        <form onSubmit={confirm} className="card space-y-3">
          <p className="text-sm text-ink/70">
            We sent a code to <strong>{workEmail}</strong>.
          </p>
          <div>
            <label className="label" htmlFor="code">
              6-digit code
            </label>
            <input
              id="code"
              className="input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button
            type="button"
            className="text-xs text-ink/60 underline"
            onClick={() => setStage("start")}
          >
            Use a different work email
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
