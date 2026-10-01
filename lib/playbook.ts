// The playbook: the standard positions clauses are graded against, and the
// outcome of that grading for each clause. Types, validation and wording only:
// no React and no network calls in this file (the fetchers live in lib/api.ts,
// the query hooks in lib/queries/playbook.ts).
//
// How grading works (decided by the API, described here so the UI words it
// correctly):
//   • A document is graded against the playbook of the workspace it was
//     uploaded into, when it is analysed. Changing a rule does not change the
//     result of a document already analysed: it applies from the next analysis
//     or re-analysis.
//   • Every clause gets exactly one outcome. "No rule" and "not classified" are
//     not passes: nothing was checked.
//   • A rule with no automatic check is reported as "flagged" for a person to
//     compare, never as "within".

export type PlaybookOutcome = "within" | "deviates" | "flagged" | "no_rule" | "unclassified";
export const PLAYBOOK_OUTCOMES: PlaybookOutcome[] = ["deviates", "flagged", "within", "no_rule", "unclassified"];

export type PlaybookSeverity = "minor" | "moderate" | "material";
export const PLAYBOOK_SEVERITIES: PlaybookSeverity[] = ["minor", "moderate", "material"];

/** Which layer a rule (or a document's grading) came from. */
export type PlaybookSource = "default" | "deployment" | "custom";

/** The playbook result carried on one clause (`clause.playbook`). */
export interface ClausePlaybookResult {
  ruleId: string | null;
  ruleName: string | null;
  /** The standard position the clause was compared with. */
  standard: string | null;
  fallback: string | null;
  /** What the check read from the clause ("Net 45"), when it read a value. */
  found: string | null;
  outcome: PlaybookOutcome;
  severity: PlaybookSeverity | null;
  reason: string | null;
}

/** Document-level counts from the classification's `playbook` block. A count is
 *  null when the API did not send it: unknown, not zero. */
export interface PlaybookSummary {
  checked: number | null;
  withinCount: number | null;
  deviationCount: number | null;
  reviewCount: number | null;
  noRuleCount: number | null;
  unclassifiedCount: number | null;
  source: PlaybookSource | null;
}

export interface PlaybookRule {
  /** A clause category ("Payment") or `type.<key>` for a custom clause type. */
  ruleId: string;
  clauseType: string;
  isCustomType: boolean;
  label: string;
  standard: string;
  rationale: string | null;
  fallback: string | null;
  thresholds: Record<string, number>;
  requiredPhrases: string[];
  forbiddenPhrases: string[];
  phraseSeverity: PlaybookSeverity;
  source: PlaybookSource;
  hasAutomaticCheck: boolean;
  hasBuiltInDefault: boolean;
}

export interface Playbook {
  rules: PlaybookRule[];
  customRuleCount: number;
  source: PlaybookSource;
  /** The API's own sentence on which documents the playbook applies to. */
  appliesTo: string | null;
}

/** Body of `PUT /playbook/rules/{ruleId}`. The call REPLACES the workspace's
 *  rule: a field left out falls back to the built-in default for that type. */
export interface PlaybookRuleInput {
  label?: string;
  standard?: string;
  rationale?: string;
  fallback?: string;
  thresholds?: Record<string, number>;
  requiredPhrases?: string[];
  forbiddenPhrases?: string[];
  severity?: PlaybookSeverity;
}

// ── Reading API responses ───────────────────────────────────────────────────

const OUTCOME_SET: ReadonlySet<string> = new Set(["within", "deviates", "flagged", "no_rule", "unclassified"]);
const SEVERITY_SET: ReadonlySet<string> = new Set(PLAYBOOK_SEVERITIES);
const SOURCE_SET: ReadonlySet<string> = new Set(["default", "deployment", "custom"]);

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const count = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
const severity = (v: unknown): PlaybookSeverity | null =>
  typeof v === "string" && SEVERITY_SET.has(v) ? (v as PlaybookSeverity) : null;
const source = (v: unknown): PlaybookSource | null =>
  typeof v === "string" && SOURCE_SET.has(v) ? (v as PlaybookSource) : null;

/** A clause's playbook result, or null when the API sent none (a document
 *  analysed before clauses were graded) or sent an outcome this app does not
 *  know. Null is shown as "Not assessed", never as a pass. */
