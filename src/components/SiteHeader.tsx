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
          veil
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="text-ink/70 hover:text-ink">
                dashboard
              </Link>
              <Link href="/salaries/new" className="text-ink/70 hover:text-ink">
                add salary
              </Link>
              <Link href="/benchmark" className="text-ink/70 hover:text-ink">
                benchmark
              </Link>
              <Link href="/companies" className="text-ink/70 hover:text-ink">
                companies
              </Link>
              <button
                className="text-ink/70 hover:text-ink"
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink/70 hover:text-ink">
                log in
              </Link>
              <Link href="/signup" className="btn">
                sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
