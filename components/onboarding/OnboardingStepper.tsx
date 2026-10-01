import { Check } from "@/components/ui/icons";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/** Where the user is in setup. Names show from `sm`; below that the current
 *  step is spelled out in one line under the markers. */
export function OnboardingStepper({ current }: { current: OnboardingStep }) {
  const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Setup progress">
      <ol className="flex items-center">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
              className={cn("flex items-center", i > 0 && "flex-1")}
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn("mx-2 h-px flex-1", done || active ? "bg-[var(--brand-primary-600)]" : "bg-[var(--ink-200)]")}
                />
              )}
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  done && "bg-[var(--brand-primary-600)] text-white",
                  active && "bg-[var(--brand-primary-600)] text-white ring-4 ring-[var(--brand-primary-100)]",
                  !done && !active && "border border-[var(--ink-300)] bg-card text-muted-foreground",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "ml-2 hidden whitespace-nowrap text-sm sm:inline",
                  active ? "font-semibold text-foreground" : done ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-[var(--ink-600)] sm:hidden">
        Step {currentIdx + 1} of {ONBOARDING_STEPS.length}:{" "}
        <span className="font-semibold text-foreground">{ONBOARDING_STEPS[currentIdx]?.label}</span>
      </p>
    </nav>
  );
}
