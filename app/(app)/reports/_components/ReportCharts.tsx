"use client";

// Hand-built SVG infographics for the leader home and the reports. Colour
// carries one meaning everywhere (see ui-data-display standards): green for
// on time and current (signed) value, amber for running late and held-up
// value, red for overdue (hatched, so it never relies on hue alone next to
// amber), grey for no target, and a mid brand step for potential value
// that you are still working on. Every mark has its number in text beside it,
// and every chart has a table twin.

import * as React from "react";
import Link from "next/link";
import { ChartDataTable, type ChartTable } from "@/components/charts/primitives";
import { ChevronRight } from "@/components/ui/icons";
import { PRE_SIGNATURE_STAGES, SLA_LABEL, STAGE_LABEL, daysLabel, plural } from "@/lib/govern/labels";
import { isUnsigned, type StageQueue, type WaitingQueue } from "@/lib/govern/metrics";
import type { Contract, SlaStatus, Stage, WaitingOnKind } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/* ── Shared marks ────────────────────────────────────────────────────────── */

export const SLA_ORDER: SlaStatus[] = ["red", "amber", "on_track", "none"];

export const SLA_FILL: Record<SlaStatus, string> = {
  red: "var(--danger)",
  amber: "var(--warning)",
  on_track: "var(--success)",
  none: "var(--ink-300)",
};

/** Value buckets. Potential vs held up is an adjacent pair, so held up is also hatched. */
export const VALUE_FILL = {
  current: "var(--viz-primary)",
  potential: "var(--viz-compare)",
  heldUp: "var(--warning)",
} as const;

/** Diagonal hatch over a fill: the second channel that separates overdue from late. */
function Hatch({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill={color} />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--card)" strokeOpacity="0.55" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

export function LegendDot({ color, label, hatched = false }: { color: string; label: string; hatched?: boolean }) {
  const id = React.useId();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-600)]">
      <svg width="12" height="12" aria-hidden className="shrink-0">
        {hatched && <Hatch id={id} color={color} />}
        <rect width="12" height="12" rx="3" fill={hatched ? `url(#${id})` : color} />
      </svg>
      {label}
    </span>
  );
}

type Segment = { key: string; value: number; color: string; hatched?: boolean; label: string };

/** One horizontal bar made of segments, on a shared scale (`max`). The 2px
 *  surface-coloured edge on each segment is the gap between neighbours. */
