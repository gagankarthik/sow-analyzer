import { isCurrent, isUnsigned } from "@/lib/govern/metrics"
import type { Contract } from "@/lib/govern/types"

// Counterparties: one profile per organization the contracts name (the
// counterparty, else the sponsor), built from those contracts. Relationship
// comes from the money direction: money in = customer or sponsor, money out =
// vendor. Values are summed only in the profile's first-seen currency, so
// currencies are never mixed.

export type Relationship = "Customer or sponsor" | "Vendor" | "Both"

export interface Counterparty {
  key: string
  name: string
  relationship: Relationship
  contracts: Contract[]
  open: number
  overdue: number
  signed: number
  pipeline: number
  currency: string | null
  lastActivity: string
}

export function counterpartyName(c: Contract): string | null {
  const name = (c.counterparty || c.sponsor || "").trim()
  return name || null
}

export function buildCounterparties(contracts: Contract[]): Counterparty[] {
  const map = new Map<string, Counterparty & { dirs: Set<string> }>()
  for (const c of contracts) {
    const name = counterpartyName(c)
    if (!name) continue
    const key = name.toLowerCase()
    const row = map.get(key) ?? {
      key, name, relationship: "Vendor" as Relationship, contracts: [], open: 0, overdue: 0, signed: 0, pipeline: 0,
      currency: c.currency ?? null, lastActivity: c.updatedAt, dirs: new Set<string>(),
    }
    row.contracts.push(c)
    row.dirs.add(c.direction)
    if (isUnsigned(c)) {
      row.open += 1
      if (c.slaStatus === "red") row.overdue += 1
    }
    if (c.value !== null && (c.currency ?? null) === row.currency) {
      if (isCurrent(c)) row.signed += c.value
      else if (isUnsigned(c)) row.pipeline += c.value
    }
    if (c.updatedAt > row.lastActivity) row.lastActivity = c.updatedAt
    map.set(key, row)
  }
  return [...map.values()].map(({ dirs, ...r }) => ({
    ...r,
    relationship: dirs.has("incoming") && dirs.has("outgoing") ? "Both" : dirs.has("incoming") ? "Customer or sponsor" : "Vendor",
  }))
}

const DAY = 86_400_000

export interface CounterpartyView {
  id: string
  label: string
  group: "all" | "relationship" | "work"
  description: string
  test: (r: Counterparty, now: number) => boolean
  hideWhenEmpty?: boolean
}

export const COUNTERPARTY_VIEWS: CounterpartyView[] = [
  { id: "all", label: "All counterparties", group: "all", description: "Everyone you contract with, one profile each across all their agreements.", test: () => true },
  { id: "sponsors", label: "Sponsors and customers", group: "relationship", description: "Organizations that pay you: sponsors, licensees and customers.", test: (r) => r.relationship !== "Vendor" },
  { id: "vendors", label: "Vendors", group: "relationship", description: "Organizations you pay.", test: (r) => r.relationship !== "Customer or sponsor" },
  { id: "open", label: "With open work", group: "work", description: "At least one agreement not yet signed.", test: (r) => r.open > 0 },
  { id: "overdue", label: "With overdue work", group: "work", description: "At least one agreement past its step target.", test: (r) => r.overdue > 0 },
  { id: "quiet", label: "Quiet for 90 days", group: "work", description: "No change to any of their agreements in 90 days.", test: (r, now) => now - Date.parse(r.lastActivity) > 90 * DAY, hideWhenEmpty: true },
]

export const COUNTERPARTY_GROUP_LABEL: Record<CounterpartyView["group"], string | null> = {
  all: null,
  relationship: "Relationship",
  work: "Work",
}

export function counterpartyViewById(id: string | null | undefined): CounterpartyView {
  return COUNTERPARTY_VIEWS.find((v) => v.id === id) ?? COUNTERPARTY_VIEWS[0]
}
