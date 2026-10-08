"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { STAGE_LABEL } from "@/lib/govern/labels";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ContractCard } from "./ContractCard";

/** Per-stage dot: a navy ramp along the road to signature, green once signed
 *  (current value), grey after. Status colours are kept for status only. */
export const STAGE_DOT: Record<Stage, string> = {
  draft: "bg-[var(--ink-400)]",
  review: "bg-[var(--navy-300)]",
  negotiation: "bg-[var(--navy-500)]",
  approval: "bg-[var(--navy-800)] dark:bg-[var(--navy-100)]",
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
}

/** Count, average days and overdue count for each stage's open contracts. */
export function summariseStage(stage: Stage, contracts: Contract[]): StageSummary {
  const open = contracts.filter((c) => c.state !== "rejected" && c.state !== "closed");
  return {
    stage,
    contracts,
    averageDays: open.length ? Math.round((open.reduce((s, c) => s + c.daysInStage, 0) / open.length) * 10) / 10 : null,
    overdue: open.filter((c) => c.slaStatus === "red").length,
  };
}

export function StageHeader({ summary, className }: { summary: StageSummary; className?: string }) {
  const { stage, contracts, averageDays, overdue } = summary;
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STAGE_DOT[stage])} aria-hidden />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{STAGE_LABEL[stage]}</h3>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--ink-600)]">
          {averageDays === null ? "—" : `avg ${averageDays} ${averageDays === 1 ? "day" : "days"}`}
          {overdue > 0 && <span className="font-semibold text-[var(--danger)]"> · {overdue} overdue</span>}
        </p>
      </div>
      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ink-100)] px-2 text-xs font-semibold tabular-nums text-[var(--ink-700)]" aria-label={`${contracts.length} agreements`}>
        {contracts.length}
      </span>
    </div>
  );
}

/** One column of the wide board: a header over the canvas, the cards below
 *  it (no container card around them). Lanes scroll on their own, never the page. */
export function StageLane({ summary, loading, tall }: { summary: StageSummary; loading: boolean; tall: boolean }) {
  return (
    <section aria-label={STAGE_LABEL[summary.stage]} className="flex min-w-0 flex-col">
      <StageHeader summary={summary} className="border-b-2 border-[var(--ink-200)] px-1 pb-3" />
      <div className={cn("flex flex-1 flex-col gap-3 overflow-y-auto pt-3", tall ? "max-h-[70vh] min-h-48" : "max-h-[46vh] min-h-24")}>
        {loading ? (
          <>
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </>
        ) : summary.contracts.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--ink-500)]">Nothing here</p>
        ) : (
          summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} />)
        )}
      </div>
    </section>
  );
}
