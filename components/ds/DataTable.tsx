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
//  • optional row selection with a sticky bulk-action bar, and a "Columns"
//    menu to hide columns (remembered per table)

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3 } from "lucide-react";
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
import { EmptyState, ErrorState, LoadingState, NoResults } from "./feedback";
import { formatDate, formatRelative, formatValue } from "./format";

/* ─── Types ──────────────────────────────────────────────────────── */

export type ColumnPriority = 1 | 2 | 3;

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
  /** P1 always visible · P2 hidden < lg · P3 hidden < xl. Default 1. */
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
};

const PRIORITY_CELL: Record<ColumnPriority, string> = {
  1: "",
  2: "hidden lg:table-cell",
  3: "hidden xl:table-cell",
};

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
  } = props;

  const [hiddenIds, setColumnHidden] = useHiddenColumns(columnsKey);
  const firstColumnId = (allColumns.find((c) => c.card === "title") ?? allColumns[0])?.id;
  const columns = React.useMemo(
    () => allColumns.filter((c) => c.id === firstColumnId || c.hideable === false || !hiddenIds.has(c.id)),
    [allColumns, hiddenIds, firstColumnId],
  );

  const [innerSort, setInnerSort] = React.useState<SortState>(defaultSort);
  const isControlled = controlledSort !== undefined;
  const sort = isControlled ? controlledSort : innerSort;
  const [density, setDensity] = useDensity(densityKey ?? "ds-table-density", defaultDensity);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  const titleColumn = columns.find((c) => c.card === "title") ?? columns[0];
  const hiddenColumns = columns.filter((c) => (c.priority ?? 1) > 1);

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
  const pagination = usePagination(ordered.length, pageSize ?? Math.max(ordered.length, 1), `${sort?.columnId}:${sort?.direction}:${rows.length}`);
  const pageRows = pageSize ? ordered.slice(pagination.from - 1, pagination.to) : ordered;

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
  if (state === "loading") body = <LoadingState variant="table" count={5} label={`Loading ${noun}`} />;
  else if (state === "error") body = <ErrorState onRetry={onRetry} detail={errorDetail} title={`We couldn’t load the ${noun}`} />;
  else if (rows.length === 0)
    body = isFiltered ? (
      <NoResults noun={noun} onClear={onClearFilters} />
    ) : (
      empty ?? <EmptyState title={`No ${noun} yet`} description={`When there are ${noun}, they appear here.`} />
    );

  const rowHeight = density === "compact" ? "h-(--table-row-compact)" : "h-(--table-row-comfortable)";
  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const hasExpand = hiddenColumns.length > 0;

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
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {(toolbar || densityKey || columnsKey) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          <div className="flex items-center gap-2">
            {columnsKey && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns3 size={14} aria-hidden />Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allColumns.map((c) => {
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

      {body ?? (
        <>
          {/* ── Table (md and up) ── */}
          <div
            className={cn(
              "relative hidden min-w-0 overflow-auto rounded-container border border-border-default bg-surface-raised shadow-raised md:block",
              maxHeightClass,
            )}
            // Scroll containers must be focusable so keyboard users can scroll (WCAG 2.1.1).
            tabIndex={0}
            role="region"
            aria-label={`${caption} (scrollable)`}
          >
            <table
              className="w-full border-separate border-spacing-0 text-body"
              aria-rowcount={pageSize ? ordered.length + 1 : undefined}
            >
              <caption className={cn(showCaption ? "px-4 py-3 text-start text-body-lg font-semibold text-fg-primary" : "sr-only")}>
                {caption}
                {pageSize ? `, page ${pagination.page + 1} of ${pagination.pageCount}` : ""}
              </caption>
              <thead>
                <tr>
                  {selection && (
                    <th scope="col" className="sticky top-0 z-(--z-sticky) w-10 border-b border-border-default bg-surface-sunken ps-3">
                      <Checkbox
                        checked={allOnPage}
                        indeterminate={pageSelected > 0 && !allOnPage}
                        onChange={(on) => setPageSelected(on)}
                        label={allOnPage ? `Clear selection on this page` : `Select all ${pageIds.length} on this page`}
                      />
                    </th>
                  )}
                  {hasExpand && (
                    <th scope="col" className="sticky top-0 z-(--z-sticky) w-10 border-b border-border-default bg-surface-sunken xl:hidden">
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
                          "sticky top-0 z-(--z-sticky) h-(--table-header-height) border-b border-border-default bg-surface-sunken text-caption font-semibold whitespace-nowrap text-fg-secondary",
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
                              "inline-flex min-h-(--target-min) items-center gap-1 rounded-md px-2.5 py-1 transition-colors duration-(--duration-instant) hover:bg-surface-hover hover:text-fg-primary",
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
                    <th scope="col" className="sticky top-0 z-(--z-sticky) w-12 border-b border-border-default bg-surface-sunken">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {renderRows()}
              </tbody>
            </table>
          </div>

          {/* ── Cards (below md) ── */}
          <ul className="flex flex-col gap-2 md:hidden" aria-label={caption}>
            {renderCards()}
          </ul>

          {pageSize && ordered.length > pageSize && (
            <Pagination state={pagination} noun={noun} />
          )}
          {pageSize && ordered.length <= pageSize && (
            <p className="text-caption text-fg-tertiary" aria-live="polite">
              Showing {formatValue(ordered.length)} {noun}
            </p>
          )}
        </>
      )}
    </div>
  );

  /* ── Row rendering ── */

  function groupHeaderFor(row: T, index: number): { key: string; rows: T[] } | null {
    if (!groups || !groupBy) return null;
    const k = groupBy.key(row);
    const prev = index > 0 ? groupBy.key(pageRows[index - 1]) : null;
    if (prev === k) return null;
    return groups.find((g) => g.key === k) ?? null;
  }

  function renderRows() {
    const colCount = columns.length + (hasExpand ? 1 : 0) + (rowActions ? 1 : 0) + (selection ? 1 : 0);
    return pageRows.map((row, i) => {
      const id = getRowId(row);
      const href = getRowHref?.(row);
      const isOpen = expanded.has(id);
      const group = groupHeaderFor(row, i);
      const label = getRowLabel?.(row) ?? cellText(titleColumn, row);
      const clickable = Boolean(href || onRowClick);
      return (
        <React.Fragment key={id}>
          {group && groupBy && (
            <tr>
              <th
                scope="colgroup"
                colSpan={colCount}
                className="sticky top-(--table-header-height) z-[19] border-b border-border-default bg-surface-canvas px-4 py-2 text-start text-caption font-semibold text-fg-primary"
              >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span>{groupBy.label(group.key)}</span>
                  <span className="font-normal text-fg-tertiary tabular-nums">
                    {formatValue(group.rows.length)} {group.rows.length === 1 ? singular(noun) : noun}
                  </span>
                  {groupBy.subtotal && <span className="ms-auto font-medium tabular-nums text-fg-secondary">{groupBy.subtotal(group.rows)}</span>}
                </span>
              </th>
            </tr>
          )}
          <tr
            aria-rowindex={pageSize ? pagination.from + i + 1 : undefined}
            className={cn(
              "group/row relative transition-colors duration-(--duration-instant)",
              clickable && "cursor-pointer hover:bg-surface-hover focus-within:bg-surface-hover",
              activeRowId === id && "bg-[var(--brand-primary-50)] hover:bg-[var(--brand-primary-50)]",
            )}
            onClick={!href && onRowClick ? () => onRowClick(row) : undefined}
            aria-selected={selection ? selection.selected.has(id) : undefined}
          >
            {selection && (
              <td
                className={cn("relative z-(--z-raised) w-10 border-b border-border-subtle ps-3 align-middle", rowHeight, selection.selected.has(id) && "bg-[var(--brand-primary-50)]")}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox checked={selection.selected.has(id)} onChange={(on) => setRowSelected(id, on)} label={`Select ${label}`} />
              </td>
            )}
            {hasExpand && (
              <td className={cn("relative z-(--z-raised) border-b border-border-subtle ps-2 align-middle xl:hidden", rowHeight)}>
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
                  className={cn(
                    "border-b border-border-subtle align-middle text-fg-primary",
                    rowHeight,
                    cellPad,
                    col.numeric ? "text-end tabular-nums whitespace-nowrap" : "text-start",
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
          </tr>
          {hasExpand && isOpen && (
            <tr className="xl:hidden">
              <td colSpan={colCount} className="border-b border-border-subtle bg-surface-sunken px-4 py-3">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {hiddenColumns.map((col) => (
                    <div key={col.id} className={cn("flex min-w-0 flex-col gap-0.5", col.priority === 2 && "lg:hidden")}>
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
    return pageRows.map((row, i) => {
      const id = getRowId(row);
      const href = getRowHref?.(row);
      const group = groupHeaderFor(row, i);
      return (
        <React.Fragment key={id}>
          {group && groupBy && (
            <li className="mt-2 flex items-baseline gap-2 px-1 text-caption font-semibold text-fg-primary first:mt-0">
              {groupBy.label(group.key)}
              <span className="font-normal text-fg-tertiary">{formatValue(group.rows.length)}</span>
              {groupBy.subtotal && <span className="ms-auto font-medium text-fg-secondary">{groupBy.subtotal(group.rows)}</span>}
            </li>
          )}
          <li className="relative flex flex-col gap-2 rounded-container border border-border-default bg-surface-raised p-4 shadow-raised">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-body-lg font-semibold text-fg-primary">
                {href ? (
                  <Link
                    href={href}
                    className="outline-none after:absolute after:inset-0 after:rounded-container after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {renderCell(titleColumn, row)}
                  </Link>
                ) : onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(row)}
                    className="text-start outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {renderCell(titleColumn, row)}
                  </button>
                ) : (
                  renderCell(titleColumn, row)
                )}
              </div>
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
  checked: boolean; indeterminate?: boolean; onChange: (on: boolean) => void; label: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="size-4 cursor-pointer rounded-sm accent-[var(--brand-primary-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    />
  );
}
