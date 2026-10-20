// The Contracts filter builder's rules, as data: a field, an operator and a
// value. Evaluation is pure (no clock, no React), so a saved view filters the
// same way on every screen and in tests. A rule that is not finished yet (no
// value picked) is ignored rather than matching nothing, so the table does not
// empty itself while someone is still building a filter.
//
// Dates compare by calendar day in UTC ("2026-10-20"), which is how the API
// stores term-end and requested dates.

import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, STAGES, STAGE_LABEL, STATE_LABEL } from "./labels"
import { VIEW_LIMITS, type Contract, type FilterGroup, type FilterMatch, type FilterRule, type State } from "./types"

export type FieldType = "text" | "enum" | "number" | "date" | "bool"

export type FilterOp =
  | "contains" | "is" | "is_not" | "is_empty" | "is_not_empty"
  | "any_of" | "none_of"
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "before" | "after" | "within_next_days"
  | "is_true" | "is_false"

export type FilterFieldId =
  | "stage" | "state" | "agreementType" | "owner" | "counterparty" | "department" | "value" | "risk"
  | "daysInStage" | "slaStatus" | "openBlockers" | "termEndDate" | "requestedDate" | "hasValue"

export interface FilterOption { value: string; label: string }

type Getter = (c: Contract) => string | number | boolean | null

export interface FilterField {
  id: FilterFieldId
  label: string
  type: FieldType
  get: Getter
  /** Choices for enum fields. */
  options?: FilterOption[]
}

export const OPERATORS: Record<FieldType, { op: FilterOp; label: string }[]> = {
  text: [
    { op: "contains", label: "contains" },
    { op: "is", label: "is" },
    { op: "is_not", label: "is not" },
    { op: "is_empty", label: "is empty" },
    { op: "is_not_empty", label: "is not empty" },
  ],
  enum: [
    { op: "any_of", label: "is any of" },
    { op: "none_of", label: "is none of" },
  ],
  number: [
    { op: "eq", label: "=" },
    { op: "neq", label: "≠" },
    { op: "gt", label: ">" },
    { op: "gte", label: "≥" },
    { op: "lt", label: "<" },
    { op: "lte", label: "≤" },
    { op: "is_empty", label: "is empty" },
  ],
  date: [
    { op: "before", label: "is before" },
    { op: "after", label: "is after" },
    { op: "within_next_days", label: "is within the next" },
    { op: "is_empty", label: "is empty" },
  ],
  bool: [
    { op: "is_true", label: "is true" },
    { op: "is_false", label: "is false" },
  ],
}

/** Operators that need no value. */
const NO_VALUE: ReadonlySet<FilterOp> = new Set(["is_empty", "is_not_empty", "is_true", "is_false"])

const RISK_OPTIONS: FilterOption[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "Not assessed" },
]

const SLA_OPTIONS: FilterOption[] = [
  { value: "on_track", label: "On track" },
  { value: "amber", label: "Due soon" },
  { value: "red", label: "Overdue" },
  { value: "none", label: "No target" },
]

const lower = (s: string | null | undefined) => (s ? s.toLowerCase() : null)

export const FILTER_FIELDS: FilterField[] = [
  { id: "stage", label: "Stage", type: "enum", get: (c) => c.stage, options: STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] })) },
  {
    id: "state", label: "State", type: "enum", get: (c) => c.state,
    options: (Object.keys(STATE_LABEL) as State[]).map((s) => ({ value: s, label: STATE_LABEL[s] })),
  },
  {
    id: "agreementType", label: "Agreement type", type: "enum", get: (c) => c.agreementType,
    options: AGREEMENT_TYPES.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] })),
  },
  { id: "owner", label: "Owner (email)", type: "text", get: (c) => lower(c.owner?.email) },
  { id: "counterparty", label: "Counterparty", type: "text", get: (c) => lower(c.counterparty || c.sponsor) },
  { id: "department", label: "Department", type: "text", get: (c) => lower(c.department) },
  { id: "value", label: "Value", type: "number", get: (c) => c.value },
  { id: "risk", label: "Risk level", type: "enum", get: (c) => c.overallRisk ?? "none", options: RISK_OPTIONS },
  { id: "daysInStage", label: "Days in stage", type: "number", get: (c) => c.daysInStage },
  { id: "slaStatus", label: "SLA status", type: "enum", get: (c) => c.slaStatus, options: SLA_OPTIONS },
  { id: "openBlockers", label: "Open blockers", type: "number", get: (c) => c.openBlockers },
  { id: "termEndDate", label: "Term end date", type: "date", get: (c) => c.termEndDate },
  { id: "requestedDate", label: "Requested date", type: "date", get: (c) => c.requestedDate },
  { id: "hasValue", label: "Has value", type: "bool", get: (c) => c.value !== null },
]

