// Sample workspace for the dev-only /showcase screens (marketing screenshots).
// Every party is fictional: the six OSU-style sample agreements from
// sow-analyser-backend/samples/osu, plus generic agreements so the board and
// reports look like a working office. Nothing here is real customer data.

import { WAITING_ON_LABEL } from "../labels"
import type {
  ActivityEntry, Blocker, Contract, ContractDetail, GovernMe, IncomeItem, Matrix, MatrixClauseResult,
  MatrixCounts, MatrixVersionInfo, NextStep, Office, Person, SlaStatus, Stage, TrendPeriod, Trends,
  WaitingOnKind, WorkflowSettings,
} from "../types"
import { NO_COUNTS, makeContract } from "./contract"

/** The screenshots are dated to this moment so "days in stage" reads the same every time. */
export const SHOWCASE_NOW = "2026-10-08T14:00:00Z"
const NOW_MS = Date.parse(SHOWCASE_NOW)
const DAY_MS = 86_400_000

const daysAgo = (days: number) => new Date(NOW_MS - days * DAY_MS).toISOString()
const daysAhead = (days: number) => new Date(NOW_MS + days * DAY_MS).toISOString().slice(0, 10)

const STAGE_TARGET_DAYS: Partial<Record<Stage, number | null>> = {
  draft: 3, review: 10, negotiation: 21, approval: 5, signed: null, active: null, renewal: 30, expired: null,
}
const RED_AFTER_MULTIPLE = 2

function slaFor(stage: Stage, daysInStage: number): SlaStatus {
  const target = STAGE_TARGET_DAYS[stage]
  if (!target) return "none"
  if (daysInStage <= target) return "on_track"
  return daysInStage <= target * RED_AFTER_MULTIPLE ? "amber" : "red"
}

// ── People ─────────────────────────────────────────────────────────────────

const person = (name: string, email: string): Person => ({ name, email })
const REVIEWER_JORDAN = person("Jordan Ellis", "jordan.ellis@example.edu")
const REVIEWER_MAYA = person("Maya Brooks", "maya.brooks@example.edu")
const REVIEWER_SAM = person("Sam Whitaker", "sam.whitaker@example.edu")
const SIGNATORY = person("Associate Vice President, Research", "signatory@example.edu")

export const SHOWCASE_ME: GovernMe = { email: REVIEWER_JORDAN.email, name: REVIEWER_JORDAN.name, role: "leader", tenantId: "showcase" }

function waiting(kind: WaitingOnKind, office: Office | null = null, who: Person | null = null): Contract["waitingOn"] {
  return { kind, label: WAITING_ON_LABEL[kind], office, person: who }
}

const counts = (c: Partial<MatrixCounts>): MatrixCounts => ({ ...NO_COUNTS, ...c })

function step(action: NextStep["action"], headline: string, extra: Partial<NextStep> = {}): NextStep {
  return { action, headline, detail: null, office: null, clauses: [], ...extra }
}

// ── Contracts ──────────────────────────────────────────────────────────────

interface Sample extends Partial<Contract> {
  contractId: string
  stage: Stage
  daysInStage: number
}

/** A sample contract with its clock, value bucket and matrix filled in consistently. */
function sample(s: Sample): Contract {
  const signed = s.stage === "signed" || s.stage === "active" || s.stage === "renewal"
  const value = s.value === undefined ? null : s.value
  return makeContract({
    tenantId: "showcase",
    createdAt: daysAgo((s.totalDays ?? s.daysInStage) + 1),
    updatedAt: daysAgo(Math.min(s.daysInStage, 2)),
    stageEnteredAt: daysAgo(s.daysInStage),
    totalDays: s.daysInStage,
    targetDays: STAGE_TARGET_DAYS[s.stage] ?? null,
    slaStatus: slaFor(s.stage, s.daysInStage),
    valueBucket: value === null ? "none" : signed ? "current" : "potential",
    valueSource: value === null ? null : "extracted",
    extractedValue: value,
    fiscalYear: 2027,
    matrix: { version: 3, reviewedAt: daysAgo(s.daysInStage), counts: s.matrix?.counts ?? counts({ within: 10 }) },
    allowedActions: ["comment", "assign"],
    ...s,
    value,
  })
}

export const FEATURED_CONTRACT_ID = "agr-00012345"

