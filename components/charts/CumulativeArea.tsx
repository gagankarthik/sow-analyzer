"use client";

// Cumulative analyzed-volume over time. The ONLY honest time axis we have is
// when documents were uploaded/processed (there's no real per-period event
// stream), so this is explicitly "by upload date" — never a fabricated monthly
// trend. Total clauses + the high-risk subset are drawn from zero so the gap
// between them reads as accumulating exposure. A range selector zooms the tail
// of the curve without resetting the cumulative baseline.

import { useId, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TooltipShell, TooltipRow, useChartMotion, RESPONSIVE_INITIAL } from "./primitives";

export type AreaPoint = { t: number; total: number; highRisk: number };
type Range = "all" | "90d" | "30d";
const DAY = 86_400_000;
const RANGES: { k: Range; label: string; days: number | null }[] = [
  { k: "all", label: "All", days: null },
  { k: "90d", label: "90d", days: 90 },
  { k: "30d", label: "30d", days: 30 },
];

function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Tip({ active, payload, label }: { active?: boolean; payload?: { value?: number; dataKey?: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const total = payload.find((p) => p.dataKey === "total")?.value ?? 0;
  const high = payload.find((p) => p.dataKey === "highRisk")?.value ?? 0;
  return (
    <TooltipShell label={typeof label === "number" ? fmtDate(label) : ""}>
      <TooltipRow color="var(--brand-primary-600)" label="Clauses analyzed" value={total.toLocaleString()} />
      <TooltipRow color="var(--danger)" label="High-risk" value={high.toLocaleString()} />
    </TooltipShell>
  );
}

export function CumulativeArea({ points }: { points: AreaPoint[] }) {
  const [range, setRange] = useState<Range>("all");
  const [now] = useState(() => Date.now()); // mount-time reference for range filtering
  const animate = useChartMotion();
  const rawId = useId().replace(/:/g, "");

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.k === range)?.days ?? null;
    if (!days) return points;
    const cutoff = now - days * DAY;
    const within = points.filter((p) => p.t >= cutoff);
    return within.length ? within : points.slice(-2); // never render an empty window
  }, [points, range, now]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Legend color="var(--brand-primary-600)" label="Clauses analyzed" />
          <Legend color="var(--danger)" label="High-risk" />
        </div>
        <div role="group" aria-label="Time range" className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.k}
              type="button"
              onClick={() => setRange(r.k)}
              aria-pressed={range === r.k}
              className="inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:bg-[var(--brand-primary-50)] aria-[pressed=true]:text-[var(--brand-primary-700)]"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full md:h-64" role="img" aria-label="Cumulative clauses analyzed over upload date, with the high-risk subset.">
        <ResponsiveContainer width="100%" height="100%" initialDimension={RESPONSIVE_INITIAL}>
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`area-total-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-primary-500)" stopOpacity={0.28} />
                <stop offset="70%" stopColor="var(--brand-primary-500)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`area-high-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.24} />
                <stop offset="70%" stopColor="var(--danger)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t" type="number" domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} dy={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false}
              width={36} allowDecimals={false}
            />
            <Tooltip content={<Tip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="total" stroke="var(--brand-primary-600)" strokeWidth={2} fill={`url(#area-total-${rawId})`} isAnimationActive={animate} />
            <Area type="monotone" dataKey="highRisk" stroke="var(--danger)" strokeWidth={2} fill={`url(#area-high-${rawId})`} isAnimationActive={animate} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