const FIELD_BY_ID = new Map<string, FilterField>(FILTER_FIELDS.map((f) => [f.id, f]))

export function fieldById(id: string): FilterField | undefined {
  return FIELD_BY_ID.get(id)
}

export function operatorsFor(field: FilterField): { op: FilterOp; label: string }[] {
  return OPERATORS[field.type]
}

export function needsValue(op: string): boolean {
  return !NO_VALUE.has(op as FilterOp)
}

/** The empty value an operator starts with. */
export function emptyValueFor(type: FieldType, op: string): unknown {
  if (!needsValue(op)) return null
  if (type === "enum") return []
  if (type === "number" || op === "within_next_days") return null
  return ""
}

/** A new rule for a field: its first operator and an empty value. */
export function newRule(fieldId: FilterFieldId): FilterRule {
  const field = FIELD_BY_ID.get(fieldId)!
  const op = OPERATORS[field.type][0].op
  return { field: fieldId, op, value: emptyValueFor(field.type, op) }
}

/** The rule with another operator; the value carries over when it still fits. */
export function withOperator(rule: FilterRule, op: FilterOp): FilterRule {
  const field = FIELD_BY_ID.get(rule.field)
  if (!field) return { ...rule, op }
  const before = valueKind(field.type, rule.op)
  const after = valueKind(field.type, op)
  return { ...rule, op, value: before === after ? rule.value : emptyValueFor(field.type, op) }
}

function valueKind(type: FieldType, op: string): string {
  if (!needsValue(op)) return "none"
  if (op === "within_next_days") return "days"
  return type
}

/* ─── Value parsing ──────────────────────────────────────────────── */

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const DAY_RE = /^(\d{4}-\d{2}-\d{2})/

