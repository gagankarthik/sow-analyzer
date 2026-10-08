// Reporting over the contract list (Requirements 3 and 4). Pure functions, no
// React: the leader home, the board, the bottleneck report, the value report
// and the exports all read these, so a figure is the same wherever it shows.
//
// Money rules: amounts in different currencies are never added together, and
// a contract with no value is counted apart ("2 contracts have no value yet"),
// never as zero.

import { editionMap } from "@/lib/edition-runtime"
import { fmtMoney } from "@/lib/contract-value"
import { currencySymbol } from "@/lib/format"
import { PRE_SIGNATURE_STAGES, STAGES, WAITING_ON_SHORT } from "./labels"
import type { AgreementType, Contract, Direction, Stage, WaitingOnKind } from "./types"

export type MoneyTotals = { currency: string; amount: number }[]

export interface Money {
  totals: MoneyTotals
  /** Contracts in the set that carry a value. */
  valued: number
  /** Contracts in the set with no value at all. */
  unvalued: number
}

export function sumMoney(contracts: Contract[]): Money {
  const m = new Map<string, number>()
  let valued = 0
  let unvalued = 0
  for (const c of contracts) {
    if (c.value === null || !Number.isFinite(c.value)) {
      unvalued += 1
      continue
    }
    valued += 1
    const cur = (c.currency ?? "").toUpperCase()
    m.set(cur, (m.get(cur) ?? 0) + c.value)
  }
  const totals = [...m.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount)
  return { totals, valued, unvalued }
}

/** The single largest-currency total, for a headline tile; the rest are listed beside it. */
export function primaryAmount(money: Money): { amount: number; currency: string } | null {
  return money.totals[0] ? { amount: money.totals[0].amount, currency: money.totals[0].currency } : null
}

export const isOpen = (c: Contract) => c.state !== "rejected" && c.state !== "closed"
export const isUnsigned = (c: Contract) => isOpen(c) && PRE_SIGNATURE_STAGES.includes(c.stage)
export const isCurrent = (c: Contract) => c.valueBucket === "current"
export const isPotential = (c: Contract) => c.valueBucket === "potential"

/** "Needs attention": overdue, blocked by a term you do not accept, running
 *  late with open items, waiting with nobody assigned, or rated high or
 *  critical risk. The leader home's first question: anything a leader would
 *  want to know about today counts here. */
export function needsAttention(c: Contract): boolean {
  if (!isUnsigned(c)) return false
  if (c.slaStatus === "red") return true
  if ((c.matrix?.counts.unacceptable ?? 0) > 0) return true
  if (c.slaStatus === "amber" && c.openBlockers > 0) return true
  if (!c.owner) return true
  return c.overallRisk === "high" || c.overallRisk === "critical"
}

/** Sort for attention lists: overdue first, then longest waiting. */
export function byUrgency(a: Contract, b: Contract): number {
  const rank = { red: 0, amber: 1, on_track: 2, none: 3 } as const
  return rank[a.slaStatus] - rank[b.slaStatus] || b.daysInStage - a.daysInStage
}

// ── Value (Requirement 4) ──────────────────────────────────────────────────

export interface ValueSummary {
  current: Money
  potential: Money
  /** Potential value sitting in contracts that are past their stage target. */
  heldUp: Money
  byDirection: Record<Direction, { current: Money; potential: Money }>
}

export function valueSummary(contracts: Contract[]): ValueSummary {
  const dir = (d: Direction) => contracts.filter((c) => c.direction === d)
  return {
    current: sumMoney(contracts.filter(isCurrent)),
    potential: sumMoney(contracts.filter(isPotential)),
    heldUp: sumMoney(contracts.filter((c) => isPotential(c) && (c.slaStatus === "amber" || c.slaStatus === "red"))),
    byDirection: {
      incoming: { current: sumMoney(dir("incoming").filter(isCurrent)), potential: sumMoney(dir("incoming").filter(isPotential)) },
      outgoing: { current: sumMoney(dir("outgoing").filter(isCurrent)), potential: sumMoney(dir("outgoing").filter(isPotential)) },
    },
  }
}

export const DAYS_BANDS = [
  { id: "0-7", label: "Under a week", min: 0, max: 7 },
  { id: "8-14", label: "1–2 weeks", min: 8, max: 14 },
  { id: "15-30", label: "2–4 weeks", min: 15, max: 30 },
  { id: "31+", label: "Over a month", min: 31, max: Infinity },
] as const

export type DaysBand = (typeof DAYS_BANDS)[number]["id"]

