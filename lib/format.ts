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

// A calendar date, bare or as the midnight-UTC timestamp serializers turn it
// into ("2025-11-02T00:00:00Z"). Both mean that day wherever the reader is;
// read as an instant, the timestamp lands on Nov 1 west of UTC.
const DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00))?$/;

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

/* ─── Document titles ─────────────────────────────────────────────── */

/** Acronyms that stay upper case when an ALL-CAPS title is title-cased. */
const TITLE_ACRONYMS = new Set([
  "SOW", "MSA", "NDA", "PI", "LLC", "INC", "LLP", "LP", "LTD", "PLC", "CO",
  "SLA", "MOU", "LOI", "CDA", "DUA", "CTA", "MTA", "BAA", "DPA", "PO", "RFP",
  "IP", "IT", "HR", "AI", "API", "US", "USA", "UK", "EU", "II", "III", "IV",
]);

/** Short words kept lower case unless they open the title. */
const TITLE_SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "vs"]);

function titleWord(part: string, first: boolean): string {
  const m = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(part);
  if (!m || !m[2]) return part;
  const [, lead, core, trail] = m;
  if (TITLE_ACRONYMS.has(core.toUpperCase()) || /\d/.test(core)) return part;
  const lower = core.toLowerCase();
  if (!first && TITLE_SMALL.has(lower)) return lead + lower + trail;
  return lead + lower.charAt(0).toUpperCase() + lower.slice(1) + trail;
}

/** An ALL-CAPS word that reads as shouting: three or more letters, no
 *  lower case, no digits, and not a known acronym ("SOW", "LLC"). */
function isShoutingWord(token: string): boolean {
  const core = token.replace(/[^A-Za-z]/g, "");
  return core.length >= 3 && !/[a-z\d]/.test(token) && !TITLE_ACRONYMS.has(core.toUpperCase());
}

/** A token that neither starts nor breaks a run of caps: "-", "&", "#1", "(SOW)". */
function isNeutral(token: string): boolean {
  return !/[a-z]/.test(token) && !isShoutingWord(token);
}

function titleToken(token: string, first: boolean): string {
  // Codes and numbers ("2025-A", "V2") and mixed-case words stay as written.
  if (/\d/.test(token) || /[a-z]/.test(token)) return token;
  return token
    .split(/([-/])/)
    .map((p) => (p === "-" || p === "/" ? p : titleWord(p, first)))
    .join("");
}

/**
 * A document title for display (UI_SPEC section 4). Titles read from
 * documents are often ALL CAPS ("MASTER SERVICES AGREEMENT - ACME INC"), in
 * whole or in part ("AMENDMENT #1 TO STATEMENT OF WORK (SOW) Website…");
 * those caps are shown in title case, keeping acronyms (SOW, MSA, NDA, PI,
 * LLC, INC …), anything with digits and every mixed-case word as written.
 * A single caps word inside normal text ("iPhone NDA", "the ACME portal")
 * is left alone.
 */
export function displayTitle(title: string | null | undefined): string {
  if (!title) return title ?? "";
  if (!/[A-Z]/.test(title)) return title;
  const parts = title.split(/(\s+)/);
  const words = parts.map((t, i) => ({ t, i })).filter(({ t }) => t !== "" && !/^\s+$/.test(t));
  const allCaps = !/[a-z]/.test(title);
  // Which words to convert: everything in an all-caps title, otherwise each
  // run of caps words that holds at least two shouting words.
  const convert = new Set<number>();
  if (allCaps) {
    words.forEach(({ i }) => convert.add(i));
  } else {
    let run: number[] = [];
    let shouting = 0;
    const flush = () => {
      if (shouting >= 2) run.forEach((i) => convert.add(i));
      run = [];
      shouting = 0;
    };
    for (const { t, i } of words) {
      if (isShoutingWord(t)) { run.push(i); shouting += 1; }
      else if (isNeutral(t) && run.length > 0) run.push(i);
      else flush();
    }
    flush();
  }
  if (convert.size === 0) return title;
  const firstWord = words.find(({ t }) => /[A-Za-z0-9]/.test(t))?.i;
  return parts.map((t, i) => (convert.has(i) ? titleToken(t, i === firstWord) : t)).join("");
}
