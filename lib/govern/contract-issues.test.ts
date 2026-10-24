import { describe, expect, it } from "vitest"
import { contractIssues, signatureBlockReason } from "./contract-issues"
import { makeContract } from "./__fixtures__/contract"
import type { Blocker, MatrixClauseResult, MatrixReview } from "./types"

function blocker(id: string, clauseType: string | null, status: Blocker["status"] = "open"): Blocker {
  return {
    id, text: `Item ${id}`, clauseType, office: null, suggestedLanguage: null, source: "sonar", status,
    createdAt: "2026-10-01T00:00:00Z", createdBy: null, closedAt: null, closedBy: null,
  }
}

function clause(clauseType: string, tier: MatrixClauseResult["tier"]): MatrixClauseResult {
  return {
    clauseType, label: clauseType, clauseNumber: null, clauseId: null, tier, beneficial: false, beneficialReason: null,
    reason: null, found: null, standard: null, fallback: null, escalationOffice: null, suggestedLanguage: null,
    required: true, escalationRequired: false, quote: null,
  }
}

function review(clauses: MatrixClauseResult[]): MatrixReview {
  return {
    docId: "d", agreementType: "sponsored_research", matrixVersion: 1, matrixEffectiveDate: null, reviewedAt: "2026-10-01",
    counts: { within: 0, fallback: 0, deviates: 0, unacceptable: 0, review: 0, missing: 0, beneficial: 0 }, clauses,
  }
}

describe("contractIssues", () => {
  it("pairs each open blocker with its clause and puts high severity first", () => {
    const issues = contractIssues({
      blockers: [blocker("1", "law"), blocker("2", "indemnity"), blocker("3", null)],
      review: review([clause("law", "deviates"), clause("indemnity", "unacceptable")]),
    })
    expect(issues.map((i) => i.key)).toEqual(["blocker-2", "blocker-1", "blocker-3"])
    expect(issues[0].severity).toBe("high")
    expect(issues[0].clause?.clauseType).toBe("indemnity")
    expect(issues[2].clause).toBeNull()
  })

  it("adds blocking clauses no blocker covers, and skips ones a closed blocker resolved", () => {
    const issues = contractIssues({
      blockers: [blocker("1", "law", "closed")],
      review: review([clause("law", "deviates"), clause("ip", "missing"), clause("term", "within")]),
    })
    expect(issues.map((i) => i.key)).toEqual(["clause-ip-"])
    expect(issues[0].blocker).toBeNull()
  })
})

describe("signatureBlockReason", () => {
  const inReview = makeContract({ state: "in_review", analysisStatus: "READY" })

  it("names the open issues before anything else", () => {
    expect(signatureBlockReason(inReview, 2)).toBe("Resolve 2 issues first")
  })

  it("says who holds it when nothing is open", () => {
    const c = { ...inReview, waitingOn: { kind: "counterparty" as const, label: "Waiting on sponsor", office: null, person: null } }
    expect(signatureBlockReason(c, 0)).toBe("Waiting on sponsor")
  })

  it("has no reason once review is over", () => {
    expect(signatureBlockReason({ ...inReview, state: "ready_to_sign" }, 3)).toBeNull()
  })
})
