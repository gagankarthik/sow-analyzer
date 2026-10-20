import { describe, expect, it } from "vitest"
import { chunk, mergeBulkResponses } from "./bulk"

describe("chunk", () => {
  it("splits into runs of at most the size", () => {
    const ids = Array.from({ length: 450 }, (_, i) => `c-${i}`)
    const parts = chunk(ids, 200)
    expect(parts.map((p) => p.length)).toEqual([200, 200, 50])
    expect(parts.flat()).toEqual(ids)
  })
  it("returns nothing for nothing", () => {
    expect(chunk([], 200)).toEqual([])
  })
  it("rejects a size below one", () => {
    expect(() => chunk([1], 0)).toThrow()
  })
})

describe("mergeBulkResponses", () => {
  it("adds up updates and lists failures, including whole failed requests", () => {
    const merged = mergeBulkResponses([
      { ok: true, ids: ["a", "b"], response: { updated: 1, results: [{ contractId: "a", ok: true }, { contractId: "b", ok: false, error: { code: "forbidden", message: "No access" } }] } },
      { ok: false, ids: ["c"], message: "Network down" },
    ])
    expect(merged.updated).toBe(1)
    expect(merged.results).toHaveLength(3)
    expect(merged.failed.map((f) => [f.contractId, f.error.message])).toEqual([["b", "No access"], ["c", "Network down"]])
  })
})