/** "2026-10-20" from an ISO date or timestamp, or null. */
function dayKey(v: unknown): string | null {
  if (typeof v !== "string") return null
  const m = DAY_RE.exec(v)
  if (!m) return null
  return Number.isNaN(Date.parse(m[1])) ? null : m[1]
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function textValue(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim().toLowerCase() : null
}

function listValue(v: unknown): string[] | null {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string") ? (v as string[]) : null
}

/** A rule the evaluator can apply: a known field, an operator of its type,
 *  and a usable value. Unfinished rules are skipped, never matched. */
export function isRuleComplete(rule: FilterRule): boolean {
  const field = FIELD_BY_ID.get(rule.field)
  if (!field) return false
  if (!OPERATORS[field.type].some((o) => o.op === rule.op)) return false
  if (!needsValue(rule.op)) return true
  if (rule.op === "within_next_days") {
    const n = toNumber(rule.value)
    return n !== null && n >= 0
  }
  switch (field.type) {
    case "text": return textValue(rule.value) !== null
    case "enum": return listValue(rule.value) !== null
    case "number": return toNumber(rule.value) !== null
    case "date": return dayKey(rule.value) !== null
    default: return false
  }
}

/* ─── Evaluation ─────────────────────────────────────────────────── */

const DAY_MS = 86_400_000

/** Does one complete rule hold for the contract? `now` is epoch ms. */
export function ruleMatches(c: Contract, rule: FilterRule, now: number): boolean {
  const field = FIELD_BY_ID.get(rule.field)
  if (!field) return true
  const raw = field.get(c)
  const op = rule.op as FilterOp

  switch (field.type) {
    case "text": {
      const s = typeof raw === "string" ? raw.toLowerCase() : null
      if (op === "is_empty") return !s
      if (op === "is_not_empty") return !!s
      const v = textValue(rule.value)!
      if (op === "contains") return !!s && s.includes(v)
      if (op === "is") return s === v
      if (op === "is_not") return s !== v
      return true
    }
    case "enum": {
      const list = listValue(rule.value)!
      const hit = typeof raw === "string" && list.includes(raw)
      return op === "none_of" ? !hit : hit
    }
    case "number": {
      const n = typeof raw === "number" && Number.isFinite(raw) ? raw : null
      if (op === "is_empty") return n === null
      const v = toNumber(rule.value)!
      if (op === "neq") return n !== v
      if (n === null) return false
      if (op === "eq") return n === v
      if (op === "gt") return n > v
      if (op === "gte") return n >= v
      if (op === "lt") return n < v
      if (op === "lte") return n <= v
      return true
    }
    case "date": {
      const d = dayKey(raw)
      if (op === "is_empty") return d === null
      if (d === null) return false
      if (op === "within_next_days") {
        const days = toNumber(rule.value)!
        return d >= utcDay(now) && d <= utcDay(now + days * DAY_MS)
      }
      const v = dayKey(rule.value)!
      if (op === "before") return d < v
      if (op === "after") return d > v
      return true
    }
    case "bool":
      return op === "is_true" ? raw === true : raw !== true
  }
}

/** Does the contract pass the group? Only complete rules count; none → passes. */
export function matchesFilters(c: Contract, group: FilterGroup, now: number): boolean {
  const rules = group.rules.filter(isRuleComplete)
  if (rules.length === 0) return true
  return group.match === "any"
    ? rules.some((r) => ruleMatches(c, r, now))
    : rules.every((r) => ruleMatches(c, r, now))
}

export function applyFilters(rows: Contract[], group: FilterGroup, now: number): Contract[] {
  const rules = group.rules.filter(isRuleComplete)
  if (rules.length === 0) return rows
  const g = { ...group, rules }
  return rows.filter((c) => matchesFilters(c, g, now))
}

export function countActiveRules(group: FilterGroup): number {
  return group.rules.filter(isRuleComplete).length
}

export const EMPTY_FILTERS: FilterGroup = { match: "all", rules: [] }

/** A filter group from untrusted JSON (a saved view): bad rules are dropped,
 *  at most 25 kept. */
export function parseFilterGroup(raw: unknown): FilterGroup {
  if (!raw || typeof raw !== "object") return EMPTY_FILTERS
  const r = raw as { match?: unknown; rules?: unknown }
  const match: FilterMatch = r.match === "any" ? "any" : "all"
  const rules = Array.isArray(r.rules)
    ? r.rules
        .filter((x): x is FilterRule => !!x && typeof x === "object" && typeof (x as FilterRule).field === "string" && typeof (x as FilterRule).op === "string")
        .filter((x) => FIELD_BY_ID.has(x.field))
        .slice(0, VIEW_LIMITS.rules)
        .map((x) => ({ field: x.field, op: x.op, value: (x as FilterRule).value ?? null }))
    : []
  return { match, rules }
}

/* ─── Quick filters ──────────────────────────────────────────────── */
// The toolbar's segmented filters ("Stage │ Any ▾") are shortcuts for one
// rule each: "is any of" for a choice field, "is" for a text field. They
// read and write that rule in the same group the builder edits.

const quickOp = (fieldId: FilterFieldId): FilterOp => (FIELD_BY_ID.get(fieldId)?.type === "enum" ? "any_of" : "is")

/** The quick filter's values for a field ([] = any). */
export function quickValues(group: FilterGroup, fieldId: FilterFieldId): string[] {
  const op = quickOp(fieldId)
  const r = group.rules.find((x) => x.field === fieldId && x.op === op && isRuleComplete(x))
  if (!r) return []
  return Array.isArray(r.value) ? (r.value as string[]) : typeof r.value === "string" ? [r.value.toLowerCase()] : []
}

/** The group with the field's quick rule replaced (values [] removes it). */
export function setQuickValues(group: FilterGroup, fieldId: FilterFieldId, values: string[]): FilterGroup {
  const op = quickOp(fieldId)
  const at = group.rules.findIndex((x) => x.field === fieldId && x.op === op)
  const rules = group.rules.filter((x, i) => i !== at)
  if (values.length === 0) return { ...group, rules }
  const rule: FilterRule = { field: fieldId, op, value: op === "any_of" ? values : values[0] }
  rules.splice(at < 0 ? rules.length : at, 0, rule)
  return { ...group, rules }
}
