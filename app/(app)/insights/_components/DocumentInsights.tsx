"use client";

// Portfolio insights. Six questions, each answered only from data already
// fetched: the shared documents list, each analysed document's classification,
// the projects list and the tenant's enabled compliance packs. Nothing on this
// page is a fixed number or a canned sentence — every figure is a count, a sum
// or a date difference over those responses, and anything the API did not
// provide is shown as "No value yet" / "Not assessed" rather than as zero.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SonarMark } from "@/components/ui/SonarMark";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MotionReveal } from "@/components/MotionReveal";
import { ChartCard } from "@/components/charts/primitives";
import { ValueRiskScatter, type ScatterPoint } from "@/components/charts/ValueRiskScatter";
import { HBarChart, type HBarDatum } from "@/components/charts/HBarChart";
import { CompositionBar, type CompositionSegment } from "@/components/charts/CompositionBar";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { riskIndex } from "@/components/charts/RiskGauge";
import {
  ACCENT, HIGH_RISK_THRESHOLD, NEUTRAL_MARK, RISK_COLOR, RISK_LABEL, RISK_ORDER_DESC,
  SEVERITY_COLOR, SEVERITY_ORDER_DESC, categoricalColor,
} from "@/lib/chart-theme";
import {
  ShieldAlert, AlertTriangle, Info, ScatterChart as ScatterChartIcon, BarChart3, DollarSign,
  CalendarClock, X, RefreshCw, XCircle, Layers, Filter, ArrowRight, CheckCircle2, Files,
} from "@/components/ui/icons";
import { useDocuments, useClassifications, isProcessing } from "@/lib/queries/documents";
import { useCompliancePacks } from "@/lib/queries/compliance";
import { useProjects, withUngroupedDocs } from "@/lib/projects-store";
import { useNow } from "@/lib/use-now";
import { documentKeyDates, formatKeyDate, isoDayToMs, portfolioDates, ruleText, type KeyDateKind } from "@/lib/key-dates";
import { computeContractValue, docValueOrNull, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { clauseTypeLabel } from "@/lib/clause-categories";
import { DOC_TYPE_META, docTypeShort } from "@/lib/doc-types";
import type { ApiDocument, DocType, RiskLevel, FindingSeverity, PricingModel } from "@/lib/types";

const DAY = 86_400_000;
const SEV_RANK: Record<FindingSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success-fg)]",
};
// Fixed orders, so a group keeps its colour whatever the filters leave on screen.
const DOC_TYPE_KEYS = Object.keys(DOC_TYPE_META) as DocType[];
const PRICING_KEYS: PricingModel[] = ["fixed", "time_and_materials", "milestone", "retainer", "mixed", "unknown"];
const PRICING_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed price", time_and_materials: "Time & materials", milestone: "Milestone", retainer: "Retainer", mixed: "Mixed", unknown: "No value yet",
};

type Counts = { low: number; medium: number; high: number; critical: number };
const NO_COUNTS: Counts = { low: 0, medium: 0, high: 0, critical: 0 };
const sum = (c: Counts) => c.low + c.medium + c.high + c.critical;

/** Worst clause level in a set of counts; null when nothing was rated. */
function worst(c: Counts): RiskLevel | null {
  return sum(c) === 0 ? null : c.critical > 0 ? "critical" : c.high > 0 ? "high" : c.medium > 0 ? "medium" : "low";
}

/** A document's overall risk: the level the API stored, else the worst level in
 *  its clause counts, else null (not assessed — never "low" by default). */
function docRisk(d: ApiDocument): RiskLevel | null {
  return d.overallRisk ?? (d.riskCounts ? worst(d.riskCounts) : null);
}

function shortDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function inDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

type AttentionRow = { key: string; docId: string; docTitle: string; number: string; title: string; type: string; summary: string; level: "critical" | "high" };
type Finding = { label: string; detail: string; severity: FindingSeverity; docId: string; docTitle: string };
type DateKind = "Renewal" | "Term end" | "Notice deadline" | "Payment" | "Milestone" | "Deliverable";
/** Label for each kind of key date listed under "What is coming up?". */
const DATE_KIND: Partial<Record<KeyDateKind, DateKind>> = {
  renewal: "Renewal", term_end: "Term end", notice_deadline: "Notice deadline",
  payment: "Payment", milestone: "Milestone", deliverable: "Deliverable",
};
/** How long a passed payment / milestone / deliverable / notice date stays listed. */
const PASSED_DAYS = 90;
type DateRow = { key: string; docId: string; docTitle: string; kind: DateKind; t: number; days: number; note?: string };
type ValueRow = { id: string; name: string; value: number | null; currency: string | null; level: RiskLevel | null; amendmentDelta: number };
type DocRef = { docId: string; title: string; note?: string };

