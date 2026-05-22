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

import type { ApiClassification, ApiDocument } from "@/lib/types";

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

/** Backend-persisted, validated commercial figures carried on the document list
 *  row (written by the persist stage). These are authoritative — when present
 *  they take precedence over figures re-extracted from the classification, and
 *  over the text-scraping estimate. This is the single source of truth. */
export type DocCommercials = {
  contractValue?: number | null;
  baseValue?: number | null;
  valueDelta?: number | null;
  currency?: string | null;
  reconciled?: boolean | null;
};

/** Pull the validated commercial fields off a document list row. */
export function persistedOf(d: Pick<ApiDocument, "contractValue" | "baseValue" | "valueDelta" | "currency" | "reconciled">): DocCommercials {
  return {
    contractValue: d.contractValue ?? null,
    baseValue: d.baseValue ?? null,
    valueDelta: d.valueDelta ?? null,
    currency: d.currency ?? null,
    reconciled: d.reconciled ?? null,
  };
}

export type ValuedDoc = { docId: string; title: string; isAmendment: boolean; createdAt: string; classification?: ApiClassification; persisted?: DocCommercials };
export type ValueSegment = {
  docId: string; title: string; label: string; value: number; isAmendment: boolean;
  /** Verbatim text the figure was read from (when the backend extracted it). */
  source?: string | null;
  /** Whether the validation agent reconciled this document's figures. */
  reconciled?: boolean | null;
};

/** Structured, validated commercials for a single document (or null if absent).
 *  The backend-persisted figures (`persisted`) are authoritative and win over the
 *  classification's re-extracted commercials; the classification fills any gap.
 *  An amendment's persisted `contractValue` is its stated NEW contract total. */
function structured(d: { classification?: ApiClassification; persisted?: DocCommercials; isAmendment?: boolean }): {
  base: number | null; total: number | null; delta: number | null; newTotal: number | null;
  source: string | null; currency: string | null; reconciled: boolean | null;
} | null {
  const c = d.classification;
  const p = d.persisted;
  const com = c?.commercials;
  const am = c?.amendment;
  const isAmendment = !!d.isAmendment || (!!am && am.amendmentType !== "none");
  const hasPersisted = !!p && (p.contractValue != null || p.baseValue != null || p.valueDelta != null);
  if (!hasPersisted && !com && !isAmendment) return null;
  return {
    base: p?.baseValue ?? com?.baseValue ?? null,
    total: p?.contractValue ?? com?.totalContractValue ?? null,
    delta: p?.valueDelta ?? am?.valueDelta ?? null,
    newTotal: am?.newTotalValue ?? (isAmendment ? p?.contractValue ?? null : null),
    source: com?.valueSource ?? null,
    currency: p?.currency ?? com?.currency ?? null,
    reconciled: p?.reconciled ?? c?.validation?.reconciled ?? null,
  };
}

