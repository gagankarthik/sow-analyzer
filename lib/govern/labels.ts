// Plain-language wording for Govern (Requirement 5): every screen says
// "Needs attention", "Waiting on sponsor" and "Ready to sign", never a stage
// code or a risk enum. One table per concept so the words stay the same
// everywhere.

import { byEdition, editionMap } from "@/lib/edition-runtime"
import type {
  ActivityAction, AgreementType, CaptureGap, Direction, IncomeKind, NextAction, ObligationKind,
  Office, RejectReason, SlaStatus, Stage, State, Tier, WaitingOnKind,
} from "./types"

export const AGREEMENT_TYPES: AgreementType[] = [
  "license", "option", "sponsored_research", "clinical_trial", "grant", "mta", "data_use", "nda", "collaboration",
  "software", "sow", "msa", "staffing", "other",
]

export const AGREEMENT_TYPE_LABEL: Record<AgreementType, string> = {
  sponsored_research: "Sponsored research",
  clinical_trial: "Clinical trial",
  grant: "Grant or subaward",
  license: "License",
  option: "Option",
  mta: "Material transfer (MTA)",
  data_use: "Data use (DUA)",
  nda: "Confidentiality (NDA)",
  collaboration: "Collaboration",
  software: "Software or SaaS (purchase)",
  sow: "Statement of work (SOW)",
  msa: "Master services agreement (MSA)",
  staffing: "Staffing vendor agreement",
  other: "Other agreement",
}

export const DIRECTION_LABEL: Record<Direction, string> = {
  incoming: "Money in",
  outgoing: "Money out",
}

export const DIRECTION_HINT: Record<Direction, string> = editionMap({
  incoming: "Sponsor funding, licence fees and royalties paid to the organization",
  outgoing: "Subawards and vendor spend paid by the organization",
}, {
  incoming: "Rebates, credits or fees paid to the organization",
  outgoing: "Vendor fees, hourly rates and expenses paid by the organization",
})

export const OFFICES: Office[] = [
  "legal_affairs", "tech_commercialization", "sponsored_programs", "export_control", "risk_management",
  "procurement", "it_security", "accessibility",
]

export const OFFICE_LABEL: Record<Office, string> = {
  legal_affairs: "Legal Affairs",
  tech_commercialization: "Technology Commercialization",
  sponsored_programs: "Sponsored Programs",
  export_control: "Export Control",
  risk_management: "Risk Management",
  procurement: "Procurement",
  it_security: "IT Security",
  accessibility: "Digital Accessibility",
}

export const STAGES: Stage[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"]

/** The board's columns, in plain words. */
export const STAGE_LABEL: Record<Stage, string> = {
  draft: "New",
  review: "In review",
  negotiation: "With the other side",
  approval: "Approval and signature",
  signed: "Signed",
  active: "Active",
  renewal: "Up for renewal",
  expired: "Closed out",
}

export const PRE_SIGNATURE_STAGES: Stage[] = ["draft", "review", "negotiation", "approval"]

export const STATE_LABEL: Record<State, string> = {
  intake: "Just arrived",
  in_review: "Being reviewed",
  sent_back: "Sent back for changes",
  escalated: "With an internal office",
  ready_to_sign: "Ready to sign",
  out_for_signature: "Out for signature",
  signed: "Signed",
  active: "Active",
  rejected: "Rejected",
  closed: "Closed out",
}

export const WAITING_ON_LABEL: Record<WaitingOnKind, string> = editionMap({
  internal_reviewer: "Waiting on a reviewer",
  internal_office: "Waiting on an internal office",
  counterparty: "Waiting on the other side",
  pi_department: "Waiting on PI or department",
  signatory: "Waiting on signature",
  nobody: "Nothing pending",
}, {
  pi_department: "Waiting on the requesting department",
})

/** Short form for chips and table cells. */
export const WAITING_ON_SHORT: Record<WaitingOnKind, string> = editionMap({
  internal_reviewer: "Reviewer",
  internal_office: "Internal office",
  counterparty: "Other side",
  pi_department: "PI / department",
  signatory: "Signatory",
  nobody: "Nobody",
}, {
  pi_department: "Department",
})

/** Who has the ball: your organization, or someone outside your organization. */
export const WAITING_ON_SIDE: Record<WaitingOnKind, "internal" | "external" | "none"> = {
  internal_reviewer: "internal",
  internal_office: "internal",
  pi_department: "internal",
  signatory: "internal",
  counterparty: "external",
  nobody: "none",
}

export const TIERS: Tier[] = ["unacceptable", "deviates", "missing", "review", "fallback", "within"]

export const TIER_LABEL: Record<Tier, string> = {
  within: "Within matrix",
  fallback: "Acceptable fallback",
  deviates: "Needs changes",
  unacceptable: "Not acceptable",
  review: "Check by hand",
  missing: "Missing",
}

export const TIER_HINT: Record<Tier, string> = {
  within: "Matches your standard position.",
  fallback: "Not the standard, but a position you accept.",
  deviates: "Outside what you accept. Ask the other side to change it.",
  unacceptable: "A term you do not accept. Change it or reject the agreement.",
  review: "Sonar found the clause but could not decide. A reviewer should compare it.",
  missing: "The matrix expects this clause and the agreement does not have it.",
}

/** Tiers that block signature until someone acts. */
export const BLOCKING_TIERS: ReadonlySet<Tier> = new Set<Tier>(["deviates", "unacceptable", "missing"])

export const SLA_LABEL: Record<SlaStatus, string> = {
  on_track: "On time",
  amber: "Running late",
  red: "Overdue",
  none: "No target",
}

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  approve: "Approve for signature",
  send_back: "Send back for changes",
  escalate: "Escalate to an office",
  reject: "Reject",
  send_for_signature: "Send for signature",
  wait: "Nothing to do yet",
  assign: "Assign a reviewer",
  add_value: "Add the contract value",
  none: "No action needed",
}

