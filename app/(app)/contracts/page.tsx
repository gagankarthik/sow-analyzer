"use client";

// Contracts: every agreement, in progress and signed, as one list. Views are
// tabs under the title (defaults, your saved views, "+ View", "All views");
// one toolbar of segmented quick filters, advanced filters, group, sort,
// search, density, columns and export; a flat table with a totals footer; a
// preview on row click; a bulk bar when rows are selected. The open view is
// the URL (?view=), and so is the search (?q=).
//
// Saved views come from /views. If that API is missing or failing, presets
// and local settings keep working and the views menu says so quietly.

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EditionOnly } from "@/components/govern/EditionOnly";
import { DataTable } from "@/components/ds/DataTable";
import { TableFooterSkeleton } from "@/components/ds/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnSettings } from "@/components/ds/ColumnSettings";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { sortRows, useDensity } from "@/components/ds/data-table-hooks";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import { FileSignature, Plus } from "@/components/ui/icons";
import { ContractPreview } from "@/components/govern/ContractPreview";
import { CONTRACT_LIST_COLUMNS, CONTRACT_LIST_COLUMN_IDS, CONTRACT_LIST_DEFAULT_HIDDEN } from "@/components/govern/contract-list-columns";
import { orderColumns } from "@/components/ds/DataTable";
import { csvFileName, downloadCsv, rowsToCsv } from "@/lib/csv";
import { contractsTable, downloadExcel } from "@/lib/govern/export";
import { applyFilters, countActiveRules, matchesFilters, parseFilterGroup } from "@/lib/govern/filter-rules";
import {
  DEFAULT_VIEWS, DEFAULT_VIEW_ID, QUICK_VIEWS, baseOf, configFromSettings, defaultSettings, groupingFor, presetById,
  sameSettings, settingsFromConfig, splitSavedViews, type ColumnDefaults, type ListSettings,
} from "@/lib/govern/list-views";
import { listTotals } from "@/lib/govern/list-totals";
import { plural } from "@/lib/govern/labels";
import {
  useContracts, useDeleteView, useGovernFeature, useGovernMe, useOrgCurrency, useSavedViews, useUpdateView,
} from "@/lib/govern/queries";
import type { Contract, SavedView } from "@/lib/govern/types";
import type { ContractView } from "@/lib/govern/views";
import { BulkActions } from "./_components/BulkActions";
import { BulkEditSheet } from "./_components/BulkEditSheet";
import { ListFooter } from "./_components/ListFooter";
import { ListToolbar } from "./_components/ListToolbar";
import { ContractsListSkeleton } from "./_components/ContractsListSkeleton";
import { SaveViewDialog, type SaveViewMode } from "./_components/SaveViewDialog";
import { ViewPicker } from "./_components/ViewPicker";
import { ViewTabs, type ViewTab } from "./_components/ViewTabs";
import { useStoredColumns } from "./_components/use-stored-columns";
import { DateRangeFilter, inDateRange, type DateRange } from "@/components/ds/DateRangeFilter";

