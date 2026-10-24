"use client";

// The workflow board: the Contracts list laid out by stage. One header row
// like the list's: the title and the view picker (All open, Mine, Past
// target, Signed, with counts), then the search, the layout switch (List and
// Spreadsheet are /contracts on the same view), Filters, Display and
// Upload. Then one column per stage, before or after signature (or all,
// from Display), each collapsible to a narrow strip; the board scrolls
// sideways. A card opens the preview panel. Status changes only through
// actions people take (from the preview or the contract page), so the board
// has no drag-and-drop. The view lives in the URL (?view=).

import { byEdition } from "@/lib/edition-runtime";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowSkeleton } from "./_components/WorkflowSkeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { Kanban, LayoutList, Plus, Search, Table2 } from "@/components/ui/icons";
import { LayoutToggle, ListHeader } from "@/components/ds/ListHeader";
import { SearchField } from "@/components/ds/PanelControls";
import { isForbidden } from "@/lib/api";
import { STAGES } from "@/lib/govern/labels";
import { CARD_DEFAULT_HIDDEN, CARD_PROPERTY_IDS, defaultPhase, phaseStages, type BoardPhase } from "@/lib/govern/list-properties";
import { LIST_TABS, type ColumnDefaults } from "@/lib/govern/list-views";
import { NO_FILTERS, applyFilters, byUrgency, filterOptions, isFiltering, type ContractFilters } from "@/lib/govern/metrics";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS } from "@/lib/govern/views";
import { ContractPreview } from "@/components/govern/ContractPreview";
import { PreviewContext } from "./_components/preview-context";
import type { Stage } from "@/lib/govern/types";
import { BoardDisplay } from "./_components/BoardDisplay";
import { BoardFilters } from "./_components/BoardFilters";
import { BoardViews } from "./_components/BoardViews";
import { StageLane, summariseStage, type StageSummary } from "./_components/StageLane";
import { useStoredColumns } from "../contracts/_components/use-stored-columns";

