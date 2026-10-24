import { BLOCKING_TIERS, WAITING_ON_LABEL, plural } from "./labels"
import type { Blocker, Contract, ContractDetail, MatrixClauseResult, Tier } from "./types"

// What stands between a contract and signature, for the contract page's
// Issues tab: every open blocker with the matrix clause it is about, then
// any clause the matrix says must change that no blocker covers yet.

export type IssueSeverity = "high" | "medium"

export interface ContractIssue {
  key: string
  blocker: Blocker | null
  clause: MatrixClauseResult | null
  severity: IssueSeverity
}

/** A term you do not accept is high; anything else to change is medium. */
export function severityOf(tier: Tier | null | undefined): IssueSeverity {
  return tier === "unacceptable" ? "high" : "medium"
}

/** Open issues, high severity first, otherwise in the order they arrived. */
export function contractIssues(c: Pick<ContractDetail, "blockers" | "review">): ContractIssue[] {
  const clauses = c.review?.clauses ?? []
  // A closed blocker resolved its clause too: it is not raised again.
  const covered = new Set(c.blockers.map((b) => b.clauseType).filter((t): t is string => !!t))

  const fromBlockers: ContractIssue[] = c.blockers
    .filter((b) => b.status === "open")
    .map((b) => {
      const clause = b.clauseType ? clauses.find((cl) => cl.clauseType === b.clauseType) ?? null : null
      return { key: `blocker-${b.id}`, blocker: b, clause, severity: severityOf(clause?.tier) }
    })

  const fromMatrix: ContractIssue[] = clauses
    .filter((cl) => BLOCKING_TIERS.has(cl.tier) && !covered.has(cl.clauseType))
    .map((cl) => ({ key: `clause-${cl.clauseType}-${cl.clauseNumber ?? ""}`, blocker: null, clause: cl, severity: severityOf(cl.tier) }))

  const all = [...fromBlockers, ...fromMatrix]
  return [...all.filter((i) => i.severity === "high"), ...all.filter((i) => i.severity !== "high")]
}

const BEFORE_SIGNATURE = new Set(["intake", "in_review", "sent_back", "escalated"])

/**
 * Why the contract cannot go to signature yet, in one line; null once it is
 * past review (ready, out for signature, signed, closed).
 */
export function signatureBlockReason(
  c: Pick<Contract, "state" | "analysisStatus" | "waitingOn" | "nextStep">,
  openIssues: number,
): string | null {
  if (!BEFORE_SIGNATURE.has(c.state)) return null
  if (c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED") return "Sonar is still reading it"
  if (openIssues > 0) return `Resolve ${plural(openIssues, "issue")} first`
  if (c.waitingOn.kind !== "nobody") return c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind]
  return c.nextStep.headline || null
}
