import { describe, expect, it } from "vitest"
import {
  MAX_UPLOAD_BYTES, checkPortalFile, expiryLabel, fileSizeText, isPortalToken, linkOpensText, linkTimingText,
  rebasePortalUrl, requestedDateText, validUntilText,
} from "./helpers"

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"

describe("isPortalToken", () => {
  it("accepts the 43-character URL-safe token only", () => {
    expect(TOKEN).toHaveLength(43)
    expect(isPortalToken(TOKEN)).toBe(true)
    expect(isPortalToken(TOKEN.slice(1))).toBe(false)
    expect(isPortalToken(`${TOKEN.slice(1)}!`)).toBe(false)
    expect(isPortalToken(undefined)).toBe(false)
  })
})

describe("rebasePortalUrl", () => {
  it("moves the link onto the origin the reviewer is using", () => {
    expect(rebasePortalUrl(`https://govern.blue-iq.ai/portal/${TOKEN}`, "http://localhost:3000"))
      .toBe(`http://localhost:3000/portal/${TOKEN}`)
  })
  it("leaves anything unexpected alone", () => {
    expect(rebasePortalUrl("https://x.example/other/path", "http://localhost:3000")).toBe("https://x.example/other/path")
    expect(rebasePortalUrl("not a url", "http://localhost:3000")).toBe("not a url")
    expect(rebasePortalUrl(`https://a.example/portal/${TOKEN}`, null)).toBe(`https://a.example/portal/${TOKEN}`)
  })
})

describe("checkPortalFile", () => {
  it("accepts PDF and Word files up to 25 MB", () => {
    expect(checkPortalFile({ name: "Revised.PDF", size: 1000 })).toEqual({ ok: true, contentType: "application/pdf" })
    expect(checkPortalFile({ name: "v2.docx", size: MAX_UPLOAD_BYTES })).toEqual({
      ok: true, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  })
  it("refuses other types, empty and oversized files", () => {
    expect(checkPortalFile({ name: "v2.doc", size: 10 }).ok).toBe(false)
    expect(checkPortalFile({ name: "v2.txt", size: 10 }).ok).toBe(false)
    expect(checkPortalFile({ name: "pdf", size: 10 }).ok).toBe(false)
    expect(checkPortalFile({ name: "a.pdf", size: 0 }).ok).toBe(false)
    expect(checkPortalFile({ name: "a.pdf", size: MAX_UPLOAD_BYTES + 1 })).toEqual({
      ok: false, error: "This file is larger than 25 MB. Upload a smaller version.",
    })
  })
})

describe("labels", () => {
  it("names the expiry choices", () => {
    expect([1, 3, 7, 14, 30, 60].map(expiryLabel)).toEqual(["1 day", "3 days", "1 week", "2 weeks", "30 days", "60 days"])
  })
  it("describes a link's timing", () => {
    const now = new Date("2026-10-20T12:00:00Z")
    expect(linkTimingText({ status: "active", expiresAt: "2026-10-25T12:00:00Z", revokedAt: null }, now)).toBe("Expires in 5 days")
    expect(linkTimingText({ status: "active", expiresAt: "2026-10-20T20:00:00Z", revokedAt: null }, now)).toBe("Expires within a day")
    expect(linkTimingText({ status: "expired", expiresAt: "2026-10-02T12:00:00Z", revokedAt: null }, now)).toBe("Expired Oct 2, 2026")
    expect(linkTimingText({ status: "revoked", expiresAt: "2026-10-25T12:00:00Z", revokedAt: "2026-10-19T08:00:00Z" }, now))
      .toBe("Revoked Oct 19, 2026")
  })
  it("counts opens in words", () => {
    expect(linkOpensText({ opens: 0 })).toBe("Not opened yet")
    expect(linkOpensText({ opens: 1 })).toBe("Opened once")
    expect(linkOpensText({ opens: 1200 })).toBe("Opened 1,200 times")
  })
  it("formats the page's dates and sizes", () => {
    expect(requestedDateText("2026-11-15")).toBe("Requested by Nov 15, 2026")
    expect(requestedDateText(null)).toBeNull()
    expect(requestedDateText("soon")).toBeNull()
    expect(validUntilText("2026-11-03T09:00:00Z")).toBe("This link works until Nov 3, 2026.")
    expect(fileSizeText(2.5 * 1024 * 1024)).toBe("2.5 MB")
    expect(fileSizeText(300)).toBe("1 KB")
  })
})
