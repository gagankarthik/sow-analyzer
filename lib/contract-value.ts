// Best-effort contract-value extraction. The backend has no structured
// financial fields, so we estimate from monetary amounts in the analyzed
// text. The model treats a contract's value as a running TOTAL: the SOW
// sets the initial total, and each amendment states a NEW total (or a
// delta) — we never blindly sum the largest number in every document.
//
// Example: SOW "$7,500" → Amendment "New Total Project Cost: $10,000"
//   ⇒ SOW initial $7,500 + Amendment +$2,500 = Total $10,000.

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
export function fmtMoney(n: number): string {
  if (!n || n <= 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

export type ValuedDoc = { docId: string; title: string; isAmendment: boolean; createdAt: string; classification?: ApiClassification };
export type ValueSegment = { docId: string; title: string; label: string; value: number; isAmendment: boolean };

/**
 * Running-total model across a contract's documents (SOW first, then
 * amendments by date). Returns the final total and the per-document
 * contributions (SOW initial, then each amendment's delta) — which sum
 * to the total.
 */
export function computeContractValue(docsIn: ValuedDoc[]): { total: number; segments: ValueSegment[] } {
  const ordered = [...docsIn].sort((a, b) =>
    a.isAmendment === b.isAmendment ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : a.isAmendment ? 1 : -1,
  );
  let running = 0;
  let started = false;
  let am = 0;
  const segments: ValueSegment[] = [];

  for (const d of ordered) {
    const texts = textsOf(d.classification);
    if (texts.length === 0) continue;
    const statedTotal = nearest(texts, TOTAL_KW);
    const delta = nearest(texts, DELTA_KW);

    if (!started) {
      const base = statedTotal || nearest(texts, VALUE_KW) || largest(texts);
      if (base <= 0) continue;
      running = base;
      started = true;
      segments.push({ docId: d.docId, title: d.title, label: d.isAmendment ? `Amendment ${++am}` : "SOW initial", value: base, isAmendment: d.isAmendment });
      continue;
    }

    let added: number;
    if (statedTotal > 0) { added = statedTotal - running; running = statedTotal; }
    else if (delta > 0) { added = delta; running += delta; }
    else continue; // no reliable monetary signal — don't invent value

    segments.push({ docId: d.docId, title: d.title, label: d.isAmendment ? `Amendment ${++am}` : d.title || "Document", value: added, isAmendment: d.isAmendment });
  }
  return { total: running, segments };
}

/** Convenience: just the contract total for a set of documents. */
export function contractTotal(docsIn: ValuedDoc[]): number {
  return computeContractValue(docsIn).total;
}
