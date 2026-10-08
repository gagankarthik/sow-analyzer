// Govern: the contract workflow, review matrix, value reporting and
// integrations. These types mirror the API contract one to one
// (sow-analyser-backend/docs/GOVERN_API.md). `null` always means "unknown",
// never zero: a contract with no value has `value: null`, not 0.

import type { DocType, Lifecycle, RiskLevel } from "@/lib/types"
import type { GovernFeature } from "./features"

export type AgreementType =
  | "sponsored_research" | "grant" | "license" | "option" | "mta" | "nda" | "collaboration" | "other"
export type Direction = "incoming" | "outgoing"
export type Stage = Lifecycle
export type State =
  | "intake" | "in_review" | "sent_back" | "escalated" | "ready_to_sign"
  | "out_for_signature" | "signed" | "active" | "rejected" | "closed"
export type WaitingOnKind = "internal_reviewer" | "internal_office" | "counterparty" | "pi_department" | "signatory" | "nobody"
export type Office = "legal_affairs" | "tech_commercialization" | "sponsored_programs" | "export_control" | "risk_management"
export type Tier = "within" | "fallback" | "deviates" | "unacceptable" | "review" | "missing"
export type SlaStatus = "on_track" | "amber" | "red" | "none"
export type RejectReason = "unacceptable_terms" | "sponsor_withdrew" | "pi_withdrew" | "duplicate" | "out_of_scope" | "other"
export type NextAction =
  | "approve" | "send_back" | "escalate" | "reject" | "send_for_signature" | "wait" | "assign" | "add_value" | "none"
export type ObligationKind =
  | "sponsor_report" | "milestone_payment" | "royalty_report" | "diligence_milestone"
  | "publication_review" | "term_end" | "closeout" | "other"
export type IncomeKind =
  | "upfront" | "milestone" | "royalty" | "equity" | "sublicense" | "sponsor_funding" | "subaward" | "other"
export type GovernRole = "admin" | "reviewer" | "leader"
export type ValueBucket = "current" | "potential" | "none"

export interface Person {
  email: string
  name: string | null
}

export interface WaitingOn {
  kind: WaitingOnKind
  /** Plain words, ready to show: "Waiting on sponsor". */
  label: string
  office: Office | null
  person: Person | null
}

export interface MatrixCounts {
  within: number
  fallback: number
  deviates: number
  unacceptable: number
  review: number
  missing: number
  beneficial: number
}

export interface Blocker {
  id: string
  text: string
  clauseType: string | null
  office: Office | null
  suggestedLanguage: string | null
  source: "sonar" | "reviewer"
  status: "open" | "closed"
  createdAt: string
  createdBy: Person | null
  closedAt: string | null
  closedBy: Person | null
}

export interface Obligation {
  id: string
  kind: ObligationKind
  title: string
  dueDate: string | null
  amount: number | null
  status: "open" | "done"
  source: "sonar" | "manual"
  completedAt: string | null
  /** Sonar-found obligations stay unverified until a person confirms them. */
  verified: boolean
  verifiedAt: string | null
  verifiedBy: Person | null
}

export interface IncomeItem {
  id: string
  kind: IncomeKind
  description: string
  amount: number | null
  pct: number | null
  expectedDate: string | null
  source: "sonar" | "manual"
}

export interface NextStepClause {
  clauseType: string
  label: string
  tier: Tier
  suggestedLanguage: string | null
}

export interface NextStep {
  action: NextAction
  /** One plain sentence: "Send back to the sponsor: 3 clauses need changes." */
  headline: string
  detail: string | null
  office: Office | null
  clauses: NextStepClause[]
}

export interface RoutingApproval {
  office: Office | "reviewer"
  by: Person
  at: string
}

export interface SyncConflict {
  field: string
  govern: unknown
  recordValue: unknown
  system: string
  at: string
}

