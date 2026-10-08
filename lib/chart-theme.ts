// Single source of truth for chart colour, ordering and number/date formats, so
// every visualisation reads from the same rules instead of inventing its own.
// Colours reference the design tokens in globals.css (never raw hex here).
//
// One meaning per colour:
//  • RISK — the severity scale (low → critical). Used wherever risk is shown,
//    and nowhere else. Always paired with a text label, never colour alone.
//  • Navy (the 30% role) + warm neutrals — every non-risk series (value,
//    volume, document type, pricing model). The primary series is navy;
//    comparisons use navy-300 / warm grey.
//  • Teal (the 10% accent) marks at most ONE highlighted series per chart.
//    It is never a categorical slot.
// Colours are tokens that re-step in dark mode (--viz-primary, --viz-compare,
// --viz-seq-*), so every mark keeps ≥ 3:1 on the card in both themes.

import type { RiskLevel, FindingSeverity } from "@/lib/types";
import { currencySymbol } from "@/lib/format";

/**
 * Risk level → mark colour. Every step clears 3:1 against the white card.
 *
 * High uses `--warning` rather than `--risk-3`: `--risk-3` and `--danger` are
 * nearly the same red (ΔE ≈ 4), so high and critical would be indistinguishable.
 * Amber vs red is still a close pair (ΔE ≈ 8), which is why every chart also
 * labels the level in text and keeps a fixed order. Change the mapping here and
 * it changes everywhere.
 */
export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "var(--success)",
  medium: "var(--ink-500)",
  high: "var(--warning)",
  critical: "var(--danger)",
};

/** Severity → low order to high (for stable stacking + legends). */
export const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];
/** Severity → high to low (for "highest risk first" lists/bars). */
export const RISK_ORDER_DESC: RiskLevel[] = ["critical", "high", "medium", "low"];

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** Colour for the aggregate "high or critical" series (the top of the scale). */
export const HIGH_RISK_COLOR = RISK_COLOR.critical;

/**
 * Bands of the 0–100 risk index. They line up with the weights the index is
 * built from (low 12, medium 42, high 74, critical 100), so a band name means
 * the same thing as the clause-level risk label.
 */
export const RISK_BANDS: { level: RiskLevel; from: number; to: number }[] = [
  { level: "low", from: 0, to: 25 },
  { level: "medium", from: 25, to: 50 },
  { level: "high", from: 50, to: 75 },
  { level: "critical", from: 75, to: 100 },
];

/** Risk index at or above this reads as high risk. */
export const HIGH_RISK_THRESHOLD = 50;

export function riskBand(score: number): RiskLevel {
  const s = Math.min(100, Math.max(0, score));
  return (RISK_BANDS.find((b) => s < b.to) ?? RISK_BANDS[RISK_BANDS.length - 1]).level;
}

export const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  info: "var(--info)",
  low: RISK_COLOR.low,
  medium: RISK_COLOR.medium,
  high: RISK_COLOR.high,
  critical: RISK_COLOR.critical,
};

export const SEVERITY_ORDER_DESC: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

/**
 * Palette for non-risk groupings: navy steps and warm neutrals only.
 * Neighbours alternate dark/light so adjacent segments stay distinct, and each
 * step clears 3:1 against the card in light (navy-800 15.97 · navy-300 3.08 ·
 * ink-500 5.46 · navy-500 8.94 · ink-700 11.84) and dark. No status colours,
 * no teal. It repeats past five groups, so fold a long tail into "Other"
 * before colouring it. For more distinct hues use VIZ_CATEGORICAL from
 * components/ds/tokens.
 */
export const CATEGORICAL = [
  "var(--viz-primary)",
  "var(--viz-compare)",
  "var(--ink-500)",
  "var(--viz-seq-5)",
  "var(--ink-700)",
];

export function categoricalColor(i: number): string {
  return CATEGORICAL[i % CATEGORICAL.length];
}

/** The primary series colour: navy (re-steps to a lighter navy in dark mode). */
export const ACCENT = "var(--viz-primary)";
/** A second, quieter navy step (additions on top of a base, comparisons). */
export const ACCENT_LIGHT = "var(--viz-compare)";
/** Teal: the ONE highlighted series in a chart (selected item). Use sparingly. */
export const HIGHLIGHT = "var(--viz-highlight)";
/** Neutral mark for reductions / de-emphasised series. */
export const NEUTRAL_MARK = "var(--viz-other)"; // #8A857B, 3.67:1 on white

/** Compact money for ticks and labels: $950, $12.3k, $1.3M, −$40k. No symbol
 *  is printed when the currency is unknown (see currencySymbol). */
export function fmtCompactMoney(n: number, currency?: string | null): string {
  const sym = currencySymbol(currency);
  if (!n || !Number.isFinite(n)) return `${sym}0`;
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}${sym}${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}${sym}${trim(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}${sym}${trim(a / 1e3)}k`;
  return `${sign}${sym}${Math.round(a)}`;
}

/** One decimal, without a trailing ".0" (1.3, 12, 250). */
function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** "Mar 2026" — axis ticks on ranges longer than a few months. */
export function fmtMonthYear(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** "5 Mar" / "Mar 5" — axis ticks on short ranges. */
export function fmtDayMonth(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Mar 5, 2026" — tooltips and tables, where the full date matters. */
export function fmtFullDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Whole-number percentages that always add up to 100 (largest-remainder
 * rounding), so a breakdown never reads 33% + 33% + 33%.
 */
export function wholeShares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(0, v) / total) * 100);
  const floors = exact.map(Math.floor);
  const missing = 100 - floors.reduce((s, v) => s + v, 0);
  const byRemainder = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
    .slice(0, missing)
    .map((x) => x.i);
  return floors.map((f, i) => (byRemainder.includes(i) ? f + 1 : f));
}

/** True when the user prefers reduced motion — charts skip entrance animation. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
