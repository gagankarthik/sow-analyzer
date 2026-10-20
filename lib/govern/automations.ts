// Automations (Settings → Automations): the words a rule reads as, the
// builder's draft model and its checks, and the starter templates. Pure, so
// the table, the builder and the tests share one source.
//
// A rule: WHEN a trigger happens, ONLY IF every condition holds, THEN the
// actions run (docs/GOVERN_API.md "Automations" in the backend repo).

import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, OFFICE_LABEL, STAGE_LABEL, plural } from "./labels"
import {
  AUTOMATION_LIMITS,
  type AgreementType, type AutomationAction, type AutomationActionType, type AutomationCondition,
  type AutomationConditionField, type AutomationInput, type AutomationTrigger, type AutomationTriggerType,
  type Direction, type Office, type Stage,
} from "./types"

// ── Vocabulary ─────────────────────────────────────────────────────────────

export const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; group: "time" | "event" }[] = [
  { value: "in_stage_for", label: "A contract stays in a stage", group: "time" },
  { value: "obligation_due_in", label: "An obligation is coming due", group: "time" },
  { value: "term_ends_in", label: "A term is ending", group: "time" },
  { value: "contract_received", label: "A contract arrives", group: "event" },
  { value: "stage_changed", label: "A contract changes stage", group: "event" },
  { value: "sent_back", label: "A contract is sent back", group: "event" },
  { value: "blocker_added", label: "An open item is found", group: "event" },
  { value: "signed", label: "A contract is signed", group: "event" },
]

export const TIME_TRIGGERS: ReadonlySet<AutomationTriggerType> = new Set(["in_stage_for", "obligation_due_in", "term_ends_in"])

export const CONDITION_OPTIONS: { value: AutomationConditionField; label: string }[] = [
  { value: "agreementType", label: "Agreement type" },
  { value: "direction", label: "Money direction" },
  { value: "value", label: "Value" },
  { value: "department", label: "Department" },
  { value: "owner", label: "Owner" },
  { value: "counterparty", label: "Counterparty" },
]

export const ACTION_OPTIONS: { value: AutomationActionType; label: string }[] = [
  { value: "notify", label: "Notify" },
  { value: "escalate", label: "Escalate to an office" },
  { value: "assign", label: "Assign an owner" },
  { value: "comment", label: "Add a comment" },
]

export const PLACEHOLDERS = ["contract", "stage", "days", "due", "owner", "counterparty", "rule"] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${n.toLocaleString("en-US")} ${currency}`
  }
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} or ${items[1]}`
  return `${items[0]}, ${items[1]} or ${items.length - 2} more`
}

// ── Summaries (plain words) ───────────────────────────────────────────────

/** "In review for 10 days or more", "Term ends within 30 days", "Signed". */
export function triggerSummary(t: AutomationTrigger): string {
  switch (t.type) {
    case "in_stage_for":
      return `${STAGE_LABEL[t.stage] ?? t.stage} for ${plural(t.days, "day")} or more`
    case "obligation_due_in":
      return t.days === 0 ? "Obligation due today" : `Obligation due within ${plural(t.days, "day")}`
    case "term_ends_in":
      return t.days === 0 ? "Term ends today" : `Term ends within ${plural(t.days, "day")}`
    case "contract_received":
      return "Contract arrives"
    case "stage_changed":
      return t.to ? `Moves to ${STAGE_LABEL[t.to] ?? t.to}` : "Changes stage"
    case "sent_back":
      return "Sent back"
    case "blocker_added":
      return t.tier === "unacceptable" ? "Unacceptable clause found" : t.tier === "deviates" ? "Deviating clause found" : "Open item added"
    case "signed":
      return "Signed"
  }
}

/** "Type is License or Option", "Value at least $500,000", "No owner". */
export function conditionSummary(c: AutomationCondition, currency = "USD"): string {
  switch (c.field) {
    case "agreementType":
      return `Type is ${listWords(c.value.map((t) => AGREEMENT_TYPE_LABEL[t] ?? t))}`
    case "direction":
      return DIRECTION_LABEL[c.value] ?? c.value
    case "value":
      return `Value ${c.op === "gte" ? "at least" : "at most"} ${money(c.value, currency)}`
    case "department":
      return `Department is ${c.value}`
    case "owner":
      return c.op === "set" ? "Has an owner" : "No owner"
    case "counterparty":
      return `Counterparty contains “${c.value}”`
  }
}

