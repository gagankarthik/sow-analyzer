"use client";

// The path (UI_SPEC section 8.2): the contract's steps as connected stages,
// with the guidance for the step it is on: the next step, who holds it and
// that step's key fields. Replaces the large status banner on this page.

import { useId, useState } from "react";
import { HighlightsStrip, Path, PathGuidance, type Highlight } from "@/components/ds/Record";
import { ChevronDown, ChevronUp, Loader2 } from "@/components/ui/icons";
import { ContractStepList } from "@/components/govern/StatusBanner";
import { NEXT_ACTION_LABEL, OFFICE_LABEL, WAITING_ON_LABEL, daysLabel, personName } from "@/lib/govern/labels";
import { contractPathSteps, contractStateLabel, contractSteps, currentContractStep } from "@/lib/govern/steps";
import type { ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { NextStepDetail, NextStepRedline } from "./NextStepPanel";

const CLOSED = new Set(["rejected", "closed"]);

/** Who holds the step: the side it waits on, then the people on it. */
function holderOf(c: ContractDetail): string {
  const step = currentContractStep(c);
  const people = (step?.people ?? [])
    .filter((p) => p.status === "current" || p.status === "waiting")
    .map((p) => (p.person ? `${personName(p.person)} (${p.role})` : p.role === "Reviewer" ? "No owner" : p.role));
  const waiting = c.waitingOn.kind === "nobody" ? null : c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind];
  return [contractStateLabel(c), waiting, ...new Set(people)].filter(Boolean).join(" · ");
}

/** The fields that matter for the step the contract is on (at most five). */
function stepFields(c: ContractDetail): Highlight[] {
  const closed = CLOSED.has(c.state);
  const office = c.waitingOn.office ?? (c.nextStep.action === "escalate" ? c.nextStep.office : null);
  const gaps = c.captureGaps?.length ?? 0;
  const fields: (Highlight | null)[] = [
    c.openBlockers > 0 ? { key: "blockers", label: "Open items", value: c.openBlockers } : null,
    office ? { key: "office", label: "Office", value: OFFICE_LABEL[office] } : null,
    c.value === null && !closed ? { key: "value", label: "Value", value: "Missing" } : null,
    gaps > 0 && !closed ? { key: "gaps", label: "Missing details", value: gaps } : null,
    c.targetDays && !closed ? { key: "target", label: "Step target", value: daysLabel(c.targetDays) } : null,
    c.rounds > 0 ? { key: "round", label: "Round", value: c.rounds + 1 } : null,
  ];
  return fields.filter((f): f is Highlight => f !== null).slice(0, 5);
}

export function ContractPath({ contract: c }: { contract: ContractDetail }) {
  const [open, setOpen] = useState(false);
  const stepsId = useId();
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  const title = c.nextStep.headline || NEXT_ACTION_LABEL[c.nextStep.action];
  const fields = stepFields(c);

  return (
    <Path steps={contractPathSteps(c)} label="Contract stages">
      <PathGuidance
        title={title}
        holder={
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {analyzing && <><Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />Sonar is reading ·</>}
            {holderOf(c)}
          </span>
        }
        action={<NextStepRedline contract={c} />}
      >
        <div className="mt-2 flex flex-col gap-3">
          {fields.length > 0 && <HighlightsStrip items={fields} />}
          <NextStepDetail contract={c} />
          <button
            type="button"
            aria-expanded={open}
            aria-controls={stepsId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-8 w-fit items-center gap-1 rounded-control text-caption font-medium text-fg-link hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
          >
            {open ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
            {open ? "Hide steps" : "Show every step"}
          </button>
          <div id={stepsId} hidden={!open} className={cn(open && "border-t border-border-default pt-3")}>
            {open && <ContractStepList steps={contractSteps(c)} />}
          </div>
        </div>
      </PathGuidance>
    </Path>
  );
}
