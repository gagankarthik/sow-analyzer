"use client";

// Enterprise data table. One component, every state:
//  • column priorities: P1 always, P2 from lg, P3 from xl; hidden columns
//    are one tap away in the row's detail panel
//  • under md the table reflows to stacked cards (P1 fields + status)
//  • sticky header, sortable headers with aria-sort + a visible indicator;
//    unknown values always sort last
//  • the whole row is ONE real <a> (keyboard, middle-click, copy link);
//    secondary actions sit above the link layer
//  • density toggle remembered per table
//  • pagination ("Showing 1–50 of 2,431") for large sets
//  • group-by with count + subtotal per group
//  • loading / empty / no results / error are four distinct states
//  • optional row selection (shift+click selects a range) with a sticky
//    bulk-action bar, and a "Columns" menu to hide columns (remembered per
//    table) and, with onColumnOrderChange, reorder them
//  • hidden columns, column order and density can be controlled by the
//    caller (a saved view) instead of remembered locally
//  • groups collapse from their header
//  • variant "flush" (default): flat on the page, 38px header, 42px rows,
//    hairline dividers; "card" keeps the framed look; optional footer bar

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns3 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnSettings } from "./ColumnSettings";
import {
  nextSort,
  useHiddenColumns,
  sortRows,
  useDensity,
  usePagination,
  type Density,
  type PaginationState,
  type SortDirection,
  type SortState,
  type SortValue,
} from "./data-table-hooks";
import { EmptyState, ErrorState, NoResults } from "./feedback";
import { PRIORITY_CELL, skeletonRowCount, type ColumnPriority as SkeletonPriority } from "@/lib/skeleton-geometry";
import { TableSkeleton } from "./skeletons";
import { formatDate, formatRelative, formatValue } from "./format";

/* ─── Types ──────────────────────────────────────────────────────── */

export type ColumnPriority = SkeletonPriority;

export type DataTableColumn<T> = {
  id: string;
  /** Visible header text (also the label in cards and the detail panel). */
  header: string;
  /** Cell content. Defaults to String(sortValue). */
  cell?: (row: T) => React.ReactNode;
  /** Value used for sorting (and default rendering). Return null for unknown. */
  sortValue?: (row: T) => SortValue;
  /** Enable sorting on this column (needs `sortValue`). Default: true when sortValue is set. */
  sortable?: boolean;
  /** First click direction: numbers and dates usually want "desc". */
  sortFirst?: SortDirection;
  /** P1 always visible · P2 hidden < lg · P3 hidden < xl · P4 hidden < 2xl. Default 1. */
  priority?: ColumnPriority;
  /** Right-align with tabular figures (numbers, money, days). */
  numeric?: boolean;
  /** Truncate to one line with the full text in a title tooltip. Give a plain string. */
  truncate?: (row: T) => string;
  /** Width utility for the column, e.g. "w-40" or "min-w-[16rem]". */
  className?: string;
  /** Role in the mobile card: title (one), status (pills row), field (label: value), hidden. */
  card?: "title" | "status" | "field" | "hidden";
  /** Can the user hide this column from the Columns menu? Default true (never the title column). */
  hideable?: boolean;
  /** Plain value for CSV export (defaults to the sortable value). */
  exportValue?: (row: T) => string | number | null;
  /** Clicks inside this cell do not open the row (a person link, a menu). */
  stopRowClick?: boolean;
};

export type DataTableGroupBy<T> = {
  /** Group key for a row. */
  key: (row: T) => string;
  /** Header label for a key (from labels.ts). */
  label: (key: string) => React.ReactNode;
  /** Fixed group order (workflow order, not size). Unlisted keys follow. */
  order?: string[];
  /** Subtotal shown in the group header, computed over ALL rows of the group. */
  subtotal?: (rows: T[]) => React.ReactNode;
};

