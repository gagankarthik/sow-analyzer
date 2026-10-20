// Chart row/series types and the table twin for the trend charts. Kept free of
// recharts so pages can build tables without pulling the chart bundle.

import type { ChartTable } from "@/components/charts/primitives";

export type ChartRow = { label: string; tooltipLabel?: string } & Record<string, string | number | null | undefined>;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

/** The chart's rows as a table (screen-reader twin and "View as table"). */
export function chartRowsTable(caption: string, rows: ChartRow[], series: ChartSeries[], format: (n: number) => string = (n) => n.toLocaleString()): ChartTable {
  return {
    caption,
    columns: ["Period", ...series.map((s) => s.label)],
    rows: rows.map((r) => [r.tooltipLabel ?? r.label, ...series.map((s) => (typeof r[s.key] === "number" ? format(r[s.key] as number) : "—"))]),
  };
}
