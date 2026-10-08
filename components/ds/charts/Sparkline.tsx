import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A word-sized trend line (pure SVG, no axes) for KPI tiles and table
 * cells. Decorative by default: the tile's delta or footnote states the
 * change in words. Nulls break the line instead of dropping to zero.
 */
export function Sparkline({
  values,
  color = "var(--viz-primary)",
  area = true,
  markLast = true,
  ariaLabel,
  className,
}: {
  values: (number | null)[];
  /** CSS colour reference. */
  color?: string;
  area?: boolean;
  markLast?: boolean;
  /** Give a label only when the sparkline is the sole carrier of the trend. */
  ariaLabel?: string;
  className?: string;
}) {
  const W = 100;
  const H = 32;
  const pad = 3;
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length < 2) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  // Split into runs of consecutive known values.
  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push({ i, v });
  });
  if (run.length) runs.push(run);

  const lastIdx = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop()!;
  const lastVal = values[lastIdx] as number;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("block h-8 w-full overflow-visible", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {runs.map((r, k) => {
        const d = r.map((p, j) => `${j ? "L" : "M"}${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(" ");
        return (
          <g key={k}>
            {area && r.length > 1 && (
              <path d={`${d} L${x(r[r.length - 1].i).toFixed(2)},${H} L${x(r[0].i).toFixed(2)},${H} Z`} fill={color} opacity={0.1} />
            )}
            <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
      {markLast && (
        <circle cx={x(lastIdx)} cy={y(lastVal)} r={2.5} fill={color} stroke="var(--surface-raised)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
