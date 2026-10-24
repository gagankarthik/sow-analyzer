"use client";

// One column of the board: a header with the stage icon, the stage's name,
// its count (and how many are past target) and a collapse button, then its
// cards. Collapsed, the column becomes a narrow strip with the name running
// down it and the count; the whole strip expands it again. Columns grow
// with their cards; the board scrolls sideways, the page scrolls down.

import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine } from "@/components/ds/skeletons";
import { ChevronsLeft } from "@/components/ui/icons";
import { StageIcon } from "@/components/govern/StageIcon";
import { PRE_SIGNATURE_STAGES, STAGE_LABEL } from "@/lib/govern/labels";
import type { Contract, Stage } from "@/lib/govern/types";
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

const toggleClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-[var(--ink-200)] hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus max-md:size-10";

export function StageLane({ summary, loading, collapsed = false, onToggle, show }: {
  summary: StageSummary;
  loading: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Card properties to show. */
  show?: ReadonlySet<string>;
}) {
  const name = STAGE_LABEL[summary.stage];
  const count = summary.contracts.length;

  if (collapsed) {
    return (
      <section id={`lane-${summary.stage}`} aria-label={`${name}, collapsed`} className="flex w-10 shrink-0 flex-col self-stretch rounded-lg bg-[var(--ink-100)]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label={`Expand ${name}, ${count} agreements`}
          className="flex flex-1 flex-col items-center gap-2 rounded-lg py-3 text-[var(--ink-700)] hover:bg-[var(--ink-200)] focus-visible:outline-2 focus-visible:outline-focus"
        >
          <StageIcon stage={summary.stage} />
          <span className="text-[13px] font-semibold tabular-nums text-[var(--ink-600)]">{loading ? "" : count}</span>
          <span className="text-[13px] font-medium whitespace-nowrap text-[var(--ink-900)] [writing-mode:vertical-rl]">{name}</span>
        </button>
      </section>
    );
  }

  return (
    <section
      id={`lane-${summary.stage}`}
      aria-label={name}
      className="flex w-[272px] shrink-0 scroll-mt-24 flex-col rounded-lg bg-[var(--ink-100)] pb-2"
    >
      <div className="flex h-11 items-center gap-2 ps-3 pe-1.5">
        <StageIcon stage={summary.stage} />
        <h2 className="min-w-0 truncate text-[13px] font-semibold text-[var(--ink-900)]">{name}</h2>
        {loading ? (
          <Skeleton className="h-3 w-4 shrink-0" />
        ) : (
          <span className="shrink-0 text-[13px] tabular-nums text-[var(--ink-600)]">
            {count}
            <span className="sr-only"> agreements</span>
          </span>
        )}
        {!loading && summary.overdue > 0 && (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--danger)]">{summary.overdue} past target</span>
        )}
        {onToggle && (
          <button type="button" onClick={onToggle} aria-expanded aria-label={`Collapse ${name}`} title="Collapse" className={`ms-auto ${toggleClass}`}>
            <ChevronsLeft size={16} aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-1.5" aria-busy={loading || undefined}>
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : count === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--ink-300)] px-3 py-6 text-center text-[13px] text-[var(--ink-600)]">
            No agreements
          </p>
        ) : (
          summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} show={show} />)
        )}
      </div>
    </section>
  );
}

/** A card placeholder in the card's geometry: two text lines, then chips
 *  and the owner's avatar. */
function CardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 rounded-md border border-[var(--ink-200)] bg-surface-raised px-3 py-2.5">
      <span className="flex flex-col">
        <SkeletonLine text="text-[14px] leading-5" width="w-[80%]" />
        <SkeletonLine text="text-[13px] leading-5" width="w-[55%]" />
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="flex gap-1">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-12 rounded-md" />
        </span>
        <Skeleton className="size-5 rounded-full" />
      </span>
    </div>
  );
}

/** The board before its data: the pre-signature columns with card placeholders. */
export function BoardLanesSkeleton() {
  const empty: StageSummary[] = PRE_SIGNATURE_STAGES.map((stage) => ({ stage, contracts: [], overdue: 0 }));
  return (
    <div className="flex items-start gap-3 overflow-x-auto">
      {empty.map((s) => <StageLane key={s.stage} summary={s} loading />)}
    </div>
  );
}
