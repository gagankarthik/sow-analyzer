// The Contracts list's views, as data. A view is a base (a preset such as
// "In progress") plus the person's settings on top: filters, columns, group,
// sort and density. Presets ship with the app; saved views come from the API
// with the same shape, so both open, change and save the same way.

import { AGREEMENT_TYPE_LABEL, STAGES, STAGE_LABEL, WAITING_ON_SHORT } from "./labels"
import { EMPTY_FILTERS, isRuleComplete, parseFilterGroup } from "./filter-rules"
import { CONTRACT_VIEWS, type ContractView } from "./views"
import type { Contract, FilterGroup, SavedView, ViewConfig, WaitingOnKind } from "./types"

/* ─── Presets ────────────────────────────────────────────────────── */

const MY_CONTRACTS: ContractView = {
  id: "my-contracts",
  label: "My contracts",
  group: "all",
  description: "Every contract you own, in progress and signed.",
  test: (c, { me }) => !!me && c.owner?.email?.toLowerCase() === me,
}

const ALL = CONTRACT_VIEWS.find((v) => v.id === "all")!

/** "Default" in the view picker. */
export const DEFAULT_VIEWS: ContractView[] = [ALL, MY_CONTRACTS]
/** "Quick views": the workflow presets. */
export const QUICK_VIEWS: ContractView[] = CONTRACT_VIEWS.filter((v) => v.id !== "all")

const PRESETS = [...DEFAULT_VIEWS, ...QUICK_VIEWS]

/** The view a bare /contracts opens. */
export const DEFAULT_VIEW_ID = "all"

export function presetById(id: string | null | undefined): ContractView | undefined {
  return id ? PRESETS.find((v) => v.id === id) : undefined
}

/* ─── Settings ───────────────────────────────────────────────────── */

export type Density = "comfortable" | "compact"
export type ListSort = { key: string; dir: "asc" | "desc" } | null

/** What the person can change on top of a view's base. */
export interface ListSettings {
  filters: FilterGroup
  columns: { order: string[]; hidden: string[] }
  groupBy: string | null
  sort: ListSort
  density: Density
}

export interface ColumnDefaults {
  /** Every column id, in the default order. */
  ids: string[]
  hidden: string[]
  sort: ListSort
}

/** Order with every known column exactly once: unknown ids dropped, new
 *  columns slotted in at their default position. */
export function normalizeColumnOrder(order: string[], ids: string[]): string[] {
  const known = new Set(ids)
  const out = [...new Set(order.filter((id) => known.has(id)))]
  ids.forEach((id, i) => {
    if (out.includes(id)) return
    // After the column that precedes it by default, else at the start.
    const prev = ids.slice(0, i).reverse().find((p) => out.includes(p))
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, id)
  })
  return out
}

export function defaultSettings(d: ColumnDefaults, density: Density = "comfortable"): ListSettings {
  return { filters: EMPTY_FILTERS, columns: { order: d.ids, hidden: d.hidden }, groupBy: null, sort: d.sort, density }
}

/** Settings from a saved view's config (untrusted: anything odd falls back). */
export function settingsFromConfig(config: Partial<ViewConfig> | null | undefined, d: ColumnDefaults, density: Density): ListSettings {
  const ids = new Set(d.ids)
  const cols = config?.columns
  const order = Array.isArray(cols?.order) ? normalizeColumnOrder(cols.order.filter((x): x is string => typeof x === "string"), d.ids) : d.ids
  const hidden = Array.isArray(cols?.hidden) ? cols.hidden.filter((x): x is string => typeof x === "string" && ids.has(x)) : d.hidden
  const sort = config?.sort && typeof config.sort.key === "string" && (config.sort.dir === "asc" || config.sort.dir === "desc")
    ? { key: config.sort.key, dir: config.sort.dir } : config?.sort === null ? null : d.sort
  const groupBy = typeof config?.groupBy === "string" && GROUP_BY_IDS.has(config.groupBy) ? config.groupBy : null
  return {
    filters: parseFilterGroup(config?.filters),
    columns: { order, hidden },
    groupBy,
    sort,
    density: config?.density === "compact" || config?.density === "comfortable" ? config.density : density,
  }
}

