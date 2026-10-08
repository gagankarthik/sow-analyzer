import { describe, expect, it } from "vitest"
import { GOVERN_FEATURE_KEYS, GOVERN_FEATURE_LABEL, parseFeatureList, resolveFeatures } from "./features"

describe("parseFeatureList", () => {
  it("reads camelCase and snake_case names and ignores unknown ones", () => {
    expect([...parseFeatureList("exports, routing_rules,DocuSign,bogus,")].sort()).toEqual(["docusign", "exports", "routingRules"])
  })

  it("treats empty or missing as nothing switched on", () => {
    expect(parseFeatureList("").size).toBe(0)
    expect(parseFeatureList(undefined).size).toBe(0)
  })
})

describe("resolveFeatures", () => {
  it("has every later feature off by default", () => {
    expect(Object.values(resolveFeatures(undefined)).every((on) => on === false)).toBe(true)
  })

  it("switches on what the build-time list names", () => {
    const flags = resolveFeatures("exports,docusign")
    expect(flags.exports).toBe(true)
    expect(flags.docusign).toBe(true)
    expect(flags.notifications).toBe(false)
  })

  it("lets the server's answer win, in both directions", () => {
    const flags = resolveFeatures("exports", { exports: false, obligations: true })
    expect(flags.exports).toBe(false)
    expect(flags.obligations).toBe(true)
  })

  it("falls back to the build-time list for features the server does not mention", () => {
    expect(resolveFeatures("integrations", { exports: false }).integrations).toBe(true)
  })
})

it("labels every feature", () => {
  for (const key of GOVERN_FEATURE_KEYS) expect(GOVERN_FEATURE_LABEL[key].title).toBeTruthy()
})
