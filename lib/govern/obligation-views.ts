import { OBLIGATION_KIND_LABEL } from "@/lib/govern/labels"
import type { ObligationKind, PortfolioObligation } from "@/lib/govern/types"

// Preset views for the Obligations dashboard: by when it is due, by whether
// a person has confirmed what Sonar found, and by kind. Pure tests on the
// record so counts are exact; "today" is the caller's local midnight.

const DAY_MS = 86_400_000

export type ObligationViewGroup = "all" | "due" | "verification" | "kind"

export interface ObligationView {
  id: string
  label: string
  group: ObligationViewGroup
  description: string
  test: (o: PortfolioObligation, today: number) => boolean
  hideWhenEmpty?: boolean
}

/** Whole days from today (local midnight) to the due date; negative = overdue. */
export function daysUntil(due: string, today: number): number {
  const d = Date.parse(`${due.slice(0, 10)}T00:00:00`)
  return Math.round((d - today) / DAY_MS)
}

/** Local midnight for a timestamp. */
export function startOfDay(at: number): number {
  const t = new Date(at)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
}

const due = (o: PortfolioObligation, today: number, from: number, to: number) =>
  !!o.dueDate && daysUntil(o.dueDate, today) >= from && daysUntil(o.dueDate, today) <= to

const KIND_VIEWS: ObligationView[] = (Object.keys(OBLIGATION_KIND_LABEL) as ObligationKind[]).map((kind) => ({
  id: `kind-${kind}`,
  label: OBLIGATION_KIND_LABEL[kind],
  group: "kind" as const,
  description: `Open obligations of this kind: ${OBLIGATION_KIND_LABEL[kind].toLowerCase()}.`,
  test: (o) => o.kind === kind,
  hideWhenEmpty: true,
}))

export const OBLIGATION_VIEWS: ObligationView[] = [
  { id: "all", label: "All open", group: "all", description: "Every open report, payment, milestone and term end, soonest first.", test: () => true },

  { id: "overdue", label: "Overdue", group: "due", description: "Past their due date and not yet done.", test: (o, t) => !!o.dueDate && daysUntil(o.dueDate, t) < 0 },
  { id: "30", label: "Due in 30 days", group: "due", description: "Due today or in the next 30 days.", test: (o, t) => due(o, t, 0, 30) },
  { id: "90", label: "Due in 90 days", group: "due", description: "Due today or in the next 90 days.", test: (o, t) => due(o, t, 0, 90) },
  { id: "no-date", label: "No due date", group: "due", description: "Open obligations without a date yet. Add one on the contract.", test: (o) => !o.dueDate, hideWhenEmpty: true },

  { id: "needs", label: "Needs verification", group: "verification", description: "Found by Sonar and not yet confirmed by a person.", test: (o) => !o.verified },
  { id: "verified", label: "Verified", group: "verification", description: "Confirmed by a person.", test: (o) => o.verified },

  ...KIND_VIEWS,
]

export const OBLIGATION_GROUP_LABEL: Record<ObligationViewGroup, string | null> = {
  all: null,
  due: "Due",
  verification: "Verification",
  kind: "Type",
}

export function obligationViewById(id: string | null | undefined): ObligationView {
  return OBLIGATION_VIEWS.find((v) => v.id === id) ?? OBLIGATION_VIEWS[0]
}
