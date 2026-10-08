import { describe, expect, it } from "vitest"
import { COUNTERPARTY_VIEWS, buildCounterparties } from "./counterparties"
import type { Contract } from "./types"

const c = (over: Partial<Contract>) => ({
  counterparty: "Acme Bio", sponsor: null, direction: "incoming", state: "in_review", stage: "review",
  slaStatus: "green", value: null, currency: "USD", updatedAt: "2026-10-01T00:00:00Z", valueBucket: "potential",
  ...over,
}) as Contract

describe("buildCounterparties", () => {
  it("groups by name case-insensitively and falls back to the sponsor", () => {
    const rows = buildCounterparties([
      c({}), c({ counterparty: "ACME BIO" }), c({ counterparty: null, sponsor: "NIH" }), c({ counterparty: null, sponsor: null }),
    ])
    expect(rows.map((r) => [r.name, r.contracts.length])).toEqual([["Acme Bio", 2], ["NIH", 1]])
  })

  it("reads the relationship from money direction", () => {
    const [both] = buildCounterparties([c({}), c({ direction: "outgoing" })])
    expect(both.relationship).toBe("Both")
    expect(COUNTERPARTY_VIEWS.find((v) => v.id === "vendors")!.test(both, Date.now())).toBe(true)
    expect(COUNTERPARTY_VIEWS.find((v) => v.id === "sponsors")!.test(both, Date.now())).toBe(true)
  })

  it("counts open and overdue work", () => {
    const [r] = buildCounterparties([c({ slaStatus: "red" }), c({ state: "signed", stage: "signed" })])
    expect(r.open).toBe(1)
    expect(r.overdue).toBe(1)
  })
})
