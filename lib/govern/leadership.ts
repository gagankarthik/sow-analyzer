// What business leaders ask of the contract portfolio, answered from the
// contracts, obligations and trends as they stand. Counts and sums only:
// different currencies are never added together, unknown values stay unknown.

import { AGREEMENT_TYPE_LABEL } from "./labels"
import { isCurrent, isUnsigned } from "./metrics"
import type { AgreementType, Contract, PortfolioObligation, TrendPeriod } from "./types"

export interface WorkloadRow {
  key: string
  name: string
  email: string | null
  open: number
  overdue: number
  late: number
  longestDays: number
  /** Value of their open contracts in the main currency (null when none is valued). */
  value: number | null
}

/** Open (pre-signature) work per reviewer, busiest first; unassigned last. */
export function workload(contracts: Contract[], currency: string | null): WorkloadRow[] {
  const rows = new Map<string, WorkloadRow>()
  for (const c of contracts.filter(isUnsigned)) {
    const key = c.owner?.email?.toLowerCase() ?? "__unassigned"
    const row = rows.get(key) ?? {
      key,
      name: c.owner ? (c.owner.name || c.owner.email) : "Unassigned",
      email: c.owner?.email ?? null,
      open: 0, overdue: 0, late: 0, longestDays: 0, value: null,
    }
    row.open += 1
    if (c.slaStatus === "red") row.overdue += 1
    if (c.slaStatus === "amber") row.late += 1
    row.longestDays = Math.max(row.longestDays, c.daysInStage)
    if (c.value !== null && (c.currency ?? "").toUpperCase() === (currency ?? "").toUpperCase()) {
      row.value = (row.value ?? 0) + c.value
    }
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) =>
    (a.key === "__unassigned" ? 1 : 0) - (b.key === "__unassigned" ? 1 : 0)
    || b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name))
}

export interface ValueRow {
  key: string
  label: string
  signed: number
  pipeline: number
  count: number
}

function addValue(map: Map<string, ValueRow>, key: string, label: string, c: Contract, currency: string | null) {
  const row = map.get(key) ?? { key, label, signed: 0, pipeline: 0, count: 0 }
  row.count += 1
  if (c.value !== null && (c.currency ?? "").toUpperCase() === (currency ?? "").toUpperCase()) {
    if (isCurrent(c)) row.signed += c.value
    else if (isUnsigned(c)) row.pipeline += c.value
  }
  map.set(key, row)
}

/** Signed and pipeline value per agreement type, in the main currency. */
export function valueByType(contracts: Contract[], currency: string | null): ValueRow[] {
  const map = new Map<string, ValueRow>()
  for (const c of contracts) {
    const t = (c.agreementType ?? "other") as AgreementType
    addValue(map, t, AGREEMENT_TYPE_LABEL[t] ?? "Other", c, currency)
  }
  return [...map.values()].filter((r) => r.signed + r.pipeline > 0).sort((a, b) => b.signed + b.pipeline - (a.signed + a.pipeline))
}

/** The counterparties with the most value, signed plus pipeline. */
export function topCounterparties(contracts: Contract[], currency: string | null, limit = 5): ValueRow[] {
  const map = new Map<string, ValueRow>()
  for (const c of contracts) {
    const name = (c.sponsor || c.counterparty || "").trim()
    if (!name) continue
    addValue(map, name.toLowerCase(), name, c, currency)
  }
  return [...map.values()].filter((r) => r.signed + r.pipeline > 0)
    .sort((a, b) => b.signed + b.pipeline - (a.signed + a.pipeline)).slice(0, limit)
}

export interface RiskRow {
  label: string
  /** Contracts with at least one term the matrix never accepts. */
  unacceptable: number
  /** Contracts with open blockers but nothing unacceptable. */
  open: number
}

/** Open contracts carrying risk, per agreement type. */
export function riskExposure(contracts: Contract[]): { rows: RiskRow[]; unacceptable: number; withBlockers: number } {
  const map = new Map<string, RiskRow>()
  let unacceptable = 0
  let withBlockers = 0
  for (const c of contracts.filter(isUnsigned)) {
    const bad = (c.matrix?.counts.unacceptable ?? 0) > 0
    const blocked = !bad && c.openBlockers > 0
    if (!bad && !blocked) continue
    const t = (c.agreementType ?? "other") as AgreementType
    const label = AGREEMENT_TYPE_LABEL[t] ?? "Other"
    const row = map.get(label) ?? { label, unacceptable: 0, open: 0 }
    if (bad) { row.unacceptable += 1; unacceptable += 1 } else { row.open += 1; withBlockers += 1 }
    map.set(label, row)
  }
  return { rows: [...map.values()].sort((a, b) => b.unacceptable + b.open - (a.unacceptable + a.open)), unacceptable, withBlockers }
}

export interface MonthRow {
  key: string
  label: string
  count: number
  amount: number
}

/** Open obligations due in each of the next three calendar months (from `today`). */
export function obligationsByMonth(obligations: PortfolioObligation[], today: Date = new Date(), months = 3): MonthRow[] {
  const rows: MonthRow[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    rows.push({ key, label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }), count: 0, amount: 0 })
  }
  for (const o of obligations) {
    if (o.status !== "open" || !o.dueDate) continue
    const row = rows.find((r) => o.dueDate!.startsWith(r.key))
    if (!row) continue
    row.count += 1
    row.amount += o.amount ?? 0
  }
  return rows
}

export interface SpeedSummary {
  signedRecent: number
  signedBefore: number
  cycleRecent: number | null
  cycleBefore: number | null
}

/** Last three periods against the three before them. */
export function speed(periods: TrendPeriod[]): SpeedSummary {
  const recent = periods.slice(-3)
  const before = periods.slice(-6, -3)
  const avg = (ps: TrendPeriod[]) => {
    const vals = ps.map((p) => p.avgCycleDays).filter((v): v is number => v !== null)
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
  }
  return {
    signedRecent: recent.reduce((s, p) => s + p.signed, 0),
    signedBefore: before.reduce((s, p) => s + p.signed, 0),
    cycleRecent: avg(recent),
    cycleBefore: avg(before),
  }
}