export interface Contract {
  contractId: string
  currentDocId: string
  versionDocIds: string[]
  tenantId: string
  title: string
  docType: DocType
  agreementType: AgreementType
  direction: Direction
  counterparty: string | null
  sponsor: string | null
  piName: string | null
  department: string | null
  college: string | null
  stage: Stage
  state: State
  waitingOn: WaitingOn
  owner: Person | null
  createdAt: string
  updatedAt: string
  stageEnteredAt: string
  signedAt: string | null
  daysInStage: number
  totalDays: number
  targetDays: number | null
  slaStatus: SlaStatus
  rounds: number
  analysisStatus: string
  value: number | null
  valueSource: "manual" | "extracted" | "expected" | null
  extractedValue: number | null
  manualValue: number | null
  expectedValue: number | null
  currency: string | null
  fiscalYear: number | null
  requestedDate: string | null
  valueBucket: ValueBucket
  matrix: { version: number | null; reviewedAt: string | null; counts: MatrixCounts } | null
  overallRisk: RiskLevel | null
  openBlockers: number
  nextStep: NextStep
  huronRecordId: string | null
  workdayRef: string | null
  workdayMatch: "auto" | "manual" | "unmatched"
  syncConflicts: SyncConflict[]
  routing: { required: Office[]; approvals: RoutingApproval[]; reasons: string[] }
  rejection: { reasonCode: RejectReason; note: string | null; at: string; by: Person | null } | null
  /** Requirement 3.1: an open question to the PI or department. While set,
   *  the contract is waiting on them. */
  piRequest?: { request: string; at: string; by: Person | null } | null
  signature: {
    provider: "docusign" | "manual"
    envelopeId: string | null
    sentAt: string | null
    signedAt: string | null
    signatory: Person | null
  } | null
  obligationsDue: number
  /** Fields Govern could not capture and nobody entered. Never silently empty. */
  captureGaps: CaptureGap[]
  /** Actions valid now for this user (role-aware), decided by the server. */
  allowedActions: ContractAction["action"][]
  effectiveDate: string | null
  termEndDate: string | null
  rev: number
}

export type CaptureGap =
  | "value" | "counterparty" | "sponsor" | "piName" | "department" | "requestedDate"
  | "huronRecordId" | "workdayRef" | "effectiveDate" | "termEnd" | "agreementTypeUnsure"

export interface MatrixClauseResult {
  clauseType: string
  label: string
  clauseNumber: string | null
  clauseId: string | null
  tier: Tier
  beneficial: boolean
  beneficialReason: string | null
  reason: string | null
  found: string | null
  standard: string | null
  fallback: string | null
  escalationOffice: Office | null
  suggestedLanguage: string | null
  /** The matrix requires this clause type. */
  required: boolean
  /** The matrix routes deviations of this clause to its escalation office. */
  escalationRequired: boolean
  quote: string | null
}

export interface MatrixReview {
  docId: string
  agreementType: AgreementType
  matrixVersion: number
  matrixEffectiveDate: string | null
  reviewedAt: string
  counts: MatrixCounts
  clauses: MatrixClauseResult[]
}

export type ActivityAction =
  | "intake" | "assigned" | "reassigned" | "approved" | "office_approved" | "sent_back" | "escalated"
  | "rejected" | "comment" | "stage_changed" | "blocker_added" | "blocker_closed" | "blocker_edited"
  | "blocker_reopened" | "rescored" | "signature_sent" | "signed" | "activated" | "closed" | "reopened"
  | "revision_received" | "field_updated" | "overdue" | "notification_sent" | "sync" | "conflict"
  | "obligation_added" | "obligation_done" | "obligation_verified" | "pi_requested" | "pi_answered"

export interface ActivityEntry {
  id: string
  at: string
  /** null = Sonar or the system. */
  actor: Person | null
  action: ActivityAction
  fromStage: Stage | null
  toStage: Stage | null
  summary: string
  detail: Record<string, unknown> | null
}

export interface ContractVersion {
  docId: string
  title: string
  createdAt: string
  status: string
  round: number
  matrixCounts: MatrixCounts | null
}

export interface ContractDetail extends Contract {
  blockers: Blocker[]
  obligations: Obligation[]
  licensingIncome: IncomeItem[]
  review: MatrixReview | null
  activity: ActivityEntry[]
  versions: ContractVersion[]
}