/** "Notify the owner", "Escalate to Legal Affairs", "Assign by the rules". */
export function actionSummary(a: AutomationAction): string {
  switch (a.type) {
    case "notify":
      if (a.to === "owner") return "Notify the owner"
      if (a.to === "office") return `Notify ${OFFICE_LABEL[a.office] ?? a.office}`
      return a.emails.length === 1 ? `Notify ${a.emails[0]}` : `Notify ${plural(a.emails.length, "person", "people")}`
    case "escalate":
      return `Escalate to ${OFFICE_LABEL[a.office] ?? a.office}`
    case "assign":
      return a.owner ? `Assign to ${a.owner.name?.trim() || a.owner.email}` : "Assign by the rules"
    case "comment":
      return "Add a comment"
  }
}

export function actionsSummary(actions: AutomationAction[]): string {
  return actions.map(actionSummary).join(" · ")
}

/** The whole rule as one sentence (builder header, delete confirmation). */
export function ruleSentence(rule: Pick<AutomationInput, "trigger" | "conditions" | "actions">, currency = "USD"): string {
  const when = triggerSummary(rule.trigger)
  const only = rule.conditions.length ? ` (${rule.conditions.map((c) => conditionSummary(c, currency).toLowerCase()).join(", ")})` : ""
  const then = rule.actions.map(actionSummary).map((s, i) => (i === 0 ? s : s.toLowerCase())).join(", then ")
  return `${when}${only}: ${then}.`
}

// ── Builder draft ─────────────────────────────────────────────────────────

/** Loose, editable form of a rule: every field of every type kept, so
 *  switching a select back and forth never loses what was typed. */
export interface TriggerDraft {
  type: AutomationTriggerType
  stage: Stage
  days: number | null
  to: Stage | null
  tier: "unacceptable" | "deviates" | null
}

export interface ConditionDraft {
  field: AutomationConditionField
  /** gte / lte for value; set / unset for owner; fixed for the rest. */
  op: string
  types: AgreementType[]
  direction: Direction
  amount: number | null
  text: string
}

export interface ActionDraft {
  type: AutomationActionType
  to: "owner" | "office" | "emails"
  office: Office
  /** Comma or space separated. */
  emails: string
  message: string
  /** Blank = the assignment rules pick. */
  ownerEmail: string
  ownerName: string
  text: string
}

export interface RuleDraft {
  name: string
  enabled: boolean
  trigger: TriggerDraft
  conditions: ConditionDraft[]
  actions: ActionDraft[]
}

const DEFAULT_OP: Record<AutomationConditionField, string> = {
  agreementType: "in", direction: "is", value: "gte", department: "is", owner: "set", counterparty: "contains",
}

export function newCondition(field: AutomationConditionField = "agreementType"): ConditionDraft {
  return { field, op: DEFAULT_OP[field], types: [], direction: "incoming", amount: null, text: "" }
}

export function newAction(type: AutomationActionType = "notify"): ActionDraft {
  return { type, to: "owner", office: "legal_affairs", emails: "", message: "", ownerEmail: "", ownerName: "", text: "" }
}

export function emptyDraft(): RuleDraft {
  return {
    name: "",
    enabled: true,
    trigger: { type: "in_stage_for", stage: "review", days: 10, to: null, tier: null },
    conditions: [],
    actions: [newAction("notify")],
  }
}

