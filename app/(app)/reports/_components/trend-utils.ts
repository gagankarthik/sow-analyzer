// Plain-language takeaways for the trend charts. Each takes the periods the
// API returned and says, in one sentence, what changed. Unknown periods
// (null) are skipped, never treated as zero.

import { formatCompact } from "@/lib/govern/metrics";
import type { MoneyByCurrency, TrendPeriod, Trends } from "@/lib/govern/types";

/** "Sep 2026" for months, "Week of 14 Sep" for weeks. */
export function periodLabel(p: TrendPeriod, granularity: Trends["granularity"]): string {
  const start = new Date(p.start);
  if (Number.isNaN(start.getTime())) return p.period;
  return granularity === "month"
    ? start.toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : `Wk ${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

/** Short tick label: "Sep" / "14 Sep". */
export function periodTick(p: TrendPeriod, granularity: Trends["granularity"]): string {
  const start = new Date(p.start);
  if (Number.isNaN(start.getTime())) return p.period;
  return granularity === "month"
    ? start.toLocaleDateString(undefined, { month: "short" })
    : start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function unitWord(granularity: Trends["granularity"], n: number): string {
  return granularity === "month" ? (n === 1 ? "month" : "months") : n === 1 ? "week" : "weeks";
}

/** Periods with any recorded activity at all. */
export function activePeriods(periods: TrendPeriod[]): TrendPeriod[] {
  return periods.filter((p) => p.received + p.signed + p.rejected + p.sentBack + p.escalated + p.overdueEvents + p.revisions > 0);
}

/** Enough history to talk about a trend: at least two periods with activity. */
export function hasHistory(periods: TrendPeriod[]): boolean {
  return activePeriods(periods).length >= 2;
}

/**
 * "Cycle time fell from 41 to 33 days over the last 3 months." Compares the
 * first and last known value within the last `window` periods.
 */
export function changeSentence({
  values, subject, unit, granularity, window = 3, format = (n: number) => `${Math.round(n)}`,
}: {
  values: (number | null)[];
  subject: string;
  unit: string;
  granularity: Trends["granularity"];
  window?: number;
  format?: (n: number) => string;
}): string | null {
  const tail = values.slice(-Math.max(2, window));
  const known = tail.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (known.length < 2) {
    const last = [...values].reverse().find((v): v is number => v !== null);
    return last === undefined ? null : `${subject} was ${format(last)}${unit} in the latest ${unitWord(granularity, 1)} with data.`;
  }
  const first = known[0];
  const last = known[known.length - 1];
  const span = last.i - first.i;
  const over = `over the last ${span + 1} ${unitWord(granularity, span + 1)}`;
  const diff = last.v - first.v;
  const rel = first.v !== 0 ? Math.abs(diff) / Math.abs(first.v) : Math.abs(diff);
  if (rel < 0.05) return `${subject} held steady at about ${format(last.v)}${unit} ${over}.`;
  const verb = diff < 0 ? "fell" : "rose";
  return `${subject} ${verb} from ${format(first.v)} to ${format(last.v)}${unit} ${over}.`;
}

/** "142 received and 118 signed in 12 months; signing is keeping pace." */
export function throughputSentence(periods: TrendPeriod[], granularity: Trends["granularity"]): string {
  const received = periods.reduce((s, p) => s + p.received, 0);
  const signed = periods.reduce((s, p) => s + p.signed, 0);
  const n = periods.length;
  const base = `${received.toLocaleString()} received and ${signed.toLocaleString()} signed in ${n} ${unitWord(granularity, n)}`;
  if (received === 0 && signed === 0) return "No contracts were received or signed in this window.";
  const gap = received - signed;
  if (Math.abs(gap) <= Math.max(1, received * 0.1)) return `${base}; signing is keeping pace with what arrives.`;
  return gap > 0
    ? `${base}; about ${gap.toLocaleString()} more arrived than were signed, so the queue is growing.`
    : `${base}; more were signed than arrived, so the queue is shrinking.`;
}

/** Sums each currency across periods and returns the largest one. */
export function primaryCurrency(maps: MoneyByCurrency[]): string | null {
  const totals = new Map<string, number>();
  for (const m of maps) for (const [cur, v] of Object.entries(m)) totals.set(cur, (totals.get(cur) ?? 0) + v);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

export function currenciesIn(maps: MoneyByCurrency[]): string[] {
  const set = new Set<string>();
  for (const m of maps) for (const [cur, v] of Object.entries(m)) if (v) set.add(cur);
  return [...set];
}

export function moneySentence(values: number[], currency: string | null, granularity: Trends["granularity"]): string {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return "No value was signed in this window.";
  const best = values.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);
  const n = values.length;
  return `${formatCompact(total, currency)} signed in ${n} ${unitWord(granularity, n)}; the biggest ${unitWord(granularity, 1)} was ${formatCompact(values[best], currency)}.`;
}

export const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n)}%`);