const DEFAULT_TAB = "in-progress";
const CARD_DEFAULTS: ColumnDefaults = { ids: CARD_PROPERTY_IDS, hidden: CARD_DEFAULT_HIDDEN, sort: null };

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
  const [pickedPhase, setPickedPhase] = useState<BoardPhase | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Stage>>(() => new Set());
  const [cardColumns, setCardColumns] = useStoredColumns("workflow-card-properties", CARD_DEFAULTS);
  const show = useMemo(() => new Set(CARD_PROPERTY_IDS.filter((id) => !cardColumns.hidden.includes(id))), [cardColumns.hidden]);

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
  const listHref = (layout: "list" | "spreadsheet") => {
    const p = new URLSearchParams();
    if (tabId !== DEFAULT_TAB) p.set("view", tabId);
    if (layout === "spreadsheet") p.set("layout", "spreadsheet");
    return p.size ? `/contracts?${p}` : "/contracts";
  };
  const options = useMemo(() => filterOptions(all), [all]);
  const summaries = useMemo(() => {
    const map = new Map<Stage, StageSummary>();
    for (const stage of STAGES) map.set(stage, summariseStage(stage, visible.filter((c) => c.stage === stage)));
    return map;
  }, [visible]);
  // The phase picked, else the side of signature that has agreements.
  const phase = pickedPhase ?? defaultPhase((s) => summaries.get(s)?.contracts.length ?? 0);
  const toggleLane = (s: Stage) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    return next;
  });

  const preview = previewId ? all.find((c) => c.contractId === previewId) ?? null : null;
  const failed = isError && !data;
  const filtering = isFiltering(filters);
  const noMatches = !isLoading && all.length > 0 && visible.length === 0;
  const isEmpty = !isLoading && all.length === 0 && !filtering;
  // The error and empty panels carry their own filled call to action; the header's steps back.
  const stateHasCta = (failed && !isForbidden(error)) || (!failed && isEmpty);

  const header = (
    <ListHeader
      title="Contracts"
      views={
        <BoardViews
          activeId={tabId}
          views={tabs.map((t) => ({ id: t.id, label: t.label, alert: t.alert, count: isLoading ? null : t.count, href: hrefFor(t.id) }))}
        />
      }
    >
      <SearchField label="Search agreements" value={filters.q} onChange={(v) => setFilters({ ...filters, q: v })} className="hidden w-52 lg:block xl:w-60" />
      <LayoutToggle
        current="board"
        items={[
          { id: "list", label: "List", href: listHref("list"), icon: <LayoutList size={16} aria-hidden /> },
          { id: "board", label: "Board", href: hrefFor(tabId), icon: <Kanban size={16} aria-hidden /> },
          { id: "spreadsheet", label: "Spreadsheet", href: listHref("spreadsheet"), icon: <Table2 size={16} aria-hidden /> },
        ]}
      />
      <BoardFilters filters={filters} onChange={setFilters} options={options} showClosed={showClosed} onShowClosedChange={setShowClosed} />
      <BoardDisplay
        phase={phase}
        onPhase={setPickedPhase}
        summaries={summaries}
        loading={isLoading}
        hidden={cardColumns.hidden}
        onHidden={(hidden) => setCardColumns({ ...cardColumns, hidden })}
      />
      <Button asChild size="sm" variant={stateHasCta ? "outline" : "default"} className="h-8 max-md:h-10">
        <Link href="/projects/upload" aria-label="Upload contract">
          <Plus size={16} aria-hidden />
          <span aria-hidden className="max-sm:hidden">Upload contract</span>
        </Link>
      </Button>
    </ListHeader>
  );

  if (failed) {
    return (
      <div className="flex flex-col">
        {header}
        <div className="app-container py-6">
          <StatePanel
            art="error"
            title={isForbidden(error) ? "You don't have access to the workflow" : "We couldn't load the workflow"}
            description={isForbidden(error) ? "Ask a Govern admin to give you access." : "Check your connection and try again. Nothing has been lost."}
            detail={!isForbidden(error) && error instanceof Error ? error.message : undefined}
          >
            {!isForbidden(error) && <Button size="lg" onClick={() => refetch()}>Try again</Button>}
          </StatePanel>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col">
        {header}
        <div className="app-container py-6">
          <StatePanel
            art="empty"
            title={showClosed ? "No contracts yet" : "No open contracts"}
            description="Uploaded contracts appear here with their next step."
          >
            <Button asChild size="lg"><Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link></Button>
            {!showClosed && <Button variant="outline" size="lg" onClick={() => setShowClosed(true)}>Show all contracts</Button>}
          </StatePanel>
        </div>
      </div>
    );
  }

  return (
    <PreviewContext.Provider value={setPreviewId}>
      <div className="flex flex-col">
        {header}
        {isError && (
          <div className="app-container pt-3">
            <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <span className="min-w-0 flex-1">Couldn&rsquo;t refresh, so the board may be out of date.</span>
              <button type="button" onClick={() => refetch()} className="rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] max-md:min-h-11">Try again</button>
            </div>
          </div>
        )}

        {noMatches ? (
          <div className="app-container pt-4">
            <div className="flex flex-col items-center border-y border-border-default px-4 py-12 text-center">
              <Search size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
              <h2 className="text-base font-semibold text-foreground">Nothing matches &ldquo;{filters.q || "these filters"}&rdquo;</h2>
              <p className="mt-1 max-w-sm text-sm text-[var(--ink-600)]">{byEdition("Search by sponsor, PI surname or department. Set Status to All to include closed agreements.", "Search by vendor, owner surname or department. Set Status to All to include closed agreements.")}</p>
              <Button variant="outline" className="mt-4" onClick={() => { setFilters(NO_FILTERS); setShowClosed(false); }}>Clear search and filters</Button>
            </div>
          </div>
        ) : (
          // Columns keep their width; narrower screens scroll the board sideways.
          <div className="overflow-x-auto pb-6" role="region" aria-label="Board columns" tabIndex={0}>
            <div className="app-container flex w-max min-w-full items-start gap-3 pt-4">
              {phaseStages(phase).map((s) => (
                <StageLane
                  key={s}
                  summary={summaries.get(s)!}
                  loading={isLoading}
                  collapsed={collapsed.has(s)}
                  onToggle={() => toggleLane(s)}
                  show={show}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}
    </PreviewContext.Provider>
  );
}