const LICENSE_SEND_BACK_CLAUSES: NextStep["clauses"] = [
  { clauseType: "LicenseScope", label: "License grant scope", tier: "deviates", suggestedLanguage: "University grants Licensee an exclusive licence under the Licensed Patents, in the Field of Use and the Territory … University reserves the right to practise the Licensed Patents for research, teaching and educational purposes." },
  { clauseType: "Royalties", label: "Royalties and sublicense income", tier: "deviates", suggestedLanguage: "Licensee shall pay University a running royalty of three and one-half percent (3.5%) of Net Sales and twenty-five percent (25%) of all Sublicense Income." },
  { clauseType: "GoverningLaw", label: "Governing law and sovereign immunity", tier: "unacceptable", suggestedLanguage: "This Agreement is governed by the laws of the State of Ohio. Nothing in this Agreement waives the University's sovereign immunity." },
]

export const SHOWCASE_CONTRACTS: Contract[] = [
  // ── The six sample agreements ──
  sample({
    contractId: FEATURED_CONTRACT_ID, title: "Exclusive license: Wearable lactate biosensor",
    docType: "LICENSE", agreementType: "license", direction: "incoming",
    counterparty: "Buckeye BioSensors, Inc.", sponsor: null, piName: "Dr. Elena Vasquez",
    department: "Biomedical Engineering", college: "College of Engineering",
    stage: "review", state: "in_review", daysInStage: 12, totalDays: 20,
    waitingOn: waiting("osu_reviewer", null, REVIEWER_JORDAN), owner: REVIEWER_JORDAN,
    value: 525_000, overallRisk: "high", openBlockers: 3,
    matrix: { version: 3, reviewedAt: daysAgo(12), counts: counts({ within: 8, fallback: 1, deviates: 2, unacceptable: 1, beneficial: 3 }) },
    nextStep: step("send_back", "Send back to Buckeye BioSensors: 3 clauses need changes.", {
      detail: "Governing law is not acceptable and goes to Legal Affairs if the licensee will not change it.",
      office: "legal_affairs", clauses: LICENSE_SEND_BACK_CLAUSES,
    }),
    huronRecordId: "AGR00012345", workdayRef: "WD-CC-104233", workdayMatch: "auto",
    routing: { required: ["legal_affairs"], approvals: [], reasons: ["A clause is not acceptable under the matrix."] },
    requestedDate: daysAhead(14), effectiveDate: "2026-10-01",
    allowedActions: ["send_back", "escalate", "reject", "comment", "assign"],
  }),
  sample({
    contractId: "agr-00012388", title: "Exclusive option: Adaptive gripper control",
    docType: "LICENSE", agreementType: "option", direction: "incoming",
    counterparty: "Scioto Robotics LLC", piName: "Dr. James Okafor",
    department: "Mechanical and Aerospace Engineering", college: "College of Engineering",
    stage: "approval", state: "ready_to_sign", daysInStage: 2, totalDays: 9,
    waitingOn: waiting("signatory", null, SIGNATORY), owner: REVIEWER_MAYA,
    value: 40_000, overallRisk: "low",
    matrix: { version: 3, reviewedAt: daysAgo(9), counts: counts({ within: 9, fallback: 1 }) },
    nextStep: step("send_for_signature", "Ready to sign. Send it for signature."),
    huronRecordId: "AGR00012388", workdayRef: "WD-CC-104291", workdayMatch: "auto",
    allowedActions: ["send_for_signature", "comment"],
  }),
  sample({
    contractId: "agr-00012402", title: "Sponsored research: Ceramic matrix composites",
    docType: "OTHER", agreementType: "sponsored_research", direction: "incoming",
    counterparty: "Midwest Advanced Materials Corp.", sponsor: "Midwest Advanced Materials Corp.",
    piName: "Dr. Priya Raman", department: "Materials Science & Engineering", college: "College of Engineering",
    stage: "review", state: "escalated", daysInStage: 16, totalDays: 23,
    waitingOn: waiting("osu_office", "legal_affairs"), owner: REVIEWER_SAM,
    value: 425_000, overallRisk: "high", openBlockers: 2,
    matrix: { version: 3, reviewedAt: daysAgo(16), counts: counts({ within: 7, fallback: 1, deviates: 1, unacceptable: 1 }) },
    nextStep: step("escalate", "With Legal Affairs: the university indemnifying the sponsor is not acceptable.", { office: "legal_affairs" }),
    huronRecordId: "AGR00012402", workdayRef: "WD-GR-220871", workdayMatch: "auto",
    routing: { required: ["legal_affairs"], approvals: [], reasons: ["A clause is not acceptable under the matrix."] },
  }),
  sample({
    contractId: "agr-00012417", title: "Incoming MTA: Engineered T-cell line",
    docType: "OTHER", agreementType: "mta", direction: "incoming",
    counterparty: "Great Lakes Cell Therapeutics, Inc.", piName: "Dr. Hannah Lee",
    department: "Microbial Infection and Immunity", college: "College of Medicine",
    stage: "review", state: "in_review", daysInStage: 3, totalDays: 3,
    waitingOn: waiting("osu_reviewer", null, REVIEWER_MAYA), owner: REVIEWER_MAYA,
    overallRisk: "low",
    matrix: { version: 3, reviewedAt: daysAgo(3), counts: counts({ within: 6, fallback: 2 }) },
    nextStep: step("approve", "Approve for signature: two accepted fallbacks, nothing blocking."),
    huronRecordId: "AGR00012417", workdayRef: "WD-NF-000318", workdayMatch: "auto",
    allowedActions: ["approve", "comment"],
  }),
  sample({
    contractId: "agr-00012433", title: "Mutual NDA: Silicon photonic sensors",
    docType: "NDA", agreementType: "nda", direction: "incoming",
    counterparty: "Lumen Photonics, Inc.", piName: "Dr. Marco Bianchi",
    department: "Electrical and Computer Engineering", college: "College of Engineering",
    stage: "negotiation", state: "sent_back", daysInStage: 6, totalDays: 11, rounds: 1,
    waitingOn: waiting("counterparty"), owner: REVIEWER_JORDAN,
    overallRisk: "medium", openBlockers: 1,
    matrix: { version: 3, reviewedAt: daysAgo(11), counts: counts({ within: 7, deviates: 1 }) },
    nextStep: step("wait", "Waiting on Lumen Photonics for a revised draft."),
    huronRecordId: "AGR00012433", workdayRef: "WD-NF-000327", workdayMatch: "auto",
  }),
  sample({
    contractId: "agr-00012451", title: "Federal subaward: Resilient autonomous sensing",
    docType: "OTHER", agreementType: "grant", direction: "outgoing",
    counterparty: "Lakeshore State University Research Foundation", sponsor: "U.S. Army Research Office",
    piName: "Dr. Kevin Mueller", department: "Computer Science and Engineering", college: "College of Engineering",
    stage: "review", state: "escalated", daysInStage: 23, totalDays: 27,
    waitingOn: waiting("osu_office", "export_control"), owner: REVIEWER_SAM,
    value: 180_000, overallRisk: "critical", openBlockers: 1,
    matrix: { version: 3, reviewedAt: daysAgo(23), counts: counts({ within: 6, unacceptable: 1 }) },
    nextStep: step("escalate", "With Export Control: the foreign-national restriction needs clearance.", { office: "export_control" }),
    huronRecordId: "AGR00012451", workdayRef: "WD-GR-220904", workdayMatch: "auto",
    routing: { required: ["export_control"], approvals: [], reasons: ["Export control terms need clearance."] },
  }),

  // ── Generic sample agreements that fill the board ──
  sample({
    contractId: "smp-1001", title: "Sponsored research: Soil carbon sensing",
    docType: "OTHER", agreementType: "sponsored_research", counterparty: "Prairie AgriTech Cooperative",
    sponsor: "Prairie AgriTech Cooperative", piName: "Dr. Laura Chen",
    department: "Food, Agricultural and Biological Engineering", college: "College of Food, Agricultural, and Environmental Sciences",
    stage: "negotiation", state: "sent_back", daysInStage: 27, totalDays: 44, rounds: 2,
    waitingOn: waiting("counterparty"), owner: REVIEWER_SAM,
    value: 310_000, overallRisk: "medium", openBlockers: 1,
    matrix: { version: 3, reviewedAt: daysAgo(27), counts: counts({ within: 9, fallback: 2, deviates: 1 }) },
    nextStep: step("wait", "Waiting on Prairie AgriTech: the publication review period is still 90 days."),
  }),
  sample({
    contractId: "smp-1002", title: "Clinical trial: Phase II cardiology study",
    docType: "OTHER", agreementType: "sponsored_research", counterparty: "Northgate Pharmaceuticals",
    sponsor: "Northgate Pharmaceuticals", piName: "Dr. Samuel Ortiz",
    department: "Internal Medicine", college: "College of Medicine",
    stage: "review", state: "in_review", daysInStage: 4,
    waitingOn: waiting("osu_reviewer", null, REVIEWER_MAYA), owner: REVIEWER_MAYA,
    value: 860_000, overallRisk: "medium", openBlockers: 1,
    matrix: { version: 3, reviewedAt: daysAgo(4), counts: counts({ within: 10, fallback: 1, deviates: 1, beneficial: 1 }) },
    nextStep: step("send_back", "Send back to Northgate: 1 clause needs changes."),
  }),
  sample({
    contractId: "smp-1003", title: "Non-exclusive license: Imaging analysis software",
    docType: "LICENSE", agreementType: "license", counterparty: "Clearwater Imaging Ltd.",
    piName: "Dr. Amira Haddad", department: "Radiology", college: "College of Medicine",
    stage: "active", state: "active", daysInStage: 40, totalDays: 71, signedAt: daysAgo(40),
    waitingOn: waiting("nobody"), owner: REVIEWER_JORDAN, value: 120_000, overallRisk: "low",
    matrix: { version: 2, reviewedAt: daysAgo(70), counts: counts({ within: 11, fallback: 1 }) },
    nextStep: step("none", "Active. Next royalty report due in 22 days."), obligationsDue: 1,
  }),
  sample({
    contractId: "smp-1004", title: "Research collaboration: Solid-state battery materials",
    docType: "OTHER", agreementType: "collaboration", counterparty: "Volta Cell Systems",
    piName: "Dr. Peter Novak", department: "Chemistry and Biochemistry", college: "College of Arts and Sciences",
    stage: "draft", state: "intake", daysInStage: 1,
    waitingOn: waiting("osu_reviewer"), owner: null, value: 250_000, overallRisk: null,
    matrix: { version: 3, reviewedAt: daysAgo(1), counts: counts({ within: 9, fallback: 1 }) },
    nextStep: step("assign", "Assign a reviewer."), captureGaps: ["requestedDate"],
  }),
  sample({
    contractId: "smp-1005", title: "Federal grant: Watershed resilience",
    docType: "OTHER", agreementType: "grant", counterparty: "National Science Foundation",
    sponsor: "National Science Foundation", piName: "Dr. Rachel Kim",
    department: "Civil, Environmental and Geodetic Engineering", college: "College of Engineering",
    stage: "active", state: "active", daysInStage: 120, totalDays: 152, signedAt: daysAgo(120),
    waitingOn: waiting("nobody"), owner: REVIEWER_SAM, value: 1_200_000, overallRisk: "low",
    nextStep: step("none", "Active. Annual sponsor report due in 41 days."), obligationsDue: 1,
  }),
  sample({
    contractId: "smp-1006", title: "Data use agreement: Regional health outcomes",
    docType: "OTHER", agreementType: "other", counterparty: "Riverbend Health Network",
    piName: "Dr. Omar Siddiqui", department: "Biomedical Informatics", college: "College of Medicine",
    stage: "negotiation", state: "sent_back", daysInStage: 45, totalDays: 58, rounds: 3,
    waitingOn: waiting("counterparty"), owner: REVIEWER_JORDAN, overallRisk: "high", openBlockers: 2,
    matrix: { version: 3, reviewedAt: daysAgo(45), counts: counts({ within: 6, deviates: 2 }) },
    nextStep: step("wait", "Waiting on Riverbend Health: 2 clauses still need changes."),
  }),
  sample({
    contractId: "smp-1007", title: "Sponsored research: Turbine blade coatings",
    docType: "OTHER", agreementType: "sponsored_research", counterparty: "Allegheny Aero Components",
    sponsor: "Allegheny Aero Components", piName: "Dr. Victor Hale",
    department: "Mechanical and Aerospace Engineering", college: "College of Engineering",
    stage: "approval", state: "in_review", daysInStage: 7, totalDays: 26,
    waitingOn: waiting("pi_department"), owner: REVIEWER_SAM, value: 540_000, overallRisk: "low",
    matrix: { version: 3, reviewedAt: daysAgo(19), counts: counts({ within: 10, fallback: 2 }) },
    nextStep: step("wait", "Waiting on the department to confirm cost share."),
  }),
  sample({
    contractId: "smp-1008", title: "Exclusive license: Crop disease diagnostics",
    docType: "LICENSE", agreementType: "license", counterparty: "FieldSense Diagnostics",
    piName: "Dr. Grace Mensah", department: "Plant Pathology", college: "College of Food, Agricultural, and Environmental Sciences",
    stage: "signed", state: "signed", daysInStage: 6, totalDays: 48, signedAt: daysAgo(6), rounds: 1,
    waitingOn: waiting("nobody"), owner: REVIEWER_JORDAN, value: 95_000, overallRisk: "low",
    matrix: { version: 3, reviewedAt: daysAgo(14), counts: counts({ within: 11, fallback: 1, beneficial: 2 }) },
    nextStep: step("none", "Signed. Obligations are being tracked."), obligationsDue: 2,
  }),
  sample({
    contractId: "smp-1009", title: "Subaward: Coastal sensing network",
    docType: "OTHER", agreementType: "grant", direction: "outgoing", counterparty: "Bayview Institute of Technology",
    sponsor: "National Oceanic and Atmospheric Administration", piName: "Dr. Kevin Mueller",
    department: "Computer Science and Engineering", college: "College of Engineering",
    stage: "active", state: "active", daysInStage: 64, totalDays: 90, signedAt: daysAgo(64),
    waitingOn: waiting("nobody"), owner: REVIEWER_SAM, value: 210_000, overallRisk: "low",
    nextStep: step("none", "Active. Next invoice review in 9 days."),
  }),
  sample({
    contractId: "smp-1010", title: "Option agreement: Low-power radio chip",
    docType: "LICENSE", agreementType: "option", counterparty: "Northstar Semiconductor",
    piName: "Dr. Marco Bianchi", department: "Electrical and Computer Engineering", college: "College of Engineering",
    stage: "review", state: "in_review", daysInStage: 15, totalDays: 15,
    waitingOn: waiting("osu_reviewer", null, REVIEWER_JORDAN), owner: REVIEWER_JORDAN,
    value: 25_000, overallRisk: "medium", openBlockers: 1,
    matrix: { version: 3, reviewedAt: daysAgo(15), counts: counts({ within: 8, deviates: 1 }) },
    nextStep: step("send_back", "Send back to Northstar: the option period is 24 months, the matrix allows 12."),
  }),
  sample({
    contractId: "smp-1011", title: "Sponsored research: Pediatric sleep study",
    docType: "OTHER", agreementType: "sponsored_research", counterparty: "Hearthstone Foundation",
    sponsor: "Hearthstone Foundation", piName: "Dr. Naomi Fischer", department: "Pediatrics", college: "College of Medicine",
    stage: "approval", state: "out_for_signature", daysInStage: 3, totalDays: 30,
    waitingOn: waiting("signatory", null, SIGNATORY), owner: REVIEWER_MAYA, value: 150_000, overallRisk: "low",
    matrix: { version: 3, reviewedAt: daysAgo(20), counts: counts({ within: 10, fallback: 1 }) },
    nextStep: step("wait", "Out for signature since Monday."),
    signature: { provider: "docusign", envelopeId: "env-sample-1011", sentAt: daysAgo(3), signedAt: null, signatory: SIGNATORY },
  }),
  sample({
    contractId: "smp-1012", title: "Master research agreement: Advanced manufacturing",
    docType: "MSA", agreementType: "collaboration", counterparty: "Keystone Industrial Group",
    piName: "Dr. Victor Hale", department: "Industrial and Systems Engineering", college: "College of Engineering",
    stage: "renewal", state: "active", daysInStage: 12, totalDays: 700, signedAt: daysAgo(712),
    waitingOn: waiting("osu_reviewer", null, REVIEWER_SAM), owner: REVIEWER_SAM, value: 600_000, overallRisk: "low",
    nextStep: step("none", "Term ends in 48 days. Decide whether to renew."), termEndDate: daysAhead(48),
  }),
]