export function normaliseClausePlaybook(raw: unknown): ClausePlaybookResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.outcome !== "string" || !OUTCOME_SET.has(r.outcome)) return null;
  return {
    ruleId: text(r.ruleId),
    ruleName: text(r.ruleName),
    standard: text(r.standard),
    fallback: text(r.fallback),
    found: text(r.found),
    outcome: r.outcome as PlaybookOutcome,
    severity: severity(r.severity),
    reason: text(r.reason),
  };
}

/** The document-level playbook block, or null when the API sent none. */
export function normalisePlaybookSummary(raw: unknown): PlaybookSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return {
    checked: count(r.checked),
    withinCount: count(r.withinCount),
    deviationCount: count(r.deviationCount),
    reviewCount: count(r.reviewCount),
    noRuleCount: count(r.noRuleCount),
    unclassifiedCount: count(r.unclassifiedCount),
    source: source(r.source),
  };
}

/** Per-clause results keyed by clause id, from `playbook.clauseResults`. Used
 *  for a clause that does not carry its own `playbook` field. */
export function clauseResultsById(raw: unknown): Map<string, ClausePlaybookResult> {
  const out = new Map<string, ClausePlaybookResult>();
  const list = typeof raw === "object" && raw !== null ? (raw as { clauseResults?: unknown }).clauseResults : null;
  if (!Array.isArray(list)) return out;
  for (const row of list) {
    const id = typeof row === "object" && row !== null ? text((row as { clauseId?: unknown }).clauseId) : null;
    const result = normaliseClausePlaybook(row);
    if (id && result) out.set(id, result);
  }
  return out;
}

export function normaliseRule(raw: unknown): PlaybookRule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const ruleId = text(r.ruleId);
  if (!ruleId) return null;
  const isCustomType = r.isCustomType === true || ruleId.startsWith("type.");
  const thresholds: Record<string, number> = {};
  if (typeof r.thresholds === "object" && r.thresholds !== null) {
    for (const [k, v] of Object.entries(r.thresholds as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) thresholds[k] = v;
    }
  }
  return {
    ruleId,
    clauseType: text(r.clauseType) ?? (isCustomType ? ruleId.slice("type.".length) : ruleId),
    isCustomType,
    label: text(r.label) ?? ruleId,
    standard: text(r.standard) ?? "",
    rationale: text(r.rationale),
    fallback: text(r.fallback),
    thresholds,
    requiredPhrases: strings(r.requiredPhrases),
    forbiddenPhrases: strings(r.forbiddenPhrases),
    phraseSeverity: severity(r.phraseSeverity) ?? "moderate",
    source: source(r.source) ?? "default",
    hasAutomaticCheck: r.hasAutomaticCheck === true,
    hasBuiltInDefault: r.hasBuiltInDefault === true,
  };
}

export function normalisePlaybook(raw: unknown): Playbook {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const rules = (Array.isArray(r.rules) ? r.rules : []).map(normaliseRule).filter((x): x is PlaybookRule => x !== null);
  return withTotals(rules, text(r.appliesTo));
}

/** A playbook with `customRuleCount` and `source` recomputed from its rules
 *  (the same sums the API does), for use after a local change. */
export function withTotals(rules: PlaybookRule[], appliesTo: string | null): Playbook {
  const customRuleCount = rules.filter((r) => r.source === "custom").length;
  return { rules, customRuleCount, source: customRuleCount > 0 ? "custom" : "default", appliesTo };
}

// ── Wording ────────────────────────────────────────────────────────────────

export const OUTCOME_LABEL: Record<PlaybookOutcome, string> = {
  within: "Within playbook",
  deviates: "Deviates",
  flagged: "Flagged",
  no_rule: "No rule for this type",
  unclassified: "Not classified",
};

/** One sentence on what each outcome means, for legends and expanded views. */
export const OUTCOME_MEANING: Record<PlaybookOutcome, string> = {
  within: "Checked against its rule and inside the standard position.",
  deviates: "Checked against its rule and outside the standard position.",
  flagged: "A rule applies, but the check could not settle it. Compare the clause with the standard position yourself.",
  no_rule: "The playbook has no position for this clause type, so nothing was checked. This is not a pass.",
  unclassified: "The clause has no type, so no rule could be chosen. Nothing was checked.",
};

export const SEVERITY_LABEL: Record<PlaybookSeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  material: "Material",
};

export const SOURCE_LABEL: Record<PlaybookSource, string> = {
  default: "Built-in default",
  deployment: "Set for this deployment",
  custom: "Your rule",
};

