"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
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
      if (!res.ok) throw new Error(json.error ?? "Signup failed");
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/verify",
      });
      if (signin?.error) throw new Error("Could not sign you in after signup");
      router.push("/verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Create your Veil account</h1>
      <p className="text-sm text-ink/70">
        We never publish your identity. Only the domain of your verified work email
        is visible, and only as a badge.
      </p>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">
            Personal email
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
            Display name (optional)
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
            Password (8+ chars)
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
          {loading ? "Creating..." : "Sign up"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
      <p className="text-center text-sm text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
