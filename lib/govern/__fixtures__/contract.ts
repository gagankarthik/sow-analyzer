// A complete, valid Contract for tests. Override only what a test is about.
import type { Contract, MatrixCounts } from "../types"

export const NO_COUNTS: MatrixCounts = { within: 0, fallback: 0, deviates: 0, unacceptable: 0, review: 0, missing: 0, beneficial: 0 }

let sequence = 0

export function makeContract(overrides: Partial<Contract> = {}): Contract {
  sequence += 1
  const id = overrides.contractId ?? `c-${sequence}`
  return {
    contractId: id, currentDocId: id, versionDocIds: [id], tenantId: "t-1",
    title: `Agreement ${sequence}`, docType: "LICENSE", agreementType: "license", direction: "incoming",
    counterparty: "Buckeye BioSensors, Inc.", sponsor: null, piName: null, department: null, college: null,
    stage: "review", state: "in_review",
    waitingOn: { kind: "osu_reviewer", label: "Waiting on OSU reviewer", office: null, person: null },
    owner: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
    stageEnteredAt: "2026-09-01T00:00:00Z", signedAt: null,
    daysInStage: 3, totalDays: 3, targetDays: 5, slaStatus: "on_track", rounds: 0, analysisStatus: "READY",
    value: 100_000, valueSource: "extracted", extractedValue: 100_000, manualValue: null, expectedValue: null,
    currency: "USD", fiscalYear: 2027, requestedDate: null, valueBucket: "potential",
    matrix: { version: 1, reviewedAt: "2026-09-01T00:00:00Z", counts: NO_COUNTS },
    overallRisk: "low", openBlockers: 0,
    nextStep: { action: "approve", headline: "Approve for signature.", detail: null, office: null, clauses: [] },
    huronRecordId: null, workdayRef: null, workdayMatch: "unmatched", syncConflicts: [],
    routing: { required: [], approvals: [], reasons: [] }, rejection: null, signature: null,
    obligationsDue: 0, captureGaps: [], allowedActions: ["approve", "comment"],
    effectiveDate: null, termEndDate: null, rev: 1,
    ...overrides,
  }
}
