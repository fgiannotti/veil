import Link from "next/link";
import { listKnownCompanies } from "@/server/companies/domains";

export default function CompaniesPage() {
  const companies = listKnownCompanies().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Empresas verificadas</h1>
      <p className="text-sm text-ink/70">
        Estas son las empresas cuyos dominios están habilitados para verificación.
        Hacé click en una para ver el benchmark de sueldos de esa empresa.
      </p>
      <ul className="divide-y divide-ink/10">
        {companies.map((c) => (
          <li key={c.domain} className="flex items-center justify-between py-3">
            <div>
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-xs text-ink/50">@{c.domain}</span>
            </div>
            <Link
              href={`/benchmark?company=${c.domain}`}
              className="text-xs text-ink/60 underline hover:text-ink"
            >
              ver sueldos
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
