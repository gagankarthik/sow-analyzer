"use client";

import type { RiskLevel } from "@/lib/types";

type Counts = { low: number; medium: number; high: number; critical: number };

const SEGMENTS: { k: RiskLevel; color: string }[] = [
  { k: "critical", color: "var(--danger)" },
  { k: "high", color: "var(--warning)" },
  { k: "medium", color: "var(--ink-400)" },
  { k: "low", color: "var(--success)" },
];

/** Small SVG risk donut for per-project cards. Center shows total clauses. */
export function MiniRiskDonut({ counts, size = 76, stroke = 9 }: { counts: Counts; size?: number; stroke?: number }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={stroke} />
        {total > 0 && SEGMENTS.map(({ k, color }) => {
          const v = counts[k];
          if (!v) return null;
          const len = circ * (v / total);
          const el = (
            <circle
              key={k} cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-bold tabular-nums leading-none text-foreground" style={{ fontFamily: "var(--font-display)" }}>{total}</span>
        <span className="text-[8.5px] uppercase tracking-wide text-muted-foreground">clauses</span>
      </div>
    </div>
  );
}