// ── Actions ────────────────────────────────────────────────────────────────

export type ContractAction =
  | { action: "assign"; owner: Person }
  | { action: "approve"; note?: string }
  | { action: "office_approve"; office: Office; note?: string }
  | { action: "send_back"; clauses: { clauseType: string; label: string; suggestedLanguage: string | null }[]; note?: string }
  | { action: "escalate"; office: Office; note?: string }
  | { action: "reject"; reasonCode: RejectReason; note?: string }
  | { action: "send_for_signature"; provider: "docusign" | "manual"; signatory?: Person }
  | { action: "mark_signed"; signedAt?: string }
  | { action: "activate" }
  | { action: "close"; note?: string }
  | { action: "reopen"; note?: string }
  | { action: "ask_pi"; request: string; note?: string }
  | { action: "pi_answered"; note?: string }
  | { action: "comment"; text: string }

export interface ContractPatch {
  agreementType?: AgreementType
  direction?: Direction
  counterparty?: string | null
  sponsor?: string | null
  piName?: string | null
  department?: string | null
  college?: string | null
  expectedValue?: number | null
  manualValue?: number | null
  currency?: string | null
  requestedDate?: string | null
  effectiveDate?: string | null
  termEndDate?: string | null
  huronRecordId?: string | null
  workdayRef?: string | null
  workdayMatch?: "auto" | "manual" | "unmatched"
}

export interface BlockerInput {
  text?: string
  clauseType?: string | null
  office?: Office | null
  suggestedLanguage?: string | null
  status?: "open" | "closed"
}

/** An open, dated obligation with the contract it belongs to (GET /obligations). */
export interface PortfolioObligation extends Obligation {
  contractId: string
  contractTitle: string | null
  counterparty: string | null
  agreementType: AgreementType | null
  stage: Stage | null
  /** The contract's currency: an obligation's amount is in it. */
  currency: string | null
  owner: { email: string | null; name: string | null } | null
}

export interface ObligationInput {
  kind?: ObligationKind
  title?: string
  dueDate?: string | null
  amount?: number | null
  status?: "open" | "done"
  verified?: boolean
}

// ── Matrix ─────────────────────────────────────────────────────────────────

export interface MatrixClause {
  clauseType: string
  label: string
  standard: string
  fallback: string | null
  unacceptable: string[]
  beneficial: string[]
  escalationOffice: Office | null
  suggestedLanguage: string | null
  thresholds: Record<string, number>
  required: boolean
}

export interface MatrixPlaybook {
  agreementType: AgreementType
  label: string
  clauses: MatrixClause[]
}

export interface Matrix {
  version: number
  effectiveDate: string | null
  createdAt: string
  createdBy: Person | null
  note: string | null
  /** Your organization's home state (US state or DC). The governing-law check
   *  needs it; with none set, a stated law goes to "Check by hand". */
  homeState?: string | null
  playbooks: Partial<Record<AgreementType, MatrixPlaybook>>
}

export interface MatrixVersionInfo {
  version: number
  effectiveDate: string | null
  createdAt: string
  createdBy: Person | null
  note: string | null
  clauseCount: number
}

export interface MatrixImportRow {
  clauseType: string
  standard: string
  fallback?: string
  unacceptable?: string
  escalationOffice?: string
  beneficial?: string
  suggestedLanguage?: string
}

export interface MatrixImportResult {
  matrix: Matrix
  imported: number
  skipped: { row: number; reason: string }[]
}

// ── Workflow settings ──────────────────────────────────────────────────────

export interface Reviewer {
  email: string
  name: string
  offices: Office[]
  agreementTypes: AgreementType[]
}

export interface AssignmentRule {
  id: string
  agreementType: AgreementType | "*"
  department: string
  reviewer: Person
}

export interface RoutingRule {
  id: string
  name: string
  enabled: boolean
  when: {
    agreementTypes?: AgreementType[]
    minValue?: number
    anyUnacceptable?: boolean
    minRisk?: "high" | "critical"
    direction?: Direction
  }
  route: Office[]
}