export function DocumentInsights() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const rawProjects = useProjects();
  const packs = useCompliancePacks();
  const now = useNow(); // real current time, re-read every minute

  // Page filters — narrow every block to a document type and/or overall risk
  // level. Client-side only: the query set stays the same.
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const scoped = useMemo(
    () => docs.filter((d) => (typeFilter === "all" || d.docType === typeFilter) && (riskFilter === "all" || docRisk(d) === riskFilter)),
    [docs, typeFilter, riskFilter],
  );
  const readyDocs = useMemo(() => scoped.filter((d) => d.status === "READY"), [scoped]);
  // Types offered by the filter: every type present, in the fixed order.
  const availableTypes = useMemo(() => DOC_TYPE_KEYS.filter((t) => docs.some((d) => d.docType === t)), [docs]);

  const { byDoc: classByDoc, loadingCount: classLoading, failedCount: classFailed } = useClassifications(docs);

  /* ── 1. What needs my attention first? ─────────────────────────────────
     Every clause the analysis rated critical or high, critical first. The text
     is the clause summary returned by the API. */
  const attention = useMemo<AttentionRow[]>(() => {
    const out: AttentionRow[] = [];
    for (const d of readyDocs) {
      (classByDoc.get(d.docId)?.clauses ?? []).forEach((c, i) => {
        if (c.riskRated === false || (c.riskLevel !== "critical" && c.riskLevel !== "high")) return;
        out.push({
          key: `${d.docId}:${c.number}:${i}`, docId: d.docId, docTitle: d.title || "Untitled document",
          number: c.number, title: c.title, type: clauseTypeLabel(c), summary: c.summary, level: c.riskLevel,
        });
      });
    }
    return out.sort((a, b) =>
      (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1) ||
      a.docTitle.localeCompare(b.docTitle) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [readyDocs, classByDoc]);
  const [showAllAttention, setShowAllAttention] = useState(false);

  /* ── 2. Where does risk concentrate? ───────────────────────────────────
     Counts of rated clauses per category × level (heatmap) and per document
     type. Clauses the API returned without a risk level are counted apart. */
  const { ratedClauses, unratedClauses } = useMemo(() => {
    const rated: { category: string; riskLevel: RiskLevel }[] = [];
    let unrated = 0;
    for (const d of readyDocs) {
      for (const c of classByDoc.get(d.docId)?.clauses ?? []) {
        if (c.riskRated === false) unrated += 1;
        else rated.push({ category: c.category, riskLevel: c.riskLevel });
      }
    }
    return { ratedClauses: rated, unratedClauses: unrated };
  }, [readyDocs, classByDoc]);
  const categoryCount = useMemo(() => new Set(ratedClauses.map((c) => c.category)).size, [ratedClauses]);

  // Clause counts per level, from the per-document counts on the list rows.
  const riskCounts = useMemo(() => {
    const r = { ...NO_COUNTS };
    for (const d of readyDocs) if (d.riskCounts) { r.low += d.riskCounts.low; r.medium += d.riskCounts.medium; r.high += d.riskCounts.high; r.critical += d.riskCounts.critical; }
    return r;
  }, [readyDocs]);
  const totalRated = sum(riskCounts);
  const highCrit = riskCounts.high + riskCounts.critical;
  const docsWithoutRisk = readyDocs.filter((d) => !d.riskCounts).length;
  const riskLevelMix: CompositionSegment[] = RISK_ORDER_DESC.map((l) => ({ key: l, label: RISK_LABEL[l], value: riskCounts[l], color: RISK_COLOR[l] }));

  const riskByType: HBarDatum[] = useMemo(() => {
    const m = new Map<DocType, { docs: number; rc: Counts }>();
    for (const d of readyDocs) {
      if (!d.riskCounts) continue;
      const e = m.get(d.docType) ?? { docs: 0, rc: { ...NO_COUNTS } };
      e.docs += 1;
      e.rc.low += d.riskCounts.low; e.rc.medium += d.riskCounts.medium; e.rc.high += d.riskCounts.high; e.rc.critical += d.riskCounts.critical;
      m.set(d.docType, e);
    }
    return [...m.entries()]
      .map(([type, v]) => ({
        id: type,
        label: docTypeShort(type),
        // Bar length = clauses rated high or critical in documents of this type.
        value: v.rc.high + v.rc.critical,
        color: worst(v.rc) ? RISK_COLOR.high : NEUTRAL_MARK,
        sub: `${plural(v.docs, "document")} · ${v.rc.critical} critical · ${v.rc.high} high · ${v.rc.medium} medium · ${v.rc.low} low`,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [readyDocs]);

  /* ── 3. How much money is exposed? ─────────────────────────────────────
     One row per contract: a project, or an ungrouped document together with its
     amendments. A contract's value is the running total across its documents
     (lib/contract-value.ts), so an amendment's restated total is not counted
     twice. "Exposed" = the value of contracts whose worst clause level is high
     or critical. Sums are kept per currency; different currencies are never
     added together. */
  const scopedIds = useMemo(() => new Set(scoped.map((d) => d.docId)), [scoped]);
  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);
  const valueRows = useMemo<ValueRow[]>(() => {
    const out: ValueRow[] = [];
    for (const p of withUngroupedDocs(rawProjects, docs)) {
      const pdocs = p.docIds.filter((id) => scopedIds.has(id)).map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
      const ready = pdocs.filter((d) => d.status === "READY");
      if (ready.length === 0) continue;
      const valued: ValuedDoc[] = ready.map((d) => ({
        docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt,
        classification: classByDoc.get(d.docId), persisted: persistedOf(d),
      }));
      const cv = computeContractValue(valued);
      const rc = { ...NO_COUNTS };
      for (const d of ready) if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
      out.push({
        id: p.id, name: p.name,
        value: cv.total > 0 ? cv.total : null,
        currency: cv.currency,
        level: worst(rc),
        amendmentDelta: cv.segments.filter((s) => s.isAmendment).reduce((s, x) => s + x.value, 0),
      });
    }
    return out.sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.name.localeCompare(b.name));
  }, [rawProjects, docs, scopedIds, byId, classByDoc]);
  const valueTotals = useMemo(() => {
    const m = new Map<string, { total: number; exposed: number }>();
    for (const r of valueRows) {
      if (r.value === null) continue;
      const cur = (r.currency ?? "").toUpperCase();
      const e = m.get(cur) ?? { total: 0, exposed: 0 };
      e.total += r.value;
      if (r.level === "high" || r.level === "critical") e.exposed += r.value;
      m.set(cur, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [valueRows]);
  const valuedContracts = valueRows.filter((r) => r.value !== null).length;
  const [showAllValues, setShowAllValues] = useState(false);

  // Signed value change stated by each amendment (from its classification, else
  // the amendment's list row). Zero and missing deltas are left out.
  const amendmentDeltas = useMemo(() => {
    const rows: (HBarDatum & { currency: string })[] = [];
    for (const d of readyDocs) {
      const c = classByDoc.get(d.docId);
      const delta = c?.amendment?.valueDelta ?? (d.docType === "AMENDMENT" ? d.valueDelta ?? null : null);
      if (delta == null || delta === 0) continue;
      rows.push({
        id: d.docId, label: d.title || "Untitled amendment", value: delta,
        color: delta > 0 ? ACCENT : NEUTRAL_MARK,
        currency: (d.currency ?? c?.commercials?.currency ?? "").toUpperCase(),
      });
    }
    return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [readyDocs, classByDoc]);
  const deltaCurrencies = new Set(amendmentDeltas.map((r) => r.currency));
  const deltaCurrency = deltaCurrencies.size === 1 ? [...deltaCurrencies][0] || null : null;

  const pricingMix: CompositionSegment[] = useMemo(() => {
    const m = new Map<PricingModel, number>();
    for (const d of readyDocs) {
      const raw = classByDoc.get(d.docId)?.commercials?.pricingModel ?? (d.pricingModel as PricingModel | null | undefined) ?? "unknown";
      const model = PRICING_KEYS.includes(raw) ? raw : "unknown";
      m.set(model, (m.get(model) ?? 0) + 1);
    }
    return PRICING_KEYS.filter((k) => m.has(k)).map((k) => ({ key: k, label: PRICING_LABEL[k], value: m.get(k) ?? 0, color: categoricalColor(PRICING_KEYS.indexOf(k)) }));
  }, [readyDocs, classByDoc]);

  // Value × risk scatter — one point per analysed document that has both an
  // extracted value and clause risk counts. Risk index: see the caption below.
  const scatterPoints: ScatterPoint[] = useMemo(() => {
    const out: ScatterPoint[] = [];
    for (const d of readyDocs) {
      const value = docValueOrNull(classByDoc.get(d.docId), persistedOf(d));
      const level = docRisk(d);
      if (value === null || value <= 0 || !d.riskCounts || !level) continue;
      out.push({ id: d.docId, name: d.title || "Untitled", value, risk: riskIndex(d.riskCounts), clauses: d.clauseCount ?? sum(d.riskCounts), level, currency: d.currency });
    }
    return out;
  }, [readyDocs, classByDoc]);

  /* ── 4. What is coming up? ─────────────────────────────────────────────
     For a document analysed with key-date extraction: every dated renewal,
     term end, notice deadline, payment, milestone and deliverable in its
     `keyDates`. Renewal and term-end dates are always listed; the other kinds
     once passed stay listed for 90 days (whether they were met is not tracked).
     For a document analysed before that: its renewal and term-end dates as
     extracted, plus the notice deadline (renewal date minus the notice period)
     when both are known. Days are counted from the real current date. */
  const dateRows = useMemo<DateRow[]>(() => {
    const out: DateRow[] = [];
    const push = (d: ApiDocument, kind: DateKind, iso: string | null | undefined, shiftDays = 0, note?: string) => {
      const base = iso ? new Date(iso).getTime() : NaN;
      if (!Number.isFinite(base)) return;
      const t = base - shiftDays * DAY;
      out.push({ key: `${d.docId}:${kind}`, docId: d.docId, docTitle: d.title || "Untitled document", kind, t, days: Math.round((t - now) / DAY), note });
    };
    for (const d of scoped) {
      if (documentKeyDates(d).extracted) {
        for (const k of portfolioDates(d, now)) {
          const kind = DATE_KIND[k.kind];
          const days = k.days as number;
          const alwaysListed = k.kind === "renewal" || k.kind === "term_end";
          if (!kind || (!alwaysListed && days < -PASSED_DAYS)) continue;
          const named = k.kind === "payment" || k.kind === "milestone" || k.kind === "deliverable";
          const note = [
            named ? k.label : null,
            k.amount !== null ? fmtMoney(k.amount, k.currency) : null,
            k.kind === "notice_deadline" ? ruleText(k) : null,
            k.kind === "renewal" && d.autoRenews ? "Renews automatically" : null,
            // A date known only to the month or quarter is listed by the period's last day.
            k.precision && k.precision !== "day" ? `by the end of ${formatKeyDate(k)}` : null,
            k.isEstimated && k.precision === "day" ? "estimated" : null,
          ].filter(Boolean).join(" · ");
          out.push({ key: `${d.docId}:${k.id}`, docId: d.docId, docTitle: d.title || "Untitled document", kind, t: isoDayToMs(k.date as string), days, note: note || undefined });
        }
        continue;
      }
      push(d, "Renewal", d.renewalDate, 0, d.autoRenews ? "Renews automatically" : undefined);
      push(d, "Term end", d.termEndDate);
      if (d.renewalDate && typeof d.renewalNoticeDays === "number" && d.renewalNoticeDays > 0) {
        push(d, "Notice deadline", d.renewalDate, d.renewalNoticeDays, `${d.renewalNoticeDays} days before renewal`);
      }
    }
    return out.sort((a, b) => a.t - b.t);
  }, [scoped, now]);
  /** Analysed documents in scope that predate key-date extraction. */
  const legacyDateDocs = scoped.filter((d) => d.status === "READY" && !documentKeyDates(d).extracted).length;
  const dateGroups = [
    { key: "overdue", label: "Date passed", rows: dateRows.filter((r) => r.days < 0).reverse() },
    { key: "30", label: "Next 30 days", rows: dateRows.filter((r) => r.days >= 0 && r.days <= 30) },
    { key: "90", label: "31 to 90 days", rows: dateRows.filter((r) => r.days > 30 && r.days <= 90) },
    { key: "later", label: "Later", rows: dateRows.filter((r) => r.days > 90) },
  ];

  /* ── 5. What is missing? ───────────────────────────────────────────────── */
  const missing = useMemo(() => {
    const ref = (d: ApiDocument, note?: string): DocRef => ({ docId: d.docId, title: d.title || "Untitled document", note });
    const failed = scoped.filter((d) => d.status === "FAILED").map((d) => ref(d, d.errorMessage));
    const processing = scoped.filter((d) => isProcessing(d.status)).map((d) => ref(d, d.status.toLowerCase()));
    const noValue = readyDocs.filter((d) => { const v = docValueOrNull(classByDoc.get(d.docId), persistedOf(d)); return v === null || v <= 0; }).map((d) => ref(d));
    const noDates = readyDocs.filter((d) => !d.effectiveDate && !d.renewalDate && !d.termEndDate).map((d) => ref(d));
    // Compliance gaps: only the per-document figures the backend persisted.
    const scored = readyDocs.filter((d) => typeof d.complianceCoveragePct === "number");
    const gaps = scored
      .filter((d) => (d.complianceGaps ?? 0) > 0 || (d.complianceCoveragePct as number) < 100)
      .map((d) => ref(d, `${Math.round(d.complianceCoveragePct as number)}% coverage${typeof d.complianceGaps === "number" ? ` · ${plural(d.complianceGaps, "gap")}` : ""}`));
    return { failed, processing, noValue, noDates, gaps, scoredCount: scored.length };
  }, [scoped, readyDocs, classByDoc]);
  const packsEnabled = (packs.data?.packs.length ?? 0) > 0;
  const missingTotal = missing.failed.length + missing.processing.length + missing.noValue.length + missing.noDates.length + (packsEnabled ? missing.gaps.length : 0);

  /* ── Key findings returned by the analysis ─────────────────────────────── */
  const allFindings: Finding[] = useMemo(() => {
    const out: Finding[] = [];
    readyDocs.forEach((d) => (classByDoc.get(d.docId)?.keyFindings ?? []).forEach((f) => out.push({ ...f, docId: d.docId, docTitle: d.title || "Untitled" })));
    return out.sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
  }, [readyDocs, classByDoc]);
  const [sevFilter, setSevFilter] = useState<FindingSeverity | "all">("all");
  const sevCounts = useMemo(() => {
    const m = {} as Record<FindingSeverity, number>;
    allFindings.forEach((f) => { m[f.severity] = (m[f.severity] ?? 0) + 1; });
    return m;
  }, [allFindings]);
  const presentSeverities = SEVERITY_ORDER_DESC.filter((s) => (sevCounts[s] ?? 0) > 0);
  const findingsBySeverity: CompositionSegment[] = presentSeverities.map((s) => ({ key: s, label: RISK_LABEL[s as RiskLevel] ?? "Info", value: sevCounts[s] ?? 0, color: SEVERITY_COLOR[s] }));
  const filteredFindings = allFindings.filter((f) => sevFilter === "all" || f.severity === sevFilter);

  /* ── 6. Summary — up to three sentences, each a statement of the counts above. */
  const summary = useMemo(() => {
    const s: string[] = [];
    if (highCrit > 0) {
      const affected = readyDocs.filter((d) => d.riskCounts && d.riskCounts.high + d.riskCounts.critical > 0);
      const top = [...affected].sort((a, b) => (b.riskCounts!.high + b.riskCounts!.critical) - (a.riskCounts!.high + a.riskCounts!.critical))[0];
      const n = top ? top.riskCounts!.high + top.riskCounts!.critical : 0;
      s.push(
        `${plural(highCrit, "clause")} of ${totalRated.toLocaleString()} ${highCrit === 1 ? "is" : "are"} rated high or critical (${riskCounts.critical} critical), in ${plural(affected.length, "document")}` +
        (top && affected.length > 1 ? `; ${top.title || "an untitled document"} has the most, with ${n}.` : "."),
      );
    } else if (totalRated > 0) {
      s.push(`None of the ${plural(totalRated, "rated clause")} in ${plural(readyDocs.length, "analysed document")} is high or critical.`);
    } else {
      s.push(`${plural(readyDocs.length, "analysed document")} in scope; none has clause risk counts yet.`);
    }
    const overdue = dateGroups[0].rows.length;
    const soon = dateGroups[1].rows.length;
    if (overdue > 0 || soon > 0) {
      s.push(`${plural(overdue, "date")} ${overdue === 1 ? "is" : "are"} overdue and ${soon} fall${soon === 1 ? "s" : ""} in the next 30 days.`);
    }
    const gaps = [
      missing.failed.length > 0 ? `${missing.failed.length} failed` : "",
      missing.processing.length > 0 ? `${missing.processing.length} still processing` : "",
      missing.noValue.length > 0 ? `${missing.noValue.length} with no contract value extracted` : "",
      missing.noDates.length > 0 ? `${missing.noDates.length} with no dates extracted` : "",
    ].filter(Boolean);
    if (gaps.length > 0) s.push(`Documents: ${gaps.join(", ")}.`);
    if (highCrit === 0 && overdue === 0 && soon === 0 && gaps.length === 0 && totalRated > 0) {
      s.push("Nothing else is flagged: no overdue or imminent dates and no missing values or dates.");
    }
    return s.slice(0, 3);
    // dateGroups is rebuilt each render from dateRows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highCrit, totalRated, riskCounts, readyDocs, dateRows, missing]);

  const loading = isLoading;
  const failedLoad = isError && !data;
  const activeFilters = (typeFilter !== "all" ? 1 : 0) + (riskFilter !== "all" ? 1 : 0);
  const clearFilters = () => { setTypeFilter("all"); setRiskFilter("all"); };
  const noMatches = docs.length > 0 && scoped.length === 0;
  // Clause-level blocks wait for the classifications of the documents in scope.
  const clausesPending = classLoading > 0 && readyDocs.some((d) => !classByDoc.has(d.docId));
  const shownAttention = showAllAttention ? attention : attention.slice(0, 8);
  const shownValues = showAllValues ? valueRows : valueRows.slice(0, 6);

  return (
    <>
      <div className="flex flex-col gap-6 md:gap-8">
        {/* Filter bar — applies to every block on the page */}
        {!loading && !failedLoad && docs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {availableTypes.length > 1 && (
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocType | "all")}>
                <SelectTrigger aria-label="Filter by document type" className="min-w-[140px] flex-1 sm:w-[176px] sm:flex-none"><Layers size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All document types</SelectItem>
                  {availableTypes.map((t) => <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
              <SelectTrigger aria-label="Filter by overall risk level" className="min-w-[140px] flex-1 sm:w-[164px] sm:flex-none"><Filter size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                {RISK_ORDER_DESC.map((r) => <SelectItem key={r} value={r}>{RISK_LABEL[r]} risk</SelectItem>)}
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] sm:h-9" onClick={clearFilters}>
                <X size={14} />Clear filters ({activeFilters})
              </Button>
            )}
            <p className="w-full text-sm text-[var(--ink-600)] sm:ml-auto sm:w-auto" aria-live="polite">
              Showing <span className="font-semibold tabular-nums text-foreground">{scoped.length}</span> of <span className="tabular-nums">{docs.length}</span> document{docs.length === 1 ? "" : "s"} · <span className="tabular-nums">{readyDocs.length}</span> analysed
            </p>
          </div>
        )}

        {loading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-[360px] rounded-xl" />
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
          </>
        ) : failedLoad ? (
          <ErrorState onRetry={() => refetch()} />
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
            <p className="mb-1 text-lg font-semibold text-foreground">No documents yet</p>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">Insights are computed from your analysed documents. Upload one to start.</p>
            <Button variant="outline" className="mt-5 h-10 sm:h-9" asChild><Link href="/projects/new">Add a document</Link></Button>
          </div>
        ) : noMatches ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
            <p className="mb-1 text-lg font-semibold text-foreground">No documents match these filters</p>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">Try a different document type or risk level.</p>
            <Button variant="outline" className="mt-5 h-10 sm:h-9" onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : (
          <>
            {/* 6. Summary — computed sentences only */}
            <MotionReveal>
              <Card ai inset="none" className="rounded-xl p-4 shadow-none md:p-6">
                <div className="flex items-start gap-3.5">
                  <SonarMark size="lg" tile />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold mb-1.5">Summary of {plural(scoped.length, "document")}{activeFilters > 0 ? " matching the filters" : ""}</h2>
                    <p className="max-w-[60ch] text-lg leading-relaxed text-foreground">{summary.join(" ")}</p>
                    {(clausesPending || classFailed > 0 || docsWithoutRisk > 0) && (
                      <p className="mt-2 text-sm text-[var(--ink-600)]">
                        {[
                          clausesPending ? "Clause detail is still loading for some documents." : "",
                          classFailed > 0 ? `Clause detail couldn’t be loaded for ${plural(classFailed, "document")}.` : "",
                          docsWithoutRisk > 0 ? `${plural(docsWithoutRisk, "analysed document")} ${docsWithoutRisk === 1 ? "has" : "have"} no risk counts and ${docsWithoutRisk === 1 ? "is" : "are"} left out of the risk figures.` : "",
                        ].filter(Boolean).join(" ")}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </MotionReveal>

            {/* 1. Focal block: what needs attention first */}
            <MotionReveal>
              <section aria-labelledby="attention-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[var(--navy)] px-4 py-4 text-white md:px-6">
                  <div className="min-w-0">
                    <h2 id="attention-heading" className="text-lg font-semibold tracking-tight">What needs my attention first?</h2>
                    <p className="mt-0.5 text-sm text-[var(--navy-foreground)]">Clauses rated critical or high, critical first.</p>
                  </div>
                  <p className="flex items-baseline gap-2 text-sm text-[var(--navy-foreground)]">
                    <span className="text-3xl font-semibold leading-none tabular-nums text-white">{clausesPending && attention.length === 0 ? "—" : attention.length}</span>
                    clause{attention.length === 1 ? "" : "s"}
                  </p>
                </div>
                {clausesPending && attention.length === 0 ? (
                  <div className="space-y-3 p-4 md:p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : attention.length === 0 ? (
                  <EmptyNote icon={<CheckCircle2 size={20} />} title="Nothing needs attention" text={readyDocs.length === 0 ? "No analysed documents in scope yet." : `No clause in the ${plural(readyDocs.length, "analysed document")} in scope is rated critical or high.`} />
                ) : (
                  <>
                    <ol className="divide-y divide-border">
                      {shownAttention.map((a) => (
                        <li key={a.key}>
                          <Link
                            href={`/projects/${a.docId}/sow#clause-${encodeURIComponent(a.number)}`}
                            className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] md:px-6"
                          >
                            <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_PILL[a.level]}`}>{RISK_LABEL[a.level]}</span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="break-words text-base font-semibold text-foreground">{a.title || `Clause ${a.number}`}</span>
                                {a.number && <span className="font-mono text-xs text-muted-foreground">§{a.number}</span>}
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{a.type}</span>
                              </span>
                              <span className="mt-1 block text-sm leading-relaxed text-[var(--ink-600)]">{a.summary || "No summary was returned for this clause."}</span>
                              <span className="mt-1 block truncate text-xs text-muted-foreground">{a.docTitle}</span>
                            </span>
                            <ArrowRight size={16} className="mt-1 hidden shrink-0 text-[var(--ink-300)] transition-colors group-hover:text-[var(--brand-primary-600)] sm:block" />
                          </Link>
                        </li>
                      ))}
                    </ol>
                    {attention.length > 8 && (
                      <div className="border-t border-border px-4 py-2 md:px-6">
                        <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] sm:h-9" onClick={() => setShowAllAttention((v) => !v)}>
                          {showAllAttention ? "Show the first 8" : `Show all ${attention.length}`}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </MotionReveal>

            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
                {/* 2. Where does risk concentrate? */}
                <ChartCard title="Where does risk concentrate?" icon={<BarChart3 size={15} />} sub={`${plural(totalRated, "rated clause")} · ${plural(categoryCount, "category", "categories")}`}>
                  {totalRated === 0 && ratedClauses.length === 0 ? (
                    clausesPending ? <Skeleton className="h-48 rounded-lg" /> : <EmptyNote title="No rated clauses" text="Risk by category appears once a document in scope has been analysed." bare />
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">Clauses by risk level</h3>
                        <CompositionBar segments={riskLevelMix} emptyText="No clause risk counts on the documents in scope." />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">By clause category</h3>
                        {ratedClauses.length === 0
                          ? (clausesPending ? <Skeleton className="h-40 rounded-lg" /> : <p className="text-sm text-muted-foreground">Clause detail is not available for the documents in scope.</p>)
                          // Every category is listed (no row cap), so none is dropped.
                          : <ClauseHeatmap clauses={ratedClauses} maxRows={Math.max(1, categoryCount)} />}
                        {unratedClauses > 0 && <p className="mt-2 text-xs text-muted-foreground">{plural(unratedClauses, "clause")} came back without a risk level and {unratedClauses === 1 ? "is" : "are"} not in this table.</p>}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">By document type · clauses rated high or critical</h3>
                        <HBarChart data={riskByType} valueFormatter={(n) => n.toLocaleString()} yAxisWidth={104} emptyText="No clause risk counts by document type yet." />
                      </div>
                    </div>
                  )}
                </ChartCard>

                {/* 3. How much money is exposed? */}
                <ChartCard title="How much money is exposed?" icon={<DollarSign size={15} />} sub={`${valuedContracts} of ${plural(valueRows.length, "contract")} valued`}>
                  {valueRows.length === 0 ? (
                    <EmptyNote title="No analysed contracts" text="Contract value appears once a document in scope has been analysed." bare />
                  ) : (
                    <div className="space-y-6">
                      <div>
                        {valueTotals.length === 0 ? (
                          <>
                            <p className="text-2xl font-semibold tracking-tight text-foreground">No value yet</p>
                            <p className="mt-1 text-sm text-[var(--ink-600)]">None of the {plural(valueRows.length, "contract")} in scope has an extracted value.</p>
                          </>
                        ) : (
                          <dl className="space-y-3">
                            {valueTotals.map(([cur, v]) => (
                              <div key={cur || "none"}>
                                <dt className="text-sm text-[var(--ink-600)]">Total contract value{cur ? "" : " · currency not extracted"}</dt>
                                <dd className="mt-0.5 text-3xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">{fmtMoney(v.total, cur || null)}</dd>
                                <dd className="mt-1 text-sm text-[var(--ink-600)]">
                                  <span className={`font-semibold tabular-nums ${v.exposed > 0 ? "text-[var(--danger)]" : "text-foreground"}`}>{fmtMoney(v.exposed, cur || null)}</span>
                                  {" "}({Math.round((v.exposed / v.total) * 100)}%) sits in contracts with a clause rated high or critical.
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">By contract</h3>
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {shownValues.map((r) => (
                            <li key={r.id}>
                              <Link href={`/projects/${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]">
                                <span className="min-w-0 flex-1 basis-40 truncate text-sm font-medium text-foreground" title={r.name}>{r.name}</span>
                                {r.level
                                  ? <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_PILL[r.level]}`}>{RISK_LABEL[r.level]}</span>
                                  : <span className="shrink-0 text-xs text-muted-foreground">Risk not assessed</span>}
                                <span className="shrink-0 text-right">
                                  <span className={`block text-sm tabular-nums ${r.value === null ? "text-muted-foreground" : "font-semibold text-foreground"}`}>{r.value === null ? "No value yet" : fmtMoney(r.value, r.currency)}</span>
                                  {r.amendmentDelta !== 0 && <span className="block text-xs tabular-nums text-[var(--ink-600)]">amendments {r.amendmentDelta > 0 ? "+" : ""}{fmtMoney(r.amendmentDelta, r.currency)}</span>}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        {valueRows.length > 6 && (
                          <Button variant="ghost" className="mt-1 h-10 text-[var(--brand-primary-700)] sm:h-9" onClick={() => setShowAllValues((v) => !v)}>
                            {showAllValues ? "Show the first 6" : `Show all ${valueRows.length}`}
                          </Button>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">Value changes from amendments</h3>
                        {amendmentDeltas.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No amendment in scope states a value change.</p>
                        ) : (
                          <>
                            <HBarChart data={amendmentDeltas} signed valueFormatter={(n) => fmtMoney(n, deltaCurrency)} onSelect={(id) => router.push(`/projects/${id}`)} yAxisWidth={128} />
                            {deltaCurrencies.size > 1 && <p className="mt-2 text-xs text-muted-foreground">These amendments are in different currencies, so the amounts are shown without a symbol and the bars are not comparable across currencies.</p>}
                          </>
                        )}
                      </div>

                      {pricingMix.length > 0 && (
                        <div>
                          <h3 className="text-base font-semibold mb-2 text-foreground">Pricing model · {plural(readyDocs.length, "analysed document")}</h3>
                          <CompositionBar segments={pricingMix} />
                        </div>
                      )}
                    </div>
                  )}
                </ChartCard>

                {/* 4. What is coming up? */}
                <ChartCard title="What is coming up?" icon={<CalendarClock size={15} />} sub={plural(dateRows.length, "date")}>
                  {dateRows.length === 0 ? (
                    <EmptyNote
                      title="No dates extracted yet"
                      text={legacyDateDocs > 0
                        ? `${plural(legacyDateDocs, "document")} in scope ${legacyDateDocs === 1 ? "was" : "were"} analysed before full date extraction and recorded no renewal or term-end date. Re-analyse ${legacyDateDocs === 1 ? "it" : "them"} to extract dates.`
                        : "Renewal, term-end, notice, payment, milestone and deliverable dates appear here when the analysis finds them in a document."}
                      bare
                    />
                  ) : (
                    <div className="space-y-5">
                      {dateGroups.map((g) => (
                        <div key={g.key}>
                          <h3 className={`mb-1.5 flex items-baseline gap-2 text-sm font-semibold ${g.key === "overdue" && g.rows.length > 0 ? "text-[var(--danger)]" : "text-foreground"}`}>
                            {g.label}<span className="font-normal tabular-nums text-muted-foreground">{g.rows.length}</span>
                          </h3>
                          {g.rows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">None.</p>
                          ) : (
                            <ul className="divide-y divide-border rounded-lg border border-border">
                              {g.rows.slice(0, 5).map((r) => (
                                <li key={r.key}>
                                  <Link href={`/projects/${r.docId}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2.5 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]">
                                    <span className="min-w-0 flex-1 basis-40">
                                      <span className="block truncate text-sm font-medium text-foreground" title={r.docTitle}>{r.docTitle}</span>
                                      <span className="block text-xs text-muted-foreground">{r.kind}{r.note ? ` · ${r.note}` : ""}</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                      <span className="block text-sm tabular-nums text-foreground">{shortDate(r.t)}</span>
                                      <span className={`block text-xs tabular-nums ${r.days < 0 ? "font-medium text-[var(--danger)]" : r.days <= 30 ? "font-medium text-[var(--warning)]" : "text-muted-foreground"}`}>{inDays(r.days)}</span>
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          {g.rows.length > 5 && <p className="mt-1.5 text-xs text-muted-foreground">and {g.rows.length - 5} more. <Link href="/renewals" className="font-semibold text-[var(--brand-primary-600)] hover:underline">See renewals</Link></p>}
                        </div>
                      ))}
                      {legacyDateDocs > 0 && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {plural(legacyDateDocs, "document")} in scope {legacyDateDocs === 1 ? "was" : "were"} analysed before full date extraction: only {legacyDateDocs === 1 ? "its" : "their"} renewal, term-end and notice dates are listed. Re-analyse {legacyDateDocs === 1 ? "it" : "them"} to list payments, milestones and deliverables.
                        </p>
                      )}
                    </div>
                  )}
                </ChartCard>

                {/* 5. What is missing? */}
                <ChartCard title="What is missing?" icon={<Files size={15} />} sub={plural(missingTotal, "item")}>
                  {missingTotal === 0 && !(packsEnabled && missing.scoredCount === 0 && readyDocs.length > 0) ? (
                    <EmptyNote icon={<CheckCircle2 size={20} />} title="Nothing is missing" text="Every document in scope is analysed, with a contract value and at least one date extracted." bare />
                  ) : (
                    <div className="space-y-5">
                      <MissingList title="Analysis failed" tone="danger" rows={missing.failed} empty="No failed documents." />
                      <MissingList title="Still processing" rows={missing.processing} empty="Nothing is processing." />
                      <MissingList title="No contract value extracted" rows={missing.noValue} empty="Every analysed document has a value." />
                      <MissingList title="No dates extracted" rows={missing.noDates} empty="Every analysed document has at least one date." />
                      {packsEnabled && (
                        <MissingList
                          title="Compliance coverage gaps"
                          rows={missing.gaps}
                          empty={missing.scoredCount === 0 ? "No compliance coverage has been recorded for the documents in scope." : `All ${plural(missing.scoredCount, "scored document")} at full coverage.`}
                        />
                      )}
                    </div>
                  )}
                </ChartCard>
              </div>
            </MotionReveal>

            {/* Value × risk — kept: are the expensive contracts the risky ones? */}
            <MotionReveal>
              <ChartCard
                title="Value vs. risk" icon={<ScatterChartIcon size={15} />}
                sub="Bubble size is clause count · select a contract to open it"
                state={scatterPoints.length < 2 ? "empty" : "ready"}
                emptyText="A value-versus-risk map appears once at least two documents have both an extracted value and clause risk counts."
              >
                <ValueRiskScatter points={scatterPoints} onSelect={(id) => router.push(`/projects/${id}`)} />
                <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                  <p className="max-w-[58ch] text-sm leading-relaxed text-[var(--ink-600)]">
                    Risk index = the average clause weight in a document (low 12, medium 42, high 74, critical 100), so 0 to 100. Dashed line: High-risk threshold ({HIGH_RISK_THRESHOLD}).
                    {" "}{plural(scatterPoints.length, "document")} of {readyDocs.length} plotted; the rest lack a value or risk counts.
                  </p>
                  <ul className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--ink-600)]" aria-label="Risk level colours">
                    {RISK_ORDER_DESC.map((level) => (
                      <li key={level} className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLOR[level] }} />{RISK_LABEL[level]}
                      </li>
                    ))}
                  </ul>
                </div>
              </ChartCard>
            </MotionReveal>

            {/* Key findings returned by the analysis */}
            <MotionReveal>
              <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 md:px-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">What did the analysis flag?</h2>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--ink-600)]">{filteredFindings.length} of {allFindings.length}</span>
                  </div>
                  {presentSeverities.length > 1 && (
                    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
                      <div role="group" aria-label="Filter by severity" className="flex w-max items-center gap-1.5">
                        <FilterChip active={sevFilter === "all"} onClick={() => setSevFilter("all")}>All</FilterChip>
                        {presentSeverities.map((s) => (
                          <FilterChip key={s} active={sevFilter === s} onClick={() => setSevFilter(s)} dot={SEVERITY_COLOR[s]}>
                            {RISK_LABEL[s as RiskLevel] ?? "Info"}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {allFindings.length === 0 ? (
                  clausesPending
                    ? <div className="space-y-3 p-4 md:p-5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                    : <EmptyNote title="No key findings" text="The analysis of the documents in scope returned no key findings." />
                ) : (
                  <>
                    <div className="px-4 pt-4 md:px-5"><CompositionBar segments={findingsBySeverity} /></div>
                    {filteredFindings.length === 0 ? (
                      <EmptyNote title="No findings at this severity" text="Choose another severity or show all." />
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:gap-4 md:p-5 xl:grid-cols-3">
                        {filteredFindings.slice(0, 12).map((f, i) => {
                          const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                          return (
                            <li key={`${f.docId}-${i}`} className="min-w-0">
                              <Link href={`/projects/${f.docId}`} className="flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-[var(--brand-primary-300)] hover:shadow-md focus-visible:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                                <span className={`mb-2.5 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${s.bg} ${s.text}`}>{s.icon}{f.severity}</span>
                                <span className="text-base font-semibold leading-snug text-foreground">{f.label}</span>
                                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p>
                                <p className="mt-auto truncate pt-3 text-xs text-muted-foreground">{f.docTitle}</p>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {filteredFindings.length > 12 && <p className="px-4 pb-4 text-xs text-muted-foreground md:px-5">Showing the 12 most severe of {filteredFindings.length}. Open a document for its full list.</p>}
                  </>
                )}
              </section>
            </MotionReveal>
          </>
        )}
      </div>
    </>
  );
}

/** One "what is missing" group: a count, then the documents as links. */
function MissingList({ title, rows, empty, tone }: { title: string; rows: DocRef[]; empty: string; tone?: "danger" }) {
  return (
    <div>
      <h3 className={`mb-1.5 flex items-baseline gap-2 text-sm font-semibold ${tone === "danger" && rows.length > 0 ? "text-[var(--danger)]" : "text-foreground"}`}>
        {title}<span className="font-normal tabular-nums text-muted-foreground">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.slice(0, 4).map((r) => (
              <li key={r.docId}>
                <Link href={`/projects/${r.docId}`} className="block px-3 py-2 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]">
                  <span className="block truncate text-sm font-medium text-foreground" title={r.title}>{r.title}</span>
                  {r.note && <span className="block truncate text-xs text-muted-foreground" title={r.note}>{r.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > 4 && <p className="mt-1.5 text-xs text-muted-foreground">and {rows.length - 4} more. <Link href="/library" className="font-semibold text-[var(--brand-primary-600)] hover:underline">Open the library</Link></p>}
        </>
      )}
    </div>
  );
}

function EmptyNote({ title, text, icon, bare = false }: { title: string; text: string; icon?: React.ReactNode; bare?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${bare ? "py-8" : "px-5 py-10"}`}>
      {icon && <span className="mb-2 text-[var(--success)]">{icon}</span>}
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">{text}</p>
    </div>
  );
}

function FilterChip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:border-structure-border aria-[pressed=true]:bg-structure-soft aria-[pressed=true]:text-structure-soft-fg sm:h-8"
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-14 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={24} strokeWidth={1.5} /></span>
      <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load insights</h2>
      <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--ink-600)]">The request for your documents failed, so there is nothing to compute from. Try again in a moment.</p>
      <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}
