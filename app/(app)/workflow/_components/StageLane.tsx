"use client";

import { ChevronRight } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL } from "@/lib/govern/labels";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ContractCard } from "./ContractCard";

/** Per-stage dot: a navy ramp along the road to signature, green once signed
 *  (current value), grey after. Status colours are kept for status only. */
export const STAGE_DOT: Record<Stage, string> = {
  draft: "bg-[var(--ink-400)]",
  review: "bg-[var(--navy-300)]",
  negotiation: "bg-[var(--navy-500)]",
  approval: "bg-[var(--navy-800)]",
  signed: "bg-[var(--success)]",
  active: "bg-[var(--success)]",
  renewal: "bg-[var(--ink-500)]",
  expired: "bg-[var(--ink-300)]",
};

export interface StageSummary {
  stage: Stage;
  contracts: Contract[];
  averageDays: number | null;
  overdue: number;
  late: number;
}

/** Count, average days and overdue/late counts for each stage's open contracts. */
export function summariseStage(stage: Stage, contracts: Contract[]): StageSummary {
  const open = contracts.filter((c) => c.state !== "rejected" && c.state !== "closed");
  return {
    stage,
    contracts,
    averageDays: open.length ? Math.round((open.reduce((s, c) => s + c.daysInStage, 0) / open.length) * 10) / 10 : null,
    overdue: open.filter((c) => c.slaStatus === "red").length,
    late: open.filter((c) => c.slaStatus === "amber").length,
  };
}

function daysText(avg: number | null): string {
  if (avg === null) return "No agreements";
  if (avg < 1) return "avg under a day";
  return `avg ${avg} ${avg === 1 ? "day" : "days"}`;
}

/* ── Pipeline strip ──────────────────────────────────────────────────────── */

/**
 * The workflow at a glance: all eight stages in order as connected steps,
 * in two groups either side of signature. Each step shows its count and its
 * health, and selecting one shows that stage's agreements on the board.
 */
export function PipelineStrip({
  summaries, selected, onSelect, loading,
}: {
  summaries: Map<Stage, StageSummary>;
  selected: Stage;
  onSelect: (s: Stage) => void;
  loading: boolean;
}) {
  const group = (title: string, stages: Stage[]) => (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ol className="flex min-w-0 items-stretch">
        {stages.map((s, i) => {
          const sum = summaries.get(s)!;
          const on = s === selected;
          const count = sum.contracts.length;
          return (
            <li key={s} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-pressed={on}
                className={cn(
                  "flex h-full min-w-[8.5rem] flex-1 flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
                  on
                    ? "border-[var(--brand-primary-400)] bg-[var(--brand-primary-50)]"
                    : "border-border bg-card hover:border-[var(--ink-300)]",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("size-2 shrink-0 rounded-full", STAGE_DOT[s])} aria-hidden />
                  <span className={cn("truncate text-xs font-medium", on ? "text-[var(--brand-primary-700)]" : "text-[var(--ink-700)]")}>
                    {STAGE_LABEL[s]}
                  </span>
                </span>
                <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
                  {loading ? <Skeleton className="h-6 w-8" /> : count}
                </span>
                <span className="truncate text-xs tabular-nums">
                  {sum.overdue > 0 ? (
                    <span className="font-semibold text-[var(--danger)]">{sum.overdue} overdue</span>
                  ) : sum.late > 0 ? (
                    <span className="font-semibold text-[var(--warning-fg)]">{sum.late} running late</span>
                  ) : (
                    <span className="text-[var(--ink-600)]">{count === 0 ? "Empty" : daysText(sum.averageDays)}</span>
                  )}
                </span>
              </button>
              {i < stages.length - 1 && (
                <ChevronRight size={16} aria-hidden className="mx-0.5 shrink-0 text-[var(--ink-400)]" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );

  const post = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));
  return (
    <nav aria-label="Workflow stages" className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[72rem] grid-cols-2 gap-6">
        {group("Before signature", PRE_SIGNATURE_STAGES)}
        {group("After signature", post)}
      </div>
    </nav>
  );
}

/* ── Board lanes ─────────────────────────────────────────────────────────── */

export function StageHeader({ summary, className }: { summary: StageSummary; className?: string }) {
  const { stage, contracts, averageDays, overdue } = summary;
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STAGE_DOT[stage])} aria-hidden />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{STAGE_LABEL[stage]}</h3>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--ink-600)]">
          {contracts.length === 0 ? "Empty" : daysText(averageDays)}
          {overdue > 0 && <span className="font-semibold text-[var(--danger)]"> · {overdue} overdue</span>}
        </p>
      </div>
      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-card px-2 text-xs font-semibold tabular-nums text-[var(--ink-700)] ring-1 ring-border" aria-label={`${contracts.length} agreements`}>
        {contracts.length}
      </span>
    </div>
  );
}

/** One column of the board: a tinted container with its header, then its
 *  cards. Lanes grow with their cards; the page scrolls, never the lane. */
export function StageLane({ summary, loading, highlighted }: { summary: StageSummary; loading: boolean; highlighted?: boolean }) {
  return (
    <section
      id={`lane-${summary.stage}`}
      aria-label={STAGE_LABEL[summary.stage]}
      className={cn(
        "flex min-w-0 scroll-mt-24 flex-col rounded-xl border bg-[var(--ink-50)] p-2 transition-colors duration-150",
        highlighted ? "border-[var(--brand-primary-300)]" : "border-border",
      )}
    >
      <StageHeader summary={summary} className="px-2 pb-3 pt-1.5" />
      <div className="flex flex-1 flex-col gap-2">
        {loading ? (
          <>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </>
        ) : summary.contracts.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ink-300)] px-3 py-8 text-center text-sm text-[var(--ink-500)]">
            No agreements
          </p>
        ) : (
          summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} />)
        )}
      </div>
    </section>
  );
}