type Tone = { text: string; bg: string; border: string };
const TONE: Record<"success" | "warning" | "danger" | "info" | "neutral", Tone> = {
  success: { text: "text-[var(--success)]", bg: "bg-[var(--success-soft)]", border: "border-[var(--success)]/30" },
  warning: { text: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]", border: "border-[var(--warning)]/30" },
  danger: { text: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]", border: "border-[var(--danger)]/30" },
  info: { text: "text-[var(--info)]", bg: "bg-[var(--info-soft)]", border: "border-[var(--info)]/30" },
  neutral: { text: "text-[var(--ink-600)]", bg: "bg-[var(--ink-100)]", border: "border-[var(--ink-300)]" },
};

/** Status-token classes for an outcome. A material deviation is red, other
 *  deviations amber. Always shown with the outcome's label and icon. */
export function outcomeTone(outcome: PlaybookOutcome, sev: PlaybookSeverity | null = null): Tone {
  switch (outcome) {
    case "within": return TONE.success;
    case "deviates": return sev === "material" ? TONE.danger : TONE.warning;
    case "flagged": return TONE.info;
    default: return TONE.neutral;
  }
}

const THRESHOLD_LABEL: Record<string, { label: string; unit: string }> = {
  netDays: { label: "Payment term (Net)", unit: "days" },
  capMultipleOfFees: { label: "Liability cap", unit: "x fees" },
  maxAnnualIncreasePct: { label: "Largest annual increase", unit: "%" },
  minNoticeDays: { label: "Shortest notice period", unit: "days" },
  maxOptOutDays: { label: "Longest opt-out notice", unit: "days" },
  maxSurvivalYears: { label: "Longest survival period", unit: "years" },
  maxHours: { label: "Longest notification window", unit: "hours" },
};

/** Label and unit for a threshold key. A key this app has not seen is shown as
 *  readable words with no unit. */
export function thresholdMeta(key: string): { label: string; unit: string } {
  return THRESHOLD_LABEL[key] ?? {
    label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()),
    unit: "",
  };
}

/** "Net 30 days"-style value text for a threshold. */
export function formatThreshold(key: string, value: number): string {
  const { unit } = thresholdMeta(key);
  const n = Number.isInteger(value) ? value.toLocaleString() : String(value);
  if (unit === "%") return `${n}%`;
  return unit ? `${n} ${unit}` : n;
}

// ── Grouping ───────────────────────────────────────────────────────────────

export type RuleFamily = "contract" | "data" | "licensing" | "custom" | "other";
export const RULE_FAMILIES: { id: RuleFamily; label: string; description: string }[] = [
  { id: "contract", label: "Commercial and legal terms", description: "Liability, payment, term, termination, confidentiality and IP." },
  { id: "data", label: "Data protection", description: "Breach notification, retention, residency, sub-processors and audits." },
  { id: "licensing", label: "Licensing", description: "Grant, scope, restrictions, royalties, sublicensing and open source." },
  { id: "custom", label: "Custom clause types", description: "Rules you added for clause types outside the fixed list." },
  { id: "other", label: "Other clause types", description: "Rules for clause types this version of the app does not group." },
];

const FAMILY_OF: Record<string, RuleFamily> = {
  Liability: "contract", Indemnity: "contract", Payment: "contract", Fees: "contract", Termination: "contract",
  Term: "contract", Confidentiality: "contract", IP: "contract", Warranty: "contract",
  DataProtection: "data", BreachNotification: "data", DataRetention: "data", DataResidency: "data",
  SubProcessors: "data", AuditRights: "data", DataProcessing: "data", SecurityControls: "data",
  LicenseGrant: "licensing", LicenseScope: "licensing", Restrictions: "licensing", Royalties: "licensing",
  Sublicensing: "licensing", OpenSource: "licensing", SourceCodeEscrow: "licensing",
};

export function ruleFamily(rule: Pick<PlaybookRule, "ruleId" | "isCustomType">): RuleFamily {
  if (rule.isCustomType) return "custom";
  return FAMILY_OF[rule.ruleId] ?? "other";
}

// ── Validation (the same limits the API enforces) ───────────────────────────

export const RULE_LIMITS = {
  label: 120,
  text: 600,
  phrases: 20,
  phraseLength: 120,
  thresholdMax: 100_000,
} as const;