// ── The featured contract's detail ─────────────────────────────────────────

function clause(c: Partial<MatrixClauseResult> & Pick<MatrixClauseResult, "clauseType" | "label" | "tier">): MatrixClauseResult {
  return {
    clauseNumber: null, clauseId: null, beneficial: false, beneficialReason: null, reason: null, found: null,
    standard: null, fallback: null, escalationOffice: null, suggestedLanguage: null, required: true,
    escalationRequired: false, quote: null, ...c,
  }
}

const LICENSE_CLAUSES: MatrixClauseResult[] = [
  clause({
    clauseType: "LicenseScope", label: "License grant scope (exclusivity, field of use, territory)", clauseNumber: "2.1", tier: "deviates",
    reason: "The licence is exclusive, worldwide, in all fields of use, with no reserved right for the university to use the technology for research and education.",
    found: "Exclusive, worldwide, all fields of use; no reserved research rights.",
    standard: "Exclusive licence limited to a defined field of use and territory, with reserved research and education rights.",
    fallback: "All fields of use, if research and education rights are reserved and diligence applies per field.",
    escalationOffice: "tech_commercialization", suggestedLanguage: LICENSE_SEND_BACK_CLAUSES[0].suggestedLanguage,
    quote: "University hereby grants to Licensee an exclusive, worldwide, royalty-bearing license under the Licensed Patents in all fields of use.",
  }),
  clause({
    clauseType: "Royalties", label: "Royalties, milestones, equity and sublicense income", clauseNumber: "3.3", tier: "deviates",
    beneficial: true, beneficialReason: "Equity and a minimum annual royalty are included.",
    reason: "Running royalty is 1% of net sales; the matrix requires at least 3% (fallback 2%). No share of sublicense income is stated.",
    found: "1% running royalty; no sublicense income share.",
    standard: "At least 3% running royalty and 25% of sublicense income.", fallback: "At least 2% and 15% of sublicense income.",
    escalationOffice: "tech_commercialization", suggestedLanguage: LICENSE_SEND_BACK_CLAUSES[1].suggestedLanguage,
    quote: "Licensee shall pay University a running royalty of one percent (1%) of Net Sales of all Licensed Products.",
  }),
  clause({
    clauseType: "GoverningLaw", label: "Governing law (Ohio) and sovereign immunity", clauseNumber: "14.1", tier: "unacceptable",
    reason: "Governing law is Delaware and the university would waive its sovereign immunity.",
    found: "Delaware law; waiver of sovereign immunity.",
    standard: "Ohio law; no waiver of sovereign immunity.", escalationOffice: "legal_affairs", escalationRequired: true,
    suggestedLanguage: LICENSE_SEND_BACK_CLAUSES[2].suggestedLanguage,
    quote: "This Agreement shall be governed by the laws of the State of Delaware. University hereby waives any claim of sovereign immunity.",
  }),
  clause({
    clauseType: "Diligence", label: "Diligence and termination for failure to commercialize", clauseNumber: "5.1", tier: "within",
    beneficial: true, beneficialReason: "Dated development and sales milestones with a cure period.",
    standard: "Commercially reasonable efforts with dated milestones and a termination right.",
  }),
  clause({ clauseType: "BackgroundIP", label: "Background and foreground IP ownership", clauseNumber: "7.1", tier: "within", standard: "The university keeps title to the licensed patents." }),
  clause({ clauseType: "Indemnity", label: "Indemnification and insurance (public university)", clauseNumber: "11.1", tier: "within", standard: "The licensee indemnifies the university and carries insurance." }),
  clause({ clauseType: "DataRights", label: "Data rights, confidentiality term and use of name", clauseNumber: "9.1", tier: "within", standard: "No use of the university's name without consent." }),
  clause({ clauseType: "Sublicensing", label: "Sublicensing", clauseNumber: "4.1", tier: "fallback", standard: "Sublicenses need prior written consent.", fallback: "Consent not unreasonably withheld." }),
  clause({ clauseType: "Confidentiality", label: "Confidentiality", clauseNumber: "8.1", tier: "within", required: false }),
  clause({ clauseType: "Warranties", label: "Warranties", clauseNumber: "10.1", tier: "within", required: false }),
  clause({ clauseType: "ExportControl", label: "Export control and foreign party restrictions", clauseNumber: "12.1", tier: "within" }),
  clause({ clauseType: "SponsorReporting", label: "Sponsor reporting and grant flow-down terms", clauseNumber: "6.1", tier: "within", beneficial: true, beneficialReason: "Quarterly royalty reports within 45 days." }),
]

