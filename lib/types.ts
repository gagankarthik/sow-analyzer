// Processing pipeline status
export type DocStatus = "PENDING" | "PARSING" | "CLASSIFYING" | "EMBEDDING" | "GRAPHING" | "DIFFING" | "TIMELINING" | "PERSISTING" | "READY" | "FAILED"
export type DocType = "SOW" | "MSA" | "AMENDMENT" | "NDA" | "OTHER"
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
  // Analysis aggregates (written by the persist stage; present once READY)
  summary?: string
  clauseCount?: number
  highRiskCount?: number
  findingsCount?: number
  overallRisk?: RiskLevel
  riskCounts?: { low: number; medium: number; high: number; critical: number }
  // Commercial aggregates (validated; written by persist for cheap list/dashboard reads)
  contractValue?: number | null
  baseValue?: number | null
  valueDelta?: number | null
  currency?: string | null
  pricingModel?: string | null
  paymentTerms?: string | null
  reconciled?: boolean | null
  parentReference?: string | null
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
}

export interface ApiError {
  error: string
}

// ─────────────────────────────────────────────────────────────
// Shared UI domain types (relocated from the former lib/data.ts mock module).
// These describe the shapes the design-system components expect; real data is
// mapped into them from ApiDocument via apiDocToProject().
// ─────────────────────────────────────────────────────────────

/** Lifecycle stage, aliased for components that predate the Lifecycle name. */
export type Status = Lifecycle

export type RiskLevel = "low" | "medium" | "high" | "critical"
export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical"
export type Confidence = 1 | 2 | 3 | 4
export type Persona = "Legal" | "Sales" | "Finance" | "Procurement" | "PM"

export type Project = {
  id: string
  code: string
  name: string
  client: string
  clientIndustry: string
  value: number
  arr: number
  margin: number
  status: Status
  health: number // 0-100
  owner: { name: string; initials: string; role: Persona }
  team: { initials: string; name: string }[]
  signed: string | null
  starts: string
  ends: string
  renewalDate: string
  daysInStage: number
  riskScore: RiskLevel
  amendments: number
  trend: number[] // 7-pt sparkline
  region: string
  tags: string[]
}

export type Clause = {
  id: string
  number: string
  title: string
  body: string
  category:
    | "Deliverables"
    | "Milestones"
    | "Payment"
    | "SLA"
    | "IP"
    | "Termination"
    | "Liability"
    | "Confidentiality"
    | "Indemnity"
    | "Compliance"
  risk: RiskLevel
  confidence: Confidence
  aiSummary: string
  aiSuggestion?: string
  deviation?: { from: string; severity: "minor" | "moderate" | "material" }
  playbookRef?: string
}

export type AmendmentChange = {
  clauseRef: string
  type: "added" | "removed" | "modified"
  before?: string
  after?: string
}

export type Amendment = {
  id: string
  number: string // A-01
  title: string
  date: string
  by: string
  rationale: string
  status: "pending" | "approved" | "rejected" | "active"
  impact: {
    valueDelta: number
    timelineDeltaDays: number
    scopeDelta: "expanded" | "reduced" | "modified" | "clarified"
  }
  changes: AmendmentChange[]
}

// ─────────────────────────────────────────────────────────────
// Processed artefact shapes (fetched from /classification, /diff)
// ─────────────────────────────────────────────────────────────

export interface ApiClause {
  number: string
  title: string
  body: string
  category: string
  riskLevel: RiskLevel
  summary: string
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
}

export interface ApiTimeline {
  initialState: ApiTimelineState
  currentState: ApiTimelineState
  amendmentChain: ApiAmendmentChainItem[]
  futureState: ApiTimelineState | null
}

// RAG / Bluey chat
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
  impactScore: number
  impactRationale: string
}

export interface ApiDiff {
  changes: ApiDiffChange[]
  impactSummary: string
}

export type ActivityItem = {
  id: string
  ts: string
  actor: { name: string; initials: string }
  verb: string
  object: string
  kind: "edit" | "sign" | "comment" | "ai" | "approval" | "alert"
}

export type UpcomingEvent = {
  id: string
  type: "renewal" | "milestone" | "deadline" | "review" | "signature"
  title: string
  client: string
  date: string // ISO
  daysAway: number
  value?: number
  owner: string
  ownerInitials: string
  severity: "info" | "warn" | "danger" | "success" | "ai"
}
