// Bulk update helpers: split a selection into requests the API accepts and
// fold the answers back into one result, so 450 contracts read as one job.

import { BULK_LIMIT, type BulkResult, type BulkUpdateResponse } from "./types"

/** `items` in runs of at most `size` (the last may be shorter). */
export function chunk<T>(items: T[], size: number = BULK_LIMIT): T[][] {
  if (size < 1) throw new Error("chunk size must be at least 1")
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** One response for several requests. A request that failed outright marks
 *  each of its contracts as failed with the request's error. */
export function mergeBulkResponses(
  parts: ({ ok: true; ids: string[]; response: BulkUpdateResponse } | { ok: false; ids: string[]; message: string })[],
): BulkUpdateResponse & { failed: Extract<BulkResult, { ok: false }>[] } {
  const results: BulkResult[] = []
  let updated = 0
  for (const p of parts) {
    if (p.ok) {
      results.push(...p.response.results)
      updated += p.response.updated
    } else {
      for (const contractId of p.ids) results.push({ contractId, ok: false, error: { code: "request_failed", message: p.message } })
    }
  }
  const failed = results.filter((r): r is Extract<BulkResult, { ok: false }> => !r.ok)
  return { results, updated, failed }
}
