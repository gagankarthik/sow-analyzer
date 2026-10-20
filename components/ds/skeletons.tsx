// Skeletons: loading placeholders drawn to the geometry of the real
// component, so nothing moves when data lands (UI_SPEC sections 3, 7–9).
//
//   TableSkeleton          header + rows, column widths from the real DataTable columns
//   TableFooterSkeleton    the "N in view" totals bar under a list
//   ToolbarSkeleton        the §9 toolbar: search · quick filters · More · ⟷ · icon buttons · layout
//   ViewTabsSkeleton       list view tabs (real labels when known) + layout switch
//   SummaryTilesSkeleton   ≤ 4 KpiTiles
//   PanelSkeleton          44px panel header + divided rows (or a custom body)
//   RecordHeaderSkeleton   breadcrumb · H1 · highlights strip
//   PathSkeleton           connected stages + guidance area
//   RecordSidebarSkeleton  the 320px tabbed sidebar
//   BoardSkeleton          lanes of cards (BoardCardSkeleton is one card)
//   ChartSkeleton          axis + bars at the real chart height
//   PageTitleSkeleton      the PageHeader title row
//
// Accessibility: pass `label` to the outermost skeleton of a region. It then
// carries aria-busy and ONE sr-only "Loading <label>" status; inner pieces
// are decorative. No hooks, no "use client": route loading.tsx files (server
// components) render these directly.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "@/components/ui/icons";
import {
  PRIORITY_CELL, chartBarHeights, flushCellPad, flushRowHeight, skeletonBarWidth,
  type ColumnPriority, type Density,
} from "@/lib/skeleton-geometry";

/* ─── Region + line primitives ───────────────────────────────────── */

type RegionProps = {
  /** What is loading, for the spoken status: "contracts" → "Loading contracts". */
  label?: string;
};

/** aria-busy + one polite sr-only status, only when `label` is given. */
function regionAttrs(label: string | undefined) {
  return label ? { "aria-busy": true as const } : {};
}

function RegionStatus({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span role="status" className="sr-only">
      Loading {label}
    </span>
  );
}

/**
 * A wrapper that marks a loading region: aria-busy and one "Loading …"
 * status. Use it around a composed page skeleton.
 */
export function SkeletonRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className={cn("min-w-0", className)}>
      <RegionStatus label={label} />
      {children}
    </div>
  );
}

/**
 * One line of placeholder text that is exactly as tall as a real line in
 * `text` (its font size and line height), with a bar 70% of the font size
 * centred in it. Use the same type classes as the content it stands for.
 */
export function SkeletonLine({
  text = "text-body",
  width = "w-32",
  className,
  barClassName,
}: {
  /** Typography classes of the real line: "text-caption", "text-3xl font-semibold". */
  text?: string;
  /** Width class of the bar. */
  width?: string;
  className?: string;
  /** Extra bar classes, e.g. a darker fill on a panel-tinted surface. */
  barClassName?: string;
}) {
  return (
    <span aria-hidden className={cn("block min-w-0", text, className)}>
      <Skeleton className={cn("inline-block h-[0.7em] max-w-full align-middle", width, barClassName)} />
      {/* A zero-width space holds the line box at the real line height. */}
      {"​"}
    </span>
  );
}

/** A 32px control outline (44px on phones): white, 1px border, 6px radius, with a faint label bar. */
function ControlSkeleton({ className, bar = "w-1/2" }: { className?: string; bar?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-11 shrink-0 items-center rounded-[6px] border border-border-default bg-surface-raised px-2.5 md:h-8",
        className,
      )}
    >
      <Skeleton className={cn("h-2.5", bar)} />
    </span>
  );
}

/* ─── TableSkeleton ──────────────────────────────────────────────── */

/** The parts of a DataTable column the skeleton reads (a DataTableColumn fits). */
export type SkeletonColumn = {
  id: string;
  header?: string;
  className?: string;
  numeric?: boolean;
  priority?: ColumnPriority;
  sortable?: boolean;
  sortValue?: unknown;
  card?: "title" | "status" | "field" | "hidden";
};

