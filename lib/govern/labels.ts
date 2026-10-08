// Plain-language wording for Govern (Requirement 5): every screen says
// "Needs attention", "Waiting on sponsor" and "Ready to sign", never a stage
// code or a risk enum. One table per concept so the words stay the same
// everywhere.

import type {
  ActivityAction, AgreementType, CaptureGap, Direction, IncomeKind, NextAction, ObligationKind,
  Office, RejectReason, SlaStatus, Stage, State, Tier, WaitingOnKind,
} from "./types"

export const AGREEMENT_TYPES: AgreementType[] = [
  "license", "option", "sponsored_research", "grant", "mta", "nda", "collaboration", "other",
]

export const AGREEMENT_TYPE_LABEL: Record<AgreementType, string> = {
  sponsored_research: "Sponsored research",
  grant: "Grant or subaward",
  license: "License",
  option: "Option",
  mta: "Material transfer (MTA)",
  nda: "Confidentiality (NDA)",
  collaboration: "Collaboration",
  other: "Other agreement",
}

export const DIRECTION_LABEL: Record<Direction, string> = {
  incoming: "Money in",
  outgoing: "Money out",
}

export const DIRECTION_HINT: Record<Direction, string> = {
  incoming: "Sponsor funding, licence fees and royalties paid to the university",
  outgoing: "Subawards and vendor spend paid by the university",
}

export const OFFICES: Office[] = [
  "legal_affairs", "tech_commercialization", "sponsored_programs", "export_control", "risk_management",
]

export const OFFICE_LABEL: Record<Office, string> = {
  legal_affairs: "Legal Affairs",
  tech_commercialization: "Technology Commercialization",
  sponsored_programs: "Sponsored Programs",
  export_control: "Export Control",
  risk_management: "Risk Management",
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
  escalated: "With an OSU office",
  ready_to_sign: "Ready to sign",
  out_for_signature: "Out for signature",
  signed: "Signed",
  active: "Active",
  rejected: "Rejected",
  closed: "Closed out",
}

export const WAITING_ON_LABEL: Record<WaitingOnKind, string> = {
  osu_reviewer: "Waiting on OSU reviewer",
  osu_office: "Waiting on an OSU office",
  counterparty: "Waiting on the other side",
  pi_department: "Waiting on PI or department",
  signatory: "Waiting on signature",
  nobody: "Nothing pending",
}

/** Short form for chips and table cells. */
export const WAITING_ON_SHORT: Record<WaitingOnKind, string> = {
  osu_reviewer: "OSU reviewer",
  osu_office: "OSU office",
  counterparty: "Other side",
  pi_department: "PI / department",
  signatory: "Signatory",
  nobody: "Nobody",
}

/** Who has the ball: OSU, or someone outside OSU. */
export const WAITING_ON_SIDE: Record<WaitingOnKind, "osu" | "external" | "none"> = {
  osu_reviewer: "osu",
  osu_office: "osu",
  pi_department: "osu",
  signatory: "osu",
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
  within: "Matches OSU's standard position.",
  fallback: "Not the standard, but a position OSU accepts.",
  deviates: "Outside what OSU accepts. Ask the other side to change it.",
  unacceptable: "A term OSU does not accept. Change it or reject the agreement.",
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

export const REJECT_REASON_LABEL: Record<RejectReason, string> = {
  unacceptable_terms: "Terms OSU cannot accept",
  sponsor_withdrew: "The sponsor or licensee withdrew",
  pi_withdrew: "The PI or department withdrew",
  duplicate: "Duplicate of another agreement",
  out_of_scope: "Not something OSU signs",
  other: "Another reason",
}

export const OBLIGATION_KIND_LABEL: Record<ObligationKind, string> = {
  sponsor_report: "Sponsor report",
  milestone_payment: "Milestone payment",
  royalty_report: "Royalty report",
  diligence_milestone: "Diligence milestone",
  publication_review: "Publication review window",
  term_end: "Term ends",
  closeout: "Close-out task",
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

export const ACTIVITY_LABEL: Record<ActivityAction, string> = {
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
  pi_requested: "Asked the PI or department",
  pi_answered: "PI or department answered",
}

/** Display name for a person: their name, else the part of the email before @. */
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
export const CAPTURE_GAP_LABEL: Record<CaptureGap, string> = {
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
}
