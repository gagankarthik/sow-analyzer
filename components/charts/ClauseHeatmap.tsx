"use client";

import { useMemo } from "react";
import type { RiskLevel } from "@/lib/types";

type ClauseLike = { category: string; riskLevel: RiskLevel };

const COLS: { key: RiskLevel; label: string; color: string }[] = [
  { key: "low", label: "Low", color: "var(--success)" },
  { key: "medium", label: "Medium", color: "var(--ink-400)" },
  { key: "high", label: "High", color: "var(--warning)" },
  { key: "critical", label: "Critical", color: "var(--danger)" },
];

/** Category × severity matrix. Each cell's tint scales with its clause count,
 *  colored by the severity column — so risk concentration is visible at a glance. */
export function ClauseHeatmap({ clauses, maxRows = 10 }: { clauses: ClauseLike[]; maxRows?: number }) {
  const { rows, maxCell } = useMemo(() => {
    const m = new Map<string, Record<RiskLevel, number>>();
    for (const c of clauses) {
      const row = m.get(c.category) ?? { low: 0, medium: 0, high: 0, critical: 0 };
      row[c.riskLevel ?? "low"]++;
      m.set(c.category, row);
    }
    const all = [...m.entries()].map(([category, counts]) => ({
      category,
      counts,
      total: counts.low + counts.medium + counts.high + counts.critical,
    }));
    all.sort((a, b) => b.total - a.total);
    const trimmed = all.slice(0, maxRows);
    const maxCell = Math.max(1, ...trimmed.flatMap((r) => COLS.map((c) => r.counts[c.key])));
    return { rows: trimmed, maxCell };
  }, [clauses, maxRows]);

  const colTotals = COLS.map((c) => ({ ...c, total: rows.reduce((s, r) => s + r.counts[c.key], 0) }));

  if (rows.length === 0) {
    return <p className="text-[12.5px] text-muted-foreground">No clause data to map.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: "3px" }}>
        <thead>
          <tr>
            <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pb-1 pl-1 w-[34%]">Category</th>
            {colTotals.map((c) => (
              <th key={c.key} className="pb-1">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: c.color }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{c.total}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td className="text-[12px] font-medium text-foreground pr-2 pl-1 whitespace-nowrap">
                <span className="inline-block max-w-[160px] truncate align-middle">{r.category}</span>
                <span className="ml-1.5 text-[10.5px] tabular-nums text-muted-foreground">{r.total}</span>
              </td>
              {COLS.map((c) => {
                const n = r.counts[c.key];
                const intensity = n === 0 ? 0 : 0.14 + 0.72 * (n / maxCell);
                return (
                  <td key={c.key} className="p-0">
                    <div
                      className="h-9 rounded-md flex items-center justify-center text-[12px] font-semibold tabular-nums transition-colors"
                      style={{
                        background: n === 0 ? "var(--ink-50)" : `color-mix(in srgb, ${c.color} ${Math.round(intensity * 100)}%, transparent)`,
                        color: n === 0 ? "var(--ink-300)" : intensity > 0.55 ? "#fff" : "var(--ink-800)",
                      }}
                      title={`${r.category} · ${c.label}: ${n}`}
                    >
                      {n || "·"}
                    </div>
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
