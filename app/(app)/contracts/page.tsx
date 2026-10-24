"use client";

// Contracts: every agreement as one list. One header row: the title and the
// view picker (the open view and its count; defaults, saved and quick views,
// "New view"), then the search, the layout switch (List, Board,
// Spreadsheet), Filters, Display, Export and Upload. List (the default) is a
// compact row per contract with property chips; Spreadsheet is the table with
// columns; Board is /workflow, the same list by stage. A row opens the
// preview; selected rows get the bulk bar (edit, assign, Excel, CSV). The open
// view is the URL (?view=), and so are the search (?q=) and the layout
// (?layout=list for the compact list; the table with headings is the default).
//
// Saved views come from /views. If that API is missing or failing, presets
// and local settings keep working and the views menu says so quietly.

import * as React from "react";
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DataTable, orderColumns, type DataTableGroupBy } from "@/components/ds/DataTable";
import { TableFooterSkeleton } from "@/components/ds/skeletons";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { sortRows, useDensity } from "@/components/ds/data-table-hooks";
import { ColumnSettings } from "@/components/ds/ColumnSettings";
import { LayoutToggle, ListHeader } from "@/components/ds/ListHeader";
import { SelectionBar } from "@/components/ds/SelectionBar";
import { inDateRange, type DateRange } from "@/components/ds/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import { Download, Kanban, LayoutList, Plus, Table2 } from "@/components/ui/icons";
import { AssignDialog, availableActions } from "@/components/govern/actions";
import { ContractPreview } from "@/components/govern/ContractPreview";
import { RiskBars } from "@/components/govern/PropertyChip";
import { StageIcon } from "@/components/govern/StageIcon";
import { CONTRACT_LIST_COLUMNS, CONTRACT_LIST_COLUMN_IDS, CONTRACT_LIST_DEFAULT_HIDDEN } from "@/components/govern/contract-list-columns";
import { csvFileName, downloadCsv, rowsToCsv } from "@/lib/csv";
import { contractsTable, downloadExcel } from "@/lib/govern/export";
import { applyFilters, countActiveRules, matchesFilters, parseFilterGroup } from "@/lib/govern/filter-rules";
import {
  DEFAULT_VIEWS, DEFAULT_VIEW_ID, LIST_TABS, QUICK_VIEWS, baseOf, configFromSettings, defaultSettings, groupingFor, presetById,
  sameSettings, settingsFromConfig, splitSavedViews, type ColumnDefaults, type ListSettings,
} from "@/lib/govern/list-views";
import { listTotals } from "@/lib/govern/list-totals";
import { visibleProperties } from "@/lib/govern/list-properties";
import { STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import {
  useContracts, useDeleteView, useGovernFeature, useGovernMe, useOrgCurrency, useSavedViews, useUpdateView,
} from "@/lib/govern/queries";
import type { Contract, SavedView, Stage } from "@/lib/govern/types";
import type { ContractView } from "@/lib/govern/views";
import type { RiskLevel } from "@/lib/types";
import { BulkActions } from "./_components/BulkActions";
import { BulkEditSheet } from "./_components/BulkEditSheet";
import { ContractList, type ListGrouping } from "./_components/ContractList";
import { ContractsListSkeleton } from "./_components/ContractsListSkeleton";
import { DisplayPanel } from "./_components/DisplayPanel";
import { ExportMenu } from "./_components/ExportMenu";
import { FiltersPanel } from "./_components/FiltersPanel";
import { SearchField } from "@/components/ds/PanelControls";
import { ListFooter } from "./_components/ListFooter";
import { SaveViewDialog, type SaveViewMode } from "./_components/SaveViewDialog";
import { ViewPicker } from "./_components/ViewPicker";
import { useStoredColumns } from "./_components/use-stored-columns";

const DEFAULTS: ColumnDefaults = {
  ids: CONTRACT_LIST_COLUMN_IDS,
  hidden: CONTRACT_LIST_DEFAULT_HIDDEN,
  sort: { key: "days", dir: "desc" },
};
const SORT_OPTIONS = CONTRACT_LIST_COLUMNS.filter((c) => c.sortValue).map((c) => ({ id: c.id, label: c.header }));
const TAB_IDS = new Set(LIST_TABS.map((t) => t.id));

/** Grouped by stage in the spreadsheet: workflow order, the stage icon, the
 *  stage's name, then the count. */
const BY_STAGE: DataTableGroupBy<Contract> = {
  key: (c) => c.stage,
  order: STAGES,
  label: (k) => (
    <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink-900)]">
      <StageIcon stage={k as Stage} />
      {STAGE_LABEL[k as Stage] ?? k}
    </span>
  ),
};

