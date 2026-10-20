import { describe, expect, it } from "vitest"
import { activityCounts, activityTotal, filterActivity, mergeActivity } from "./activity"
import type { ActivityEntry } from "./types"

const entry = (id: string, at: string, action: ActivityEntry["action"], summary = "", actor: ActivityEntry["actor"] = null): ActivityEntry => ({
  id, at, action, summary, actor, fromStage: null, toStage: null, detail: null,
})

const A = entry("a", "2026-10-03T10:00:00Z", "comment", "Looks fine", { email: "ana@uni.edu", name: "Ana Ruiz" })
const B = entry("b", "2026-10-02T10:00:00Z", "sent_back", "Sent back with 3 clauses")
const C = entry("c", "2026-10-01T10:00:00Z", "blocker_added", "Governing law")

describe("mergeActivity", () => {
  it("joins the detail's entries with older pages, newest first, once each", () => {
    // The detail may carry the latest send-back after its newest entries; the page brings it again.
    const merged = mergeActivity([A, B], [{ entries: [B, C] }])
    expect(merged.map((e) => e.id)).toEqual(["a", "b", "c"])
  })
})

describe("filterActivity", () => {
  it("filters by type and searches summary, label and person", () => {
    expect(filterActivity([A, B, C], "comments", "").map((e) => e.id)).toEqual(["a"])
    expect(filterActivity([A, B, C], "all", "ana").map((e) => e.id)).toEqual(["a"])
    expect(filterActivity([A, B, C], "all", "governing").map((e) => e.id)).toEqual(["c"])
    expect(filterActivity([A, B, C], "decisions", "sent back").map((e) => e.id)).toEqual(["b"])
    expect(filterActivity([A, B, C], "all", "sonar").map((e) => e.id)).toEqual(["b", "c"])
  })

  it("counts each type for the chips", () => {
    expect(activityCounts([A, B, C])).toMatchObject({ all: 3, comments: 1, decisions: 1, items: 1, stage: 0 })
  })
})

describe("activityTotal", () => {
  it("uses the server's count, else what came (older APIs)", () => {
    expect(activityTotal({ activity: [A], activityCount: 57 })).toEqual({ count: 57, label: "57" })
    expect(activityTotal({ activity: [A], activityCount: 200, activityHasMore: true })).toEqual({ count: 200, label: "200+" })
    expect(activityTotal({ activity: [A, B, C] })).toEqual({ count: 3, label: "3" })
  })
})
