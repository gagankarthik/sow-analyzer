// "Is this analysis complete?" for one document: the review flags, extraction
// coverage and unclassified-clause count the newer analysis records, read from
// the classification first and the document row second.
//
// Every value is null / [] when the API did not send it. `assessed` says
// whether the document was analyzed by a version that reports these at all, so
// an older document reads "not assessed" rather than "nothing to review".

import type { ApiClassification } from "./types"

/** The review fields a document row may carry (absent on older documents). */
export interface DocumentReviewFields {
  needsReview?: boolean | null
  reviewReasons?: unknown
  extractionCoverage?: number | null
  unclassifiedCount?: number | null
  clauseTypes?: unknown
}

export interface ExtractionReview {
  /** False when neither the row nor the classification reports on review. */
  assessed: boolean
  needsReview: boolean
  reasons: string[]
  /** Share of the document's text held in its clauses, 0 to 1; null = unknown. */
  coverage: number | null
  /** Clauses the analysis could not type; null = unknown. */
  unclassified: number | null
  /** True when there is anything a reader should be told about. */
  incomplete: boolean
}

const reasons = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []

export function extractionReview(
  /** A document row. Typed loosely because rows from an older API carry none
   *  of these fields. */
  row: object | null | undefined,
  classification?: Pick<ApiClassification, "needsReview" | "reviewReasons" | "extraction" | "clauses"> | null,
): ExtractionReview {
  const doc = row as DocumentReviewFields | null | undefined
  const flag = classification?.needsReview ?? doc?.needsReview ?? null
  const list = classification?.reviewReasons ?? reasons(doc?.reviewReasons)
  const coverage = classification?.extraction?.coverageRatio ?? doc?.extractionCoverage ?? null
  // Counted from the clauses themselves when they are loaded: that is exactly
  // what the list below the banner shows.
  const counted = classification?.clauses.some((c) => c.classificationStatus != null)
    ? classification.clauses.filter((c) => c.classificationStatus === "unclassified").length
    : null
  const unclassified = counted ?? classification?.extraction?.unclassifiedCount ?? doc?.unclassifiedCount ?? null
  const assessed = flag !== null || coverage !== null || unclassified !== null
  return {
    assessed,
    needsReview: flag === true,
    reasons: list,
    coverage: typeof coverage === "number" && Number.isFinite(coverage) ? coverage : null,
    unclassified,
    incomplete: flag === true || list.length > 0 || (unclassified ?? 0) > 0,
  }
}
