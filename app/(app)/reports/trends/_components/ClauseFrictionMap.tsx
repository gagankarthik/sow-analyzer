"use client";

// Which matrix positions cause the most friction: clause types that came back
// "needs changes" or "not acceptable", per period. A heat map on wider
// screens (one hue, light to dark, count printed in every cell), and a list
// of small trend lines on phones, so nothing scrolls sideways.

import { Sparkline } from "../../_components/ReportCharts";
import type { Trends } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/** Light to dark steps of the navy sequential ramp (re-steps in dark mode);
 *  text stays ≥ 4.5:1 on every step (see components/ds/charts/Heatmap). */
const STEPS = [
  "bg-viz-seq-1 text-fg-primary",
  "bg-viz-seq-2 text-fg-primary",
  "bg-viz-seq-3 text-fg-primary",
  "bg-viz-seq-4 text-white dark:text-fg-primary",
  "bg-viz-seq-6 text-white dark:text-[#0C1528]",
];

function stepFor(count: number, max: number): string {
  if (count <= 0) return "bg-[var(--panel)] text-[var(--ink-500)]";
  const i = Math.min(STEPS.length - 1, Math.floor((count / max) * STEPS.length - 1e-9));
  return STEPS[Math.max(0, i)];
}

export function ClauseFrictionMap({
  deviations, periods, labels, ticks,
}: {
  deviations: Trends["clauseDeviations"];
  periods: string[];
  /** Full period names (tooltips, table). */
  labels: string[];
  /** Short period names (column heads). */
  ticks: string[];
}) {
  const max = Math.max(1, ...deviations.flatMap((d) => periods.map((p) => d.byPeriod[p] ?? 0)));

  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed border-separate border-spacing-[2px] text-sm">
          <caption className="sr-only">Clauses that needed changes or were not acceptable, per period</caption>
          <colgroup>
            <col className="w-[30%]" />
            {periods.map((p) => <col key={p} />)}
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="px-2 pb-1 text-left text-xs font-medium text-[var(--ink-600)]">Clause</th>
              {periods.map((p, i) => (
                <th key={p} scope="col" className="pb-1 text-center text-xs font-medium text-[var(--ink-600)]" title={labels[i]}>
                  {ticks[i]}
                </th>
              ))}
              <th scope="col" className="pb-1 text-right text-xs font-medium text-[var(--ink-600)]">Total</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d) => (
              <tr key={d.clauseType}>
                <th scope="row" className="truncate px-2 py-1.5 text-left font-medium text-foreground" title={d.label}>{d.label}</th>
                {periods.map((p, i) => {
                  const n = d.byPeriod[p] ?? 0;
                  return (
                    <td
                      key={p}
                      title={`${d.label}, ${labels[i]}: ${n}`}
                      className={cn("h-9 rounded-[4px] text-center text-xs font-semibold tabular-nums", stepFor(n, max))}
                    >
                      {n > 0 ? n : <span className="sr-only">0</span>}
                    </td>
                  );
                })}
                <td className="pr-1 text-right font-semibold tabular-nums text-foreground">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--ink-600)]" aria-hidden>
          Fewer
          {STEPS.map((s) => <span key={s} className={cn("h-3 w-6 rounded-[3px]", s.split(" ")[0])} />)}
          More
        </div>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {deviations.map((d) => (
          <li key={d.clauseType} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 py-3">
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-foreground">{d.label}</span>
              <span className="text-sm text-[var(--ink-600)]">{d.total} in this window</span>
            </span>
            <Sparkline
              periods={labels}
              caption={`${d.label}: clauses needing changes per period`}
              series={[{ label: d.label, values: periods.map((p) => d.byPeriod[p] ?? 0), color: "var(--brand-primary-600)" }]}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
