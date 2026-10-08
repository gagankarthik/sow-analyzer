import type { KeyDate } from "./key-dates"
import type { ClausePlaybookResult, PlaybookSummary } from "./playbook"

// Processing pipeline status
export type DocStatus = "PENDING" | "PARSING" | "CLASSIFYING" | "EMBEDDING" | "GRAPHING" | "DIFFING" | "TIMELINING" | "PERSISTING" | "READY" | "FAILED"
export type DocType = "SOW" | "MSA" | "AMENDMENT" | "NDA" | "LICENSE" | "DPA" | "BAA" | "COMPLIANCE" | "OTHER"
export type Lifecycle = "draft" | "review" | "negotiation" | "approval" | "signed" | "active" | "renewal" | "expired"

// Raw API response shapes (what the backend actually returns)
export interface ApiDocument {
  docId: string
  tenantId: string
  title: string
  docType: DocType
  lifecycle: Lifecycle
  status: DocStatus
  parties: string[]
  effectiveDate: string | null
  parentDocId: string | null
  rawKey: string
  processedPrefix: string
  structuralHash: string
  checksum: string
  latestVersion: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  // Access (set by the API on every document it returns).
  /** What the signed-in user may do with this document: `owner` if they
   *  uploaded it, else their role in a project that lists it. */
  role?: ProjectRole
  /** Email of the person who uploaded it, when the server recorded one. */
  ownerEmail?: string | null
  /** The projects this document is filed in that the signed-in user can see. */
  projectIds?: string[]
  // Analysis aggregates (written by the persist stage; present once READY).
  // null = the analysis did not measure it. It is never a stand-in for 0 / "low".
  summary?: string
  clauseCount?: number
  highRiskCount?: number | null
  findingsCount?: number | null
  overallRisk?: RiskLevel | null
  /** Clauses per assessed level; `unrated` counts clauses with no risk level. */
  riskCounts?: { low: number; medium: number; high: number; critical: number; unrated?: number }
  // Commercial aggregates (validated; written by persist for cheap list/dashboard reads)
  contractValue?: number | null
  baseValue?: number | null
  valueDelta?: number | null
  currency?: string | null
  pricingModel?: string | null
  paymentTerms?: string | null
  reconciled?: boolean | null
  parentReference?: string | null
  // Term / renewal dates (written by persist; power the obligations & renewals view)
  termEndDate?: string | null
  renewalDate?: string | null
  /** null = the analysis could not tell whether the term renews by itself. */
  autoRenews?: boolean | null
  renewalNoticeDays?: number | null
  // Compliance-pack coverage aggregates (written by persist when packs are enabled)
  complianceCoveragePct?: number | null
  complianceGaps?: number | null
  complianceFrameworks?: string[]
}

export interface ApiVersion {
  versionNumber: number
  extractionMethod: string
  createdAt: string
  parsedKey: string
  classificationKey: string
  timelineKey: string | null
  diffKey: string | null
}

export interface ApiDocumentDetail {
  document: ApiDocument
  versions: ApiVersion[]
}

export interface ApiUploadUrl {
  uploadUrl: string
  key: string
  docId: string
  /** The project the upload was filed in by the server, if one was asked for. */
  projectId?: string | null
}

/** Body of every non-2xx API response. */
export interface ApiError {
  error: string
  /** Machine-readable reason: "forbidden", "unauthenticated", "not_found", … */
  code?: string
}

// ── Access model (enforced by the API; see the backend's shared/access.py) ──

/** A person's role on a project, and through it on the project's documents. */
export type ProjectRole = "owner" | "editor" | "viewer"

export interface ProjectMember {
  email: string
  role: ProjectRole
  /** `invited` until that person has opened the app with this email address. */
  status: "invited" | "active"
  sub?: string | null
  invitedAt?: string
}

export interface StoredProject {
  id: string
  name: string
  client?: string | null
  createdAt: string
  updatedAt?: string | null
  docIds: string[]
  /** Email of the project's owner, when the server recorded one. */
  ownerEmail?: string | null
  /** The signed-in user's role on this project, as decided by the server. */
  role: ProjectRole
  /** Everyone on the project. The owner is listed with role `owner`. */
  members: ProjectMember[]
}

