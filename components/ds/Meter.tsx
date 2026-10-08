// Meters are SVG so the fill width is a geometry attribute, not an inline
// style. Both expose role="meter" (or progressbar) with min/max/now and a
// text value, and the number is always printed beside the bar.

import * as React from "react";
import { cn } from "@/lib/utils";
import { TONE_FILL, resolveTone, type ToneInput } from "./tone";
import { VIZ_CATEGORICAL } from "./tokens";
import { wholeShares } from "./format";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

export type ProgressMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Visible label above the bar. Required for accessibility; use `hideLabel` to keep it sr-only. */
  label: string;
  value: number;
  max?: number;
  /** Printed value; defaults to "62%". */
  valueText?: string;
  tone?: ToneInput;
  /** `progress` for a task that completes; `meter` for a measurement in a known range. */
  kind?: "progress" | "meter";
  hideLabel?: boolean;
  /** Bar height: 6px (default) or 10px. */
  size?: "sm" | "md";
};

/**
 * A single bounded value as a bar: completion (6 of 9 steps signed) or a
 * measurement in a known range. Never for unbounded values (use a KPI).
 */
export function ProgressMeter({
  label,
  value,
  max = 100,
  valueText,
  tone = "brand",
  kind = "meter",
  hideLabel = false,
  size = "sm",
  className,
  ...props
}: ProgressMeterProps) {
  const ratio = clamp01(max > 0 ? value / max : 0);
  const text = valueText ?? `${Math.round(ratio * 100)}%`;
  const id = React.useId();
  const h = size === "md" ? 10 : 6;
  return (
    <div className={cn("min-w-0", className)} {...props}>
      <div className={cn("mb-1.5 flex items-baseline justify-between gap-3", hideLabel && "sr-only")}>
        <span id={id} className="min-w-0 truncate text-body text-fg-secondary">{label}</span>
        <span className="shrink-0 text-body font-medium tabular-nums text-fg-primary">{text}</span>
      </div>
      <svg
        role={kind === "progress" ? "progressbar" : "meter"}
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(0, value))}
        aria-valuetext={text}
        className="block w-full"
        width="100%"
        height={h}
      >
        <rect x="0" y="0" width="100%" height={h} rx={h / 2} className="fill-viz-track" />
        {ratio > 0 && (
          <rect x="0" y="0" width={`${Math.max(ratio * 100, 1.5)}%`} height={h} rx={h / 2} className={TONE_FILL[resolveTone(tone)]} />
        )}
      </svg>
    </div>
  );
}

export type BarMeterSegment = {
  key: string;
  label: string;
  value: number;
  /** A tone (status meaning) or an explicit CSS colour reference. Defaults to categorical order. */
  tone?: ToneInput;
  color?: string;
  /** Pattern fill for colour-blind-safe distinction from its neighbour. */
  hatch?: boolean;
};

export type BarMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Accessible name, e.g. "Clause tiers for Agreement 2026-014". */
  label: string;
  segments: BarMeterSegment[];
  /** Print a key under the bar (label · value · share). Off for in-cell minis. */
  showKey?: boolean;
  /** Bar height: 6 (mini, in table cells) or 12. */
  size?: "sm" | "md";
  valueFormatter?: (n: number) => string;
};

/**
 * Part-to-whole in one bar (tier mix for a contract, value by state). A 2px
 * surface gap separates segments; the accessible name lists every part.
 * Zero segments are not drawn. For ≤5 parts: prefer this to a donut.
 */
