import { CalculatorForm } from "@/components/CalculatorForm";
import { auth } from "@/server/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          What is your salary <em>actually</em> worth?
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink/70">
          Veil converts an Argentine net salary into USD Blue and IPC-adjusted pesos so
          you can see how much purchasing power you've gained or lost. Verified professionals
          can also contribute and compare against their cohort, anonymously.
        </p>
      </section>
      <CalculatorForm loggedIn={Boolean(session?.profileId)} />
    </div>
  );
}