// ─────────────────────────────────────────────────────────────
// Shared value types used across API shapes and UI.
// (The old mock `Project` / `Clause` / `Amendment` shapes — with invented
// fields such as health, margin, ARR, owner and trend — were removed: nothing
// in the API provides them, so nothing may render them.)
// ─────────────────────────────────────────────────────────────

/** Lifecycle stage, aliased for components that predate the Lifecycle name. */
export type Status = Lifecycle

export type RiskLevel = "low" | "medium" | "high" | "critical"
export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical"

// ─────────────────────────────────────────────────────────────
// Processed artefact shapes (fetched from /classification, /diff)
// ─────────────────────────────────────────────────────────────

export interface ApiClause {
  number: string
  title: string
  body: string
  /** Category key as sent by the backend. Any string is valid — not only the
   *  known enum values — and "" means the API sent no category. */
  category: string
  riskLevel: RiskLevel
  /** False when the API sent no risk level for this clause. `riskLevel` is then
   *  only a placeholder ("low") kept for older call sites and must not be shown
   *  or counted as an assessed "low". */
  riskRated?: boolean
  summary: string
  /** Optional finer-grained clause type, preferred over `category` for display
   *  when the API provides it. */
  specificType?: string | null
  customType?: string | null
  // ── Fields added by the newer analysis. All optional: a document analyzed
  // before they existed simply does not have them (shown as "not assessed" /
  // left out, never filled in).
  /** Stable id within the document ("c007"); what key dates and playbook
   *  results point at. */
  id?: string | null
  /** Normalised key of the clause type ("non-solicitation"). */
  specificTypeKey?: string | null
  /** True when the type is outside the fixed category list. */
  typeIsCustom?: boolean
  /** The analysis flagged this clause for a person to check. */
  needsReview?: boolean
  /** "unclassified" = the analysis could not type this clause. */
  classificationStatus?: "classified" | "unclassified" | "pending" | null
  /** Heading(s) this clause sits under. */
  section?: string | null
  /** Number of the clause this one is nested under ("7" for "7.1"). */
  parent?: string | null
  /** Page the clause starts on, when the file has pages. */
  page?: number | null
  /** Lettered / deeper-numbered items inside the clause body. */
  subclauses?: ApiSubclause[]
  /** Playbook grading of this clause; null = not graded (older analysis). */
  playbook?: ClausePlaybookResult | null
}

/** An item inside a clause ("7.1(b)"), addressed by offsets into its body. */
export interface ApiSubclause {
  ref: string
  label: string
  start: number
  end: number
}

/** The analysis's own report on how complete it is. */
export interface ApiExtractionReport {
  /** Share of the document's text accounted for by its clauses, 0 to 1. */
  coverageRatio: number | null
  unclassifiedCount: number | null
}

export interface ApiKeyFinding {
  label: string
  detail: string
  severity: FindingSeverity
}

// ── Structured contract anatomy (extracted by the classify stage) ──────────

export interface ApiSignatory { party: string | null; name: string | null; title: string | null; date: string | null }
export interface ApiIdentification {
  sowNumber: string | null
  parentReference: string | null
  projectName: string | null
  clientName: string | null
  vendorName: string | null
  signatureStatus: "signed" | "unsigned" | "unknown"
  executionDate: string | null
  signatories: ApiSignatory[]
}

export interface ApiScope {
  inScope: string[]
  outOfScope: string[]
  assumptions: string[]
  dependencies: string[]
}

export interface ApiDeliverable {
  name: string
  description: string | null
  dueDate: string | null
  acceptanceCriteria: string | null
  owner: string | null
  value: number | null
}

export interface ApiPhase { name: string; start: string | null; end: string | null }
export interface ApiMilestone { name: string; date: string | null; payment: number | null; source: string | null }
export interface ApiTimelineDetail {
  startDate: string | null
  endDate: string | null
  phases: ApiPhase[]
  milestones: ApiMilestone[]
}

export type PricingModel = "fixed" | "time_and_materials" | "milestone" | "retainer" | "mixed" | "unknown"
export interface ApiRateCardItem { role: string; rate: number | null; unit: string | null }
export interface ApiPaymentScheduleItem { label: string; percent: number | null; amount: number | null; trigger: string | null }
export interface ApiCommercials {
  currency: string | null
  pricingModel: PricingModel
  totalContractValue: number | null
  baseValue: number | null
  caps: number | null
  paymentTerms: string | null
  expenses: string | null
  latePayment: string | null
  valueSource: string | null
  rateCard: ApiRateCardItem[]
  paymentSchedule: ApiPaymentScheduleItem[]
}