export function BarMeter({
  label,
  segments,
  showKey = false,
  size = "md",
  valueFormatter = (n) => n.toLocaleString("en-US"),
  className,
  ...props
}: BarMeterProps) {
  const present = segments.filter((s) => s.value > 0);
  const total = present.reduce((s, x) => s + x.value, 0);
  const shares = wholeShares(present.map((s) => s.value));
  const h = size === "md" ? 12 : 6;
  const summary = total
    ? present.map((s, i) => `${s.label} ${valueFormatter(s.value)} (${shares[i]}%)`).join(", ")
    : "No data";
  const uid = React.useId().replace(/:/g, "");

  const widths = present.map((s) => (total ? (s.value / total) * 100 : 0));
  const starts = cumulativeStarts(widths);
  return (
    <div className={cn("min-w-0", className)} {...props}>
      <svg role="img" aria-label={`${label}: ${summary}.`} className="block w-full" width="100%" height={h}>
        <defs>
          <clipPath id={`${uid}-clip`}>
            <rect width="100%" height={h} rx={Math.min(4, h / 2)} />
          </clipPath>
          {present.map((s, i) =>
            s.hatch ? <HatchPattern key={s.key} id={`${uid}-${i}`} className={segmentFillClass(s)} fill={segmentFillAttr(s, i)} /> : null,
          )}
        </defs>
        {total === 0 && <rect width="100%" height={h} rx={h / 2} className="fill-viz-track" />}
        <g clipPath={`url(#${uid}-clip)`}>
          {present.map((s, i) => {
            const w = widths[i];
            return (
              <rect
                key={s.key}
                x={`${starts[i]}%`}
                y={0}
                width={`${Math.max(w, 0.8)}%`}
                height={h}
                className={s.hatch ? undefined : segmentFillClass(s)}
                fill={s.hatch ? `url(#${uid}-${i})` : segmentFillAttr(s, i)}
              />
            );
          })}
          {/* 2px surface spacers between segments */}
          {starts.slice(1).map((x, i) => (
            <rect key={`gap-${i}`} x={`${x}%`} y={0} width={2} height={h} transform="translate(-1 0)" className="fill-surface-raised" />
          ))}
        </g>
      </svg>
      {showKey && total > 0 && <MeterKey segments={present} shares={shares} valueFormatter={valueFormatter} />}
    </div>
  );
}

function segmentFillClass(s: BarMeterSegment): string | undefined {
  return s.tone ? TONE_FILL[resolveTone(s.tone)] : undefined;
}
function segmentFillAttr(s: BarMeterSegment, i: number): string | undefined {
  if (s.tone) return undefined;
  return s.color ?? VIZ_CATEGORICAL[i] ?? "var(--viz-other)";
}

function MeterKey({
  segments,
  shares,
  valueFormatter,
}: {
  segments: BarMeterSegment[];
  shares: number[];
  valueFormatter: (n: number) => string;
}) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {segments.map((s, i) => (
        <li key={s.key} className="flex min-w-0 items-center gap-2 text-body">
          <Swatch tone={s.tone} color={s.tone ? undefined : s.color ?? VIZ_CATEGORICAL[i]} hatch={s.hatch} />
          <span className="min-w-0 flex-1 truncate text-fg-primary" title={s.label}>{s.label}</span>
          <span className="shrink-0 font-medium tabular-nums text-fg-primary">{valueFormatter(s.value)}</span>
          <span className="w-10 shrink-0 text-right text-caption tabular-nums text-fg-tertiary">{shares[i]}%</span>
        </li>
      ))}
    </ul>
  );
}

/** A 10px legend swatch in SVG (fill via tone class or a CSS colour reference). */
export function Swatch({
  tone,
  color,
  hatch = false,
  shape = "square",
  className,
}: {
  tone?: ToneInput;
  color?: string;
  hatch?: boolean;
  shape?: "square" | "line" | "dot";
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const cls = tone ? TONE_FILL[resolveTone(tone)] : undefined;
  const fill = tone ? undefined : color ?? "var(--viz-cat-1)";
  if (shape === "line") {
    return (
      <svg aria-hidden viewBox="0 0 14 10" className={cn("h-2.5 w-3.5 shrink-0", className)}>
        <rect x="0" y="4" width="14" height="2" rx="1" className={cls} fill={fill} />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 10 10" className={cn("size-2.5 shrink-0", className)}>
      {hatch && (
        <defs>
          <HatchPattern id={id} className={cls} fill={fill} size={3} />
        </defs>
      )}
      {shape === "dot" ? (
        <circle cx="5" cy="5" r="4" className={hatch ? undefined : cls} fill={hatch ? `url(#${id})` : fill} />
      ) : (
        <rect width="10" height="10" rx="2" className={hatch ? undefined : cls} fill={hatch ? `url(#${id})` : fill} />
      )}
    </svg>
  );
}

/**
 * A 45° hatch <pattern> (the colour-blind / print channel). Place inside
 * <defs> and reference with fill="url(#id)". `reverse` gives the 135° mirror
 * for the next adjacent series.
 */
export function HatchPattern({
  id,
  className,
  fill,
  size = 4,
  reverse = false,
}: {
  id: string;
  className?: string;
  fill?: string;
  size?: number;
  reverse?: boolean;
}) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${reverse ? 135 : 45})`}>
      <rect width={size} height={size} className={className} fill={fill} opacity="0.28" />
      <rect width={size * 0.4} height={size} className={className} fill={fill} />
    </pattern>
  );
}

/** Running start offsets for a list of widths: [10, 20, 5] → [0, 10, 30]. */
export function cumulativeStarts(widths: number[]): number[] {
  const out: number[] = [];
  widths.reduce((acc, w) => {
    out.push(acc);
    return acc + w;
  }, 0);
  return out;
}