export type NotificationEvent = "assigned" | "sent_back" | "approved" | "overdue" | "escalated"

/** The organization, set during organization setup. */
export interface OrganizationSettings {
  name: string | null
  /** ISO 4217 code, e.g. "USD". */
  defaultCurrency: string
  /** 1 = January. */
  fiscalYearStartMonth: number
  /** Setup steps an admin confirmed by hand. */
  confirmedSteps: ("matrix" | "workflow")[]
  setupCompletedAt: string | null
  /** Requirement 7: the edition this customer sees; null = deployment default. */
  edition?: "campus" | "workforce" | null
}

export interface WorkflowSettings {
  organization: OrganizationSettings
  stageTargetDays: Partial<Record<Stage, number | null>>
  redAfterMultiple: number
  reviewers: Reviewer[]
  assignmentRules: AssignmentRule[]
  routingRules: RoutingRule[]
  notifications: { email: boolean; teams: boolean; events: Record<NotificationEvent, boolean> }
  teamsWebhookConfigured: boolean
}

/** PUT body: any subset of the settings (the API merges it over what is saved)
 *  plus the write-only Teams webhook URL. */
export type WorkflowSettingsInput = Partial<Omit<WorkflowSettings, "teamsWebhookConfigured" | "organization">> & {
  teamsWebhookUrl?: string
  organization?: Partial<OrganizationSettings>
}

// ── Integrations ───────────────────────────────────────────────────────────

export type ConnectorId = "huron" | "workday" | "m365" | "docusign"

export interface Connector {
  id: ConnectorId
  name: string
  enabled: boolean
  status: "not_connected" | "connected" | "error"
  direction: "in" | "out" | "both"
  lastSyncAt: string | null
  lastError: string | null
  credentialsConfigured: boolean
  config: Record<string, string>
  fieldMapping: Record<string, string>
  ownsFields: string[]
}

export interface ConnectorInput {
  enabled?: boolean
  config?: Record<string, string>
  fieldMapping?: Record<string, string>
  /** Write-only: stored in Secrets Manager, never returned. */
  credentials?: Record<string, string>
}

export interface SyncRun {
  id: string
  connectorId: ConnectorId
  startedAt: string
  finishedAt: string | null
  trigger: "manual" | "schedule" | "event"
  dryRun: boolean
  recordsIn: number
  recordsOut: number
  errors: { record: string; message: string }[]
  status: "ok" | "partial" | "failed" | "dry_run"
}

export interface GovernMe {
  email: string
  name: string | null
  role: GovernRole
  tenantId: string
  /** Which "Later" features this deploy has switched on (see lib/govern/features.ts). Absent on older APIs. */
  features?: Partial<Record<GovernFeature, boolean>>
}

// ── Trends and capture (write-time aggregates) ─────────────────────────────

export type MoneyByCurrency = Record<string, number>

export interface TrendPeriod {
  period: string
  start: string
  end: string
  received: number
  signed: number
  rejected: number
  sentBack: number
  escalated: number
  overdueEvents: number
  revisions: number
  signedValue: MoneyByCurrency
  receivedValue: MoneyByCurrency
  avgCycleDays: number | null
  avgDaysByStage: Partial<Record<Stage, number | null>>
  avgRounds: number | null
  onTimePct: number | null
}

export interface Trends {
  granularity: "month" | "week"
  generatedAt: string
  periods: TrendPeriod[]
  byAgreementType: Partial<Record<AgreementType, { received: number; signed: number; avgCycleDays: number | null }>>
  clauseDeviations: { clauseType: string; label: string; total: number; byPeriod: Record<string, number> }[]
  officeLoad: { office: Office; escalations: number; avgDaysToApprove: number | null }[]
}

export interface CaptureReport {
  gaps: { gap: CaptureGap; count: number; contractIds: string[] }[]
  missedDocuments: { docId: string; title: string; status: string; reason: string }[]
  lastReconciledAt: string | null
}
