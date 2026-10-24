// The properties a contract row or card can show as chips (Display → Show
// properties), and the small rules behind them. The list's chips are its
// columns: the same ids, the same hidden set and order, so a view saved in
// one layout shows the same fields in the other.

import { PRE_SIGNATURE_STAGES, STAGES } from "./labels"
import type { Contract, Stage } from "./types"
import type { RiskLevel } from "@/lib/types"

/** Columns that are the row itself, never a chip. */
const NOT_A_CHIP = new Set(["title"])

/** The chips to draw, in column order: every column that is not hidden and
 *  is a property (the name is the row itself). */
export function visibleProperties(order: string[], hidden: readonly string[]): string[] {
  const off = new Set(hidden)
  return order.filter((id) => !NOT_A_CHIP.has(id) && !off.has(id))
}

/** Flip one property on or off in a hidden list (no duplicates). */
export function toggleHidden(hidden: readonly string[], id: string, show: boolean): string[] {
  const rest = hidden.filter((x) => x !== id)
  return show ? rest : [...rest, id]
}

/** Filled bars (of four) for a risk level; 0 when not assessed. */
export function riskBars(risk: RiskLevel | null): number {
  switch (risk) {
    case "low": return 1
    case "medium": return 2
    case "high": return 3
    case "critical": return 4
    default: return 0
  }
}

/** The contract's own reference number when it has one (Huron record or
 *  Workday reference), else null. Never made up from the internal id. */
export function contractRef(c: Pick<Contract, "huronRecordId" | "workdayRef">): string | null {
  return c.huronRecordId?.trim() || c.workdayRef?.trim() || null
}

/* ─── The board's columns ────────────────────────────────────────── */

export type BoardPhase = "before" | "after" | "all"

const AFTER: Stage[] = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s))

export function phaseStages(phase: BoardPhase): Stage[] {
  return phase === "before" ? PRE_SIGNATURE_STAGES : phase === "after" ? AFTER : STAGES
}

/** With nothing picked: the side of signature with agreements on it
 *  (before signature first), so the board never opens on empty columns. */
export function defaultPhase(countFor: (s: Stage) => number): BoardPhase {
  if (PRE_SIGNATURE_STAGES.some((s) => countFor(s) > 0)) return "before"
  if (AFTER.some((s) => countFor(s) > 0)) return "after"
  return "before"
}

/** Card chips on the board, in the order they sit on the card. */
export const CARD_PROPERTIES = [
  { id: "counterparty", label: "Counterparty" },
  { id: "risk", label: "Risk" },
  { id: "days", label: "Days in step" },
  { id: "value", label: "Value" },
  { id: "type", label: "Agreement type" },
  { id: "waitingOn", label: "Waiting on" },
  { id: "owner", label: "Owner" },
] as const

export type CardPropertyId = (typeof CARD_PROPERTIES)[number]["id"]
export const CARD_PROPERTY_IDS: string[] = CARD_PROPERTIES.map((p) => p.id)
/** Off until someone turns them on. */
export const CARD_DEFAULT_HIDDEN: string[] = ["type", "waitingOn"]
