// The contract timeline: the newest entries from the contract detail, older
// pages from GET /contracts/{id}/activity, and the type filters and search
// the Activity tab offers.

import { ACTIVITY_LABEL, personName } from "./labels"
import type { ActivityAction, ActivityEntry, ContractDetail } from "./types"

export type ActivityFilter = "all" | "comments" | "decisions" | "stage" | "items" | "versions" | "edits"

const GROUPS: Record<Exclude<ActivityFilter, "all">, readonly ActivityAction[]> = {
  comments: ["comment"],
  decisions: [
    "assigned", "reassigned", "approved", "office_approved", "sent_back", "escalated", "rejected",
    "signature_sent", "signed", "activated", "closed", "reopened", "pi_requested", "pi_answered",
  ],
  stage: ["intake", "stage_changed", "overdue"],
  items: [
    "blocker_added", "blocker_closed", "blocker_edited", "blocker_reopened",
    "obligation_added", "obligation_done", "obligation_verified",
  ],
  versions: ["revision_received", "rescored"],
  edits: ["field_updated", "sync", "conflict", "notification_sent"],
}

export const ACTIVITY_FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "comments", label: "Comments" },
  { id: "decisions", label: "Decisions" },
  { id: "stage", label: "Stage" },
  { id: "items", label: "Items" },
  { id: "versions", label: "Versions" },
  { id: "edits", label: "Edits" },
]

export function activityGroup(action: ActivityAction): Exclude<ActivityFilter, "all"> | null {
  for (const [group, actions] of Object.entries(GROUPS) as [Exclude<ActivityFilter, "all">, readonly ActivityAction[]][]) {
    if (actions.includes(action)) return group
  }
  return null
}

/** Entries of one type that match the search (summary, label or person). */
export function filterActivity(entries: ActivityEntry[], filter: ActivityFilter, query: string): ActivityEntry[] {
  const q = query.trim().toLowerCase()
  return entries.filter((e) => {
    if (filter !== "all" && activityGroup(e.action) !== filter) return false
    if (!q) return true
    const who = e.actor ? `${personName(e.actor)} ${e.actor.email}` : "sonar"
    return [e.summary, ACTIVITY_LABEL[e.action] ?? e.action, who].some((s) => s?.toLowerCase().includes(q))
  })
}

/** Counts per filter, for the chips. */
export function activityCounts(entries: ActivityEntry[]): Record<ActivityFilter, number> {
  const out: Record<ActivityFilter, number> = { all: entries.length, comments: 0, decisions: 0, stage: 0, items: 0, versions: 0, edits: 0 }
  for (const e of entries) {
    const g = activityGroup(e.action)
    if (g) out[g]++
  }
  return out
}

/** The detail's entries and any older pages as one list: newest first, each entry once. */
export function mergeActivity(first: ActivityEntry[], pages: { entries: ActivityEntry[] }[] = []): ActivityEntry[] {
  const seen = new Set<string>()
  const out: ActivityEntry[] = []
  for (const e of [first, ...pages.map((p) => p.entries)].flat()) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * How many entries the contract has, for the tab badge. Older APIs send no
 * count (and up to 200 entries): count what came. "200+" when the log is
 * longer than the server counted.
 */
export function activityTotal(c: Pick<ContractDetail, "activity" | "activityCount" | "activityHasMore">): { count: number; label: string } {
  const count = c.activityCount ?? c.activity.length
  return { count, label: c.activityHasMore ? `${count}+` : String(count) }
}
