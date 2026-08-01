"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/domains", label: "Dominios" },
  { href: "/admin/reviews", label: "Sueldos" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-4 border-b border-ink/10 pb-3 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "font-medium text-ink" : "text-ink/60 hover:text-ink"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
