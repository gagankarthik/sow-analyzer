// A contract's journey from draft to signature, as named steps: draft,
// review, redlines, edits, approval, signature, signed. Each step's status
// and one-line fact come from the contract's stage, its activity log, its
// versions and its signature record, never from guesses.

import type { ContractDetail, MatrixCounts, Stage } from "./types"

export type JourneyStepId = "draft" | "review" | "redlines" | "edits" | "approval" | "signature" | "signed"
export type JourneyStatus = "done" | "current" | "upcoming" | "skipped"

export interface JourneyStep {
  id: JourneyStepId
  label: string
  status: JourneyStatus
  /** What happened, or what is happening, at this step. */
  fact: string
  /** ISO time the step was reached or finished, when known. */
  at: string | null
  /** The contract-page section that holds this step's detail. */
  section: "details" | "matrix" | "rounds" | "blockers" | "activity" | "money"
}

const ORDER: Stage[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"]
const rank = (s: Stage) => ORDER.indexOf(s)

function lastAt(c: ContractDetail, action: string): string | null {
  const hits = c.activity.filter((a) => a.action === action).map((a) => a.at).sort()
  return hits.length ? hits[hits.length - 1] : null
}

function toResolve(counts: MatrixCounts | undefined): number {
  return counts ? counts.unacceptable + counts.deviates + counts.review + counts.missing : 0
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function contractJourney(c: ContractDetail, fmt: (iso: string) => string = (iso) => iso.slice(0, 10)): {
  steps: JourneyStep[]
  ended: "rejected" | "closed" | null
} {
  const r = rank(c.stage)
  const sentBacks = c.activity.filter((a) => a.action === "sent_back").length
  const revisions = Math.max(c.activity.filter((a) => a.action === "revision_received").length, c.versions.length - 1, 0)
  const lastSent = lastAt(c, "sent_back")
  const lastRevision = lastAt(c, "revision_received")
  const signatureSentAt = c.signature?.sentAt ?? lastAt(c, "signature_sent")
  const signedAt = c.signedAt ?? c.signature?.signedAt ?? lastAt(c, "signed")
  const isSigned = r >= rank("signed") || !!signedAt
  const pastNegotiation = r >= rank("approval")
  // In negotiation, the ball is with whoever acted last: our redline or their revision.
  const awaitingRevision = !!lastSent && (!lastRevision || lastRevision < lastSent)

  const steps: JourneyStep[] = [
    {
      id: "draft", label: "Draft", section: "details", at: c.createdAt,
      status: r > rank("draft") ? "done" : "current",
      fact: `Received ${fmt(c.createdAt)}`,
    },
    {
      id: "review", label: "Review", section: "matrix", at: c.matrix?.reviewedAt ?? null,
      status: r > rank("review") ? "done" : r === rank("review") ? "current" : "upcoming",
      fact: !c.matrix?.reviewedAt
        ? r >= rank("review") ? "Sonar is checking it against the matrix" : "Checked against your matrix"
        : toResolve(c.matrix.counts) === 0 ? "Clean against the matrix" : `${plural(toResolve(c.matrix.counts), "clause")} to resolve`,
    },
    {
      id: "redlines", label: "Redlines", section: "rounds", at: lastSent,
      status: sentBacks > 0
        ? (r === rank("negotiation") && awaitingRevision ? "current" : "done")
        : r === rank("negotiation") ? "current" : pastNegotiation ? "skipped" : "upcoming",
      fact: sentBacks > 0 ? `${plural(sentBacks, "round")} sent to the other side` : pastNegotiation ? "Not needed" : "Changes go back with suggested language",
    },
    {
      id: "edits", label: "Edits", section: "rounds", at: lastRevision,
      status: revisions > 0
        ? (r === rank("negotiation") && !awaitingRevision ? "current" : "done")
        : pastNegotiation ? "skipped" : "upcoming",
      fact: revisions > 0
        ? `${plural(revisions, "revised version")}${lastRevision ? `, latest ${fmt(lastRevision)}` : ""}`
        : pastNegotiation ? "Not needed" : "Their revised version is re-checked",
    },
    {
      id: "approval", label: "Approval", section: "blockers", at: lastAt(c, "approved"),
      status: isSigned || signatureSentAt ? "done" : r === rank("approval") ? "current" : "upcoming",
      fact: lastAt(c, "approved") ? `Approved ${fmt(lastAt(c, "approved")!)}`
        : c.routing.required.length ? `${plural(c.routing.required.length, "office")} must sign off` : "Internal sign-off",
    },
    {
      id: "signature", label: "Signature", section: "activity", at: signatureSentAt,
      status: isSigned ? "done" : signatureSentAt ? "current" : "upcoming",
      fact: signatureSentAt ? `Sent ${fmt(signatureSentAt)}` : "Out for signature",
    },
    {
      id: "signed", label: "Signed", section: "money", at: signedAt,
      status: isSigned ? "done" : "upcoming",
      fact: signedAt ? `Signed ${fmt(signedAt)}` : isSigned ? "Signed" : "Obligations tracked from here",
    },
  ]

  const ended = c.state === "rejected" ? "rejected" : c.state === "closed" && !isSigned ? "closed" : null
  return { steps, ended }
}
