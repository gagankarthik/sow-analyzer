"use client";

import { useMemo } from "react";

/* ──────────────────────────────────────────────────────────────
   PixelWave — the hero's signature art.

   A procedurally-built band of rounded pixel squares whose centre
   follows a sine wave, coloured along a coral → pink → lavender →
   periwinkle gradient. Stray detached pixels at the leading/trailing
   edges give the blocky "dissolve" of the reference. Fully
   deterministic (no Math.random) so SSR and client markup match.
   ────────────────────────────────────────────────────────────── */

// Gradient stops, left → right.
const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [255, 107, 129]], // coral  #FF6B81
  [0.34, [246, 166, 192]], // pink
  [0.62, [201, 169, 232]], // mauve
  [1.0, [142, 149, 232]], // periwinkle #8E95E8
];

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function colorAt(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, c0] = STOPS[i];
    const [p1, c1] = STOPS[i + 1];
    if (x >= p0 && x <= p1) {
      const k = (x - p0) / (p1 - p0);
      return `rgb(${mix(c0[0], c1[0], k)}, ${mix(c0[1], c1[1], k)}, ${mix(c0[2], c1[2], k)})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(",")})`;
}

// Cheap deterministic hash → [0,1), used for edge scatter + value jitter.
function rng(i: number, j: number) {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

const COLS = 30;
const ROWS = 20;
const CELL = 20; // logical px per cell in the viewBox
const GAP = 4;

type Cell = { x: number; y: number; fill: string; o: number };

export function PixelWave({ className }: { className?: string }) {
  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    const midRow = ROWS / 2 - 0.5;

    for (let i = 0; i < COLS; i++) {
      const u = i / (COLS - 1); // 0..1 across
      // Two summed sines → an organic, non-repeating crest.
      const centre =
        midRow +
        Math.sin(u * Math.PI * 2.1 + 0.6) * 4.2 +
        Math.sin(u * Math.PI * 4.7 + 1.3) * 1.6;
      // Band gets thinner toward the right where it dissolves.
      const half = 2.3 + Math.sin(u * Math.PI) * 2.7;

      for (let j = 0; j < ROWS; j++) {
        const dist = Math.abs(j - centre);
        const r = rng(i, j);
        const inBand = dist <= half;
        // Scatter: a few stray pixels just outside the band.
        const scatter = !inBand && dist <= half + 2.2 && r > 0.74;
        if (!inBand && !scatter) continue;

        const fill = colorAt(u + (r - 0.5) * 0.05);
        // Soft falloff at the band edge + lighter stray pixels.
        const edge = inBand ? Math.max(0.55, 1 - (dist / (half + 0.8)) * 0.5) : 0.4;
        out.push({
          x: i * (CELL + GAP),
          y: j * (CELL + GAP),
          fill,
          o: edge,
        });
      }
    }
    return out;
  }, []);

  const w = COLS * (CELL + GAP) - GAP;
  const h = ROWS * (CELL + GAP) - GAP;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Pixelated wave of contract clauses resolving from chaos into a clear, scored stream"
      preserveAspectRatio="xMidYMid meet"
    >
      {cells.map((c, idx) => (
        <rect
          key={idx}
          x={c.x}
          y={c.y}
          width={CELL}
          height={CELL}
          rx={4}
          fill={c.fill}
          opacity={c.o}
        />
      ))}
    </svg>
  );
}
