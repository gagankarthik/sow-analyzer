"use client";

// The workflow board (Requirement 2): the eight stages in plain words, every
// card with its owner, clock, blockers and one next step. Status changes only
// through actions people take, so there is no drag-and-drop.
//
// Layout (UI_SPEC sections 3, 7, 9), the same as the Contracts list: title
// row, view tabs with counts (the quick views) and the Table / Board switch,
// one 32px toolbar, then the board or the flat table. View and layout live in
// the URL. On the board, a pipeline strip (or, on wide screens, a phase
// switch) picks the stage; a card opens the preview panel.

import { byEdition } from "@/lib/edition-runtime";
import { EditionOnly } from "@/components/govern/EditionOnly";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { BoardCardSkeleton } from "@/components/ds/skeletons";
import { WorkflowSkeleton } from "./_components/WorkflowSkeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { FileSignature, Plus, Search } from "@/components/ui/icons";
import { LayoutSwitch, ViewTabs } from "@/components/ds/ViewTabs";
import { isForbidden } from "@/lib/api";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL } from "@/lib/govern/labels";
import { NO_FILTERS, applyFilters, byUrgency, filterOptions, isFiltering, type ContractFilters } from "@/lib/govern/metrics";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS } from "@/lib/govern/views";
import { ContractPreview } from "@/components/govern/ContractPreview";
import { WorkflowList } from "./_components/WorkflowList";
import { PreviewContext } from "./_components/preview-context";
import type { Stage } from "@/lib/govern/types";
import { BoardFilters } from "./_components/BoardFilters";
import { ContractCard } from "./_components/ContractCard";
import { PhaseSwitch, PipelineStrip, StageLane, summariseStage, type StageSummary } from "./_components/StageLane";

const POST_SIGNATURE_STAGES = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));

type Layout = "board" | "list";

const QUICK_VIEWS = ["in-progress", "mine", "unassigned", "overdue", "other-side"];

export default function WorkflowPage() {
  return (
    <Suspense fallback={<WorkflowSkeleton />}>
      <Workflow />
    </Suspense>
  );
}