export function configFromSettings(base: string | null, s: ListSettings): ViewConfig {
  return {
    base,
    filters: { match: s.filters.match, rules: s.filters.rules.filter(isRuleComplete) },
    columns: { order: s.columns.order, hidden: s.columns.hidden },
    groupBy: s.groupBy,
    sort: s.sort,
    density: s.density,
  }
}

/** Same settings? (Hidden columns compare as a set.) */
export function sameSettings(a: ListSettings, b: ListSettings): boolean {
  const norm = (s: ListSettings) => JSON.stringify({
    ...s,
    filters: { match: s.filters.match, rules: s.filters.rules.filter(isRuleComplete) },
    columns: { order: s.columns.order, hidden: [...s.columns.hidden].sort() },
  })
  return norm(a) === norm(b)
}

/** The base a saved view starts from; null or unknown means every contract. */
export function baseOf(view: SavedView): ContractView {
  return presetById(view.config?.base) ?? ALL
}

/* ─── Group by ───────────────────────────────────────────────────── */

export const GROUP_BY_OPTIONS = [
  { id: "stage", label: "Stage" },
  { id: "owner", label: "Owner" },
  { id: "agreementType", label: "Agreement type" },
  { id: "counterparty", label: "Counterparty" },
  { id: "risk", label: "Risk" },
  { id: "waitingOn", label: "Waiting on" },
  { id: "slaStatus", label: "SLA status" },
] as const

const GROUP_BY_IDS = new Set<string>(GROUP_BY_OPTIONS.map((o) => o.id))

export interface ContractGrouping {
  key: (c: Contract) => string
  label: (key: string) => string
  order?: string[]
}

const RISK_GROUP: Record<string, string> = { critical: "Critical risk", high: "High risk", medium: "Medium risk", low: "Low risk", none: "Not assessed" }
const SLA_GROUP: Record<string, string> = { red: "Overdue", amber: "Due soon", on_track: "On track", none: "No target" }

/** How to group the rows for a group-by id; null for none. Labels for people
 *  and parties come from the rows themselves. */
export function groupingFor(id: string | null, rows: Contract[]): ContractGrouping | null {
  switch (id) {
    case "stage":
      return { key: (c) => c.stage, label: (k) => STAGE_LABEL[k as Contract["stage"]] ?? k, order: STAGES }
    case "owner": {
      const names = new Map<string, string>()
      for (const c of rows) if (c.owner?.email) names.set(c.owner.email.toLowerCase(), c.owner.name || c.owner.email)
      return {
        key: (c) => c.owner?.email?.toLowerCase() ?? "",
        label: (k) => (k ? names.get(k) ?? k : "Unassigned"),
        order: [...[...names.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([k]) => k), ""],
      }
    }
    case "agreementType":
      return { key: (c) => c.agreementType, label: (k) => AGREEMENT_TYPE_LABEL[k as Contract["agreementType"]] ?? k }
    case "counterparty": {
      const parties = [...new Set(rows.map((c) => c.counterparty || c.sponsor || ""))].filter(Boolean).sort((a, b) => a.localeCompare(b))
      return { key: (c) => c.counterparty || c.sponsor || "", label: (k) => k || "Not named", order: [...parties, ""] }
    }
    case "risk":
      return { key: (c) => c.overallRisk ?? "none", label: (k) => RISK_GROUP[k] ?? k, order: Object.keys(RISK_GROUP) }
    case "waitingOn":
      return { key: (c) => c.waitingOn.kind, label: (k) => WAITING_ON_SHORT[k as WaitingOnKind] ?? k }
    case "slaStatus":
      return { key: (c) => c.slaStatus, label: (k) => SLA_GROUP[k] ?? k, order: Object.keys(SLA_GROUP) }
    default:
      return null
  }
}

/* ─── Saved views in the picker ──────────────────────────────────── */

/** Mine first (by name), then the ones shared with me. */
export function splitSavedViews(views: SavedView[], me: string | null): { mine: SavedView[]; shared: SavedView[] } {
  const byName = (a: SavedView, b: SavedView) => a.name.localeCompare(b.name)
  const isMine = (v: SavedView) => !!me && v.createdBy?.email?.toLowerCase() === me
  return { mine: views.filter(isMine).sort(byName), shared: views.filter((v) => !isMine(v)).sort(byName) }
}
