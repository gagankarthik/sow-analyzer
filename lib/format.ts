/**
 * Symbol for an ISO currency code, or "" when the currency is not known.
 *
 * Unknown is not dollars: a missing currency used to fall back to "$", which
 * made an amount of unknown currency look like a USD figure. Callers that have
 * no currency now get a bare number ("12,300"); pass the document's `currency`
 * to get a symbol.
 */
export function currencySymbol(currency?: string | null): string {
  const code = (currency ?? "").trim().toUpperCase();
  if (!code) return "";
  switch (code) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "INR": return "₹";
    case "JPY": return "¥";
    // Any other code is printed as the code itself ("CAD 12,300") rather than
    // guessed at.
    default: return `${code} `;
  }
}

const DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A Date from an ISO string, reading a bare calendar day ("2025-11-02") as
 * that day in the viewer's time zone. `new Date("2025-11-02")` is UTC
 * midnight, which every time zone west of Greenwich shows as the day before,
 * so an effective date of November 2 read as November 1.
 */
export function parseDate(d: string | number | Date): Date {
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    const m = DAY_ONLY.exec(d.trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(d);
}

export function formatDate(d: string | Date) {
  const date = parseDate(d);
  // Guard against empty/invalid input so we never render the literal
  // "Invalid Date" string (e.g. when a field is "" or null).
  if (!d || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDays(target: string | Date, now = new Date()) {
  const d = parseDate(target);
  if (!target || isNaN(d.getTime())) return "—";
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff}d`;
  return `${Math.abs(diff)}d ago`;
}

const AMOUNT_SCALE: Record<string, number> = { k: 1e3, m: 1e6, mm: 1e6, b: 1e9, bn: 1e9 };

/**
 * An amount as people type it: "$120,000", "USD 120000", "120k", "1.5m",
 * "12.5%". Returns null when empty and "invalid" when it is not a number, so a
 * typo is reported instead of being saved as "no value".
 */
export function parseAmount(s: string): number | null | "invalid" {
  const t = s.trim().toLowerCase()
    .replace(/^[a-z]{3}(?=[\s\d$€£¥₹.])/, "")          // a leading ISO code: "usd 120"
    .replace(/[$€£¥₹,\s%]/g, "");
  if (!t) return null;
  const m = /^(\d+(?:\.\d+)?|\.\d+)(k|mm|m|bn|b)?$/.exec(t);
  if (!m) return "invalid";
  return Number(m[1]) * (m[2] ? AMOUNT_SCALE[m[2]] : 1);
}

/** Days ahead that count as "due soon" everywhere (obligations, renewals, key dates). */
export const DUE_SOON_DAYS = 30;
