"use client";

// Recharts columns and lines for the reports, built to the shared chart
// conventions (components/charts/primitives, lib/chart-theme): one axis,
// thin marks, rounded data ends, hairline grid, a legend whenever there are
// two series, a hover tooltip and a hidden table twin. Unknown values stay
// gaps; they are never drawn as zero.

import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AXIS_STROKE, AXIS_TICK, ChartDataTable, GRID_STROKE, type ChartTable, RESPONSIVE_INITIAL, TooltipRow, TooltipShell, useChartMotion,
} from "@/components/charts/primitives";
import { cn } from "@/lib/utils";
import { LegendDot } from "./ReportCharts";

export type ChartRow = { label: string; tooltipLabel?: string } & Record<string, string | number | null | undefined>;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s) => <LegendDot key={s.key} color={s.color} label={s.label} />)}
    </div>
  );
}

function ChartTooltip({
  active, payload, series, format,
}: {
  active?: boolean;
  payload?: readonly { payload?: ChartRow }[];
  series: ChartSeries[];
  format: (n: number) => string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <TooltipShell label={row.tooltipLabel ?? row.label}>
      {series.map((s) => {
        const v = row[s.key];
        return <TooltipRow key={s.key} color={s.color} label={s.label} value={typeof v === "number" ? format(v) : "—"} />;
      })}
    </TooltipShell>
  );
}

/** The chart's rows as a table (screen-reader twin and "View as table"). */
export function chartRowsTable(caption: string, rows: ChartRow[], series: ChartSeries[], format: (n: number) => string = (n) => n.toLocaleString()): ChartTable {
  return {
    caption,
    columns: ["Period", ...series.map((s) => s.label)],
    rows: rows.map((r) => [r.tooltipLabel ?? r.label, ...series.map((s) => (typeof r[s.key] === "number" ? format(r[s.key] as number) : "—"))]),
  };
}

function table(caption: string, rows: ChartRow[], series: ChartSeries[], format: (n: number) => string) {
  return <ChartDataTable {...chartRowsTable(caption, rows, series, format)} />;
}

export function ColumnChart({
  rows, series, format = (n) => n.toLocaleString(), caption, height = 240, className,
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  format?: (n: number) => string;
  caption: string;
  height?: number;
  className?: string;
}) {
  const animate = useChartMotion();
  return (
    <figure className={cn("m-0 min-w-0", className)} aria-label={caption}>
      <Legend series={series} />
      <div className={cn("min-w-0", height <= 200 ? "h-[200px]" : height <= 240 ? "h-[240px]" : "h-[300px]")}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={RESPONSIVE_INITIAL}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS_STROKE }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => format(v)} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--ink-50)" }}
              content={({ active, payload }) => <ChartTooltip active={active} payload={payload as readonly { payload?: ChartRow }[]} series={series} format={format} />}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animate} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {table(caption, rows, series, format)}
    </figure>
  );
}

export function LineTrendChart({
  rows, series, format = (n) => n.toLocaleString(), caption, height = 240, reference, yMax, className,
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  format?: (n: number) => string;
  caption: string;
  height?: number;
  reference?: { value: number; label: string };
  yMax?: number;
  className?: string;
}) {
  const animate = useChartMotion();
  return (
    <figure className={cn("m-0 min-w-0", className)} aria-label={caption}>
      <Legend series={series} />
      <div className={cn("min-w-0", height <= 200 ? "h-[200px]" : height <= 240 ? "h-[240px]" : "h-[300px]")}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={RESPONSIVE_INITIAL}>
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS_STROKE }} interval="preserveStartEnd" minTickGap={8} padding={{ left: 8, right: 8 }} />
            <YAxis
              tick={AXIS_TICK} tickLine={false} axisLine={false} width={56}
              domain={[0, yMax ?? "auto"]} tickFormatter={(v: number) => format(v)} allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
              content={({ active, payload }) => <ChartTooltip active={active} payload={payload as readonly { payload?: ChartRow }[]} series={series} format={format} />}
            />
            {reference && (
              <ReferenceLine
                y={reference.value}
                stroke="var(--ink-500)"
                strokeWidth={1}
                label={{ value: reference.label, position: "insideTopRight", fill: "var(--ink-600)", fontSize: 12 }}
              />
            )}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={animate}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {table(caption, rows, series, format)}
    </figure>
  );
}
