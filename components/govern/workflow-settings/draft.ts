// The workflow settings being edited: a plain copy of the API object without
// the read-only `teamsWebhookConfigured` flag. The page stages the whole thing
// locally and sends it in one PUT. Validation and the routing sentence live
// here so the sections only render.

import { AGREEMENT_TYPES, OFFICE_LABEL, STAGES } from "@/lib/govern/labels"
import type {
  AgreementType, AssignmentRule, NotificationEvent, Office, Reviewer, RoutingRule, Stage, WorkflowSettings,
} from "@/lib/govern/types"

export type SettingsDraft = Omit<WorkflowSettings, "teamsWebhookConfigured" | "organization">

export function toDraft(s: WorkflowSettings): SettingsDraft {
  return {
    stageTargetDays: Object.fromEntries(STAGES.map((st) => [st, s.stageTargetDays?.[st] ?? null])) as Record<Stage, number | null>,
    redAfterMultiple: s.redAfterMultiple ?? 2,
    reviewers: (s.reviewers ?? []).map((r) => ({ ...r, offices: [...(r.offices ?? [])], agreementTypes: [...(r.agreementTypes ?? [])] })),
    assignmentRules: (s.assignmentRules ?? []).map((r) => ({ ...r, reviewer: { ...r.reviewer } })),
    routingRules: (s.routingRules ?? []).map((r) => ({ ...r, when: { ...r.when }, route: [...(r.route ?? [])] })),
    notifications: {
      email: s.notifications?.email ?? false,
      teams: s.notifications?.teams ?? false,
      events: {
        assigned: s.notifications?.events?.assigned ?? false,
        sent_back: s.notifications?.events?.sent_back ?? false,
        approved: s.notifications?.events?.approved ?? false,
        overdue: s.notifications?.events?.overdue ?? false,
        escalated: s.notifications?.events?.escalated ?? false,
      },
    },
  }
}

export function newId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

export const NOTIFICATION_EVENTS: NotificationEvent[] = ["assigned", "sent_back", "approved", "overdue", "escalated"]

export const NOTIFICATION_EVENT_LABEL: Record<NotificationEvent, { title: string; hint: string }> = {
  assigned: { title: "A contract is assigned", hint: "The new owner hears it is theirs." },
  sent_back: { title: "A contract is sent back for changes", hint: "The owner hears the other side has it." },
  approved: { title: "A contract is approved", hint: "The owner hears it is ready to sign." },
  overdue: { title: "A contract passes its target", hint: "The owner hears when a stage runs past its target days." },
  escalated: { title: "A contract is escalated to an office", hint: "The office's reviewers hear it is waiting on them." },
}

// ── Validation ─────────────────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validEmail(email: string): boolean {
  return EMAIL.test(email.trim())
}

export function stageTargetError(v: number | null): string | null {
  if (v === null) return null
  if (!Number.isFinite(v) || !Number.isInteger(v)) return "Use whole days."
  if (v < 1 || v > 365) return "Use a number from 1 to 365 days."
  return null
}

export function multipleError(v: number): string | null {
  if (!Number.isFinite(v)) return "Enter a number, such as 2."
  if (v <= 1 || v > 10) return "Use a number above 1 and up to 10."
  return null
}

export function reviewerErrors(r: Reviewer, all: Reviewer[], index: number): { name?: string; email?: string } {
  const out: { name?: string; email?: string } = {}
  if (!r.name.trim()) out.name = "Enter the reviewer's name."
  if (!validEmail(r.email)) out.email = "Enter an email address like name@example.org."
  else if (all.some((o, i) => i !== index && o.email.trim().toLowerCase() === r.email.trim().toLowerCase()))
    out.email = "Someone in the directory already has this email."
  return out
}

export function assignmentError(rule: AssignmentRule, reviewers: Reviewer[]): string | null {
  if (!rule.reviewer.email) return "Choose a reviewer."
  if (!reviewers.some((r) => r.email.toLowerCase() === rule.reviewer.email.toLowerCase()))
    return "This reviewer is no longer in the directory. Choose another."
  if (!rule.department.trim()) return "Enter a department, or * for any department."
  return null
}

