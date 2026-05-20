export function formatCurrency(amount: number, opts?: { compact?: boolean }) {
  if (opts?.compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(n: number, digits = 0) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
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
