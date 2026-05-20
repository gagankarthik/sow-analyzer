"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Counts = { low: number; medium: number; high: number; critical: number };

const SEGMENTS = [
  { key: "critical", label: "Critical", color: "var(--danger)" },
  { key: "high", label: "High", color: "var(--warning)" },
  { key: "medium", label: "Medium", color: "var(--ink-400)" },
  { key: "low", label: "Low", color: "var(--success)" },
] as const;

/** Donut of clause-risk distribution across the portfolio, with a center
 *  total and a legend. Animates in (Recharts default). */
export function RiskDonut({ counts }: { counts: Counts }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const data = SEGMENTS.map((s) => ({ ...s, value: counts[s.key] })).filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <p className="text-[13px] font-medium text-foreground">No risk-scored clauses yet</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">Process a contract to populate risk.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="numeric leading-none text-foreground"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.025em" }}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5">clauses</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2.5 min-w-0">
        {SEGMENTS.map((s) => {
          const value = counts[s.key];
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <li key={s.key} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[12.5px] text-foreground flex-1">{s.label}</span>
              <span className="text-[12px] text-muted-foreground tabular-nums">{value}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
