"use client";

// Shared chart chrome so every visualization gets the same card frame, header,
// tooltip, and — critically — the same loading / empty / error treatment.
// Pages pass a `state`; the frame renders the right fallback inside the card so
// no chart is ever just the happy path.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

export type ChartState = "ready" | "loading" | "empty" | "error";

export function ChartCard({
  title,
  icon,
  sub,
  actions,
  state = "ready",
  emptyText = "No data to show yet.",
  errorText = "Couldn't load this view.",
  onRetry,
  bodyClassName,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  state?: ChartState;
  emptyText?: string;
  errorText?: string;
  onRetry?: () => void;
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-xs", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <h3 className="text-base font-semibold min-w-0 tracking-tight text-foreground">{title}</h3>
        </div>
        {actions ? actions : sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </header>
      <div className={cn("min-w-0 flex-1 p-4 md:p-5", bodyClassName)}>
        {state === "loading" ? (
          <Skeleton className="h-full min-h-[200px] w-full rounded-lg" />
        ) : state === "error" ? (
          <ChartFallback
            tone="error"
            icon={<AlertTriangle size={22} strokeWidth={1.75} />}
            text={errorText}
            action={onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--ink-300)] bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:h-9"
              >
                <RefreshCw size={14} />Retry
              </button>
            )}
          />
        ) : state === "empty" ? (
          <ChartFallback tone="muted" text={emptyText} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ChartFallback({ tone, icon, text, action }: { tone: "muted" | "error"; icon?: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center px-4 text-center">
      {icon && <span className={cn("mb-2", tone === "error" ? "text-[var(--danger)]" : "text-muted-foreground")}>{icon}</span>}
      <p className={cn("max-w-[44ch] text-sm leading-relaxed", tone === "error" ? "text-[var(--danger)]" : "text-muted-foreground")}>{text}</p>
      {action}
    </div>
  );
}

/** Inline spinner for charts whose underlying queries are still streaming in. */
export function ChartLoadingHint({ label = "Updating…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 size={12} className="animate-spin" />
      {label}
    </span>
  );
}

/** Consistent tooltip surface — recharts passes children rows. */
export function TooltipShell({ label, children }: { label?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      {label != null && <div className="mb-1 max-w-[240px] text-xs font-semibold text-foreground">{label}</div>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TooltipRow({ color, label, value }: { color?: string; label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {color && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void): () => void {
  const mq = window.matchMedia?.(REDUCED_MOTION);
  mq?.addEventListener?.("change", onChange);
  return () => mq?.removeEventListener?.("change", onChange);
}

/** Reactive reduced-motion flag for recharts `isAnimationActive`. */
export function useChartMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia?.(REDUCED_MOTION).matches,
    () => true,
  );
}

/** Shared ResponsiveContainer defaults: positive initialDimension avoids the
 *  recharts width(-1)/height(-1) warning on first paint. Pair it with a parent
 *  that has an explicit height and `min-w-0`. */
export const RESPONSIVE_INITIAL = { width: 600, height: 240 } as const;

/** Shared axis/grid styling so every recharts chart reads the same. */
export const AXIS_TICK = { fontSize: 12, fill: "var(--ink-600)" } as const;
export const GRID_STROKE = "var(--ink-100)";
export const AXIS_STROKE = "var(--ink-300)";

/* ── Text alternatives ─────────────────────────────────────────────────── */

export type ChartTable = { caption: string; columns: string[]; rows: (string | number)[][] };

/** Visually hidden data table — the screen-reader twin of a chart. */
export function ChartDataTable({ caption, columns, rows }: ChartTable) {
  return (
    // The wrapper carries sr-only: a <table> itself ignores the 1px clip box
    // and would widen the page.
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/** Wraps a chart with its takeaway (`summary`) and an optional hidden table. */
export function ChartFigure({
  summary, table, className, children,
}: {
  summary: string;
  table?: ChartTable;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={cn("m-0 min-w-0", className)} aria-label={summary}>
      {children}
      {table && <ChartDataTable {...table} />}
    </figure>
  );
}

/** Plain message that holds the chart's footprint when there is nothing to draw. */
export function ChartEmpty({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex min-h-[160px] items-center justify-center px-4 text-center", className)}>
      <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

/** Legend entry: a colour swatch beside ink-coloured text. */
export function LegendSwatch({ color, label, line = false }: { color: string; label: React.ReactNode; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-600)]">
      <span aria-hidden className={cn("shrink-0", line ? "h-0.5 w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-sm")} style={{ background: color }} />
      {label}
    </span>
  );
}

/* ── Ranked horizontal bars ────────────────────────────────────────────── */

export type BarListRow = {
  key: string;
  /** When set together with `onSelect`, the row becomes a button. */
  id?: string;
  label: string;
  value: number;
  /** Formatted value shown at the end of the row. */
  display: string;
  color: string;
  /** Secondary line under the label (always visible, never tooltip-only). */
  note?: string;
};

/**
 * Horizontal bars on one shared scale, with the value printed on every row.
 * Bars start at a zero baseline; `signed` puts the baseline where zero falls
 * between the smallest and largest value. Below ~320px of container width the
 * label moves above its bar so nothing is squeezed or clipped.
 */
export function BarList({
  rows, labelWidth = 150, signed = false, onSelect, caption, max,
}: {
  rows: BarListRow[];
  /** Shared scale when one list is split into columns, so bars compare across them. */
  max?: number;
  labelWidth?: number;
  signed?: boolean;
  onSelect?: (id: string) => void;
  caption?: string;
}) {
  const values = rows.map((r) => r.value);
  const hi = max ?? Math.max(0, ...values);
  const lo = signed ? Math.min(0, ...values) : 0;
  const span = hi - lo || 1;
  const zero = (-lo / span) * 100;
  const valueWidth = Math.max(2, ...rows.map((r) => r.display.length)) + 1;
  const vars = { "--bar-label": `${labelWidth}px`, "--bar-value": `${valueWidth}ch` } as React.CSSProperties;
  const rowClass =
    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md py-1 text-left @[320px]:grid-cols-[minmax(0,min(var(--bar-label),40%))_minmax(0,1fr)_var(--bar-value)]";

  return (
    <div className="@container min-w-0" style={vars}>
      {caption && <p className="mb-2 text-xs text-muted-foreground">{caption}</p>}
      <ul className="space-y-1">
        {rows.map((r) => {
          const width = (Math.abs(Math.max(lo, Math.min(hi, r.value))) / span) * 100;
          const negative = r.value < 0;
          const body = (
            <>
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground" title={r.label}>{r.label}</span>
                {r.note && <span className="block truncate text-xs text-muted-foreground" title={r.note}>{r.note}</span>}
              </span>
              <span className="text-right text-sm font-medium tabular-nums text-foreground @[320px]:order-3">{r.display}</span>
              <span aria-hidden className="relative col-span-2 block h-3 rounded-sm bg-[var(--panel)] @[320px]:order-2 @[320px]:col-span-1">
                {r.value !== 0 && (
                  <span
                    className={cn("absolute inset-y-0 min-w-[3px]", negative ? "rounded-l-[4px]" : "rounded-r-[4px]")}
                    style={negative
                      ? { right: `${100 - zero}%`, width: `${width}%`, background: r.color }
                      : { left: `${zero}%`, width: `${width}%`, background: r.color }}
                  />
                )}
                {signed && lo < 0 && <span className="absolute -inset-y-1 w-px bg-[var(--ink-400)]" style={{ left: `${zero}%` }} />}
              </span>
            </>
          );
          return (
            <li key={r.key}>
              {onSelect && r.id ? (
                <button
                  type="button"
                  onClick={() => onSelect(r.id!)}
                  className={cn(rowClass, "-mx-2 w-[calc(100%+1rem)] px-2 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]")}
                >
                  {body}
                </button>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
