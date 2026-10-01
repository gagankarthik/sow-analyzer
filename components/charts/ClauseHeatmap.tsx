"use client";

import { useMemo, useState } from "react";
import type { RiskLevel } from "@/lib/types";
import { categoryLabel } from "@/lib/clause-categories";
import { NEUTRAL_MARK, RISK_COLOR, RISK_LABEL, RISK_ORDER } from "@/lib/chart-theme";

/** `riskRated === false` marks a clause the analysis returned without a risk
 *  level. Its `riskLevel` is then only a placeholder and is never counted. */
type ClauseLike = { category: string; riskLevel: RiskLevel; riskRated?: boolean };

type ColKey = RiskLevel | "unrated";
type Row = { category: string; counts: Record<ColKey, number>; total: number };

const LEVEL_COLS: { key: ColKey; label: string; color: string }[] = RISK_ORDER.map((key) => ({
  key,
  label: RISK_LABEL[key],
  color: RISK_COLOR[key],
}));
const UNRATED_COL: { key: ColKey; label: string; color: string } = { key: "unrated", label: "Not assessed", color: NEUTRAL_MARK };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Category × severity matrix. Each cell's tint scales with its clause count,
 *  colored by the severity column — so risk concentration is visible at a glance.
 *  Tints are capped at 60% so the dark count stays AA-legible in every cell.
 *
 *  Nothing is dropped: clauses without a risk level get their own "Not assessed"
 *  column (shown only when there are any), every category is counted in the
 *  totals, and when there are more than `maxRows` categories the rest sit behind
 *  a "Show all" control with the total stated next to it. */
export function ClauseHeatmap({ clauses, maxRows = 10 }: { clauses: ClauseLike[]; maxRows?: number }) {
  const [showAll, setShowAll] = useState(false);

  const { rows, maxCell, unratedTotal, clauseTotal } = useMemo(() => {
    const m = new Map<string, Record<ColKey, number>>();
    for (const c of clauses) {
      const row = m.get(c.category) ?? { low: 0, medium: 0, high: 0, critical: 0, unrated: 0 };
      row[c.riskRated === false || !c.riskLevel ? "unrated" : c.riskLevel]++;
      m.set(c.category, row);
    }
    const all: Row[] = [...m.entries()].map(([category, counts]) => ({
      category,
      counts,
      total: counts.low + counts.medium + counts.high + counts.critical + counts.unrated,
    }));
    all.sort((a, b) => b.total - a.total || categoryLabel(a.category).localeCompare(categoryLabel(b.category)));
    return {
      rows: all,
      // One scale for every row, so tints do not shift when the list is expanded.
      maxCell: Math.max(1, ...all.flatMap((r) => [r.counts.low, r.counts.medium, r.counts.high, r.counts.critical, r.counts.unrated])),
      unratedTotal: all.reduce((s, r) => s + r.counts.unrated, 0),
      clauseTotal: all.reduce((s, r) => s + r.total, 0),
    };
  }, [clauses]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No clause data to map.</p>;
  }

  const cols = unratedTotal > 0 ? [...LEVEL_COLS, UNRATED_COL] : LEVEL_COLS;
  // Column totals cover every category, shown or not.
  const colTotals = cols.map((c) => ({ ...c, total: rows.reduce((s, r) => s + r.counts[c.key], 0) }));
  const limit = Math.max(1, maxRows);
  const shown = showAll ? rows : rows.slice(0, limit);
  const hidden = rows.length - shown.length;

  return (
    <div className="min-w-0">
      {/* Scrolls sideways only when the column is narrower than the matrix; the
          region is focusable so keyboard users can scroll it too. */}
      <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]" role="region" aria-label="Clause count by category and risk level" tabIndex={0}>
        <table className="w-full min-w-[300px] table-fixed border-separate border-spacing-[3px]">
          <caption className="sr-only">
            Number of clauses in each category at each risk level. Darker cells hold more clauses.
            {unratedTotal > 0 ? " Clauses the analysis returned without a risk level are in the Not assessed column." : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-[34%] pb-1.5 pl-1 text-left align-bottom text-xs font-medium text-muted-foreground">Category</th>
              {colTotals.map((c) => (
                <th key={c.key} scope="col" className="pb-1.5 align-bottom">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="inline-flex items-center gap-1.5 text-center text-xs font-medium text-foreground">
                      <span aria-hidden className="hidden h-2 w-2 shrink-0 rounded-sm sm:block" style={{ background: c.color }} />{c.label}
                    </span>
                    <span className="text-xs font-normal tabular-nums text-muted-foreground">{c.total}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.category}>
                <th scope="row" className="pl-1 pr-2 text-left font-normal">
                  <span className="flex items-baseline gap-1.5">
                    <span className="min-w-0 truncate text-xs font-medium text-foreground" title={categoryLabel(r.category)}>{categoryLabel(r.category)}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.total}</span>
                  </span>
                </th>
                {cols.map((c) => {
                  const n = r.counts[c.key];
                  const intensity = n === 0 ? 0 : 0.16 + 0.44 * (n / maxCell);
                  return (
                    <td key={c.key} className="p-0">
                      <div
                        className={`flex h-9 items-center justify-center rounded-md text-xs tabular-nums ${n === 0 ? "bg-[var(--panel)] text-[var(--ink-400)]" : "font-semibold text-[var(--ink-900)]"}`}
                        style={n === 0 ? undefined : { background: `color-mix(in srgb, ${c.color} ${Math.round(intensity * 100)}%, transparent)` }}
                        title={`${categoryLabel(r.category)} · ${c.label}: ${n}`}
                      >
                        {n || <span aria-hidden>·</span>}
                        {n === 0 && <span className="sr-only">0</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {hidden > 0 ? `Showing ${shown.length} of ${plural(rows.length, "category", "categories")}` : plural(rows.length, "category", "categories")}
          {" · "}{plural(clauseTotal, "clause", "clauses")}
          {unratedTotal > 0 ? ` · ${unratedTotal.toLocaleString()} without a risk level` : ""}
          {hidden > 0 ? ". Column totals include every category." : ""}
        </p>
        {rows.length > limit && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0"
          >
            {showAll ? `Show the first ${limit}` : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
