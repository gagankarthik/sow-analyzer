"use client";

// What changed between the version you sent back and the one that came back
// (competitive gap #8). Each changed clause is marked as one you asked for, or
// as an "Unrequested change": an edit to a clause you never sent back, which
// sponsors often make without tracking it.

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "@/components/ui/icons";
import { TierBadge } from "@/components/govern/primitives";
import { BLOCKING_TIERS, TIER_LABEL, plural } from "@/lib/govern/labels";
import { latestSentBackClauses } from "@/lib/govern/redline-docx";
import { useDiff } from "@/lib/queries/documents";
import type { ApiDiffChange } from "@/lib/types";
import type { ContractDetail, ContractVersion, MatrixClauseResult, MatrixCounts, Tier } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { BAR_TIERS } from "./TierBar";

const COLLAPSED_COUNT = 6;

interface ClassifiedChange {
  change: ApiDiffChange;
  clause: MatrixClauseResult | null;
  requested: boolean;
}

/** Matches each changed clause to the current review and to the send-back. */
function classify(c: ContractDetail, changes: ApiDiffChange[]): ClassifiedChange[] {
  const sent = latestSentBackClauses(c);
  const sentTypes = new Set(sent.map((s) => s.clauseType));
  const sentLabels = new Set(sent.map((s) => s.label.trim().toLowerCase()));
  return changes
    .map((change) => {
      const clause = c.review?.clauses.find((cl) => cl.clauseNumber && cl.clauseNumber === change.clauseNumber) ?? null;
      const requested = !!clause && (sentTypes.has(clause.clauseType) || sentLabels.has(clause.label.trim().toLowerCase()));
      return { change, clause, requested };
    })
    // Unrequested changes first: they are the ones a reviewer could miss.
    .sort((a, b) => Number(a.requested) - Number(b.requested));
}

export function RoundChanges({ contract: c, versions }: { contract: ContractDetail; versions: ContractVersion[] }) {
  const currentIndex = versions.findIndex((v) => v.docId === c.currentDocId);
  const current = versions[currentIndex];
  const previous = currentIndex > 0 ? versions[currentIndex - 1] : undefined;
  const ready = current?.status === "READY";
  const diff = useDiff(previous ? c.currentDocId : "", ready);
  const [showAll, setShowAll] = useState(false);
  const classified = useMemo(() => classify(c, diff.data?.changes ?? []), [c, diff.data]);

  if (!current || !previous) return null;

  const unrequested = classified.filter((x) => !x.requested).length;
  const shown = showAll ? classified : classified.slice(0, COLLAPSED_COUNT);

  return (
    <section aria-labelledby="round-changes-heading" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h3 id="round-changes-heading" className="text-base font-semibold text-foreground">What the other side changed</h3>
        <p className="text-sm text-[var(--ink-600)]">
          Comparing the latest version with the one before it, clause by clause.
        </p>
      </div>

      {previous.matrixCounts && current.matrixCounts && (
        <TierShift before={previous.matrixCounts} after={current.matrixCounts} />
      )}

      {!ready ? (
        <p className="text-sm text-[var(--ink-600)]">The comparison appears when Sonar has finished reading the new version.</p>
      ) : diff.isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" /></div>
      ) : diff.isError ? (
        <p className="text-sm text-[var(--ink-600)]">
          Couldn&rsquo;t compare the two versions right now.{" "}
          <button type="button" onClick={() => diff.refetch()} className="font-semibold text-[var(--brand-primary-600)] underline-offset-2 hover:underline">Try again</button>
        </p>
      ) : classified.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--ink-700)]"><CheckCircle2 size={15} className="text-[var(--success)]" />No wording changed between the two versions.</p>
      ) : (
        <>
          <p className="text-sm text-[var(--ink-700)]" aria-live="polite">
            <strong className="font-semibold text-foreground">{plural(classified.length, "clause")}</strong> changed
            {" · "}{classified.length - unrequested} you asked for
            {unrequested > 0 && <> · <strong className="font-semibold text-[var(--warning)]">{unrequested} you did not ask for</strong></>}
          </p>
          <ul className="flex flex-col gap-3">
            {shown.map((x) => <ChangeRow key={x.change.changeId} item={x} />)}
          </ul>
          {classified.length > COLLAPSED_COUNT && (
            <Button type="button" variant="outline" className="self-start" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${classified.length} changes`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

/** Tier counts before → after, for the tiers that moved. */
function TierShift({ before, after }: { before: MatrixCounts; after: MatrixCounts }) {
  const moved = BAR_TIERS.filter((t) => before[t] !== after[t]);
  if (moved.length === 0) return <p className="text-sm text-[var(--ink-600)]">The matrix result did not change.</p>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="How the matrix result moved">
      {moved.map((t) => {
        const better = BLOCKING_TIERS.has(t) ? after[t] < before[t] : t === "within" || t === "fallback" ? after[t] > before[t] : null;
        return (
          <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-100)] px-2.5 py-1 text-sm">
            <span className="text-[var(--ink-700)]">{TIER_LABEL[t]}</span>
            <span className="tabular-nums text-[var(--ink-500)]">{before[t]}</span>
            <ArrowRight size={12} className="text-[var(--ink-500)]" aria-label="to" />
            <span className={cn("font-semibold tabular-nums", better === true ? "text-[var(--success)]" : better === false ? "text-[var(--warning)]" : "text-foreground")}>{after[t]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeRow({ item: { change, clause, requested } }: { item: ClassifiedChange }) {
  const tier: Tier | null = clause?.tier ?? null;
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {clause?.label ?? `Clause ${change.clauseNumber}`}
          {clause && <span className="font-normal text-[var(--ink-600)]"> · clause {change.clauseNumber}</span>}
        </span>
        {requested ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-structure-border bg-structure-soft px-2 text-xs font-semibold text-structure-soft-fg">
            <CheckCircle2 size={12} />You asked for this
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-1 rounded-md bg-[var(--warning-soft)] px-2 text-xs font-semibold text-[var(--warning-fg)]" title="You did not send this clause back. Check the edit before approving.">
            <AlertTriangle size={12} />Unrequested change
          </span>
        )}
        {tier && <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-600)]">Now<TierBadge tier={tier} /></span>}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Wording label="Before" text={change.before} removed />
        <Wording label="After" text={change.after} />
      </div>
      {change.impactRationale && <p className="text-sm leading-relaxed text-[var(--ink-700)]">{change.impactRationale}</p>}
    </li>
  );
}

function Wording({ label, text, removed = false }: { label: string; text: string; removed?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-lg p-3", removed ? "bg-[var(--panel)]" : "bg-[var(--ink-50)] ring-1 ring-[var(--ink-200)]")}>
      <p className="text-xs font-semibold text-[var(--ink-600)]">{label}</p>
      <p className={cn("mt-1 line-clamp-6 whitespace-pre-line break-words text-sm leading-relaxed", removed ? "text-[var(--ink-600)] line-through decoration-[var(--ink-300)]" : "text-foreground")} title={text}>
        {text || "—"}
      </p>
    </div>
  );
}
