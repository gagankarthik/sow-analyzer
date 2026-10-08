"use client";

// Building blocks shared by the leader home and the reports: the loading,
// error and empty treatments, a report panel, a stat tile, the plain-word
// search field and the filter bar. Kept here so every report reads the same.

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, RefreshCw, Search, X, XCircle } from "@/components/ui/icons";
import { isForbidden } from "@/lib/api";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import {
  NO_FILTERS, VALUE_BAND_LABEL, isFiltering, type ContractFilters, type ValueBand, filterOptions,
} from "@/lib/govern/metrics";
import { cn } from "@/lib/utils";
import type { ChartTable } from "@/components/charts/primitives";

/* ── Page states ─────────────────────────────────────────────────────────── */

export function ReportSkeleton({ variant = "report" }: { variant?: "report" | "home" }) {
  if (variant === "home") {
    return (
      <div className="space-y-10" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-14 w-full max-w-2xl rounded-xl" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-7" />
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-5" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-xl lg:col-span-7" />
        <Skeleton className="h-80 rounded-xl lg:col-span-5" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

/** Failed load: a 403 says so plainly; anything else offers a retry. */
export function ReportError({ error, onRetry, what = "these figures" }: { error: unknown; onRetry: () => void; what?: string }) {
  const forbidden = isForbidden(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-2xl border px-5 py-14 text-center md:py-20",
        forbidden ? "border-border bg-card" : "border-[var(--danger)]/30 bg-[var(--danger-soft)]",
      )}
    >
      <span className={cn("mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card", forbidden ? "text-[var(--ink-600)] ring-1 ring-border" : "text-[var(--danger)]")}>
        {forbidden ? <Lock size={22} strokeWidth={1.75} /> : <XCircle size={24} strokeWidth={1.5} />}
      </span>
      <h2 className="text-lg font-semibold text-foreground">
        {forbidden ? "You don't have access to this" : `Couldn't load ${what}`}
      </h2>
      <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--ink-600)]">
        {forbidden
          ? "Your account can't see contract reports. Ask a Govern admin to give you leader or reviewer access."
          : "Nothing is shown rather than figures that might be wrong. Check your connection and try again."}
      </p>
      {!forbidden && (
        <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}>
          <RefreshCw size={14} />Try again
        </Button>
      )}
    </div>
  );
}

/** Nothing in the workspace yet: say what to do. */
export function NoContracts() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-16 text-center">
      <h2 className="text-lg font-semibold text-foreground">No contracts yet</h2>
      <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--ink-600)]">
        Upload an agreement to start. Sonar reads it, checks it against your matrix and it appears here.
      </p>
      <Button className="mt-6" size="lg" asChild>
        <Link href="/projects/upload">Upload an agreement</Link>
      </Button>
    </div>
  );
}

/* ── Panels and tiles ────────────────────────────────────────────────────── */

