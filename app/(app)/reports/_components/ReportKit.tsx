"use client";

// Building blocks shared by the leader home and the reports: the loading,
// error and empty treatments, a report panel, a stat tile, the plain-word
// search field and the filter bar. Kept here so every report reads the same.

import { byEdition } from "@/lib/edition-runtime";
import { useAgreementTypes } from "@/lib/govern/queries";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, RefreshCw, Search, X, XCircle } from "@/components/ui/icons";
import { isForbidden } from "@/lib/api";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import {
  NO_FILTERS, VALUE_BAND_LABEL, type ContractFilters, type ValueBand, filterOptions,
} from "@/lib/govern/metrics";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/ds/Toolbar";
import { FilterButton, MoreFiltersButton } from "@/components/ds/FilterButton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Panel as DsPanel } from "@/components/ds/Panel";
import { KpiTile } from "@/components/ds/KpiTile";
import type { ChartTable } from "@/components/charts/primitives";

/* ── Page states ─────────────────────────────────────────────────────────── */

/** Failed load: a 403 says so plainly; anything else offers a retry. */
export function ReportError({ error, onRetry, what = "these figures" }: { error: unknown; onRetry: () => void; what?: string }) {
  const forbidden = isForbidden(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border px-5 py-12 text-center md:py-16",
        forbidden ? "border-border bg-card" : "border-[var(--danger)]/30 bg-[var(--danger-soft)]",
      )}
    >
      <span className={cn("mb-3 inline-flex", forbidden ? "text-[var(--ink-600)]" : "text-[var(--danger)]")}>
        {forbidden ? <Lock size={24} aria-hidden /> : <XCircle size={24} aria-hidden />}
      </span>
      <h2 className="text-base font-semibold text-foreground">
        {forbidden ? "You don't have access to this" : `Couldn't load ${what}`}
      </h2>
      <p className="mt-1 max-w-md text-sm text-[var(--ink-600)]">
        {forbidden
          ? "Your account can't see contract reports. Ask a Govern admin to give you leader or reviewer access."
          : "Nothing is shown rather than figures that might be wrong. Check your connection and try again."}
      </p>
      {!forbidden && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden />Try again
        </Button>
      )}
    </div>
  );
}

/** Nothing in the workspace yet: say what to do. */
export function NoContracts() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-12 text-center md:py-16">
      <h2 className="text-base font-semibold text-foreground">No contracts yet</h2>
      <p className="mt-1 max-w-md text-sm text-[var(--ink-600)]">
        Upload an agreement to see figures here.
      </p>
      <Button className="mt-4" asChild>
        <Link href="/projects/upload">Upload an agreement</Link>
      </Button>
    </div>
  );
}

/* ── Panels and tiles ────────────────────────────────────────────────────── */

export function Panel({
  id, title, meta, sub, action, children, className, bodyClassName, table,
}: {
  id?: string;
  title: string;
  /** Short meta beside the title (12px muted): a count. */
  meta?: React.ReactNode;
  /** A short status line at the top of the body: figures, not coaching. */
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** The chart's numbers, offered as "View as table" under it. */
  table?: ChartTable;
}) {
  return (
    <DsPanel id={id} as="h2" title={title} meta={meta} actions={action} className={className} bodyClassName={bodyClassName}>
      {sub && <p className="mb-3 text-xs text-[var(--ink-600)]">{sub}</p>}
      {children}
      {table && <ViewAsTable table={table} />}
    </DsPanel>
  );
}

/** A chart's numbers as a visible table, folded away until asked for. It
 *  scrolls inside its own box on narrow screens, never the page. */