export function routingErrors(rule: RoutingRule): { name?: string; route?: string; minValue?: string } {
  const out: { name?: string; route?: string; minValue?: string } = {}
  if (!rule.name.trim()) out.name = "Give the rule a short name."
  if (rule.route.length === 0) out.route = "Choose at least one office to route to."
  const v = rule.when.minValue
  if (v !== undefined && (!Number.isFinite(v) || v < 0)) out.minValue = "Use an amount of 0 or more."
  return out
}

/** Count of problems that block saving. */
export function countProblems(d: SettingsDraft, webhook: string): number {
  let n = 0
  for (const st of STAGES) if (stageTargetError(d.stageTargetDays[st] ?? null)) n++
  if (multipleError(d.redAfterMultiple)) n++
  d.reviewers.forEach((r, i) => { n += Object.keys(reviewerErrors(r, d.reviewers, i)).length })
  d.assignmentRules.forEach((r) => { if (assignmentError(r, d.reviewers)) n++ })
  d.routingRules.forEach((r) => { n += Object.keys(routingErrors(r)).length })
  if (webhookError(webhook)) n++
  return n
}

export function webhookError(url: string): string | null {
  const t = url.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== "https:") return "The webhook address must start with https://."
    return null
  } catch {
    return "This doesn't look like a web address. Paste the full URL Teams gave you."
  }
}

// ── Plain-English routing sentence ─────────────────────────────────────────

const TYPE_NOUN: Record<AgreementType, string> = {
  license: "license",
  option: "option",
  sponsored_research: "sponsored research agreement",
  clinical_trial: "clinical trial agreement",
  grant: "grant or subaward",
  mta: "material transfer agreement",
  data_use: "data use agreement",
  nda: "NDA",
  collaboration: "collaboration agreement",
  software: "software or SaaS purchase",
  sow: "statement of work",
  msa: "master services agreement",
  staffing: "staffing vendor agreement",
  subcontract: "subcontractor addendum",
  consortium: "consortium agreement",
  other: "other agreement",
}

export function joinWords(words: string[], last = "and"): string {
  if (words.length <= 1) return words.join("")
  if (words.length === 2) return `${words[0]} ${last} ${words[1]}`
  return `${words.slice(0, -1).join(", ")} ${last} ${words[words.length - 1]}`
}

export function formatMoneyIn(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`
  }
}

/**
 * "Any license worth $500,000 or more, or with a term you do not accept,
 * goes to Legal Affairs before signature."
 *
 * Agreement types and money direction narrow which contracts the rule looks
 * at; value, an unacceptable term and risk each trigger it on their own.
 */
/** `currency` is the organization's default currency, which value thresholds are set in. */
export function routingSentence(rule: RoutingRule, currency = "USD"): string {
  const w = rule.when
  const types = (w.agreementTypes ?? []).filter((t) => AGREEMENT_TYPES.includes(t))
  let subject = types.length === 0 ? "agreement" : joinWords(types.map((t) => TYPE_NOUN[t]), "or")
  if (w.direction === "incoming") subject += " that brings money in"
  if (w.direction === "outgoing") subject += " that pays money out"

  const triggers: string[] = []
  if (w.minValue !== undefined && Number.isFinite(w.minValue)) triggers.push(`worth ${formatMoneyIn(w.minValue, currency)} or more`)
  if (w.anyUnacceptable) triggers.push("with a term you do not accept")
  if (w.minRisk === "high") triggers.push("rated high risk or worse")
  if (w.minRisk === "critical") triggers.push("rated critical risk")

  const offices = rule.route.length ? joinWords(rule.route.map((o: Office) => OFFICE_LABEL[o])) : "no office yet"
  const lead = triggers.length === 0 ? `Every ${subject}` : `Any ${subject} ${joinWords(triggers, "or")}`
  // Commas around the "or" list read better once there are two triggers.
  const text = triggers.length > 1
    ? `Any ${subject} ${triggers[0]}, ${triggers.slice(1).map((t) => `or ${t}`).join(", ")},`
    : lead
  return `${text} goes to ${offices} before signature.`
}
