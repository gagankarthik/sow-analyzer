import { describe, expect, it } from "vitest"
import { contractPeople } from "./people"
import type { Contract } from "./types"

const base = {
  owner: null,
  routing: { required: [], approvals: [], reasons: [] },
  piRequest: null,
  rejection: null,
  signature: null,
} as unknown as Contract

describe("contractPeople", () => {
  it("is empty when the record names nobody", () => {
    expect(contractPeople(base)).toEqual([])
  })

  it("lists the owner first, then approvers and the signatory, once each", () => {
    const c = {
      ...base,
      owner: { email: "ana@uni.edu", name: "Ana Ruiz" },
      routing: {
        required: ["legal_affairs"],
        reasons: [],
        approvals: [
          { office: "legal_affairs", by: { email: "lee@uni.edu", name: "Lee Park" }, at: "2026-10-01" },
          { office: "reviewer", by: { email: "ANA@uni.edu", name: null }, at: "2026-10-02" },
        ],
      },
      signature: { provider: "manual", envelopeId: null, sentAt: null, signedAt: null, signatory: { email: "lee@uni.edu", name: "Lee Park" } },
    } as unknown as Contract

    const people = contractPeople(c)
    expect(people.map((p) => p.email)).toEqual(["ana@uni.edu", "lee@uni.edu"])
    expect(people[0].roles).toEqual(["Owner", "Approved as reviewer"])
    expect(people[1].roles).toEqual(["Approved for Legal Affairs", "Signatory"])
  })
})