function Workflow() {
  const params = useSearchParams();
  const pathname = usePathname();
  const quickId = QUICK_VIEWS.includes(params.get("view") ?? "") ? (params.get("view") as string) : "in-progress";
  const me = useGovernMe().data?.email?.toLowerCase() ?? null;
  const [now] = useState(() => Date.now());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const closePreview = useCallback(() => setPreviewId(null), []);
  const [showClosed, setShowClosed] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const [pickedStage, setPickedStage] = useState<Stage | null>(null);

  const query = useContracts(showClosed);
  const { data, isLoading, isError, error, refetch } = query;
  const all = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  // Typing in the search box stays smooth on a large board.
  const deferredFilters = useDeferredValue(filters);

  const quickViews = useMemo(() => QUICK_VIEWS.map((id) => {
    const v = CONTRACT_VIEWS.find((x) => x.id === id)!;
    return { id, label: id === "in-progress" ? "All open" : v.label, count: all.filter((c) => v.test(c, { me, now })).length, test: v.test };
  }), [all, me, now]);
  const quick = quickViews.find((v) => v.id === quickId)!;
  // "All open" keeps closed agreements when the Open/All switch asks for them.
  const inQuick = useMemo(() => (quickId === "in-progress" ? all : all.filter((c) => quick.test(c, { me, now }))), [all, quick, quickId, me, now]);
  const visible = useMemo(() => applyFilters(inQuick, deferredFilters).sort(byUrgency), [inQuick, deferredFilters]);
  const layout: Layout = params.get("layout") === "list" ? "list" : "board";
  const urlFor = (view: string, nextLayout: Layout) => {
    const q = new URLSearchParams();
    if (view !== "in-progress") q.set("view", view);
    if (nextLayout === "list") q.set("layout", "list");
    const qs = q.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const options = useMemo(() => filterOptions(all), [all]);
  const summaries = useMemo(() => {
    const map = new Map<Stage, StageSummary>();
    for (const stage of STAGES) map.set(stage, summariseStage(stage, visible.filter((c) => c.stage === stage)));
    return map;
  }, [visible]);
  // Below the wide layout, show the stage picked, else the busiest open stage.
  const defaultStage = PRE_SIGNATURE_STAGES.find((s) => (summaries.get(s)?.contracts.length ?? 0) > 0)
    ?? STAGES.find((s) => (summaries.get(s)?.contracts.length ?? 0) > 0) ?? "review";
  const selectedStage = pickedStage ?? defaultStage;

  const preview = previewId ? all.find((c) => c.contractId === previewId) ?? null : null;
  const failed = isError && !data;
  const filtering = isFiltering(filters);
  const noMatches = !isLoading && all.length > 0 && visible.length === 0;
  const isEmpty = !isLoading && all.length === 0 && !filtering;
  // The error and empty panels carry their own filled call to action; the header's steps back.
  const stateHasCta = (failed && !isForbidden(error)) || (!failed && isEmpty);

  const header = (
    <PageHeader
      title="Workflow"
      count={isLoading || failed ? null : visible.length}
      countLoading={isLoading}
      actions={
        <>
          <EditionOnly feature="sowDrafting"><Button asChild variant="outline" size="lg" className="md:h-8">
            <Link href="/draft"><FileSignature size={16} aria-hidden />Draft a SOW</Link>
          </Button></EditionOnly>
          <Button asChild variant={stateHasCta ? "outline" : "default"} size="lg" className="md:h-8">
            <Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link>
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

  if (isEmpty) {
    return (
      <>
        {header}
        <StatePanel
          art="empty"
          title={showClosed ? "No contracts yet" : "No open contracts"}
          description="Uploaded contracts appear here with their next step."
        >
          <Button asChild size="lg"><Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link></Button>
          {!showClosed && <Button variant="outline" size="lg" onClick={() => setShowClosed(true)}>Show all contracts</Button>}
        </StatePanel>
      </>
    );
  }

  return (
    <PreviewContext.Provider value={setPreviewId}>
      {header}
      <div className="app-container app-page">
        {isError && (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
            <span className="min-w-0 flex-1">Couldn&rsquo;t refresh, so the board may be out of date.</span>
            <button type="button" onClick={() => refetch()} className="rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] max-md:min-h-11">Try again</button>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-3">
          <ViewTabs
            label="Workflow views"
            views={quickViews.map((v) => ({ id: v.id, label: v.label, count: isLoading ? null : v.count, href: urlFor(v.id, layout) }))}
            activeId={quickId}
            loading={isLoading}
            layout={<LayoutSwitch current={layout === "list" ? "table" : "board"} tableHref={urlFor(quickId, "list")} boardHref={urlFor(quickId, "board")} />}
          />

          <BoardFilters
            filters={filters}
            onChange={setFilters}
            options={options}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
          />

        {noMatches ? (
          <div className="flex flex-col items-center border-y border-border-default px-4 py-12 text-center">
            <Search size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
            <h2 className="text-base font-semibold text-foreground">Nothing matches &ldquo;{filters.q || "these filters"}&rdquo;</h2>
            <p className="mt-1 max-w-sm text-sm text-[var(--ink-600)]">{byEdition("Search by sponsor, PI surname or department. Set Status to All to include closed agreements.", "Search by vendor, owner surname or department. Set Status to All to include closed agreements.")}</p>
            <Button variant="outline" className="mt-4" onClick={() => { setFilters(NO_FILTERS); setShowClosed(false); }}>Clear search and filters</Button>
          </div>
        ) : layout === "list" ? (
          <WorkflowList contracts={visible} loading={isLoading} previewId={previewId} onPreview={setPreviewId} />
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            {/* iPad and phone: the stages, to pick which one to show. Wide screens
                show every lane of a phase, so a phase switch is all they need. */}
            <div className="xl:hidden">
              <PipelineStrip summaries={summaries} selected={selectedStage} onSelect={setPickedStage} loading={isLoading} />
            </div>
            <PhaseSwitch summaries={summaries} selected={selectedStage} onSelect={setPickedStage} loading={isLoading} />

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
          </div>
        )}
        </div>
      </div>
      {preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}
    </PreviewContext.Provider>
  );
}

function StageGrid({ summary, loading }: { summary: StageSummary; loading: boolean }) {
  return (
    <section aria-label={STAGE_LABEL[summary.stage]} className="flex flex-col gap-3">
      <p className="text-xs text-[var(--ink-600)]">
        <strong className="text-sm font-semibold text-foreground">{STAGE_LABEL[summary.stage]}</strong>
        {summary.averageDays !== null && <span className="tabular-nums"> · avg {summary.averageDays} days</span>}
      </p>
      {loading ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <span role="status" className="sr-only">Loading agreements</span>
          {Array.from({ length: 3 }, (_, i) => <BoardCardSkeleton key={i} />)}
        </div>
      ) : summary.contracts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-8 text-center text-sm text-[var(--ink-600)]">No agreements in {STAGE_LABEL[summary.stage].toLowerCase()}.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.contracts.map((c) => <ContractCard key={c.contractId} contract={c} />)}
        </div>
      )}
    </section>
  );
}
