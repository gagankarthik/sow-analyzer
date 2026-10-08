import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import { findOpportunities } from "./opportunities"
import type { PortfolioObligation } from "./types"

const TODAY = new Date("2026-10-08T12:00:00Z")

function obligation(over: Partial<PortfolioObligation>): PortfolioObligation {
  return {
    id: "o1", kind: "other", title: "Report", dueDate: "2026-10-20", amount: null, status: "open",
    source: "manual", completedAt: null, verified: true, verifiedAt: null, verifiedBy: null, contractId: "c1", contractTitle: "Agreement", counterparty: null,
    agreementType: null, stage: "active", currency: "USD", owner: null, ...over,
  }
}

const ids = (list: { id: string }[]) => list.map((o) => o.id)

describe("findOpportunities", () => {
  it("finds nothing in a healthy portfolio", () => {
    const owner = { email: "a@example.com", name: "A" }
    expect(findOpportunities([makeContract({ value: 100, owner, slaStatus: "on_track" })], [], TODAY)).toEqual([])
  })

  it("adds up days past target only for overdue contracts with a target", () => {
    const list = findOpportunities([
      makeContract({ stage: "review", slaStatus: "red", daysInStage: 15, targetDays: 5, value: 1 }),
      makeContract({ stage: "review", slaStatus: "red", daysInStage: 9, targetDays: 4, value: 1 }),
      makeContract({ stage: "review", slaStatus: "amber", daysInStage: 6, targetDays: 5, value: 1 }),
    ], [], TODAY)
    const past = list.find((o) => o.id === "past-target")!
    expect(past.figure).toBe("15 days")
    expect(past.title).toBe("2 contracts are past the step target")
  })

  it("separates overdue obligations, term ends within 90 days and payments within 30", () => {
    const list = findOpportunities([], [
      obligation({ id: "late", dueDate: "2026-10-01", amount: 5000 }),
      obligation({ id: "end", kind: "term_end", dueDate: "2026-12-01" }),
      obligation({ id: "far", kind: "term_end", dueDate: "2027-06-01" }),
      obligation({ id: "pay", kind: "milestone_payment", dueDate: "2026-10-30", amount: 20000 }),
    ], TODAY)
    expect(ids(list)).toEqual(["obligations-overdue", "terms-ending", "payments-due"])
    expect(list[0].detail).toContain("$5k")
    expect(list[1].figure).toBe("1")
    expect(list[2].figure).toBe("$20k")
  })

  it("flags unassigned open work and contracts with no value, never signed-off history", () => {
    const list = findOpportunities([
      makeContract({ stage: "review", owner: null, value: null }),
      makeContract({ stage: "expired", owner: null, value: null }),
    ], [], TODAY)
    expect(list.find((o) => o.id === "unassigned")?.figure).toBe("1")
    expect(list.find((o) => o.id === "unvalued")?.figure).toBe("1")
  })

  it("asks for Sonar-found obligations to be verified", () => {
    const list = findOpportunities([], [obligation({ id: "s", verified: false, source: "sonar", dueDate: "2027-01-01" })], TODAY)
    expect(list.map((o) => o.id)).toEqual(["unverified"])
  })
})
