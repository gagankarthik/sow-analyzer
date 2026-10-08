"use client";

// The contract's journey: draft → review → redlines → edits → approval →
// signature → signed. Done steps carry what happened and when; the current
// step is ringed; steps the contract did not need are dashed. Selecting a
// step opens the section that holds its detail.

import { Check, XCircle } from "@/components/ui/icons";
import { contractJourney, type JourneyStep } from "@/lib/govern/journey";
import type { ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import type { ContractTab } from "./ContractTabs";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function ContractJourney({ contract, onOpen }: { contract: ContractDetail; onOpen: (section: ContractTab) => void }) {
  const { steps, ended } = contractJourney(contract, fmt);
  const current = steps.find((s) => s.status === "current");

  return (
    <section aria-labelledby="journey-title" className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="journey-title" className="text-lg font-semibold text-foreground">Contract journey</h2>
        <p className="text-sm text-[var(--ink-600)]">
          {ended === "rejected" ? "Rejected: this agreement will not be signed."
            : ended === "closed" ? "Closed before signature."
            : current ? <>Now: <span className="font-semibold text-foreground">{current.label}</span> · {current.fact}</>
            : "Signed and in force."}
        </p>
      </div>

      {ended && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--ink-100)] px-3 py-2 text-sm text-[var(--ink-700)]">
          <XCircle size={16} aria-hidden />
          {ended === "rejected" ? "The journey stopped here. Reopen the agreement to continue it." : "The journey stopped before signature."}
        </p>
      )}

      <ol className="grid grid-cols-1 gap-0 md:grid-cols-7 md:gap-2">
        {steps.map((s, i) => (
          <li key={s.id} className="relative flex md:flex-col">
            {/* connector to the next step */}
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-[calc(50%+1.25rem)] md:top-[15px] md:h-0.5 md:w-[calc(100%-2.5rem+0.5rem)]",
                  s.status === "done" ? "bg-[var(--success)]" : "bg-[var(--ink-200)]",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => onOpen(s.section)}
              aria-current={s.status === "current" ? "step" : undefined}
              aria-label={`${s.label}: ${statusWord(s)}. ${s.fact}. Open ${s.section}.`}
              className="group relative flex w-full gap-3 rounded-lg pb-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:flex-col md:items-center md:gap-2 md:px-1 md:pb-1 md:text-center"
            >
              <Dot step={s} />
              <span className="min-w-0 pt-1 md:pt-0">
                <span className={cn("block text-sm font-semibold", s.status === "upcoming" || s.status === "skipped" ? "text-[var(--ink-600)]" : "text-foreground", "group-hover:text-[var(--brand-primary-700)]")}>
                  {s.label}
                </span>
                <span className={cn("block text-xs", s.status === "current" ? "text-[var(--brand-primary-700)]" : "text-[var(--ink-600)]")}>{s.fact}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function statusWord(s: JourneyStep): string {
  return s.status === "done" ? "done" : s.status === "current" ? "in progress" : s.status === "skipped" ? "not needed" : "not started";
}

function Dot({ step }: { step: JourneyStep }) {
  if (step.status === "done") {
    return (
      <span className="relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white" aria-hidden>
        <Check size={16} strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-card",
        step.status === "current" && "ring-[3px] ring-[var(--brand-primary-600)] ring-offset-2 ring-offset-card",
        step.status === "upcoming" && "border-2 border-[var(--ink-300)]",
        step.status === "skipped" && "border-2 border-dashed border-[var(--ink-300)]",
      )}
    >
      {step.status === "current" && <span className="size-3 rounded-full bg-[var(--brand-primary-600)]" />}
    </span>
  );
}
