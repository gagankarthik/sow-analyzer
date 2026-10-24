"use client";

// Requirement 3: the one recommended next step. The header carries its one
// primary button (the server's recommended action), or, while signature is
// out of reach, a disabled "Send for signature" with the reason under it.
// The Overview tab carries what the step involves (its detail, the office).

import { Building2, Hourglass, Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { NextStepButton, RedlineButton, primaryAction } from "@/components/govern/actions";
import { AnalysisFailedActions } from "@/components/govern/actions/RemoveContract";
import { latestSentBackClauses, latestSentBackNote } from "@/lib/govern/redline-docx";
import { signatureBlockReason } from "@/lib/govern/contract-issues";
import { OFFICE_LABEL } from "@/lib/govern/labels";
import type { ContractDetail } from "@/lib/govern/types";

function redlineFor(c: ContractDetail) {
  const step = c.nextStep;
  // A redline is useful while sending back, and while the other side has it.
  return step.action === "send_back" && step.clauses.length
    ? { clauses: step.clauses.map((cl) => ({ clauseType: cl.clauseType, label: cl.label, suggestedLanguage: cl.suggestedLanguage })), note: null }
    : c.state === "sent_back"
      ? { clauses: latestSentBackClauses(c), note: latestSentBackNote(c) }
      : null;
}

/** What the next step involves beyond its headline: the detail and the office. */
export function NextStepDetail({ contract: c }: { contract: ContractDetail }) {
  const step = c.nextStep;
  const office = step.action === "escalate" ? step.office : null;
  if (!step.detail && !office) return null;
  return (
    <div className="flex flex-col gap-2">
      {step.detail && <p className="max-w-[62ch] text-body leading-relaxed text-fg-secondary">{step.detail}</p>}
      {office && (
        <p className="inline-flex w-fit items-center gap-2 text-body font-medium text-fg-primary">
          <Building2 size={16} aria-hidden className="text-fg-tertiary" />{OFFICE_LABEL[office]}
        </p>
      )}
    </div>
  );
}

/**
 * The page's one primary action with, when it cannot be taken, the reason in
 * one line under it. Every other action stays in the Actions menu.
 */
export function NextStepPrimary({ contract: c, openIssues, onUploadRevision }: {
  contract: ContractDetail; openIssues: number; onUploadRevision: () => void;
}) {
  if (c.nextStep.action === "analyze_anyway" || c.nextStep.action === "reanalyze") {
    return <AnalysisFailedActions contract={c} size="default" />;
  }
  const primary = primaryAction(c);
  if (primary.type !== "none") {
    return <NextStepButton contract={c} onUploadRevision={onUploadRevision} quietWhenNone className="min-w-0 max-sm:flex-1" />;
  }

  const reason = signatureBlockReason(c, openIssues);
  if (!reason) {
    return (
      <p className="inline-flex min-h-9 items-center gap-1.5 text-body text-fg-secondary">
        <Hourglass size={14} aria-hidden className="shrink-0" />{primary.label}
      </p>
    );
  }
  const reading = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button type="button" disabled aria-describedby="next-step-reason">Send for signature</Button>
      <span id="next-step-reason" className="inline-flex items-center gap-1.5 text-caption text-fg-secondary">
        {reading && <Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />}
        {reason}
      </span>
    </div>
  );
}

/** "Download redline (.docx)" while sending back or while the other side has it. */
export function NextStepRedline({ contract: c }: { contract: ContractDetail }) {
  const redline = redlineFor(c);
  if (!redline) return null;
  return <RedlineButton contract={c} clauses={redline.clauses} note={redline.note} variant="outline" />;
}
