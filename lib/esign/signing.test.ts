import { describe, expect, it } from "vitest"
import {
  IMAGE_LIMITS, canFinish, completeBody, dataUrlBytes, fitImageSize, initialsOf, inkBounds, isSignToken,
  signedDateText, signingProgress, type SignerField, type SigningState,
} from "./signing"

const field = (id: string, type: SignerField["type"], extra: Partial<SignerField> = {}): SignerField => ({
  id, type, page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.05, required: false, label: null, ...extra,
})

const empty: SigningState = { consent: false, values: {}, signature: null, initials: null }

const FIELDS: SignerField[] = [
  field("sig", "signature", { page: 1, y: 0.8 }),
  field("ini", "initials", { page: 0, y: 0.9 }),
  field("name", "name", { required: true, y: 0.2 }),
  field("note", "text", { y: 0.3 }),
  field("ok", "checkbox", { required: true, y: 0.5 }),
  field("date", "date", { required: true }),
  field("mail", "email", { required: true }),
]

describe("isSignToken", () => {
  it("accepts only the 43-character URL-safe token", () => {
    expect(isSignToken("A".repeat(43))).toBe(true)
    expect(isSignToken("A".repeat(42))).toBe(false)
    expect(isSignToken(`${"A".repeat(42)}!`)).toBe(false)
    expect(isSignToken(null)).toBe(false)
  })
})

describe("signingProgress", () => {
  it("counts signature, initials and required fields; date and email are automatic", () => {
    expect(signingProgress(FIELDS, empty)).toEqual({ done: 0, total: 4, nextId: "name" })
  })

  it("walks the open fields in reading order, wrapping after the last", () => {
    const state: SigningState = { ...empty, values: { name: "Ada" } }
    expect(signingProgress(FIELDS, state).nextId).toBe("ok")
    expect(signingProgress(FIELDS, state, "ok").nextId).toBe("ini")
    expect(signingProgress(FIELDS, state, "sig").nextId).toBe("ok")
  })

  it("treats blank text as not done", () => {
    expect(signingProgress(FIELDS, { ...empty, values: { name: "   " } }).done).toBe(0)
  })
})

describe("canFinish and completeBody", () => {
  const full: SigningState = {
    consent: true,
    values: { name: " Ada Lovelace ", ok: "true" },
    signature: { image: "data:image/png;base64,AAAA", kind: "typed" },
    initials: { image: "data:image/png;base64,BBBB" },
  }

  it("needs consent and every required field", () => {
    expect(canFinish(FIELDS, full)).toBe(true)
    expect(canFinish(FIELDS, { ...full, consent: false })).toBe(false)
    expect(canFinish(FIELDS, { ...full, initials: null })).toBe(false)
  })

  it("sends name, text and checkbox values only, plus the adopted images", () => {
    expect(completeBody(FIELDS, full)).toEqual({
      consent: true,
      values: { name: "Ada Lovelace", note: "", ok: "true" },
      signature: { image: "data:image/png;base64,AAAA", kind: "typed" },
      initials: { image: "data:image/png;base64,BBBB" },
    })
  })

  it("leaves out images the document has no field for", () => {
    const body = completeBody([field("t", "text")], full)
    expect(body.signature).toBeUndefined()
    expect(body.initials).toBeUndefined()
  })
})

describe("initialsOf and signedDateText", () => {
  it("takes up to three initials", () => {
    expect(initialsOf("Ada King-Lovelace")).toBe("AKL")
    expect(initialsOf("  jean   luc picard de la barre")).toBe("JLP")
    expect(initialsOf("")).toBe("")
  })

  it("writes the date the way the server stamps it", () => {
    expect(signedDateText(new Date(2026, 9, 3))).toBe("October 3, 2026")
  })
})

describe("signature image sizing", () => {
  it("finds the inked box in RGBA data, padded and clamped", () => {
    const w = 10, h = 6
    const data = new Uint8ClampedArray(w * h * 4)
    data[(2 * w + 3) * 4 + 3] = 255
    data[(4 * w + 7) * 4 + 3] = 255
    expect(inkBounds(data, w, h)).toEqual({ x: 3, y: 2, w: 5, h: 3 })
    expect(inkBounds(data, w, h, 4)).toEqual({ x: 0, y: 0, w: 10, h: 6 })
    expect(inkBounds(new Uint8ClampedArray(w * h * 4), w, h)).toBeNull()
  })

  it("scales down to the limits, never up, and pads to the minimum", () => {
    expect(fitImageSize(3000, 600)).toEqual({ w: 1200, h: 240 })
    expect(fitImageSize(800, 1600)).toEqual({ w: 200, h: 400 })
    expect(fitImageSize(300, 100)).toEqual({ w: 300, h: 100 })
    expect(fitImageSize(5, 3)).toEqual({ w: IMAGE_LIMITS.minW, h: IMAGE_LIMITS.minH })
  })

  it("measures a data URL's decoded size", () => {
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3)
    expect(dataUrlBytes("data:image/png;base64,AAA=")).toBe(2)
    expect(dataUrlBytes("data:image/png;base64,AA==")).toBe(1)
  })
})
