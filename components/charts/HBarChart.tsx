"use client";

// Reusable horizontal bar chart — the default for "compare a value across
// categories/items" (bars over pie, always). Supports per-bar color, click to
// drill down, and a `signed` mode (diverging around zero) for things like
// amendment value movement.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { ACCENT } from "@/lib/chart-theme";
import { TooltipShell, TooltipRow, useChartMotion, RESPONSIVE_INITIAL } from "./primitives";

export type HBarDatum = { id?: string; label: string; value: number; color?: string; sub?: string };
// Internal row carries a pre-formatted display string so the tooltip can stay a
// static, module-scope component (no closures created during render).
type HBarRow = HBarDatum & { _color: string; _display: string };

const ROW_HEIGHT = 34;

function truncate(s: string, n = 22): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function YTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text x={-8} y={0} dy={4} textAnchor="end" fontSize={11.5} fill="var(--ink-700)">
        {truncate(label)}
      </text>
    </g>
  );
}

function HBarTooltip({ active, payload }: { active?: boolean; payload?: { payload: HBarRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell label={d.label}>
      <TooltipRow color={d._color} label={d.sub ?? "Value"} value={d._display} />
    </TooltipShell>
  );
}

export function HBarChart({
  data,
  valueFormatter = (n: number) => n.toLocaleString(),
  onSelect,
  signed = false,
  accentColor = ACCENT,
  yAxisWidth = 150,
  unit,
}: {
  data: HBarDatum[];
  valueFormatter?: (n: number) => string;
  onSelect?: (id: string) => void;
  signed?: boolean;
  accentColor?: string;
  yAxisWidth?: number;
  unit?: string;
}) {
  const animate = useChartMotion();
  const height = Math.max(120, data.length * ROW_HEIGHT + 28);
  const rows: HBarRow[] = data.map((d) => ({
    ...d,
    _color: d.color ?? accentColor,
    _display: `${valueFormatter(d.value)}${unit ? ` ${unit}` : ""}`,
  }));

  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`Bar chart comparing ${data.length} items.`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={RESPONSIVE_INITIAL}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={valueFormatter}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false} axisLine={{ stroke: "var(--border)" }}
            domain={signed ? ["dataMin", "dataMax"] : [0, "dataMax"]}
          />
          <YAxis
            type="category" dataKey="label" width={yAxisWidth}
            tick={<YTick />} tickLine={false} axisLine={false}
          />
          {signed && <ReferenceLine x={0} stroke="var(--ink-300)" />}
          <Tooltip content={<HBarTooltip />} cursor={{ fill: "var(--ink-100)", fillOpacity: 0.5 }} />
          <Bar
            dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={animate} maxBarSize={22}
            onClick={(d: unknown) => {
              const id = (d as { payload?: { id?: string } })?.payload?.id;
              if (id) onSelect?.(id);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {rows.map((d, i) => (
              <Cell key={d.id ?? i} fill={d._color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