/** A group bar's icon in the list layout: the stage icon, or risk bars. */
function stageGroupIcon(key: string) {
  return <StageIcon stage={key as Stage} />;
}
function riskGroupIcon(key: string) {
  return <RiskBars risk={key === "none" ? null : (key as RiskLevel)} />;
}
function groupIcon(groupBy: string | null): ((key: string) => React.ReactNode) | undefined {
  return groupBy === "stage" ? stageGroupIcon : groupBy === "risk" ? riskGroupIcon : undefined;
}

export default function ContractsPage() {
  return (
    <Suspense fallback={<ContractsListSkeleton />}>
      <Contracts />
    </Suspense>
  );
}

/** Works out which view the URL names, then mounts the list for it (a new
 *  view starts from its own settings). */
function Contracts() {
  const params = useSearchParams();
  const viewParam = params.get("view");
  const savedQ = useSavedViews("contracts");
  const savedViews = useMemo(() => savedQ.data ?? [], [savedQ.data]);

  const preset = presetById(viewParam ?? DEFAULT_VIEW_ID);
  const saved = !preset && viewParam ? savedViews.find((v) => v.id === viewParam) : undefined;
  const waiting = !preset && !saved && !!viewParam && savedQ.isLoading;
  const missing = !preset && !saved && !!viewParam && !savedQ.isLoading;
  const activeId = saved?.id ?? preset?.id ?? DEFAULT_VIEW_ID;

  if (waiting) return <ContractsListSkeleton />;
  return (
    <ContractsList
      key={activeId}
      activeId={activeId}
      saved={saved ?? null}
      base={saved ? baseOf(saved) : preset ?? presetById(DEFAULT_VIEW_ID)!}
      missing={missing}
      savedViews={savedViews}
      savedStatus={{ loading: savedQ.isLoading, error: savedQ.isError, retry: () => void savedQ.refetch() }}
    />
  );
}