export function toDraft(rule: AutomationInput): RuleDraft {
  const t = rule.trigger
  const trigger: TriggerDraft = { type: t.type, stage: "review", days: 10, to: null, tier: null }
  if (t.type === "in_stage_for") Object.assign(trigger, { stage: t.stage, days: t.days })
  if (t.type === "obligation_due_in" || t.type === "term_ends_in") trigger.days = t.days
  if (t.type === "stage_changed") trigger.to = t.to ?? null
  if (t.type === "blocker_added") trigger.tier = t.tier ?? null
  return {
    name: rule.name,
    enabled: rule.enabled,
    trigger,
    conditions: rule.conditions.map((c) => {
      const d = newCondition(c.field)
      d.op = c.op
      if (c.field === "agreementType") d.types = [...c.value]
      if (c.field === "direction") d.direction = c.value
      if (c.field === "value") d.amount = c.value
      if (c.field === "department" || c.field === "counterparty") d.text = c.value
      return d
    }),
    actions: rule.actions.map((a) => {
      const d = newAction(a.type)
      if (a.type === "notify") {
        d.to = a.to
        d.message = a.message ?? ""
        if (a.to === "office") d.office = a.office
        if (a.to === "emails") d.emails = a.emails.join(", ")
      }
      if (a.type === "escalate") d.office = a.office
      if (a.type === "assign" && a.owner) {
        d.ownerEmail = a.owner.email
        d.ownerName = a.owner.name ?? ""
      }
      if (a.type === "comment") d.text = a.text
      return d
    }),
  }
}

export function splitEmails(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))]
}

function triggerFrom(t: TriggerDraft): AutomationTrigger {
  const days = Math.round(t.days ?? 0)
  switch (t.type) {
    case "in_stage_for":
      return { type: "in_stage_for", stage: t.stage, days }
    case "obligation_due_in":
    case "term_ends_in":
      return { type: t.type, days }
    case "stage_changed":
      return t.to ? { type: "stage_changed", to: t.to } : { type: "stage_changed" }
    case "blocker_added":
      return t.tier ? { type: "blocker_added", tier: t.tier } : { type: "blocker_added" }
    default:
      return { type: t.type }
  }
}

function conditionFrom(c: ConditionDraft): AutomationCondition {
  switch (c.field) {
    case "agreementType":
      return { field: "agreementType", op: "in", value: c.types }
    case "direction":
      return { field: "direction", op: "is", value: c.direction }
    case "value":
      return { field: "value", op: c.op === "lte" ? "lte" : "gte", value: c.amount ?? 0 }
    case "department":
      return { field: "department", op: "is", value: c.text.trim() }
    case "owner":
      return { field: "owner", op: c.op === "unset" ? "unset" : "set" }
    case "counterparty":
      return { field: "counterparty", op: "contains", value: c.text.trim() }
  }
}

function actionFrom(a: ActionDraft): AutomationAction {
  const message = a.message.trim() ? { message: a.message.trim() } : {}
  switch (a.type) {
    case "notify":
      if (a.to === "office") return { type: "notify", to: "office", office: a.office, ...message }
      if (a.to === "emails") return { type: "notify", to: "emails", emails: splitEmails(a.emails), ...message }
      return { type: "notify", to: "owner", ...message }
    case "escalate":
      return { type: "escalate", office: a.office }
    case "assign":
      return a.ownerEmail.trim()
        ? { type: "assign", owner: { email: a.ownerEmail.trim().toLowerCase(), name: a.ownerName.trim() || null } }
        : { type: "assign" }
    case "comment":
      return { type: "comment", text: a.text.trim() }
  }
}

/** The API body for a draft (run `validateDraft` first). */
export function fromDraft(d: RuleDraft): AutomationInput {
  return {
    name: d.name.trim(),
    enabled: d.enabled,
    trigger: triggerFrom(d.trigger),
    conditions: d.conditions.map(conditionFrom),
    actions: d.actions.map(actionFrom),
  }
}

// ── Checks (the same rules the API enforces, in words) ────────────────────

export interface DraftErrors {
  name?: string
  trigger?: string
  conditions: (string | undefined)[]
  actions: (string | undefined)[]
  count: number
}

function placeholderProblem(text: string): string | undefined {
  const known = new Set<string>(PLACEHOLDERS)
  const bad = [...text.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).find((p) => !known.has(p))
  return bad === undefined ? undefined : `{${bad}} is not a placeholder. Use ${PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}.`
}

function daysProblem(days: number | null, min: number): string | undefined {
  if (days === null || !Number.isFinite(days)) return "Enter a number of days."
  if (!Number.isInteger(days)) return "Use whole days."
  if (days < min || days > AUTOMATION_LIMITS.days) return `Use ${min} to ${AUTOMATION_LIMITS.days} days.`
  return undefined
}

