"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart as RLineChart,
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
  type ChartSeries,
} from "./chart-utils";

type TrendProps<T extends Record<string, unknown>> = {
  data: T[];
  /** Field holding the x value (a label like "Mar" or a sortable date string). */
  xKey: keyof T & string;
  /** ≤ 4 series. More than four: use small multiples. */
  series: ChartSeries[];
  format?: FormatOptions;
  /** Formats x ticks and the tooltip heading. */
  xFormatter?: (x: string | number) => string;
  height?: number;
  /** Print the latest value at the end of each line (direct label). */
  labelLast?: boolean;
  ariaLabel?: string;
  className?: string;
};

function useTrendAxes(format: FormatOptions | undefined, xFormatter?: (x: string | number) => string) {
  const tick = (v: number) => formatValue(v, { compact: true, ...format });
  return { tick, xFormatter };
}

/**
 * Change over time for up to four series: 2px lines, markers only on hover,
 * one y-axis that starts at zero, a crosshair tooltip. Gaps (null) are drawn
 * as gaps, never as zero.
 */
export function LineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  format,
  xFormatter,
  height = 240,
  labelLast = false,
  ariaLabel,
  className,
}: TrendProps<T>) {
  const animate = useChartAnimation();
  const resolved = resolveSeries(series.slice(0, 4));
  const { tick } = useTrendAxes(format, xFormatter);
  return (
    <div className={cn("min-w-0", className)} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height} initialDimension={RESPONSIVE_INITIAL}>
        <RLineChart data={data} margin={{ top: 8, right: labelLast ? 48 : 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey={xKey as string} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} tickFormatter={xFormatter} minTickGap={24} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={tick} width={48} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            content={<ChartTooltip format={format} series={resolved} labelFormatter={xFormatter} />}
          />
          {resolved.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.hatch ? "6 4" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-raised)" }}
              connectNulls={false}
              isAnimationActive={animate}
              animationDuration={300}
              label={
                labelLast
                  ? (p: { index?: number; x?: number | string; y?: number | string; value?: unknown }) =>
                      p.index === data.length - 1 && typeof p.value === "number" ? (
                        <text x={Number(p.x) + 6} y={Number(p.y)} dy={4} className="fill-fg-primary text-caption font-medium">
                          {formatValue(p.value, { compact: true, ...format })}
                        </text>
                      ) : (
                        <g />
                      )
                  : false
              }
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A single measure over time with a soft area under the line: volume or
 * value trends where the magnitude matters. One series (stacked areas hide
 * individual trends; use LineChart for comparison).
 */
export function AreaTrend<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  format,
  xFormatter,
  height = 240,
  ariaLabel,
  className,
}: TrendProps<T>) {
  const animate = useChartAnimation();
  const s = resolveSeries(series.slice(0, 1))[0];
  const { tick } = useTrendAxes(format, xFormatter);
  if (!s) return null;
  return (
    <div className={cn("min-w-0", className)} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height} initialDimension={RESPONSIVE_INITIAL}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey={xKey as string} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} tickFormatter={xFormatter} minTickGap={24} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={tick} width={48} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            content={<ChartTooltip format={format} series={[s]} labelFormatter={xFormatter} />}
          />
          <Area
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-raised)" }}
            connectNulls={false}
            isAnimationActive={animate}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
