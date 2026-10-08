import { afterEach, describe, expect, it, vi } from "vitest"
import { editionHas, resolveEdition } from "./edition"

afterEach(() => vi.unstubAllEnvs())

describe("editions", () => {
  it("defaults to Campus and lets the organization's setting win", () => {
    vi.stubEnv("NEXT_PUBLIC_GOVERN_EDITION", "")
    expect(resolveEdition(null)).toBe("campus")
    expect(resolveEdition("workforce")).toBe("workforce")
    vi.stubEnv("NEXT_PUBLIC_GOVERN_EDITION", "workforce")
    expect(resolveEdition(undefined)).toBe("workforce")
    expect(resolveEdition("campus")).toBe("campus")
    expect(resolveEdition("something else")).toBe("workforce")
  })

  it("hides SOW features from Campus and keeps them in Workforce", () => {
    expect(editionHas("campus", "sowDrafting")).toBe(false)
    expect(editionHas("campus", "commercialPlaybook")).toBe(false)
    expect(editionHas("workforce", "sowDrafting")).toBe(true)
    expect(editionHas("workforce", "commercialPlaybook")).toBe(true)
  })
})
