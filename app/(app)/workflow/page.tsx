"use client";

// The workflow board (Requirement 2): the eight stages in plain words, every
// card with its owner, clock, blockers and one next step. Status changes only
// through actions people take, so there is no drag-and-drop.
//
// Layout: on a wide screen the board shows two bands of four lanes (before and
// after signature), so all eight stages fit without sideways scrolling. Below
// that (iPad and phone) a stage picker shows one stage at a time as a grid.

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { Plus, Search } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isForbidden } from "@/lib/api";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import { NO_FILTERS, applyFilters, byUrgency, filterOptions, isFiltering, isOpen, type ContractFilters } from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import type { Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { BoardFilters } from "./_components/BoardFilters";
import { ContractCard } from "./_components/ContractCard";
import { STAGE_DOT, StageLane, summariseStage, type StageSummary } from "./_components/StageLane";

const POST_SIGNATURE_STAGES = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));

export default function WorkflowPage() {
  const [showClosed, setShowClosed] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pickedStage, setPickedStage] = useState<Stage | null>(null);

  const query = useContracts(showClosed);
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt, refetch } = query;
  const all = useMemo(() => data?.contracts ?? [], [data]);
  // Typing in the search box stays smooth on a large board.
  const deferredFilters = useDeferredValue(filters);

  const visible = useMemo(() => applyFilters(all, deferredFilters).sort(byUrgency), [all, deferredFilters]);
  const options = useMemo(() => filterOptions(all), [all]);
  const summaries = useMemo(() => {
    const map = new Map<Stage, StageSummary>();
    for (const stage of STAGES) map.set(stage, summariseStage(stage, visible.filter((c) => c.stage === stage)));
    return map;
  }, [visible]);
  const totals = useMemo(() => {
    const open = all.filter(isOpen);
    return {
      open: open.length,
      overdue: open.filter((c) => c.slaStatus === "red").length,
      late: open.filter((c) => c.slaStatus === "amber").length,
      unassigned: open.filter((c) => !c.owner).length,
    };
  }, [all]);

  // Below the wide layout, show the stage picked, else the busiest open stage.
  const defaultStage = PRE_SIGNATURE_STAGES.find((s) => (summaries.get(s)?.contracts.length ?? 0) > 0)
    ?? STAGES.find((s) => (summaries.get(s)?.contracts.length ?? 0) > 0) ?? "review";
  const selectedStage = pickedStage ?? defaultStage;

  const failed = isError && !data;
  const filtering = isFiltering(filters);
  const noMatches = !isLoading && all.length > 0 && visible.length === 0;

  const header = (
    <PageHeader
      title="Workflow"
      subtitle="Every agreement, who has it, how long it has waited and what happens next."
      actions={
        <>
          <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />
          <Button asChild size="lg" className="md:h-9">
            <Link href="/projects/upload"><Plus size={15} strokeWidth={2.25} />New agreement</Link>
          </Button>
        </>
      }
    />
  );

  if (failed) {
    return (
      <>
        {header}
        <StatePanel
          art="error"
          title={isForbidden(error) ? "You don't have access to the workflow" : "We couldn't load the workflow"}
          description={isForbidden(error) ? "Ask a Govern admin to give you access." : "Check your connection and try again. Nothing has been lost."}
          detail={!isForbidden(error) && error instanceof Error ? error.message : undefined}
        >
          {!isForbidden(error) && <Button size="lg" onClick={() => refetch()}>Try again</Button>}
        </StatePanel>
      </>
    );
  }

  if (!isLoading && all.length === 0 && !filtering) {
    return (
      <>
        {header}
        <StatePanel
          art="empty"
          title={showClosed ? "No agreements yet" : "No open agreements"}
          description="Upload an agreement to start. Sonar checks it against OSU's matrix and it appears here with its next step."
        >
          <Button asChild size="lg"><Link href="/projects/upload"><Plus size={15} />Upload an agreement</Link></Button>
          {!showClosed && <Button variant="outline" size="lg" onClick={() => setShowClosed(true)}>Show rejected &amp; closed</Button>}
        </StatePanel>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="app-container app-page">
        {isError && (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] p-3.5 text-sm text-[var(--danger)]">
            <span className="min-w-0 flex-1">Couldn&rsquo;t refresh, so the board may be out of date.</span>
            <button type="button" onClick={() => refetch()} className="rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">Try again</button>
          </div>
        )}

        <BoardFilters
          filters={filters}
          onChange={setFilters}
          options={options}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          showClosed={showClosed}
          onShowClosedChange={setShowClosed}
        />

        <p className="-mt-1 text-sm text-[var(--ink-600)]" aria-live="polite">
          {isLoading ? "Loading agreements…" : filtering ? (
            <>Showing <strong className="font-semibold text-foreground">{visible.length}</strong> of {plural(all.length, "agreement")}{" · "}
              <button type="button" className="font-semibold text-[var(--brand-primary-600)] underline-offset-2 hover:underline" onClick={() => setFilters(NO_FILTERS)}>Clear search and filters</button>
            </>
          ) : (
            <>
              <strong className="font-semibold text-foreground">{totals.open}</strong> open
              {totals.overdue > 0 && <> · <span className="font-semibold text-[var(--danger)]">{totals.overdue} overdue</span></>}
              {totals.late > 0 && <> · <span className="font-semibold text-[var(--warning)]">{totals.late} running late</span></>}
              {totals.unassigned > 0 && <> · {totals.unassigned} unassigned</>}
            </>
          )}
        </p>

        {noMatches ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center">
            <Search size={22} className="mb-3 text-[var(--ink-500)]" />
            <h2 className="text-lg font-semibold text-foreground">Nothing matches &ldquo;{filters.q || "these filters"}&rdquo;</h2>
            <p className="mt-1.5 max-w-sm text-sm text-[var(--ink-600)]">Try a sponsor name, a PI&rsquo;s surname or a department. Rejected and closed agreements only show when you switch them on.</p>
            <Button variant="outline" size="lg" className="mt-5" onClick={() => setFilters(NO_FILTERS)}>Clear search and filters</Button>
          </div>
        ) : (
          <>
            {/* Wide screens: two bands of four lanes. */}
            <div className="hidden flex-col gap-6 xl:flex">
              <Band title="Before signature" stages={PRE_SIGNATURE_STAGES} summaries={summaries} loading={isLoading} tall />
              <Band title="After signature" stages={POST_SIGNATURE_STAGES} summaries={summaries} loading={isLoading} tall={false} />
            </div>

            {/* iPad and phone: pick a stage, see its cards. */}
            <div className="flex flex-col gap-4 xl:hidden">
              <StagePicker summaries={summaries} value={selectedStage} onChange={setPickedStage} loading={isLoading} />
              <StageGrid summary={summaries.get(selectedStage)!} loading={isLoading} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Band({ title, stages, summaries, loading, tall }: {
  title: string; stages: Stage[]; summaries: Map<Stage, StageSummary>; loading: boolean; tall: boolean;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold text-[var(--ink-800)]">{title}</h2>
      <div className="grid grid-cols-4 gap-3">
        {stages.map((s) => <StageLane key={s} summary={summaries.get(s)!} loading={loading} tall={tall} />)}
      </div>
    </section>
  );
}

function StagePicker({ summaries, value, onChange, loading }: {
  summaries: Map<Stage, StageSummary>; value: Stage; onChange: (s: Stage) => void; loading: boolean;
}) {
  const count = (s: Stage) => (loading ? "…" : String(summaries.get(s)?.contracts.length ?? 0));
  const group = (title: string, stages: Stage[]) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-[var(--ink-800)]">{title}</span>
      <div role="tablist" aria-label={title} className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-[var(--panel)] p-1">
        {stages.map((s) => {
          const on = s === value;
          const overdue = summaries.get(s)?.overdue ?? 0;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(s)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
                on ? "bg-card shadow-xs ring-1 ring-border" : "hover:bg-card/60",
              )}
            >
              <span className="flex w-full min-w-0 items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", STAGE_DOT[s])} aria-hidden />
                <span className={cn("truncate text-xs font-medium", on ? "text-foreground" : "text-[var(--ink-600)]")}>{STAGE_LABEL[s]}</span>
              </span>
              <span className="text-lg font-semibold leading-none tabular-nums text-foreground">
                {count(s)}
                {overdue > 0 && <span className="ml-1 text-xs font-semibold text-[var(--danger)]">· {overdue} late</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Phones: a plain select. */}
      <div className="flex flex-col gap-1.5 sm:hidden">
        <label htmlFor="stage-select" className="text-xs font-semibold text-[var(--ink-600)]">Stage</label>
        <Select value={value} onValueChange={(v) => onChange(v as Stage)}>
          <SelectTrigger id="stage-select" className="h-11 w-full bg-card text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]} ({count(s)})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* iPad: two segmented rows. */}
      <div className="hidden grid-cols-1 gap-3 sm:grid lg:grid-cols-2">
        {group("Before signature", PRE_SIGNATURE_STAGES)}
        {group("After signature", POST_SIGNATURE_STAGES)}
      </div>
    </>
  );
}

function StageGrid({ summary, loading }: { summary: StageSummary; loading: boolean }) {
  return (
    <section aria-label={STAGE_LABEL[summary.stage]} className="flex flex-col gap-3">
      <p className="text-sm text-[var(--ink-600)]">
        <strong className="font-semibold text-foreground">{STAGE_LABEL[summary.stage]}</strong>
        {summary.averageDays !== null && <> · average {summary.averageDays} days here</>}
      </p>
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : summary.contracts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-10 text-center text-sm text-[var(--ink-600)]">No agreements in {STAGE_LABEL[summary.stage].toLowerCase()} right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} />)}
        </div>
      )}
    </section>
  );
}
