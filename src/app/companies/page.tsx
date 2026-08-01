import Link from "next/link";
import { auth } from "@/server/auth";
import { listKnownCompanies } from "@/server/companies/domains";

export default async function CompaniesPage() {
  const session = await auth();
  const loggedIn = Boolean(session?.profileId);
  const companies = (await listKnownCompanies()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Empresas verificadas</h1>
      <p className="text-sm text-ink/70">
        Elegí una empresa para ver su mediana y en qué lugar queda frente al resto del mercado.
        {loggedIn ? (
          <>
            {" "}
            Para el agregado de todas las empresas, usá{" "}
            <Link href="/benchmark" className="underline">
              la vista general
            </Link>
            .
          </>
        ) : (
          <> Para ver los sueldos necesitás una cuenta con al menos un sueldo publicado.</>
        )}
      </p>
      <ul className="divide-y divide-ink/10">
        {companies.map((c) => {
          const target = `/benchmark?company=${c.domain}`;
          const href = loggedIn
            ? target
            : `/login?callbackUrl=${encodeURIComponent(target)}`;
          return (
            <li key={c.domain} className="flex items-center justify-between py-3">
              <div>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-ink/50">@{c.domain}</span>
              </div>
              <Link
                href={href}
                className="text-xs text-ink/60 underline hover:text-ink"
              >
                {loggedIn ? "ver sueldos" : "ingresar para ver"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
