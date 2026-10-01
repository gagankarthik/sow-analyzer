// Normalisers for the parts of a classification added by the newer analysis:
// clause structure (id, type key, parent, page, sub-clauses), the per-clause
// playbook result, the review flags and the extraction report.
//
// One rule throughout: a field the API did not send stays absent (undefined or
// null). Nothing is defaulted to a value that reads as a result: an ungraded
// clause is not "within", an unknown coverage is not 100%.

import type { ApiClause, ApiExtractionReport, ApiSubclause, RiskLevel } from "./types"
import { clauseResultsById, normaliseClausePlaybook, type ClausePlaybookResult } from "./playbook"

const RISK: ReadonlySet<string> = new Set(["low", "medium", "high", "critical"])
const STATUS: ReadonlySet<string> = new Set(["classified", "unclassified", "pending"])

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null)

function subclauses(raw: unknown, bodyLength: number): ApiSubclause[] {
  if (!Array.isArray(raw)) return []
  const out: ApiSubclause[] = []
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue
    const r = row as Record<string, unknown>
    const { start, end } = r
    // Offsets that do not fit the body are dropped rather than clamped: a
    // wrong slice would show the wrong text under the item's reference.
    if (typeof start !== "number" || typeof end !== "number" || start < 0 || end <= start || end > bodyLength) continue
    const ref = text(r.ref) ?? text(r.label)
    if (!ref) continue
    out.push({ ref, label: text(r.label) ?? ref, start, end })
  }
  return out
}

/**
 * One clause as the UI uses it. `graded` holds the document's per-clause
 * playbook results keyed by clause id, for a clause that does not carry its own
 * `playbook` field.
 */
export function normaliseClause(raw: unknown, graded?: Map<string, ClausePlaybookResult>): ApiClause {
  const c = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const body = typeof c.body === "string" ? c.body : ""
  const rated = typeof c.riskLevel === "string" && RISK.has(c.riskLevel)
  const id = text(c.id)
  const status = typeof c.classificationStatus === "string" && STATUS.has(c.classificationStatus)
    ? (c.classificationStatus as ApiClause["classificationStatus"])
    : null
  return {
    number: typeof c.number === "string" ? c.number : c.number != null ? String(c.number) : "",
    title: typeof c.title === "string" ? c.title : "",
    body,
    // "" = the API sent no category; the UI labels it "Uncategorised". Any
    // other string is kept verbatim, including categories this app has never seen.
    category: typeof c.category === "string" ? c.category : "",
    // The placeholder keeps older call sites type-safe; `riskRated` records
    // whether the API actually assessed this clause.
    riskLevel: rated ? (c.riskLevel as RiskLevel) : "low",
    riskRated: rated,
    summary: typeof c.summary === "string" ? c.summary : "",
    specificType: text(c.specificType),
    customType: text(c.customType),
    id,
    specificTypeKey: text(c.specificTypeKey),
    typeIsCustom: c.typeIsCustom === true,
    needsReview: c.needsReview === true,
    classificationStatus: status,
    section: text(c.section),
    parent: text(c.parent),
    page: typeof c.page === "number" && c.page > 0 ? c.page : null,
    subclauses: subclauses(c.subclauses, body.length),
    playbook: normaliseClausePlaybook(c.playbook) ?? (id ? graded?.get(id) ?? null : null),
  }
}

/** Clauses of a classification payload, with playbook results joined in. */
export function normaliseClauses(rawClauses: unknown, rawPlaybook: unknown): ApiClause[] {
  if (!Array.isArray(rawClauses)) return []
  const graded = clauseResultsById(rawPlaybook)
  return rawClauses.map((c) => normaliseClause(c, graded))
}

/** The extraction report, or undefined when the API sent none. */
export function normaliseExtraction(raw: unknown): ApiExtractionReport | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const r = raw as Record<string, unknown>
  return {
    coverageRatio: typeof r.coverageRatio === "number" && Number.isFinite(r.coverageRatio) ? r.coverageRatio : null,
    unclassifiedCount: typeof r.unclassifiedCount === "number" ? r.unclassifiedCount : null,
  }
}

/** A list of sentences, or undefined when the API sent no list. */
export function normaliseReasons(raw: unknown): string[] | undefined {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && !!x.trim()) : undefined
}