export function ViewAsTable({ table }: { table: ChartTable }) {
  return (
    <details className="group mt-4 border-t border-border pt-3">
      <summary className="inline-flex cursor-pointer list-none items-center rounded-sm text-xs font-medium text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] max-md:min-h-11 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">View as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">{table.caption}</caption>
          <thead className="bg-[var(--panel)]">
            <tr>
              {table.columns.map((c, i) => (
                <th key={c} scope="col" className={cn("h-[38px] px-3 text-xs font-medium text-[var(--ink-600)]", i === 0 ? "sticky left-0 z-10 bg-[var(--panel)] text-left" : "text-right")}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((cell, j) => (j === 0
                  ? <th key={j} scope="row" className="sticky left-0 z-10 h-[42px] bg-card px-3 text-left font-medium text-foreground">{cell}</th>
                  : <td key={j} className="h-[42px] px-3 text-right tabular-nums text-[var(--ink-700)]">{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** A summary tile: the shared ds KpiTile, so reports and home match. */
export function StatTile({
  label, value, hint, tone = "neutral", href, className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "brand" | "warning" | "danger" | "success";
  href?: string;
  className?: string;
}) {
  // Neutral by default: only a value that needs action (warning, danger)
  // is coloured; "brand" emphasis is no longer a colour.
  const t = tone === "warning" || tone === "danger" || tone === "success" ? tone : undefined;
  return <KpiTile label={label} value={value} footnote={hint} tone={t} href={href} className={className} frame="cell" />;
}

/** The figures row: StatTiles as cells of one bordered card, divided by
 *  hairlines, the same bar as every page's KPI summary. */
export function StatBar({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn(
      "grid min-w-0 grid-cols-2 overflow-hidden rounded-container border border-border-default bg-surface-raised lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none [&>*]:border-border-subtle [&>*:nth-child(even)]:border-l max-lg:[&>*:nth-child(n+3)]:border-t lg:[&>*:not(:first-child)]:border-l",
      className,
    )}>
      {children}
    </section>
  );
}

/** A quiet text link with an arrow, used for "See all" and "Details". */
export const TEXT_LINK =
  "inline-flex items-center gap-1 rounded-sm text-sm font-medium text-[var(--brand-primary-700)] hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] max-md:min-h-11";

/* ── Search and filters ──────────────────────────────────────────────────── */

export function SearchField({
  id, value, onChange, placeholder, label, large = false, className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search
        size={large ? 20 : 16}
        aria-hidden
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-500)]", large ? "left-4" : "left-3")}
      />
      <Input
        id={id}
        type="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border-[var(--ink-300)] bg-card",
          large ? "h-14 rounded-xl pl-12 pr-12 text-lg md:text-lg" : "h-9 rounded-lg pl-9 pr-9 text-base md:text-sm",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={cn(
            "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
            large ? "right-3 h-9 w-9" : "right-1.5 h-8 w-8",
          )}
        >
          <X size={large ? 20 : 16} aria-hidden />
        </button>
      )}
    </div>
  );
}

type Options = ReturnType<typeof filterOptions>;

type Dim<T extends string> = {
  key: keyof ContractFilters;
  label: string;
  value: T;
  options: { value: T; label: string }[];
};

/** A labelled select for the mobile filter sheet (44px). */
function SheetSelect<T extends string>({ dim, onChange }: { dim: Dim<T>; onChange: (v: T) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ink-600)]">{dim.label}</span>
      <Select value={dim.value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="h-11 w-full min-w-0 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dim.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

/** One dimension as radio items inside a menu (quick filter or "More filters"). */
function DimRadio<T extends string>({ dim, onChange }: { dim: Dim<T>; onChange: (v: T) => void }) {
  return (
    <DropdownMenuRadioGroup value={dim.value} onValueChange={(v) => onChange(v as T)}>
      {dim.options.map((o) => (
        <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/**
 * Search, four quick filters, "More filters" (every filter, for narrow rows
 * and the two that are not quick), Clear, and the live "N of M" count: the
 * shared list toolbar (UI_SPEC section 9). Same props as before.
 */
export function FilterBar({
  idPrefix, filters, onChange, options, shown, total, noun,
}: {
  idPrefix: string;
  filters: ContractFilters;
  onChange: (f: ContractFilters) => void;
  options: Options;
  shown: number;
  total: number;
  noun: string;
}) {
  const agreementTypes = useAgreementTypes();
  const set = (k: keyof ContractFilters, v: string) => onChange({ ...filters, [k]: v } as ContractFilters);
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "q" && v !== "all").length;

  const dims: Dim<string>[] = [
    {
      key: "agreementType", label: "Type", value: filters.agreementType,
      options: [{ value: "all", label: "All types" }, ...agreementTypes.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }))],
    },
    {
      key: "sponsor", label: byEdition("Sponsor", "Vendor"), value: filters.sponsor,
      options: [{ value: "all", label: byEdition("Any sponsor", "Any vendor") }, ...options.sponsors.map((x) => ({ value: x, label: x }))],
    },
    {
      key: "department", label: "Department", value: filters.department,
      options: [{ value: "all", label: "All departments" }, ...options.departments.map((x) => ({ value: x, label: x }))],
    },
    {
      key: "risk", label: "Risk", value: filters.risk,
      options: [
        { value: "all", label: "Any risk" },
        { value: "needs_attention", label: "Needs attention" },
        { value: "high", label: "High or critical" },
        { value: "critical", label: "Critical only" },
      ],
    },
    {
      key: "reviewer", label: "Reviewer", value: filters.reviewer,
      options: [{ value: "all", label: "All reviewers" }, ...options.reviewers.map((r) => ({ value: r.email, label: r.name }))],
    },
    {
      key: "valueBand", label: "Value", value: filters.valueBand,
      options: (Object.keys(VALUE_BAND_LABEL) as ValueBand[]).map((b) => ({ value: b, label: VALUE_BAND_LABEL[b] })),
    },
  ];
  const quick = dims.slice(0, 4);
  const valueLabel = (d: Dim<string>) => (d.value === "all" ? undefined : d.options.find((o) => o.value === d.value)?.label ?? d.value);
  const clearAll = () => onChange({ ...NO_FILTERS, q: filters.q });

  const count = (
    <p className="whitespace-nowrap text-xs text-[var(--ink-600)]" aria-live="polite">
      <span className="font-medium text-foreground tabular-nums">{shown.toLocaleString("en-US")}</span> of{" "}
      <span className="tabular-nums">{total.toLocaleString("en-US")}</span> {noun}
    </p>
  );

  return (
    <Toolbar
      label={`Filter ${noun}`}
      activeCount={activeCount}
      mobileActions={count}
      mobileSheet={
        <div id={`${idPrefix}-filters`} className="flex flex-col gap-3">
          {dims.map((d) => <SheetSelect key={d.key} dim={d} onChange={(v) => set(d.key, v)} />)}
          {activeCount > 0 && (
            <Button variant="outline" className="h-11" onClick={clearAll}>Clear filters</Button>
          )}
        </div>
      }
    >
      <Toolbar.Search
        label={`Search ${noun}`}
        placeholder="Search contracts"
        value={filters.q}
        onChange={(v) => set("q", v)}
      />
      <Toolbar.Filters>
        {quick.map((d) => (
          <FilterButton
            key={d.key}
            label={d.label}
            value={valueLabel(d)}
            onClear={() => set(d.key, "all")}
          >
            <DimRadio dim={d} onChange={(v) => set(d.key, v)} />
          </FilterButton>
        ))}
      </Toolbar.Filters>
      <Toolbar.More>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreFiltersButton count={activeCount} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
            {dims.map((d, i) => (
              <React.Fragment key={d.key}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{d.label}</DropdownMenuLabel>
                <DimRadio dim={d} onChange={(v) => set(d.key, v)} />
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Toolbar.More>
      <Toolbar.Clear count={activeCount} onClear={clearAll} />
      <Toolbar.Actions>{count}</Toolbar.Actions>
    </Toolbar>
  );
}

export function reviewerNameFrom(options: Options) {
  return (email: string) => options.reviewers.find((r) => r.email === email)?.name ?? email;
}
