// The one number formatter for components/ds. Every tile, table cell, axis
// tick and tooltip goes through `formatValue`, so a figure reads the same
// everywhere: compact in tiles and axes ($1.25M), exact in tables
// ($1,250,000), and UNKNOWN IS NEVER ZERO: null / undefined / NaN print as
// an em dash with a spoken "Not known" alternative.

import { currencySymbol } from "@/lib/format";

/** How a value is shaped. */
export type ValueKind = "number" | "currency" | "percent" | "days" | "count";

export type FormatOptions = {
  kind?: ValueKind;
  /** Compact notation (1.3k, $1.25M). Tiles and axes: true. Tables: false. */
  compact?: boolean;
  /** ISO currency code for kind "currency". No symbol when unknown. */
  currency?: string | null;
  /** Fraction digits. Defaults: 0 for counts/days/currency ≥ 1000, 1 for percent. */
  digits?: number;
  /** Prefix "+" on positive values (deltas). */
  signed?: boolean;
  /** For kind "percent": the input is already 0–100 rather than 0–1. */
  percentOfHundred?: boolean;
};

/** The glyph shown for an unknown value. */
export const UNKNOWN_GLYPH = "—";
/** What a screen reader hears for an unknown value. */
export const UNKNOWN_SPOKEN = "Not known";

/** True when a value is missing (not the same as zero). */
export function isUnknown(n: number | null | undefined): n is null | undefined {
  return n === null || n === undefined || !Number.isFinite(n);
}

const MINUS = "−"; // U+2212, aligns with "+" in tabular figures

function compactNumber(a: number, digits: number): string {
  const fmt = (v: number, suffix: string) => `${v.toFixed(digits).replace(/\.0+$/, "")}${suffix}`;
  if (a >= 1e9) return fmt(a / 1e9, "B");
  if (a >= 1e6) return fmt(a / 1e6, "M");
  if (a >= 1e3) return fmt(a / 1e3, "k");
  return Math.round(a).toLocaleString("en-US");
}

/**
 * Format a number for display. Returns the em dash for unknown values;
 * pair with `spokenValue` (or use `<Value>`) so the dash is announced.
 */
export function formatValue(n: number | null | undefined, opts: FormatOptions = {}): string {
  if (isUnknown(n)) return UNKNOWN_GLYPH;
  const { kind = "number", compact = false, currency, signed = false, percentOfHundred = false } = opts;
  const sign = n < 0 ? MINUS : signed && n > 0 ? "+" : "";
  const a = Math.abs(n);

  switch (kind) {
    case "percent": {
      const v = percentOfHundred ? a : a * 100;
      const digits = opts.digits ?? (v < 10 && v % 1 !== 0 ? 1 : 0);
      return `${sign}${v.toFixed(digits)}%`;
    }
    case "currency": {
      const sym = currencySymbol(currency);
      if (compact) return `${sign}${sym}${compactNumber(a, opts.digits ?? 2)}`;
      const digits = opts.digits ?? (a >= 1000 || a % 1 === 0 ? 0 : 2);
      return `${sign}${sym}${a.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
    }
    case "days": {
      const v = Math.round(a);
      return `${sign}${v.toLocaleString("en-US")} ${v === 1 ? "day" : "days"}`;
    }
    case "count":
    case "number":
    default: {
      if (compact) return `${sign}${compactNumber(a, opts.digits ?? 1)}`;
      const digits = opts.digits ?? 0;
      return `${sign}${a.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
    }
  }
}

/** Screen-reader text for a value: the formatted value, or "Not known". */
export function spokenValue(n: number | null | undefined, opts: FormatOptions = {}): string {
  return isUnknown(n) ? UNKNOWN_SPOKEN : formatValue(n, opts).replace(MINUS, "minus ");
}

/** A formatter bound to options, handy for chart axes and tooltips. */
export function formatter(opts: FormatOptions): (n: number | null | undefined) => string {
  return (n) => formatValue(n, opts);
}

/** "Mar 5, 2026". Invalid or empty input returns the em dash. */
export function formatDate(input: string | number | Date | null | undefined): string {
  if (input === null || input === undefined || input === "") return UNKNOWN_GLYPH;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return UNKNOWN_GLYPH;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Mar 5, 2026, 3:04 PM": the absolute form shown on hover. */
export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (input === null || input === undefined || input === "") return UNKNOWN_GLYPH;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return UNKNOWN_GLYPH;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "today", "in 3 days", "12 days ago". `now` is injectable for tests and SSR. */
export function formatRelative(input: string | number | Date | null | undefined, now: Date = new Date()): string {
  if (input === null || input === undefined || input === "") return UNKNOWN_GLYPH;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return UNKNOWN_GLYPH;
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days.toLocaleString("en-US")} days` : `${Math.abs(days).toLocaleString("en-US")} days ago`;
}

/**
 * Whole-number shares that always add up to 100 (largest remainder), so a
 * breakdown never reads 33% + 33% + 33%.
 */
export function wholeShares(values: number[]): number[] {
  const clean = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
  const total = clean.reduce((s, v) => s + v, 0);
  if (total <= 0) return clean.map(() => 0);
  const exact = clean.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  const missing = 100 - floors.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
    .slice(0, missing)
    .map((x) => x.i);
  return floors.map((f, i) => (order.includes(i) ? f + 1 : f));
}
