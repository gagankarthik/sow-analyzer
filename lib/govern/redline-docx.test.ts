import { describe, expect, it } from "vitest"
import { buildRedlineDocx, redlineClauses, redlineFileName } from "./redline-docx"
import type { MatrixReview } from "./types"

const review = {
  docId: "d-1", agreementType: "license", matrixVersion: 1, matrixEffectiveDate: null, reviewedAt: "",
  counts: { within: 0, fallback: 0, deviates: 1, unacceptable: 0, review: 0, missing: 0, beneficial: 0 },
  clauses: [{
    clauseType: "Royalties", label: "Royalties", clauseNumber: "3.3", clauseId: null, tier: "deviates",
    beneficial: false, beneficialReason: null, reason: null, found: "1%", standard: null, fallback: null,
    escalationOffice: null, suggestedLanguage: null, required: true, escalationRequired: false,
    quote: "  Licensee shall pay a royalty of one percent (1%).  ",
  }],
} satisfies MatrixReview

describe("redline", () => {
  it("pairs each sent-back clause with the wording Sonar quoted", () => {
    const clauses = redlineClauses(review, [
      { clauseType: "Royalties", label: "Royalties", suggestedLanguage: " 3.5% of Net Sales " },
      { clauseType: "GoverningLaw", label: "Governing law", suggestedLanguage: null },
    ])
    expect(clauses[0]).toEqual({
      label: "Royalties", clauseNumber: "3.3",
      currentWording: "Licensee shall pay a royalty of one percent (1%).", suggestedLanguage: "3.5% of Net Sales",
    })
    expect(clauses[1]).toMatchObject({ clauseNumber: null, currentWording: null, suggestedLanguage: null })
  })

  it("makes a safe file name", () => {
    expect(redlineFileName('Exclusive License: "Buckeye" / v1')).toBe("Exclusive License Buckeye v1 - OSU requested changes.docx")
    expect(redlineFileName("///")).toBe("Agreement - OSU requested changes.docx")
  })

  it("produces a Word file with tracked insertions and deletions by the reviewer", async () => {
    const blob = await buildRedlineDocx({
      contractTitle: "Exclusive License", counterparty: "Buckeye BioSensors", reviewerName: "Dana Ruiz",
      note: "Please see the changes below.", date: new Date("2026-10-08T12:00:00Z"),
      clauses: redlineClauses(review, [{ clauseType: "Royalties", label: "Royalties", suggestedLanguage: "3.5%" }]),
    })
    const { default: JSZip } = await import("jszip")
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const xml = await zip.file("word/document.xml")!.async("string")
    expect(xml).toContain("<w:ins")
    expect(xml).toContain("<w:del")
    expect(xml).toContain("OSU — Dana Ruiz")
  })
})
