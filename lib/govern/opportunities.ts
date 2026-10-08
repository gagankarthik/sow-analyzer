// Opportunities to save time and money, found in the portfolio as it stands.
// Every opportunity is a count or a sum over real contracts and obligations;
// nothing is estimated or projected. Each says what was found, why it costs
// time or money, and where to act.

import { plural } from "./labels"
import { formatCompact, isUnsigned, valueSummary, waitingQueues, type Money } from "./metrics"
import type { Contract, PortfolioObligation } from "./types"

export type OpportunityKind = "time" | "money"

export interface Opportunity {
  id: string
  kind: OpportunityKind
  /** Higher is more pressing; used only to order the list. */
  weight: number
  /** The headline figure, e.g. "42 days" or "$1.2M". */
  figure: string
  title: string
  detail: string
  href: string
  action: string
}

const DAY_MS = 86_400_000

function daysBetween(fromIso: string, to: Date): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const today = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((from - today) / DAY_MS)
}

/** The currency most of the money is in, and the amount in it. */
function mainAmount(...sums: Money[]): { currency: string | null; amount: (m: Money) => number } {
  const totals = new Map<string, number>()
  for (const m of sums) for (const t of m.totals) totals.set(t.currency, (totals.get(t.currency) ?? 0) + t.amount)
  const currency = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { currency, amount: (m) => m.totals.find((t) => t.currency === (currency ?? ""))?.amount ?? 0 }
}

/** Sum obligation amounts in their most common currency only: different
 *  currencies are never added together. */
function obligationTotal(list: PortfolioObligation[]): { amount: number; currency: string | null } {
  const by = new Map<string, number>()
  for (const o of list) {
    if (o.amount === null || o.amount <= 0) continue
    const cur = (o.currency ?? "").toUpperCase()
    by.set(cur, (by.get(cur) ?? 0) + o.amount)
  }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? { amount: top[1], currency: top[0] || null } : { amount: 0, currency: null }
}

