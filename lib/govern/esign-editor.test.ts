import { describe, expect, it } from "vitest"
import type { Recipient } from "@/lib/esign/types"
import {
  MIN_FIELD, NO_SIGNER_COLOR, SIGNER_COLORS, buildEnvelopeInput, clampRect, clientToFraction, defaultFieldSize, dueSigners,
  moveRect, moveRecipient, nextRecipientId, placeAt, recipientProblem, resizeRect, reviewIssues, signerColor, signerColorIndex,
  toPageFraction, type DraftRecipient, type EnvelopeDraft,
} from "./esign-editor"

const LETTER = { width: 612, height: 792 }
const A4 = { width: 595, height: 842 }

function draft(over: Partial<EnvelopeDraft> = {}): EnvelopeDraft {
  return {
    name: "Master agreement", subject: "", message: "", signingOrder: "sequential", expiresInDays: 14, reminderEveryDays: 3,
    recipients: [], fields: [], ...over,
  }
}
const signer = (id: string, name: string, email: string): DraftRecipient => ({ id, name, email, role: "signer", order: 1 })

describe("geometry", () => {
  it("keeps a rect inside the page", () => {
    expect(clampRect({ x: 0.9, y: -0.2, w: 0.3, h: 0.1 })).toEqual({ x: 0.7, y: 0, w: 0.3, h: 0.1 })
    expect(clampRect({ x: 0.5, y: 0.5, w: 2, h: 0 })).toEqual({ x: 0, y: 0.5, w: 1, h: MIN_FIELD.h })
  })

  it("moves and stops at the edges", () => {
    expect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.1 }, 0.05, 0.02)).toEqual({ x: 0.15, y: 0.12, w: 0.2, h: 0.1 })
    expect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.1 }, 5, -5)).toEqual({ x: 0.8, y: 0, w: 0.2, h: 0.1 })
  })

  it("resizes from the corner, not past the page or below the minimum", () => {
    expect(resizeRect({ x: 0.7, y: 0.9, w: 0.2, h: 0.05 }, 0.5, 0.5)).toEqual({ x: 0.7, y: 0.9, w: 0.3, h: 0.1 })
    expect(resizeRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }, -1, -1)).toEqual({ x: 0.1, y: 0.1, w: MIN_FIELD.w, h: MIN_FIELD.h })
  })

  it("converts a pointer to page fractions through the inverse matrix", () => {
    // Page drawn at half size, offset 100,50 on screen: inverse = scale 2, translate -200,-100.
    const inverse = { a: 2, b: 0, c: 0, d: 2, e: -200, f: -100 }
    expect(clientToFraction(inverse, 253, 248, LETTER)).toEqual({ x: 306 / 612, y: 396 / 792 })
    expect(clientToFraction(inverse, 0, 9999, LETTER)).toEqual({ x: 0, y: 1 })
    expect(toPageFraction({ x: 612, y: 0 }, LETTER)).toEqual({ x: 1, y: 0 })
  })

  it("sizes new fields for the page and centres them on the click", () => {
    expect(defaultFieldSize("signature", LETTER)).toEqual({ w: 0.28, h: 0.06 })
    expect(defaultFieldSize("signature", A4).w).toBeCloseTo((0.28 * 612) / 595)
    const r = placeAt("date", { x: 0.5, y: 0.5 }, LETTER)
    expect(r.x + r.w / 2).toBeCloseTo(0.5)
    expect(placeAt("signature", { x: 1, y: 1 }, LETTER)).toEqual({ x: 0.72, y: 0.94, w: 0.28, h: 0.06 })
  })
})

describe("signer colours", () => {
  const rs = [signer("r3", "C", "c@x.org"), { ...signer("r1", "Copy", "cc@x.org"), role: "cc" as const }, signer("r2", "B", "b@x.org")]

  it("ranks signers by id, so reordering keeps colours", () => {
    expect(signerColorIndex(rs, "r2")).toBe(0)
    expect(signerColorIndex(rs, "r3")).toBe(1)
    expect(signerColorIndex(rs, "r1")).toBe(-1)
    expect(signerColorIndex([...rs].reverse(), "r3")).toBe(1)
    expect(signerColor(rs, "r1")).toBe(NO_SIGNER_COLOR)
  })

  it("gives ten signers ten colours", () => {
    const ten = Array.from({ length: 10 }, (_, i) => signer(`r${i + 1}`, `S${i}`, `s${i}@x.org`))
    expect(new Set(ten.map((r) => signerColor(ten, r.id).fill)).size).toBe(10)
    expect(SIGNER_COLORS).toHaveLength(10)
  })
})

