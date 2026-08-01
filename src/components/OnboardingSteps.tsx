const STEPS = [
  { id: 1, label: "Cuenta" },
  { id: 2, label: "Empresa" },
  { id: 3, label: "Sueldo" },
  { id: 4, label: "Benchmark" },
] as const;

export type OnboardingStepId = (typeof STEPS)[number]["id"];

/** Progress for account → verify → salary → benchmark. */
export function OnboardingSteps({ current }: { current: OnboardingStepId }) {
  return (
    <nav aria-label="Progreso de registro">
      <ol className="flex items-start justify-between gap-2">
        {STEPS.map((step, i) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <span
                    className={
                      done || active ? "h-px flex-1 bg-ink" : "h-px flex-1 bg-ink/20"
                    }
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <span
                  className={
                    done || active
                      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-white"
                      : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/25 text-[11px] font-medium text-ink/45"
                  }
                  aria-current={active ? "step" : undefined}
                >
                  {step.id}
                </span>
                {i < STEPS.length - 1 ? (
                  <span
                    className={done ? "h-px flex-1 bg-ink" : "h-px flex-1 bg-ink/20"}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <span
                className={
                  active
                    ? "text-center text-[11px] font-medium text-ink"
                    : done
                      ? "text-center text-[11px] text-ink/70"
                      : "text-center text-[11px] text-ink/45"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
