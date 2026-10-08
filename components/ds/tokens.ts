// TypeScript mirror of the design-system tokens in app/globals.css (section 1b).
// Values here are CSS variable REFERENCES, never raw hex: the CSS file is the
// single source of truth, this file only names what may be used from code
// (SVG fill/stroke attributes, recharts props).

/** Categorical series colours in their fixed, validated order. Never cycle:
 *  past eight series, fold the tail into "Other" (`VIZ_OTHER`). */
export const VIZ_CATEGORICAL = [
  "var(--viz-cat-1)",
  "var(--viz-cat-2)",
  "var(--viz-cat-3)",
  "var(--viz-cat-4)",
  "var(--viz-cat-5)",
  "var(--viz-cat-6)",
  "var(--viz-cat-7)",
  "var(--viz-cat-8)",
] as const;

/** Single-series charts: navy (the 30% role). */
export const VIZ_PRIMARY = "var(--viz-primary)";
/** Comparison / previous-period series. */
export const VIZ_COMPARE = "var(--viz-compare)";
/** The ONE highlighted series (teal accent). Never more than one per chart. */
export const VIZ_HIGHLIGHT = "var(--viz-highlight)";

/** Colour for the folded "Other" tail and de-emphasised marks. */
export const VIZ_OTHER = "var(--viz-other)";

/** Sequential ramp, near-zero → maximum (heatmaps, magnitude). */
export const VIZ_SEQUENTIAL = [
  "var(--viz-seq-1)",
  "var(--viz-seq-2)",
  "var(--viz-seq-3)",
  "var(--viz-seq-4)",
  "var(--viz-seq-5)",
  "var(--viz-seq-6)",
  "var(--viz-seq-7)",
] as const;

/** Diverging ramp, most negative → neutral midpoint → most positive. */
export const VIZ_DIVERGING = [
  "var(--viz-div-neg-3)",
  "var(--viz-div-neg-2)",
  "var(--viz-div-neg-1)",
  "var(--viz-div-mid)",
  "var(--viz-div-pos-1)",
  "var(--viz-div-pos-2)",
  "var(--viz-div-pos-3)",
] as const;

/** Chart chrome. */
export const VIZ_CHROME = {
  grid: "var(--viz-grid)",
  axis: "var(--viz-axis)",
  label: "var(--viz-label)",
  track: "var(--viz-track)",
  surface: "var(--viz-surface)",
} as const;

/** Categorical colour for series index `i`. Indexes past 8 return "Other";
 *  callers should have folded the tail before that point. */
export function seriesColor(i: number): string {
  return VIZ_CATEGORICAL[i] ?? VIZ_OTHER;
}

/**
 * Status meanings (product-owner colour table). One meaning per colour:
 * the mark colour for a status, for SVG and chart use.
 */
export const STATUS_COLOR = {
  ok: "var(--status-ok)",
  acceptable: "var(--status-acceptable)",
  caution: "var(--status-caution)",
  blocked: "var(--status-blocked)",
  unknown: "var(--status-unknown)",
} as const;

export type StatusMeaning = keyof typeof STATUS_COLOR;

/** Breakpoints in px (Tailwind defaults), for JS that must match CSS. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;
