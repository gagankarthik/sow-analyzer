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

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  // Guard against empty/invalid input so we never render the literal
  // "Invalid Date" string (e.g. when a field is "" or null).
  if (!d || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDays(target: string | Date, now = new Date()) {
  const d = typeof target === "string" ? new Date(target) : target;
  if (!target || isNaN(d.getTime())) return "—";
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff}d`;
  return `${Math.abs(diff)}d ago`;
}
