"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/api-errors";

export default function VerifyPage() {
  const router = useRouter();
  const [workEmail, setWorkEmail] = useState("");
  const [stage, setStage] = useState<"start" | "confirm">("start");
  const [code, setCode] = useState("");
  const [domain, setDomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unknownDomain, setUnknownDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [reported, setReported] = useState(false);
  const [resent, setResent] = useState(false);

  async function requestCode(): Promise<void> {
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
        setStage("start");
        return;
      }
      throw new Error(apiErrorMessage(json));
    }
    setStage("confirm");
    setCode("");
    setResent(true);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnknownDomain(null);
    setResent(false);
    setLoading(true);
    try {
      await requestCode();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(null);
    setResent(false);
    setResending(true);
    try {
      await requestCode();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResending(false);
    }
  }

  async function reportDomain() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report-domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(apiErrorMessage(json, "No se pudo enviar la solicitud"));
      }
      setReported(true);
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
      if (!res.ok) throw new Error(apiErrorMessage(json));
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
              className="btn self-start"
              disabled={loading}
              onClick={reportDomain}
            >
              {loading ? "Enviando..." : `Solicitar acceso para @${unknownDomain}`}
            </button>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            className="block text-xs text-ink/60 underline"
            onClick={() => { setUnknownDomain(null); setReported(false); setError(null); }}
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
              placeholder="vos@tuempresa.com"
              required
            />
          </div>
          <button className="btn self-start" disabled={loading} type="submit">
            {loading ? "Enviando..." : "Enviar código"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : (
        <form onSubmit={confirm} className="card flex flex-col gap-4">
          <p className="text-sm text-ink/70">
            Enviamos un código a <strong>{workEmail}</strong>.
          </p>
          <div>
            <label className="label" htmlFor="code">
              Código de 6 dígitos
            </label>
            <input
              id="code"
              className="input !w-36 tracking-[0.35em] text-center"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <button className="btn self-start" disabled={loading || resending} type="submit">
            {loading ? "Verificando..." : "Verificar"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {resent ? (
            <p className="text-sm text-green-600">Te enviamos un código nuevo.</p>
          ) : null}
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              className="text-xs text-ink/60 underline disabled:opacity-50"
              disabled={loading || resending}
              onClick={resendCode}
            >
              {resending ? "Enviando..." : "Solicitar nuevo código"}
            </button>
            <button
              type="button"
              className="text-xs text-ink/60 underline"
              onClick={() => {
                setStage("start");
                setError(null);
                setCode("");
                setResent(false);
              }}
            >
              Usar otro email laboral
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
