import * as React from "react";
import { cn } from "@/lib/utils";
import { formatValue, isUnknown, type FormatOptions } from "../format";

const STEP_BG = [
  "bg-viz-seq-1",
  "bg-viz-seq-2",
  "bg-viz-seq-3",
  "bg-viz-seq-4",
  "bg-viz-seq-5",
  "bg-viz-seq-6",
  "bg-viz-seq-7",
] as const;

// Text that stays ≥ 4.5:1 on each navy step. Light: ink on steps 1–3
// (5.59:1 on step 3), white on 4–7 (≥ 5.58:1). Dark flips the ramp: light
// ink on 1–4 (≥ 4.98:1), navy-900 on 5–7 (≥ 5.92:1).
const STEP_TEXT = [
  "text-fg-primary",
  "text-fg-primary",
  "text-fg-primary",
  "text-white dark:text-fg-primary",
  "text-white dark:text-[#0C1528]",
  "text-white dark:text-[#0C1528]",
  "text-white dark:text-[#0C1528]",
] as const;

export type HeatmapProps = {
  /** Row headers (e.g. clause types). */
  rows: { key: string; label: string }[];
  /** Column headers (e.g. agreement types, months). */
  columns: { key: string; label: string }[];
  /** Value for a cell; null = not assessed (hatched, "—"), distinct from 0. */
  value: (rowKey: string, colKey: string) => number | null | undefined;
  /** Accessible caption: "Clauses needing changes, by clause and agreement type". */
  caption: string;
  format?: FormatOptions;
  /** Fixed maximum for the scale (defaults to the data max). */
  max?: number;
  className?: string;
};

/**
 * Magnitude across two categorical dimensions, as a real <table>: every
 * cell prints its value (colour is a second channel, never the only one),
 * on the sequential navy ramp. Unknown cells are hatched with "—".
 */
export function Heatmap({ rows, columns, value, caption, format, max, className }: HeatmapProps) {
  const all = rows.flatMap((r) => columns.map((c) => value(r.key, c.key))).filter((v): v is number => !isUnknown(v));
  const hi = max ?? Math.max(1, ...all);
  const step = (v: number) => (v <= 0 ? 0 : Math.min(STEP_BG.length - 1, 1 + Math.floor((v / hi) * (STEP_BG.length - 1.0001))));

  return (
    <div className={cn("min-w-0 overflow-x-auto", className)} tabIndex={0} role="region" aria-label={`${caption} (scrollable)`}>
      <table className="w-full border-separate border-spacing-0.5 text-caption">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <td />
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-1 pb-1 text-center font-medium text-fg-secondary">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="max-w-[12rem] truncate pe-3 text-start font-medium text-fg-secondary" title={r.label}>
                {r.label}
              </th>
              {columns.map((c) => {
                const v = value(r.key, c.key);
                if (isUnknown(v)) {
                  return (
                    <td key={c.key} className="ds-hatch h-9 min-w-12 rounded-sm text-center text-fg-tertiary">
                      <span aria-hidden>—</span>
                      <span className="sr-only">Not assessed</span>
                    </td>
                  );
                }
                const s = step(v);
                return (
                  <td
                    key={c.key}
                    className={cn("h-9 min-w-12 rounded-sm text-center font-medium tabular-nums", STEP_BG[s], STEP_TEXT[s])}
                  >
                    {formatValue(v, format)}
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

/** Key for the heatmap's scale: low → high swatches with end labels. */
export function HeatmapScale({ lowLabel = "Fewer", highLabel = "More", className }: { lowLabel?: string; highLabel?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-caption text-fg-tertiary", className)} aria-hidden>
      <span>{lowLabel}</span>
      <span className="flex gap-0.5">
        {STEP_BG.map((bg) => (
          <span key={bg} className={cn("h-2.5 w-5 rounded-[2px]", bg)} />
        ))}
      </span>
      <span>{highLabel}</span>
    </div>
  );
}
