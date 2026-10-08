"use client";

// Requirement 3: the one recommended next step, as a sentence and a single
// button. For a send-back it lists the clauses and the language you want;
// for an escalation it names the office.

import { ArrowRight, Building2, CheckCircle2, Hourglass } from "@/components/ui/icons";
import { TierBadge } from "@/components/govern/primitives";
import { ContractActionsMenu, NextStepButton, RedlineButton } from "@/components/govern/actions";
import { latestSentBackClauses, latestSentBackNote } from "@/lib/govern/redline-docx";
import { NEXT_ACTION_LABEL, OFFICE_LABEL } from "@/lib/govern/labels";
import { useGovernFeature } from "@/lib/govern/queries";
import type { ContractDetail } from "@/lib/govern/types";
import { SuggestedLanguage } from "./SectionParts";

const MAX_CLAUSES = 4;

export function NextStepPanel({ contract: c, onUploadRevision }: { contract: ContractDetail; onUploadRevision: () => void }) {
  const step = c.nextStep;
  const isObligationsOn = useGovernFeature("obligations");
  const calm = step.action === "wait" || step.action === "none";
  const clauses = step.clauses.slice(0, MAX_CLAUSES);
  // A redline is useful while sending back, and while the other side has it.
  const redline = step.action === "send_back" && step.clauses.length
    ? { clauses: step.clauses.map((cl) => ({ clauseType: cl.clauseType, label: cl.label, suggestedLanguage: cl.suggestedLanguage })), note: null }
    : c.state === "sent_back"
      ? { clauses: latestSentBackClauses(c), note: latestSentBackNote(c) }
      : null;

  return (
    <section
      aria-labelledby="next-step-heading"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="next-step-heading" className="text-lg font-semibold flex items-start gap-2.5 leading-snug tracking-[-0.02em] text-foreground">
          <span className="mt-1 shrink-0" aria-hidden>
            {calm ? <Hourglass size={20} className="text-[var(--ink-500)]" /> : <ArrowRight size={20} className="text-[var(--brand-primary-600)]" />}
          </span>
          <span>
            <span className="sr-only">{calm ? "Where things stand: " : "Recommended next step: "}</span>
            {step.headline || NEXT_ACTION_LABEL[step.action]}
          </span>
        </h2>
        {step.detail && <p className="max-w-[36rem] text-base leading-relaxed text-[var(--ink-700)]">{step.detail}</p>}
      </div>

      {step.action === "escalate" && step.office && (
        <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-structure-border bg-structure-soft px-3 py-2 text-sm font-medium text-structure-soft-fg">
          <Building2 size={15} />Goes to {OFFICE_LABEL[step.office]}
        </p>
      )}

      {clauses.length > 0 && (
        <ol className="flex flex-col gap-3">
          {clauses.map((cl, i) => (
            <li key={cl.clauseType} className="flex flex-col gap-2 border-l-2 border-[var(--ink-200)] pl-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-[var(--ink-500)]">{i + 1}.</span>
                <span className="text-sm font-semibold text-foreground">{cl.label}</span>
                <TierBadge tier={cl.tier} />
              </div>
              {cl.suggestedLanguage && <SuggestedLanguage text={cl.suggestedLanguage} label="Ask for" />}
            </li>
          ))}
          {step.clauses.length > MAX_CLAUSES && (
            <li className="pl-3.5 text-sm text-[var(--ink-600)]">and {step.clauses.length - MAX_CLAUSES} more — all are in the send-back.</li>
          )}
        </ol>
      )}

      {step.action === "none" && c.state === "signed" && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--success)]"><CheckCircle2 size={15} />{isObligationsOn ? "Signed. Its obligations are tracked under Money." : "Signed."}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <NextStepButton contract={c} size="lg" onUploadRevision={onUploadRevision} quietWhenNone className="min-w-0 max-sm:flex-1" />
        <ContractActionsMenu contract={c} size="lg" align="start" />
        {redline && <RedlineButton contract={c} clauses={redline.clauses} note={redline.note} size="lg" variant="ghost" />}
        {calm && <span className="text-sm text-[var(--ink-600)]">Other actions are in the menu.</span>}
      </div>
    </section>
  );
}
