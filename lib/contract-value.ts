// Contract-value model. The backend now extracts and VALIDATES structured
// commercials (baseValue, each amendment's valueDelta / newTotalValue) with a
// reconciliation check, so when those are present we use them directly — they
// are read verbatim from the document and add up against it.
//
// For documents processed before the structured extractor existed, we fall back
// to a best-effort heuristic over the analyzed text: the contract value is a
// running TOTAL — the SOW sets the initial total, each amendment states a new
// total (or a delta). We never blindly sum the largest number in every document.
//
// Example: SOW $7,500 → Amendment #1 +$3,000 → Amendment #2 +$1,800
//   ⇒ SOW initial $7,500 + Amendment #1 +$3,000 + Amendment #2 +$1,800 = $12,300.

import type { ApiClassification } from "@/lib/types";

// "This is the running/contract total as of this document."
const TOTAL_KW = /(new total|total project cost|total contract (?:value|price|sum|cost)|total (?:fees?|amount|cost|price|value)|contract (?:sum|value|price)|fixed price|not to exceed|grand total|aggregate (?:fees?|amount|cost))/i;
// "This is what this amendment adds."
const DELTA_KW = /(additional|increase(?:d|s)?|incremental|amendment (?:fee|amount|cost)|this amendment|added cost|change order|extra (?:cost|fee))/i;
// Generic value signal (fallback).
const VALUE_KW = /(total|fees?|value|compensation|consideration|price|amount|payable|cost|budget|sum)/i;