export type TableSkeletonProps = RegionProps & {
  /** The real table's columns: the header shows their labels and widths. */
  columns: SkeletonColumn[];
  rows?: number;
  density?: Density;
  /** "flush" (default) matches the flat list table; "card" the framed one. */
  variant?: "flush" | "card";
  /** Narrow columns before the data columns (checkbox, expand), as width classes. */
  leading?: string[];
  /** Narrow columns after them (row actions, column settings). */
  trailing?: string[];
  /** Show the real header labels (default) or placeholder bars. */
  showHeaders?: boolean;
  className?: string;
};

/**
 * A table placeholder with the real table's geometry: 38px header in the
 * canvas tint with the real column labels, 42px rows (34px compact), the
 * same priority columns hidden at the same container widths, hairline row
 * dividers. Under 42rem of table width it shows stacked cards, as the table does.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  density = "comfortable",
  variant = "flush",
  leading = [],
  trailing = [],
  showHeaders = true,
  label,
  className,
}: TableSkeletonProps) {
  const flush = variant === "flush";
  const rowHeight = flush ? flushRowHeight(density) : density === "compact" ? "h-(--table-row-compact)" : "h-(--table-row-comfortable)";
  const cellPad = flush ? flushCellPad(density) : density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const headCell = cn(
    "border-b border-border-default whitespace-nowrap",
    flush
      ? "h-[38px] border-t bg-surface-canvas text-[12px] font-normal text-[var(--ink-600)]"
      : "h-(--table-header-height) bg-surface-sunken text-caption font-semibold text-fg-secondary",
  );
  const lines = Array.from({ length: rows }, (_, i) => i);
  const titleId = (columns.find((c) => c.card === "title") ?? columns[0])?.id;
  const cardFields = columns.filter((c) => c.id !== titleId && c.card !== "hidden" && c.card !== "status" && (c.priority ?? 1) === 1).slice(0, 3);

  return (
    <div {...regionAttrs(label)} className={cn("@container/table min-w-0", className)}>
      <RegionStatus label={label} />
      <div
        aria-hidden
        className={cn(
          "hidden min-w-0 overflow-hidden @2xl/table:block",
          !flush && "rounded-container border border-border-default bg-surface-raised",
        )}
      >
        <table className={cn("w-full border-separate border-spacing-0", flush ? "text-[14px]" : "text-body")}>
          <thead>
            <tr>
              {leading.map((w, i) => <th key={`l${i}`} className={cn(headCell, w)} />)}
              {columns.map((col) => {
                const sortable = col.sortable ?? col.sortValue !== undefined;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={cn(
                      headCell,
                      col.numeric ? "text-end" : "text-start",
                      sortable ? "px-1.5" : cellPad,
                      PRIORITY_CELL[col.priority ?? 1],
                      col.className,
                    )}
                  >
                    {showHeaders && col.header ? (
                      <span className={cn(sortable && "inline-flex h-7 items-center px-2.5")}>{col.header}</span>
                    ) : (
                      <Skeleton className={cn("inline-block h-2.5 w-16 align-middle", sortable && "mx-2.5")} />
                    )}
                  </th>
                );
              })}
              {trailing.map((w, i) => <th key={`t${i}`} className={cn(headCell, w)} />)}
            </tr>
          </thead>
          <tbody>
            {lines.map((r) => (
              <tr key={r}>
                {leading.map((w, i) => (
                  <td key={`l${i}`} className={cn("border-b border-border-subtle ps-3 align-middle", rowHeight, w)}>
                    {i === 0 && <Skeleton className="size-4 rounded-[4px]" />}
                  </td>
                ))}
                {columns.map((col, c) => (
                  <td
                    key={col.id}
                    className={cn(
                      "border-b border-border-subtle align-middle",
                      rowHeight,
                      cellPad,
                      col.numeric ? "text-end" : "text-start",
                      PRIORITY_CELL[col.priority ?? 1],
                      col.className,
                    )}
                  >
                    <Skeleton
                      className={cn(
                        "inline-block h-3 max-w-full align-middle",
                        col.id === titleId ? skeletonBarWidth(r, 0) : skeletonBarWidth(r, c + 1, col.numeric),
                      )}
                    />
                  </td>
                ))}
                {trailing.map((w, i) => <td key={`t${i}`} className={cn("border-b border-border-subtle", rowHeight, w)} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow: stacked cards, as DataTable shows. */}
      <ul aria-hidden className="flex flex-col gap-2 @2xl/table:hidden">
        {lines.slice(0, 4).map((r) => (
          <li key={r} className="flex flex-col gap-2 rounded-container border border-border-default bg-surface-raised p-4">
            <SkeletonLine text="text-body-lg font-semibold" width={skeletonBarWidth(r, 0)} />
            {cardFields.map((col, c) => (
              <span key={col.id} className="flex items-center gap-2">
                <SkeletonLine text="text-caption" width="w-16" className="shrink-0" />
                <SkeletonLine text="text-body" width={skeletonBarWidth(r, c + 1, col.numeric)} className="flex-1" />
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The totals bar under a list (ListFooter geometry): four hairline-divided 12px cells. */
export function TableFooterSkeleton({ cells = 4, className }: { cells?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("grid grid-cols-2 border-b border-border-default sm:grid-cols-4", className)}>
      {Array.from({ length: cells }, (_, i) => (
        <div
          key={i}
          className="flex min-w-0 items-center gap-2 border-e border-border-default px-3 py-3 last:border-e-0 max-sm:even:border-e-0 max-sm:[&:nth-child(-n+2)]:border-b"
        >
          <SkeletonLine text="text-[12px] leading-none" width={i === 0 ? "w-20" : "w-24"} />
        </div>
      ))}
    </div>
  );
}

/* ─── ToolbarSkeleton ────────────────────────────────────────────── */

/**
 * The list toolbar (UI_SPEC section 9) in its fixed order: search (240px) →
 * quick filters → "More filters" ⟷ right-hand icon buttons → layout switch.
 * Every control 32px (44px on phones), on one row from md.
 */
export function ToolbarSkeleton({
  search = true,
  filters = 3,
  filtersAlways = false,
  more = true,
  actions = 2,
  layoutSwitch = false,
  label,
  className,
}: RegionProps & {
  /** The 240px search field (most lists have one). */
  search?: boolean;
  /** Quick filters shown from md up (Toolbar.Filters `always`), not only on wide toolbars. */
  filtersAlways?: boolean;
  /** Quick filter buttons (at most 4). */
  filters?: number;
  /** The "More filters" button. */
  more?: boolean;
  /** Right-hand 32px icon buttons (group, columns, export). */
  actions?: number;
  /** The Table / Board switch at the far right. */
  layoutSwitch?: boolean;
  className?: string;
}) {
  const quick = Math.min(filters, 4);
  return (
    <div {...regionAttrs(label)} className={cn("flex flex-col gap-2", className)}>
      <RegionStatus label={label} />
      <div aria-hidden className="@container/toolbar flex min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center">
        {search && <ControlSkeleton className="w-full md:w-60" bar="w-28" />}
        {quick > 0 && (
          <div className={cn("hidden shrink-0 items-center gap-2", filtersAlways ? "md:flex" : "@min-[72rem]/toolbar:flex")}>
            {Array.from({ length: quick }, (_, i) => <ControlSkeleton key={i} className="w-[120px]" bar="w-3/4" />)}
          </div>
        )}
        {more && (
          <div className="hidden shrink-0 items-center md:flex">
            <ControlSkeleton className="w-[118px]" bar="w-3/4" />
          </div>
        )}
        <div className="hidden shrink-0 items-center gap-2 md:ms-auto md:flex md:ps-2">
          {Array.from({ length: actions }, (_, i) => <ControlSkeleton key={i} className="w-8 justify-center px-0" bar="w-3.5" />)}
          {layoutSwitch && <ControlSkeleton className="w-[124px]" bar="w-3/4" />}
        </div>
      </div>
      <div aria-hidden className="flex items-center gap-2 md:hidden">
        <ControlSkeleton className="w-28" bar="w-3/4" />
        {Array.from({ length: actions }, (_, i) => <ControlSkeleton key={i} className="w-11 justify-center px-0" bar="w-4" />)}
        {layoutSwitch && <ControlSkeleton className="w-[124px]" bar="w-3/4" />}
      </div>
    </div>
  );
}

/* ─── ViewTabsSkeleton ───────────────────────────────────────────── */

/**
 * List view tabs (ds ViewTabs geometry: 40px tabs, 2px underline, hairline
 * rule). With `labels` the real tab names show, each with a count pill
 * placeholder; the first is drawn as the active tab.
 */
export function ViewTabsSkeleton({
  labels,
  tabs = 3,
  layoutSwitch = false,
  label,
  className,
}: RegionProps & {
  /** Known tab names (the default views). */
  labels?: string[];
  /** Placeholder tabs when the names are not known. */
  tabs?: number;
  layoutSwitch?: boolean;
  className?: string;
}) {
  const items = labels ?? Array.from({ length: tabs }, () => null);
  return (
    <div {...regionAttrs(label)} className={cn("flex min-w-0 items-end gap-4 border-b border-border-default", className)}>
      <RegionStatus label={label} />
      <div aria-hidden className="-mb-px flex min-w-0 flex-1 items-end overflow-hidden">
        {items.map((name, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-body font-medium whitespace-nowrap max-md:h-11",
              i === 0 ? "border-interactive text-fg-primary" : "border-transparent text-fg-secondary",
            )}
          >
            {name ?? <Skeleton className={cn("h-3", i === 0 ? "w-24" : "w-20")} />}
            <Skeleton className="h-4 w-6 rounded-pill" />
          </span>
        ))}
      </div>
      {layoutSwitch && (
        <div aria-hidden className="mb-1 shrink-0">
          <ControlSkeleton className="w-[124px]" bar="w-3/4" />
        </div>
      )}
    </div>
  );
}

/* ─── SummaryTilesSkeleton ───────────────────────────────────────── */

/**
 * The summary row (KpiTile geometry): at most 4 tiles, two per row on
 * phones, four from lg; 1px border, 8px radius, label 12px, value 24px
 * (32px for a hero), optional one-line note.
 */
export function SummaryTilesSkeleton({
  count = 4,
  labels,
  footnote = true,
  hero = false,
  columns = 4,
  label,
  className,
}: RegionProps & {
  count?: number;
  /** Tiles per row from lg (the row's own grid: 4, or 3 for a three-tile row). */
  columns?: 3 | 4;
  /** Known tile labels, shown as text. */
  labels?: string[];
  /** Reserve the one-line note under the value. */
  footnote?: boolean;
  /** The first tile is the page's hero number (32px). */
  hero?: boolean;
  className?: string;
}) {
  const n = Math.min(labels?.length ?? count, 4);
  return (
    <div {...regionAttrs(label)} className={cn("min-w-0", className)}>
      <RegionStatus label={label} />
      <ul aria-hidden className={cn("grid min-w-0 grid-cols-2 gap-3", columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        {Array.from({ length: n }, (_, i) => (
          <li key={i} className="min-w-0">
            <div className="relative flex h-full min-w-0 flex-col rounded-container border border-border-default bg-surface-raised px-4 py-3">
              {labels?.[i] ? (
                <span className="truncate text-caption font-medium text-fg-tertiary">{labels[i]}</span>
              ) : (
                <SkeletonLine text="text-caption font-medium" width="w-20" />
              )}
              <SkeletonLine
                className="mt-1"
                text={cn("font-semibold tracking-tight", hero && i === 0 ? "text-4xl" : "text-3xl")}
                width={i % 2 ? "w-20" : "w-14"}
              />
              {footnote && <SkeletonLine className="mt-1" text="text-caption" width={i % 2 ? "w-24" : "w-28"} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── PanelSkeleton ──────────────────────────────────────────────── */

export type PanelSkeletonRow = "two-line" | "line" | "key-value";

/**
 * A panel (Panel geometry): white, 1px border, 8px radius, a 44px header
 * (the real title when known), then divided rows or a custom body.
 *   two-line   title + caption rows (lists of records)
 *   line       one 44px row: dot · name · figure (contract rows)
 *   key-value  label left, value right (36px rows)
 */
export function PanelSkeleton({
  title,
  rows = 4,
  row = "two-line",
  actions = true,
  footer = false,
  padded = false,
  children,
  label,
  className,
}: RegionProps & {
  /** The real panel title, when known. */
  title?: string;
  rows?: number;
  row?: PanelSkeletonRow;
  /** A header action placeholder ("See all"). */
  actions?: boolean;
  /** A footer row placeholder ("Show all 12"). */
  footer?: boolean;
  /** With `children`: a 16px padded body (charts, text). */
  padded?: boolean;
  /** A custom body instead of rows. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      {...regionAttrs(label)}
      className={cn("flex min-w-0 flex-col rounded-container border border-border-default bg-surface-raised", className)}
    >
      <RegionStatus label={label} />
      <header aria-hidden className="flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-border-default px-4 py-2">
        {title ? (
          <span className="min-w-0 truncate text-base font-semibold text-fg-primary">{title}</span>
        ) : (
          <SkeletonLine text="text-base font-semibold" width="w-32" />
        )}
        {actions && <SkeletonLine text="text-sm" width="w-16" className="shrink-0" />}
      </header>
      <div aria-hidden className={cn("flex min-w-0 flex-1 flex-col", children && padded && "p-4")}>
        {children ?? <PanelRowsSkeleton rows={rows} row={row} />}
      </div>
      {footer && (
        <div aria-hidden className="border-t border-border-default px-4 py-2.5">
          <SkeletonLine text="text-sm" width="w-24" />
        </div>
      )}
    </section>
  );
}

/** Divided placeholder rows for a panel or list body. */
export function PanelRowsSkeleton({ rows = 4, row = "two-line", className }: { rows?: number; row?: PanelSkeletonRow; className?: string }) {
  return (
    <ul aria-hidden className={cn("min-w-0", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="min-w-0 border-b border-border-subtle last:border-b-0">
          {row === "two-line" && (
            <div className="flex flex-col px-4 py-2.5">
              <SkeletonLine text="text-sm font-medium" width={skeletonBarWidth(i, 0)} />
              <SkeletonLine text="text-xs" className="mt-0.5" width={skeletonBarWidth(i, 3)} />
            </div>
          )}
          {row === "line" && (
            <div className="flex min-h-11 min-w-0 items-center gap-3 px-4 py-2">
              <Skeleton className="size-2 shrink-0 rounded-full" />
              <SkeletonLine text="text-sm" width={skeletonBarWidth(i, 0)} className="flex-[2]" />
              <SkeletonLine text="text-sm" width="w-[60%]" className="hidden flex-1 sm:block" />
              <SkeletonLine text="text-sm" width="w-12" className="w-12 shrink-0" />
            </div>
          )}
          {row === "key-value" && (
            <div className="flex h-9 min-w-0 items-center justify-between gap-3 px-4 max-md:h-11">
              <SkeletonLine text="text-sm" width={skeletonBarWidth(i, 1)} className="flex-1" />
              <SkeletonLine text="text-sm" width="w-6" className="w-6 shrink-0" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ─── Record pages ───────────────────────────────────────────────── */

/**
 * The record header band (RecordHeader geometry): breadcrumb, H1 + object
 * tag, actions at the right, the highlights strip of up to five properties.
 */
export function RecordHeaderSkeleton({
  crumbs = 2,
  highlights = 5,
  objectTag,
  actions = 2,
  children,
  label,
  className,
}: RegionProps & {
  crumbs?: number;
  highlights?: number;
  /** The object tag text ("Contract"); shown as real text. */
  objectTag?: string;
  /** Action buttons at the right (primary + menu + prev/next). */
  actions?: number;
  /** An extra row under the highlights (sub-page tabs). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div {...regionAttrs(label)} className={cn("border-b border-border-default bg-surface-raised", className)}>
      <RegionStatus label={label} />
      <div className="app-container flex flex-col gap-3 pt-4 pb-4">
        <div aria-hidden className="flex items-center gap-2">
          {Array.from({ length: crumbs }, (_, i) => (
            <SkeletonLine key={i} text="text-caption" width={i === crumbs - 1 ? "w-28" : "w-16"} className="max-md:min-h-11 max-md:py-3.5" />
          ))}
        </div>
        <div aria-hidden className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SkeletonLine text="text-xl font-semibold" width="w-[min(28rem,70%)]" className="min-w-0 flex-1 md:flex-none md:basis-[28rem]" />
            {objectTag && (
              <span className="shrink-0 rounded-sm border border-border-default bg-surface-sunken px-1.5 py-0.5 text-caption font-medium text-fg-secondary">
                {objectTag}
              </span>
            )}
          </div>
          {actions > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              {Array.from({ length: actions }, (_, i) => (
                <Skeleton key={i} className={cn("h-11 md:h-8", i === actions - 1 ? "w-32" : "w-24")} />
              ))}
            </div>
          )}
        </div>
        {highlights > 0 && (
          <div aria-hidden className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap">
            {Array.from({ length: Math.min(highlights, 5) }, (_, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-0.5">
                <SkeletonLine text="text-caption" width="w-14" />
                <SkeletonLine text="text-body font-medium" width={i % 2 ? "w-28" : "w-20"} />
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** The Path (connected stages, 36px) with an optional guidance area. */
export function PathSkeleton({
  steps = 6,
  guidance = true,
  label,
  className,
}: RegionProps & { steps?: number; guidance?: boolean; className?: string }) {
  return (
    <div {...regionAttrs(label)} className={cn("min-w-0 overflow-hidden rounded-container border border-border-default bg-surface-raised", className)}>
      <RegionStatus label={label} />
      <div aria-hidden className="flex min-w-0 gap-px overflow-hidden bg-border-default">
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className="flex h-9 min-w-[7.5rem] flex-1 items-center justify-center bg-surface-raised px-3">
            <Skeleton className="h-2.5 w-16" />
          </span>
        ))}
      </div>
      {guidance && (
        <div aria-hidden className="flex min-w-0 flex-col gap-3 border-t border-border-default p-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SkeletonLine text="text-base font-semibold" width="w-48" />
            <SkeletonLine text="text-caption" width="w-36" />
            <SkeletonLine text="text-body" width="w-[min(32rem,90%)]" />
          </div>
          <Skeleton className="h-11 w-36 shrink-0 md:h-9" />
        </div>
      )}
    </div>
  );
}

/** The record sidebar (RecordSidebar geometry): 320px from lg, a 44px tab strip, label/value rows. */
export function RecordSidebarSkeleton({
  tabs = ["Details", "Related", "Files"],
  rows = 7,
  label,
  className,
}: RegionProps & { tabs?: string[]; rows?: number; className?: string }) {
  return (
    <aside {...regionAttrs(label)} className={cn("min-w-0 shrink-0 lg:w-80", className)}>
      <RegionStatus label={label} />
      <div aria-hidden className="rounded-container border border-border-default bg-surface-raised">
        <div className="flex min-w-0 items-end gap-1 border-b border-border-default ps-2 pe-1">
          {tabs.map((t, i) => (
            <span
              key={t}
              className={cn(
                "inline-flex h-11 items-center border-b-2 px-2.5 text-body font-medium",
                i === 0 ? "border-interactive text-fg-primary" : "border-transparent text-fg-secondary",
              )}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <SkeletonLine text="text-caption" width="w-20" />
              <SkeletonLine text="text-body" width={skeletonBarWidth(i, 2)} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─── Board ──────────────────────────────────────────────────────── */

/** One board card (workflow ContractCard geometry). */
export function BoardCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex min-w-0 flex-col gap-2.5 rounded-xl border border-border-default bg-surface-raised p-3", className)}>
      <span className="flex items-center justify-between gap-2">
        <SkeletonLine text="text-xs" width="w-20" />
        <SkeletonLine text="text-xs" width="w-10" className="shrink-0" />
      </span>
      <span className="-mt-1 flex flex-col">
        <SkeletonLine text="text-sm leading-snug" width="w-[88%]" />
        <SkeletonLine text="text-sm leading-snug" width="w-[52%]" />
        <SkeletonLine text="text-sm" width="w-[64%]" className="mt-0.5" />
      </span>
      <span className="flex items-center gap-1.5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="size-8" />
      </span>
    </div>
  );
}

/**
 * Board lanes (StageLane geometry): tinted columns with a header (dot,
 * name, meta, count), then cards. With `stages` the real lane names show.
 */
export function BoardSkeleton({
  lanes = 4,
  stages,
  cards = 2,
  label,
  className,
}: RegionProps & {
  lanes?: number;
  /** Known lane names. */
  stages?: string[];
  cards?: number;
  className?: string;
}) {
  const names = stages ?? Array.from({ length: lanes }, () => null);
  return (
    <div {...regionAttrs(label)} className={cn("grid min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      <RegionStatus label={label} />
      {names.map((name, i) => (
        <div key={i} aria-hidden className={cn("flex min-w-0 flex-col rounded-xl border border-border-default bg-[var(--ink-50)] p-2", i > 0 && "max-sm:hidden", i > 1 && "max-xl:hidden")}>
          <LaneHeaderSkeleton name={name} />
          <div className="flex flex-1 flex-col gap-2">
            {Array.from({ length: cards }, (_, c) => <BoardCardSkeleton key={c} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A lane header while its figures load: the real name when known. */
export function LaneHeaderSkeleton({ name, className }: { name?: string | null; className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-start gap-2 px-1.5 pb-2 pt-1", className)}>
      <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        {name ? (
          <span className="block truncate text-sm font-semibold text-fg-primary">{name}</span>
        ) : (
          <SkeletonLine text="text-sm font-semibold" width="w-24" />
        )}
        <SkeletonLine text="text-xs" width="w-20" className="mt-0.5" />
      </div>
      <SkeletonLine text="text-xs" width="w-4" className="shrink-0 pt-0.5" />
    </div>
  );
}

/* ─── ChartSkeleton ──────────────────────────────────────────────── */

/**
 * A chart placeholder at the real chart's height: y-axis ticks at the left,
 * baseline, bars in a calm fixed rhythm, x-axis labels underneath.
 */
export function ChartSkeleton({
  height = "h-60",
  bars = 8,
  label,
  className,
}: RegionProps & {
  /** Height class of the real chart, e.g. "h-[240px]". */
  height?: string;
  bars?: number;
  className?: string;
}) {
  const heights = chartBarHeights(bars);
  return (
    <div {...regionAttrs(label)} className={cn("flex w-full min-w-0 flex-col", height, className)}>
      <RegionStatus label={label} />
      <div aria-hidden className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-8 shrink-0 flex-col justify-between py-0.5">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-2 w-6" />)}
        </div>
        <div className="flex min-w-0 flex-1 items-end gap-[6%] border-b border-l border-border-default px-[3%]">
          {heights.map((h, i) => (
            <Skeleton key={i} className={cn("min-w-0 flex-1 rounded-b-none rounded-t-[4px]", h)} />
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-[6%] ps-11 pe-[3%]">
        {heights.map((_, i) => (
          <span key={i} className="flex min-w-0 flex-1 justify-center">
            <Skeleton className="h-2 w-3/4 max-w-10" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── PageTitleSkeleton ──────────────────────────────────────────── */

/**
 * The PageHeader title row: the real title (it is known before any data),
 * an optional count placeholder, and action placeholders at the right.
 */
export function PageTitleSkeleton({
  title,
  count = false,
  actions = 1,
  meta,
  back,
  backHiddenFromLg = false,
  className,
}: {
  title: string;
  /** The back link's label above the title ("Reports"). */
  back?: string;
  /** The back link shows only below lg (Settings, where the docked sidebar is the way back). */
  backHiddenFromLg?: boolean;
  count?: boolean;
  /** Action button placeholders (32px) at the right. */
  actions?: number;
  /** The row under the title (PageHeader `meta`): view tabs, a toolbar. */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="app-container pt-5 md:pt-6">
        {back && (
          <span aria-hidden className={cn("mb-1.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground max-md:min-h-11", backHiddenFromLg && "lg:hidden")}>
            <ChevronLeft size={12} className="rtl:rotate-180" />
            {back}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 text-xl font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
            {count && <Skeleton className="h-3.5 w-8" />}
          </div>
          {actions > 0 && (
            <div aria-hidden className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
              {Array.from({ length: actions }, (_, i) => (
                <Skeleton key={i} className={cn("h-11 md:h-8", i === actions - 1 ? "w-36" : "w-28")} />
              ))}
            </div>
          )}
        </div>
        {meta && <div className="mt-4">{meta}</div>}
      </div>
    </div>
  );
}

/* ─── PageSkeleton ───────────────────────────────────────────────── */

/** Label + input rows of a form panel (40px controls on phones, 36px from md). */
export function FormRowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <SkeletonLine text="text-sm font-medium" width={i % 2 ? "w-24" : "w-32"} />
          <span className="flex h-10 items-center rounded-[6px] border border-border-default bg-surface-raised px-3 md:h-9">
            <Skeleton className="h-2.5 w-1/3" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A whole page when only its kind is known: the title row (the real title
 * when given), then either two columns of panels (8 + 4) or one form panel.
 * The fallback for routes without a shape of their own.
 */
export function PageSkeleton({
  title,
  layout = "panels",
  label = "page",
  className,
}: {
  title?: string;
  layout?: "panels" | "form";
  label?: string;
  className?: string;
}) {
  return (
    <SkeletonRegion label={label} className={className}>
      {title ? (
        <PageTitleSkeleton title={title} actions={layout === "form" ? 0 : 1} />
      ) : (
        <div aria-hidden className="app-container pt-5 md:pt-6">
          <SkeletonLine text="text-xl font-semibold" width="w-48" />
        </div>
      )}
      <div className="app-container app-page">
        {layout === "form" ? (
          <div className="flex max-w-3xl flex-col gap-6">
            <PanelSkeleton actions={false} padded>
              <FormRowsSkeleton rows={4} />
            </PanelSkeleton>
            <PanelSkeleton actions={false} padded>
              <FormRowsSkeleton rows={2} />
            </PanelSkeleton>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
              <PanelSkeleton rows={5} />
              <PanelSkeleton rows={3} />
            </div>
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
              <PanelSkeleton rows={4} row="key-value" />
            </div>
          </div>
        )}
      </div>
    </SkeletonRegion>
  );
}

/* ─── Text and card lists ────────────────────────────────────────── */

/** A paragraph placeholder: `lines` lines in the paragraph's own type, the last one shorter. */
export function SkeletonText({
  lines = 3,
  text = "text-sm leading-relaxed",
  label,
  className,
}: RegionProps & { lines?: number; text?: string; className?: string }) {
  return (
    <div {...regionAttrs(label)} className={cn("flex min-w-0 flex-col", className)}>
      <RegionStatus label={label} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} text={text} width={i === lines - 1 ? "w-3/5" : "w-full"} />
      ))}
    </div>
  );
}

/**
 * A stack of bordered cards (a clause list, change list, event list): each
 * a title line and two text lines, held to `minHeight` (the loaded card's height).
 */
export function CardListSkeleton({
  count = 3,
  minHeight = "min-h-24",
  label,
  className,
}: RegionProps & { count?: number; /** Height class of one loaded card, e.g. "min-h-28". */ minHeight?: string; className?: string }) {
  return (
    <div {...regionAttrs(label)} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <RegionStatus label={label} />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className={cn("flex flex-col gap-1 rounded-xl border border-border-default bg-surface-raised p-4", minHeight)}>
          <span className="flex items-center gap-2">
            <SkeletonLine text="text-sm font-semibold" width={skeletonBarWidth(i, 1)} className="flex-1" />
            <Skeleton className="h-5 w-16 shrink-0 rounded-pill" />
          </span>
          <SkeletonLine text="text-sm" width="w-full" />
          <SkeletonLine text="text-sm" width={skeletonBarWidth(i, 2)} />
        </div>
      ))}
    </div>
  );
}