const tierCounts = (clauses: MatrixClauseResult[]): MatrixCounts => {
  const out = counts({})
  for (const c of clauses) {
    out[c.tier] += 1
    if (c.beneficial) out.beneficial += 1
  }
  return out
}

function blocker(id: string, cl: MatrixClauseResult, office: Office | null): Blocker {
  return {
    id, text: cl.reason ?? cl.label, clauseType: cl.clauseType, office, suggestedLanguage: cl.suggestedLanguage,
    source: "sonar", status: "open", createdAt: daysAgo(12), createdBy: null, closedAt: null, closedBy: null,
  }
}

const LICENSE_INCOME: IncomeItem[] = [
  { id: "inc-1", kind: "upfront", description: "Licence issue fee", amount: 75_000, pct: null, expectedDate: daysAhead(30), source: "sonar" },
  { id: "inc-2", kind: "milestone", description: "First human study", amount: 50_000, pct: null, expectedDate: "2027-09-30", source: "sonar" },
  { id: "inc-3", kind: "milestone", description: "Regulatory clearance", amount: 150_000, pct: null, expectedDate: "2028-12-31", source: "sonar" },
  { id: "inc-4", kind: "milestone", description: "First commercial sale", amount: 250_000, pct: null, expectedDate: "2029-06-30", source: "sonar" },
  { id: "inc-5", kind: "royalty", description: "Running royalty on net sales", amount: null, pct: 1, expectedDate: null, source: "sonar" },
  { id: "inc-6", kind: "equity", description: "Common stock in the licensee", amount: null, pct: 5, expectedDate: daysAhead(60), source: "sonar" },
]

