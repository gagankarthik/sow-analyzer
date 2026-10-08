// The matrix result as one stacked bar: green (within) on the left, red (not
// acceptable) on the right, so "how much of this is fine" reads at a glance.
// Each segment is drawn in SVG; the legend carries the words and numbers.

import { TIER_COLOR } from "@/components/govern/primitives";
import { TIER_LABEL } from "@/lib/govern/labels";
import type { MatrixCounts, Tier } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/** Reading order for the bar and legend: good to bad. */
export const BAR_TIERS: Tier[] = ["within", "fallback", "review", "missing", "deviates", "unacceptable"];

export function totalClauses(counts: MatrixCounts): number {
  return BAR_TIERS.reduce((s, t) => s + counts[t], 0);
}

/** Clauses that block signature until someone acts. */
export function blockingCount(counts: MatrixCounts): number {
  return counts.deviates + counts.unacceptable + counts.missing;
}

export function TierBar({ counts, size = "md", className }: { counts: MatrixCounts; size?: "sm" | "md" | "lg"; className?: string }) {
  const total = totalClauses(counts);
  const height = size === "lg" ? 20 : size === "md" ? 12 : 8;
  const summary = BAR_TIERS.filter((t) => counts[t] > 0).map((t) => `${counts[t]} ${TIER_LABEL[t].toLowerCase()}`).join(", ");
  let x = 0;
  return (
    <svg
      role="img"
      aria-label={total ? `Matrix result: ${summary}` : "No clauses checked yet"}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full overflow-hidden rounded-full", size === "lg" ? "h-5" : size === "md" ? "h-3" : "h-2", className)}
    >
      <rect x="0" y="0" width="100" height={height} fill="var(--ink-100)" />
      {total > 0 && BAR_TIERS.map((t) => {
        if (!counts[t]) return null;
        const w = (counts[t] / total) * 100;
        const rect = <rect key={t} x={x} y="0" width={w} height={height} fill={TIER_COLOR[t]} stroke="var(--card)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export function TierLegend({ counts, className, compact = false }: { counts: MatrixCounts; className?: string; compact?: boolean }) {
  const tiers = compact ? BAR_TIERS.filter((t) => counts[t] > 0) : BAR_TIERS;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--ink-700)]", className)}>
      {tiers.map((t) => (
        <li key={t} className={cn("inline-flex items-center gap-1.5", counts[t] === 0 && "text-[var(--ink-500)]")}>
          <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" aria-hidden>
            <rect width="10" height="10" rx="2" fill={TIER_COLOR[t]} />
          </svg>
          <span className="font-semibold tabular-nums text-foreground">{counts[t]}</span>
          {TIER_LABEL[t]}
        </li>
      ))}
    </ul>
  );
}