export type DataTableProps<T> = {
  /** Accessible name of the table, e.g. "Contracts waiting on your organization". Rendered as caption (sr-only unless `showCaption`). */
  caption: string;
  showCaption?: boolean;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Makes each row one link. */
  getRowHref?: (row: T) => string;
  /** Accessible name for the row link; defaults to the title cell's text. */
  getRowLabel?: (row: T) => string;
  /** Row click without navigation (opens a drawer). Prefer getRowHref. */
  onRowClick?: (row: T) => void;
  /** The row whose preview or drawer is open: shown as selected. */
  activeRowId?: string | null;
  /** Secondary actions (a row menu). Rendered above the link layer. */
  rowActions?: (row: T) => React.ReactNode;

  /** Uncontrolled initial sort. */
  defaultSort?: SortState;
  /** Controlled sort (server-side sorting): pass both. Rows are then rendered as given. */
  sort?: SortState;
  onSortChange?: (s: SortState) => void;

  /** Client-side page size. Omit to render all rows (fine below ~100). */
  pageSize?: number;
  /** Noun for counts: "contracts". */
  noun?: string;
  groupBy?: DataTableGroupBy<T>;

  /** Persist density under this key; also shows the density toggle. */
  densityKey?: string;
  defaultDensity?: Density;

  /** Data state. `ready` with zero rows shows empty or no-results. */
  state?: "loading" | "error" | "ready";
  /** True when filters/search are applied (zero rows → "no results", not "empty"). */
  isFiltered?: boolean;
  onClearFilters?: () => void;
  onRetry?: () => void;
  errorDetail?: React.ReactNode;
  /** Custom empty state (nothing exists yet). */
  empty?: React.ReactNode;

  /** Scroll height of the table body so the header can stick. */
  maxHeightClass?: string;
  /** Row selection: pass the selected ids and a setter to show checkboxes. */
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
  /** Actions for the selected rows, shown in a bar above the table. */
  bulkActions?: (rows: T[]) => React.ReactNode;
  /** Persist hidden columns under this key; also shows the Columns menu. */
  columnsKey?: string;
  /** Toolbar content shown left of the density toggle (filters summary, export). */
  toolbar?: React.ReactNode;
  className?: string;

  /** Column ids in display order (controlled). Unlisted columns follow in their given order. */
  columnOrder?: string[];
  /** With it, the built-in Columns control can also reorder columns. */
  onColumnOrderChange?: (order: string[]) => void;
  /** Hidden column ids (controlled); otherwise remembered under `columnsKey`. */
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (hidden: string[]) => void;
  /** Row density (controlled); otherwise remembered under `densityKey`. */
  density?: Density;
  onDensityChange?: (d: Density) => void;
  /** "flush" (default): the table sits flat on the page, hairline dividers only. "card": the older framed table. */
  variant?: "card" | "flush";
  /** A bar under the table (counts, calculations), shown when there are rows. */
  footer?: React.ReactNode;
  /** Shown under the skeleton while loading, in the footer's place (a TableFooterSkeleton). */
  loadingFooter?: React.ReactNode;
  /** A control at the right edge of the header row (column settings). */
  headerEnd?: React.ReactNode;
};

type Unit<T> = { kind: "row"; row: T; group: string | null } | { kind: "collapsed"; group: string };

/** Columns in `order` first, the rest after in their given order. */
export function orderColumns<C extends { id: string }>(columns: C[], order: string[] | undefined): C[] {
  if (!order || order.length === 0) return columns;
  const byId = new Map(columns.map((c) => [c.id, c]));
  const first = order.map((id) => byId.get(id)).filter((c): c is C => !!c);
  const seen = new Set(first.map((c) => c.id));
  return [...first, ...columns.filter((c) => !seen.has(c.id))];
}

/* ─── Component ──────────────────────────────────────────────────── */

