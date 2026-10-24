import { describe, expect, it } from "vitest"
import { daysPastTarget } from "./stage-time"

describe("daysPastTarget", () => {
  it("counts the days beyond the target", () => {
    expect(daysPastTarget(8, 5)).toBe(3)
  })
  it("is null on or before the target", () => {
    expect(daysPastTarget(5, 5)).toBeNull()
    expect(daysPastTarget(2, 5)).toBeNull()
  })
  it("is null without a target", () => {
    expect(daysPastTarget(40, null)).toBeNull()
    expect(daysPastTarget(40, undefined)).toBeNull()
    expect(daysPastTarget(40, 0)).toBeNull()
  })
})
