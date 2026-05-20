"use client";

import { useEffect, useState } from "react";

/** Animated semicircular risk gauge. `score` is a 0-100 risk index (higher =
 *  more risk). The arc sweeps in on mount and is colored by band. */

const BANDS = [
  { max: 25, color: "var(--success)", label: "Low risk" },
  { max: 50, color: "var(--warning)", label: "Moderate" },
  { max: 75, color: "#C2410C", label: "Elevated" },
  { max: 101, color: "var(--danger)", label: "High risk" },
];
function bandFor(score: number) {
  return BANDS.find((b) => score < b.max) ?? BANDS[BANDS.length - 1];
}

export function RiskGauge({ score, size = 168 }: { score: number; size?: number }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(score); setMounted(true); return; }
    const raf = requestAnimationFrame(() => setMounted(true));
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(id); };
  }, [score]);

  const stroke = 13;
  const r = size / 2 - stroke;
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = mounted ? circ * (1 - clamped / 100) : circ;
  const b = bandFor(clamped);
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={cy + stroke} viewBox={`0 0 ${size} ${cy + stroke}`} className="overflow-visible">
        <path d={path} fill="none" stroke="var(--ink-200)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={path} fill="none" stroke={b.color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: cy - 34 }}>
        <span className="numeric leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.03em", color: b.color }}>
          {shown}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] mt-1" style={{ color: b.color }}>{b.label}</span>
      </div>
    </div>
  );
}

/** Weighted 0-100 risk index from clause-risk counts. */
export function riskIndex(counts: { low: number; medium: number; high: number; critical: number }): number {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  if (total === 0) return 0;
  const weighted = counts.low * 12 + counts.medium * 42 + counts.high * 74 + counts.critical * 100;
  return Math.round(weighted / total);
}
