"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/* The pieces of a centred, step-by-step flow (New project, Upload contract):
   the step bar, a heading per step, and Back / Skip / Next. */

export type Step = { label: string; optional?: boolean };

export function StepBar({ steps, step }: { steps: Step[]; step: number }) {
  return (
    <ol aria-label="Steps" className="mx-auto flex w-full max-w-lg items-center gap-2 text-[13px]">
      {steps.map((s, i) => (
        <li key={s.label} aria-current={i === step ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
          <span className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
            i < step ? "bg-[var(--brand-primary-800)] text-white" : i === step ? "border-2 border-[var(--brand-primary-800)] text-[var(--brand-primary-800)]" : "border border-[var(--ink-300)] text-[var(--ink-500)]",
          )}>
            {i < step ? <Check size={12} aria-hidden /> : i + 1}
          </span>
          <span className={cn("whitespace-nowrap", i === step ? "font-medium text-[var(--ink-900)]" : "text-[var(--ink-600)]")}>
            {s.label}{s.optional && <span className="text-[var(--ink-500)]"> (optional)</span>}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="h-px min-w-4 flex-1 bg-[var(--ink-200)]" />}
        </li>
      ))}
    </ol>
  );
}

export function StepTitle({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="mb-5 text-center">
      <h2 className="text-[20px] font-medium text-[var(--ink-900)]">{title}</h2>
      <p className="mt-1 text-[13px] text-[var(--ink-600)]">{body}</p>
    </div>
  );
}

export function StepFooter({ onBack, onSkip, onNext, next }: { onBack?: () => void; onSkip?: () => void; onNext: () => void; next: string }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      {onBack && <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden />Back</Button>}
      <span className="flex-1" />
      {onSkip && <Button type="button" variant="ghost" onClick={onSkip}>Skip</Button>}
      <Button type="button" onClick={onNext}>{next}<ArrowRight size={16} aria-hidden /></Button>
    </div>
  );
}
