import * as React from "react";
import { cn } from "@/lib/utils";
import { formatValue, wholeShares, type FormatOptions } from "../format";
import { Legend } from "../Legend";
import { cumulativeStarts } from "../Meter";
import { resolveSeries, type ChartSeries } from "./chart-utils";
import { ChartPatterns, seriesFill } from "./ChartPatterns";

export type StackedBar100Row = {
  key: string;
  label: string;
  /** Values per series key. Missing keys count as zero; unknown totals should be reported in the footnote. */
  values: Record<string, number>;
  /** Optional link target for the row label. */
  href?: string;
};

/**
 * One 100% bar per item (stage, office) split by the same parts, in a fixed
 * order: "what share of each stage is waiting on whom". Each row prints its
 * total; each segment's share is in the hover title and the accessible
 * name. Keep parts ≤ 5; hatch adjacent parts that must stay distinct
 * without colour (held-up vs potential).
 */
export function StackedBar100({
  rows,
  series,
  format,
  showLegend = true,
  labelWidthClass = "sm:w-40",
  className,
}: {
  rows: StackedBar100Row[];
  series: ChartSeries[];
  format?: FormatOptions;
  showLegend?: boolean;
  /** Label column width from sm up. */
  labelWidthClass?: string;
  className?: string;
}) {
  const resolved = resolveSeries(series);
  const scope = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className={cn("relative flex min-w-0 flex-col gap-3", className)}>
      <ChartPatterns scope={scope} series={resolved} />
      {showLegend && resolved.length > 1 && (
        <Legend items={resolved.map((s) => ({ key: s.key, label: s.label, color: s.color, hatch: s.hatch }))} />
      )}
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const vals = resolved.map((s) => Math.max(0, row.values[s.key] ?? 0));
          const total = vals.reduce((a, b) => a + b, 0);
          const shares = wholeShares(vals);
          const parts = resolved
            .map((s, i) => ({ s, v: vals[i], share: shares[i] }))
            .filter((p) => p.v > 0);
          const spoken = total
            ? parts.map((p) => `${p.s.label} ${formatValue(p.v, format)} (${p.share}%)`).join(", ")
            : "none";
          const starts = cumulativeStarts(parts.map((p) => (total ? (p.v / total) * 100 : 0)));
          return (
            <li key={row.key} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className={cn("flex min-w-0 items-baseline justify-between gap-2 sm:shrink-0", labelWidthClass)}>
                <span className="truncate text-body text-fg-primary" title={row.label}>{row.label}</span>
                <span className="shrink-0 text-caption tabular-nums text-fg-tertiary sm:hidden">{formatValue(total, format)}</span>
              </div>
              <svg
                role="img"
                aria-label={`${row.label}: ${formatValue(total, format)} in total. ${spoken}.`}
                width="100%"
                height="14"
                className="block min-w-0 flex-1"
              >
                <defs>
                  <clipPath id={`${scope}-${row.key}-clip`}>
                    <rect width="100%" height="14" rx="4" />
                  </clipPath>
                </defs>
                {total === 0 ? (
                  <rect width="100%" height="14" rx="4" className="fill-viz-track" />
                ) : (
                  <g clipPath={`url(#${scope}-${row.key}-clip)`}>
                    {parts.map((p, i) => {
                      const w = (p.v / total) * 100;
                      return (
                        <rect
                          key={p.s.key}
                          x={`${starts[i]}%`}
                          width={`${w}%`}
                          height="14"
                          fill={seriesFill(scope, p.s)}
                        >
                          <title>{`${p.s.label}: ${formatValue(p.v, format)} (${p.share}%)`}</title>
                        </rect>
                      );
                    })}
                    {starts.slice(1).map((x, i) => (
                      <rect key={`gap-${i}`} x={`${x}%`} width={2} height="14" transform="translate(-1 0)" className="fill-surface-raised" />
                    ))}
                  </g>
                )}
              </svg>
              <span className="hidden w-14 shrink-0 text-end text-body font-medium tabular-nums text-fg-primary sm:inline">
                {formatValue(total, { compact: true, ...format })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
