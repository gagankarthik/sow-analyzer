import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "@/components/ui/icons";

export type StepStatus = "complete" | "current" | "upcoming" | "failed" | "skipped";

export type Step = {
  id: string;
  label: string;
  /** Optional second line: who, when, "3 days". */
  description?: React.ReactNode;
  status: StepStatus;
};

const SPOKEN: Record<StepStatus, string> = {
  complete: "completed",
  current: "current step",
  upcoming: "not started",
  failed: "failed",
  skipped: "skipped",
};

/**
 * A linear process (intake → review → signature). An ordered list; the
 * current step has aria-current="step"; each step's state is spoken.
 * Horizontal from md, vertical below (and with `orientation="vertical"`).
 */
export function Stepper({
  steps,
  label,
  orientation = "responsive",
  className,
}: {
  steps: Step[];
  /** Accessible name: "Agreement progress". */
  label: string;
  orientation?: "responsive" | "vertical";
  className?: string;
}) {
  const horizontal = orientation === "responsive";
  return (
    <ol aria-label={label} className={cn("flex min-w-0 flex-col gap-0", horizontal && "md:flex-row", className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={s.id}
            aria-current={s.status === "current" ? "step" : undefined}
            className={cn("relative flex min-w-0 gap-3 pb-5 last:pb-0", horizontal && "md:flex-1 md:flex-col md:gap-2 md:pb-0")}
          >
            {/* connector */}
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute start-3 top-7 bottom-1 w-0.5 -translate-x-1/2 rtl:translate-x-1/2",
                  horizontal && "md:start-8 md:end-1 md:top-3 md:bottom-auto md:h-0.5 md:w-auto md:translate-x-0",
                  s.status === "complete" ? "bg-interactive" : "bg-border-default",
                )}
              />
            )}
            <StepNode status={s.status} index={i + 1} />
            <div className={cn("min-w-0 pt-0.5", horizontal && "md:pe-4 md:pt-0")}>
              <p
                className={cn(
                  "text-body font-medium",
                  s.status === "current" ? "text-fg-link" : s.status === "failed" ? "text-status-blocked-fg" : s.status === "upcoming" ? "text-fg-secondary" : "text-fg-primary",
                )}
              >
                {s.label}
                <span className="sr-only">, {SPOKEN[s.status]}</span>
              </p>
              {s.description && <p className="mt-0.5 text-caption text-fg-tertiary">{s.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepNode({ status, index }: { status: StepStatus; index: number }) {
  const base = "relative z-(--z-raised) inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold";
  if (status === "complete")
    return (
      <span aria-hidden className={cn(base, "bg-interactive text-fg-on-interactive")}>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (status === "failed")
    return (
      <span aria-hidden className={cn(base, "bg-status-blocked text-white")}>
        <X size={13} strokeWidth={3} />
      </span>
    );
  if (status === "current")
    return (
      <span aria-hidden className={cn(base, "bg-surface-raised text-fg-link ring-2 ring-interactive")}>
        {index}
      </span>
    );
  return (
    <span aria-hidden className={cn(base, "border border-dashed border-border-control bg-surface-raised text-fg-tertiary", status === "skipped" && "line-through")}>
      {index}
    </span>
  );
}
