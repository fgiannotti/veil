import { CalculatorForm } from "@/components/CalculatorForm";
import { auth } from "@/server/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          ¿Cuánto vale realmente tu sueldo?
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink/70">
          Convertí tu sueldo neto en pesos a dólares blue y pesos ajustados por IPC
          para que veas cuánto poder adquisitivo ganaste o perdiste. Los profesionales
          verificados también pueden cargar su sueldo para compararte con los benchmarks.
        </p>
      </section>
      <CalculatorForm loggedIn={Boolean(session?.profileId)} />
    </div>
  );
}