function amounts(text: string): { n: number; idx: number }[] {
  const re = /\$\s?([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|m|mm|million|bn|billion)?/gi;
  const out: { n: number; idx: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let n = parseFloat(m[1].replace(/,/g, ""));
    const u = (m[2] || "").toLowerCase();
    if (u.startsWith("k") || u === "thousand") n *= 1e3;
    else if (u.startsWith("m")) n *= 1e6;
    else if (u.startsWith("b")) n *= 1e9;
    if (Number.isFinite(n) && n > 0) out.push({ n, idx: m.index });
  }
  return out;
}

/** Largest amount that sits near a keyword (within ~70 chars before it). */
function nearest(texts: string[], kw: RegExp): number {
  let best = 0;
  for (const t of texts) {
    for (const { n, idx } of amounts(t)) {
      const ctx = t.slice(Math.max(0, idx - 70), idx + 20);
      if (kw.test(ctx) && n > best) best = n;
    }
  }
  return best;
}
function largest(texts: string[]): number {
  let best = 0;
  for (const t of texts) for (const { n } of amounts(t)) if (n > best) best = n;
  return best;
}

function textsOf(c?: ApiClassification): string[] {
  if (!c) return [];
  return [c.summary, ...c.clauses.flatMap((cl) => [cl.body, cl.summary]), ...c.keyFindings.map((f) => f.detail)].filter((t): t is string => !!t);
}

// Exact, comma-separated dollars — no rounding or K/M abbreviation.
export function fmtMoney(n: number, currency?: string | null): string {
  if (!n || n <= 0) return currencySymbol(currency) + "0";
  return `${currencySymbol(currency)}${Math.round(n).toLocaleString()}`;
}

function currencySymbol(currency?: string | null): string {
  switch ((currency || "USD").toUpperCase()) {
    case "EUR": return "€";
    case "GBP": return "£";
    case "INR": return "₹";
    case "JPY": return "¥";
    default: return "$";
  }
}

export type ValuedDoc = { docId: string; title: string; isAmendment: boolean; createdAt: string; classification?: ApiClassification };
export type ValueSegment = {
  docId: string; title: string; label: string; value: number; isAmendment: boolean;
  /** Verbatim text the figure was read from (when the backend extracted it). */
  source?: string | null;
  /** Whether the validation agent reconciled this document's figures. */
  reconciled?: boolean | null;
};

/** Structured, validated commercials for a single document (or null if absent). */
function structured(c?: ApiClassification): {
  base: number | null; total: number | null; delta: number | null; newTotal: number | null;
  source: string | null; currency: string | null; reconciled: boolean | null;
} | null {
  if (!c) return null;
  const com = c.commercials;
  const am = c.amendment;
  const isAmendment = !!am && am.amendmentType !== "none";
  if (!com && !isAmendment) return null;
  return {
    base: com?.baseValue ?? null,
    total: com?.totalContractValue ?? null,
    delta: am?.valueDelta ?? null,
    newTotal: am?.newTotalValue ?? null,
    source: com?.valueSource ?? null,
    currency: com?.currency ?? null,
    reconciled: c.validation?.reconciled ?? null,
  };
}

// A label that denotes the rolled-up contract total rather than a line item.
const TOTAL_LABEL = /(new total|total project cost|total contract|grand total|not to exceed|revised total|amended total|total cost|new contract)/i;
const BASE_LABEL = /(\bsow\b|original|base|initial|statement of work)/i;

/**
 * Build the value breakdown straight from a single document's VALIDATED line
 * items (each carries a verbatim source). When a document enumerates the base
 * fee + each amendment amount + a stated total that reconciles, those items ARE
 * the authoritative breakdown — e.g. SOW $7,500 + Amd#1 $3,000 + Amd#2 $1,800 =
 * $12,300. Returns null when the items don't form a clean, reconciling set.
 */
function lineItemBreakdown(c: ApiClassification | undefined, docId: string, title: string): { segments: ValueSegment[]; total: number; currency: string | null } | null {
  const items = (c?.validation?.lineItems ?? []).filter((i) => i.amount != null && (i.amount as number) > 0);
  if (items.length < 3) return null; // need base + ≥1 amendment + a stated total

  const currency = c?.commercials?.currency ?? null;
  const totalIdx = items.findIndex((i) => TOTAL_LABEL.test(i.label));
  const stated = totalIdx >= 0 ? (items[totalIdx].amount as number) : (c?.commercials?.totalContractValue ?? null);
  if (stated == null) return null;

  const comps = items.filter((_, idx) => idx !== totalIdx);
  if (comps.length < 2) return null;
  const sum = comps.reduce((a, i) => a + (i.amount as number), 0);
  if (Math.abs(sum - stated) > 1) return null; // doesn't reconcile — don't trust it

  let am = 0;
  const segments: ValueSegment[] = comps.map((i, idx) => {
    const isBase = idx === 0 || BASE_LABEL.test(i.label);
    return {
      docId, title, value: i.amount as number, isAmendment: !isBase,
      label: isBase ? "SOW initial" : i.label || `Amendment ${++am}`,
      source: i.source ?? null, reconciled: true,
    };
  });
  return { segments, total: stated, currency };
}

// A document's explicitly-stated CURRENT/NEW contract total — the authoritative
// figure that supersedes a sum of deltas (e.g. "New Total Project Cost: $12,300").
// Strong phrases only: a generic "total fees" of a SOW is its own fee, not a chain total.
const NEWTOTAL_KW = /(new total project cost|new total|revised total|amended total|updated total|total contract (?:value|price|sum)|new contract (?:value|price|sum)|total project cost)/i;

/** The stated contract-wide total this document declares, if any. */
function declaredTotal(
  s: ReturnType<typeof structured>,
  texts: string[],
  runningBase: number,
): number | null {
  if (s) {
    // An amendment's explicit "new total" is always the authoritative total.
    if (s.newTotal != null && s.newTotal > 0) return s.newTotal;
    // A totalContractValue that exceeds this document's own contribution means
    // it already rolls up amendments (e.g. a SOW that lists its amendments and a
    // new total) — so it's the contract total, not just this doc's fee.
    if (s.total != null && s.total > 0) {
      const ownPiece = Math.max(s.base ?? 0, s.delta ?? 0);
      if (s.total > ownPiece || s.total > runningBase) return s.total;
    }
  }
  const stated = nearest(texts, NEWTOTAL_KW);
  return stated > runningBase ? stated : null;
}

/**
 * Running-total model across a contract's documents (SOW first, then
 * amendments by date). Returns the contract total, the per-document
 * contributions (SOW initial, then each amendment's delta), and whether the
 * parts reconcile to a stated total.
 *
 * The document's explicitly STATED total ("New Total Project Cost", a restated
 * "new total", or a validated totalContractValue) is AUTHORITATIVE — it
 * supersedes a sum of (often heuristic) deltas, which is what previously
 * overshot (e.g. $7,500 + $4,800 + $2,500 = $14,800 instead of the stated
 * $12,300). When the parts don't add up to the stated total we trust the
 * stated total and flag the components as not reconciled.
 */
export function computeContractValue(docsIn: ValuedDoc[]): { total: number; segments: ValueSegment[]; currency: string | null; reconciled: boolean | null } {
  const ordered = [...docsIn].sort((a, b) =>
    a.isAmendment === b.isAmendment ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : a.isAmendment ? 1 : -1,
  );

  // Best source of truth: a single document whose VALIDATED line items already
  // enumerate the base + each amendment + a reconciling total (common when the
  // SOW summarizes its amendments). Those items are exact and source-backed.
  for (const d of ordered) {
    const bd = lineItemBreakdown(d.classification, d.docId, d.title || "Untitled");
    if (bd) return { total: bd.total, segments: bd.segments, currency: bd.currency, reconciled: true };
  }

  let running = 0;
  let started = false;
  let am = 0;
  let currency: string | null = null;
  let statedFinal: number | null = null;   // latest authoritative stated total
  const segments: ValueSegment[] = [];

  for (const d of ordered) {
    const s = structured(d.classification);
    const texts = textsOf(d.classification);
    if (s?.currency && !currency) currency = s.currency;

    if (!started) {
      // First document — establishes the base/initial total.
      let base = s?.base ?? null;
      if (base == null) base = nearest(texts, VALUE_KW) || s?.total || largest(texts) || 0;
      if (base <= 0) continue;
      running = base;
      started = true;
      segments.push({
        docId: d.docId, title: d.title, value: base, isAmendment: d.isAmendment,
        label: d.isAmendment ? `Amendment ${++am}` : "SOW initial",
        source: s?.source ?? null, reconciled: s?.reconciled ?? null,
      });
      const dt = declaredTotal(s, texts, base);
      if (dt != null) statedFinal = dt;
      continue;
    }

    // Subsequent document — add its delta (or close the gap to a new total).
    let added: number | null = null;
    if (s) {
      if (s.delta != null) { added = s.delta; running += s.delta; }
      else if (s.newTotal != null) { added = s.newTotal - running; running = s.newTotal; }
      else if (s.total != null) { added = s.total - running; running = s.total; }
    }
    if (added == null) {
      const delta = nearest(texts, DELTA_KW);
      const statedTotal = nearest(texts, TOTAL_KW);
      if (delta > 0) { added = delta; running += delta; }
      else if (statedTotal > running) { added = statedTotal - running; running = statedTotal; }
      else continue; // no reliable monetary signal — don't invent value
    }

    segments.push({
      docId: d.docId, title: d.title, value: added, isAmendment: d.isAmendment,
      label: d.isAmendment ? `Amendment ${++am}` : d.title || "Document",
      source: s?.source ?? null, reconciled: s?.reconciled ?? null,
    });
    const dt = declaredTotal(s, texts, running - (added ?? 0));
    if (dt != null) statedFinal = dt;
  }

  // Reconcile to the document's stated total when one exists.
  let total = running;
  let reconciled: boolean | null = null;
  if (statedFinal != null && statedFinal > 0) {
    const sum = segments.reduce((acc, x) => acc + x.value, 0);
    reconciled = Math.abs(sum - statedFinal) <= 1;
    total = statedFinal;
    if (!reconciled && segments.length > 0) {
      // Trust the stated whole; absorb the discrepancy into the last segment so
      // the parts add up to the stated total rather than overshooting it.
      const last = segments[segments.length - 1];
      last.value = Math.max(0, last.value + (statedFinal - sum));
    }
  }
  return { total, segments, currency, reconciled };
}

/** Convenience: just the contract total for a set of documents. */
export function contractTotal(docsIn: ValuedDoc[]): number {
  return computeContractValue(docsIn).total;
}

/** A single document's own stated value (validated total/base, else heuristic). */
export function docValue(c?: ApiClassification): number {
  const s = structured(c);
  if (s) {
    if (s.total != null) return s.total;
    if (s.newTotal != null) return s.newTotal;
    if (s.base != null) return s.base;
    if (s.delta != null) return s.delta;
  }
  const texts = textsOf(c);
  return nearest(texts, TOTAL_KW) || nearest(texts, VALUE_KW) || largest(texts) || 0;
}
