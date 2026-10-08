import { describe, expect, it } from "vitest"
import { makeContract, NO_COUNTS } from "./__fixtures__/contract"
import {
  applyFilters, byUrgency, daysBand, formatCompact, formatMoney, inValueBand, matchesSearch,
  needsAttention, NO_FILTERS, stageQueues, sumMoney, valueHeldUp, valueSummary, waitingQueues,
} from "./metrics"

describe("sumMoney", () => {
  it("never adds different currencies together", () => {
    const money = sumMoney([
      makeContract({ value: 100, currency: "USD" }),
      makeContract({ value: 50, currency: "EUR" }),
      makeContract({ value: 25, currency: "usd" }),
    ])
    expect(money.totals).toEqual([{ currency: "USD", amount: 125 }, { currency: "EUR", amount: 50 }])
    expect(money.valued).toBe(3)
  })

  it("counts contracts with no value apart, never as zero", () => {
    const money = sumMoney([makeContract({ value: null }), makeContract({ value: 10 })])
    expect(money.unvalued).toBe(1)
    expect(money.valued).toBe(1)
    expect(money.totals).toEqual([{ currency: "USD", amount: 10 }])
  })
})

describe("formatting", () => {
  it("keeps whole millions intact and trims only decimal zeros", () => {
    expect(formatCompact(10_000_000, "USD")).toBe("$10M")
    expect(formatCompact(14_200_000, "USD")).toBe("$14.2M")
    expect(formatCompact(1_500_000, "USD")).toBe("$1.5M")
    expect(formatCompact(999_700, "USD")).toBe("$1M")
    expect(formatCompact(480_000, "USD")).toBe("$480k")
    expect(formatCompact(-2_000, "USD")).toBe("−$2k")
  })

  it("shows a dash when nothing is valued, and lists currencies side by side", () => {
    expect(formatMoney(sumMoney([makeContract({ value: null })]))).toBe("—")
    expect(formatMoney(sumMoney([
      makeContract({ value: 1000, currency: "USD" }),
      makeContract({ value: 5, currency: "EUR" }),
    ]))).toBe("$1,000 + €5")
  })
})

describe("value buckets (Requirement 4)", () => {
  const signed = makeContract({ stage: "signed", state: "signed", valueBucket: "current", value: 300 })
  const late = makeContract({ valueBucket: "potential", value: 200, slaStatus: "amber" })
  const onTime = makeContract({ valueBucket: "potential", value: 100 })
  const outgoing = makeContract({ valueBucket: "potential", value: 50, direction: "outgoing" })
  const all = [signed, late, onTime, outgoing]

  it("splits current, potential and held up", () => {
    const summary = valueSummary(all)
    expect(summary.current.totals[0].amount).toBe(300)
    expect(summary.potential.totals[0].amount).toBe(350)
    expect(summary.heldUp.totals[0].amount).toBe(200)
  })

  it("reports money in and money out separately", () => {
    const summary = valueSummary(all)
    expect(summary.byDirection.incoming.potential.totals[0].amount).toBe(300)
    expect(summary.byDirection.outgoing.potential.totals[0].amount).toBe(50)
  })

  it("breaks potential value down by stage and by days waiting", () => {
    const heldUp = valueHeldUp([
      makeContract({ stage: "negotiation", daysInStage: 20, value: 70 }),
      makeContract({ stage: "review", daysInStage: 2, value: 30 }),
    ])
    expect(heldUp.byStage.find((s) => s.stage === "negotiation")?.money.totals[0].amount).toBe(70)
    expect(heldUp.byDays.find((b) => b.band === "15-30")?.count).toBe(1)
    expect(heldUp.byDays.find((b) => b.band === "0-7")?.count).toBe(1)
  })

  it("bands days with no gaps at the edges", () => {
    expect([0, 7, 8, 14, 15, 30, 31, 400].map(daysBand))
      .toEqual(["0-7", "0-7", "8-14", "8-14", "15-30", "15-30", "31+", "31+"])
  })
})

