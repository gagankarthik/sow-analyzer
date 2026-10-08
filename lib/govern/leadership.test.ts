import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import { obligationsByMonth, riskExposure, topCounterparties, workload } from "./leadership"
import type { PortfolioObligation } from "./types"

const ana = { email: "ana@example.com", name: "Ana" }
const ben = { email: "ben@example.com", name: "Ben" }

describe("workload", () => {
  it("lists reviewers busiest-overdue first and unassigned work last", () => {
    const rows = workload([
      makeContract({ stage: "review", owner: ana, slaStatus: "on_track", daysInStage: 2, value: 100, currency: "USD" }),
      makeContract({ stage: "review", owner: ben, slaStatus: "red", daysInStage: 20, value: 50, currency: "USD" }),
      makeContract({ stage: "review", owner: null, slaStatus: "on_track", daysInStage: 1, value: null }),
      makeContract({ stage: "signed", owner: ana, value: 999, currency: "USD" }),
    ], "USD")
    expect(rows.map((r) => r.name)).toEqual(["Ben", "Ana", "Unassigned"])
    expect(rows[0]).toMatchObject({ open: 1, overdue: 1, longestDays: 20, value: 50 })
    expect(rows[1].value).toBe(100)            // signed work is not open workload
    expect(rows[2].value).toBeNull()           // unknown value stays unknown
  })

  it("never adds another currency into the total", () => {
    const rows = workload([
      makeContract({ stage: "review", owner: ana, value: 100, currency: "USD" }),
      makeContract({ stage: "review", owner: ana, value: 70, currency: "EUR" }),
    ], "USD")
    expect(rows[0].value).toBe(100)
  })
})

describe("topCounterparties", () => {
  it("ranks by signed plus pipeline value", () => {
    const rows = topCounterparties([
      makeContract({ counterparty: "Acme", sponsor: null, stage: "review", valueBucket: "potential", value: 10, currency: "USD" }),
      makeContract({ counterparty: "Beta", sponsor: null, stage: "active", valueBucket: "current", value: 30, currency: "USD" }),
    ], "USD")
    expect(rows.map((r) => r.label)).toEqual(["Beta", "Acme"])
    expect(rows[0].signed).toBe(30)
    expect(rows[1].pipeline).toBe(10)
  })
})

describe("riskExposure", () => {
  it("counts a contract once: unacceptable terms outrank open blockers", () => {
    const counts = { within: 0, fallback: 0, deviates: 0, unacceptable: 1, review: 0, missing: 0, beneficial: 0 }
    const out = riskExposure([
      makeContract({ stage: "review", matrix: { version: 1, reviewedAt: null, counts }, openBlockers: 2 }),
      makeContract({ stage: "review", openBlockers: 1 }),
      makeContract({ stage: "review", openBlockers: 0 }),
    ])
    expect(out.unacceptable).toBe(1)
    expect(out.withBlockers).toBe(1)
  })
})

describe("obligationsByMonth", () => {
  it("groups open, dated obligations into the next three months", () => {
    const o = (id: string, dueDate: string | null, amount: number | null, status: "open" | "done" = "open"): PortfolioObligation => ({
      id, kind: "other", title: id, dueDate, amount, status, source: "manual", completedAt: null,
      contractId: "c", contractTitle: null, counterparty: null, agreementType: null, stage: null, currency: "USD", owner: null,
    })
    const rows = obligationsByMonth([
      o("a", "2026-10-20", 100), o("b", "2026-11-02", null), o("c", "2027-03-01", 5),
      o("d", "2026-10-25", 50, "done"), o("e", null, 9),
    ], new Date(2026, 9, 8))
    expect(rows.map((r) => [r.key, r.count, r.amount])).toEqual([["2026-10", 1, 100], ["2026-11", 1, 0], ["2026-12", 0, 0]])
  })
})
