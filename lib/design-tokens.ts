/**
 * Typed mirror of the design tokens defined in `app/globals.css`.
 *
 * The CSS variables are the source of truth (they drive theming and dark mode).
 * This module exposes the same values to TypeScript for the few places that
 * need them in JS — chart libraries (Recharts fills/strokes), canvas, and any
 * computed style. Prefer Tailwind classes / CSS vars in markup; reach for this
 * only when a value must be passed to JS.
 *
 * Color entries reference the CSS variable (so theme switches still apply).
 * `*Hex` maps give raw values for contexts that can't resolve CSS vars.
 */

export const brand = {
  50: "var(--brand-primary-50)",
  100: "var(--brand-primary-100)",
  500: "var(--brand-primary-500)",
  600: "var(--brand-primary-600)",
  700: "var(--brand-primary-700)",
  900: "var(--brand-primary-900)",
} as const;

export const semantic = {
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  warning: "var(--warning)",
  warningSoft: "var(--warning-soft)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  info: "var(--info)",
  infoSoft: "var(--info-soft)",
} as const;

export const ai = {
  ink: "var(--ai-ink)",
  ink2: "var(--ai-ink-2)",
  surface: "var(--ai-surface)",
  border: "var(--ai-border)",
  gradient: "var(--ai-gradient)",
} as const;

/** Risk tier → color. Used by clause risk bars, watchlists, donuts. */
export const riskColor = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "#C2410C",
  critical: "var(--danger)",
} as const;

/** Risk tier → soft background + text, for pills. */
export const riskPill = {
  low: { bg: "var(--success-soft)", fg: "var(--success)" },
  medium: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  high: { bg: "var(--warning-soft)", fg: "#C2410C" },
  critical: { bg: "var(--danger-soft)", fg: "var(--danger)" },
} as const;

/** Ordered palette for categorical charts (donut segments, bars). */
export const chartPalette = [
  "var(--brand-primary-600)",
  "var(--ai-ink)",
  "var(--info)",
  "var(--warning)",
  "var(--success)",
  "var(--brand-primary-300)",
] as const;

/** Raw hex fallbacks for libraries that cannot resolve CSS variables. */
export const hex = {
  brand600: "#2563EB",
  brand300: "#93C5FD",
  ai: "#7C3AED",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#0891B2",
  ink200: "#E4E7EC",
  ink500: "#667085",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const duration = { fast: 100, base: 150, slow: 250, slower: 400 } as const;

export const space = (n: number) => n * 4; // 4px base unit

export type RiskLevel = keyof typeof riskColor;
