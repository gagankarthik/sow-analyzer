"use client";

// Shared chart plumbing for components/ds/charts: axis and grid styling,
// the tooltip surface, the reduced-motion flag and the series model. Every
// wrapper reads from here so all charts share one look and one formatter.

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatValue, type FormatOptions } from "../format";
import { Swatch } from "../Meter";
import { VIZ_CHROME, seriesColor } from "../tokens";

/** One plotted series. `key` is the data field. Colour follows the series, never its rank. */
export type ChartSeries = {
  key: string;
  label: string;
  /** CSS colour reference. Defaults to the categorical slot of the series' index. */
  color?: string;
  /** Pattern fill (adjacent series that must stay distinct without colour). */
  hatch?: boolean;
};

/** Resolve series colours once, in declared order. */
export function resolveSeries(series: ChartSeries[]): Required<ChartSeries>[] {
  return series.map((s, i) => ({ ...s, color: s.color ?? seriesColor(i), hatch: s.hatch ?? false }));
}

/** recharts axis tick props: 12px, label ink. */
export const AXIS_TICK = { fontSize: 12, fill: VIZ_CHROME.label } as const;
export const AXIS_LINE = { stroke: VIZ_CHROME.axis } as const;
export const GRID_STROKE = VIZ_CHROME.grid;
/** Avoids recharts' width(-1) warning on first paint. */
export const RESPONSIVE_INITIAL = { width: 600, height: 240 } as const;

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia?.(REDUCED);
  mq?.addEventListener?.("change", cb);
  return () => mq?.removeEventListener?.("change", cb);
}

/** True when chart entrance animation may run (false under reduced motion and on the server). */
export function useChartAnimation(): boolean {
  return React.useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia?.(REDUCED).matches,
    () => false,
  );
}

/** Stable, DOM-safe id prefix for SVG defs. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | null;
  color?: string;
  payload?: Record<string, unknown>;
};

/**
 * The tooltip surface for recharts (pass as an element:
 * `content={<ChartTooltip format={…} series={…} />}`). Rows list every
 * series in declared order with ink text; the swatch carries identity.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  series,
  labelFormatter,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  format?: FormatOptions;
  series?: Required<ChartSeries>[];
  labelFormatter?: (label: string | number) => string;
  /** Print a total row (stacked charts). */
  total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = series
    ? series.map((s) => ({ s, item: payload.find((p) => String(p.dataKey) === s.key) }))
    : payload.map((p) => ({ s: { key: String(p.dataKey), label: String(p.name ?? p.dataKey), color: p.color ?? "", hatch: false }, item: p }));
  const sum = rows.reduce((acc, r) => acc + (typeof r.item?.value === "number" ? r.item.value : 0), 0);
  return (
    <div className="min-w-[10rem] rounded-lg border border-border-default bg-surface-overlay px-3 py-2 shadow-overlay">
      {label !== undefined && (
        <div className="mb-1 max-w-[240px] text-caption font-semibold text-fg-primary">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {rows.map(({ s, item }) => (
          <div key={s.key} className="flex items-center gap-2 text-caption">
            <Swatch color={s.color} hatch={s.hatch} />
            <span className="text-fg-secondary">{s.label}</span>
            <span className="ms-auto ps-3 font-semibold tabular-nums text-fg-primary">
              {formatValue(typeof item?.value === "number" ? item.value : null, format)}
            </span>
          </div>
        ))}
        {total && rows.length > 1 && (
          <div className="mt-0.5 flex items-center gap-2 border-t border-border-subtle pt-1 text-caption">
            <span className="text-fg-secondary">Total</span>
            <span className="ms-auto font-semibold tabular-nums text-fg-primary">{formatValue(sum, format)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Data table twin of a chart (the "view as table" body, and the sr-only alternative). */
export type ChartTableData = {
  columns: string[];
  rows: (string | number | null)[][];
  /** Index of numeric columns to right-align (default: every column after the first). */
  numericColumns?: number[];
};

/** A real, visible table of the chart's numbers. First column is the row header. */
export function ChartDataTable({
  data,
  caption,
  srOnly = false,
  className,
}: {
  data: ChartTableData;
  caption: string;
  srOnly?: boolean;
  className?: string;
}) {
  const numeric = new Set(data.numericColumns ?? data.columns.map((_, i) => i).filter((i) => i > 0));
  return (
    <div className={cn(srOnly ? "sr-only" : "max-h-80 overflow-auto rounded-lg border border-border-subtle", className)} tabIndex={srOnly ? undefined : 0} role={srOnly ? undefined : "region"} aria-label={srOnly ? undefined : `${caption}, table`}>
      <table className="w-full border-separate border-spacing-0 text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {data.columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "sticky top-0 border-b border-border-default bg-surface-sunken px-3 py-2 text-caption font-semibold text-fg-secondary",
                  numeric.has(i) ? "text-end" : "text-start",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => {
                const content = cell === null || cell === undefined ? "—" : cell;
                return ci === 0 ? (
                  <th key={ci} scope="row" className="border-b border-border-subtle px-3 py-2 text-start font-normal text-fg-primary">
                    {content}
                  </th>
                ) : (
                  <td key={ci} className={cn("border-b border-border-subtle px-3 py-2 text-fg-primary", numeric.has(ci) && "text-end tabular-nums")}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
