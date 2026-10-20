import { describe, expect, it } from "vitest"
import { contractPathSteps, contractStateLabel, contractSteps, currentContractStep } from "./steps"
import { CONTRACT_VIEWS } from "./views"
import type { Contract } from "./types"

const base = {
  state: "in_review",
  analysisStatus: "READY",
  waitingOn: { kind: "internal_reviewer", label: null },
  owner: { email: "ana@uni.edu", name: "Ana Ruiz" },
  routing: { required: [], approvals: [], reasons: [] },
  signature: null,
  matrix: { version: 4, reviewedAt: null, counts: {} },
  signedAt: null,
  slaStatus: "green",
  updatedAt: new Date().toISOString(),
  termEndDate: null,
  captureGaps: [],
  overallRisk: null,
} as unknown as Contract

describe("contractSteps", () => {
  it("puts an in-review contract on the review step, signature not their turn", () => {
    const steps = contractSteps(base)
    expect(steps.map((s) => s.id)).toEqual(["read", "review", "signature", "signed"])
    expect(steps[1].status).toBe("current")
    expect(steps[1].people[0].statusLabel).toBe("Awaiting review")
    expect(steps[2].people[0].statusLabel).toBe("Not their turn")
  })

  it("lists each required office with who approved it", () => {
    const c = {
      ...base,
      routing: {
        required: ["legal_affairs", "export_control"],
        reasons: [],
        approvals: [{ office: "legal_affairs", by: { email: "lee@uni.edu", name: "Lee Park" }, at: "2026-10-01" }],
      },
    } as unknown as Contract
    const approvals = contractSteps(c).find((s) => s.id === "approvals")!
    expect(approvals.summary).toBe("1 of 2 approved")
    expect(approvals.people.map((p) => p.statusLabel)).toEqual(["Approved", "Awaiting approval"])
    expect(approvals.people[0].person?.name).toBe("Lee Park")
  })

  it("marks everything done once signed", () => {
    const steps = contractSteps({ ...base, state: "signed" } as Contract)
    expect(steps.every((s) => s.status === "done")).toBe(true)
  })
})

describe("contract views", () => {
  const ctx = { me: "ana@uni.edu", now: Date.now() }
  const view = (id: string) => CONTRACT_VIEWS.find((v) => v.id === id)!

  it("assigned to me matches the owner's email, case-insensitively", () => {
    const c = { ...base, owner: { email: "ANA@uni.edu", name: null } } as Contract
    expect(view("mine").test(c, ctx)).toBe(true)
    expect(view("unassigned").test(c, ctx)).toBe(false)
  })

  it("signed contracts leave the in-progress views", () => {
    const c = { ...base, state: "active" } as Contract
    expect(view("in-progress").test(c, ctx)).toBe(false)
    expect(view("signed").test(c, ctx)).toBe(true)
  })
})

describe("contractPathSteps", () => {
  it("shows a waiting step as current and a stopped one as blocked", () => {
    const waiting = { ...base, waitingOn: { kind: "counterparty", label: "Waiting on the other side" } } as unknown as Contract
    expect(contractPathSteps(waiting).map((s) => s.status)).toEqual(["done", "current", "upcoming", "upcoming"])
    const rejected = { ...base, state: "rejected" } as unknown as Contract
    expect(contractPathSteps(rejected).slice(1).map((s) => s.status)).toEqual(["blocked", "blocked", "blocked"])
  })

  it("blocks the read step when Sonar could not read the document", () => {
    const failed = { ...base, analysisStatus: "FAILED" } as unknown as Contract
    expect(contractPathSteps(failed)[0].status).toBe("blocked")
    expect(currentContractStep(failed)?.id).toBe("read")
    expect(currentContractStep(base)?.id).toBe("review")
  })
})

describe("contractStateLabel", () => {
  it("says Just arrived only on the first day", () => {
    expect(contractStateLabel({ state: "intake", daysInStage: 0, owner: null })).toBe("Just arrived")
    expect(contractStateLabel({ state: "intake", daysInStage: 1, owner: null })).toBe("Just arrived")
    expect(contractStateLabel({ state: "intake", daysInStage: 6, owner: null })).toBe("Needs a reviewer")
    expect(contractStateLabel({ state: "intake", daysInStage: 6, owner: { email: "a@b.c", name: null } })).toBe("Not started")
    expect(contractStateLabel({ state: "in_review", daysInStage: 9, owner: null })).toBe("Being reviewed")
  })
})

describe("contractPathSteps with office approvals", () => {
  it("keeps one current stage when approvals run alongside review", () => {
    const c = { ...base, routing: { required: ["legal_affairs"], approvals: [], reasons: [] } } as unknown as Contract
    expect(contractPathSteps(c).map((s) => s.status)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"])
  })
})
