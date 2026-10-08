"use client";

// Requirement 1 on one contract: how each clause compares with your matrix,
// which version of the matrix it was checked against, and a re-check.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, FileText, Loader2, RefreshCw } from "@/components/ui/icons";
import { BeneficialBadge, TierBadge } from "@/components/govern/primitives";
import { useGovernErrorToast } from "@/components/govern/actions";
import { BLOCKING_TIERS, OFFICE_LABEL, TIERS, plural } from "@/lib/govern/labels";
import { useMatrix, useRescoreContract } from "@/lib/govern/queries";
import type { ContractDetail, MatrixClauseResult } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProvenanceMark, Section, SuggestedLanguage } from "./SectionParts";
import { TierBar, TierLegend, blockingCount, totalClauses } from "./TierBar";

type View = "action" | "all" | "beneficial";

export function MatrixSection({ contract: c }: { contract: ContractDetail }) {
  const review = c.review;
  const rescore = useRescoreContract(c.contractId);
  const matrix = useMatrix();
  const onError = useGovernErrorToast();
  const [view, setView] = useState<View>("action");

  const sorted = useMemo(
    () => [...(review?.clauses ?? [])].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)),
    [review],
  );
  const needsAction = sorted.filter((cl) => BLOCKING_TIERS.has(cl.tier) || cl.tier === "review");
  const beneficial = sorted.filter((cl) => cl.beneficial);
  const shown = view === "action" ? needsAction : view === "beneficial" ? beneficial : sorted;

  const currentVersion = matrix.data?.current.version ?? null;
  const outdated = review && currentVersion !== null && currentVersion > review.matrixVersion;
  const analysing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";

  async function recheck() {
    try {
      const updated = await rescore.mutateAsync();
      const n = updated.openBlockers;
      toast.success("Re-checked against the current matrix", { description: n ? `${plural(n, "item")} still open.` : "Nothing is blocking signature." });
    } catch (e) {
      onError(e, "re-check this contract", c.contractId);
    }
  }

  const recheckButton = (
    <Button type="button" variant={outdated ? "default" : "outline"} onClick={recheck} disabled={rescore.isPending || analysing}>
      {rescore.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      Re-check against current matrix
    </Button>
  );

  if (!review) {
    return (
      <Section title="Matrix review" description="How each clause compares with your accepted positions.">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--ink-300)] p-6">
          {analysing ? (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--ink-700)]"><Loader2 size={15} className="animate-spin motion-reduce:animate-none" />Sonar is still reading this agreement. The review appears here when it is done.</p>
          ) : (
            <>
              <p className="text-sm text-[var(--ink-700)]">This agreement has not been checked against the matrix yet.</p>
              {recheckButton}
            </>
          )}
        </div>
      </Section>
    );
  }

  const total = totalClauses(review.counts);
  const fine = review.counts.within + review.counts.fallback;
  const blocking = blockingCount(review.counts);

  return (
    <Section title="Matrix review" description="How each clause compares with your accepted positions." actions={recheckButton}>
      {/* Summary infographic */}
      <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-base leading-snug text-[var(--ink-700)]">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{fine}</span>
            <span className="text-xl font-semibold text-[var(--ink-500)]"> / {total}</span>
            <span className="ml-2">clauses are within what you accept</span>
          </p>
          <TierBar counts={review.counts} size="lg" />
          <TierLegend counts={review.counts} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {blocking > 0 && <span className="font-semibold text-[var(--warning)]">{plural(blocking, "clause")} to resolve before signature</span>}
            {review.counts.beneficial > 0 && <BeneficialBadge />}
            {review.counts.beneficial > 0 && <span className="text-[var(--ink-700)]">{plural(review.counts.beneficial, "term")} favour you</span>}
          </div>
        </div>
        <dl className="flex flex-col gap-3 border-t border-border pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div>
            <dt className="text-xs font-medium text-[var(--ink-600)]">Checked against</dt>
            <dd className="font-semibold text-foreground">Matrix version {review.matrixVersion}</dd>
            {review.matrixEffectiveDate && <dd className="text-xs text-[var(--ink-600)]">In effect from {formatDate(review.matrixEffectiveDate)}</dd>}
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--ink-600)]">Checked on</dt>
            <dd className="font-semibold text-foreground">{formatDate(review.reviewedAt)}</dd>
          </div>
          {outdated && (
            <p className="rounded-lg bg-[var(--info-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--info)]">
              Version {currentVersion} of the matrix is newer. Re-check to see this agreement against it.
            </p>
          )}
        </dl>
      </div>

      {/* Clause list */}
      <div role="group" aria-label="Show clauses" className="flex flex-wrap gap-1.5">
        {([
          ["action", "Needs a look", needsAction.length],
          ["all", "All clauses", sorted.length],
          ["beneficial", "Favours you", beneficial.length],
        ] as [View, string, number][]).map(([v, label, n]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
              view === v ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white" : "border-[var(--ink-300)] bg-card text-[var(--ink-700)] hover:border-[var(--ink-400)]",
            )}
          >
            {label}<span className="tabular-nums opacity-80">{n}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-sm text-[var(--ink-700)]">
          {view === "action" ? "No clause needs a look. Everything is within the matrix or an accepted fallback." : view === "beneficial" ? "No terms were tagged as favouring your organization." : "No clauses were checked."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((cl) => <ClauseRow key={`${cl.clauseType}-${cl.clauseNumber ?? ""}`} clause={cl} />)}
        </ul>
      )}
    </Section>
  );
}

