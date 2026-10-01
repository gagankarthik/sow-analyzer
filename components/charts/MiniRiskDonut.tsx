"use client";

import { RISK_COLOR, RISK_ORDER_DESC } from "@/lib/chart-theme";

type Counts = { low: number; medium: number; high: number; critical: number };

/** Gap between neighbouring segments, in px along the ring. */
const GAP = 2;

/** Small SVG risk donut for per-project cards. Center shows total clauses. */
export function MiniRiskDonut({ counts, size = 76, stroke = 9 }: { counts: Counts; size?: number; stroke?: number }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  // The caption only fits (at a legible 12px) inside a large enough ring.
  const showCaption = size - stroke * 2 >= 56;

  // Only levels that have clauses are drawn; each starts where the last ended.
  const present = RISK_ORDER_DESC.filter((k) => counts[k] > 0);
  const gap = present.length > 1 ? GAP : 0;
  const arcs = present.map((k, i) => {
    const before = present.slice(0, i).reduce((s, p) => s + counts[p], 0);
    return { k, start: circ * (before / total), len: Math.max(1, circ * (counts[k] / total) - gap) };
  });

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={total === 0 ? "No clauses analyzed yet" : `${total} clauses: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {total === 0 && <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ink-200)" strokeWidth={stroke} />}
        {arcs.map(({ k, start, len }) => (
          <circle
            key={k} cx={cx} cy={cx} r={r} fill="none" stroke={RISK_COLOR[k]} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-start} strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-base font-semibold leading-none tabular-nums text-foreground">{total}</span>
        {showCaption && <span className="mt-0.5 text-xs leading-none text-muted-foreground">clauses</span>}
      </div>
    </div>
  );
}
