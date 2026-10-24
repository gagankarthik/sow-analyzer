"use client";

// The Overview tab: the next step with who holds it and every step behind a
// toggle, Sonar's summary when there is one, and the matrix result. The open
// issues have their own tab; the e-signature panel sits above every tab.

import { useId, useState } from "react";
import { ArrowRight, ChevronDown, Loader2, Sonar } from "@/components/ui/icons";
import { Panel } from "@/components/ds/Panel";
import { ContractStepList } from "@/components/govern/StatusBanner";
import { NEXT_ACTION_LABEL, WAITING_ON_LABEL, personName } from "@/lib/govern/labels";
import { contractStateLabel, contractSteps, currentContractStep } from "@/lib/govern/steps";
import { useDocument } from "@/lib/queries/documents";
import type { ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import type { ContractTab } from "./ContractTabs";
import { NextStepDetail } from "./NextStepPanel";
import { TierBar, TierLegend, blockingCount, totalClauses } from "./TierBar";
import { SonarName } from "@/components/ui/SonarText";
const NUMBER = new Intl.NumberFormat("en-US");

function TabLink({ to, onOpen, children }: { to: ContractTab; onOpen: (tab: ContractTab) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className="inline-flex min-h-8 items-center gap-1 rounded-control text-caption font-medium text-fg-link hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
    >
      {children}<ArrowRight size={12} aria-hidden />
    </button>
  );
}

/** Who holds the step: the side it waits on, then the people on it. */
function holderOf(c: ContractDetail): string {
  const step = currentContractStep(c);
  const people = (step?.people ?? [])
    .filter((p) => p.status === "current" || p.status === "waiting")
    .map((p) => (p.person ? `${personName(p.person)} (${p.role})` : p.role === "Reviewer" ? "No owner" : p.role));
  const waiting = c.waitingOn.kind === "nobody" ? null : c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind];
  return [contractStateLabel(c), waiting, ...new Set(people)].filter(Boolean).join(" · ");
}

/** The next step in words, who holds it, and every step behind a toggle. */
function NextStep({ contract: c }: { contract: ContractDetail }) {
  const [open, setOpen] = useState(false);
  const stepsId = useId();
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  return (
    <Panel title="Next step">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-fg-primary">{c.nextStep.headline || NEXT_ACTION_LABEL[c.nextStep.action]}</p>
          <p className="inline-flex flex-wrap items-center gap-x-1.5 text-caption text-[var(--ink-600)]">
            {analyzing && <><Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" /><SonarName /> is reading ·</>}
            {holderOf(c)}
          </p>
        </div>
        <NextStepDetail contract={c} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={stepsId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-8 w-fit items-center gap-1 rounded-control text-caption font-medium text-fg-link hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
        >
          <ChevronDown size={12} aria-hidden className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          {open ? "Hide steps" : "Show every step"}
        </button>
        <div id={stepsId} hidden={!open} className={cn(open && "border-t border-border-default pt-3")}>
          {open && <ContractStepList steps={contractSteps(c)} />}
        </div>
      </div>
    </Panel>
  );
}

/** Sonar's summary of the current version, read from its document. */
function SonarSummary({ contract: c }: { contract: ContractDetail }) {
  const ready = c.analysisStatus === "READY";
  const doc = useDocument(ready ? c.currentDocId : "");
  const summary = doc.data?.document.summary?.trim();
  if (!ready || !summary) return null;
  return (
    <Panel title={<span className="inline-flex items-center gap-1.5"><Sonar size={16} aria-hidden className="text-[var(--ai-ink)]" />Summary</span>}>
      <p className="max-w-[72ch] whitespace-pre-line text-body leading-relaxed text-fg-primary">{summary}</p>
    </Panel>
  );
}

function MatrixResult({ contract: c, onOpen }: { contract: ContractDetail; onOpen: (tab: ContractTab) => void }) {
  const review = c.review;
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  if (!review) {
    return (
      <Panel title="Matrix result" actions={<TabLink to="matrix" onOpen={onOpen}>Matrix</TabLink>}>
        <p className="text-body text-fg-tertiary">{analyzing ? <><SonarName /> is reading</> : "Not checked yet"}</p>
      </Panel>
    );
  }
  const total = totalClauses(review.counts);
  const fine = review.counts.within + review.counts.fallback;
  const blocking = blockingCount(review.counts);
  return (
    <Panel
      title="Matrix result"
      meta={`Version ${review.matrixVersion}`}
      actions={<TabLink to="matrix" onOpen={onOpen}>All clauses</TabLink>}
    >
      <div className="flex flex-col gap-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-caption text-fg-tertiary">Within</dt>
            <dd className="text-2xl font-semibold tabular-nums text-fg-primary">
              {NUMBER.format(fine)}<span className="text-base font-medium text-fg-tertiary"> / {NUMBER.format(total)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-tertiary">To resolve</dt>
            <dd className={blocking > 0 ? "text-2xl font-semibold tabular-nums text-[var(--warning-fg)]" : "text-2xl font-semibold tabular-nums text-fg-primary"}>
              {NUMBER.format(blocking)}
            </dd>
          </div>
        </dl>
        <TierBar counts={review.counts} />
        <TierLegend counts={review.counts} compact />
      </div>
    </Panel>
  );
}

export function OverviewTab({ contract: c, onOpen }: { contract: ContractDetail; onOpen: (tab: ContractTab) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <NextStep contract={c} />
      <SonarSummary contract={c} />
      <MatrixResult contract={c} onOpen={onOpen} />
    </div>
  );
}