function ClauseRow({ clause: cl }: { clause: MatrixClauseResult }) {
  const [open, setOpen] = useState(BLOCKING_TIERS.has(cl.tier));
  const panelId = `clause-${cl.clauseType}-${cl.clauseNumber ?? "x"}`;
  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{cl.label}</span>
          {cl.found !== null || cl.quote ? (
            <ProvenanceMark kind="sonar" text={cl.clauseNumber ? `Found by Sonar in clause ${cl.clauseNumber}` : "Found by Sonar"} />
          ) : cl.tier === "missing" ? (
            <span className="text-xs text-[var(--ink-600)]">Not found in the agreement</span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {cl.beneficial && <BeneficialBadge />}
          <TierBadge tier={cl.tier} />
          <ChevronDown size={16} className={cn("text-[var(--ink-500)] transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-border p-4">
          {cl.reason && <p className="text-sm leading-relaxed text-[var(--ink-700)]">{cl.reason}</p>}
          {cl.beneficial && cl.beneficialReason && (
            <p className="text-sm leading-relaxed text-[var(--success)]">Why it helps you: {cl.beneficialReason}</p>
          )}
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Compare label={cl.clauseNumber ? `In this agreement · clause ${cl.clauseNumber}` : "In this agreement"} text={cl.found} emphasis />
            <Compare label="Your standard" text={cl.standard} />
            <Compare label="Acceptable fallback" text={cl.fallback} />
          </dl>
          {cl.escalationOffice && (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-700)]">
              <Building2 size={14} />Review by {OFFICE_LABEL[cl.escalationOffice]} if it is not changed
            </p>
          )}
          {cl.suggestedLanguage && <SuggestedLanguage text={cl.suggestedLanguage} />}
          {cl.quote && (
            <details className="group border-t border-border">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--ink-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                <FileText size={12} />{cl.clauseNumber ? `Show the wording Sonar found in clause ${cl.clauseNumber}` : "Show the wording Sonar found"}
                <ChevronDown size={12} className="ml-auto transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <blockquote className="max-w-[29rem] whitespace-pre-line border-l border-[var(--ink-300)] pb-1 pl-4 text-sm leading-relaxed text-foreground">{cl.quote}</blockquote>
            </details>
          )}
        </div>
      )}
    </li>
  );
}

function Compare({ label, text, emphasis = false }: { label: string; text: string | null; emphasis?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-lg p-3", emphasis ? "bg-[var(--ink-50)] ring-1 ring-[var(--ink-200)]" : "bg-[var(--panel)]")}>
      <dt className="text-xs font-semibold text-[var(--ink-600)]">{label}</dt>
      <dd className={cn("mt-1 break-words text-sm leading-relaxed", text ? "text-foreground" : "text-[var(--ink-500)]")}>{text || "—"}</dd>
    </div>
  );
}