const TYPE_KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** True for a clause-type key the API accepts in `type.<key>`. */
export function validTypeKey(key: string): boolean {
  return TYPE_KEY.test(key);
}

export function customRuleId(key: string): string {
  return `type.${key}`;
}

export type RuleField = "label" | "standard" | "rationale" | "fallback" | "thresholds" | "requiredPhrases" | "forbiddenPhrases" | "typeKey";
export type RuleErrors = Partial<Record<RuleField, string>>;

/** Check a rule before sending it. `hasBuiltInDefault` is false for a custom
 *  clause type, where the position text is required. */
export function validateRuleInput(input: PlaybookRuleInput, hasBuiltInDefault: boolean): RuleErrors {
  const errors: RuleErrors = {};
  const tooLong = (v: string | undefined, max: number) => (v ?? "").trim().length > max;
  if (tooLong(input.label, RULE_LIMITS.label)) errors.label = `Keep the name to ${RULE_LIMITS.label} characters.`;
  if (!hasBuiltInDefault && !(input.standard ?? "").trim()) errors.standard = "Write the standard position. A new rule needs one.";
  else if (tooLong(input.standard, RULE_LIMITS.text)) errors.standard = `Keep the standard position to ${RULE_LIMITS.text} characters.`;
  if (tooLong(input.rationale, RULE_LIMITS.text)) errors.rationale = `Keep the rationale to ${RULE_LIMITS.text} characters.`;
  if (tooLong(input.fallback, RULE_LIMITS.text)) errors.fallback = `Keep the fallback to ${RULE_LIMITS.text} characters.`;
  for (const field of ["requiredPhrases", "forbiddenPhrases"] as const) {
    const list = input[field] ?? [];
    if (list.length > RULE_LIMITS.phrases) errors[field] = `Use at most ${RULE_LIMITS.phrases} phrases.`;
    else if (list.some((p) => p.length > RULE_LIMITS.phraseLength)) errors[field] = `Keep each phrase to ${RULE_LIMITS.phraseLength} characters.`;
  }
  for (const [key, value] of Object.entries(input.thresholds ?? {})) {
    if (!Number.isFinite(value) || value < 0 || value > RULE_LIMITS.thresholdMax) {
      errors.thresholds = `${thresholdMeta(key).label} must be a number from 0 to ${RULE_LIMITS.thresholdMax.toLocaleString()}.`;
      break;
    }
  }
  return errors;
}

/** One phrase per line (or comma-separated) → a clean, de-duplicated list. */
export function parsePhrases(value: string): string[] {
  return [...new Set(value.split(/[\n,]/).map((p) => p.trim()).filter(Boolean))];
}

/** The API's error text for a rejected rule, attached to the field it is
 *  about when that can be told from the message; otherwise a form-level error. */
export function fieldForApiError(message: string): RuleField | null {
  const m = message.toLowerCase();
  if (m.includes("threshold")) return "thresholds";
  if (m.includes("requiredphrases") || m.includes("forbiddenphrases")) return "requiredPhrases";
  if (m.includes("standard")) return "standard";
  if (m.includes("ruleid")) return "typeKey";
  return null;
}

// ── Custom clause types found in the user's documents ───────────────────────

export interface FoundClauseType {
  key: string;
  label: string;
  /** Clauses of this type across the documents it was found in. */
  clauses: number;
  documents: number;
}

/**
 * Custom clause types (outside the fixed category list) that the analysis
 * found, gathered from each document's `clauseTypes`. Documents analysed
 * before that field existed contribute nothing. Most frequent first.
 */
export function foundCustomTypes(docs: object[]): FoundClauseType[] {
  const byKey = new Map<string, FoundClauseType>();
  for (const d of docs) {
    // Read loosely: document rows from an older API do not have the field.
    const types = (d as { clauseTypes?: unknown }).clauseTypes;
    if (!Array.isArray(types)) continue;
    for (const t of types) {
      if (typeof t !== "object" || t === null) continue;
      const row = t as Record<string, unknown>;
      const key = text(row.key);
      if (!key || row.custom !== true || !validTypeKey(key)) continue;
      const entry = byKey.get(key) ?? { key, label: text(row.label) ?? key, clauses: 0, documents: 0 };
      entry.clauses += count(row.count) ?? 0;
      entry.documents += 1;
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => b.clauses - a.clauses || a.label.localeCompare(b.label));
}
