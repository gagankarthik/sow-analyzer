import { describe, expect, it } from "vitest"
import { addableMembers, personLabel, removeBlockedReason } from "./org-admins"
import type { GovernOrg, OrgAdmin } from "./types"

const dana: OrgAdmin = { sub: "a", email: "dana@uni.edu", name: "Dana", addedAt: null, isCreator: true, addedBy: null }
const eli: OrgAdmin = { sub: "b", email: "eli@uni.edu", name: null, addedAt: null, isCreator: false, addedBy: null }

function org(over: Partial<GovernOrg> = {}): GovernOrg {
  return {
    tenantId: "acme", name: null, personal: false, createdBy: dana, createdAt: null, admins: [dana, eli], rev: 2,
    you: { isAdmin: true, isCreator: true },
    members: [dana, eli, { sub: "c", email: "avery@uni.edu", name: "Avery" }, { sub: "d", email: null, name: "No mail" }],
    ...over,
  }
}

describe("removeBlockedReason", () => {
  it("never offers to remove the creator", () => {
    expect(removeBlockedReason(org(), dana)).toMatch(/Created the organization/)
  })

  it("lets an admin remove another admin", () => {
    expect(removeBlockedReason(org(), eli)).toBeNull()
  })

  it("keeps the last admin", () => {
    const solo = { ...eli, isCreator: false }
    expect(removeBlockedReason(org({ admins: [solo], createdBy: null }), solo)).toMatch(/at least one admin/)
  })

  it("is read-only for non-admins and in a personal workspace", () => {
    expect(removeBlockedReason(org({ you: { isAdmin: false, isCreator: false } }), eli)).toMatch(/Only admins/)
    expect(removeBlockedReason(org({ personal: true }), eli)).toMatch(/personal workspace/)
  })
})

describe("addableMembers", () => {
  it("lists signed-in members with an email who are not admins yet", () => {
    expect(addableMembers(org()).map((m) => m.sub)).toEqual(["c"])
  })

  it("is empty when the server sent no members (non-admins)", () => {
    expect(addableMembers(org({ members: undefined }))).toEqual([])
  })
})

describe("personLabel", () => {
  it("prefers the name, then the email", () => {
    expect(personLabel(dana)).toBe("Dana")
    expect(personLabel(eli)).toBe("eli@uni.edu")
    expect(personLabel({ email: null, name: " " })).toBe("Unknown person")
  })
})
