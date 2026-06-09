"use client";

/* ──────────────────────────────────────────────────────────────
   PixelArt — bitmap pixel-art mascots for the bento cards.

   Each mascot is a string grid ("1" = filled). Rendered as rounded
   SVG rects in a single pastel colour on the dark cards, echoing the
   reference's space-invader iconography. Two shapes ship here; add a
   bitmap to MASCOTS to introduce more.
   ────────────────────────────────────────────────────────────── */

export type MascotName = "reader" | "shield";

const MASCOTS: Record<MascotName, string[]> = {
  // "Reader" — a scanning creature (clause extraction).
  reader: [
    "00100000100",
    "00010001000",
    "00111111100",
    "01101110110",
    "11111111111",
    "10111111101",
    "10100000101",
    "00011011000",
  ],
  // "Shield" — a guard creature (playbook scoring).
  shield: [
    "00100000100",
    "10010001001",
    "10111111101",
    "11101110111",
    "11111111111",
    "00111111100",
    "00100000100",
    "01000000010",
  ],
};

export function PixelArt({
  name,
  color,
  size = 168,
  gap = 2,
  className,
}: {
  name: MascotName;
  color: string;
  size?: number;
  gap?: number;
  className?: string;
}) {
  const grid = MASCOTS[name];
  const rows = grid.length;
  const cols = grid[0].length;
  const cell = 10;
  const w = cols * cell;
  const h = rows * cell;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      role="img"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {grid.flatMap((row, j) =>
        row.split("").map((bit, i) =>
          bit === "1" ? (
            <rect
              key={`${i}-${j}`}
              x={i * cell + gap / 2}
              y={j * cell + gap / 2}
              width={cell - gap}
              height={cell - gap}
              rx={1.4}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