const LICENSE_ACTIVITY: ActivityEntry[] = [
  { id: "act-1", at: daysAgo(20), actor: null, action: "intake", fromStage: null, toStage: "draft", summary: "Arrived from Huron record AGR00012345.", detail: null },
  { id: "act-2", at: daysAgo(20), actor: null, action: "assigned", fromStage: null, toStage: null, summary: "Assigned to Jordan Ellis by the license rule.", detail: null },
  { id: "act-3", at: daysAgo(12), actor: null, action: "rescored", fromStage: "draft", toStage: "review", summary: "Checked against the matrix: 3 clauses need changes.", detail: null },
  { id: "act-4", at: daysAgo(2), actor: REVIEWER_JORDAN, action: "comment", fromStage: null, toStage: null, summary: "Asked Technology Commercialization about the royalty floor.", detail: null },
]

const featured = SHOWCASE_CONTRACTS[0]

export const FEATURED_CONTRACT_DETAIL: ContractDetail = {
  ...featured,
  blockers: [
    blocker("blk-1", LICENSE_CLAUSES[0], "tech_commercialization"),
    blocker("blk-2", LICENSE_CLAUSES[1], "tech_commercialization"),
    blocker("blk-3", LICENSE_CLAUSES[2], "legal_affairs"),
  ],
  obligations: [],
  licensingIncome: LICENSE_INCOME,
  review: {
    docId: featured.currentDocId, agreementType: "license", matrixVersion: 3, matrixEffectiveDate: "2026-09-15",
    reviewedAt: daysAgo(12), counts: tierCounts(LICENSE_CLAUSES), clauses: LICENSE_CLAUSES,
  },
  activity: LICENSE_ACTIVITY,
  versions: [{ docId: featured.currentDocId, title: "Licensee draft, 18 September 2026", createdAt: daysAgo(20), status: "PROCESSED", round: 0, matrixCounts: tierCounts(LICENSE_CLAUSES) }],
}

