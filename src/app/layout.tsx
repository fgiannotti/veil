import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/server/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Veil",
  description:
    "La fuente definitiva de sueldos y poder adquisitivo real en Argentina.",
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
            © Veil {new Date().getFullYear()}
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
