"use client";

// The workflow board: the Contracts list laid out by stage. Top to bottom,
// the same as the Contracts table: the title with Upload; the shared view
// tabs with counts and, on the same row, the Table / Board switch (Table is
// /contracts, on the same view); one filter row; then the board. Four lanes
// show at a time, the stages before or after signature, picked by the phase
// switch; a card opens the preview panel. Status changes only through
// actions people take (from the preview or the contract page), so the
// board has no drag-and-drop. The view lives in the URL (?view=).

import { byEdition } from "@/lib/edition-runtime";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowSkeleton } from "./_components/WorkflowSkeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { Plus, Search } from "@/components/ui/icons";
import { LayoutSwitch, ViewTabs } from "@/components/ds/ViewTabs";
import { isForbidden } from "@/lib/api";
import { PRE_SIGNATURE_STAGES, STAGES } from "@/lib/govern/labels";
import { LIST_TABS } from "@/lib/govern/list-views";
import { NO_FILTERS, applyFilters, byUrgency, filterOptions, isFiltering, type ContractFilters } from "@/lib/govern/metrics";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS } from "@/lib/govern/views";
import { ContractPreview } from "@/components/govern/ContractPreview";
import { PreviewContext } from "./_components/preview-context";
import type { Stage } from "@/lib/govern/types";
import { BoardFilters } from "./_components/BoardFilters";
import { PhaseSwitch, StageLane, phaseOf, summariseStage, type StageSummary } from "./_components/StageLane";

const DEFAULT_TAB = "in-progress";

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
  const viewParam = params.get("view") ?? "";
  const tabId = LIST_TABS.some((t) => t.id === viewParam) ? viewParam : DEFAULT_TAB;
  const me = useGovernMe().data?.email?.toLowerCase() ?? null;
  const [now] = useState(() => Date.now());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const closePreview = useCallback(() => setPreviewId(null), []);
  const [showClosed, setShowClosed] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const [pickedStage, setPickedStage] = useState<Stage | null>(null);

  const { data, isLoading, isError, error, refetch } = useContracts(showClosed);
  const all = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  // Typing in the search box stays smooth on a large board.
  const deferredFilters = useDeferredValue(filters);

  const tabs = useMemo(() => LIST_TABS.map((t) => {
    const v = CONTRACT_VIEWS.find((x) => x.id === t.id)!;
    return { ...t, count: all.filter((c) => v.test(c, { me, now })).length, test: v.test };
  }), [all, me, now]);
  const tab = tabs.find((t) => t.id === tabId)!;
  // "All open" keeps closed agreements when the Status filter asks for them.
  const inTab = useMemo(() => (tabId === DEFAULT_TAB ? all : all.filter((c) => tab.test(c, { me, now }))), [all, tab, tabId, me, now]);
  const visible = useMemo(() => applyFilters(inTab, deferredFilters).sort(byUrgency), [inTab, deferredFilters]);
  const hrefFor = (id: string) => (id === DEFAULT_TAB ? pathname : `${pathname}?view=${id}`);
  const tableHref = tabId === DEFAULT_TAB ? "/contracts" : `/contracts?view=${tabId}`;
  const options = useMemo(() => filterOptions(all), [all]);
  const summaries = useMemo(() => {
    const map = new Map<Stage, StageSummary>();
    for (const stage of STAGES) map.set(stage, summariseStage(stage, visible.filter((c) => c.stage === stage)));
    return map;
  }, [visible]);
  // The phase picked, else the first one with agreements (before signature first).
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
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Workflow</h1>
      <Button asChild variant={stateHasCta ? "outline" : "default"}>
        <Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link>
      </Button>
    </header>
  );

  if (failed) {
    return (
      <div className="app-container flex flex-col gap-3 py-6 md:py-8">
        {header}
        <StatePanel
          art="error"
          title={isForbidden(error) ? "You don't have access to the workflow" : "We couldn't load the workflow"}
          description={isForbidden(error) ? "Ask a Govern admin to give you access." : "Check your connection and try again. Nothing has been lost."}
          detail={!isForbidden(error) && error instanceof Error ? error.message : undefined}
        >
          {!isForbidden(error) && <Button size="lg" onClick={() => refetch()}>Try again</Button>}
        </StatePanel>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="app-container flex flex-col gap-3 py-6 md:py-8">
        {header}
        <StatePanel
          art="empty"
          title={showClosed ? "No contracts yet" : "No open contracts"}
          description="Uploaded contracts appear here with their next step."
        >
          <Button asChild size="lg"><Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link></Button>
          {!showClosed && <Button variant="outline" size="lg" onClick={() => setShowClosed(true)}>Show all contracts</Button>}
        </StatePanel>
      </div>
    );
  }

  return (
    <PreviewContext.Provider value={setPreviewId}>
      <div className="app-container flex flex-col gap-3 py-6 md:py-8">
        {header}
        {isError && (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
            <span className="min-w-0 flex-1">Couldn&rsquo;t refresh, so the board may be out of date.</span>
            <button type="button" onClick={() => refetch()} className="rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] max-md:min-h-11">Try again</button>
          </div>
        )}

        <ViewTabs
          label="Workflow views"
          views={tabs.map((t) => ({ id: t.id, label: t.label, alert: t.alert, count: isLoading ? null : t.count, href: hrefFor(t.id) }))}
          activeId={tabId}
          loading={isLoading}
          layout={<LayoutSwitch current="board" tableHref={tableHref} boardHref={hrefFor(tabId)} />}
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
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <PhaseSwitch summaries={summaries} selected={selectedStage} onSelect={setPickedStage} loading={isLoading} />
            {/* Four lanes of at least 260px; narrower screens scroll sideways. */}
            <div className="overflow-x-auto">
              <div className="grid min-w-[68rem] grid-cols-4 items-start gap-4">
                {phaseOf(selectedStage).map((s) => (
                  <StageLane key={s} summary={summaries.get(s)!} loading={isLoading} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}
    </PreviewContext.Provider>
  );
}
