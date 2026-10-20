import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import {
  configFromSettings, defaultSettings, groupingFor, normalizeColumnOrder, presetById, sameSettings, settingsFromConfig, splitSavedViews,
} from "./list-views"
import type { SavedView } from "./types"

const D = { ids: ["title", "stage", "days", "owner"], hidden: ["owner"], sort: { key: "days", dir: "desc" as const } }

describe("normalizeColumnOrder", () => {
  it("drops unknown ids, removes repeats and slots new columns after their default neighbour", () => {
    expect(normalizeColumnOrder(["days", "gone", "title", "days"], D.ids)).toEqual(["days", "owner", "title", "stage"])
    expect(normalizeColumnOrder([], D.ids)).toEqual(D.ids)
  })
})

describe("settings from a saved config", () => {
  it("round-trips", () => {
    const s = { ...defaultSettings(D), groupBy: "stage", density: "compact" as const }
    const back = settingsFromConfig(configFromSettings("signed", s), D, "comfortable")
    expect(sameSettings(back, s)).toBe(true)
  })
  it("falls back on anything malformed", () => {
    const s = settingsFromConfig({ groupBy: "nope", sort: { key: 3 } as never, density: "huge" as never, columns: { order: "x" as never, hidden: [1] as never } }, D, "compact")
    expect(s.groupBy).toBeNull()
    expect(s.sort).toEqual(D.sort)
    expect(s.density).toBe("compact")
    expect(s.columns).toEqual({ order: D.ids, hidden: [] })
  })
  it("keeps an explicit 'no sort'", () => {
    expect(settingsFromConfig({ sort: null }, D, "comfortable").sort).toBeNull()
  })
  it("compares hidden columns as a set", () => {
    const a = { ...defaultSettings(D), columns: { order: D.ids, hidden: ["a", "b"] } }
    const b = { ...defaultSettings(D), columns: { order: D.ids, hidden: ["b", "a"] } }
    expect(sameSettings(a, b)).toBe(true)
  })
})

describe("presets and grouping", () => {
  it("finds default and quick views", () => {
    expect(presetById("my-contracts")?.label).toBe("My contracts")
    expect(presetById("signed")).toBeDefined()
    expect(presetById("x")).toBeUndefined()
  })
  it("groups by owner with unassigned last", () => {
    const rows = [makeContract({ owner: { email: "B@x.edu", name: "Bea" } }), makeContract({ owner: null }), makeContract({ owner: { email: "a@x.edu", name: "Al" } })]
    const g = groupingFor("owner", rows)!
    expect(rows.map(g.key)).toEqual(["b@x.edu", "", "a@x.edu"])
    expect(g.order).toEqual(["a@x.edu", "b@x.edu", ""])
    expect(g.label("")).toBe("Unassigned")
    expect(g.label("b@x.edu")).toBe("Bea")
    expect(groupingFor(null, rows)).toBeNull()
  })
})

describe("splitSavedViews", () => {
  const v = (id: string, name: string, email: string) => ({ id, name, createdBy: { email, name: null } }) as SavedView
  it("puts mine first, each by name", () => {
    const { mine, shared } = splitSavedViews([v("1", "Zed", "me@x"), v("2", "Alpha", "other@x"), v("3", "Beta", "ME@x")], "me@x")
    expect(mine.map((x) => x.id)).toEqual(["3", "1"])
    expect(shared.map((x) => x.id)).toEqual(["2"])
  })
})
