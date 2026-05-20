"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   AreaChart — multi-series stacked area chart
   ────────────────────────────────────────────────────────────── */

type Series = {
  key: string;
  label: string;
  color: string;
  data: number[]; // same length as xLabels
};

type AreaChartProps = {
  xLabels: string[];
  series: Series[];
  height?: number;
  yFormat?: (n: number) => string;
  className?: string;
};

export function AreaChart({
  xLabels,
  series,
  height = 220,
  yFormat = (n) => `${n}`,
  className,
}: AreaChartProps) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const padL = 44, padR = 16, padT = 10, padB = 28;
  const width = 720;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const N = xLabels.length;

  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min;

  const x = (i: number) => padL + (i / (N - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - min) / range) * innerH;

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    min + (range * i) / ticks,
  );

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Area chart"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const i = Math.round(((px - padL) / innerW) * (N - 1));
          setHoverIdx(Math.max(0, Math.min(N - 1, i)));
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Y grid */}
        {tickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(tv)}
              y2={y(tv)}
              stroke="var(--ink-100)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "2 4"}
            />
            <text
              x={padL - 8}
              y={y(tv) + 3}
              textAnchor="end"
              className="font-mono"
              fontSize="9.5"
              fill="var(--ink-500)"
            >
              {yFormat(tv)}
            </text>
          </g>
        ))}

        {/* Areas */}
        {series.map((s) => {
          const path = s.data
            .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
            .join(" ");
          const area = `${path} L ${x(N - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`;
          return (
            <g key={s.key}>
              <path d={area} fill={`url(#area-${s.key})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}

        {/* X labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 8}
            textAnchor="middle"
            className="font-mono"
            fontSize="9.5"
            fill="var(--ink-500)"
          >
            {lbl}
          </text>
        ))}

        {/* Hover */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--ink-300)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={x(hoverIdx)}
                cy={y(s.data[hoverIdx]!)}
                r="3.5"
                fill="var(--bg-elev)"
                stroke={s.color}
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverIdx !== null && (
        <div className="absolute top-2 right-2 bg-card border rounded-lg shadow-sm px-3 py-2 text-[11.5px] pointer-events-none z-10">
          <div className="eyebrow mb-1.5 text-muted-foreground">{xLabels[hoverIdx]}</div>
          <ul className="space-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-foreground">{s.label}</span>
                <span className="numeric font-medium ml-auto">{yFormat(s.data[hoverIdx]!)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 px-1">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   StackedBar — pipeline by stage
   ────────────────────────────────────────────────────────────── */

type StackedBarProps = {
  segments: { label: string; value: number; color: string; count?: number }[];
  /** Format hint: "money-m" => $XM, "count" => integer. */
  format?: "money-m" | "count";
  height?: number;
  className?: string;
};

export function StackedBar({
  segments,
  format = "money-m",
  height = 56,
  className,
}: StackedBarProps) {
  const formatValue = (n: number) =>
    format === "money-m" ? `$${n.toFixed(1)}M` : `${Math.round(n)}`;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="w-full rounded-full overflow-hidden flex shadow-inner bg-[var(--ink-100)]"
        style={{ height }}
      >
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          if (pct < 0.3) return null;
          return (
            <div
              key={s.label}
              className="relative group flex items-center justify-center text-[11px] text-white font-medium overflow-hidden"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${formatValue(s.value)}`}
            >
              {pct > 6 && (
                <span className="px-2 text-center whitespace-nowrap">
                  {formatValue(s.value)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2 text-[11.5px]">
            <span className="inline-block h-2 w-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-muted-foreground flex-1 truncate">{s.label}</span>
            <span className="numeric font-medium text-foreground">
              {s.count !== undefined ? s.count : formatValue(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Heatmap — GitHub-style activity grid
   ────────────────────────────────────────────────────────────── */

type HeatmapProps = {
  weeks: number[][]; // [weeks][7 days]
  max?: number;
  className?: string;
  cellSize?: number;
  gap?: number;
};

export function Heatmap({
  weeks,
  max,
  className,
  cellSize = 14,
  gap = 3,
}: HeatmapProps) {
  const computedMax = max ?? Math.max(...weeks.flat(), 1);
  const colorFor = (v: number) => {
    if (v === 0) return "var(--ink-100)";
    const t = v / computedMax;
    if (t < 0.25) return "rgba(99,102,241,0.22)";
    if (t < 0.5)  return "rgba(99,102,241,0.48)";
    if (t < 0.75) return "rgba(99,102,241,0.72)";
    return "rgba(99,102,241,0.96)";
  };

  const cols = weeks.length;
  const rows = 7;
  const cw = cellSize;
  const ch = cellSize;
  const gx = 2;
  const gy = 2;
  const gridW = cols * cw + (cols - 1) * gx;
  const gridH = rows * ch + (rows - 1) * gy;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <svg
        viewBox={`0 0 ${gridW} ${gridH}`}
        className="w-full"
        style={{ height: 96 }}
        preserveAspectRatio="none"
        aria-label="Activity heatmap"
        role="img"
      >
        {weeks.map((week, wi) =>
          week.map((v, di) => (
            <rect
              key={`${wi}-${di}`}
              x={wi * (cw + gx)}
              y={di * (ch + gy)}
              width={cw}
              height={ch}
              rx="2.5"
              fill={colorFor(v)}
            >
              <title>{v} events</title>
            </rect>
          ))
        )}
      </svg>
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>less</span>
        <div className="flex gap-1">
          {[0, 0.2, 0.4, 0.7, 1].map((t, i) => (
            <span
              key={i}
              className="inline-block w-3 h-3 rounded-sm"
              style={{
                background: t === 0 ? "var(--ink-100)" : `rgba(99,102,241,${0.18 + t * 0.77})`,
              }}
            />
          ))}
        </div>
        <span>more</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   RadialGauge — semi-circular gauge
   ────────────────────────────────────────────────────────────── */

type GaugeProps = {
  value: number;        // 0..100
  max?: number;
  label?: string;
  hint?: string;
  size?: number;
  thickness?: number;
  colorFor?: (pct: number) => string;
  className?: string;
};

export function RadialGauge({
  value,
  max = 100,
  label,
  hint,
  size = 180,
  thickness = 14,
  colorFor,
  className,
}: GaugeProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const r = (size - thickness) / 2;
  // semicircle: half of circumference
  const half = Math.PI * r;
  const dash = (pct / 100) * half;
  const remaining = half - dash;
  const color = colorFor
    ? colorFor(pct)
    : pct > 75 ? "#059669"
    : pct > 50 ? "#0EA5E9"
    : pct > 25 ? "#D97706"
    : "#DC2626";

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${thickness/2} ${size/2} A ${r} ${r} 0 0 1 ${size - thickness/2} ${size/2}`}
          fill="none"
          stroke="var(--ink-100)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* Value */}
        <path
          d={`M ${thickness/2} ${size/2} A ${r} ${r} 0 0 1 ${size - thickness/2} ${size/2}`}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${remaining}`}
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2 - 12}
          textAnchor="middle"
          className="numeric"
          fontSize="34"
          fontWeight="800"
          letterSpacing="-1"
          fill="var(--ink-900)"
        >
          {Math.round(value)}
        </text>
        {label && (
          <text
            x={size / 2}
            y={size / 2 + 4}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="1.5"
            fill="var(--ink-500)"
          >
            {label.toUpperCase()}
          </text>
        )}
      </svg>
      {hint && (
        <div className="text-[11px] text-muted-foreground text-center mt-1">{hint}</div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   FlowBar — money flow (contracted/invoiced/collected)
   ────────────────────────────────────────────────────────────── */

export function FlowBar({
  contracted,
  invoiced,
  collected,
  outstanding,
  className,
}: {
  contracted: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  className?: string;
}) {
  const invPct = (invoiced / contracted) * 100;
  const collPct = (collected / contracted) * 100;
  const outPct = (outstanding / contracted) * 100;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative h-3 w-full rounded-full bg-[var(--ink-100)] overflow-hidden">
        {/* invoiced (background layer) */}
        <div
          className="absolute inset-y-0 left-0 bg-[#A5B4FC]"
          style={{ width: `${invPct}%` }}
        />
        {/* collected (foreground) */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#10B981] to-[#059669]"
          style={{ width: `${collPct}%` }}
        />
        {/* outstanding marker */}
        {outPct > 0 && (
          <div
            className="absolute inset-y-0 bg-[#F59E0B]"
            style={{ left: `${collPct}%`, width: `${invPct - collPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   GradientStat — colorful hero card
   ────────────────────────────────────────────────────────────── */

type GradientStatProps = {
  eyebrow: string;
  value: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: React.ReactNode;
  /** css gradient string, e.g. "linear-gradient(135deg, #059669, #10B981)" */
  gradient: string;
  /** override text-on-gradient color (defaults to white) */
  fg?: string;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
  className?: string;
};

export function GradientStat({
  eyebrow,
  value,
  delta,
  hint,
  gradient,
  fg = "#FFFFFF",
  icon,
  chart,
  className,
}: GradientStatProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden p-5 ring-1 ring-black/5 shadow-sm",
        className,
      )}
      style={{ background: gradient, color: fg }}
    >
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full" style={{ background: `${fg}10` }} />
      <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full" style={{ background: `${fg}08` }} />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div
            className="label-cap"
            style={{ color: fg, opacity: 0.75 }}
          >
            {eyebrow}
          </div>
          <div
            className="numeric mt-3 leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              fontSize: 36,
            }}
          >
            {value}
          </div>
          {delta && (
            <div
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5"
              style={{ background: `${fg}1F`, color: fg }}
            >
              {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•"}{" "}
              {delta.value}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ background: `${fg}1F`, color: fg }}
          >
            {icon}
          </div>
        )}
      </div>

      {chart && (
        <div className="relative mt-4 -mx-1" style={{ color: fg }}>
          {chart}
        </div>
      )}

      {hint && (
        <div
          className="relative mt-2 text-[11px]"
          style={{ color: fg, opacity: 0.78 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TinyArea — used inside GradientStat cards
   ────────────────────────────────────────────────────────────── */

export function TinyArea({
  data,
  color = "#FFFFFF",
  height = 36,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const reactId = React.useId();
  if (!data.length) return null;
  const width = 220;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1);
  const points = data.map((v, i) => [i * dx, height - ((v - min) / range) * (height - 4) - 2] as const);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  const id = `ta-${reactId.replace(/:/g, "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   Funnel — deal-stage conversion
   ────────────────────────────────────────────────────────────── */

type FunnelStep = { stage: string; count: number; conversion?: number };

export function Funnel({
  steps,
  className,
  height = 240,
}: {
  steps: FunnelStep[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  const width = 480;
  const stepH = height / steps.length;
  const padX = 80;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full", className)}>
      <defs>
        <linearGradient id="fnl" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {steps.map((s, i) => {
        const ratio = s.count / max;
        const w = (width - padX * 2) * ratio;
        const x = (width - w) / 2;
        const y = i * stepH + 4;
        const h = stepH - 8;
        const nextRatio = i < steps.length - 1 ? steps[i + 1]!.count / max : ratio;
        const nextW = (width - padX * 2) * nextRatio;
        const nextX = (width - nextW) / 2;
        // trapezoid pointing down
        const path = i < steps.length - 1
          ? `M ${x} ${y} L ${x + w} ${y} L ${nextX + nextW} ${y + h} L ${nextX} ${y + h} Z`
          : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        return (
          <g key={s.stage}>
            <path d={path} fill="url(#fnl)" fillOpacity={1 - i * 0.13} />
            <text
              x={padX - 12}
              y={y + h / 2 + 4}
              textAnchor="end"
              className="font-mono"
              fontSize="11"
              fill="var(--ink-700)"
            >
              {s.stage}
            </text>
            <text
              x={width / 2}
              y={y + h / 2 + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#FFFFFF"
            >
              {s.count}
            </text>
            {s.conversion !== undefined && i > 0 && (
              <text
                x={width - padX + 14}
                y={y + h / 2 + 4}
                fontSize="10.5"
                className="font-mono"
                fill="var(--ink-500)"
              >
                {s.conversion}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   BarRow — labeled horizontal bar
   ────────────────────────────────────────────────────────────── */

export function BarRow({
  label,
  value,
  max,
  color = "var(--brand-accent)",
  suffix,
  className,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  color?: string;
  suffix?: React.ReactNode;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-foreground/90 truncate">{label}</span>
        {suffix && <span className="numeric font-medium text-foreground ml-2">{suffix}</span>}
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--ink-100)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Histogram — vertical bars
   ────────────────────────────────────────────────────────────── */

type HistBar = { label: string; value: number; color: string };

export function Histogram({
  bars,
  height = 140,
  className,
}: {
  bars: HistBar[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {bars.map((b) => {
          const h = (b.value / max) * (height - 24);
          return (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="numeric text-[10.5px] font-mono text-muted-foreground">
                {b.value}
              </span>
              <div
                className="w-full rounded-md transition-all hover:opacity-90"
                style={{ height: h, background: b.color, minHeight: 4 }}
                title={`${b.label}: ${b.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {bars.map((b) => (
          <span
            key={b.label}
            className="flex-1 text-[10px] font-mono text-muted-foreground text-center tracking-wide"
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Treemap — customer concentration
   ────────────────────────────────────────────────────────────── */

type TreemapItem = { client: string; value: number; color: string };

export function Treemap({
  items,
  width = 540,
  height = 240,
  className,
  format = (n) => `$${(n / 1_000_000).toFixed(1)}M`,
}: {
  items: TreemapItem[];
  width?: number;
  height?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  // Simple slice-and-dice layout
  const total = items.reduce((a, i) => a + i.value, 0);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  type Rect = { x: number; y: number; w: number; h: number };
  const rects: (TreemapItem & Rect)[] = [];

  // First, top item takes left half
  // Then alternate horizontal/vertical splits among the rest
  function layout(arr: TreemapItem[], rect: Rect, horizontal: boolean) {
    if (arr.length === 0) return;
    if (arr.length === 1) {
      rects.push({ ...arr[0]!, ...rect });
      return;
    }
    const sum = arr.reduce((a, i) => a + i.value, 0);
    const half = sum / 2;
    let acc = 0;
    let i = 0;
    while (i < arr.length - 1 && acc + arr[i]!.value < half) {
      acc += arr[i]!.value;
      i++;
    }
    const left = arr.slice(0, i || 1);
    const right = arr.slice(i || 1);
    const leftSum = left.reduce((a, x) => a + x.value, 0);
    const ratio = leftSum / sum;
    if (horizontal) {
      const w1 = rect.w * ratio;
      layout(left,  { x: rect.x,         y: rect.y, w: w1,         h: rect.h }, false);
      layout(right, { x: rect.x + w1,    y: rect.y, w: rect.w - w1, h: rect.h }, false);
    } else {
      const h1 = rect.h * ratio;
      layout(left,  { x: rect.x, y: rect.y,        w: rect.w, h: h1 },         true);
      layout(right, { x: rect.x, y: rect.y + h1,    w: rect.w, h: rect.h - h1 }, true);
    }
  }
  layout(sorted, { x: 0, y: 0, w: width, h: height }, true);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full", className)}>
      {rects.map((r, i) => {
        const pct = (r.value / total) * 100;
        const showLabel = r.w > 60 && r.h > 36;
        return (
          <g key={`${r.client}-${i}`}>
            <rect
              x={r.x + 2}
              y={r.y + 2}
              width={Math.max(0, r.w - 4)}
              height={Math.max(0, r.h - 4)}
              rx="10"
              fill={r.color}
              fillOpacity="0.92"
              className="hover:opacity-100 transition-opacity"
            />
            {showLabel && (
              <>
                <text
                  x={r.x + 14}
                  y={r.y + 22}
                  fill="#FFFFFF"
                  className="font-mono"
                  fontSize="10"
                  letterSpacing="0.5"
                  opacity="0.9"
                >
                  {pct.toFixed(0)}%
                </text>
                <text
                  x={r.x + 14}
                  y={r.y + 42}
                  fill="#FFFFFF"
                  fontFamily="var(--font-display)"
                  fontWeight="700"
                  fontSize={r.w > 140 ? 16 : 13}
                  letterSpacing="-0.01em"
                >
                  {r.client.length > 18 && r.w < 200 ? r.client.slice(0, 16) + "…" : r.client}
                </text>
                {r.h > 60 && (
                  <text
                    x={r.x + 14}
                    y={r.y + 62}
                    fill="#FFFFFF"
                    className="numeric"
                    fontSize="13"
                    fontWeight="600"
                    opacity="0.95"
                  >
                    {format(r.value)}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