export interface ApiSla { metric: string; target: string | null; window: string | null; penalty: string | null }
export interface ApiPersonnel { name: string | null; role: string; keyPerson: boolean }
export interface ApiGovernance { cadence: string | null; escalationPath: string | null; reporting: string | null }

export type AmendmentType = "amendment" | "change_order" | "addendum" | "side_letter" | "none"
export type ChangeType = "replacement" | "addition" | "deletion" | "modification"
export type ChangeCategory = "scope" | "value" | "timeline" | "payment" | "personnel" | "term" | "sla" | "other"
export interface ApiChange {
  changeType: ChangeType
  category: ChangeCategory
  targetSection: string | null
  before: string | null
  after: string | null
  summary: string
}
export interface ApiAmendmentInfo {
  number: string | null
  amendmentType: AmendmentType
  parentReference: string | null
  recitals: string | null
  valueDelta: number | null
  newTotalValue: number | null
  everythingElseStays: boolean
  changes: ApiChange[]
}

export interface ApiConfidence {
  parentFound: boolean
  scopeClear: boolean
  financialsClear: boolean
  overall: "high" | "medium" | "low"
  issues: string[]
}

export interface ApiLineItem { label: string; amount: number | null; source: string }
export interface ApiValidation {
  validated: boolean
  reconciled: boolean | null
  lineItems: ApiLineItem[]
  issues: string[]
  confidence: "high" | "medium" | "low"
}

export interface ApiClassification {
  docType: string
  title: string
  parties: string[]
  effectiveDate: string | null
  lifecycle: string
  summary: string
  keyFindings: ApiKeyFinding[]
  clauses: ApiClause[]
  structuralHash: string
  // Structured anatomy (present for documents analyzed by the new extractor;
  // optional so documents processed before it never crash the UI)
  identification?: ApiIdentification
  scope?: ApiScope
  deliverables?: ApiDeliverable[]
  timelineDetail?: ApiTimelineDetail
  commercials?: ApiCommercials
  slas?: ApiSla[]
  personnel?: ApiPersonnel[]
  governance?: ApiGovernance
  amendment?: ApiAmendmentInfo
  confidence?: ApiConfidence
  validation?: ApiValidation
  // ── Added by the newer analysis; undefined for documents analyzed before it.
  /** Every dated event / obligation in the document (the full list). Undefined
   *  = analyzed before key dates existed; [] = analyzed, none found. */
  keyDates?: KeyDate[]
  /** Document-level playbook counts; undefined = clauses were not graded. */
  playbook?: PlaybookSummary
  /** The analysis says a person should check this document. */
  needsReview?: boolean
  /** Why, in the analysis's own sentences. */
  reviewReasons?: string[]
  extraction?: ApiExtractionReport
}

// Timeline / amendment-replay shapes (fetched from /timeline)
export interface ApiTimelineClause {
  number: string
  title: string
  body: string
  category: string
}

export type ApiTimelineState = Record<string, ApiTimelineClause>

export interface ApiAmendmentChainItem {
  docId: string
  docType: string | null
  lifecycle: string | null
  effectiveDate: string | null
  title: string | null
  /** Signed change in contract value (negative = a reduction); null when the
   *  amendment does not change the value or it is not known. Absent on
   *  timelines built before the field existed. */
  valueDelta?: number | null
  /** Whether the amendment's lifecycle stage counts as in force. */
  inForce?: boolean
}

export interface ApiTimeline {
  initialState: ApiTimelineState
  currentState: ApiTimelineState
  amendmentChain: ApiAmendmentChainItem[]
  futureState: ApiTimelineState | null
}

// RAG / Sonar chat
export interface ChatCitation {
  clauseNumber: string
  docId: string
  category: string
}

export interface ChatResponse {
  answer: string
  citations: ChatCitation[]
}

export interface ApiDiffChange {
  changeId: string
  clauseNumber: string
  field: string
  before: string
  after: string
  /** 0–100 as scored by the backend; null when the API sent no score. */
  impactScore: number | null
  impactRationale: string
}

export interface ApiDiff {
  changes: ApiDiffChange[]
  impactSummary: string
}