export function Panel({
  id, title, sub, action, children, className, bodyClassName, table,
}: {
  id?: string;
  title: string;
  /** The takeaway: one plain sentence that answers the panel's question. */
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** The chart's numbers, offered as "View as table" under it. */
  table?: ChartTable;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("min-w-0 scroll-mt-24 rounded-xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-4 md:px-6">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
          {sub && <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{sub}</p>}
        </div>
        {action}
      </header>
      <div className={cn("min-w-0 p-4 md:p-6", bodyClassName)}>
        {children}
        {table && <ViewAsTable table={table} />}
      </div>
    </section>
  );
}

/** A chart's numbers as a visible table, folded away until asked for. It
 *  scrolls inside its own box on narrow screens, never the page. */
export function ViewAsTable({ table }: { table: ChartTable }) {
  return (
    <details className="group mt-4 border-t border-border pt-3">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">View as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <div className="mt-3 max-w-full overflow-x-auto border-y border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">{table.caption}</caption>
          <thead className="bg-[var(--panel)]">
            <tr>
              {table.columns.map((c, i) => (
                <th key={c} scope="col" className={cn("px-3 py-2 text-xs font-medium text-[var(--ink-600)]", i === 0 ? "text-left" : "text-right")}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((cell, j) => (j === 0
                  ? <th key={j} scope="row" className="px-3 py-2 text-left font-medium text-foreground">{cell}</th>
                  : <td key={j} className="px-3 py-2 text-right tabular-nums text-[var(--ink-700)]">{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

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
  // A dot beside the label marks the tone; the label's words carry the meaning.
  const bar = {
    neutral: "bg-[var(--ink-300)]",
    brand: "bg-[var(--viz-primary)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
    success: "bg-[var(--success)]",
  }[tone];
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-[var(--ink-600)]">
        {tone !== "neutral" && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", bar)} />}
        {label}
      </span>
      <span className="mt-1.5 block break-words text-[clamp(20px,2.2vw,26px)] font-semibold leading-tight tracking-[-0.02em] text-foreground tabular-nums">{value}</span>
      {hint && <span className="mt-1.5 block text-sm leading-snug text-[var(--ink-600)]">{hint}</span>}
    </>
  );
  const cls = cn("block min-w-0 rounded-xl border border-border bg-card px-5 py-4", className);
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors duration-150 hover:border-[var(--ink-300)] hover:bg-[var(--ink-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A quiet text link with an arrow, used for "See all" and "Details". */
export const TEXT_LINK =
  "inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0";

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
          large ? "h-14 rounded-xl pl-12 pr-12 text-lg md:text-lg" : "h-10 pl-9 pr-9 text-base md:text-sm",
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
          <X size={large ? 18 : 15} />
        </button>
      )}
    </div>
  );
}

type Options = ReturnType<typeof filterOptions>;

function FilterSelect<T extends string>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ink-600)]">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className={cn("h-10 w-full min-w-0 bg-card", value !== "all" && "border-[var(--brand-primary-400)] text-[var(--brand-primary-700)]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

/** Plain-word search first, then the six optional filters (Requirement 3). */
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
  const set = <K extends keyof ContractFilters>(k: K, v: ContractFilters[K]) => onChange({ ...filters, [k]: v });
  const active = isFiltering(filters);
  const [open, setOpen] = React.useState(false);
  const moreCount = Object.entries(filters).filter(([k, v]) => k !== "q" && v !== "all").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          id={`${idPrefix}-search`}
          label={`Search ${noun}`}
          placeholder="Search by sponsor, PI, department or title"
          value={filters.q}
          onChange={(v) => set("q", v)}
          className="sm:max-w-md sm:flex-1"
        />
        <Button
          variant="outline"
          className="h-10 sm:w-auto"
          aria-expanded={open}
          aria-controls={`${idPrefix}-filters`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide filters" : "Filters"}
          {moreCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary-600)] px-1.5 text-xs font-semibold text-white tabular-nums">
              {moreCount}
            </span>
          )}
        </Button>
        <p className="text-sm text-[var(--ink-600)] sm:ml-auto" aria-live="polite">
          Showing <span className="font-semibold text-foreground tabular-nums">{shown}</span> of{" "}
          <span className="tabular-nums">{total}</span> {noun}
          {active && (
            <button
              type="button"
              onClick={() => onChange(NO_FILTERS)}
              className="ml-3 font-semibold text-[var(--brand-primary-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
            >
              Clear
            </button>
          )}
        </p>
      </div>
      {open && (
        <div id={`${idPrefix}-filters`} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-[var(--panel)] p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect
            label="Contract type"
            value={filters.agreementType}
            onChange={(v) => set("agreementType", v)}
            options={[{ value: "all", label: "All types" }, ...AGREEMENT_TYPES.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }))]}
          />
          <FilterSelect
            label="Sponsor or licensee"
            value={filters.sponsor}
            onChange={(v) => set("sponsor", v)}
            options={[{ value: "all", label: "Everyone" }, ...options.sponsors.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            onChange={(v) => set("department", v)}
            options={[{ value: "all", label: "All departments" }, ...options.departments.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Reviewer"
            value={filters.reviewer}
            onChange={(v) => set("reviewer", v)}
            options={[{ value: "all", label: "All reviewers" }, ...options.reviewers.map((r) => ({ value: r.email, label: r.name }))]}
          />
          <FilterSelect<ValueBand>
            label="Value"
            value={filters.valueBand}
            onChange={(v) => set("valueBand", v)}
            options={(Object.keys(VALUE_BAND_LABEL) as ValueBand[]).map((b) => ({ value: b, label: VALUE_BAND_LABEL[b] }))}
          />
          <FilterSelect<ContractFilters["risk"]>
            label="Risk"
            value={filters.risk}
            onChange={(v) => set("risk", v)}
            options={[
              { value: "all", label: "Any risk" },
              { value: "needs_attention", label: "Needs attention" },
              { value: "high", label: "High or critical" },
              { value: "critical", label: "Critical only" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export function reviewerNameFrom(options: Options) {
  return (email: string) => options.reviewers.find((r) => r.email === email)?.name ?? email;
}
