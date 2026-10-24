"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine } from "@/components/ds/skeletons";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL } from "@/lib/govern/labels";
import { STAGE_BG } from "@/lib/govern/stage-style";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ContractCard } from "./ContractCard";

export interface StageSummary {
  stage: Stage;
  contracts: Contract[];
  /** Open agreements past their stage's target. */
  overdue: number;
}

/** A stage's agreements and how many of the open ones are past target. */
export function summariseStage(stage: Stage, contracts: Contract[]): StageSummary {
  const open = contracts.filter((c) => c.state !== "rejected" && c.state !== "closed");
  return { stage, contracts, overdue: open.filter((c) => c.slaStatus === "red").length };
}

const POST_SIGNATURE_STAGES = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));

/** The four stages of the phase `stage` belongs to. */
export function phaseOf(stage: Stage): Stage[] {
  return PRE_SIGNATURE_STAGES.includes(stage) ? PRE_SIGNATURE_STAGES : POST_SIGNATURE_STAGES;
}

/** Before or after signature: which four lanes the board shows. Each side
 *  says how many agreements it holds (and how many are past target). */
export function PhaseSwitch({ summaries, selected, onSelect, loading }: {
  summaries: Map<Stage, StageSummary>;
  selected: Stage;
  onSelect: (s: Stage) => void;
  loading: boolean;
}) {
  const phases = [
    { label: "Before signature", stages: PRE_SIGNATURE_STAGES },
    { label: "After signature", stages: POST_SIGNATURE_STAGES },
  ];
  return (
    <nav aria-label="Workflow phase">
      <div className="inline-flex h-11 overflow-hidden rounded-md border border-[var(--ink-300)] bg-surface-raised md:h-9">
        {phases.map(({ label, stages }, i) => {
          const on = stages.includes(selected);
          const count = stages.reduce((n, s) => n + (summaries.get(s)?.contracts.length ?? 0), 0);
          const overdue = stages.reduce((n, s) => n + (summaries.get(s)?.overdue ?? 0), 0);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(stages[0])}
              className={cn(
                "inline-flex h-full items-center gap-2 px-3 text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none",
                i > 0 && "border-s border-[var(--ink-300)]",
                on ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
              )}
            >
              {label}
              {loading ? <Skeleton className="h-3 w-5" /> : <span className="tabular-nums text-[var(--ink-600)]">{count.toLocaleString()}</span>}
              {!loading && overdue > 0 && <span className="tabular-nums font-semibold text-[var(--danger)]">{overdue} past target</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** One column of the board: a 4px edge in the stage's colour, the stage's
 *  name and count, then its cards. Lanes grow with their cards; the page
 *  scrolls, never the lane. */
export function StageLane({ summary, loading }: { summary: StageSummary; loading: boolean }) {
  const name = STAGE_LABEL[summary.stage];
  return (
    <section
      id={`lane-${summary.stage}`}
      aria-label={name}
      className="flex min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-lg bg-[var(--ink-100)] pb-2"
    >
      <span aria-hidden className={cn("h-1 shrink-0", STAGE_BG[summary.stage])} />
      <h2 className="flex items-baseline justify-between gap-2 px-3.5 pt-3 pb-2.5 text-[15px] font-medium text-[var(--ink-900)]">
        <span className="truncate">{name}</span>
        {loading ? (
          <Skeleton className="h-3 w-4 shrink-0" />
        ) : (
          <span className="shrink-0 font-sans text-[14px] font-semibold tabular-nums text-[var(--ink-600)]">
            {summary.contracts.length}
            <span className="sr-only"> agreements</span>
          </span>
        )}
      </h2>
      <div className="flex flex-1 flex-col gap-2 px-2" aria-busy={loading || undefined}>
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : summary.contracts.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--ink-300)] px-3 py-6 text-center text-[14px] text-[var(--ink-600)]">
            No agreements
          </p>
        ) : (
          summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} />)
        )}
      </div>
    </section>
  );
}

/** A card placeholder in the card's geometry: two text lines, then the
 *  time and the owner's avatar. */
function CardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 rounded-md border border-[var(--ink-200)] bg-surface-raised px-3.5 py-3">
      <span className="flex flex-col">
        <SkeletonLine text="text-[15px] leading-5" width="w-[80%]" />
        <SkeletonLine text="text-[14px] leading-5" width="w-[55%]" />
      </span>
      <span className="flex items-center justify-between gap-2">
        <SkeletonLine text="text-[13px]" width="w-24" />
        <Skeleton className="size-[26px] rounded-full" />
      </span>
    </div>
  );
}

/** The board before its data: the phase switch and the four lanes of the
 *  pre-signature phase, each with two card placeholders. */
export function BoardLanesSkeleton() {
  const empty: StageSummary[] = PRE_SIGNATURE_STAGES.map((stage) => ({ stage, contracts: [], overdue: 0 }));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[68rem] grid-cols-4 items-start gap-4">
        {empty.map((s) => <StageLane key={s.stage} summary={s} loading />)}
      </div>
    </div>
  );
}
