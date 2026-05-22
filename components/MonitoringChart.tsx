"use client";

// Activity-feed style monitoring chart for the landing "problem" bento.
// Stacked area of high-risk clauses + anomalies surfaced per month, drawn with
// the project's brand/info tokens (no hardcoded hex) so it matches the product.

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";

const DATA = [
  { month: "Jan", clauses: 56, anomalies: 18 },
  { month: "Feb", clauses: 84, anomalies: 24 },
  { month: "Mar", clauses: 126, anomalies: 31 },
  { month: "Apr", clauses: 168, anomalies: 22 },
  { month: "May", clauses: 205, anomalies: 38 },
  { month: "Jun", clauses: 262, anomalies: 41 },
];

const SERIES = [
  { key: "clauses", label: "High-risk clauses", color: "var(--brand-primary-600)" },
  { key: "anomalies", label: "Anomalies", color: "var(--info)" },
] as const;

function MonitorTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value?: number; dataKey?: string | number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p) => {
          const meta = SERIES.find((s) => s.key === p.dataKey);
          return (
            <div key={String(p.dataKey)} className="flex items-center gap-2 text-[12px]">
              <span className="h-2 w-2 rounded-sm" style={{ background: meta?.color }} />
              <span className="text-muted-foreground">{meta?.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">{p.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonitoringChart() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="h-56 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="monClauses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-primary-500)" stopOpacity={0.35} />
                <stop offset="60%" stopColor="var(--brand-primary-500)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="monAnomalies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.32} />
                <stop offset="60%" stopColor="var(--info)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} dy={6} />
            <Tooltip content={<MonitorTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="anomalies" stackId="a" stroke="var(--info)" strokeWidth={2} fill="url(#monAnomalies)" />
            <Area type="monotone" dataKey="clauses" stackId="a" stroke="var(--brand-primary-600)" strokeWidth={2} fill="url(#monClauses)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
