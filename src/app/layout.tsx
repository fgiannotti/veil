import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/server/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

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
        <AuthProvider session={session}>
          <SiteHeader />
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-ink/50">
            Veil is anonymous by design. Only your company domain is stored.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
