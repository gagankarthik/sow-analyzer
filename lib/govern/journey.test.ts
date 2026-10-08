import { describe, expect, it } from "vitest"
import { makeContract } from "./__fixtures__/contract"
import { contractJourney } from "./journey"
import type { ActivityEntry, ContractDetail } from "./types"

function detail(over: Partial<ContractDetail> = {}): ContractDetail {
  return {
    ...makeContract(),
    blockers: [], obligations: [], licensingIncome: [], review: null, activity: [], versions: [],
    ...over,
  } as ContractDetail
}

function act(action: string, at: string): ActivityEntry {
  return { id: `${action}-${at}`, at, actor: null, action: action as ActivityEntry["action"], fromStage: null, toStage: null, summary: "", detail: null }
}

const statuses = (c: ContractDetail) => Object.fromEntries(contractJourney(c).steps.map((s) => [s.id, s.status]))

describe("contractJourney", () => {
  it("starts at draft with everything ahead", () => {
    expect(statuses(detail({ stage: "draft" }))).toEqual({
      draft: "current", review: "upcoming", redlines: "upcoming", edits: "upcoming",
      approval: "upcoming", signature: "upcoming", signed: "upcoming",
    })
  })

  it("puts redlines in focus while waiting on the other side's revision", () => {
    const s = statuses(detail({
      stage: "negotiation",
      activity: [act("sent_back", "2026-10-01T10:00:00Z")],
    }))
    expect(s.redlines).toBe("current")
    expect(s.edits).toBe("upcoming")
  })

  it("puts edits in focus once their revision is back", () => {
    const c = detail({
      stage: "negotiation",
      activity: [act("sent_back", "2026-10-01T10:00:00Z"), act("revision_received", "2026-10-05T10:00:00Z")],
    })
    const s = statuses(c)
    expect(s.redlines).toBe("done")
    expect(s.edits).toBe("current")
    expect(contractJourney(c).steps.find((x) => x.id === "edits")!.fact).toBe("1 revised version, latest 2026-10-05")
  })

  it("marks redlines and edits as not needed when a clean contract went straight to approval", () => {
    const c = detail({ stage: "approval" })
    const s = statuses(c)
    expect(s.redlines).toBe("skipped")
    expect(s.edits).toBe("skipped")
    expect(s.approval).toBe("current")
  })

  it("completes every reached step once signed", () => {
    const c = detail({ stage: "signed", signedAt: "2026-10-07T09:00:00Z", activity: [act("sent_back", "2026-09-01T00:00:00Z")] })
    const s = statuses(c)
    expect(s.signed).toBe("done")
    expect(s.signature).toBe("done")
    expect(s.approval).toBe("done")
    expect(contractJourney(c).steps.at(-1)!.fact).toBe("Signed 2026-10-07")
  })

  it("reports a rejected contract as ended", () => {
    expect(contractJourney(detail({ stage: "review", state: "rejected" })).ended).toBe("rejected")
  })
})
