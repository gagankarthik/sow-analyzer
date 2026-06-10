// Single source of truth for chart color + ordering, so every visualization
// reads from the same palette instead of inventing its own. Colors reference
// the design tokens in globals.css (never raw hex in components).
//
// Two palettes only:
//  • RISK — the one sequential severity scale (low→critical). Used everywhere
//    risk is shown so the meaning of each color is consistent across the app.
//  • CATEGORICAL — a restrained ramp (blue tints + ink grays + one cyan) for
//    non-risk categories like pricing model or document type. Deliberately NOT
//    a rainbow, and deliberately avoids violet (reserved for AI / Sonar).

import type { RiskLevel, FindingSeverity } from "@/lib/types";

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "var(--success)",
  medium: "var(--ink-400)",
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

export const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  info: "var(--info)",
  low: "var(--success)",
  medium: "var(--ink-400)",
  high: "var(--warning)",
  critical: "var(--danger)",
};

export const SEVERITY_ORDER_DESC: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

/** Restrained categorical palette for non-risk groupings. Cycles if exceeded. */
export const CATEGORICAL = [
  "var(--brand-primary-600)",
  "var(--ink-400)",
  "var(--info)",
  "var(--brand-primary-300)",
  "var(--ink-700)",
  "var(--brand-primary-800)",
];

export function categoricalColor(i: number): string {
  return CATEGORICAL[i % CATEGORICAL.length];
}

/** The single interactive accent — selected / focused / primary series. */
export const ACCENT = "var(--brand-primary-600)";

/** Compact money for axis ticks / tooltips: $12.3k, $1.2M (full value lives in MetricCards). */
export function fmtCompactMoney(n: number, currency?: string | null): string {
  const sym = currencySymbol(currency);
  if (!n || n <= 0) return `${sym}0`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${sym}${(n / 1e3).toFixed(1)}k`;
  return `${sym}${Math.round(n)}`;
}

function currencySymbol(currency?: string | null): string {
  switch ((currency || "USD").toUpperCase()) {
    case "EUR": return "€";
    case "GBP": return "£";
    case "INR": return "₹";
    case "JPY": return "¥";
    default: return "$";
  }
}

/** True when the user prefers reduced motion — charts skip entrance animation. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
