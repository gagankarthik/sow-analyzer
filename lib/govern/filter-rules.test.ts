import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import {
  FILTER_FIELDS, OPERATORS, applyFilters, countActiveRules, isRuleComplete, matchesFilters, newRule,
  parseFilterGroup, ruleMatches, withOperator, quickValues, setQuickValues,
} from "./filter-rules"
import type { FilterGroup, FilterRule } from "./types"

const QUICK = { quickValues, setQuickValues }
const NOW = Date.parse("2026-10-20T12:00:00Z")
const rule = (field: string, op: string, value: unknown = null): FilterRule => ({ field, op, value })
const test = (c: ReturnType<typeof makeContract>, r: FilterRule) => ruleMatches(c, r, NOW)

describe("field catalogue", () => {
  it("gives every field operators of its type and enum fields their options", () => {
    for (const f of FILTER_FIELDS) {
      expect(OPERATORS[f.type].length).toBeGreaterThan(0)
      if (f.type === "enum") expect(f.options?.length).toBeGreaterThan(0)
    }
  })
  it("starts a new rule with the first operator and an empty value", () => {
    expect(newRule("stage")).toEqual({ field: "stage", op: "any_of", value: [] })
    expect(newRule("counterparty")).toEqual({ field: "counterparty", op: "contains", value: "" })
    expect(newRule("value")).toEqual({ field: "value", op: "eq", value: null })
    expect(newRule("hasValue")).toEqual({ field: "hasValue", op: "is_true", value: null })
  })
  it("keeps the value when the operator changes within the same kind, and resets it otherwise", () => {
    expect(withOperator(rule("value", "gt", 5), "lte").value).toBe(5)
    expect(withOperator(rule("termEndDate", "before", "2026-01-01"), "after").value).toBe("2026-01-01")
    expect(withOperator(rule("termEndDate", "before", "2026-01-01"), "within_next_days").value).toBeNull()
    expect(withOperator(rule("counterparty", "contains", "acme"), "is_empty").value).toBeNull()
  })
})

describe("isRuleComplete", () => {
  it("ignores unknown fields, foreign operators and missing values", () => {
    expect(isRuleComplete(rule("nope", "is", "x"))).toBe(false)
    expect(isRuleComplete(rule("stage", "contains", "x"))).toBe(false)
    expect(isRuleComplete(rule("stage", "any_of", []))).toBe(false)
    expect(isRuleComplete(rule("counterparty", "contains", "  "))).toBe(false)
    expect(isRuleComplete(rule("value", "gt", ""))).toBe(false)
    expect(isRuleComplete(rule("termEndDate", "before", "soon"))).toBe(false)
    expect(isRuleComplete(rule("termEndDate", "within_next_days", -1))).toBe(false)
  })
  it("accepts value-less operators and numeric strings", () => {
    expect(isRuleComplete(rule("department", "is_empty"))).toBe(true)
    expect(isRuleComplete(rule("hasValue", "is_false"))).toBe(true)
    expect(isRuleComplete(rule("value", "gte", "1000"))).toBe(true)
  })
})

describe("text operators", () => {
  const c = makeContract({ counterparty: "Northfield Diagnostics, Inc.", department: null, owner: { email: "Ana@Uni.edu", name: "Ana" } })
  it("contains / is / is not ignore case", () => {
    expect(test(c, rule("counterparty", "contains", "DIAG"))).toBe(true)
    expect(test(c, rule("counterparty", "contains", "acme"))).toBe(false)
    expect(test(c, rule("owner", "is", "ana@uni.edu"))).toBe(true)
    expect(test(c, rule("owner", "is_not", "ana@uni.edu"))).toBe(false)
  })
  it("a missing value is empty, and is not anything", () => {
    expect(test(c, rule("department", "is_empty"))).toBe(true)
    expect(test(c, rule("department", "is_not_empty"))).toBe(false)
    expect(test(c, rule("department", "is_not", "chemistry"))).toBe(true)
    expect(test(c, rule("department", "contains", "chem"))).toBe(false)
  })
  it("counterparty falls back to the sponsor", () => {
    expect(test(makeContract({ counterparty: null, sponsor: "NIH" }), rule("counterparty", "is", "nih"))).toBe(true)
  })
})

describe("enum operators", () => {
  const c = makeContract({ stage: "review", overallRisk: null, slaStatus: "red" })
  it("is any of / is none of", () => {
    expect(test(c, rule("stage", "any_of", ["review", "approval"]))).toBe(true)
    expect(test(c, rule("stage", "none_of", ["review"]))).toBe(false)
    expect(test(c, rule("slaStatus", "any_of", ["red"]))).toBe(true)
  })
  it("risk not assessed is its own choice", () => {
    expect(test(c, rule("risk", "any_of", ["none"]))).toBe(true)
    expect(test(c, rule("risk", "any_of", ["high", "critical"]))).toBe(false)
  })
})

