// Key dates: every dated event or obligation the analysis found in a document
// (`keyDates` on the document, its classification and its timeline), plus the
// state of each one relative to today.
//
// The API stores NO status. Completed / current / upcoming depends on today's
// date, so it is derived here, from the live clock, every time it is shown.
// Everything in this file is a pure function (no React, no I/O): give it the
// key dates and "now" and it returns the same answer every time.
//
// ── The rules ───────────────────────────────────────────────────────────────
// "Today" is the reader's local calendar day. Contract dates carry no time or
// time zone, so all comparisons are between calendar days, never timestamps.
//
//   undated    The entry has no calendar date (`date` is null): a rule whose
//              starting point is unknown ("30 days after acceptance"), an
//              ambiguous or invalid date, a recurring obligation. Its rule or
//              original wording is shown instead. Nothing is guessed.
//   completed  The date is before today. For a date known only to the month,
//              quarter, half-year or year, the whole period is before today.
//   current    One of:
//                • the date is today;
//                • a period date (month / quarter / half / year precision)
//                  whose period contains today;
//                • a notice deadline that has not passed while the contract
//                  term has started (a start or effective date on or before
//                  today is known): the window to give notice is open now.
//   upcoming   The date (or the start of its period) is after today.
//
//   overdue    A flag on top of `completed`, set only for obligations: notice
//              deadline, payment, deliverable, milestone and deadline. It means
//              "the due date has passed". The app does not track whether an
//              obligation was met, so it never claims that it was missed.
//
// The contract term itself (start or effective date → term end) is reported
// separately as `term`: in force when today lies between the two dates. It is
// only built when both dates were extracted as exact days with no issues.

export const KEY_DATE_KINDS = [
  "effective", "signature", "start", "term_end", "renewal", "notice_deadline",
  "milestone", "deliverable", "payment", "acceptance", "sla_reporting",
  "amendment_effective", "termination", "deadline", "other",
] as const;
export type KeyDateKind = (typeof KEY_DATE_KINDS)[number];

export type KeyDatePrecision = "day" | "month" | "quarter" | "half" | "year";
export type KeyDateConfidence = "high" | "medium" | "low";
/** Where the entry came from. "legacy" is built in this file from the older
 *  date fields of a document analyzed before key dates existed. */
export type KeyDateOrigin = "structured" | "extracted" | "derived" | "legacy";

export interface KeyDate {
  id: string;
  kind: KeyDateKind;
  label: string;
  /** ISO calendar day (YYYY-MM-DD), or null when there is no calendar date.
   *  For a month / quarter / half / year this is the LAST day of the period. */
  date: string | null;
  /** The wording in the document. Shortened in list responses. */
  rawText: string | null;
  precision: KeyDatePrecision | null;
  isEstimated: boolean;
  isDerived: boolean;
  ambiguous: boolean;
  anchor: string | null;
  offsetValue: number | null;
  offsetUnit: string | null;
  /** Signed: negative means "before the anchor". */
  offsetDays: number | null;
  recurring: string | null;
  amount: number | null;
  currency: string | null;
  clauseId: string | null;
  clauseNumber: string | null;
  sectionRef: string | null;
  confidence: KeyDateConfidence | null;
  issues: string[];
  origin: KeyDateOrigin | null;
  /** First day of the period for month / quarter / half / year precision. */
  periodStart: string | null;
}

export type KeyDateState = "completed" | "current" | "upcoming" | "undated";
export const KEY_DATE_STATES: KeyDateState[] = ["completed", "current", "upcoming", "undated"];

export interface DerivedKeyDate extends KeyDate {
  state: KeyDateState;
  /** Due date passed, for an obligation. Not a claim that it was missed. */
  overdue: boolean;
  /** Whole calendar days from today to `date` (negative = past); null if undated. */
  days: number | null;
  /** True for a notice deadline whose window is open today. */
  noticeWindowOpen: boolean;
  /** True when today falls inside a month / quarter / half / year period. */
  inPeriod: boolean;
}

export interface TermPeriod {
  start: string;
  end: string;
  state: "upcoming" | "current" | "completed";
  totalDays: number;
  /** Days from the start to today, clamped to the term. */
  elapsedDays: number;
  /** Days from today to the end (negative once the term has ended). */
  remainingDays: number;
  /** Which entry gave the start: the start date, else the effective date. */
  startKind: "start" | "effective";
}