const DEFAULTS: ColumnDefaults = {
  ids: CONTRACT_LIST_COLUMN_IDS,
  hidden: CONTRACT_LIST_DEFAULT_HIDDEN,
  sort: { key: "days", dir: "desc" },
};
const SORT_OPTIONS = CONTRACT_LIST_COLUMNS.filter((c) => c.sortValue).map((c) => ({ id: c.id, label: c.header }));
const MAX_VIEW_TABS = 5;

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
  const exportsOn = useGovernFeature("exports");
  const [now] = useState(() => Date.now());
  // Received date: a quick filter on top of the view, not saved with it.
  const [received, setReceived] = useState<DateRange | null>(null);

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
  const grouping = useMemo(() => groupingFor(settings.groupBy, rows), [settings.groupBy, rows]);
  const totals = useMemo(() => listTotals(rows, currency), [rows, currency]);

  /* ── Views: tabs, menu, counts ── */
  const { mine, shared } = useMemo(() => splitSavedViews(savedViews, me), [savedViews, me]);
  const hrefFor = useCallback((id: string) => `${pathname}?view=${encodeURIComponent(id)}`, [pathname]);
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
  const tabs = useMemo<ViewTab[]>(() => {
    const list: ViewTab[] = [
      ...DEFAULT_VIEWS.map((v) => ({ id: v.id, label: v.label, count: isLoading ? null : countFor(v), href: hrefFor(v.id) })),
      ...mine.slice(0, MAX_VIEW_TABS).map((v) => ({ id: v.id, label: v.name, count: isLoading ? null : countFor(v), href: hrefFor(v.id), visibility: v.visibility })),
    ];
    if (!list.some((t) => t.id === activeId)) {
      list.push(saved
        ? { id: saved.id, label: saved.name, count: isLoading ? null : countFor(saved), href: hrefFor(saved.id), visibility: saved.visibility }
        : { id: base.id, label: base.label, count: isLoading ? null : countFor(base), href: hrefFor(base.id) });
    }
    return list;
  }, [mine, activeId, saved, base, isLoading, countFor, hrefFor]);
  const activeLabel = saved?.name ?? base.label;

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

  /* ── Selection, preview, bulk edit ── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contract[] | null>(null);
  const preview = previewId ? all.find((c) => c.contractId === previewId) ?? null : null;
  const closePreview = useCallback(() => setPreviewId(null), []);

  /* ── Export ── */
  const visibleColumns = useMemo(() => {
    const hidden = new Set(settings.columns.hidden);
    return orderColumns(CONTRACT_LIST_COLUMNS, settings.columns.order).filter((c) => c.card === "title" || !hidden.has(c.id));
  }, [settings.columns]);
  const [exporting, setExporting] = useState(false);
  const exportCsv = () => {
    const csv = rowsToCsv(visibleColumns.map((c) => ({
      header: c.header,
      value: (r: Contract) => c.exportValue?.(r) ?? (() => { const v = c.sortValue?.(r); return v instanceof Date ? v.toISOString() : v ?? null; })(),
    })), rows);
    downloadCsv(csvFileName("contracts"), csv);
    toast.success(`${plural(rows.length, "contract")} exported to CSV`);
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

  return (
    <div className="app-container flex flex-col gap-3 py-6 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-baseline gap-2 text-[18px] leading-tight font-medium text-[var(--ink-900)] md:text-[20px]">
          Contracts
          {isLoading ? (
            <Skeleton className="h-3.5 w-8 self-center" />
          ) : !failed && <span className="text-[14px] font-normal tabular-nums text-[var(--ink-600)]">{all.length.toLocaleString()}</span>}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <EditionOnly feature="sowDrafting">
            <Button asChild variant="outline" size="sm"><Link href="/draft"><FileSignature size={16} />Draft an SOW</Link></Button>
          </EditionOnly>
          <Button asChild variant={showsEmpty ? "outline" : "default"} size="sm">
            <Link href="/projects/upload"><Plus size={16} />Upload contract</Link>
          </Button>
        </div>
      </header>

      <ViewTabs
        tabs={tabs}
        activeId={activeId}
        loading={isLoading}
        onNewView={saveAs}
        end={dirty && (
          <>
            <span className="text-[12px] text-[var(--ink-600)]">Unsaved changes</span>
            {saved?.canEdit && (
              <button type="button" onClick={() => void updateWithCurrent(saved)} className="h-8 rounded-md px-1.5 text-[12px] font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                Update view
              </button>
            )}
            <button type="button" onClick={saveAs} className="h-8 rounded-md px-1.5 text-[12px] font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus">
              Save view as…
            </button>
          </>
        )}
        allViews={
          <ViewPicker
            activeId={activeId}
            activeLabel={activeLabel}
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
          />
        }
      />
      {missing && (
        <p role="status" className="text-[12px] text-[var(--ink-600)]">
          That saved view isn’t available: it may have been deleted or not shared with you{savedStatus.error ? ", or saved views can’t load right now" : ""}. Showing {base.label.toLowerCase()} instead.
        </p>
      )}

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
        density={settings.density}
        onDensityChange={(density) => update({ density })}
        pageSize={50}
        headerEnd={
          <ColumnSettings
            columns={orderColumns(CONTRACT_LIST_COLUMNS, settings.columns.order).map((c) => ({ id: c.id, label: c.header, locked: c.card === "title" }))}
            hidden={new Set(settings.columns.hidden)}
            onHiddenChange={(id, hide) => update({ columns: { ...settings.columns, hidden: hide ? [...settings.columns.hidden, id] : settings.columns.hidden.filter((x) => x !== id) } })}
            onOrderChange={(order) => update({ columns: { ...settings.columns, order } })}
            triggerClassName="size-7 border-transparent bg-transparent"
          />
        }
        footer={rows.length > 0 ? <ListFooter totals={totals} currency={currency} /> : undefined}
        loadingFooter={<TableFooterSkeleton />}
        toolbar={
          <ListToolbar
            settings={settings}
            onSettings={update}
            q={q}
            onQ={setQ}
            searchLabel={`Search ${activeLabel.toLowerCase()}`}
            owners={owners}
            me={me}
            suggestions={suggestions}
            sortOptions={SORT_OPTIONS}
            columns={orderColumns(CONTRACT_LIST_COLUMNS, settings.columns.order).map((c) => ({ id: c.id, label: c.header, locked: c.card === "title" }))}
            onClear={clearFilters}
            extraFilters={<DateRangeFilter label="Received" value={received} onChange={setReceived} />}
            extraActive={received ? 1 : 0}
            exports={exportsOn ? { csv: exportCsv, excel: () => void exportExcel(), busy: exporting } : null}
          />
        }
        state={isLoading ? "loading" : failed ? "error" : "ready"}
        onRetry={() => void refetch()}
        errorDetail={error instanceof Error ? error.message : undefined}
        isFiltered={isFiltered}
        onClearFilters={filtering ? clearFilters : () => goTo("all")}
        selection={{ selected, onChange: setSelected }}
        bulkActions={(chosen) => (
          <BulkActions contracts={chosen} viewLabel={activeLabel} onDone={() => setSelected(new Set())} onEditFields={() => setEditing(chosen)} />
        )}
        empty={
          <StatePanel art="empty" title="No contracts yet" description="Upload a contract. Sonar reads it, checks it against your matrix and lists it here.">
            <Button asChild size="lg"><Link href="/projects/upload"><Plus size={16} />Upload contract</Link></Button>
          </StatePanel>
        }
      />

      {preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}

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