/** Plain details for the other license and option contracts (the value report reads their income). */
function plainDetail(c: Contract, income: IncomeItem[]): ContractDetail {
  return {
    ...c, blockers: [], obligations: [], licensingIncome: income, review: null, activity: [],
    versions: [{ docId: c.currentDocId, title: c.title, createdAt: c.createdAt, status: "PROCESSED", round: c.rounds, matrixCounts: c.matrix?.counts ?? null }],
  }
}

const income = (id: string, kind: IncomeItem["kind"], description: string, amount: number | null, pct: number | null = null): IncomeItem => ({
  id, kind, description, amount, pct, expectedDate: null, source: "sonar",
})

export const SHOWCASE_DETAILS: ContractDetail[] = [
  FEATURED_CONTRACT_DETAIL,
  ...SHOWCASE_CONTRACTS.filter((c) => c.contractId !== FEATURED_CONTRACT_ID && (c.agreementType === "license" || c.agreementType === "option"))
    .map((c) => plainDetail(c, [
      income(`${c.contractId}-fee`, c.agreementType === "option" ? "upfront" : "upfront", c.agreementType === "option" ? "Option fee" : "Licence issue fee", Math.round((c.value ?? 0) * 0.3)),
      income(`${c.contractId}-roy`, "royalty", "Running royalty on net sales", null, 3),
    ])),
]