export interface KeyDateTimeline {
  today: string;
  /** Dated entries oldest first, then the undated ones in the order received. */
  items: DerivedKeyDate[];
  completed: DerivedKeyDate[];
  current: DerivedKeyDate[];
  upcoming: DerivedKeyDate[];
  undated: DerivedKeyDate[];
  term: TermPeriod | null;
  counts: Record<KeyDateState, number> & { total: number; overdue: number; withIssues: number };
}

/** Kinds whose date is something to be done by, so a passed date is "overdue". */
export const OBLIGATION_KINDS: ReadonlySet<KeyDateKind> = new Set<KeyDateKind>([
  "notice_deadline", "payment", "deliverable", "milestone", "deadline",
]);

/** Kinds shown on the portfolio views (renewals, insights, notifications). */
export const PORTFOLIO_KINDS: ReadonlySet<KeyDateKind> = new Set<KeyDateKind>([
  "renewal", "term_end", "notice_deadline", "payment", "milestone", "deliverable",
]);

const KIND_LABEL: Record<KeyDateKind, string> = {
  effective: "Effective date",
  signature: "Signature",
  start: "Start",
  term_end: "Term end",
  renewal: "Renewal",
  notice_deadline: "Notice deadline",
  milestone: "Milestone",
  deliverable: "Deliverable",
  payment: "Payment",
  acceptance: "Acceptance",
  sla_reporting: "SLA reporting",
  amendment_effective: "Amendment effective",
  termination: "Termination",
  deadline: "Deadline",
  other: "Other date",
};

export function kindLabel(kind: KeyDateKind): string {
  return KIND_LABEL[kind] ?? KIND_LABEL.other;
}

const ISSUE_LABEL: Record<string, string> = {
  ambiguous_day_month: "Day and month could be either way round",
  invalid_date: "Not a real calendar date",
  implausible_date: "Date looks wrong (too far in the past or future)",
  anchor_unknown: "Counted from a date the document does not give",
  event_based: "Counted from an event, not a calendar date",
  no_calendar_date: "No calendar date in the document",
  before_effective_date: "Falls before the effective date",
};

/** A key-date issue in plain words. An issue this app has not seen before is
 *  shown as its own text rather than dropped. */