describe("number operators", () => {
  const c = makeContract({ value: 250_000, daysInStage: 7, openBlockers: 0 })
  const unknown = makeContract({ value: null })
  it("compares", () => {
    expect(test(c, rule("value", "eq", 250_000))).toBe(true)
    expect(test(c, rule("value", "neq", 250_000))).toBe(false)
    expect(test(c, rule("value", "gt", 250_000))).toBe(false)
    expect(test(c, rule("value", "gte", 250_000))).toBe(true)
    expect(test(c, rule("daysInStage", "lt", 10))).toBe(true)
    expect(test(c, rule("openBlockers", "lte", 0))).toBe(true)
  })
  it("an unknown value is never above or below anything, but is empty and is ≠", () => {
    expect(test(unknown, rule("value", "gt", 0))).toBe(false)
    expect(test(unknown, rule("value", "lt", 1e12))).toBe(false)
    expect(test(unknown, rule("value", "eq", 0))).toBe(false)
    expect(test(unknown, rule("value", "neq", 0))).toBe(true)
    expect(test(unknown, rule("value", "is_empty"))).toBe(true)
    expect(test(c, rule("value", "is_empty"))).toBe(false)
  })
})

describe("date operators", () => {
  const c = makeContract({ termEndDate: "2026-11-15", requestedDate: "2026-09-30T08:00:00Z" })
  it("before / after by calendar day", () => {
    expect(test(c, rule("termEndDate", "before", "2026-11-16"))).toBe(true)
    expect(test(c, rule("termEndDate", "before", "2026-11-15"))).toBe(false)
    expect(test(c, rule("termEndDate", "after", "2026-11-14"))).toBe(true)
    expect(test(c, rule("requestedDate", "after", "2026-09-30"))).toBe(false)
  })
  it("within the next N days counts from today and excludes the past", () => {
    expect(test(c, rule("termEndDate", "within_next_days", 30))).toBe(true)
    expect(test(c, rule("termEndDate", "within_next_days", 20))).toBe(false)
    expect(test(makeContract({ termEndDate: "2026-10-20" }), rule("termEndDate", "within_next_days", 0))).toBe(true)
    expect(test(makeContract({ termEndDate: "2026-10-01" }), rule("termEndDate", "within_next_days", 90))).toBe(false)
  })
  it("a missing date is empty and matches no comparison", () => {
    const none = makeContract({ termEndDate: null })
    expect(test(none, rule("termEndDate", "is_empty"))).toBe(true)
    expect(test(none, rule("termEndDate", "before", "2100-01-01"))).toBe(false)
    expect(test(none, rule("termEndDate", "within_next_days", 9999))).toBe(false)
  })
})

describe("bool operators", () => {
  it("has value", () => {
    expect(test(makeContract({ value: 1 }), rule("hasValue", "is_true"))).toBe(true)
    expect(test(makeContract({ value: null }), rule("hasValue", "is_true"))).toBe(false)
    expect(test(makeContract({ value: null }), rule("hasValue", "is_false"))).toBe(true)
  })
})

describe("matchesFilters / applyFilters", () => {
  const a = makeContract({ stage: "review", value: 50_000 })
  const b = makeContract({ stage: "signed", value: 500_000 })
  const c = makeContract({ stage: "approval", value: null })
  const rules = [rule("stage", "any_of", ["review", "approval"]), rule("value", "gt", 100_000)]

  it("all: every complete rule must hold", () => {
    const g: FilterGroup = { match: "all", rules }
    expect(applyFilters([a, b, c], g, NOW)).toEqual([])
    expect(applyFilters([a, b, c], { match: "all", rules: [rules[0]] }, NOW)).toEqual([a, c])
  })
  it("any: one rule is enough", () => {
    expect(applyFilters([a, b, c], { match: "any", rules }, NOW)).toEqual([a, b, c])
  })
  it("unfinished rules are skipped, so a half-built filter changes nothing", () => {
    const g: FilterGroup = { match: "all", rules: [rule("stage", "any_of", []), rule("value", "gt", "")] }
    expect(applyFilters([a, b, c], g, NOW)).toEqual([a, b, c])
    expect(countActiveRules(g)).toBe(0)
    expect(matchesFilters(a, { match: "any", rules: [rule("stage", "any_of", []), rule("stage", "any_of", ["signed"])] }, NOW)).toBe(false)
  })
})

describe("parseFilterGroup", () => {
  it("drops malformed and unknown rules, defaults the match and caps at 25", () => {
    const many = Array.from({ length: 30 }, () => rule("value", "gt", 1))
    expect(parseFilterGroup({ match: "any", rules: many }).rules).toHaveLength(25)
    expect(parseFilterGroup({ rules: [rule("nope", "is", 1), { field: 3 }, rule("stage", "any_of", ["review"])] })).toEqual({
      match: "all", rules: [rule("stage", "any_of", ["review"])],
    })
    expect(parseFilterGroup(null)).toEqual({ match: "all", rules: [] })
    expect(parseFilterGroup("x")).toEqual({ match: "all", rules: [] })
  })
})

describe("quick filters", () => {
  it("read and write one rule per field, keeping its place", () => {
    const { quickValues, setQuickValues } = QUICK
    let g: FilterGroup = { match: "all", rules: [rule("value", "gt", 5)] }
    expect(quickValues(g, "stage")).toEqual([])
    g = setQuickValues(g, "stage", ["review"])
    expect(g.rules).toEqual([rule("value", "gt", 5), rule("stage", "any_of", ["review"])])
    g = setQuickValues({ ...g, rules: [g.rules[1], g.rules[0]] }, "stage", ["review", "signed"])
    expect(g.rules[0]).toEqual(rule("stage", "any_of", ["review", "signed"]))
    expect(quickValues(g, "stage")).toEqual(["review", "signed"])
    g = setQuickValues(g, "owner", ["me@x.edu"])
    expect(quickValues(g, "owner")).toEqual(["me@x.edu"])
    expect(setQuickValues(g, "stage", []).rules.some((r) => r.field === "stage")).toBe(false)
  })
})
