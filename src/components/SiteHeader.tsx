"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function SiteHeader() {
  const { data: session } = useSession();
  const loggedIn = Boolean(session?.profileId);

  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-ink">
          bench
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="text-ink/70 hover:text-ink">
                inicio
              </Link>
              <Link href="/salaries/new" className="text-ink/70 hover:text-ink">
                cargar sueldo
              </Link>
              <Link href="/benchmark" className="text-ink/70 hover:text-ink">
                benchmark
              </Link>
              <Link href="/companies" className="text-ink/70 hover:text-ink">
                empresas
              </Link>
              <button
                className="text-ink/70 hover:text-ink"
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink/70 hover:text-ink">
                ingresar
              </Link>
              <Link href="/signup" className="btn">
                registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