// ── Settings, matrix and trends ────────────────────────────────────────────

export const SHOWCASE_SETTINGS: WorkflowSettings = {
  stageTargetDays: STAGE_TARGET_DAYS,
  redAfterMultiple: RED_AFTER_MULTIPLE,
  reviewers: [
    { email: REVIEWER_JORDAN.email, name: REVIEWER_JORDAN.name!, offices: ["tech_commercialization"], agreementTypes: ["license", "option"] },
    { email: REVIEWER_MAYA.email, name: REVIEWER_MAYA.name!, offices: ["sponsored_programs"], agreementTypes: ["sponsored_research", "mta"] },
    { email: REVIEWER_SAM.email, name: REVIEWER_SAM.name!, offices: ["sponsored_programs"], agreementTypes: ["grant", "collaboration", "other"] },
  ],
  assignmentRules: [],
  routingRules: [],
  notifications: { email: true, teams: true, events: { assigned: true, sent_back: true, approved: true, overdue: true, escalated: true } },
  teamsWebhookConfigured: false,
}

export const SHOWCASE_MATRIX: { current: Matrix; versions: MatrixVersionInfo[] } = {
  current: { version: 3, effectiveDate: "2026-09-15", createdAt: "2026-09-15T00:00:00Z", createdBy: null, note: "Research and licensing matrix", playbooks: {} },
  versions: [{ version: 3, effectiveDate: "2026-09-15", createdAt: "2026-09-15T00:00:00Z", createdBy: null, note: "Research and licensing matrix", clauseCount: 22 }],
}

const MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]
const RECEIVED = [168, 181, 205, 197, 214, 222, 209, 231, 218, 226, 240, 74]
const SIGNED = [150, 162, 171, 188, 190, 201, 199, 207, 211, 214, 223, 61]
const CYCLE = [41, 40, 38, 37, 35, 34, 33, 31, 30, 29, 28, 27]

function period(i: number): TrendPeriod {
  const month = MONTHS[i]
  const start = `${month}-01`
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
  return {
    period: month, start, end, received: RECEIVED[i], signed: SIGNED[i], rejected: 4 + (i % 3), sentBack: 38 + (i % 5),
    escalated: 12 + (i % 4), overdueEvents: 20 - Math.min(i, 9), revisions: 44 + (i % 6),
    signedValue: { USD: SIGNED[i] * 41_000 }, receivedValue: { USD: RECEIVED[i] * 43_000 },
    avgCycleDays: CYCLE[i], avgDaysByStage: { draft: 2, review: 9, negotiation: 14, approval: 4 },
    avgRounds: 1.4, onTimePct: 62 + i * 2,
  }
}

export function showcaseTrends(periods: number): Trends {
  const from = MONTHS.length - periods
  return {
    granularity: "month",
    generatedAt: SHOWCASE_NOW,
    periods: MONTHS.slice(Math.max(0, from)).map((_, i) => period(Math.max(0, from) + i)),
    byAgreementType: {
      sponsored_research: { received: 980, signed: 911, avgCycleDays: 34 },
      license: { received: 210, signed: 188, avgCycleDays: 46 },
      mta: { received: 640, signed: 622, avgCycleDays: 12 },
      nda: { received: 520, signed: 509, avgCycleDays: 7 },
    },
    clauseDeviations: [
      { clauseType: "PublicationRights", label: "Publication rights and review period", total: 96, byPeriod: {} },
      { clauseType: "Indemnity", label: "Indemnification and insurance (public university)", total: 71, byPeriod: {} },
      { clauseType: "GoverningLaw", label: "Governing law and sovereign immunity", total: 58, byPeriod: {} },
    ],
    officeLoad: [
      { office: "legal_affairs", escalations: 64, avgDaysToApprove: 6.5 },
      { office: "export_control", escalations: 22, avgDaysToApprove: 9.1 },
      { office: "sponsored_programs", escalations: 41, avgDaysToApprove: 3.8 },
    ],
  }
}
