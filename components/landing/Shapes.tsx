/* Blue-IQ's shape vocabulary, grounded in Sonar:

     quarter   a solid quarter-disc, the sonar sweep
     half      a half-ring, the returning signal
     dot       a solid circle, the ping
     square    a solid square, the document

   Rules (enforced by the presets below, keep them when adding one):
   solid fills only (no gradients, glows, blur or outlines), shapes sit on a
   grid of equal cells and always touch or align, at most four shapes in a
   composition, colours from the category palette. Decorative: aria-hidden. */

export type ShapeTone = "blue" | "violet" | "teal" | "coral" | "sand" | "navy" | "white";

type Corner = "tl" | "tr" | "bl" | "br";

type Shape =
  /** Quarter-disc filling one cell; `corner` is where its centre (the sweep's origin) sits. */
  | { kind: "quarter"; x: number; y: number; corner: Corner; tone: ShapeTone }
  /** Half-ring two cells wide, one tall; `open` is the side of its flat edge. */
  | { kind: "half"; x: number; y: number; open: "down" | "up"; tone: ShapeTone }
  | { kind: "dot"; x: number; y: number; tone: ShapeTone }
  | { kind: "square"; x: number; y: number; tone: ShapeTone };

const U = 100; // one grid cell

function quarterPath(x: number, y: number, corner: Corner): string {
  const L = x * U, T = y * U, R = L + U, B = T + U;
  switch (corner) {
    case "bl": return `M ${L} ${B} L ${L} ${T} A ${U} ${U} 0 0 1 ${R} ${B} Z`;
    case "br": return `M ${R} ${B} L ${L} ${B} A ${U} ${U} 0 0 1 ${R} ${T} Z`;
    case "tl": return `M ${L} ${T} L ${R} ${T} A ${U} ${U} 0 0 1 ${L} ${B} Z`;
    case "tr": return `M ${R} ${T} L ${R} ${B} A ${U} ${U} 0 0 1 ${L} ${T} Z`;
  }
}

function halfPath(x: number, y: number, open: "down" | "up"): string {
  const inner = U * 0.42;
  const cx = x * U + U;
  const cy = open === "down" ? y * U + U : y * U;
  const sweep = open === "down" ? 1 : 0;
  return [
    `M ${cx - U} ${cy}`,
    `A ${U} ${U} 0 0 ${sweep} ${cx + U} ${cy}`,
    `L ${cx + inner} ${cy}`,
    `A ${inner} ${inner} 0 0 ${1 - sweep} ${cx - inner} ${cy}`,
    "Z",
  ].join(" ");
}

function ShapeEl({ s }: { s: Shape }) {
  const cls = `lp-fill-${s.tone}`;
  switch (s.kind) {
    case "quarter": return <path d={quarterPath(s.x, s.y, s.corner)} className={cls} />;
    case "half": return <path d={halfPath(s.x, s.y, s.open)} className={cls} />;
    case "dot": return <circle cx={s.x * U + U / 2} cy={s.y * U + U / 2} r={U / 2} className={cls} />;
    case "square": return <rect x={s.x * U} y={s.y * U} width={U} height={U} className={cls} />;
  }
}

/** Compositions, each on its own grid (cols × rows), max four shapes.
 *  Squares and sweeps only: no circles or rings in any preset. */
export const SHAPE_PRESETS = {
  /** Closing call to action: document, sweep, document, on the baseline. */
  cta: { cols: 3, rows: 1, shapes: [
    { kind: "square", x: 0, y: 0, tone: "blue" },
    { kind: "quarter", x: 1, y: 0, corner: "bl", tone: "sand" },
    { kind: "square", x: 2, y: 0, tone: "teal" },
  ] },
} as const satisfies Record<string, { cols: number; rows: number; shapes: readonly Shape[] }>;

export type ShapePreset = keyof typeof SHAPE_PRESETS;

export function ShapeCluster({ preset, className }: { preset: ShapePreset; className?: string }) {
  const p = SHAPE_PRESETS[preset];
  return (
    <svg
      viewBox={`0 0 ${p.cols * U} ${p.rows * U}`}
      className={`lp-shapes ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
    >
      {(p.shapes as readonly Shape[]).map((s, i) => <ShapeEl key={i} s={s} />)}
    </svg>
  );
}

/** One shape on its own, for a tile corner. */
export function ShapePeek({ shape, className }: { shape: Shape; className?: string }) {
  const cols = shape.kind === "half" ? 2 : 1;
  const x = 0, y = 0;
  const placed = { ...shape, x, y } as Shape;
  return (
    <svg viewBox={`0 0 ${cols * U} ${U}`} className={`lp-shapes ${className ?? ""}`} aria-hidden="true" focusable="false">
      <ShapeEl s={placed} />
    </svg>
  );
}