export function validateDraft(d: RuleDraft): DraftErrors {
  const out: DraftErrors = { conditions: [], actions: [], count: 0 }
  const name = d.name.trim()
  if (!name) out.name = "Name the rule."
  else if (name.length > AUTOMATION_LIMITS.name) out.name = `Keep the name under ${AUTOMATION_LIMITS.name} characters.`

  const t = d.trigger
  if (t.type === "in_stage_for") out.trigger = daysProblem(t.days, 1)
  if (t.type === "obligation_due_in" || t.type === "term_ends_in") out.trigger = daysProblem(t.days, 0)

  out.conditions = d.conditions.map((c) => {
    if (c.field === "agreementType" && c.types.length === 0) return "Pick at least one agreement type."
    if (c.field === "value" && (c.amount === null || !Number.isFinite(c.amount) || c.amount < 0)) return "Enter an amount of 0 or more."
    if ((c.field === "department" || c.field === "counterparty") && !c.text.trim()) return "Enter some text to match."
    if ((c.field === "department" || c.field === "counterparty") && c.text.trim().length > 200) return "Keep it under 200 characters."
    return undefined
  })
  if (d.conditions.length > AUTOMATION_LIMITS.conditions) out.conditions.push(`At most ${AUTOMATION_LIMITS.conditions} conditions.`)

  out.actions = d.actions.map((a) => {
    if (a.type === "notify") {
      if (a.to === "emails") {
        const emails = splitEmails(a.emails)
        if (emails.length === 0) return "Enter at least one email address."
        if (emails.length > AUTOMATION_LIMITS.emails) return `At most ${AUTOMATION_LIMITS.emails} addresses.`
        const bad = emails.find((e) => !EMAIL_RE.test(e))
        if (bad) return `${bad} is not an email address.`
      }
      if (a.message.trim().length > AUTOMATION_LIMITS.message) return `Keep the message under ${AUTOMATION_LIMITS.message} characters.`
      return placeholderProblem(a.message)
    }
    if (a.type === "assign" && a.ownerEmail.trim() && !EMAIL_RE.test(a.ownerEmail.trim())) return "Enter a valid email, or leave it blank to use the rules."
    if (a.type === "comment") {
      if (!a.text.trim()) return "Write the comment."
      if (a.text.trim().length > AUTOMATION_LIMITS.comment) return `Keep the comment under ${AUTOMATION_LIMITS.comment} characters.`
      return placeholderProblem(a.text)
    }
    return undefined
  })
  if (d.actions.length === 0) out.actions.push("Add at least one action.")
  if (d.actions.length > AUTOMATION_LIMITS.actions) out.actions.push(`At most ${AUTOMATION_LIMITS.actions} actions.`)

  out.count = [out.name, out.trigger, ...out.conditions, ...out.actions].filter(Boolean).length
  return out
}

// ── Starter templates (offered while the list is empty) ───────────────────

export const STARTER_TEMPLATES: { id: string; input: AutomationInput }[] = [
  {
    id: "stuck-in-review",
    input: {
      name: "Escalate contracts stuck in review for 10 days",
      enabled: true,
      trigger: { type: "in_stage_for", stage: "review", days: 10 },
      conditions: [],
      actions: [
        { type: "escalate", office: "legal_affairs" },
        { type: "notify", to: "owner", message: "{contract} has been in review for {days} days and is now with Legal Affairs." },
      ],
    },
  },
  {
    id: "term-ending",
    input: {
      name: "Tell the owner 30 days before a term ends",
      enabled: true,
      trigger: { type: "term_ends_in", days: 30 },
      conditions: [{ field: "owner", op: "set" }],
      actions: [{ type: "notify", to: "owner", message: "The term of {contract} ends on {due}. Decide whether to renew." }],
    },
  },
  {
    id: "unacceptable-clause",
    input: {
      name: "Notify Legal when an unacceptable clause is found",
      enabled: true,
      trigger: { type: "blocker_added", tier: "unacceptable" },
      conditions: [],
      actions: [{ type: "notify", to: "office", office: "legal_affairs", message: "Sonar found an unacceptable clause in {contract}." }],
    },
  },
]
