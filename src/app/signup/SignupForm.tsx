"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al registrarse");
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/verify",
      });
      if (signin?.error) throw new Error("No se pudo iniciar sesión luego del registro");
      router.push("/verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Creá tu cuenta en Veil</h1>
      <p className="text-sm text-ink/70">
        Tu identidad nunca se publica. Solo el dominio de tu email laboral verificado
        es visible, y únicamente como una insignia de empresa.
      </p>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">
            Email personal
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="name">
            Nombre visible (opcional)
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="alex"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña (mínimo 8 caracteres)
          </label>
          <input
            id="password"
            type="password"
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Creando cuenta..." : "Registrarse"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
      {googleEnabled ? (
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => signIn("google", { callbackUrl: "/verify" })}
        >
          Continuar con Google
        </button>
      ) : null}
      <p className="text-center text-sm text-ink/70">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
