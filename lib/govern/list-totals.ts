// The Contracts list footer: how many are in view and three calculations
// over exactly those rows. Value sums only amounts in one currency (the
// organization's); the others are counted, never converted.

import type { Contract } from "./types"

export interface ListTotals {
  count: number
  /** Sum of known values in `currency` (a value with no currency counts as it). */
  valueSum: number
  /** Contracts with a value in another currency, left out of the sum. */
  otherCurrency: number
  /** Mean days in the current step, or null with no rows. */
  avgDays: number | null
  overdue: number
}

export function listTotals(rows: Contract[], currency: string): ListTotals {
  const cur = currency.toUpperCase()
  let valueSum = 0
  let otherCurrency = 0
  let days = 0
  let overdue = 0
  for (const c of rows) {
    if (c.value !== null) {
      if (!c.currency || c.currency.toUpperCase() === cur) valueSum += c.value
      else otherCurrency += 1
    }
    days += c.daysInStage
    if (c.slaStatus === "red") overdue += 1
  }
  return { count: rows.length, valueSum, otherCurrency, avgDays: rows.length ? days / rows.length : null, overdue }
}