export function issueLabel(issue: string): string {
  return ISSUE_LABEL[issue] ?? issue.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const STATE_LABEL: Record<KeyDateState, string> = {
  completed: "Completed",
  current: "Current",
  upcoming: "Upcoming",
  undated: "No calendar date",
};

export function stateLabel(state: KeyDateState): string {
  return STATE_LABEL[state];
}

/** What a passed due date is called for each obligation kind. */
export function overdueLabel(kind: KeyDateKind): string {
  return kind === "notice_deadline" ? "Notice deadline passed" : "Due date passed";
}

// ── Calendar-day helpers ────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** Strict ISO day ("2026-03-01", also the date part of an ISO timestamp), or
 *  null when the string is not a real calendar date. */
export function isoDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = ISO_DAY.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Days since the epoch for an ISO day (time-zone free). */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** The reader's local calendar day for a clock reading. */
export function todayIso(now: number | Date): string {
  const d = typeof now === "number" ? new Date(now) : now;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local-midnight timestamp of an ISO day, for code that sorts or groups by ms. */
export function isoDayToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** An ISO day shifted by a number of days. */
export function addDays(iso: string, days: number): string {
  const t = new Date((dayNumber(iso) + days) * DAY_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** "today", "tomorrow", "in 12 days", "yesterday", "12 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days.toLocaleString()} days` : `${Math.abs(days).toLocaleString()} days ago`;
}

// ── Normalising what the API sent ───────────────────────────────────────────

const KIND_SET: ReadonlySet<string> = new Set(KEY_DATE_KINDS);
const PRECISIONS: ReadonlySet<string> = new Set(["day", "month", "quarter", "half", "year"]);
const CONFIDENCES: ReadonlySet<string> = new Set(["high", "medium", "low"]);
const ORIGINS: ReadonlySet<string> = new Set(["structured", "extracted", "derived", "legacy"]);

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Key dates as the UI uses them, from any of the API responses (the full list
 * on the classification / timeline, or the shorter entries of the document
 * list, which leave out rawText, the rule and the issues). A missing field
 * becomes null / false / []; nothing is filled in. Entries that are not
 * objects are skipped. Returns [] for anything that is not a list.
 */
export function normaliseKeyDates(raw: unknown): KeyDate[] {
  if (!Array.isArray(raw)) return [];
  const out: KeyDate[] = [];
  raw.forEach((entry, i) => {
    if (typeof entry !== "object" || entry === null) return;
    const e = entry as Record<string, unknown>;
    const kind = (typeof e.kind === "string" && KIND_SET.has(e.kind) ? e.kind : "other") as KeyDateKind;
    const date = isoDay(e.date);
    const precision = typeof e.precision === "string" && PRECISIONS.has(e.precision)
      ? (e.precision as KeyDatePrecision)
      : null;
    out.push({
      id: str(e.id) ?? `kd-${i}`,
      kind,
      label: str(e.label) ?? kindLabel(kind),
      date,
      rawText: str(e.rawText),
      precision: date ? precision ?? "day" : precision,
      isEstimated: e.isEstimated === true,
      isDerived: e.isDerived === true,
      ambiguous: e.ambiguous === true,
      anchor: str(e.anchor),
      offsetValue: num(e.offsetValue),
      offsetUnit: str(e.offsetUnit),
      offsetDays: num(e.offsetDays),
      recurring: str(e.recurring),
      amount: num(e.amount),
      currency: str(e.currency),
      clauseId: str(e.clauseId),
      clauseNumber: str(e.clauseNumber) ?? (typeof e.clauseNumber === "number" ? String(e.clauseNumber) : null),
      sectionRef: str(e.sectionRef),
      confidence: typeof e.confidence === "string" && CONFIDENCES.has(e.confidence)
        ? (e.confidence as KeyDateConfidence)
        : null,
      issues: Array.isArray(e.issues) ? e.issues.filter((x): x is string => typeof x === "string") : [],
      origin: typeof e.origin === "string" && ORIGINS.has(e.origin) ? (e.origin as KeyDateOrigin) : null,
      periodStart: isoDay(e.periodStart),
    });
  });
  return out;
}

// ── Deriving state ──────────────────────────────────────────────────────────

const KIND_ORDER = new Map<KeyDateKind, number>(KEY_DATE_KINDS.map((k, i) => [k, i]));

/** An exact day with nothing wrong with it: safe to use as a start or end. */
function reliableDay(kd: KeyDate): boolean {
  return !!kd.date && kd.precision === "day" && kd.issues.length === 0 && !kd.ambiguous;
}

/** The first day of the contract term, when the document gives one: the
 *  earliest start date, else the earliest (non-amendment) effective date. */
function termStartOf(keyDates: KeyDate[]): { date: string; kind: "start" | "effective" } | null {
  for (const kind of ["start", "effective"] as const) {
    const days = keyDates.filter((k) => k.kind === kind && reliableDay(k)).map((k) => k.date as string).sort();
    if (days.length > 0) return { date: days[0], kind };
  }
  return null;
}

function termOf(keyDates: KeyDate[], today: string): TermPeriod | null {
  const start = termStartOf(keyDates);
  if (!start) return null;
  const ends = keyDates.filter((k) => k.kind === "term_end" && reliableDay(k)).map((k) => k.date as string).sort();
  // The latest stated term end: an extension supersedes the original end.
  const end = ends[ends.length - 1];
  if (!end || end < start.date) return null;
  const totalDays = daysBetween(start.date, end);
  const sinceStart = daysBetween(start.date, today);
  return {
    start: start.date,
    end,
    state: today < start.date ? "upcoming" : today > end ? "completed" : "current",
    totalDays,
    elapsedDays: Math.min(Math.max(sinceStart, 0), totalDays),
    remainingDays: daysBetween(today, end),
    startKind: start.kind,
  };
}

/** State of one key date on a given day. `termStart` is the first day of the
 *  contract term if known (see the rules at the top of this file). */
export function deriveKeyDate(kd: KeyDate, today: string, termStart: string | null = null): DerivedKeyDate {
  if (!kd.date) {
    return { ...kd, state: "undated", overdue: false, days: null, noticeWindowOpen: false, inPeriod: false };
  }
  const days = daysBetween(today, kd.date);
  const isPeriod = kd.precision !== null && kd.precision !== "day" && !!kd.periodStart && kd.periodStart <= kd.date;
  const inPeriod = isPeriod && (kd.periodStart as string) <= today && today <= kd.date;

  let state: KeyDateState;
  if (inPeriod || days === 0) state = "current";
  else if (isPeriod) state = today < (kd.periodStart as string) ? "upcoming" : "completed";
  else state = days > 0 ? "upcoming" : "completed";

  // A notice deadline that has not passed, in a term that has begun: the window
  // to give notice is open now. Without a known start we do not assume it is.
  const noticeWindowOpen = kd.kind === "notice_deadline" && days >= 0 && termStart !== null && termStart <= today;
  if (noticeWindowOpen) state = "current";

  return {
    ...kd,
    state,
    overdue: state === "completed" && OBLIGATION_KINDS.has(kd.kind),
    days,
    noticeWindowOpen,
    inPeriod,
  };
}

/** Every key date with its state today, sorted and grouped. */
export function buildKeyDateTimeline(keyDates: KeyDate[], now: number | Date): KeyDateTimeline {
  const today = todayIso(now);
  const termStart = termStartOf(keyDates)?.date ?? null;
  const derived = keyDates.map((k) => deriveKeyDate(k, today, termStart));

  const dated = derived
    .filter((k) => k.date !== null)
    .sort((a, b) =>
      (a.date as string).localeCompare(b.date as string)
      || (KIND_ORDER.get(a.kind) ?? 99) - (KIND_ORDER.get(b.kind) ?? 99)
      || a.label.localeCompare(b.label));
  const undated = derived.filter((k) => k.date === null);
  const items = [...dated, ...undated];

  const of = (state: KeyDateState) => items.filter((k) => k.state === state);
  const completed = of("completed");
  const current = of("current");
  const upcoming = of("upcoming");

  return {
    today,
    items,
    completed,
    current,
    upcoming,
    undated,
    term: termOf(keyDates, today),
    counts: {
      total: items.length,
      completed: completed.length,
      current: current.length,
      upcoming: upcoming.length,
      undated: undated.length,
      overdue: items.filter((k) => k.overdue).length,
      withIssues: items.filter(hasIssue).length,
    },
  };
}

/** True when the entry carries anything a reader should double-check. */
export function hasIssue(kd: KeyDate): boolean {
  return kd.issues.length > 0 || kd.ambiguous;
}

/** The three things the overview card shows. */
export function summariseKeyDates(tl: KeyDateTimeline): {
  nextUpcoming: DerivedKeyDate | null;
  current: DerivedKeyDate[];
  lastCompleted: DerivedKeyDate | null;
  term: TermPeriod | null;
} {
  return {
    nextUpcoming: tl.upcoming[0] ?? null,
    current: tl.current,
    lastCompleted: tl.completed[tl.completed.length - 1] ?? null,
    term: tl.term,
  };
}

// ── Wording ────────────────────────────────────────────────────────────────

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** An ISO day as "5 Mar 2026" (locale order), without time-zone drift. */
export function formatIsoDay(iso: string, locale?: string): string {
  return utcDate(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * A key date written to the precision the document gave: an exact day
 * ("5 Mar 2026"), a month ("March 2026"), a quarter ("Q1 2026"), a half-year
 * ("H1 2026") or a year ("2026"). Null when there is no calendar date.
 */
export function formatKeyDate(kd: Pick<KeyDate, "date" | "precision">, locale?: string): string | null {
  if (!kd.date) return null;
  const d = utcDate(kd.date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // of the period's last day
  switch (kd.precision) {
    case "month":
      return d.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
    case "quarter":
      return `Q${Math.floor(month / 3) + 1} ${year}`;
    case "half":
      return `H${month < 6 ? 1 : 2} ${year}`;
    case "year":
      return String(year);
    default:
      return formatIsoDay(kd.date, locale);
  }
}

/** "in 12 days", "3 days ago", "today", "ends in 9 days" (a period under way),
 *  "closes in 20 days" (an open notice window). Null when undated. */
export function relativeLabel(kd: DerivedKeyDate): string | null {
  if (kd.days === null) return null;
  if (kd.noticeWindowOpen) return kd.days === 0 ? "closes today" : `closes ${relativeDays(kd.days)}`;
  if (kd.inPeriod && kd.days > 0) return `ends ${relativeDays(kd.days)}`;
  return relativeDays(kd.days);
}

const ANCHOR_LABEL: Record<string, string> = {
  effective: "the effective date",
  start: "the start date",
  signature: "signature",
  term_end: "the end of the term",
  invoice: "the invoice date",
  acceptance: "acceptance",
  delivery: "delivery",
  notice: "notice",
};

const UNIT_LABEL: Record<string, [string, string]> = {
  days: ["day", "days"],
  business_days: ["business day", "business days"],
  weeks: ["week", "weeks"],
  months: ["month", "months"],
  years: ["year", "years"],
};

/**
 * The rule behind a date in plain words: "30 days after the effective date",
 * "60 days before the end of the term". Null when the entry has no offset rule.
 * When the starting point is not known the text says so; it is never guessed.
 */
export function ruleText(kd: Pick<KeyDate, "offsetValue" | "offsetUnit" | "offsetDays" | "anchor">): string | null {
  if (kd.offsetValue === null || !kd.offsetUnit) return null;
  const n = Math.abs(kd.offsetValue);
  const unit = UNIT_LABEL[kd.offsetUnit];
  const unitText = unit ? (n === 1 ? unit[0] : unit[1]) : kd.offsetUnit.replace(/_/g, " ");
  const direction = (kd.offsetDays ?? kd.offsetValue) < 0 ? "before" : "after";
  const anchor = kd.anchor ? ANCHOR_LABEL[kd.anchor] ?? kd.anchor.replace(/_/g, " ") : null;
  return anchor
    ? `${n.toLocaleString()} ${unitText} ${direction} ${anchor}`
    : `${n.toLocaleString()} ${unitText} ${direction} a starting point the document does not identify`;
}

// ── Documents analyzed before key dates existed ────────────────────────────

/** The older date fields of a document row. */
export interface LegacyDateFields {
  docType?: string | null;
  effectiveDate?: string | null;
  termEndDate?: string | null;
  renewalDate?: string | null;
  renewalNoticeDays?: number | null;
}

/** The older date fields of a classification. */
export interface LegacyClassificationDates {
  effectiveDate?: string | null;
  identification?: { executionDate?: string | null } | null;
  timelineDetail?: {
    startDate?: string | null;
    endDate?: string | null;
    phases?: { name?: string | null; start?: string | null; end?: string | null }[] | null;
    milestones?: { name?: string | null; date?: string | null; payment?: number | null }[] | null;
  } | null;
  deliverables?: { name?: string | null; dueDate?: string | null; value?: number | null }[] | null;
  commercials?: { currency?: string | null } | null;
}

/** A legacy date string as an ISO day: taken as written when it is ISO, else
 *  read with the platform's date parser. Null when it is not a date. */
function legacyDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const strict = isoDay(value);
  if (strict) return strict;
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? null : todayIso(t);
}

/**
 * Key dates for a document analyzed before the `keyDates` field existed, built
 * only from the dates that analysis did extract (effective, term end, renewal,
 * notice period; plus start, phases, milestones, deliverables and execution
 * date when its classification is given). `origin` is "legacy" on every entry.
 * A value that is not a readable date is kept as wording with no calendar date.
 */
export function legacyKeyDates(doc: LegacyDateFields, classification?: LegacyClassificationDates | null): KeyDate[] {
  const out: KeyDate[] = [];
  const seen = new Set<string>();
  const currency = classification?.commercials?.currency ?? null;
  const push = (kind: KeyDateKind, label: string | null, raw: string | null | undefined, extra: Partial<KeyDate> = {}) => {
    if (!raw && !extra.date) return;
    const date = extra.date ?? legacyDay(raw);
    const key = `${kind}|${date ?? raw}|${label ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: `legacy-${out.length}`,
      kind,
      label: label || kindLabel(kind),
      date,
      rawText: date ? null : raw ?? null,
      precision: date ? "day" : null,
      isEstimated: false,
      isDerived: false,
      ambiguous: false,
      anchor: null,
      offsetValue: null,
      offsetUnit: null,
      offsetDays: null,
      recurring: null,
      amount: null,
      currency: null,
      clauseId: null,
      clauseNumber: null,
      sectionRef: null,
      confidence: null,
      issues: [],
      origin: "legacy",
      periodStart: null,
      ...extra,
    });
  };

  const isAmendment = doc.docType === "AMENDMENT";
  push(isAmendment ? "amendment_effective" : "effective", null, doc.effectiveDate ?? classification?.effectiveDate);
  push("signature", "Execution date", classification?.identification?.executionDate);
  const td = classification?.timelineDetail;
  push("start", null, td?.startDate);
  for (const p of td?.phases ?? []) {
    const name = p.name || "Phase";
    push("milestone", `${name}: starts`, p.start);
    push("milestone", `${name}: ends`, p.end);
  }
  for (const m of td?.milestones ?? []) {
    const amount = typeof m.payment === "number" ? m.payment : null;
    push("milestone", m.name || null, m.date, { amount, currency: amount !== null ? currency : null });
  }
  for (const d of classification?.deliverables ?? []) {
    const amount = typeof d.value === "number" ? d.value : null;
    push("deliverable", d.name || null, d.dueDate, { amount, currency: amount !== null ? currency : null });
  }
  const termEndRaw = doc.termEndDate ?? td?.endDate;
  push("term_end", null, termEndRaw);
  push("renewal", null, doc.renewalDate);

  // Last day to give notice = term end (else the renewal date) minus the notice
  // period: the same sum the analysis now does itself.
  const noticeDays = doc.renewalNoticeDays;
  const base = legacyDay(termEndRaw) ?? legacyDay(doc.renewalDate);
  if (typeof noticeDays === "number" && noticeDays > 0 && base) {
    push("notice_deadline", "Last day to give notice of non-renewal", null, {
      date: addDays(base, -Math.round(noticeDays)),
      precision: "day",
      isDerived: true,
      anchor: legacyDay(termEndRaw) ? "term_end" : "renewal",
      offsetValue: Math.round(noticeDays),
      offsetUnit: "days",
      offsetDays: -Math.round(noticeDays),
    });
  }
  return out;
}

export type KeyDateSource =
  /** The full list, from the document's classification. */
  | "classification"
  /** The list stored on the document row (may be shortened or cut off). */
  | "document"
  /** Built from the older date fields: the document predates key dates. */
  | "legacy"
  /** No date of any kind was extracted. */
  | "none";

export interface DocumentKeyDates {
  dates: KeyDate[];
  source: KeyDateSource;
  /** False when the document was analyzed before key dates existed, so the
   *  list may be missing dates a re-analysis would find. */
  extracted: boolean;
  /** True when the stored list was cut off to fit the document row. */
  truncated: boolean;
  /** How many key dates the analysis found in total, when the API says. */
  total: number | null;
}

/** The fields of a document row (and, optionally, its classification) that key
 *  dates are read from. `keyDates` is `unknown` on purpose: it is validated. */
export interface KeyDateDocument extends LegacyDateFields {
  keyDates?: unknown;
  keyDatesTruncated?: boolean | null;
  keyDateCount?: number | null;
}

/**
 * The key dates of one document, from the best source available:
 * the classification's full list, else the list on the document row, else the
 * older date fields. `extracted` tells the caller which case it is, so a
 * document that predates the feature can say "re-analyze to extract dates"
 * instead of looking as if it simply had none.
 */
export function documentKeyDates(
  doc: KeyDateDocument,
  classification?: (LegacyClassificationDates & { keyDates?: unknown }) | null,
): DocumentKeyDates {
  const total = typeof doc.keyDateCount === "number" ? doc.keyDateCount : null;
  if (classification && Array.isArray(classification.keyDates)) {
    return { dates: normaliseKeyDates(classification.keyDates), source: "classification", extracted: true, truncated: false, total };
  }
  if (Array.isArray(doc.keyDates)) {
    return { dates: normaliseKeyDates(doc.keyDates), source: "document", extracted: true, truncated: doc.keyDatesTruncated === true, total };
  }
  const legacy = legacyKeyDates(doc, classification);
  return { dates: legacy, source: legacy.length > 0 ? "legacy" : "none", extracted: false, truncated: false, total: null };
}

/** The dated renewal / term-end / notice / payment / milestone / deliverable
 *  entries of one document, with today's state, soonest first. */
export function portfolioDates(doc: KeyDateDocument, now: number | Date): DerivedKeyDate[] {
  const { dates } = documentKeyDates(doc);
  return buildKeyDateTimeline(dates, now).items.filter((k) => k.date !== null && PORTFOLIO_KINDS.has(k.kind));
}

/** Who may start a re-analysis: owners and editors. A document row with no
 *  `role` (an older API) is treated as allowed; the server decides either way. */
export function canReanalyze(role: string | null | undefined): boolean {
  return role == null || role === "" || role === "owner" || role === "editor";
}