describe("recipients", () => {
  it("picks the next free id", () => {
    expect(nextRecipientId([])).toBe("r1")
    expect(nextRecipientId([{ id: "r1" }, { id: "r3" }])).toBe("r2")
  })

  it("reorders and renumbers", () => {
    const rs = [signer("r1", "A", "a@x.org"), signer("r2", "B", "b@x.org"), signer("r3", "C", "c@x.org")]
    const moved = moveRecipient(rs, 2, 0, "sequential")
    expect(moved.map((r) => `${r.id}:${r.order}`)).toEqual(["r3:1", "r1:2", "r2:3"])
    expect(moveRecipient(rs, 0, 1, "parallel").every((r) => r.order === 1)).toBe(true)
  })

  it("names what is missing", () => {
    const a = signer("r1", "Jordan", "jordan@x.org")
    expect(recipientProblem(a, [a])).toBeNull()
    expect(recipientProblem({ ...a, name: " " }, [a])).toMatch(/add a name/)
    expect(recipientProblem({ ...a, email: "nope" }, [a])).toMatch(/valid email/)
    const twin = signer("r2", "Jo", "JORDAN@x.org")
    expect(recipientProblem(twin, [a, twin])).toMatch(/already a signer/)
  })
})

describe("buildEnvelopeInput", () => {
  it("sends recipients with ids, fields without ids, and settings", () => {
    const { input, skipped } = buildEnvelopeInput(draft({
      subject: "  ", message: " Please sign ",
      recipients: [signer("r1", " Jordan ", "Jordan@X.org"), { id: "r2", name: "Copy", email: "cc@x.org", role: "cc", order: 9 }],
      fields: [{ key: "k1", recipientId: "r1", type: "signature", page: 0, x: 0.9, y: 0.5, w: 0.28, h: 0.06, required: true, label: " " }],
    }))
    expect(skipped).toEqual([])
    expect(input).toEqual({
      name: "Master agreement", subject: null, message: "Please sign", signingOrder: "sequential", expiresInDays: 14, reminderEveryDays: 3,
      recipients: [
        { id: "r1", name: "Jordan", email: "jordan@x.org", role: "signer", order: 1 },
        { id: "r2", name: "Copy", email: "cc@x.org", role: "cc", order: 2 },
      ],
      fields: [{ recipientId: "r1", type: "signature", page: 0, x: 0.72, y: 0.5, w: 0.28, h: 0.06, required: true, label: null }],
    })
  })

  it("leaves out incomplete recipients and their fields", () => {
    const { input, skipped } = buildEnvelopeInput(draft({
      name: "",
      recipients: [signer("r1", "Jordan", "jordan@x.org"), signer("r2", "", "")],
      fields: [
        { key: "a", recipientId: "r2", type: "signature", page: 0, x: 0, y: 0, w: 0.2, h: 0.05, required: true, label: null },
        { key: "b", recipientId: "r9", type: "text", page: 0, x: 0, y: 0, w: 0.2, h: 0.05, required: true, label: null },
      ],
    }))
    expect(input.name).toBeUndefined()
    expect(input.recipients?.map((r) => r.id)).toEqual(["r1"])
    expect(input.fields).toEqual([])
    expect(skipped).toHaveLength(1)
  })
})

describe("review", () => {
  it("blocks a signer without a signature field", () => {
    const d = draft({ recipients: [signer("r1", "Jordan", "jordan@x.org")] })
    expect(reviewIssues(d).blocking).toEqual(["Jordan has no signature field."])
    const ready = { ...d, fields: [{ key: "a", recipientId: "r1", type: "signature" as const, page: 0, x: 0, y: 0, w: 0.2, h: 0.05, required: true, label: null }] }
    expect(reviewIssues(ready).blocking).toEqual([])
    expect(reviewIssues(draft()).blocking).toContain("Add at least one signer.")
  })
})

describe("dueSigners", () => {
  const r = (id: string, order: number, status: Recipient["status"], role: Recipient["role"] = "signer") =>
    ({ id, order, status, role }) as Recipient
  it("is the lowest unsigned order when sequential, everyone unsigned when parallel", () => {
    const rs = [r("r1", 1, "signed"), r("r2", 2, "sent"), r("r3", 2, "viewed"), r("r4", 3, "pending"), r("r5", 1, "pending", "cc")]
    expect(dueSigners(rs, "sequential").map((x) => x.id)).toEqual(["r2", "r3"])
    expect(dueSigners(rs, "parallel").map((x) => x.id)).toEqual(["r2", "r3", "r4"])
    expect(dueSigners([r("r1", 1, "signed")], "sequential")).toEqual([])
  })
})
