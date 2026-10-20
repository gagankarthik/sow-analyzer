"use client";

// Requirement 3: the one recommended next step. The header carries its one
// primary button (the server's recommended action); the path guidance carries
// what it involves (for a send-back, the clauses and the language to ask for;
// for an escalation, the office) and the redline.

import { Building2 } from "@/components/ui/icons";
import { TierBadge } from "@/components/govern/primitives";
import { NextStepButton, RedlineButton } from "@/components/govern/actions";
import { AnalysisFailedActions } from "@/components/govern/actions/RemoveContract";
import { latestSentBackClauses, latestSentBackNote } from "@/lib/govern/redline-docx";
import { OFFICE_LABEL } from "@/lib/govern/labels";
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
  const clauses = step.clauses.slice(0, MAX_CLAUSES);
  const office = step.action === "escalate" ? step.office : null;
  if (!step.detail && !office && clauses.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {step.detail && <p className="max-w-[62ch] text-sm leading-relaxed text-fg-secondary">{step.detail}</p>}

      {office && (
        <p className="inline-flex w-fit items-center gap-2 text-sm font-medium text-fg-primary">
          <Building2 size={16} aria-hidden className="text-fg-tertiary" />{OFFICE_LABEL[office]}
        </p>
      )}

      {clauses.length > 0 && (
        <ol className="flex flex-col gap-3">
          {clauses.map((cl, i) => (
            <li key={cl.clauseType} className="flex flex-col gap-2 border-l-2 border-[var(--ink-200)] pl-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-fg-tertiary">{i + 1}.</span>
                <span className="text-sm font-semibold text-fg-primary">{cl.label}</span>
                <TierBadge tier={cl.tier} />
              </div>
              {cl.suggestedLanguage && <SuggestedLanguage text={cl.suggestedLanguage} label="Ask for" />}
            </li>
          ))}
          {step.clauses.length > MAX_CLAUSES && (
            <li className="pl-3.5 text-sm text-fg-tertiary">+{step.clauses.length - MAX_CLAUSES} more</li>
          )}
        </ol>
      )}
    </div>
  );
}

/** The page's one primary action: the server's recommended next step. */
export function NextStepPrimary({ contract: c, onUploadRevision }: { contract: ContractDetail; onUploadRevision: () => void }) {
  if (c.nextStep.action === "analyze_anyway" || c.nextStep.action === "reanalyze") {
    return <AnalysisFailedActions contract={c} size="default" />;
  }
  return <NextStepButton contract={c} onUploadRevision={onUploadRevision} quietWhenNone className="min-w-0 max-sm:flex-1" />;
}

/** "Download redline (.docx)" while sending back or while the other side has it. */
export function NextStepRedline({ contract: c }: { contract: ContractDetail }) {
  const redline = redlineFor(c);
  if (!redline) return null;
  return <RedlineButton contract={c} clauses={redline.clauses} note={redline.note} variant="outline" />;
}
