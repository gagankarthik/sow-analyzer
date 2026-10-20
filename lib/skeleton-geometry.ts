// Geometry shared by DataTable and its skeleton, so a loading table occupies
// exactly the box the loaded one will: the same columns appear at the same
// container widths, rows are the same height, and placeholder bars vary in a
// fixed (never random) pattern so server and client render the same HTML.

export type ColumnPriority = 1 | 2 | 3 | 4;
export type Density = "comfortable" | "compact";

// Columns give way by the width the table actually has (a container query),
// not the window: with the sidebar open a 1024px laptop leaves the table
// about 730px, and lower-priority columns move into the row's expand panel.
export const PRIORITY_CELL: Record<ColumnPriority, string> = {
  1: "",
  2: "hidden @4xl/table:table-cell",
  3: "hidden @5xl/table:table-cell",
  4: "hidden @7xl/table:table-cell",
};

/** Row height of the flush table (UI_SPEC section 3: 42px; 34px compact). */
export function flushRowHeight(density: Density): string {
  return density === "compact" ? "h-[34px]" : "h-[42px]";
}

/** Cell padding of the flush table. */
export function flushCellPad(density: Density): string {
  return density === "compact" ? "px-3 py-1" : "px-3 py-1.5";
}

// Literal class strings so Tailwind generates them.
const TEXT_WIDTHS = ["w-[72%]", "w-[56%]", "w-[64%]", "w-[48%]", "w-[80%]", "w-[60%]"] as const;
const NUMBER_WIDTHS = ["w-12", "w-16", "w-10", "w-14"] as const;

/**
 * Width class for the placeholder bar in row `row`, column `col`. Text cells
 * cycle through 48–80% of the cell; numeric cells use short fixed widths
 * (they are right-aligned figures). Deterministic for SSR.
 */
export function skeletonBarWidth(row: number, col: number, numeric = false): string {
  const i = Math.abs(row * 3 + col * 5);
  return numeric ? NUMBER_WIDTHS[i % NUMBER_WIDTHS.length] : TEXT_WIDTHS[i % TEXT_WIDTHS.length];
}

/** How many placeholder rows a table shows: its page size, capped so the
 *  skeleton fills the first screen without running far below it. */
export function skeletonRowCount(pageSize: number | undefined, fallback = 8, max = 12): number {
  const n = pageSize && pageSize > 0 ? pageSize : fallback;
  return Math.max(1, Math.min(n, max));
}

const BAR_HEIGHTS = ["h-[46%]", "h-[62%]", "h-[38%]", "h-[74%]", "h-[55%]", "h-[82%]", "h-[50%]", "h-[67%]", "h-[42%]", "h-[58%]"] as const;

/** Heights (as classes) for `n` placeholder chart bars: a calm, fixed rhythm. */
export function chartBarHeights(n: number): string[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => BAR_HEIGHTS[i % BAR_HEIGHTS.length]);
}

/** The thing being loaded, from a label written either way: "Loading
 *  contracts…" and "contracts" both give "contracts"; empty gives "content". */
export function loadingSubject(label: string | undefined): string {
  const s = (label ?? "").trim().replace(/^loading\b\s*/i, "").replace(/(…|\.\.\.)$/, "").trim();
  return s || "content";
}