export function SegmentBar({ segments, max, height = 14, className }: { segments: Segment[]; max: number; height?: number; className?: string }) {
  const id = React.useId();
  const scale = max > 0 ? 100 / max : 0;
  // Each visible segment starts where the previous one ended.
  const placed = segments
    .filter((s) => s.value > 0)
    .reduce<{ seg: Segment; x: number; w: number }[]>((acc, seg) => {
      const prev = acc[acc.length - 1];
      return [...acc, { seg, x: prev ? prev.x + prev.w : 0, w: seg.value * scale }];
    }, []);
  return (
    <svg className={cn("block w-full overflow-visible", className)} height={height} aria-hidden>
      {segments.filter((s) => s.hatched).map((s) => <Hatch key={s.key} id={`${id}-${s.key}`} color={s.color} />)}
      <rect x="0" y="0" width="100%" height={height} rx="4" fill="var(--panel)" />
      {placed.map(({ seg, x, w }) => (
        <rect
          key={seg.key}
          x={`${x}%`}
          y="0"
          width={`${w}%`}
          height={height}
          rx="4"
          fill={seg.hatched ? `url(#${id}-${seg.key})` : seg.color}
          stroke="var(--card)"
          strokeWidth="2"
        >
          <title>{`${seg.label}: ${seg.value}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/* ── Who it is waiting on ────────────────────────────────────────────────── */

function slaCounts(contracts: Contract[]): Record<SlaStatus, number> {
  const out: Record<SlaStatus, number> = { red: 0, amber: 0, on_track: 0, none: 0 };
  for (const c of contracts) out[c.slaStatus] += 1;
  return out;
}

/** The numbers behind WaitingBars, for "View as table" and exports. */
export function waitingTable(queues: WaitingQueue[], contracts: Contract[]): ChartTable {
  const open = contracts.filter(isUnsigned);
  return {
    caption: "Open contracts by who they are waiting on",
    columns: ["Waiting on", "Contracts", "Average days", "Overdue", "Running late", "On time"],
    rows: queues.map((q) => {
      const counts = slaCounts(open.filter((c) => c.waitingOn.kind === q.kind));
      return [q.label, q.count, q.averageDays ?? "—", counts.red, counts.amber, counts.on_track];
    }),
  };
}

export function SlaLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {SLA_ORDER.map((s) => <LegendDot key={s} color={SLA_FILL[s]} hatched={s === "red"} label={SLA_LABEL[s]} />)}
    </div>
  );
}

/**
 * Where the queue backs up: one row per "waiting on", bar length = how many
 * contracts sit there, split by on time / running late / overdue, with the
 * average wait in words. Each row links to (or selects) that queue.
 */
export function WaitingBars({
  queues, contracts, hrefFor, onSelect, selected, size = "md",
}: {
  queues: WaitingQueue[];
  contracts: Contract[];
  hrefFor?: (kind: WaitingOnKind) => string;
  onSelect?: (kind: WaitingOnKind) => void;
  selected?: WaitingOnKind | null;
  size?: "md" | "lg";
}) {
  const open = contracts.filter(isUnsigned);
  const max = Math.max(1, ...queues.map((q) => q.count));
  const rows = queues.map((q) => {
    const counts = slaCounts(open.filter((c) => c.waitingOn.kind === q.kind));
    return { q, counts };
  });

  return (
    <div className="min-w-0">
      <ul className="space-y-1">
        {rows.map(({ q, counts }) => {
          const late = counts.red + counts.amber;
          const body = (
            <>
              <span className="flex min-w-0 items-baseline justify-between gap-3">
                <span className={cn("min-w-0 truncate font-semibold text-foreground", size === "lg" ? "text-lg" : "text-base")}>{q.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--ink-600)]">
                  <span className="font-semibold text-foreground">{q.count}</span>
                  {" · "}avg {q.averageDays === null ? "—" : daysLabel(Math.round(q.averageDays))}
                </span>
              </span>
              <SegmentBar
                className="mt-2"
                height={size === "lg" ? 16 : 12}
                max={max}
                segments={SLA_ORDER.map((s) => ({ key: s, value: counts[s], color: SLA_FILL[s], hatched: s === "red", label: SLA_LABEL[s] }))}
              />
              <span className="mt-1.5 block text-sm text-[var(--ink-600)]">
                {late > 0
                  ? [counts.red > 0 && `${counts.red} overdue`, counts.amber > 0 && `${counts.amber} running late`].filter(Boolean).join(", ")
                  : "All on time"}
                {q.who.length > 0 && <span className="text-[var(--ink-500)]"> · most with {q.who[0].label}</span>}
              </span>
            </>
          );
          const cls = cn(
            "group -mx-3 block rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
            selected === q.kind && "bg-[var(--brand-primary-50)] ring-1 ring-[var(--brand-primary-200)]",
          );
          return (
            <li key={q.kind}>
              {hrefFor ? (
                <Link href={hrefFor(q.kind)} className={cls} aria-label={`${q.label}: ${plural(q.count, "contract")}, see them`}>{body}</Link>
              ) : onSelect ? (
                <button type="button" onClick={() => onSelect(q.kind)} aria-pressed={selected === q.kind} className={cn(cls, "w-[calc(100%+1.5rem)]")}>{body}</button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <ChartDataTable {...waitingTable(queues, contracts)} />
    </div>
  );
}

/* ── Stage flow ──────────────────────────────────────────────────────────── */

/** The numbers behind StageFlow, for "View as table" and exports. */
export function stageTable(queues: StageQueue[], targets: Partial<Record<Stage, number | null>>): ChartTable {
  return {
    caption: "Open contracts by step",
    columns: ["Step", "Contracts", "Average days", "Target days", "Overdue", "Running late"],
    rows: queues.map((q) => [STAGE_LABEL[q.stage], q.count, q.averageDays ?? "—", targets[q.stage] ?? "—", q.overdue, q.late]),
  };
}

function stageTone(avg: number | null, target: number | null | undefined, redAfter: number): SlaStatus {
  if (avg === null || !target) return "none";
  if (avg > target * redAfter) return "red";
  if (avg > target) return "amber";
  return "on_track";
}

/**
 * The four steps before signature as one connected flow. Each step shows how
 * many contracts sit there and its average wait against the admin's target:
 * the bar is the average, the tick is the target, so "over target" is visible
 * without reading a number.
 */
export function StageFlow({
  queues, targets, redAfter = 2, hrefFor, onSelect, selected, compact = false,
}: {
  queues: StageQueue[];
  targets: Partial<Record<Stage, number | null>>;
  redAfter?: number;
  hrefFor?: (stage: Stage) => string;
  onSelect?: (stage: Stage) => void;
  selected?: Stage | null;
  compact?: boolean;
}) {
  const scaleMax = Math.max(
    1,
    ...queues.map((q) => q.averageDays ?? 0),
    ...queues.map((q) => (targets[q.stage] ?? 0) * 1.25),
  );

  return (
    <div className="min-w-0">
      {/* Stages are ruled columns inside the chart, not cards in a card. */}
      <ol className={cn("grid gap-y-2 divide-[var(--ink-200)]", compact ? "grid-cols-2 lg:grid-cols-4 lg:divide-x" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x")}>
        {queues.map((q, i) => {
          const target = targets[q.stage] ?? null;
          const tone = stageTone(q.averageDays, target, redAfter);
          const avgPct = q.averageDays !== null ? Math.min(100, (q.averageDays / scaleMax) * 100) : 0;
          const targetPct = target ? Math.min(100, (target / scaleMax) * 100) : null;
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--ink-600)]">
                <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ink-100)] text-xs font-semibold text-[var(--ink-700)] tabular-nums">{i + 1}</span>
                <span className="truncate">{STAGE_LABEL[q.stage]}</span>
              </span>
              <span className={cn("mt-2 block font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums", compact ? "text-3xl" : "text-4xl")}>
                {q.count}
              </span>
              <span className="mt-1 block text-sm text-[var(--ink-600)]">{q.count === 1 ? "contract" : "contracts"}</span>
              <svg className="mt-3 block w-full overflow-visible" height="18" aria-hidden>
                <rect x="0" y="5" width="100%" height="8" rx="4" fill="var(--panel)" />
                {q.averageDays !== null && q.averageDays > 0 && (
                  <>{tone === "red" && <Hatch id={`stage-hatch-${q.stage}`} color={SLA_FILL.red} />}<rect x="0" y="5" width={`${avgPct}%`} height="8" rx="4" fill={tone === "red" ? `url(#stage-hatch-${q.stage})` : SLA_FILL[tone === "none" ? "on_track" : tone]} /></>
                )}
                {targetPct !== null && (
                  <line x1={`${targetPct}%`} x2={`${targetPct}%`} y1="0" y2="18" stroke="var(--ink-800)" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
              <span className="mt-1.5 block text-sm leading-snug text-[var(--ink-600)]">
                {q.averageDays === null ? "Nobody waiting" : <>avg <span className="font-semibold text-foreground">{daysLabel(Math.round(q.averageDays))}</span></>}
                {target ? <> · target {daysLabel(target)}</> : <> · no target</>}
              </span>
              {(q.overdue > 0 || q.late > 0) && (
                <span className="mt-1 block text-sm font-medium text-[var(--ink-700)]">
                  {[q.overdue > 0 && `${q.overdue} overdue`, q.late > 0 && `${q.late} late`].filter(Boolean).join(" · ")}
                </span>
              )}
            </>
          );
          const cls = cn(
            "relative block h-full rounded-lg px-4 py-3 text-left transition-colors duration-150",
            (hrefFor || onSelect) && "hover:bg-[var(--ink-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
            selected === q.stage && "ring-2 ring-[var(--brand-primary-400)]",
          );
          return (
            <li key={q.stage} className="relative min-w-0">
              {hrefFor ? (
                <Link href={hrefFor(q.stage)} className={cls}>{body}</Link>
              ) : onSelect ? (
                <button type="button" onClick={() => onSelect(q.stage)} aria-pressed={selected === q.stage} className={cn(cls, "w-full")}>{body}</button>
              ) : (
                <div className={cls}>{body}</div>
              )}
              {i < queues.length - 1 && (
                <ChevronRight aria-hidden size={16} className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-card text-[var(--ink-400)] xl:block" />
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-600)]">
          <svg width="14" height="14" aria-hidden><line x1="7" x2="7" y1="1" y2="13" stroke="var(--ink-800)" strokeWidth="2" strokeLinecap="round" /></svg>
          Target set by admins
        </span>
        <LegendDot color={SLA_FILL.on_track} label="Average within target" />
        <LegendDot color={SLA_FILL.amber} label="Over target" />
        <LegendDot color={SLA_FILL.red} hatched label={`Over ${redAfter}× target`} />
      </div>
      <ChartDataTable {...stageTable(queues, targets)} />
    </div>
  );
}

export const FLOW_STAGES = PRE_SIGNATURE_STAGES;

/* ── Money split ─────────────────────────────────────────────────────────── */

/**
 * Current and potential value side by side on one scale, with the part of
 * potential that is held up (past target) hatched in amber at its end.
 */
export function MoneySplitBar({ current, potential, heldUp, labels }: {
  current: number;
  potential: number;
  heldUp: number;
  labels: { current: string; potential: string; heldUp: string };
}) {
  const id = React.useId();
  const total = current + potential;
  if (total <= 0) return null;
  const cur = (current / total) * 100;
  const moving = (Math.max(0, potential - heldUp) / total) * 100;
  const held = (Math.min(potential, heldUp) / total) * 100;
  return (
    <svg className="block w-full overflow-visible" height="28" role="img" aria-label={`${labels.current} signed, ${labels.potential} in the pipeline, of which ${labels.heldUp} is held up`}>
      <Hatch id={id} color={VALUE_FILL.heldUp} />
      {cur > 0 && <rect x="0" y="0" width={`${cur}%`} height="28" rx="6" fill={VALUE_FILL.current} stroke="var(--card)" strokeWidth="2" />}
      {moving > 0 && <rect x={`${cur}%`} y="0" width={`${moving}%`} height="28" rx="6" fill={VALUE_FILL.potential} stroke="var(--card)" strokeWidth="2" />}
      {held > 0 && <rect x={`${cur + moving}%`} y="0" width={`${held}%`} height="28" rx="6" fill={`url(#${id})`} stroke="var(--card)" strokeWidth="2" />}
    </svg>
  );
}

/* ── Sparkline ───────────────────────────────────────────────────────────── */

/**
 * A small trend line, one or two series on one scale. No axes: the sentence
 * beside it carries the numbers, and the hidden table has every value.
 */
export function Sparkline({
  series, height = 48, caption, periods,
}: {
  series: { label: string; values: (number | null)[]; color: string; dashed?: boolean }[];
  height?: number;
  caption: string;
  periods: string[];
}) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.max(1, ...all);
  const n = Math.max(2, ...series.map((s) => s.values.length));
  const W = 200;
  const pad = 3;
  const point = (v: number, i: number) => `${(i / (n - 1)) * W},${pad + (1 - v / max) * (height - pad * 2)}`;
  return (
    <figure className="m-0 min-w-0">
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block h-12 w-full overflow-visible" aria-hidden>
        <line x1="0" x2={W} y1={height - pad} y2={height - pad} stroke="var(--ink-200)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {series.map((s) => {
          // Break the line across unknown periods instead of inventing a value.
          const runs: string[][] = [];
          let run: string[] = [];
          s.values.forEach((v, i) => {
            if (v === null) { if (run.length) runs.push(run); run = []; } else run.push(point(v, i));
          });
          if (run.length) runs.push(run);
          return runs.map((r, k) => (
            <polyline
              key={`${s.label}-${k}`}
              points={r.length === 1 ? `${r[0]} ${r[0]}` : r.join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dashed ? "4 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ));
        })}
      </svg>
      <ChartDataTable
        caption={caption}
        columns={["Period", ...series.map((s) => s.label)]}
        rows={periods.map((p, i) => [p, ...series.map((s) => s.values[i] ?? "—")])}
      />
    </figure>
  );
}