function ContractsList({ activeId, saved, base, missing, savedViews, savedStatus }: {
  activeId: string;
  saved: SavedView | null;
  base: ContractView;
  missing: boolean;
  savedViews: SavedView[];
  savedStatus: { loading: boolean; error: boolean; retry: () => void };
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError, error, refetch } = useContracts(true);
  const all = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const me = useGovernMe().data?.email?.toLowerCase() ?? null;
  const currency = useOrgCurrency();
  const [now] = useState(() => Date.now());
  // Received date: a quick filter on top of the view, not saved with it.
  const [received, setReceived] = useState<DateRange | null>(null);
  const layout: "list" | "spreadsheet" = params.get("layout") === "list" ? "list" : "spreadsheet";

  /* ── Settings: a saved view carries its own; presets use this browser's layout ── */
  const [storedDensity, setStoredDensity] = useDensity("contracts-list-density", "comfortable");
  const [storedColumns, setStoredColumns] = useStoredColumns("contracts-list-columns", DEFAULTS);
  const [own, setOwn] = useState<ListSettings>(() => (saved ? settingsFromConfig(saved.config, DEFAULTS, storedDensity) : defaultSettings(DEFAULTS)));
  const settings: ListSettings = saved ? own : { ...own, columns: storedColumns, density: storedDensity };
  const baseline = useMemo(
    () => (saved ? settingsFromConfig(saved.config, DEFAULTS, storedDensity) : { ...defaultSettings(DEFAULTS), columns: storedColumns, density: storedDensity }),
    [saved, storedColumns, storedDensity],
  );
  const dirty = !sameSettings(settings, baseline);
  const update = useCallback((patch: Partial<ListSettings>) => {
    if (!saved) {
      if (patch.columns) setStoredColumns(patch.columns);
      if (patch.density) setStoredDensity(patch.density);
    }
    setOwn((s) => ({ ...s, ...patch }));
  }, [saved, setStoredColumns, setStoredDensity]);
  const baseId = saved ? saved.config?.base ?? null : base.id === "all" ? null : base.id;

  /* ── Search, kept in the URL ── */
  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q.trim().toLowerCase());
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (query) next.set("q", query);
    else next.delete("q");
    if (next.toString() !== params.toString()) router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [query, params, pathname, router]);

  /* ── Rows: base → filters → search → sort ── */
  const ctx = useMemo(() => ({ me, now }), [me, now]);
  const inBase = useMemo(() => all.filter((c) => base.test(c, ctx)), [all, base, ctx]);
  const filtered = useMemo(
    () => applyFilters(inBase, settings.filters, now).filter((c) => inDateRange(c.createdAt, received, new Date(now))),
    [inBase, settings.filters, now, received],
  );
  const searched = useMemo(() => (query
    ? filtered.filter((c) => [c.title, c.counterparty, c.sponsor, c.piName, c.department, c.owner?.name, c.owner?.email, c.huronRecordId].some((s) => s?.toLowerCase().includes(query)))
    : filtered), [filtered, query]);
  const rows = useMemo(() => {
    const col = settings.sort && CONTRACT_LIST_COLUMNS.find((c) => c.id === settings.sort!.key);
    return col?.sortValue ? sortRows(searched, col.sortValue, settings.sort!.dir) : searched;
  }, [searched, settings.sort]);
  const totals = useMemo(() => listTotals(rows, currency), [rows, currency]);

  /* ── Views: picker, counts, layout links ── */
  const { mine, shared } = useMemo(() => splitSavedViews(savedViews, me), [savedViews, me]);
  const hrefFor = useCallback(
    (id: string) => `${pathname}?view=${encodeURIComponent(id)}${layout === "list" ? "&layout=list" : ""}`,
    [pathname, layout],
  );
  const countFor = useCallback((v: ContractView | SavedView) => {
    if ("test" in v) return all.filter((c) => v.test(c, ctx)).length;
    const b = baseOf(v);
    const f = parseFilterGroup(v.config?.filters);
    return all.filter((c) => b.test(c, ctx) && matchesFilters(c, f, now)).length;
  }, [all, ctx, now]);
  const countsFor = useCallback(
    () => Object.fromEntries([...DEFAULT_VIEWS, ...QUICK_VIEWS, ...mine, ...shared].map((v) => [v.id, countFor(v)])),
    [countFor, mine, shared],
  );
  const activeLabel = saved?.name ?? LIST_TABS.find((t) => t.id === base.id)?.label ?? base.label;
  const activeCount = isLoading ? null : countFor(saved ?? base);
  // The board opens on the same view when it has it.
  const boardHref = !saved && TAB_IDS.has(activeId) && activeId !== "in-progress" ? `/workflow?view=${activeId}` : "/workflow";
  const layoutHref = (l: "list" | "spreadsheet") =>
    `${pathname}?view=${encodeURIComponent(activeId)}${l === "list" ? "&layout=list" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  /* ── Saved view actions ── */
  const [dialog, setDialog] = useState<SaveViewMode | null>(null);
  const [deleting, setDeleting] = useState<SavedView | null>(null);
  const updateView = useUpdateView("contracts");
  const deleteView = useDeleteView("contracts");
  const goTo = (id: string) => router.replace(hrefFor(id), { scroll: false });
  const saveAs = () => setDialog({ kind: "create", config: configFromSettings(baseId, settings) });
  const updateWithCurrent = async (v: SavedView) => {
    try {
      await updateView.mutateAsync({ id: v.id, patch: { config: configFromSettings(v.id === activeId ? baseId : v.config?.base ?? null, settings) } });
      toast.success(`“${v.name}” now uses the current settings`);
    } catch (e) {
      toast.error(`Couldn’t update “${v.name}”`, { description: e instanceof Error ? `${e.message} Try again.` : "Try again." });
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteView.mutateAsync(deleting.id);
      toast.success(`“${deleting.name}” deleted`);
      if (deleting.id === activeId) goTo(DEFAULT_VIEW_ID);
    } catch (e) {
      toast.error(`Couldn’t delete “${deleting.name}”`, { description: e instanceof Error ? `${e.message} Try again.` : "Try again." });
      throw e;
    }
  };

  /* ── Grouping and properties (Display) ── */
  const exportsOn = useGovernFeature("exports");
  const grouping = useMemo(
    () => (settings.groupBy === "stage" ? BY_STAGE : groupingFor(settings.groupBy, rows)),
    [settings.groupBy, rows],
  );
  const listGrouping = useMemo<ListGrouping | null>(() => {
    const g = groupingFor(settings.groupBy, rows);
    return g ? { key: g.key, label: g.label, name: g.label, order: g.order, icon: groupIcon(settings.groupBy) } : null;
  }, [settings.groupBy, rows]);
  const properties = useMemo(() => visibleProperties(settings.columns.order, settings.columns.hidden), [settings.columns]);
  const orderedColumns = useMemo(() => orderColumns(CONTRACT_LIST_COLUMNS, settings.columns.order), [settings.columns.order]);

  /* ── Export ── */
  const visibleColumns = useMemo(() => {
    const hidden = new Set(settings.columns.hidden);
    return orderedColumns.filter((c) => c.card === "title" || !hidden.has(c.id));
  }, [settings.columns.hidden, orderedColumns]);
  const [exporting, setExporting] = useState(false);
  const exportCsv = (list: Contract[] = rows) => {
    const csv = rowsToCsv(visibleColumns.map((c) => ({
      header: c.header,
      value: (r: Contract) => c.exportValue?.(r) ?? (() => { const v = c.sortValue?.(r); return v instanceof Date ? v.toISOString() : v ?? null; })(),
    })), list);
    downloadCsv(csvFileName("contracts"), csv);
    toast.success(`${plural(list.length, "contract")} exported to CSV`);
  };
  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadExcel({ title: `${activeLabel}: ${plural(rows.length, "contract")}`, fileBase: "govern-contracts", tables: [contractsTable("Contracts", rows)] });
      toast.success("Excel file downloaded");
    } catch (e) {
      toast.error("Couldn’t create the file", { description: e instanceof Error ? `${e.message} Try again.` : "Try again." });
    } finally {
      setExporting(false);
    }
  };

  /* ── Selection, preview, bulk edit, inline assign ── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contract[] | null>(null);
  const [assigning, setAssigning] = useState<Contract | null>(null);
  const preview = previewId ? all.find((c) => c.contractId === previewId) ?? null : null;
  const closePreview = useCallback(() => setPreviewId(null), []);
  const selectedRows = useMemo(() => rows.filter((c) => selected.has(c.contractId)), [rows, selected]);
  const canAssign = useCallback((c: Contract) => availableActions(c).includes("assign"), []);

  /* ── Filter helpers ── */
  const owners = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of all) if (c.owner?.email) m.set(c.owner.email.toLowerCase(), c.owner.name || c.owner.email);
    return [...m.entries()].map(([email, label]) => ({ email, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [all]);
  const suggestions = useMemo(() => ({
    owner: owners.map((o) => o.email),
    counterparty: [...new Set(all.map((c) => c.counterparty || c.sponsor).filter((s): s is string => !!s))].sort(),
    department: [...new Set(all.map((c) => c.department).filter((s): s is string => !!s))].sort(),
  }), [all, owners]);
  const filtering = !!query || countActiveRules(settings.filters) > 0 || received !== null;
  const clearFilters = () => { setQ(""); setReceived(null); update({ filters: { match: "all", rules: [] } }); };

  const failed = isError && !data;
  const isFiltered = filtering || (base.id !== "all" && all.length > 0);
  // The empty panel carries its own filled Upload; the header's steps back to outline.
  const showsEmpty = !isLoading && !failed && all.length === 0;
  const state = isLoading ? "loading" : failed ? "error" : "ready";

  const layoutItems = [
    { id: "list", label: "List", href: layoutHref("list"), icon: <LayoutList size={16} aria-hidden /> },
    { id: "board", label: "Board", href: boardHref, icon: <Kanban size={16} aria-hidden /> },
    { id: "spreadsheet", label: "Spreadsheet", href: layoutHref("spreadsheet"), icon: <Table2 size={16} aria-hidden /> },
  ];
  const emptyPanel = (
    <StatePanel art="empty" title="No contracts yet" description="Upload a contract. Sonar reads it, checks it against your matrix and lists it here.">
      <Button asChild size="lg"><Link href="/projects/upload"><Plus size={16} />Upload contract</Link></Button>
    </StatePanel>
  );
  const bulk = (chosen: Contract[]) => (
    <BulkActions contracts={chosen} viewLabel={activeLabel} onDone={() => setSelected(new Set())} onEditFields={() => setEditing(chosen)} />
  );
  const footer = rows.length > 0 ? <ListFooter totals={totals} currency={currency} /> : undefined;
  const searchLabel = `Search ${activeLabel.toLowerCase()}`;

  return (
    <div className="flex flex-col pb-10">
      <ListHeader
        title="Contracts"
        views={
          <ViewPicker
            activeId={activeId}
            activeLabel={activeLabel}
            activeCount={activeCount}
            defaults={DEFAULT_VIEWS}
            quick={QUICK_VIEWS}
            mine={mine}
            shared={shared}
            countsFor={countsFor}
            hrefFor={hrefFor}
            saved={savedStatus}
            onEdit={(v) => setDialog({ kind: "edit", view: v })}
            onUpdate={(v) => void updateWithCurrent(v)}
            onDelete={setDeleting}
            onNavigate={() => setSelected(new Set())}
            onNewView={saveAs}
            dirty={dirty}
            onUpdateActive={saved?.canEdit ? () => void updateWithCurrent(saved) : undefined}
          />
        }
      >
        <SearchField label={searchLabel} value={q} onChange={setQ} className="hidden w-52 lg:block xl:w-60" />
        <LayoutToggle items={layoutItems} current={layout} />
        <FiltersPanel
          filters={settings.filters}
          onFilters={(filters) => update({ filters })}
          q={q}
          onQ={setQ}
          searchLabel={searchLabel}
          owners={owners}
          me={me}
          suggestions={suggestions}
          received={received}
          onReceived={setReceived}
          onClear={clearFilters}
        />
        <DisplayPanel
          settings={settings}
          onSettings={update}
          sortOptions={SORT_OPTIONS}
          properties={orderedColumns.filter((c) => c.card !== "title").map((c) => ({ id: c.id, label: c.header }))}
          layout={layout}
        />
        {exportsOn && <ExportMenu csv={() => exportCsv()} excel={() => void exportExcel()} busy={exporting} />}
        <Button asChild size="sm" variant={showsEmpty ? "outline" : "default"} className="h-8 max-md:h-10">
          <Link href="/projects/upload" aria-label="Upload contract">
            <Plus size={16} aria-hidden />
            <span aria-hidden className="max-sm:hidden">Upload contract</span>
          </Link>
        </Button>
      </ListHeader>

      {missing && (
        <p role="status" className="app-container pt-3 text-[12px] text-[var(--ink-600)]">
          That saved view isn’t available: it may have been deleted or not shared with you{savedStatus.error ? ", or saved views can’t load right now" : ""}. Showing {base.label.toLowerCase()} instead.
        </p>
      )}

      {layout === "list" ? (
        <>
          <ContractList
            caption={activeLabel}
            rows={rows}
            grouping={listGrouping}
            properties={properties}
            density={settings.density}
            selection={{ selected, onChange: setSelected }}
            activeId={previewId}
            onOpen={(c) => setPreviewId(c.contractId)}
            canAssign={canAssign}
            onAssign={setAssigning}
            state={state}
            onRetry={() => void refetch()}
            errorDetail={error instanceof Error ? error.message : undefined}
            isFiltered={isFiltered}
            onClearFilters={filtering ? clearFilters : () => goTo("all")}
            empty={emptyPanel}
            footer={footer}
          />
          <SelectionBar count={selectedRows.length} onClear={() => setSelected(new Set())}>
            {bulk(selectedRows)}
            <button type="button" onClick={() => exportCsv(selectedRows)} className="inline-flex items-center gap-1.5 text-sm">
              <Download size={16} aria-hidden />CSV
            </button>
          </SelectionBar>
        </>
      ) : (
        <div className="app-container pt-3">
          <DataTable
            caption={activeLabel}
            noun="contracts"
            columns={CONTRACT_LIST_COLUMNS}
            rows={rows}
            getRowId={(c) => c.contractId}
            getRowLabel={(c) => `Preview ${c.title || "Untitled contract"}`}
            onRowClick={(c) => setPreviewId(c.contractId)}
            activeRowId={previewId}
            sort={settings.sort ? { columnId: settings.sort.key, direction: settings.sort.dir } : null}
            onSortChange={(s) => update({ sort: s ? { key: s.columnId, dir: s.direction } : null })}
            groupBy={grouping ?? undefined}
            columnOrder={settings.columns.order}
            onColumnOrderChange={(order) => update({ columns: { ...settings.columns, order } })}
            hiddenColumns={settings.columns.hidden}
            onHiddenColumnsChange={(hidden) => update({ columns: { ...settings.columns, hidden } })}
            onDensityChange={(density) => update({ density })}
            headerEnd={
              <ColumnSettings
                columns={orderedColumns.map((c) => ({ id: c.id, label: c.header, locked: c.card === "title" }))}
                hidden={new Set(settings.columns.hidden)}
                onHiddenChange={(id, hide) => update({ columns: { ...settings.columns, hidden: hide ? [...settings.columns.hidden, id] : settings.columns.hidden.filter((x) => x !== id) } })}
                onOrderChange={(order) => update({ columns: { ...settings.columns, order } })}
                triggerClassName="size-7 border-transparent bg-transparent"
              />
            }
            density={settings.density}
            pageSize={50}
            exportName="contracts"
            footer={footer}
            loadingFooter={<TableFooterSkeleton />}
            state={state}
            onRetry={() => void refetch()}
            errorDetail={error instanceof Error ? error.message : undefined}
            isFiltered={isFiltered}
            onClearFilters={filtering ? clearFilters : () => goTo("all")}
            selection={{ selected, onChange: setSelected }}
            bulkActions={bulk}
            empty={emptyPanel}
          />
        </div>
      )}

      {preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}
      {assigning && <AssignDialog contract={assigning} open onOpenChange={(o) => !o && setAssigning(null)} />}

      <SaveViewDialog
        mode={dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        onSaved={(v) => { if (dialog?.kind === "create") goTo(v.id); }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description={deleting?.visibility === "private" ? "The view is removed. Contracts are not changed." : "The view is removed for everyone it is shared with. Contracts are not changed."}
        confirmLabel="Delete view"
        tone="danger"
        onConfirm={confirmDelete}
      />
      <BulkEditSheet
        contracts={editing ?? []}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
}
