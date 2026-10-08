// A tracked-changes Word redline for a send-back (competitive gap #3): the
// other side opens it in Word and sees OSU's requests as real revisions —
// their current wording struck through, OSU's language inserted — which they
// can accept or reject one by one. `docx` is loaded only when someone asks
// for the file, so it never weighs on the page bundle.

import type { ContractDetail, MatrixReview } from "./types"

export interface RedlineClause {
  label: string
  clauseNumber: string | null
  /** The other side's current wording, when Sonar quoted it. */
  currentWording: string | null
  suggestedLanguage: string | null
}

export interface RedlineInput {
  contractTitle: string
  counterparty: string | null
  reviewerName: string
  note: string | null
  date: Date
  clauses: RedlineClause[]
}

/** The clauses sent back, with the quoted wording from the matrix review. */
export function redlineClauses(
  review: MatrixReview | null,
  sent: { clauseType: string; label: string; suggestedLanguage: string | null }[],
): RedlineClause[] {
  return sent.map((s) => {
    const found = review?.clauses.find((c) => c.clauseType === s.clauseType)
    return {
      label: s.label,
      clauseNumber: found?.clauseNumber ?? null,
      currentWording: found?.quote?.trim() || null,
      suggestedLanguage: s.suggestedLanguage?.trim() || null,
    }
  })
}

/** The clauses of the latest send-back, read from the activity log; falls
 *  back to the recommended next step's clauses when the log has none. */
export function latestSentBackClauses(c: ContractDetail): { clauseType: string; label: string; suggestedLanguage: string | null }[] {
  const entry = [...c.activity].filter((a) => a.action === "sent_back").sort((a, b) => b.at.localeCompare(a.at))[0]
  const raw = entry?.detail?.clauses
  if (Array.isArray(raw)) {
    const parsed = raw.flatMap((x) => {
      if (!x || typeof x !== "object") return []
      const r = x as Record<string, unknown>
      if (typeof r.label !== "string") return []
      return [{
        clauseType: typeof r.clauseType === "string" ? r.clauseType : "other",
        label: r.label,
        suggestedLanguage: typeof r.suggestedLanguage === "string" ? r.suggestedLanguage : null,
      }]
    })
    if (parsed.length) return parsed
  }
  return c.nextStep.clauses.map((cl) => ({ clauseType: cl.clauseType, label: cl.label, suggestedLanguage: cl.suggestedLanguage }))
}

/** The note sent with the latest send-back, if any. */
export function latestSentBackNote(c: ContractDetail): string | null {
  const entry = [...c.activity].filter((a) => a.action === "sent_back").sort((a, b) => b.at.localeCompare(a.at))[0]
  const note = entry?.detail?.note
  return typeof note === "string" && note.trim() ? note.trim() : null
}

export function redlineFileName(title: string): string {
  const safe = title.replace(/[^\w\s-]+/g, "").trim().replace(/\s+/g, " ").slice(0, 80) || "Agreement"
  return `${safe} - OSU requested changes.docx`
}

export async function buildRedlineDocx(input: RedlineInput): Promise<Blob> {
  const { AlignmentType, DeletedTextRun, Document, HeadingLevel, InsertedTextRun, Packer, Paragraph, TextRun } = await import("docx")

  const author = `OSU — ${input.reviewerName}`
  const date = input.date.toISOString()
  let revisionId = 1
  const deleted = (text: string) => new DeletedTextRun({ text, id: revisionId++, author, date })
  const inserted = (text: string) => new InsertedTextRun({ text, id: revisionId++, author, date })
  const dateText = input.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const header = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`Requested changes: ${input.contractTitle}`)] }),
    new Paragraph({ children: [new TextRun({ text: "To: ", bold: true }), new TextRun(input.counterparty || "The other party")] }),
    new Paragraph({ children: [new TextRun({ text: "From: ", bold: true }), new TextRun(`The Ohio State University — ${input.reviewerName}`)] }),
    new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(dateText)] }),
    new Paragraph({
      spacing: { before: 240, after: 240 },
      children: [new TextRun(
        `OSU asks for the ${input.clauses.length === 1 ? "change" : `${input.clauses.length} changes`} below. ` +
        "Each is shown as a tracked change: your current wording is struck through and OSU's language is inserted. " +
        "Accept or reject each change in Word (Review > Accept), then send the revised agreement back.",
      )],
    }),
  ]

  const note = input.note
    ? [
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Note from OSU")] }),
        new Paragraph({ spacing: { after: 240 }, children: [new TextRun(input.note)] }),
      ]
    : []

  const clauses = input.clauses.flatMap((cl, i) => {
    const heading = new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360 },
      children: [new TextRun(`${i + 1}. ${cl.label}${cl.clauseNumber ? ` (clause ${cl.clauseNumber})` : ""}`)],
    })
    if (cl.currentWording && cl.suggestedLanguage) {
      return [heading, new Paragraph({ alignment: AlignmentType.LEFT, children: [deleted(cl.currentWording), inserted(` ${cl.suggestedLanguage}`)] })]
    }
    if (cl.suggestedLanguage) {
      return [
        heading,
        new Paragraph({ children: [new TextRun({ text: `Replace ${cl.clauseNumber ? `clause ${cl.clauseNumber}` : "this clause"} with:`, italics: true })] }),
        new Paragraph({ children: [inserted(cl.suggestedLanguage)] }),
      ]
    }
    return [
      heading,
      ...(cl.currentWording ? [new Paragraph({ children: [new TextRun(cl.currentWording)] })] : []),
      new Paragraph({ children: [new TextRun({ text: "OSU asks for this clause to be revised to fit its accepted positions. See the note above.", italics: true })] }),
    ]
  })

  const doc = new Document({
    creator: author,
    title: `Requested changes: ${input.contractTitle}`,
    features: { trackRevisions: true },
    sections: [{ children: [...header, ...note, ...clauses] }],
  })
  return Packer.toBlob(doc)
}

/** Builds the redline and hands it to the browser as a download. */
export async function downloadRedline(input: RedlineInput): Promise<void> {
  const blob = await buildRedlineDocx(input)
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement("a")
    a.href = url
    a.download = redlineFileName(input.contractTitle)
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