export function daysBand(days: number): DaysBand {
  return (DAYS_BANDS.find((b) => days >= b.min && days <= b.max) ?? DAYS_BANDS[DAYS_BANDS.length - 1]).id
}

/** Potential value by stage and by days waiting: the cost of a slow queue. */
export function valueHeldUp(contracts: Contract[]): {
  byStage: { stage: Stage; money: Money; count: number }[]
  byDays: { band: DaysBand; label: string; money: Money; count: number }[]
} {
  const potential = contracts.filter(isPotential)
  return {
    byStage: PRE_SIGNATURE_STAGES.map((stage) => {
      const set = potential.filter((c) => c.stage === stage)
      return { stage, money: sumMoney(set), count: set.length }
    }),
    byDays: DAYS_BANDS.map((b) => {
      const set = potential.filter((c) => daysBand(c.daysInStage) === b.id)
      return { band: b.id, label: b.label, money: sumMoney(set), count: set.length }
    }),
  }
}

export type BreakdownKey = "sponsor" | "department" | "college" | "piName" | "agreementType" | "fiscalYear"

export const BREAKDOWN_LABEL: Record<BreakdownKey, string> = editionMap({
  sponsor: "Sponsor or licensee",
  department: "Department",
  college: "College",
  piName: "PI",
  agreementType: "Agreement type",
  fiscalYear: "Fiscal year",
}, { sponsor: "Vendor" })

/** Breakdowns that only research administration records (college, PI). */
export const RESEARCH_BREAKDOWNS: BreakdownKey[] = ["college", "piName"]

function breakdownValue(c: Contract, key: BreakdownKey): string {
  switch (key) {
    case "sponsor": return c.sponsor || c.counterparty || "Not recorded"
    case "fiscalYear": return c.fiscalYear ? `FY${c.fiscalYear}` : "Not recorded"
    case "agreementType": return c.agreementType
    default: return c[key] || "Not recorded"
  }
}

export interface BreakdownRow {
  key: string
  count: number
  current: Money
  potential: Money
}

export function breakdown(contracts: Contract[], key: BreakdownKey): BreakdownRow[] {
  const groups = new Map<string, Contract[]>()
  for (const c of contracts) {
    const k = breakdownValue(c, key)
    groups.set(k, [...(groups.get(k) ?? []), c])
  }
  return [...groups.entries()]
    .map(([k, set]) => ({ key: k, count: set.length, current: sumMoney(set.filter(isCurrent)), potential: sumMoney(set.filter(isPotential)) }))
    .sort((a, b) => (b.current.totals[0]?.amount ?? 0) + (b.potential.totals[0]?.amount ?? 0)
      - ((a.current.totals[0]?.amount ?? 0) + (a.potential.totals[0]?.amount ?? 0)) || b.count - a.count)
}

// ── Bottlenecks (Requirement 3) ────────────────────────────────────────────

export interface StageQueue {
  stage: Stage
  count: number
  averageDays: number | null
  overdue: number
  late: number
}

export function stageQueues(contracts: Contract[]): StageQueue[] {
  const open = contracts.filter(isOpen)
  return STAGES.filter((s) => PRE_SIGNATURE_STAGES.includes(s)).map((stage) => {
    const set = open.filter((c) => c.stage === stage)
    return {
      stage,
      count: set.length,
      averageDays: set.length ? Math.round((set.reduce((s, c) => s + c.daysInStage, 0) / set.length) * 10) / 10 : null,
      overdue: set.filter((c) => c.slaStatus === "red").length,
      late: set.filter((c) => c.slaStatus === "amber").length,
    }
  })
}

export interface WaitingQueue {
  kind: WaitingOnKind
  label: string
  count: number
  averageDays: number | null
  /** Who exactly, within the kind (each office, each reviewer, each sponsor). */
  who: { label: string; count: number; averageDays: number }[]
}

export function waitingQueues(contracts: Contract[]): WaitingQueue[] {
  const open = contracts.filter(isUnsigned)
  const kinds: WaitingOnKind[] = ["internal_reviewer", "internal_office", "counterparty", "pi_department", "signatory"]
  return kinds
    .map((kind) => {
      const set = open.filter((c) => c.waitingOn.kind === kind)
      const byWho = new Map<string, number[]>()
      for (const c of set) {
        const who = c.waitingOn.person?.name || c.waitingOn.person?.email || c.waitingOn.label
        byWho.set(who, [...(byWho.get(who) ?? []), c.daysInStage])
      }
      return {
        kind,
        label: WAITING_ON_SHORT[kind],
        count: set.length,
        averageDays: set.length ? Math.round((set.reduce((s, c) => s + c.daysInStage, 0) / set.length) * 10) / 10 : null,
        who: [...byWho.entries()]
          .map(([label, days]) => ({ label, count: days.length, averageDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 }))
          .sort((a, b) => b.count - a.count),
      }
    })
    .filter((q) => q.count > 0)
}

