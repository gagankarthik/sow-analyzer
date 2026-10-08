import type { Contract } from "@/lib/govern/types"

// Preset views for the Contracts dashboard: saved filters every workspace
// gets, grouped the way people ask ("what is mine", "what is stuck", "what is
// signed"). Each is a pure test on the contract record, so counts are exact.

export type ViewGroup = "all" | "workflows" | "signed"

export interface ContractView {
  id: string
  label: string
  group: ViewGroup
  /** Shown under the title when the view is open. */
  description: string
  test: (c: Contract, ctx: { me: string | null; now: number }) => boolean
  /** Hidden from the panel while it has no contracts (still reachable by URL). */
  hideWhenEmpty?: boolean
}

const DAY = 86_400_000
const SIGNED = new Set(["signed", "active"])
const CLOSED = new Set(["rejected", "closed"])

const inProgress = (c: Contract) => !SIGNED.has(c.state) && !CLOSED.has(c.state)

export const CONTRACT_VIEWS: ContractView[] = [
  { id: "all", label: "All contracts", group: "all", description: "Every agreement, in progress and signed.", test: () => true },

  { id: "in-progress", label: "In progress", group: "workflows", description: "Everything not yet signed: in review, with the other side or waiting on approval or signature.", test: inProgress },
  { id: "mine", label: "Assigned to me", group: "workflows", description: "Contracts you own.", test: (c, { me }) => inProgress(c) && !!me && c.owner?.email?.toLowerCase() === me },
  { id: "unassigned", label: "Needs a reviewer", group: "workflows", description: "No one owns these yet.", test: (c) => inProgress(c) && !c.owner },
  { id: "overdue", label: "Past target", group: "workflows", description: "In their step longer than the target.", test: (c) => inProgress(c) && c.slaStatus === "red" },
  { id: "other-side", label: "With the other side", group: "workflows", description: "Waiting on the sponsor or counterparty.", test: (c) => inProgress(c) && c.waitingOn.kind === "counterparty" },
  { id: "quiet", label: "No activity in 30 days", group: "workflows", description: "Open contracts nobody has touched in 30 days.", test: (c, { now }) => inProgress(c) && now - Date.parse(c.updatedAt) > 30 * DAY, hideWhenEmpty: true },
  { id: "closed", label: "Rejected or closed", group: "workflows", description: "Stopped before signature.", test: (c) => CLOSED.has(c.state), hideWhenEmpty: true },

  { id: "signed", label: "Signed and active", group: "signed", description: "Signed agreements still in force.", test: (c) => SIGNED.has(c.state) },
  { id: "renewals", label: "Ending in 90 days", group: "signed", description: "Signed agreements whose term ends in the next 90 days.", test: (c, { now }) => SIGNED.has(c.state) && !!c.termEndDate && Date.parse(c.termEndDate) - now <= 90 * DAY && Date.parse(c.termEndDate) >= now },
  { id: "gaps", label: "Missing details", group: "signed", description: "Fields Sonar could not capture and nobody has entered yet.", test: (c) => (c.captureGaps?.length ?? 0) > 0 },
  { id: "high-risk", label: "High risk", group: "signed", description: "Rated high or critical by Sonar.", test: (c) => c.overallRisk === "high" || c.overallRisk === "critical" },
]

export const VIEW_GROUP_LABEL: Record<ViewGroup, string | null> = {
  all: null,
  workflows: "Before signature",
  signed: "After signature",
}

export function viewById(id: string | null | undefined): ContractView {
  return CONTRACT_VIEWS.find((v) => v.id === id) ?? CONTRACT_VIEWS[1]
}
