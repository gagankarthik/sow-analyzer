import { describe, expect, it } from "vitest"
import { contractRef, defaultPhase, phaseStages, riskBars, toggleHidden, visibleProperties } from "./list-properties"
import { STAGES } from "./labels"

describe("visibleProperties", () => {
  it("keeps column order, drops hidden ones and never shows the name", () => {
    expect(visibleProperties(["title", "stage", "owner", "risk", "value"], ["risk"])).toEqual(["stage", "owner", "value"])
  })

  it("shows nothing when every property is hidden", () => {
    expect(visibleProperties(["title", "stage"], ["stage"])).toEqual([])
  })
})

describe("toggleHidden", () => {
  it("hides once and shows again", () => {
    const hidden = toggleHidden([], "risk", false)
    expect(hidden).toEqual(["risk"])
    expect(toggleHidden(toggleHidden(hidden, "risk", false), "risk", false)).toEqual(["risk"])
    expect(toggleHidden(hidden, "risk", true)).toEqual([])
  })
})

describe("riskBars", () => {
  it("fills one bar per level and none when not assessed", () => {
    expect([riskBars(null), riskBars("low"), riskBars("medium"), riskBars("high"), riskBars("critical")]).toEqual([0, 1, 2, 3, 4])
  })
})

describe("contractRef", () => {
  it("uses the Huron record, then the Workday reference, else nothing", () => {
    expect(contractRef({ huronRecordId: "AGR-0042", workdayRef: "W-9" })).toBe("AGR-0042")
    expect(contractRef({ huronRecordId: " ", workdayRef: "W-9" })).toBe("W-9")
    expect(contractRef({ huronRecordId: null, workdayRef: null })).toBeNull()
  })
})

describe("board phases", () => {
  it("splits the stages at signature and has them all together", () => {
    expect(phaseStages("before")).toEqual(["draft", "review", "negotiation", "approval"])
    expect(phaseStages("after")).toEqual(["signed", "active", "renewal", "expired"])
    expect(phaseStages("all")).toEqual(STAGES)
  })

  it("opens on the side that has agreements, before signature first", () => {
    expect(defaultPhase((s) => (s === "review" ? 2 : 1))).toBe("before")
    expect(defaultPhase((s) => (s === "active" ? 3 : 0))).toBe("after")
    expect(defaultPhase(() => 0)).toBe("before")
  })
})