// Line-item label classes. A CONTRACT-CHAIN figure is the base/original SOW fee,
// an amendment line, or a rolled-up total — as opposed to an internal phase/task
// (e.g. "Development", "QA") that's only part of one document's own breakdown.
const TOTAL_LABEL = /(new total|total project cost|total contract|grand total|not to exceed|revised total|amended total|total cost|new contract)/i;
const BASE_LABEL = /(\bsow\b|original|base|initial|statement of work)/i;
const AMENDMENT_LABEL = /(amendment|change\s*order|addendum|side\s*letter|\bamd\b|#\s*\d)/i;

const isBaseLabel = (l: string) => BASE_LABEL.test(l);
const isAmendmentLabel = (l: string) => AMENDMENT_LABEL.test(l) && !BASE_LABEL.test(l);
const isTotalLabel = (l: string) => TOTAL_LABEL.test(l) && !BASE_LABEL.test(l) && !AMENDMENT_LABEL.test(l);

/**
 * Build the value breakdown from a document's VALIDATED line items, but ONLY
 * when they enumerate the contract CHAIN — the base/SOW fee + each amendment +
 * (optionally) a stated total that reconciles, e.g. SOW $7,500 + Amd#1 $3,000 +
 * Amd#2 $1,800 = $12,300.
 *
 * Crucially it ignores a single document's INTERNAL phase/task breakdown — a
 * SOW's "Discovery / Development / QA" lines that merely sum to its own fee.
 * Those previously hijacked the total (they reconcile to the SOW's $7,500) and
 * hid every amendment, so the portfolio showed the SOW value only. We require an
 * original/base line AND at least one amendment line before trusting it.
 */
function lineItemBreakdown(c: ApiClassification | undefined, docId: string, title: string): { segments: ValueSegment[]; total: number; currency: string | null } | null {
  const all = (c?.validation?.lineItems ?? []).filter((i) => i.amount != null && (i.amount as number) > 0);
  if (all.length === 0) return null;

  // Keep only contract-chain figures (base, amendments, an explicit total);
  // drop internal phase/component lines.
  const chain = all.filter((i) => isBaseLabel(i.label) || isAmendmentLabel(i.label) || isTotalLabel(i.label));
  // A genuine multi-document chain needs an original/base fee AND ≥1 amendment.
  if (!chain.some((i) => isBaseLabel(i.label)) || !chain.some((i) => isAmendmentLabel(i.label))) return null;

  const currency = c?.commercials?.currency ?? null;
  const totalItem = chain.find((i) => isTotalLabel(i.label));
  const stated = totalItem ? (totalItem.amount as number) : (c?.commercials?.totalContractValue ?? null);
  if (stated == null) return null;

  const comps = chain.filter((i) => i !== totalItem);
  if (comps.length < 2) return null; // base + ≥1 amendment
  const sum = comps.reduce((a, i) => a + (i.amount as number), 0);
  if (Math.abs(sum - stated) > 1) return null; // doesn't reconcile — don't trust it

  let am = 0;
  const segments: ValueSegment[] = comps.map((i) => {
    const base = isBaseLabel(i.label);
    return {
      docId, title, value: i.amount as number, isAmendment: !base,
      label: base ? "SOW initial" : i.label || `Amendment ${++am}`,
      source: i.source ?? null, reconciled: true,
    };
  });
  return { segments, total: stated, currency };
}

// A document's explicitly-stated CURRENT/NEW contract total — the authoritative
// figure that supersedes a sum of deltas (e.g. "New Total Project Cost: $12,300").
// Strong phrases only: a generic "total fees" of a SOW is its own fee, not a chain total.
const NEWTOTAL_KW = /(new total project cost|new total|revised total|amended total|updated total|total contract (?:value|price|sum)|new contract (?:value|price|sum)|total project cost)/i;

/** The stated contract-wide total this document declares, if any.
 *
 *  Critical: a document's `total` is the chain total ONLY when it EXCEEDS the
 *  running base — i.e. it already rolls up amendments (e.g. a SOW that lists its
 *  amendments and a restated "new total"). A SOW's own total (which equals its
 *  base) is NOT the chain total: later amendments still add on top of it. The
 *  previous `s.total > ownPiece` test wrongly locked a SOW's own fee as the
 *  whole-contract total whenever no separate base was extracted (ownPiece → 0),
 *  which made the portfolio total ignore every amendment and show the SOW only. */
function declaredTotal(
  s: ReturnType<typeof structured>,
  texts: string[],
  runningBase: number,
): number | null {
  if (s) {
    // An amendment's explicit "new total" is always the authoritative total.
    if (s.newTotal != null && s.newTotal > 0) return s.newTotal;
    // A stated total that exceeds what we've accumulated as this document's own
    // base means it already includes amendments — treat it as the chain total.
    if (s.total != null && s.total > runningBase) return s.total;
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

  // Best source of truth: a document whose VALIDATED line items enumerate the
  // base + each amendment + a reconciling total (the latest amendment's "Revised
  // Total" recap, or a SOW that summarizes its amendments). Since `ordered` puts
  // the SOW first then amendments by date, keep the LAST such recap — it's the
  // most current chain total (an earlier amendment states a smaller, stale one).
  let chainBreakdown: ReturnType<typeof lineItemBreakdown> = null;
  for (const d of ordered) {
    const bd = lineItemBreakdown(d.classification, d.docId, d.title || "Untitled");
    if (bd) chainBreakdown = bd;
  }
  if (chainBreakdown) return { total: chainBreakdown.total, segments: chainBreakdown.segments, currency: chainBreakdown.currency, reconciled: true };

  let running = 0;
  let started = false;
  let am = 0;
  let currency: string | null = null;
  let statedFinal: number | null = null;   // latest authoritative stated total
  const segments: ValueSegment[] = [];

  for (const d of ordered) {
    const s = structured(d);
    const texts = textsOf(d.classification);
    if (s?.currency && !currency) currency = s.currency;

    if (!started) {
      // First document — establishes the base/initial total. Prefer the
      // validated base, then the stated total (the SOW's own total when no
      // separate base is given), and only then the text-scraping estimate.
      let base = s?.base ?? s?.total ?? null;
      if (base == null) base = nearest(texts, VALUE_KW) || largest(texts) || 0;
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

/** A single document's own stated value — the canonical "this document's
 *  contract value." Prefers the backend-persisted/validated figure, then the
 *  extracted total/newTotal/base, and finally the text estimate. Pass the
 *  document's persisted commercials (via persistedOf) so it agrees with the
 *  project-total computed by computeContractValue. */
export function docValue(c?: ApiClassification, persisted?: DocCommercials): number {
  const s = structured({ classification: c, persisted });
  if (s) {
    if (s.total != null) return s.total;
    if (s.newTotal != null) return s.newTotal;
    if (s.base != null) return s.base;
    if (s.delta != null) return s.delta;
  }
  const texts = textsOf(c);
  return nearest(texts, TOTAL_KW) || nearest(texts, VALUE_KW) || largest(texts) || 0;
}