// ── Filters and plain-word search (Requirement 3 filters, Requirement 5 search) ──

export type ValueBand = "all" | "under_100k" | "100k_500k" | "500k_1m" | "over_1m" | "unknown"

export const VALUE_BAND_LABEL: Record<ValueBand, string> = {
  all: "Any value",
  under_100k: "Under 100k",
  "100k_500k": "100k – 500k",
  "500k_1m": "500k – 1M",
  over_1m: "Over 1M",
  unknown: "No value yet",
}

export function inValueBand(c: Contract, band: ValueBand): boolean {
  if (band === "all") return true
  if (c.value === null) return band === "unknown"
  if (band === "unknown") return false
  const v = c.value
  if (band === "under_100k") return v < 100_000
  if (band === "100k_500k") return v >= 100_000 && v < 500_000
  if (band === "500k_1m") return v >= 500_000 && v < 1_000_000
  return v >= 1_000_000
}

export interface ContractFilters {
  q: string
  agreementType: AgreementType | "all"
  department: string | "all"
  reviewer: string | "all"
  sponsor: string | "all"
  valueBand: ValueBand
  risk: "all" | "needs_attention" | "high" | "critical"
}

export const NO_FILTERS: ContractFilters = {
  q: "", agreementType: "all", department: "all", reviewer: "all", sponsor: "all", valueBand: "all", risk: "all",
}

/** Plain words match any of: title, sponsor, counterparty, PI, department,
 *  college, reviewer, Huron id, Workday ref. Every word must match somewhere. */
export function matchesSearch(c: Contract, q: string): boolean {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = [
    c.title, c.sponsor, c.counterparty, c.piName, c.department, c.college,
    c.owner?.name, c.owner?.email, c.huronRecordId, c.workdayRef, c.waitingOn.label,
  ].filter(Boolean).join(" ").toLowerCase()
  return words.every((w) => hay.includes(w))
}

export function applyFilters(contracts: Contract[], f: ContractFilters): Contract[] {
  return contracts.filter((c) => {
    if (!matchesSearch(c, f.q)) return false
    if (f.agreementType !== "all" && c.agreementType !== f.agreementType) return false
    if (f.department !== "all" && (c.department ?? "") !== f.department) return false
    if (f.reviewer !== "all" && (c.owner?.email ?? "") !== f.reviewer) return false
    if (f.sponsor !== "all" && (c.sponsor || c.counterparty || "") !== f.sponsor) return false
    if (!inValueBand(c, f.valueBand)) return false
    if (f.risk === "needs_attention" && !needsAttention(c)) return false
    if (f.risk === "high" && c.overallRisk !== "high" && c.overallRisk !== "critical") return false
    if (f.risk === "critical" && c.overallRisk !== "critical") return false
    return true
  })
}

/** The option lists for the filter selects, from the contracts themselves. */
export function filterOptions(contracts: Contract[]) {
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort()
  const reviewers = new Map<string, string>()
  for (const c of contracts) if (c.owner) reviewers.set(c.owner.email, c.owner.name || c.owner.email)
  return {
    departments: uniq(contracts.map((c) => c.department)),
    sponsors: uniq(contracts.map((c) => c.sponsor || c.counterparty)),
    reviewers: [...reviewers.entries()].map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function isFiltering(f: ContractFilters): boolean {
  return JSON.stringify(f) !== JSON.stringify(NO_FILTERS)
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** "$1,250,000" or "$1,250,000 + €40,000"; "—" when nothing is valued. */
export function formatMoney(money: Money): string {
  if (money.totals.length === 0) return "—"
  return money.totals.map((t) => fmtMoney(t.amount, t.currency || null)).join(" + ")
}

/** Compact form for tiles and charts: "$1.25M", "$480k". */
export function formatCompact(amount: number, currency?: string | null): string {
  const sym = currencySymbol(currency)
  const abs = Math.abs(amount)
  // Number() drops trailing zeros of the decimals only: 10 stays "10", 1.50 → "1.5".
  const text = abs >= 999_500 ? `${Number((abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2))}M`
    : abs >= 1_000 ? `${Math.round(abs / 1_000)}k` : `${Math.round(abs)}`
  return `${amount < 0 ? "−" : ""}${sym}${text}`
}

export function contractValueText(c: Contract): string {
  return c.value === null ? "No value yet" : fmtMoney(c.value, c.currency)
}
