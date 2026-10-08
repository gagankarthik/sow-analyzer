import * as React from "react";
import { cn } from "@/lib/utils";
import { formatValue, wholeShares, type FormatOptions } from "../format";
import { Swatch, cumulativeStarts } from "../Meter";
import { seriesColor } from "../tokens";

export type DonutSlice = { key: string; label: string; value: number; color?: string };

/**
 * Part-to-whole for 2–5 parts with a total in the middle and a labelled key
 * (label · value · share), so no reading depends on angle or colour alone.
 * More than five parts: fold into "Other" or use a bar chart. For one bar
 * per item, StackedBar100 reads faster.
 */
export function Donut({
  slices,
  totalLabel = "Total",
  format,
  size = 160,
  className,
}: {
  slices: DonutSlice[];
  totalLabel?: string;
  format?: FormatOptions;
  /** Diameter in px. */
  size?: number;
  className?: string;
}) {
  const present = slices.filter((s) => s.value > 0);
  const total = present.reduce((s, x) => s + x.value, 0);
  const shares = wholeShares(present.map((s) => s.value));
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = present.length > 1 ? 1.2 : 0; // surface gap between arcs (in circumference units)
  const summary = present.map((s, i) => `${s.label} ${formatValue(s.value, format)} (${shares[i]}%)`).join(", ");

  const lengths = present.map((s) => (s.value / total) * c);
  const offsets = cumulativeStarts(lengths);
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center", className)}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={total ? `${totalLabel} ${formatValue(total, format)}: ${summary}.` : "No data"}
        className="shrink-0"
      >
        <g transform="rotate(-90 50 50)">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-viz-track" />
        {present.map((s, i) => {
          const dash = Math.max(lengths[i] - gap, 0.5);
          return (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color ?? seriesColor(i)}
              strokeWidth="12"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offsets[i]}
            />
          );
        })}
        </g>
        <g>
          <text x="50" y="47" textAnchor="middle" className="fill-fg-primary text-[13px] font-semibold tabular-nums">
            {formatValue(total, { compact: true, ...format })}
          </text>
          <text x="50" y="60" textAnchor="middle" className="fill-fg-tertiary text-[7px]">
            {totalLabel}
          </text>
        </g>
      </svg>
      <ul className="flex w-full min-w-0 flex-col gap-1.5">
        {present.map((s, i) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2 text-body">
            <Swatch color={s.color ?? seriesColor(i)} />
            <span className="min-w-0 flex-1 truncate text-fg-primary" title={s.label}>{s.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-fg-primary">{formatValue(s.value, format)}</span>
            <span className="w-10 shrink-0 text-end text-caption tabular-nums text-fg-tertiary">{shares[i]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