describe("needs attention (leader home)", () => {
  it("flags overdue, unacceptable terms and late-with-blockers; ignores signed and rejected", () => {
    const unacceptable = { version: 1, reviewedAt: null, counts: { ...NO_COUNTS, unacceptable: 1 } }
    expect(needsAttention(makeContract({ slaStatus: "red" }))).toBe(true)
    expect(needsAttention(makeContract({ matrix: unacceptable }))).toBe(true)
    expect(needsAttention(makeContract({ slaStatus: "amber", openBlockers: 2 }))).toBe(true)
    const owner = { email: "a@example.com", name: "A" }
    expect(needsAttention(makeContract({ slaStatus: "amber", openBlockers: 0, owner }))).toBe(false)
    expect(needsAttention(makeContract({ slaStatus: "on_track", owner: null }))).toBe(true)
    expect(needsAttention(makeContract({ slaStatus: "on_track", overallRisk: "high", owner }))).toBe(true)
    expect(needsAttention(makeContract({ slaStatus: "on_track", overallRisk: "medium", owner }))).toBe(false)
    expect(needsAttention(makeContract({ slaStatus: "red", stage: "signed", state: "signed" }))).toBe(false)
    expect(needsAttention(makeContract({ slaStatus: "red", state: "rejected" }))).toBe(false)
  })

  it("orders overdue first, then the longest wait", () => {
    const lateLong = makeContract({ slaStatus: "amber", daysInStage: 30 })
    const overdue = makeContract({ slaStatus: "red", daysInStage: 2 })
    const lateLonger = makeContract({ slaStatus: "amber", daysInStage: 40 })
    expect([lateLong, overdue, lateLonger].sort(byUrgency)).toEqual([overdue, lateLonger, lateLong])
  })
})

describe("bottlenecks (Requirement 3)", () => {
  it("averages days per stage and counts late and overdue, ignoring closed contracts", () => {
    const review = stageQueues([
      makeContract({ stage: "review", daysInStage: 4, slaStatus: "on_track" }),
      makeContract({ stage: "review", daysInStage: 9, slaStatus: "red" }),
      makeContract({ stage: "review", daysInStage: 6, state: "rejected" }),
    ]).find((s) => s.stage === "review")
    expect(review).toMatchObject({ count: 2, averageDays: 6.5, overdue: 1, late: 0 })
  })

  it("groups the queue by who it is waiting on, and by whom exactly", () => {
    const legal = { kind: "internal_office" as const, label: "Waiting on Legal Affairs", office: "legal_affairs" as const, person: null }
    const queues = waitingQueues([
      makeContract({ waitingOn: legal, daysInStage: 10 }),
      makeContract({ waitingOn: legal, daysInStage: 20 }),
      makeContract({ waitingOn: { kind: "counterparty", label: "Waiting on the other side", office: null, person: null } }),
    ])
    const offices = queues.find((q) => q.kind === "internal_office")
    expect(offices).toMatchObject({ count: 2, averageDays: 15 })
    expect(offices?.who).toEqual([{ label: "Waiting on Legal Affairs", count: 2, averageDays: 15 }])
  })
})

describe("plain-word search and filters (Requirement 5)", () => {
  const research = makeContract({
    sponsor: "Midwest Advanced Materials", piName: "Dr. Priya Raman", department: "Materials Science",
  })

  it("matches every word anywhere, case-insensitive, with no filters needed", () => {
    expect(matchesSearch(research, "raman materials")).toBe(true)
    expect(matchesSearch(research, "MIDWEST")).toBe(true)
    expect(matchesSearch(research, "raman chemistry")).toBe(false)
    expect(matchesSearch(research, "   ")).toBe(true)
  })

  it("puts an unknown value in its own band", () => {
    expect(inValueBand(makeContract({ value: null }), "unknown")).toBe(true)
    expect(inValueBand(makeContract({ value: null }), "under_100k")).toBe(false)
    expect(inValueBand(makeContract({ value: 100_000 }), "100k_500k")).toBe(true)
    expect(inValueBand(makeContract({ value: 1_000_000 }), "over_1m")).toBe(true)
  })

  it("combines search with filters", () => {
    const list = [research, makeContract({ agreementType: "nda" })]
    expect(applyFilters(list, { ...NO_FILTERS, agreementType: "nda" })).toHaveLength(1)
    expect(applyFilters(list, { ...NO_FILTERS, q: "raman" })).toEqual([research])
  })
})