/** Sortable, responsive, accessible table for record lists. See docs/DESIGN_SYSTEM.md#datatable. */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    caption,
    showCaption = false,
    columns: allColumns,
    rows,
    getRowId,
    getRowHref,
    getRowLabel,
    onRowClick,
    activeRowId,
    rowActions,
    defaultSort = null,
    sort: controlledSort,
    onSortChange,
    pageSize,
    noun = "rows",
    groupBy,
    densityKey,
    defaultDensity = "comfortable",
    state = "ready",
    isFiltered = false,
    onClearFilters,
    onRetry,
    errorDetail,
    empty,
    maxHeightClass = "max-h-[min(72vh,760px)]",
    toolbar,
    className,
    selection,
    bulkActions,
    columnsKey,
    columnOrder,
    onColumnOrderChange,
    hiddenColumns: controlledHidden,
    onHiddenColumnsChange,
    density: controlledDensity,
    onDensityChange,
    variant = "flush",
    footer,
    loadingFooter,
    headerEnd,
  } = props;
  const flush = variant === "flush";

  const [storedHidden, setStoredHidden] = useHiddenColumns(columnsKey);
  const hiddenIds = React.useMemo(() => (controlledHidden ? new Set(controlledHidden) : storedHidden), [controlledHidden, storedHidden]);
  const setColumnHidden = (id: string, hide: boolean) => {
    if (!onHiddenColumnsChange) return setStoredHidden(id, hide);
    const next = new Set(hiddenIds);
    if (hide) next.add(id);
    else next.delete(id);
    onHiddenColumnsChange([...next]);
  };
  const orderedColumns = React.useMemo(() => orderColumns(allColumns, columnOrder), [allColumns, columnOrder]);
  const firstColumnId = (allColumns.find((c) => c.card === "title") ?? allColumns[0])?.id;
  const columns = React.useMemo(
    () => orderedColumns.filter((c) => c.id === firstColumnId || c.hideable === false || !hiddenIds.has(c.id)),
    [orderedColumns, hiddenIds, firstColumnId],
  );

  const [innerSort, setInnerSort] = React.useState<SortState>(defaultSort);
  const isControlled = controlledSort !== undefined;
  const sort = isControlled ? controlledSort : innerSort;
  const [storedDensity, setStoredDensity] = useDensity(densityKey ?? "ds-table-density", defaultDensity);
  const density = controlledDensity ?? storedDensity;
  const setDensity = onDensityChange ?? setStoredDensity;
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const anchorRef = React.useRef<string | null>(null);

  const titleColumn = columns.find((c) => c.card === "title") ?? columns[0];
  // Rows expand to show P2/P3 columns hidden on smaller screens; P4 columns
  // are extras for wide screens, reached from the Columns menu instead.
  const hiddenColumns = columns.filter((c) => (c.priority ?? 1) > 1 && c.priority !== 4);

  // Sort (client-side unless controlled).
  const sorted = React.useMemo(() => {
    if (isControlled || !sort) return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return rows;
    return sortRows(rows, col.sortValue, sort.direction);
  }, [rows, columns, sort, isControlled]);

  // Group: order rows by group (stable within the sort), keep all-row groups for counts.
  const groups = React.useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, T[]>();
    for (const r of sorted) {
      const k = groupBy.key(r);
      const list = map.get(k);
      if (list) list.push(r);
      else map.set(k, [r]);
    }
    const order = groupBy.order ?? [];
    const keys = [...map.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    });
    return keys.map((k) => ({ key: k, rows: map.get(k)! }));
  }, [sorted, groupBy]);

  const ordered = React.useMemo(() => (groups ? groups.flatMap((g) => g.rows) : sorted), [groups, sorted]);
  // What the pages count: rows, plus one slot for each collapsed group so its
  // header keeps its place.
  const units = React.useMemo<Unit<T>[]>(() => {
    if (!groups) return sorted.map((row) => ({ kind: "row", row, group: null }));
    return groups.flatMap((g): Unit<T>[] =>
      collapsed.has(g.key) ? [{ kind: "collapsed", group: g.key }] : g.rows.map((row) => ({ kind: "row", row, group: g.key })),
    );
  }, [groups, sorted, collapsed]);
  const pagination = usePagination(units.length, pageSize ?? Math.max(units.length, 1), `${sort?.columnId}:${sort?.direction}:${rows.length}:${groupBy ? "g" : ""}`);
  const pageUnits = pageSize ? units.slice(pagination.from - 1, pagination.to) : units;
  const pageRows = pageUnits.flatMap((u) => (u.kind === "row" ? [u.row] : []));
  const groupByKey = new Map((groups ?? []).map((g) => [g.key, g]));

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSort(col: DataTableColumn<T>) {
    const next = nextSort(sort, col.id, col.sortFirst ?? (col.numeric ? "desc" : "asc"));
    if (!isControlled) setInnerSort(next);
    onSortChange?.(next);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Non-ready states ── */
  let body: React.ReactNode = null;
  if (state === "loading") body = null;
  else if (state === "error") body = <ErrorState onRetry={onRetry} detail={errorDetail} title={`We couldn’t load the ${noun}`} />;
  else if (rows.length === 0)
    body = isFiltered ? (
      <NoResults noun={noun} onClear={onClearFilters} />
    ) : (
      empty ?? <EmptyState title={`No ${noun} yet`} description={`When there are ${noun}, they appear here.`} />
    );

  const rowHeight = flush
    ? density === "compact" ? "h-[34px]" : "h-[42px]"
    : density === "compact" ? "h-(--table-row-compact)" : "h-(--table-row-comfortable)";
  const cellPad = flush
    ? density === "compact" ? "px-3 py-1" : "px-3 py-1.5"
    : density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const hasExpand = hiddenColumns.length > 0;
  const headCellBg = flush ? "h-[38px] border-t bg-surface-canvas" : "bg-surface-sunken";
  // The expand toggle stays until the widest hidden column is on screen.
  const expandHide = hiddenColumns.some((c) => c.priority === 4) ? "@7xl/table:hidden"
    : hiddenColumns.some((c) => c.priority === 3) ? "@5xl/table:hidden" : "@4xl/table:hidden";

  // Selection is scoped to what exists: ids that are no longer in `rows` are ignored.
  const rowIds = React.useMemo(() => new Set(rows.map(getRowId)), [rows, getRowId]);
  const selectedRows = selection ? rows.filter((r) => selection.selected.has(getRowId(r))) : [];
  const pageIds = pageRows.map(getRowId);
  const pageSelected = selection ? pageIds.filter((id) => selection.selected.has(id)).length : 0;
  const allOnPage = pageIds.length > 0 && pageSelected === pageIds.length;
  function setRowSelected(id: string, on: boolean) {
    if (!selection) return;
    const next = new Set([...selection.selected].filter((x) => rowIds.has(x)));
    if (on) next.add(id);
    else next.delete(id);
    selection.onChange(next);
  }
  /** Shift+click selects (or clears) every row between the last one clicked and this one. */
  function toggleRow(id: string, on: boolean, shift: boolean) {
    const anchor = anchorRef.current;
    anchorRef.current = id;
    if (!selection || !shift || !anchor || anchor === id || !pageIds.includes(anchor)) return setRowSelected(id, on);
    const [a, b] = [pageIds.indexOf(anchor), pageIds.indexOf(id)].sort((x, y) => x - y);
    const next = new Set([...selection.selected].filter((x) => rowIds.has(x)));
    for (const rid of pageIds.slice(a, b + 1)) {
      if (on) next.add(rid);
      else next.delete(rid);
    }
    selection.onChange(next);
  }
  function setPageSelected(on: boolean) {
    if (!selection) return;
    const next = new Set([...selection.selected].filter((x) => rowIds.has(x)));
    for (const id of pageIds) {
      if (on) next.add(id);
      else next.delete(id);
    }
    selection.onChange(next);
  }

  return (
    <div className={cn("@container/table flex min-w-0 flex-col gap-3", className)}>
      {(toolbar || densityKey || columnsKey) && (
        // Filters take the row and wrap; table controls sit at the end, or on
        // their own line when space runs out. Phones show cards, so the
        // column and density controls are not shown there.
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 grow basis-[34rem]">{toolbar}</div>
          <div className="ms-auto hidden items-center gap-2 md:flex">
            {columnsKey && onColumnOrderChange && (
              <ColumnSettings
                columns={orderedColumns.map((c) => ({ id: c.id, label: c.header, locked: c.id === firstColumnId || c.hideable === false }))}
                hidden={hiddenIds}
                onHiddenChange={setColumnHidden}
                onOrderChange={onColumnOrderChange}
              />
            )}
            {columnsKey && !onColumnOrderChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns3 size={12} aria-hidden />Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orderedColumns.map((c) => {
                    const locked = c.id === firstColumnId || c.hideable === false;
                    return (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={locked || !hiddenIds.has(c.id)}
                        disabled={locked}
                        onCheckedChange={(on) => setColumnHidden(c.id, !on)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.header}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {densityKey && <DensityToggle value={density} onChange={setDensity} />}
          </div>
        </div>
      )}

      {selection && selectedRows.length > 0 && (
        // Floating action bar, bottom centre: what you can do to the selection.
        <div
          role="region"
          aria-label="Selected rows"
          className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-x-1 gap-y-2 rounded-xl bg-[var(--ink-900,#111827)] px-2 py-1.5 text-white shadow-[0_16px_40px_-12px_rgba(10,13,20,0.5)]"
        >
          <button
            type="button"
            onClick={() => selection.onChange(new Set())}
            aria-label="Clear selection"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-body font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden className="inline-flex size-4 items-center justify-center rounded border border-white/70 text-[10px] leading-none">–</span>
            <span aria-live="polite">{formatValue(selectedRows.length)} selected</span>
          </button>
          {bulkActions && (
            <div className="dt-bulk flex flex-wrap items-center gap-1 border-l border-white/20 ps-2">{bulkActions(selectedRows)}</div>
          )}
        </div>
      )}

      {state === "loading" ? (
        // First load only: the skeleton has this table's columns, row height
        // and priority breakpoints, so nothing moves when the rows arrive.
        <>
          <TableSkeleton
            label={noun}
            columns={columns}
            rows={skeletonRowCount(pageSize)}
            density={density}
            variant={variant}
            leading={[...(selection ? ["w-10"] : []), ...(hasExpand ? [cn("w-10", expandHide)] : [])]}
            trailing={[...(rowActions ? ["w-12"] : []), ...(headerEnd ? ["w-10"] : [])]}
          />
          {loadingFooter}
        </>
      ) : body ?? (
        <>
          {/* ── Table (when the table has at least 42rem) ── */}
          <div
            className={cn(
              "relative hidden min-w-0 overflow-auto @2xl/table:block",
              flush ? "" : "rounded-container border border-border-default bg-surface-raised shadow-raised",
              maxHeightClass,
            )}
            // Scroll containers must be focusable so keyboard users can scroll (WCAG 2.1.1).
            tabIndex={0}
            role="region"
            aria-label={`${caption} (scrollable)`}
          >
            <table
              className={cn("w-full border-separate border-spacing-0", flush ? "text-[14px]" : "text-body")}
              aria-rowcount={pageSize ? ordered.length + 1 : undefined}
            >
              <caption className={cn(showCaption ? "px-4 py-3 text-start text-body-lg font-semibold text-fg-primary" : "sr-only")}>
                {caption}
                {pageSize ? `, page ${pagination.page + 1} of ${pagination.pageCount}` : ""}
              </caption>
              <thead>
                <tr>
                  {selection && (
                    <th scope="col" className={cn("sticky top-0 z-(--z-sticky) w-10 border-b border-border-default ps-3", headCellBg)}>
                      <Checkbox
                        checked={allOnPage}
                        indeterminate={pageSelected > 0 && !allOnPage}
                        onChange={(on) => setPageSelected(on)}
                        label={allOnPage ? `Clear selection on this page` : `Select all ${pageIds.length} on this page`}
                      />
                    </th>
                  )}
                  {hasExpand && (
                    <th scope="col" className={cn("sticky top-0 z-(--z-sticky) w-10 border-b border-border-default", headCellBg, expandHide)}>
                      <span className="sr-only">Details</span>
                    </th>
                  )}
                  {columns.map((col) => {
                    const sortable = col.sortable ?? Boolean(col.sortValue);
                    const active = sort?.columnId === col.id;
                    const ariaSort = active ? (sort!.direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined;
                    return (
                      <th
                        key={col.id}
                        scope="col"
                        aria-sort={ariaSort}
                        className={cn(
                          "sticky top-0 z-(--z-sticky) border-b border-border-default whitespace-nowrap",
                          flush
                            ? "h-[38px] border-t bg-surface-canvas text-[12px] font-normal text-[var(--ink-600)]"
                            : "h-(--table-header-height) bg-surface-sunken text-caption font-semibold text-fg-secondary",
                          col.numeric ? "text-end" : "text-start",
                          sortable ? "px-1.5" : cellPad,
                          PRIORITY_CELL[col.priority ?? 1],
                          col.className,
                        )}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2.5 transition-colors duration-(--duration-instant) hover:bg-surface-hover hover:text-fg-primary",
                              flush ? "h-7" : "min-h-(--target-min) py-1",
                              col.numeric && "flex-row-reverse",
                              active && "text-fg-primary",
                            )}
                          >
                            {col.header}
                            <SortIcon direction={active ? sort!.direction : null} />
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th scope="col" className={cn("sticky top-0 z-(--z-sticky) w-12 border-b border-border-default", headCellBg)}>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                  {headerEnd && (
                    <th scope="col" className={cn("sticky top-0 z-(--z-sticky) w-10 border-b border-border-default pe-2 text-end", headCellBg)}>
                      {headerEnd}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {renderRows()}
              </tbody>
            </table>
          </div>

          {/* ── Cards (narrower) ── */}
          <ul className="flex flex-col gap-2 @2xl/table:hidden" aria-label={caption}>
            {renderCards()}
          </ul>

          {footer}

          {pageSize && units.length > pageSize && (
            <Pagination state={pagination} noun={noun} />
          )}
          {pageSize && units.length <= pageSize && !footer && (
            <p className="text-caption text-fg-tertiary" aria-live="polite">
              Showing {formatValue(ordered.length)} {noun}
            </p>
          )}
        </>
      )}
    </div>
  );

  /* ── Row rendering ── */

  /** The group header to draw before page unit `i`, if any. */
  function headerAt(i: number): { key: string; rows: T[]; collapsed: boolean } | null {
    if (!groups || !groupBy) return null;
    const u = pageUnits[i];
    const g = u.group === null ? undefined : groupByKey.get(u.group);
    if (!g) return null;
    if (u.kind === "collapsed") return { ...g, collapsed: true };
    const prev = i > 0 ? pageUnits[i - 1] : null;
    if (prev && prev.kind === "row" && prev.group === u.group) return null;
    return { ...g, collapsed: false };
  }

  function groupToggle(group: { key: string; rows: T[]; collapsed: boolean }) {
    const name = groupBy!.label(group.key);
    return (
      <button
        type="button"
        aria-expanded={!group.collapsed}
        onClick={() => toggleGroup(group.key)}
        className="-ms-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 text-start hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus max-md:min-h-(--target-min)"
      >
        <ChevronDown size={12} aria-hidden className={cn("shrink-0 text-fg-tertiary transition-transform duration-(--duration-fast)", group.collapsed && "-rotate-90 rtl:rotate-90")} />
        <span>{name}</span>
        <span className="font-normal text-fg-tertiary tabular-nums">
          {formatValue(group.rows.length)}
          <span className="sr-only"> {group.rows.length === 1 ? singular(noun) : noun}{group.collapsed ? ", collapsed" : ""}</span>
        </span>
      </button>
    );
  }

  function renderRows() {
    const colCount = columns.length + (hasExpand ? 1 : 0) + (rowActions ? 1 : 0) + (selection ? 1 : 0) + (headerEnd ? 1 : 0);
    return pageUnits.map((unit, i) => {
      const group = headerAt(i);
      const header = group && groupBy && (
        <tr key={`group:${group.key}`}>
          <th
            scope="colgroup"
            colSpan={colCount}
            className={cn(
              "sticky z-[19] border-b border-border-default bg-surface-canvas px-3 py-1 text-start text-caption font-semibold text-fg-primary",
              flush ? "top-[38px]" : "top-(--table-header-height)",
            )}
          >
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {groupToggle(group)}
              {groupBy.subtotal && <span className="ms-auto font-medium tabular-nums text-fg-secondary">{groupBy.subtotal(group.rows)}</span>}
            </span>
          </th>
        </tr>
      );
      if (unit.kind === "collapsed") return header;
      const row = unit.row;
      const id = getRowId(row);
      const href = getRowHref?.(row);
      const isOpen = expanded.has(id);
      const label = getRowLabel?.(row) ?? cellText(titleColumn, row);
      const clickable = Boolean(href || onRowClick);
      const isSelected = selection ? selection.selected.has(id) : false;
      return (
        <React.Fragment key={id}>
          {header}
          <tr
            aria-rowindex={pageSize ? pagination.from + i + 1 : undefined}
            data-active={activeRowId === id || undefined}
            className={cn(
              "group/row relative transition-colors duration-(--duration-instant)",
              clickable && "cursor-pointer hover:bg-surface-hover focus-within:bg-surface-hover",
              activeRowId === id && "bg-surface-selected hover:bg-surface-selected",
              flush && isSelected && "bg-surface-selected",
            )}
            onClick={!href && onRowClick ? () => onRowClick(row) : undefined}
            aria-selected={selection ? isSelected : undefined}
          >
            {selection && (
              <td
                className={cn("relative z-(--z-raised) w-10 border-b border-border-subtle ps-3 align-middle", rowHeight, isSelected && "bg-surface-selected")}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox checked={isSelected} onChange={(on, shift) => toggleRow(id, on, shift)} label={`Select ${label}`} />
              </td>
            )}
            {hasExpand && (
              <td className={cn("relative z-(--z-raised) border-b border-border-subtle ps-2 align-middle", expandHide, rowHeight)}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Hide" : "Show"} more details for ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(id);
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-md text-fg-tertiary hover:bg-surface-hover hover:text-fg-primary"
                >
                  <ChevronDown size={16} aria-hidden className={cn("transition-transform duration-(--duration-fast)", isOpen ? "rotate-0" : "-rotate-90 rtl:rotate-90")} />
                </button>
              </td>
            )}
            {columns.map((col) => {
              const isTitle = col.id === titleColumn.id;
              const content = renderCell(col, row);
              return (
                <td
                  key={col.id}
                  onClick={col.stopRowClick ? (e) => e.stopPropagation() : undefined}
                  className={cn(
                    "border-b border-border-subtle align-middle text-fg-primary",
                    rowHeight,
                    cellPad,
                    col.numeric ? "text-end tabular-nums whitespace-nowrap" : "text-start",
                    col.stopRowClick && "relative z-(--z-raised) cursor-default",
                    PRIORITY_CELL[col.priority ?? 1],
                    col.className,
                  )}
                >
                  {isTitle && href ? (
                    <Link
                      href={href}
                      className="font-medium text-fg-primary outline-none after:absolute after:inset-0 after:content-[''] hover:text-fg-link hover:underline focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
                    >
                      {content}
                    </Link>
                  ) : isTitle && onRowClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                      className="text-start font-medium text-fg-primary outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </td>
              );
            })}
            {rowActions && (
              <td
                className={cn("relative z-(--z-raised) border-b border-border-subtle pe-2 text-end align-middle", rowHeight)}
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions(row)}
              </td>
            )}
            {headerEnd && <td aria-hidden className={cn("border-b border-border-subtle", rowHeight)} />}
          </tr>
          {hasExpand && isOpen && (
            <tr className={expandHide}>
              <td colSpan={colCount} className="border-b border-border-subtle bg-surface-sunken px-4 py-3">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {hiddenColumns.map((col) => (
                    <div key={col.id} className={cn("flex min-w-0 flex-col gap-0.5", col.priority === 2 && "@4xl/table:hidden", col.priority === 3 && "@5xl/table:hidden")}>
                      <dt className="text-caption text-fg-tertiary">{col.header}</dt>
                      <dd className={cn("min-w-0 text-body text-fg-primary", col.numeric && "tabular-nums")}>{renderCell(col, row)}</dd>
                    </div>
                  ))}
                </dl>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  }

  function renderCards() {
    const statusCols = columns.filter((c) => c.card === "status");
    const fieldCols = columns.filter(
      (c) => c.id !== titleColumn.id && c.card !== "status" && c.card !== "hidden" && (c.card === "field" || (c.priority ?? 1) === 1),
    );
    return pageUnits.map((unit, i) => {
      const group = headerAt(i);
      const header = group && groupBy && (
        <li key={`group:${group.key}`} className="mt-2 flex items-center gap-2 px-1 text-caption font-semibold text-fg-primary first:mt-0">
          {groupToggle(group)}
          {groupBy.subtotal && <span className="ms-auto font-medium text-fg-secondary">{groupBy.subtotal(group.rows)}</span>}
        </li>
      );
      if (unit.kind === "collapsed") return header;
      const row = unit.row;
      const id = getRowId(row);
      const href = getRowHref?.(row);
      return (
        <React.Fragment key={id}>
          {header}
          <li className={cn(
            "relative flex flex-col gap-2 rounded-container border border-border-default bg-surface-raised p-4 shadow-raised",
            activeRowId === id && "border-[var(--brand-primary-300)] bg-surface-selected",
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-body-lg font-semibold text-fg-primary">
                {href ? (
                  <Link
                    href={href}
                    className="block min-w-0 max-w-full outline-none after:absolute after:inset-0 after:rounded-container after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {renderCell(titleColumn, row)}
                  </Link>
                ) : onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(row)}
                    className="block w-full min-w-0 text-start outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {renderCell(titleColumn, row)}
                  </button>
                ) : (
                  renderCell(titleColumn, row)
                )}
              </div>
              {selection && (
                <div className="relative z-(--z-raised) -me-1 inline-flex size-11 shrink-0 items-center justify-center -mt-2.5">
                  <Checkbox
                    checked={selection.selected.has(id)}
                    onChange={(on, shift) => toggleRow(id, on, shift)}
                    label={`Select ${getRowLabel?.(row) ?? cellText(titleColumn, row)}`}
                  />
                </div>
              )}
              {rowActions && <div className="relative z-(--z-raised) -me-2 -mt-1 shrink-0">{rowActions(row)}</div>}
            </div>
            {statusCols.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {statusCols.map((c) => (
                  <React.Fragment key={c.id}>{renderCell(c, row)}</React.Fragment>
                ))}
              </div>
            )}
            {fieldCols.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {fieldCols.map((c) => (
                  <div key={c.id} className="min-w-0">
                    <dt className="text-caption text-fg-tertiary">{c.header}</dt>
                    <dd className={cn("min-w-0 text-body text-fg-primary", c.numeric && "tabular-nums")}>{renderCell(c, row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        </React.Fragment>
      );
    });
  }
}

/* ─── Cell helpers ───────────────────────────────────────────────── */

function cellText<T>(col: DataTableColumn<T>, row: T): string {
  if (col.truncate) return col.truncate(row);
  const v = col.sortValue?.(row);
  return v === null || v === undefined ? "" : v instanceof Date ? v.toLocaleDateString("en-US") : String(v);
}

function renderCell<T>(col: DataTableColumn<T>, row: T): React.ReactNode {
  const content = col.cell ? col.cell(row) : cellText(col, row) || <span className="text-fg-tertiary">—</span>;
  if (col.truncate) {
    const full = col.truncate(row);
    return (
      <span className="block max-w-[32ch] truncate" title={full}>
        {content}
      </span>
    );
  }
  return content;
}

function singular(noun: string): string {
  return noun.endsWith("ies") ? `${noun.slice(0, -3)}y` : noun.endsWith("s") ? noun.slice(0, -1) : noun;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ChevronUp size={14} aria-hidden className="shrink-0" />;
  if (direction === "desc") return <ChevronDown size={14} aria-hidden className="shrink-0" />;
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0 text-fg-disabled" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 5.5L7 3l2.5 2.5M4.5 8.5L7 11l2.5-2.5" />
    </svg>
  );
}

/* ─── Pagination ─────────────────────────────────────────────────── */

/** "Showing 1–50 of 2,431 contracts" with previous / next. Works for client or server pages. */
export function Pagination({
  state,
  noun = "rows",
  className,
}: {
  state: Pick<PaginationState, "page" | "pageCount" | "total" | "from" | "to" | "setPage">;
  noun?: string;
  className?: string;
}) {
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-body text-fg-secondary" aria-live="polite">
        Showing <span className="font-semibold tabular-nums text-fg-primary">{formatValue(state.from)}–{formatValue(state.to)}</span> of{" "}
        <span className="tabular-nums">{formatValue(state.total)}</span> {noun}
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-caption text-fg-tertiary sm:inline">
          Page {formatValue(state.page + 1)} of {formatValue(state.pageCount)}
        </span>
        <Button variant="outline" size="icon" onClick={() => state.setPage(state.page - 1)} disabled={state.page === 0} aria-label="Previous page">
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => state.setPage(state.page + 1)}
          disabled={state.page >= state.pageCount - 1}
          aria-label="Next page"
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </nav>
  );
}

/* ─── Density toggle ─────────────────────────────────────────────── */

/** Comfortable / compact switch for table row height. */
export function DensityToggle({ value, onChange }: { value: Density; onChange: (d: Density) => void }) {
  const options: { id: Density; label: string }[] = [
    { id: "comfortable", label: "Comfortable" },
    { id: "compact", label: "Compact" },
  ];
  return (
    <div role="group" aria-label="Row density" className="inline-flex rounded-control border border-border-strong bg-surface-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex h-8 items-center rounded-md px-2.5 text-caption font-medium transition-colors duration-(--duration-instant)",
            value === o.id ? "bg-interactive-subtle text-fg-link" : "text-fg-secondary hover:text-fg-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── DateCell ───────────────────────────────────────────────────── */

/** Relative date ("12 days ago") with the absolute date on hover and for screen readers. */
export function DateCell({ value, now }: { value: string | number | Date | null | undefined; now?: Date }) {
  const abs = formatDate(value);
  if (abs === "—") return <span className="text-fg-tertiary">—</span>;
  const iso = new Date(value as string | number | Date).toISOString();
  return (
    <time dateTime={iso} title={abs} className="whitespace-nowrap tabular-nums">
      <span aria-hidden>{formatRelative(value, now)}</span>
      <span className="sr-only">{abs}</span>
    </time>
  );
}


/** Native checkbox (keyboard, screen readers and forms for free), styled to the system. */
function Checkbox({ checked, indeterminate = false, onChange, label }: {
  checked: boolean; indeterminate?: boolean; onChange: (on: boolean, shift: boolean) => void; label: string;
}) {
  // A checkbox's change event is its click: shiftKey says "select the range".
  const shiftOf = (e: React.ChangeEvent<HTMLInputElement>) => "shiftKey" in e.nativeEvent && (e.nativeEvent as MouseEvent).shiftKey;
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked, shiftOf(e))}
      aria-label={label}
      className="size-4 cursor-pointer rounded-sm accent-[var(--brand-primary-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    />
  );
}
