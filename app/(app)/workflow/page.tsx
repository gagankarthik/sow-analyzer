"use client";

// The workflow board (Requirement 2): the eight stages in plain words, every
// card with its owner, clock, blockers and one next step. Status changes only
// through actions people take, so there is no drag-and-drop.
//
// Layout: a pipeline strip shows all eight stages in order with their counts
// and health; selecting a stage drives the board. On a wide screen the board
// shows the four lanes of that stage's phase (before or after signature);
// below that it shows the selected stage's agreements as a grid.

import { EditionOnly } from "@/components/govern/EditionOnly";
import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { FileSignature, Plus, Search } from "@/components/ui/icons";
import { isForbidden } from "@/lib/api";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import { NO_FILTERS, applyFilters, byUrgency, filterOptions, isFiltering, isOpen, type ContractFilters } from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import type { Stage } from "@/lib/govern/types";
import { BoardFilters } from "./_components/BoardFilters";
import { ContractCard } from "./_components/ContractCard";
import { PipelineStrip, StageLane, summariseStage, type StageSummary } from "./_components/StageLane";

const POST_SIGNATURE_STAGES = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));

export default function WorkflowPage() {
  const [showClosed, setShowClosed] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pickedStage, setPickedStage] = useState<Stage | null>(null);

  const query = useContracts(showClosed);
  const { data, isLoading, isError, error, refetch } = query;
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
          <EditionOnly feature="sowDrafting"><Button asChild variant="outline" size="lg" className="md:h-9">
            <Link href="/draft"><FileSignature size={15} />Draft an SOW</Link>
          </Button></EditionOnly>
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
          description="Upload an agreement to start. Sonar checks it against your matrix and it appears here with its next step."
        >
          <Button asChild size="lg"><Link href="/projects/upload"><Plus size={15} />Upload an agreement</Link></Button>
          {!showClosed && <Button variant="outline" size="lg" onClick={() => setShowClosed(true)}>Show all agreements</Button>}
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
            <p className="mt-1.5 max-w-sm text-sm text-[var(--ink-600)]">Try a sponsor name, a PI&rsquo;s surname or a department. Closed and rejected agreements show under All.</p>
            <Button variant="outline" size="lg" className="mt-5" onClick={() => setFilters(NO_FILTERS)}>Clear search and filters</Button>
          </div>
        ) : (
          <>
            <PipelineStrip summaries={summaries} selected={selectedStage} onSelect={setPickedStage} loading={isLoading} />

            {/* Wide screens: the four lanes of the selected stage's phase. */}
            <div className="hidden grid-cols-4 items-stretch gap-3 xl:grid">
              {(PRE_SIGNATURE_STAGES.includes(selectedStage) ? PRE_SIGNATURE_STAGES : POST_SIGNATURE_STAGES).map((s) => (
                <StageLane key={s} summary={summaries.get(s)!} loading={isLoading} highlighted={s === selectedStage} />
              ))}
            </div>

            {/* iPad and phone: the selected stage's agreements. */}
            <div className="xl:hidden">
              <StageGrid summary={summaries.get(selectedStage)!} loading={isLoading} />
            </div>
          </>
        )}
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
