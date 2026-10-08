"use client";

import * as React from "react";
import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatValue, type FormatOptions } from "../format";
import {
  AXIS_LINE,
  AXIS_TICK,
  ChartTooltip,
  GRID_STROKE,
  RESPONSIVE_INITIAL,
  resolveSeries,
  useChartAnimation,
  useSvgId,
  type ChartSeries,
} from "./chart-utils";
import { ChartPatterns, seriesFill } from "./ChartPatterns";

export type BarChartProps<T extends Record<string, unknown>> = {
  data: T[];
  /** Field holding the category label (stage, office, sponsor). */
  categoryKey: keyof T & string;
  /** One or more numeric series. Order is the stacking and legend order. */
  series: ChartSeries[];
  /** `horizontal` (default): ranked comparisons with long labels. `vertical`: ordered categories (months, stages). */
  orientation?: "horizontal" | "vertical";
  stacked?: boolean;
  format?: FormatOptions;
  /** Print the value at the end of each bar (single, unstacked series). Default true for horizontal. */
  showValues?: boolean;
  /** Plot height in px for vertical charts. Horizontal height grows with rows. */
  height?: number;
  /** Width reserved for category labels (horizontal). */
  labelWidth?: number;
  /** Activate a category (drill-down). Keyboard users use the table view. */
  onSelect?: (row: T) => void;
  /** Accessible summary of the chart; ChartCard's takeaway usually covers this. */
  ariaLabel?: string;
  className?: string;
};

/**
 * Bars on one zero-based scale. Horizontal for ranked comparison (sorted by
 * the caller, or kept in workflow order), vertical for ordered categories;
 * `stacked` for composition per category. 2px surface gaps between stacked
 * segments, 4px rounded data ends, one axis, a recessive grid.
 */
export function BarChart<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  orientation = "horizontal",
  stacked = false,
  format,
  showValues,
  height = 260,
  labelWidth = 140,
  onSelect,
  ariaLabel,
  className,
}: BarChartProps<T>) {
  const animate = useChartAnimation();
  const scope = useSvgId("bar");
  const resolved = resolveSeries(series);
  const horizontal = orientation === "horizontal";
  const printValues = (showValues ?? horizontal) && resolved.length === 1 && !stacked;
  const tick = (v: number) => formatValue(v, { compact: true, ...format });
  const plotHeight = horizontal ? Math.max(120, data.length * 36 + 32) : height;
  const last = resolved.length - 1;

  return (
    <div className={cn("relative min-w-0", className)} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <ChartPatterns scope={scope} series={resolved} />
      <ResponsiveContainer width="100%" height={plotHeight} initialDimension={RESPONSIVE_INITIAL}>
        <RBarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: printValues ? 56 : 12, bottom: 0, left: 0 }}
          barCategoryGap={horizontal ? 8 : "24%"}
          accessibilityLayer={false}
        >
          <CartesianGrid stroke={GRID_STROKE} horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={tick} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey={categoryKey as string}
                width={labelWidth}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={categoryKey as string} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={tick} width={48} allowDecimals={false} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--surface-hover)" }}
            content={<ChartTooltip format={format} series={resolved} total={stacked} />}
          />
          {resolved.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "stack" : undefined}
              fill={seriesFill(scope, s)}
              stroke={stacked ? "var(--surface-raised)" : undefined}
              strokeWidth={stacked ? 1 : 0}
              radius={!stacked || i === last ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
              maxBarSize={horizontal ? 22 : 40}
              isAnimationActive={animate}
              animationDuration={300}
              onClick={onSelect ? (entry: unknown) => onSelect((entry as { payload: T }).payload) : undefined}
              cursor={onSelect ? "pointer" : undefined}
            >
              {printValues && (
                <LabelList
                  dataKey={s.key}
                  position={horizontal ? "right" : "top"}
                  className="fill-fg-primary text-caption font-medium tabular-nums"
                  formatter={(v: unknown) => formatValue(typeof v === "number" ? v : null, { compact: true, ...format })}
                />
              )}
            </Bar>
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
