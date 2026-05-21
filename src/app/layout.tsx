import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/server/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veil",
  description:
    "Argentina's verified, anonymous source of truth for salaries and real purchasing power.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="border-b border-ink/10 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight text-ink">
              veil
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {session?.profileId ? (
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
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="text-ink/70 hover:text-ink" type="submit">
                      sign out
                    </button>
                  </form>
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
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-ink/50">
          Veil is anonymous by design. Only your company domain is stored.
        </footer>
      </body>
    </html>
  );
}