export function findOpportunities(
  contracts: Contract[],
  obligations: PortfolioObligation[],
  today: Date = new Date(),
): Opportunity[] {
  const out: Opportunity[] = []
  const open = contracts.filter(isUnsigned)

  // ── Time ──────────────────────────────────────────────────────────────────
  const late = open.filter((c) => c.slaStatus === "red" && c.targetDays !== null)
  if (late.length > 0) {
    const over = late.reduce((s, c) => s + Math.max(0, c.daysInStage - (c.targetDays ?? 0)), 0)
    out.push({
      id: "past-target", kind: "time", weight: 90 + late.length,
      figure: plural(over, "day"),
      title: `${plural(late.length, "contract")} ${late.length === 1 ? "is" : "are"} past the step target`,
      detail: `Together ${over === 1 ? "it is" : "they are"} ${plural(over, "day")} over target. Clearing the oldest first frees the most time.`,
      href: "/workflow", action: "Open the board",
    })
  }

  const unassigned = open.filter((c) => !c.owner)
  if (unassigned.length > 0) {
    out.push({
      id: "unassigned", kind: "time", weight: 70 + unassigned.length,
      figure: String(unassigned.length),
      title: `${plural(unassigned.length, "contract")} ${unassigned.length === 1 ? "has" : "have"} no reviewer`,
      detail: "Nobody owns the next step, so the clock runs with no one acting. Assign a reviewer to start the review.",
      href: "/workflow", action: "Assign reviewers",
    })
  }

  const queue = waitingQueues(contracts).filter((q) => q.count > 0 && q.averageDays !== null)
    .sort((a, b) => b.count * (b.averageDays ?? 0) - a.count * (a.averageDays ?? 0))[0]
  if (queue && (queue.averageDays ?? 0) >= 5) {
    const avg = Math.round(queue.averageDays ?? 0)
    out.push({
      id: "biggest-queue", kind: "time", weight: 50 + avg,
      figure: `${avg} days`,
      title: `Most waiting time sits with ${queue.label.toLowerCase()}`,
      detail: `${plural(queue.count, "contract")} wait there ${avg} days on average. Agreeing a turnaround with them saves the most time across the board.`,
      href: "/reports/bottlenecks", action: "See bottlenecks",
    })
  }

  const manyRounds = contracts.filter((c) => (c.rounds ?? 0) >= 3)
  if (manyRounds.length > 0) {
    out.push({
      id: "many-rounds", kind: "time", weight: 40 + manyRounds.length,
      figure: String(manyRounds.length),
      title: `${plural(manyRounds.length, "contract")} needed three or more rounds of changes`,
      detail: "Repeated send-backs usually come from the same few terms. Adding agreed fallbacks for them to the matrix shortens negotiation.",
      href: "/reports/trends", action: "See what causes changes",
    })
  }

  // ── Money ─────────────────────────────────────────────────────────────────
  const summary = valueSummary(contracts)
  const main = mainAmount(summary.current, summary.potential)
  const heldUp = main.amount(summary.heldUp)
  if (heldUp > 0) {
    out.push({
      id: "held-up", kind: "money", weight: 95,
      figure: formatCompact(heldUp, main.currency),
      title: "Value is held up by delays",
      detail: `${formatCompact(heldUp, main.currency)} of pipeline value is in contracts past their target. Moving them to signature brings that money in sooner.`,
      href: "/reports/value", action: "See held-up value",
    })
  }

  const overdue = obligations.filter((o) => o.status === "open" && o.dueDate && daysBetween(o.dueDate, today) < 0)
  if (overdue.length > 0) {
    const { amount, currency } = obligationTotal(overdue)
    out.push({
      id: "obligations-overdue", kind: "money", weight: 100 + overdue.length,
      figure: String(overdue.length),
      title: `${plural(overdue.length, "obligation")} ${overdue.length === 1 ? "is" : "are"} overdue`,
      detail: `${amount > 0 ? `${formatCompact(amount, currency)} is attached to them. ` : ""}Late reports and payments can cost fees, interest or the relationship. Complete or reschedule them.`,
      href: "/obligations?view=overdue", action: "See overdue obligations",
    })
  }

  const unverified = obligations.filter((o) => o.status === "open" && !o.verified)
  if (unverified.length > 0) {
    out.push({
      id: "unverified", kind: "money", weight: 85 + unverified.length,
      figure: String(unverified.length),
      title: `${plural(unverified.length, "obligation")} Sonar found ${unverified.length === 1 ? "needs" : "need"} checking`,
      detail: "Confirm each against the agreement so due dates and amounts can be relied on for reminders and reports.",
      href: "/obligations", action: "Verify obligations",
    })
  }

  const ending = obligations.filter((o) => o.status === "open" && o.kind === "term_end" && o.dueDate
    && daysBetween(o.dueDate, today) >= 0 && daysBetween(o.dueDate, today) <= 90)
  if (ending.length > 0) {
    out.push({
      id: "terms-ending", kind: "money", weight: 80 + ending.length,
      figure: String(ending.length),
      title: `${plural(ending.length, "agreement")} ${ending.length === 1 ? "ends" : "end"} within 90 days`,
      detail: "Decide now whether to renew, renegotiate or let each lapse, while there is still time to use the notice window.",
      href: "/obligations?view=90", action: "Review term ends",
    })
  }

  const payments = obligations.filter((o) => o.status === "open" && o.kind === "milestone_payment" && o.dueDate
    && daysBetween(o.dueDate, today) >= 0 && daysBetween(o.dueDate, today) <= 30)
  if (payments.length > 0) {
    const { amount, currency } = obligationTotal(payments)
    out.push({
      id: "payments-due", kind: "money", weight: 60 + payments.length,
      figure: amount > 0 ? formatCompact(amount, currency) : String(payments.length),
      title: `${plural(payments.length, "milestone payment")} due in the next 30 days`,
      detail: "Planning them now avoids late-payment terms and keeps cash forecasts accurate.",
      href: "/obligations?view=30", action: "See payments due",
    })
  }

  const unvalued = contracts.filter((c) => (isUnsigned(c) || c.stage === "signed" || c.stage === "active") && c.value === null)
  if (unvalued.length > 0) {
    out.push({
      id: "unvalued", kind: "money", weight: 30 + unvalued.length,
      figure: String(unvalued.length),
      title: `${plural(unvalued.length, "contract")} ${unvalued.length === 1 ? "has" : "have"} no value recorded`,
      detail: "Without a value, savings and exposure on these contracts can't be measured. Add the value on each contract.",
      href: "/reports/value#no-value", action: "Add values",
    })
  }

  return out.sort((a, b) => b.weight - a.weight)
}
