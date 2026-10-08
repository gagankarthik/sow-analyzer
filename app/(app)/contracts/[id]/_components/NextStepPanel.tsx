"use client";

// Requirement 3: the one recommended next step. The banner on the contract
// page carries the sentence; these are its two halves: the detail (for a
// send-back, the clauses and the language you want; for an escalation, the
// office) and the actions (one primary button, the menu, the redline).

import { Building2, CheckCircle2 } from "@/components/ui/icons";
import { TierBadge } from "@/components/govern/primitives";
import { ContractActionsMenu, NextStepButton, RedlineButton } from "@/components/govern/actions";
import { latestSentBackClauses, latestSentBackNote } from "@/lib/govern/redline-docx";
import { OFFICE_LABEL } from "@/lib/govern/labels";
import { useGovernFeature } from "@/lib/govern/queries";
import type { ContractDetail } from "@/lib/govern/types";
import { SuggestedLanguage } from "./SectionParts";

const MAX_CLAUSES = 4;

function redlineFor(c: ContractDetail) {
  const step = c.nextStep;
  // A redline is useful while sending back, and while the other side has it.
  return step.action === "send_back" && step.clauses.length
    ? { clauses: step.clauses.map((cl) => ({ clauseType: cl.clauseType, label: cl.label, suggestedLanguage: cl.suggestedLanguage })), note: null }
    : c.state === "sent_back"
      ? { clauses: latestSentBackClauses(c), note: latestSentBackNote(c) }
      : null;
}

/** What the next step involves; null when there is nothing to add to the headline. */
export function NextStepDetail({ contract: c }: { contract: ContractDetail }) {
  const step = c.nextStep;
  const isObligationsOn = useGovernFeature("obligations");
  const clauses = step.clauses.slice(0, MAX_CLAUSES);
  const signedNote = step.action === "none" && c.state === "signed";
  if (!step.detail && !(step.action === "escalate" && step.office) && clauses.length === 0 && !signedNote) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      {step.detail && <p className="max-w-[44rem] text-sm leading-relaxed text-[var(--ink-700)]">{step.detail}</p>}

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

      {signedNote && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--success)]"><CheckCircle2 size={15} />{isObligationsOn ? "Signed. Its obligations are tracked under Money." : "Signed."}</p>
      )}
    </div>
  );
}

/** The one primary action for this step, the full actions menu and the redline. */
export function NextStepActions({ contract: c, onUploadRevision }: { contract: ContractDetail; onUploadRevision: () => void }) {
  const redline = redlineFor(c);
  return (
    <>
      <NextStepButton contract={c} size="lg" onUploadRevision={onUploadRevision} quietWhenNone className="min-w-0 max-sm:flex-1" />
      <ContractActionsMenu contract={c} size="lg" align="end" />
      {redline && <RedlineButton contract={c} clauses={redline.clauses} note={redline.note} size="lg" variant="ghost" />}
    </>
  );
}
