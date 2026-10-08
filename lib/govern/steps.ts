import { OFFICE_LABEL } from "@/lib/govern/labels"
import type { Contract, Person } from "@/lib/govern/types"

// The contract's journey as ordered steps, each with who holds it and where
// it stands, the way the contract page's banner expands. Read only from the
// record (state, owner, routing, signature), never guessed.

export type StepStatus = "done" | "current" | "waiting" | "upcoming" | "stopped"

export interface StepPerson {
  person: Person | null
  /** What they do here: "Reviewer", "Legal Affairs", "Signatory". */
  role: string
  status: StepStatus
  /** Plain words for the status: "Approved", "Awaiting review", "Not their turn". */
  statusLabel: string
}

export interface ContractStep {
  id: "read" | "review" | "approvals" | "signature" | "signed"
  label: string
  /** Whose side it is on: "Sonar", "Your organization", "Both parties". */
  side: string
  status: StepStatus
  /** Short right-hand summary: "Completed", "1 of 2 approved", "Not started". */
  summary: string
  people: StepPerson[]
}

const REVIEW_DONE = new Set(["ready_to_sign", "out_for_signature", "signed", "active", "closed"])
const SIGNED = new Set(["signed", "active"])

export function contractSteps(c: Contract): ContractStep[] {
  const stopped = c.state === "rejected"
  const reading = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED"
  const reviewDone = REVIEW_DONE.has(c.state)
  const signed = SIGNED.has(c.state)
  const withOtherSide = c.waitingOn.kind === "counterparty"
  const required = c.routing?.required ?? []
  const approvals = c.routing?.approvals ?? []

  const steps: ContractStep[] = []

  steps.push({
    id: "read", label: "Read and checked", side: "Sonar",
    status: reading ? "current" : "done",
    summary: reading ? "Reading" : c.matrix?.version ? `Matrix v${c.matrix.version}` : "Completed",
    people: [],
  })

  const reviewStatus: StepStatus = stopped ? "stopped" : reviewDone ? "done" : withOtherSide ? "waiting" : "current"
  steps.push({
    id: "review", label: "Review", side: "Your organization",
    status: reviewStatus,
    summary: stopped ? "Rejected" : reviewDone ? "Completed" : withOtherSide ? "With the other side" : c.owner ? "In review" : "Needs a reviewer",
    people: [{
      person: c.owner,
      role: "Reviewer",
      status: reviewStatus,
      statusLabel: stopped ? "Rejected" : reviewDone ? "Approved" : withOtherSide ? "Waiting on the other side" : c.owner ? "Awaiting review" : "Not assigned",
    }],
  })

  if (required.length > 0) {
    const approvedCount = required.filter((o) => approvals.some((a) => a.office === o)).length
    const allApproved = approvedCount === required.length
    steps.push({
      id: "approvals", label: "Office approvals", side: "Your organization",
      status: stopped ? "stopped" : allApproved ? "done" : reviewStatus === "done" || reviewStatus === "current" ? "current" : "upcoming",
      summary: `${approvedCount} of ${required.length} approved`,
      people: required.map((office) => {
        const a = approvals.find((x) => x.office === office)
        const status: StepStatus = a ? "done" : stopped ? "stopped" : reviewStatus === "waiting" ? "upcoming" : "current"
        return {
          person: a?.by ?? null,
          role: OFFICE_LABEL[office],
          status,
          statusLabel: a ? "Approved" : status === "current" ? "Awaiting approval" : "Not their turn",
        }
      }),
    })
  }

  const sigStatus: StepStatus = stopped ? "stopped" : signed ? "done" : reviewDone ? "current" : "upcoming"
  steps.push({
    id: "signature", label: "Signature", side: "Both parties",
    status: sigStatus,
    summary: signed ? "Signed" : c.state === "out_for_signature" ? "Out for signature" : reviewDone ? "Ready to sign" : "Not started",
    people: [{
      person: c.signature?.signatory ?? null,
      role: "Signatory",
      status: sigStatus,
      statusLabel: signed ? "Signed" : c.state === "out_for_signature" ? "Awaiting signature" : reviewDone ? "Ready" : "Not their turn",
    }],
  })

  steps.push({
    id: "signed", label: "Signed and tracked", side: "Your organization",
    status: signed ? "done" : stopped ? "stopped" : "upcoming",
    summary: signed ? (c.signedAt ? new Date(c.signedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Completed") : "Not started",
    people: [],
  })

  return steps
}
