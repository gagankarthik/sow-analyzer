import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import { listTotals } from "./list-totals"

describe("listTotals", () => {
  it("sums one currency, averages days and counts overdue", () => {
    const rows = [
      makeContract({ value: 100, currency: "USD", daysInStage: 2, slaStatus: "red" }),
      makeContract({ value: 50, currency: null, daysInStage: 4 }),
      makeContract({ value: 900, currency: "EUR", daysInStage: 6, slaStatus: "amber" }),
      makeContract({ value: null, daysInStage: 0 }),
    ]
    expect(listTotals(rows, "usd")).toEqual({ count: 4, valueSum: 150, otherCurrency: 1, avgDays: 3, overdue: 1 })
  })
  it("has no average with no rows", () => {
    expect(listTotals([], "USD")).toEqual({ count: 0, valueSum: 0, otherCurrency: 0, avgDays: null, overdue: 0 })
  })
})
