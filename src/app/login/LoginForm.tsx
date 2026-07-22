"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { GoogleIcon } from "@/components/GoogleIcon";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  const authError = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError === "UseCredentials"
      ? "Esa cuenta usa email y contraseña. Ingresá con tus credenciales."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Ingresando..." : "Entrar"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
      {googleEnabled ? (
        <button
          type="button"
          className="btn-secondary flex w-full items-center justify-center gap-2"
          onClick={() => signIn("google", { callbackUrl })}
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      ) : null}
      <p className="text-center text-sm text-ink/70">
        ¿Primera vez?{" "}
        <Link href="/signup" className="underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