export const REJECT_REASONS: RejectReason[] = [
  "unacceptable_terms", "sponsor_withdrew", "pi_withdrew", "duplicate", "out_of_scope", "other",
]

export const REJECT_REASON_LABEL: Record<RejectReason, string> = editionMap({
  unacceptable_terms: "Terms you cannot accept",
  sponsor_withdrew: "The sponsor or licensee withdrew",
  pi_withdrew: "The PI or department withdrew",
  duplicate: "Duplicate of another agreement",
  out_of_scope: "Not something you sign",
  other: "Another reason",
}, {
  sponsor_withdrew: "The vendor withdrew",
  pi_withdrew: "The requesting department withdrew",
})

/** Obligation kinds that belong to research and licensing (hidden from Workforce pickers). */
export const RESEARCH_OBLIGATION_KINDS: ObligationKind[] = ["sponsor_report", "royalty_report", "diligence_milestone", "publication_review"]

/** Income kinds that belong to licensing and sponsored research. */
export const RESEARCH_INCOME_KINDS: IncomeKind[] = ["royalty", "equity", "sublicense", "sponsor_funding", "subaward"]

/** Capture gaps that only research administration fills in. */
export const RESEARCH_CAPTURE_GAPS: CaptureGap[] = ["sponsor", "piName", "huronRecordId"]

export const OBLIGATION_KIND_LABEL: Record<ObligationKind, string> = {
  sponsor_report: "Sponsor report",
  milestone_payment: "Milestone payment",
  royalty_report: "Royalty report",
  diligence_milestone: "Diligence milestone",
  publication_review: "Publication review window",
  term_end: "Term ends",
  closeout: "Close-out task",
  renewal_notice: "Last day to stop renewal",
  data_return: "Get your data back",
  other: "Other obligation",
}

export const INCOME_KIND_LABEL: Record<IncomeKind, string> = {
  upfront: "Upfront fee",
  milestone: "Milestone payment",
  royalty: "Royalty",
  equity: "Equity",
  sublicense: "Sublicense income",
  sponsor_funding: "Sponsor funding",
  subaward: "Subaward",
  other: "Other",
}

export const ACTIVITY_LABEL: Record<ActivityAction, string> = editionMap({
  intake: "Arrived",
  assigned: "Assigned",
  reassigned: "Reassigned",
  approved: "Approved",
  office_approved: "Office approved",
  sent_back: "Sent back",
  escalated: "Escalated",
  rejected: "Rejected",
  comment: "Comment",
  stage_changed: "Moved",
  blocker_added: "Item added",
  blocker_closed: "Item closed",
  blocker_edited: "Item edited",
  blocker_reopened: "Item reopened",
  rescored: "Re-checked",
  signature_sent: "Sent for signature",
  signed: "Signed",
  activated: "Active",
  closed: "Closed out",
  reopened: "Reopened",
  revision_received: "New version",
  field_updated: "Details edited",
  overdue: "Past target",
  notification_sent: "Alert sent",
  sync: "Synced",
  conflict: "Record conflict",
  obligation_added: "Obligation added",
  obligation_done: "Obligation done",
  obligation_verified: "Obligation verified",
  pi_requested: "Asked the PI or department",
  pi_answered: "PI or department answered",
}, {
  pi_requested: "Asked the requesting department",
  pi_answered: "Department answered",
})

/** Display name for a person: their name, else the part of the email before @. */
/** A stage or lifecycle code in plain words ("negotiation" → "With the other side"). */
export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "—"
  return STAGE_LABEL[stage as Stage] ?? stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, " ")
}

/** A document's processing status in plain words. */
export function docStatusLabel(status: string | null | undefined): string {
  const s = String(status || "").toUpperCase()
  if (s === "READY") return "Ready"
  if (s === "FAILED") return "Couldn't be read"
  if (s === "UPLOADED" || s === "PENDING") return "Waiting to be read"
  return s ? "Sonar is reading it" : "—"
}

export function personName(p: { email: string; name: string | null } | null | undefined): string {
  if (!p) return "Unassigned"
  return p.name?.trim() || p.email.split("@")[0]
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

export function daysLabel(n: number): string {
  if (n <= 0) return "today"
  return plural(n, "day")
}

/** What is missing, in words a reviewer can act on. */
export const CAPTURE_GAP_LABEL: Record<CaptureGap, string> = editionMap({
  value: "Contract value",
  counterparty: "Other party",
  sponsor: "Sponsor or licensee",
  piName: "Principal investigator",
  department: "Department",
  requestedDate: "Date needed by",
  huronRecordId: "Huron record ID",
  workdayRef: "Workday reference",
  effectiveDate: "Start date",
  termEnd: "End date",
  agreementTypeUnsure: "Agreement type (please confirm)",
}, {
  counterparty: "Vendor",
  sponsor: "Vendor (if different)",
})


/** US states and DC: the choices for the matrix's home state. */
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
] as const

/** Offices a Workforce organization routes to (no research offices). */
export const WORKFORCE_OFFICES: Office[] = ["legal_affairs", "procurement", "risk_management", "it_security", "accessibility"]

/** The offices this edition offers in pickers. */
export function officesForEdition(): Office[] {
  return byEdition(OFFICES, WORKFORCE_OFFICES)
}
