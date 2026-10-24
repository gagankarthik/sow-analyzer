import { describe, expect, it } from "vitest"
import { stageGlyph, wedgePath } from "./stage-icon"
import { STAGES } from "./labels"

describe("stageGlyph", () => {
  it("draws a new contract as a dashed ring", () => {
    expect(stageGlyph("draft")).toEqual({ kind: "dashed" })
  })

  it("fills a quarter per review step on the way to signature", () => {
    expect(stageGlyph("review")).toEqual({ kind: "progress", fraction: 0.25 })
    expect(stageGlyph("negotiation")).toEqual({ kind: "progress", fraction: 0.5 })
    expect(stageGlyph("approval")).toEqual({ kind: "progress", fraction: 0.75 })
  })

  it("checks signed and active, clocks renewal, minuses closed out", () => {
    expect(stageGlyph("signed")).toEqual({ kind: "filled", mark: "check" })
    expect(stageGlyph("active")).toEqual({ kind: "filled", mark: "check" })
    expect(stageGlyph("renewal")).toEqual({ kind: "clock" })
    expect(stageGlyph("expired")).toEqual({ kind: "filled", mark: "minus" })
  })

  it("marks a rejected contract with a cross whatever its stage", () => {
    for (const s of STAGES) expect(stageGlyph(s, "rejected")).toEqual({ kind: "filled", mark: "x" })
  })

  it("has a glyph for every stage", () => {
    for (const s of STAGES) expect(stageGlyph(s)).toBeTruthy()
  })
})

describe("wedgePath", () => {
  it("is empty at zero", () => {
    expect(wedgePath(0, 8, 8, 4)).toBe("")
  })

  it("starts at twelve o'clock and uses the large arc past half", () => {
    expect(wedgePath(0.25, 8, 8, 4)).toBe("M8 8L8 4A4 4 0 0 1 12 8Z")
    expect(wedgePath(0.5, 8, 8, 4)).toBe("M8 8L8 4A4 4 0 0 1 8 12Z")
    expect(wedgePath(0.75, 8, 8, 4)).toBe("M8 8L8 4A4 4 0 1 1 4 8Z")
  })

  it("draws a whole disc at one and clamps beyond it", () => {
    expect(wedgePath(1, 8, 8, 4)).toBe(wedgePath(2, 8, 8, 4))
    expect(wedgePath(1, 8, 8, 4)).toContain("A4 4 0 1 1 8 12")
  })
})
