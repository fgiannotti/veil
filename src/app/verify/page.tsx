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
  const [unknownDomain, setUnknownDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnknownDomain(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "unknown_domain") {
          const d = workEmail.split("@")[1] ?? workEmail;
          setUnknownDomain(d);
          return;
        }
        throw new Error(json.message ?? json.error ?? "Error");
      }
      setStage("confirm");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function reportDomain() {
    setLoading(true);
    try {
      await fetch("/api/report-domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workEmail }),
      });
      setReported(true);
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
      <h1 className="text-xl font-semibold">Verificá tu email laboral</h1>
      <p className="text-sm text-ink/70">
        Te enviamos un código de 6 dígitos. Solo guardamos el{" "}
        <strong>dominio</strong> (ej. <code>@globant.com</code>) como tu insignia de empresa.
        El email completo se descarta una vez confirmado.
      </p>

      {domain ? (
        <div className="card text-sm">
          ¡Verificado! Tu insignia: <strong>@{domain}</strong>. Redirigiendo…
        </div>
      ) : unknownDomain ? (
        <div className="card space-y-3">
          <p className="text-sm">
            <strong>@{unknownDomain}</strong> no está en nuestra lista de empresas verificadas todavía.
          </p>
          {reported ? (
            <p className="text-sm text-green-600">
              ¡Solicitud enviada! Te avisamos cuando agreguemos tu empresa.
            </p>
          ) : (
            <button
              className="btn"
              disabled={loading}
              onClick={reportDomain}
            >
              {loading ? "Enviando..." : `Solicitar acceso para @${unknownDomain}`}
            </button>
          )}
          <button
            type="button"
            className="text-xs text-ink/60 underline"
            onClick={() => { setUnknownDomain(null); setReported(false); }}
          >
            Usar otro email
          </button>
        </div>
      ) : stage === "start" ? (
        <form onSubmit={start} className="card space-y-3">
          <div>
            <label className="label" htmlFor="workEmail">
              Email laboral
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
            {loading ? "Enviando..." : "Enviar código"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : (
        <form onSubmit={confirm} className="card space-y-3">
          <p className="text-sm text-ink/70">
            Enviamos un código a <strong>{workEmail}</strong>.
          </p>
          <div>
            <label className="label" htmlFor="code">
              Código de 6 dígitos
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
            {loading ? "Verificando..." : "Verificar"}
          </button>
          <button
            type="button"
            className="text-xs text-ink/60 underline"
            onClick={() => setStage("start")}
          >
            Usar otro email laboral
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
