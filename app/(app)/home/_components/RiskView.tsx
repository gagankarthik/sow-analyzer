"use client";

// Home's "Risk and documents" view (formerly the Dashboard). Every figure is a count, a sum or a date difference over
// what the API returned: the shared documents list, each analysed document's
// classification, the projects list and the per-document compliance figures the
// backend stored. Anything the API did not provide stays unknown ("Not
// assessed", "No value yet", "—"): it is never shown as zero, as "low" or as
// "all clear", and it is left out of the sums with the number left out stated.

import { byEdition } from "@/lib/edition-runtime";
import { stageLabel } from "@/lib/govern/labels";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { SetupPrompt } from "@/components/onboarding/SetupPrompt";
import { useFirstRunRedirect } from "@/components/onboarding/useFirstRunRedirect";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSetupUnfinished } from "@/lib/onboarding";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, ShieldAlert, ArrowRight, ArrowUp, ArrowDown, Plus, RefreshCw, Layers, FileText, DollarSign,
  AlertTriangle, CheckCircle2, CalendarClock, BarChart3, TrendingUp, ShieldCheck,
  ChevronUp, ChevronDown, XCircle, Filter, Loader2, Info,
} from "@/components/ui/icons";
import { useDocuments, useClassifications, isProcessing } from "@/lib/queries/documents";
import { useCompliancePacks } from "@/lib/queries/compliance";
import { computeContractValue, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { docTypeShort } from "@/lib/doc-types";
import { ACCENT, NEUTRAL_MARK, RISK_COLOR, RISK_LABEL } from "@/lib/chart-theme";
import { HBarChart, type HBarDatum } from "@/components/charts/HBarChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useProjectsSync, refreshProjects, withUngroupedDocs, type LocalProject } from "@/lib/projects-store";
import { useNow } from "@/lib/use-now";
import type { ApiClassification, ApiDocument, DocType, Lifecycle, RiskLevel } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const UNRATED_RANK = 4; // contracts with no risk data sort after every rated one
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success-fg)]",
};
const DAY = 86_400_000;
const LIFECYCLE_ORDER: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];

// Persist the contracts-table filters so a returning user keeps their view.
const FILTER_KEY = "biq-dashboard-filters";
const DOC_TYPE_ORDER: DocType[] = ["SOW", "MSA", "AMENDMENT", "LICENSE", "DPA", "BAA", "COMPLIANCE", "NDA", "OTHER"];
type RiskFilter = RiskLevel | "all" | "unrated";
type SavedFilters = { risk?: RiskFilter; docType?: DocType | "all"; sortKey?: SortKey; sortDir?: SortDir };
function loadFilters(): SavedFilters | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(FILTER_KEY) || "null"); } catch { return null; }
}

type Counts = { low: number; medium: number; high: number; critical: number };
const NO_COUNTS: Counts = { low: 0, medium: 0, high: 0, critical: 0 };
const sum = (c: Counts) => c.low + c.medium + c.high + c.critical;
const addCounts = (into: Counts, c: Counts) => { into.low += c.low; into.medium += c.medium; into.high += c.high; into.critical += c.critical; };
/** Worst clause level in a set of counts; null when nothing was rated. */
const worst = (c: Counts): RiskLevel | null =>
  sum(c) === 0 ? null : c.critical > 0 ? "critical" : c.high > 0 ? "high" : c.medium > 0 ? "medium" : "low";
const isRisky = (level: RiskLevel | null) => level === "high" || level === "critical";
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * Rated-clause counts for one document, and how many of its clauses came back
 * without a risk level. With the classification loaded the counts are taken
 * clause by clause, so an unrated clause is never counted as "low"; before it
 * loads, the counts stored on the document row are used. `rc` is null when the
 * document has no rated clause at all (still processing, failed, or analysed
 * with nothing rated) — that is "not assessed", not "low".
 */
function docRisk(d: ApiDocument, c: ApiClassification | undefined): { rc: Counts | null; unrated: number } {
  if (d.status !== "READY") return { rc: null, unrated: 0 };
  if (c) {
    const rc = { ...NO_COUNTS };
    let unrated = 0;
    for (const cl of c.clauses) {
      if (cl.riskRated === false) unrated += 1;
      else rc[cl.riskLevel] += 1;
    }
    return { rc: sum(rc) > 0 ? rc : null, unrated };
  }
  return { rc: d.riskCounts && sum(d.riskCounts) > 0 ? d.riskCounts : null, unrated: 0 };
}

const timeOf = (iso: string | null | undefined): number | null => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** One row per contract: a project, or an ungrouped document with its amendments. */
type Agg = {
  project: LocalProject;
  docs: ApiDocument[];
  docCount: number;
  /** Clauses across the analysed documents; null when none has a clause count. */
  clauseCount: number | null;
  rc: Counts;
  /** Rated clauses (sum of rc). 0 means no risk data — not "low". */
  rated: number;
  /** Clauses returned without a risk level (known once classifications load). */
  unrated: number;
  highRisk: number;
  /** Worst rated clause level; null when no clause is rated. */
  overallRisk: RiskLevel | null;
  /** Running contract total across the documents; null when none was extracted. */
  value: number | null;
  valueDelta: number;
  reconciled: boolean | null;
  currency: string | null;
  readyCount: number;
  processing: number;
  failed: number;
  /** Lifecycle of the contract's root document, as stored on it. */
  lifecycle: Lifecycle | null;
  expired: boolean;
  /** Days to the nearest upcoming renewal or term-end date; null when none was extracted. */
  daysToDate: number | null;
  dateKind: "renewal" | "term-end" | null;
  /** True when at least one renewal or term-end date was extracted (past or future). */
  hasTermDates: boolean;
  /** Year of the earliest extracted effective date; null when none was extracted. */
  effectiveYear: number | null;
};

function aggregate(project: LocalProject, byId: Map<string, ApiDocument>, classByDoc: Map<string, ApiClassification>, now: number): Agg {
  const docs = project.docIds.map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
  const rc = { ...NO_COUNTS };
  let clauseCount: number | null = null, unrated = 0, processing = 0, failed = 0, readyCount = 0, expired = false;
  let nearest: number | null = null, dateKind: Agg["dateKind"] = null, hasTermDates = false, effective: number | null = null;
  for (const d of docs) {
    if (isProcessing(d.status)) processing += 1;
    if (d.status === "FAILED") failed += 1;
    if (d.status === "READY") {
      readyCount += 1;
      if (typeof d.clauseCount === "number") clauseCount = (clauseCount ?? 0) + d.clauseCount;
    }
    const risk = docRisk(d, classByDoc.get(d.docId));
    if (risk.rc) addCounts(rc, risk.rc);
    unrated += risk.unrated;
    if (d.lifecycle === "expired") expired = true;
    // Renewal and term-end dates only: a contract's effective (start) date is not a renewal.
    for (const [iso, kind] of [[d.renewalDate, "renewal"], [d.termEndDate, "term-end"]] as const) {
      const t = timeOf(iso);
      if (t === null) continue;
      hasTermDates = true;
      if (t >= now && (nearest === null || t < nearest)) { nearest = t; dateKind = kind; }
    }
    const eff = timeOf(d.effectiveDate);
    if (eff !== null && (effective === null || eff < effective)) effective = eff;
  }
  const valued: ValuedDoc[] = docs.filter((d) => d.status === "READY").map((d) => ({
    docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt,
    classification: classByDoc.get(d.docId), persisted: persistedOf(d),
  }));
  const cv = computeContractValue(valued);
  const root = docs.find((d) => d.docType !== "AMENDMENT") ?? docs[0];
  return {
    project, docs, docCount: docs.length, clauseCount, rc, rated: sum(rc), unrated,
    highRisk: rc.high + rc.critical, overallRisk: worst(rc),
    value: cv.total > 0 ? cv.total : null,
    valueDelta: cv.segments.filter((s) => s.isAmendment).reduce((s, x) => s + x.value, 0),
    reconciled: cv.reconciled, currency: cv.currency,
    readyCount, processing, failed,
    lifecycle: root?.lifecycle ?? null, expired,
    daysToDate: nearest !== null ? Math.round((nearest - now) / DAY) : null, dateKind, hasTermDates,
    effectiveYear: effective !== null ? new Date(effective).getFullYear() : null,
  };
}

/** Sums kept per currency: amounts in different currencies are never added together. */
type MoneyTotals = [currency: string, amount: number][];
function byCurrency(rows: { value: number | null; currency: string | null }[]): MoneyTotals {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.value === null) continue;
    const cur = (r.currency ?? "").toUpperCase();
    m.set(cur, (m.get(cur) ?? 0) + r.value);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const moneyList = (totals: MoneyTotals) => totals.map(([cur, n]) => fmtMoney(n, cur || null)).join(" + ");

type SortKey = "name" | "status" | "docCount" | "clauseCount" | "highRisk" | "value" | "risk";
type SortDir = "asc" | "desc";

const NOOP_SUBSCRIBE = () => () => {};

export function RiskView() {
  const { data, isLoading: docsLoading, isError: docsError, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const rawProjects = useProjects();
  // The projects list has its own load state. Until it has been read from the
  // server the page is loading, and if that read fails it is an error — never
  // an empty workspace.
  const projectsSync = useProjectsSync();
  const packs = useCompliancePacks();
  const now = useNow(); // real current time, re-read every minute
  // False on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, () => true, () => false);

  const dataLoading = docsLoading || projectsSync.status === "idle" || projectsSync.status === "loading";
  // Only a load that produced nothing is a page-level error. A failed background
  // refresh keeps the last data on screen and is flagged beside the refresh button.
  const loadFailed = (docsError && !data) || projectsSync.status === "error";
  const refreshAll = () => { void refetch(); void refreshProjects(); };

  // The dashboard is a portfolio overview, so it rolls up EVERY document —
  // manual projects plus a synthetic entry for any ungrouped document (in
  // memory only; the Projects page stays a separate manual organizer).
  const projects = useMemo(() => withUngroupedDocs(rawProjects, docs), [rawProjects, docs]);
  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);
  const { byDoc: classByDoc, loadingCount: classLoading, failedCount: classFailed } = useClassifications(docs);
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);

  const aggregates = useMemo(
    () => projects.map((p) => aggregate(p, byId, classByDoc, now)),
    [projects, byId, classByDoc, now],
  );

  /* ── Risk: rated clauses only; documents without a rating are counted apart ── */
  const risk = useMemo(() => {
    const rc = { ...NO_COUNTS };
    let unrated = 0, assessed = 0, processing = 0, failed = 0, readyUnrated = 0;
    for (const d of docs) {
      const r = docRisk(d, classByDoc.get(d.docId));
      unrated += r.unrated;
      if (r.rc) { addCounts(rc, r.rc); assessed += 1; }
      else if (isProcessing(d.status)) processing += 1;
      else if (d.status === "FAILED") failed += 1;
      else readyUnrated += 1;
    }
    return { rc, rated: sum(rc), unrated, assessed, notAssessed: docs.length - assessed, processing, failed, readyUnrated };
  }, [docs, classByDoc]);

  const riskyContracts = aggregates.filter((a) => isRisky(a.overallRisk));
  const unassessedContracts = aggregates.filter((a) => a.overallRisk === null).length;
  // "All clear" may only be said when every document is analysed and rated.
  const everythingAssessed = docs.length > 0 && risk.notAssessed === 0 && risk.unrated === 0 && classLoading === 0;

  /* ── Money: per-currency totals over contracts that have an extracted value ── */
  const valuedContracts = aggregates.filter((a) => a.value !== null);
  const totals = byCurrency(aggregates);
  const atRiskTotals = byCurrency(riskyContracts);
  const riskyUnvalued = riskyContracts.filter((a) => a.value === null).length;
  const currencyUnknown = totals.some(([cur]) => !cur);

  /* ── Contracts needing attention: a high or critical clause, or a failed document ── */
  const attention = useMemo(
    () => aggregates
      .filter((a) => isRisky(a.overallRisk) || a.failed > 0)
      .sort((a, b) =>
        (a.overallRisk ? RISK_RANK[a.overallRisk] : UNRATED_RANK) - (b.overallRisk ? RISK_RANK[b.overallRisk] : UNRATED_RANK) ||
        (b.value ?? 0) - (a.value ?? 0)),
    [aggregates],
  );
  const [showAllAttention, setShowAllAttention] = useState(false);

  /* ── Lifecycle: the stage stored on each contract's root document ── */
  const lifecycleCounts = useMemo(() => {
    const m = new Map<Lifecycle, number>();
    let unknown = 0;
    for (const a of aggregates) {
      if (a.lifecycle) m.set(a.lifecycle, (m.get(a.lifecycle) ?? 0) + 1);
      else unknown += 1;
    }
    return { m, unknown };
  }, [aggregates]);
  const inForce = (lifecycleCounts.m.get("active") ?? 0) + (lifecycleCounts.m.get("signed") ?? 0);
  const otherStages = LIFECYCLE_ORDER
    .filter((l) => l !== "active" && l !== "signed" && (lifecycleCounts.m.get(l) ?? 0) > 0)
    .map((l) => `${lifecycleCounts.m.get(l)} ${stageLabel(l).toLowerCase()}`);

  /* ── Upcoming: nearest renewal or term-end date within 90 days ── */
  const upcoming = aggregates.filter((a) => !a.expired && a.daysToDate !== null && a.daysToDate <= 90);
  const upcomingTotals = byCurrency(upcoming);
  const upcomingValued = upcoming.filter((a) => a.value !== null).length;
  const withoutTermDates = aggregates.filter((a) => !a.hasTermDates).length;

  /* ── Clause categories (from the loaded classifications) ── */
  const { allClauses } = useMemo(() => {
    const clauses: { category: string; riskLevel: RiskLevel; riskRated: boolean }[] = [];
    const m = new Map<string, { count: number; rc: Counts }>();
    for (const d of readyDocs) {
      for (const cl of classByDoc.get(d.docId)?.clauses ?? []) {
        const rated = cl.riskRated !== false;
        clauses.push({ category: cl.category, riskLevel: cl.riskLevel, riskRated: rated });
        const e = m.get(cl.category) ?? { count: 0, rc: { ...NO_COUNTS } };
        e.count += 1;
        if (rated) e.rc[cl.riskLevel] += 1;
        m.set(cl.category, e);
      }
    }
    const cats: CatDatum[] = [...m.entries()]
      .map(([name, v]) => ({ name, count: v.count, risk: worst(v.rc) }))
      .sort((a, b) => b.count - a.count);
    return { allClauses: clauses, catData: cats };
  }, [readyDocs, classByDoc]);
  const clausesPending = classLoading > 0 && readyDocs.some((d) => !classByDoc.has(d.docId));

  // Clauses rated high or critical, per document type.
  const riskByType: HBarDatum[] = useMemo(() => {
    const m = new Map<string, { docs: number; rc: Counts }>();
    for (const d of readyDocs) {
      const r = docRisk(d, classByDoc.get(d.docId));
      if (!r.rc) continue;
      const e = m.get(d.docType) ?? { docs: 0, rc: { ...NO_COUNTS } };
      e.docs += 1;
      addCounts(e.rc, r.rc);
      m.set(d.docType, e);
    }
    return [...m.entries()]
      .map(([type, v]) => {
        const level = worst(v.rc);
        return {
          id: type, label: docTypeShort(type), value: v.rc.high + v.rc.critical,
          color: level ? RISK_COLOR.high : NEUTRAL_MARK,
          sub: `${v.rc.critical} critical · ${v.rc.high} high · ${plural(v.docs, "document")}`,
        };
      })
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [readyDocs, classByDoc]);
  const hasTypeRisk = riskByType.some((r) => r.value > 0);

  // Every document by type, whatever its processing status.
  const docsByType: HBarDatum[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.docType, (m.get(d.docType) ?? 0) + 1);
    return [...m.entries()]
      .map(([t, n]) => ({ id: t, label: docTypeShort(t), value: n, color: ACCENT }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [docs]);

  // Contract value by the year of the contract's earliest extracted effective
  // date. A contract with no effective date is left out (and counted), never
  // filed under its upload date.
  const valueByYear = useMemo(() => {
    const m = new Map<string, YearRow>();
    let undated = 0;
    for (const a of aggregates) {
      if (a.value === null) continue;
      if (a.effectiveYear === null) { undated += 1; continue; }
      const cur = (a.currency ?? "").toUpperCase();
      const key = `${a.effectiveYear}|${cur}`;
      const e = m.get(key) ?? { key, year: a.effectiveYear, currency: cur, value: 0, atRisk: 0 };
      e.value += a.value;
      if (isRisky(a.overallRisk)) e.atRisk += a.value;
      m.set(key, e);
    }
    return { rows: [...m.values()].sort((a, b) => a.year - b.year || a.currency.localeCompare(b.currency)), undated };
  }, [aggregates]);

  const valueRows = useMemo(
    () => aggregates.filter((a) => a.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [aggregates],
  );
  const [showAllValues, setShowAllValues] = useState(false);

  // Compliance coverage: only the per-document figures the backend stored when
  // it graded the document against the enabled packs. Nothing is recomputed here.
  const coverage = useMemo(() => {
    const scored = docs
      .filter((d) => typeof d.complianceCoveragePct === "number")
      .map((d) => ({
        docId: d.docId,
        title: d.title || "Untitled document",
        pct: Math.round(d.complianceCoveragePct as number),
        gaps: typeof d.complianceGaps === "number" ? d.complianceGaps : null,
        frameworks: d.complianceFrameworks ?? [],
      }))
      .sort((a, b) => a.pct - b.pct || a.title.localeCompare(b.title));
    const mean = scored.length ? Math.round(scored.reduce((s, d) => s + d.pct, 0) / scored.length) : null;
    return { scored, mean, withGaps: scored.filter((d) => (d.gaps ?? 0) > 0).length };
  }, [docs]);
  const packsEnabled = (packs.data?.packs.length ?? 0) > 0;
  const [showAllCoverage, setShowAllCoverage] = useState(false);

  /* ── Contracts table ── */
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(() => {
    const f = loadFilters();
    return f?.sortKey ? { key: f.sortKey, dir: f.sortDir ?? "desc" } : { key: "risk", dir: "asc" };
  });
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(() => loadFilters()?.risk ?? "all");
  const [docTypeFilter, setDocTypeFilter] = useState<DocType | "all">(() => loadFilters()?.docType ?? "all");

  const sortedRows = useMemo(() => {
    const rows = [...aggregates];
    const dir = sort.dir === "asc" ? 1 : -1;
    const rank = (a: Agg) => (a.overallRisk ? RISK_RANK[a.overallRisk] : UNRATED_RANK);
    rows.sort((a, b) => {
      switch (sort.key) {
        case "name": return a.project.name.localeCompare(b.project.name) * dir;
        case "status": return (a.lifecycle ?? "").localeCompare(b.lifecycle ?? "") * dir;
        case "docCount": return (a.docCount - b.docCount) * dir;
        // Unknown counts and values sort below every known one.
        case "clauseCount": return ((a.clauseCount ?? -1) - (b.clauseCount ?? -1)) * dir;
        case "highRisk": return ((a.rated > 0 ? a.highRisk : -1) - (b.rated > 0 ? b.highRisk : -1)) * dir;
        case "value": return ((a.value ?? -1) - (b.value ?? -1)) * dir;
        case "risk": return (rank(a) - rank(b)) * dir || (b.value ?? 0) - (a.value ?? 0);
        default: return 0;
      }
    });
    return rows;
  }, [aggregates, sort]);
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));
  const setSortKey = (key: SortKey) =>
    setSort({ key, dir: key === "name" || key === "status" || key === "risk" ? "asc" : "desc" });

  // Document types actually present in the portfolio, in a fixed order.
  const availableDocTypes = useMemo(() => DOC_TYPE_ORDER.filter((t) => docs.some((d) => d.docType === t)), [docs]);

  const visibleRows = useMemo(
    () => sortedRows.filter((a) =>
      (riskFilter === "all" || (riskFilter === "unrated" ? a.overallRisk === null : a.overallRisk === riskFilter)) &&
      (docTypeFilter === "all" || a.docs.some((d) => d.docType === docTypeFilter))),
    [sortedRows, riskFilter, docTypeFilter],
  );
  const filtersActive = riskFilter !== "all" || docTypeFilter !== "all";
  const resetFilters = () => { setRiskFilter("all"); setDocTypeFilter("all"); };

  // Cross-filtering: selecting a "by type" bar filters the contracts table to
  // that document type and brings it into view.
  const tableRef = useRef<HTMLElement>(null);
  const focusContractsByType = (type: string) => {
    setDocTypeFilter((cur) => (cur === type ? "all" : (type as DocType)));
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Keep the user's filter + sort choices across navigation and reloads.
  useEffect(() => {
    const payload: SavedFilters = { risk: riskFilter, docType: docTypeFilter, sortKey: sort.key, sortDir: sort.dir };
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(payload)); } catch { /* ignore quota/private-mode */ }
  }, [riskFilter, docTypeFilter, sort]);

  // First run: a user with an empty workspace and no setup record goes to the
  // setup guide once. After that the dashboard only offers it. "Empty" needs
  // both lists to have loaded: a failed or pending load is not an empty workspace.
  const { user } = useAuth();
  const workspaceEmpty = !dataLoading && !loadFailed && docs.length === 0 && rawProjects.length === 0;
  const { onboarding, redirecting } = useFirstRunRedirect(user?.sub, mounted && workspaceEmpty);
  const setupUnfinished = isSetupUnfinished(onboarding);

  const loading = !mounted || dataLoading || redirecting;
  const shownAttention = showAllAttention ? attention : attention.slice(0, 6);
  const shownValues = showAllValues ? valueRows : valueRows.slice(0, 6);
  const shownCoverage = showAllCoverage ? coverage.scored : coverage.scored.slice(0, 6);

  // What the risk figures leave out, in one sentence.
  const notAssessedParts = [
    risk.processing > 0 ? `${risk.processing} still processing` : "",
    risk.failed > 0 ? `${risk.failed} failed` : "",
    risk.readyUnrated > 0 ? `${risk.readyUnrated} analysed without a risk level` : "",
  ].filter(Boolean);
  // Why "nothing flagged" is not yet "all clear".
  const pendingNote = risk.notAssessed > 0
    ? `${plural(risk.notAssessed, "document")} ${risk.notAssessed === 1 ? "is" : "are"} not yet assessed`
    : risk.unrated > 0
      ? `${plural(risk.unrated, "clause")} ${risk.unrated === 1 ? "has" : "have"} no risk level`
      : "clause detail is still loading";

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* This view's own toolbar: freshness of the document data, and the
          one action that adds to it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-600)]">Clause risk, value and compliance across every uploaded document.</p>
        <div className="flex items-center gap-3">
          <Button variant={!loading && !loadFailed && projects.length === 0 ? "outline" : "default"} size="sm" asChild>
            <Link href="/projects/new"><Plus size={15} strokeWidth={2.25} />New project</Link>
          </Button>
        </div>
      </div>
        {loading ? (
          <DashboardSkeleton />
        ) : loadFailed ? (
          <ErrorState onRetry={refreshAll} detail={projectsSync.status === "error" ? projectsSync.error : null} />
        ) : projects.length === 0 ? (
          <SetupPrompt resume={setupUnfinished} />
        ) : (
          <>
            {/* New workspaces: keep the first-run checklist until a couple of contracts are in. */}
            {docs.length < 2 && (
              <GettingStarted
                projectCount={rawProjects.length}
                documentCount={docs.length}
                firstReadyDocId={readyDocs[0]?.docId}
                resumeSetup={setupUnfinished}
              />
            )}

            {/* Health band — the focal value-at-risk block, then the KPIs. */}
            <section aria-label="Portfolio overview" className="space-y-4">
              <FocalValueAtRisk
                totals={totals}
                atRiskTotals={atRiskTotals}
                riskyCount={riskyContracts.length}
                riskyUnvalued={riskyUnvalued}
                unassessedContracts={unassessedContracts}
                contractCount={aggregates.length}
                criticalClauses={risk.rc.critical}
                failed={risk.failed}
              />

              {/* What the risk figures do not cover — always stated, never implied away. */}
              {(risk.notAssessed > 0 || risk.unrated > 0 || clausesPending || classFailed > 0) && (
                <p className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-[var(--ink-600)]" aria-live="polite">
                  <Info size={15} className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
                  <span className="min-w-0">
                    {[
                      risk.notAssessed > 0
                        ? `${risk.notAssessed} of ${plural(docs.length, "document")} ${risk.notAssessed === 1 ? "is" : "are"} not yet assessed for risk (${notAssessedParts.join(", ")}) and ${risk.notAssessed === 1 ? "is" : "are"} left out of the risk figures.`
                        : "",
                      risk.unrated > 0 ? `${plural(risk.unrated, "clause")} came back without a risk level and ${risk.unrated === 1 ? "is" : "are"} counted as not assessed.` : "",
                      clausesPending ? "Clause detail is still loading for some documents." : "",
                      classFailed > 0 ? `Clause detail couldn’t be loaded for ${plural(classFailed, "document")}.` : "",
                    ].filter(Boolean).join(" ")}
                  </span>
                </p>
              )}

              {/* Six KPIs, never more than three across, so labels wrap and figures always fit. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Contracts needing attention" value={attention.length}
                  tone={attention.length > 0 ? "danger" : everythingAssessed ? "success" : "neutral"} icon={<ShieldAlert size={14} />}
                  hint={attention.length > 0
                    ? `A high or critical clause, or a failed document · ${risk.rc.critical} critical and ${risk.rc.high} high clauses`
                    : everythingAssessed
                      ? "Every document is analysed and rated; none has a high or critical clause"
                      : `None found so far · ${pendingNote}`}
                />
                <MetricCard
                  label="Total contract value" tone="brand" icon={<DollarSign size={14} />}
                  value={totals.length > 0 ? moneyList(totals) : "No value yet"}
                  hint={`${valuedContracts.length} of ${plural(aggregates.length, "contract")} valued${currencyUnknown ? " · currency not extracted for some" : ""}`}
                />
                <MetricCard
                  label="Documents assessed for risk" icon={<CheckCircle2 size={14} />}
                  value={`${risk.assessed} of ${docs.length}`}
                  hint={risk.notAssessed > 0 ? notAssessedParts.join(" · ") : "Every document has rated clauses"}
                />
                <MetricCard
                  label="Active or signed contracts" value={inForce} icon={<Briefcase size={14} />}
                  hint={[
                    `of ${plural(aggregates.length, "contract")}, by lifecycle stage`,
                    ...otherStages,
                    lifecycleCounts.unknown > 0 ? `${lifecycleCounts.unknown} with no documents` : "",
                  ].filter(Boolean).join(" · ")}
                />
                <MetricCard
                  label="Renewal or term end in the next 90 days" value={upcoming.length} icon={<CalendarClock size={14} />}
                  hint={[
                    upcoming.length > 0
                      ? (upcomingTotals.length > 0 ? `${moneyList(upcomingTotals)} · ${upcomingValued} of ${upcoming.length} valued` : "No value extracted for these")
                      : "",
                    withoutTermDates > 0 ? `${withoutTermDates} of ${plural(aggregates.length, "contract")} ${withoutTermDates === 1 ? "has" : "have"} no renewal or term-end date extracted` : "",
                  ].filter(Boolean).join(" · ") || "Every contract has a renewal or term-end date; none falls in this window"}
                />
                <MetricCard
                  label="Clauses with a risk level" value={risk.rated.toLocaleString()} icon={<FileText size={14} />}
                  hint={`In ${plural(risk.assessed, "document")}${risk.unrated > 0 ? ` · ${plural(risk.unrated, "clause")} more without a risk level` : ""}`}
                />
              </div>
            </section>

            <SectionLabel>Risk and value</SectionLabel>
            {(risk.rated > 0 || risk.unrated > 0) && (
              <MotionReveal><RiskIntelligence counts={risk.rc} unrated={risk.unrated} /></MotionReveal>
            )}

            {/* Heatmap + value/exposure by year */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-7" title="Risk by category" icon={<BarChart3 size={15} />} sub="Clauses per category and risk level">
                  {allClauses.length === 0
                    ? (clausesPending ? <Skeleton className="h-48 rounded-lg" /> : <Empty text="The clause heatmap appears once a document has been analysed." />)
                    : <ClauseHeatmap clauses={allClauses} />}
                </Card>
                <Card
                  className="lg:col-span-5" title="Value and exposure by year" icon={<TrendingUp size={15} />}
                  sub={valuedContracts.length > 0 ? `${valuedContracts.length - valueByYear.undated} of ${valuedContracts.length} valued contracts dated` : undefined}
                >
                  {valueByYear.rows.length === 0 ? (
                    <Empty text={valuedContracts.length === 0
                      ? "No contract value has been extracted yet."
                      : `None of the ${plural(valuedContracts.length, "valued contract")} has an extracted effective date, so there is nothing to place on a year.`} />
                  ) : (
                    <>
                      <ValueByYearBars rows={valueByYear.rows} multiCurrency={totals.length > 1} />
                      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-[var(--ink-600)]">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--viz-primary)]" />Contract value</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--danger)]" />In contracts rated high or critical</span>
                        </div>
                        <p className="text-muted-foreground">
                          Year of each contract&apos;s earliest extracted effective date.
                          {valueByYear.undated > 0 ? ` ${plural(valueByYear.undated, "valued contract")} with no effective date ${valueByYear.undated === 1 ? "is" : "are"} not shown.` : ""}
                          {totals.length > 1 ? " Bars are comparable within one currency only." : ""}
                        </p>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </MotionReveal>

            {/* Documents by type + risk by type */}
            {docsByType.length > 0 && (
              <MotionReveal delay={0.05}>
                <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
                  <Card title="Documents by type" icon={<Layers size={15} />} sub={`All ${plural(docs.length, "document")} · select a bar to filter contracts`}>
                    <HBarChart data={docsByType} valueFormatter={(n) => n.toLocaleString()} onSelect={focusContractsByType} yAxisWidth={96} />
                  </Card>
                  <Card title="High or critical clauses by document type" icon={<BarChart3 size={15} />} sub="Select a bar to filter contracts">
                    {riskByType.length === 0
                      ? <Empty text="No document has rated clauses yet." />
                      : hasTypeRisk
                        ? <HBarChart data={riskByType} valueFormatter={(n) => n.toLocaleString()} onSelect={focusContractsByType} yAxisWidth={96} />
                        : <Empty text={`None of the ${plural(risk.rated, "rated clause")} is high or critical.`} />}
                  </Card>
                </div>
              </MotionReveal>
            )}

            {/* Compliance coverage — per-document figures stored by the analysis */}
            {(packsEnabled || coverage.scored.length > 0) && (
              <MotionReveal delay={0.05}>
                <Card
                  title="Compliance coverage"
                  icon={<ShieldCheck size={15} />}
                  sub={coverage.mean !== null
                    ? `${coverage.scored.length} of ${plural(readyDocs.length, "analysed document")} scored · mean ${coverage.mean}% · ${coverage.withGaps} with gaps`
                    : undefined}
                >
                  {coverage.scored.length === 0 ? (
                    <Empty text="No compliance coverage has been recorded for your documents yet. Coverage is scored when a document is analysed with a compliance pack enabled." />
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {shownCoverage.map((d) => (
                          <li key={d.docId}>
                            <Link href={`/projects/${d.docId}`} className="-mx-2 block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                                <span className="min-w-0 truncate font-medium text-foreground" title={d.title}>{d.title}</span>
                                <span className="shrink-0 tabular-nums text-[var(--ink-600)]">
                                  <span className="font-semibold text-foreground">{d.pct}%</span>
                                  {d.gaps !== null ? ` · ${plural(d.gaps, "gap")}` : ""}
                                  {d.frameworks.length > 0 ? ` · ${d.frameworks.map((f) => f.toUpperCase()).join(", ")}` : ""}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                                <div className="h-full rounded-full bg-[var(--viz-primary)]" style={{ width: `${Math.max(0, Math.min(100, d.pct))}%` }} />
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <MoreToggle total={coverage.scored.length} first={6} open={showAllCoverage} onToggle={() => setShowAllCoverage((v) => !v)} noun="documents" />
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="min-w-0 flex-1 basis-64">Coverage and gap counts are the figures stored with each document when it was analysed, lowest coverage first. The mean is the plain average of those percentages.</span>
                    <Link href="/settings/compliance" className={TEXT_LINK}>Manage packs<ArrowRight size={14} strokeWidth={2} /></Link>
                  </div>
                </Card>
              </MotionReveal>
            )}

            {/* Needs attention + value by contract */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
                <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-7">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3.5 md:px-5">
                    <ShieldAlert size={15} className={attention.length ? "text-[var(--danger)]" : "text-muted-foreground"} />
                    <h3 className="text-base font-semibold tracking-tight text-foreground">Needs your attention</h3>
                    {attention.length > 0 && <span className="ml-auto rounded-md bg-[var(--danger-soft)] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--danger)]">{attention.length}</span>}
                  </div>
                  {attention.length === 0 ? (
                    everythingAssessed ? (
                      <div className="flex flex-col items-center px-5 py-10 text-center"><CheckCircle2 size={24} className="mb-2 text-[var(--success)]" /><p className="text-base font-semibold text-foreground">All clear</p><p className="mt-0.5 max-w-sm text-sm text-muted-foreground">All {plural(docs.length, "document")} are analysed and rated, and no clause is rated high or critical.</p></div>
                    ) : (
                      <div className="flex flex-col items-center px-5 py-10 text-center"><Info size={24} className="mb-2 text-muted-foreground" /><p className="text-base font-semibold text-foreground">Nothing flagged so far</p><p className="mt-0.5 max-w-sm text-sm text-muted-foreground">No assessed document has a high or critical clause, but {pendingNote}.</p></div>
                    )
                  ) : (
                    <>
                      <ul className="divide-y divide-border">
                        {shownAttention.map((a) => (
                          <li key={a.project.id}>
                            <Link href={`/projects/${a.project.id}`} className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] md:px-5">
                              {isRisky(a.overallRisk)
                                ? <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_PILL[a.overallRisk as RiskLevel]}`}>{RISK_LABEL[a.overallRisk as RiskLevel]}</span>
                                : <span className="shrink-0 rounded-md bg-[var(--danger-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">Failed</span>}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-semibold text-foreground">{a.project.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {[
                                    a.highRisk > 0 ? plural(a.highRisk, "high or critical clause") : "",
                                    a.failed > 0 ? `${plural(a.failed, "document")} failed analysis` : "",
                                    a.value !== null ? fmtMoney(a.value, a.currency) : "No value extracted",
                                  ].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)] group-hover:text-[var(--brand-primary-700)]"><span className="hidden sm:inline">Review</span><ArrowRight size={14} strokeWidth={2} /></span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="px-4 md:px-5"><MoreToggle total={attention.length} first={6} open={showAllAttention} onToggle={() => setShowAllAttention((v) => !v)} noun="contracts" /></div>
                    </>
                  )}
                </section>
                <Card className="lg:col-span-5" title="Value by contract" icon={<DollarSign size={15} />} sub={`${valuedContracts.length} of ${plural(aggregates.length, "contract")} valued`}>
                  {valueRows.length === 0 ? <Empty text="No contract value has been extracted yet. Values appear when the analysis finds a stated amount in a document." /> : (
                    <>
                      <ValueByProject rows={shownValues} scaleRows={valueRows} />
                      <MoreToggle total={valueRows.length} first={6} open={showAllValues} onToggle={() => setShowAllValues((v) => !v)} noun="valued contracts" />
                      {totals.length > 1 && <p className="mt-2 text-xs text-muted-foreground">Bars are comparable within one currency only.</p>}
                    </>
                  )}
                </Card>
              </div>
            </MotionReveal>

            <SectionLabel>Contracts</SectionLabel>
            {/* Contracts table — sortable roll-up with dropdown options */}
            <section ref={tableRef} className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 md:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">All contracts</h3>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--ink-600)]">{visibleRows.length}{filtersActive ? ` of ${aggregates.length}` : ""}</span>
                  <Link href="/projects" className={`ml-auto lg:hidden ${TEXT_LINK}`}>View all<ArrowRight size={14} strokeWidth={2} /></Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {availableDocTypes.length > 1 && (
                    <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as DocType | "all")}>
                      <SelectTrigger aria-label="Filter by document type" className="min-w-[132px] flex-1 sm:w-[148px] sm:flex-none"><Layers size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {availableDocTypes.map((t) => (
                          <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
                    <SelectTrigger aria-label="Filter by risk level" className="min-w-[132px] flex-1 sm:w-[156px] sm:flex-none"><Filter size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All risk</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="unrated">Not assessed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sort.key} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger aria-label="Sort contracts" className="min-w-[168px] flex-1 sm:w-[196px] sm:flex-none"><span className="text-muted-foreground">Sort</span><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk level</SelectItem>
                      <SelectItem value="value">Contract value</SelectItem>
                      <SelectItem value="highRisk">High-risk clauses</SelectItem>
                      <SelectItem value="clauseCount">Clause count</SelectItem>
                      <SelectItem value="docCount">Document count</SelectItem>
                      <SelectItem value="name">{byEdition("Project name", "Engagement name")}</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  {filtersActive && (
                    <Button variant="ghost" className="h-10 text-[var(--ink-600)] sm:h-9" onClick={resetFilters}>
                      <XCircle size={14} />Clear filters ({(riskFilter !== "all" ? 1 : 0) + (docTypeFilter !== "all" ? 1 : 0)})
                    </Button>
                  )}
                  <Link href="/projects" className={`hidden lg:inline-flex lg:pl-1 ${TEXT_LINK}`}>View all<ArrowRight size={14} strokeWidth={2} /></Link>
                </div>
              </div>
              {/* Below md the table keeps Project, High-risk, Value and Risk; the rest return as space allows. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-[var(--panel)] text-left">
                      <SortableTh label={byEdition("Project", "Engagement")} k="name" sort={sort} onSort={toggleSort} />
                      <SortableTh label="Status" k="status" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
                      <SortableTh label="Docs" k="docCount" sort={sort} onSort={toggleSort} align="right" className="hidden lg:table-cell" />
                      <SortableTh label="Clauses" k="clauseCount" sort={sort} onSort={toggleSort} align="right" className="hidden lg:table-cell" />
                      <SortableTh label="High-risk" k="highRisk" sort={sort} onSort={toggleSort} align="right" />
                      <SortableTh label="Value" k="value" sort={sort} onSort={toggleSort} align="right" />
                      <th scope="col" className={`hidden text-right xl:table-cell ${TH}`}>Amended</th>
                      <th scope="col" className={`hidden xl:table-cell ${TH}`}>Data</th>
                      <SortableTh label="Risk" k="risk" sort={sort} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 && (
                      <tr><td colSpan={9} className="px-5 py-10 text-center">
                        <p className="text-base font-semibold text-foreground">No contracts match these filters</p>
                        <Button variant="outline" className="mt-4 h-10 sm:h-9" onClick={resetFilters}>Clear filters</Button>
                      </td></tr>
                    )}
                    {visibleRows.map((a) => (
                      <tr key={a.project.id} className="border-b border-border transition-colors last:border-0 hover:bg-[var(--panel)]">
                        <td className="max-w-[220px] px-4 py-3 md:max-w-[320px] md:px-5"><Link href={`/projects/${a.project.id}`} className="block rounded-sm font-semibold text-foreground hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">{a.project.name}</Link>{a.project.client && <div className="truncate text-xs text-muted-foreground">{a.project.client}</div>}</td>
                        <td className="hidden px-4 py-3 capitalize text-[var(--ink-600)] md:table-cell md:px-5">{a.lifecycle ? stageLabel(a.lifecycle) : <Dash />}</td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-[var(--ink-600)] md:px-5 lg:table-cell">{a.docCount}</td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-[var(--ink-600)] md:px-5 lg:table-cell">{a.clauseCount === null ? <Dash /> : a.clauseCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums md:px-5">{a.rated === 0 ? <Dash /> : a.highRisk > 0 ? <span className="font-semibold text-[var(--danger)]">{a.highRisk}</span> : <span className="text-[var(--ink-600)]">0</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground md:px-5">{a.value !== null ? fmtMoney(a.value, a.currency) : <Dash />}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right md:px-5 xl:table-cell"><ValueDelta delta={a.valueDelta} currency={a.currency} /></td>
                        <td className="hidden whitespace-nowrap px-4 py-3 md:px-5 xl:table-cell"><ReconciledBadge reconciled={a.reconciled} hasValue={a.value !== null} /></td>
                        <td className="whitespace-nowrap px-4 py-3 md:px-5"><RiskCell a={a} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </div>
  );
}

const TEXT_LINK = "inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0";
const TH = "px-4 py-2.5 text-xs font-medium text-muted-foreground md:px-5";

type YearRow = { key: string; year: number; currency: string; value: number; atRisk: number };

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold pt-2 tracking-tight text-foreground md:pt-4">{children}</h2>;
}

function Dash() {
  return <span className="font-normal text-muted-foreground">—</span>;
}

/** "Show all N" for a list that starts shortened. Renders nothing when the
 *  whole list already fits, so no row is ever hidden without a way to see it. */
function MoreToggle({ total, first, open, onToggle, noun }: { total: number; first: number; open: boolean; onToggle: () => void; noun: string }) {
  if (total <= first) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border py-1">
      <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{open ? `All ${total} ${noun}` : `Showing ${first} of ${total} ${noun}`}</span>
      <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] sm:h-9" aria-expanded={open} onClick={onToggle}>
        {open ? `Show the first ${first}` : `Show all ${total}`}
      </Button>
    </div>
  );
}

/** Risk cell of the contracts table: the worst rated level, or why there is none. */
function RiskCell({ a }: { a: Agg }) {
  if (a.overallRisk) {
    return <span title="Highest clause risk level found in this contract" className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_PILL[a.overallRisk]}`}>{RISK_LABEL[a.overallRisk]}</span>;
  }
  if (a.processing > 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warning)]"><Loader2 size={12} className="animate-spin motion-reduce:animate-none" />Analyzing</span>;
  }
  if (a.failed > 0 && a.readyCount === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]"><XCircle size={12} />Failed</span>;
  }
  return <span className="text-xs text-muted-foreground">Not assessed</span>;
}

/* ── Focal: value at risk — the one solid block on the page ──────
   "At risk" = the extracted value of contracts whose worst rated clause is high
   or critical. Three different situations must not look alike:
   no such contracts · such contracts exist but none has a value · a real sum. */
function FocalValueAtRisk({ totals, atRiskTotals, riskyCount, riskyUnvalued, unassessedContracts, contractCount, criticalClauses, failed }: {
  totals: MoneyTotals; atRiskTotals: MoneyTotals; riskyCount: number; riskyUnvalued: number;
  unassessedContracts: number; contractCount: number; criticalClauses: number; failed: number;
}) {
  const hasRisky = riskyCount > 0;
  const hasSum = atRiskTotals.length > 0;
  const anomaly = criticalClauses > 0 || failed > 0;
  // A share of the portfolio only makes sense within one currency.
  const single = totals.length === 1 ? totals[0] : null;
  const singleAtRisk = single ? (atRiskTotals.find(([cur]) => cur === single[0])?.[1] ?? 0) : 0;
  const pct = single && single[1] > 0 ? Math.round((singleAtRisk / single[1]) * 100) : null;
  const unassessedNote = unassessedContracts > 0
    ? ` ${plural(unassessedContracts, "contract")} of ${contractCount} ${unassessedContracts === 1 ? "is" : "are"} not yet assessed for risk.`
    : "";

  return (
    <div className="grid grid-cols-1 gap-6 rounded-xl bg-[var(--navy)] p-5 text-white md:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-end lg:gap-10">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold">Value at risk</h2>
          {hasRisky ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--danger-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
              <AlertTriangle size={12} />{plural(riskyCount, "contract")} rated high or critical
            </span>
          ) : unassessedContracts === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--success-fg)]">
              <CheckCircle2 size={12} />No high or critical contracts
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
              <Info size={12} />Assessment incomplete
            </span>
          )}
        </div>
        <div className="mt-3 text-3xl font-bold leading-none tracking-[-0.025em] tabular-nums [overflow-wrap:anywhere] md:text-4xl">
          {hasSum ? moneyList(atRiskTotals) : hasRisky ? "No value yet" : unassessedContracts === 0 ? "None" : "None found so far"}
        </div>
        <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-[var(--navy-foreground)]">
          {hasSum ? (
            <>
              {pct !== null && single
                ? <><span className="font-semibold text-white">{pct}%</span> of the {fmtMoney(single[1], single[0] || null)} extracted portfolio value, in </>
                : "The extracted value of "}
              {plural(riskyCount - riskyUnvalued, "contract")} whose worst clause is rated high or critical.
              {riskyUnvalued > 0 ? ` ${plural(riskyUnvalued, "more high or critical contract")} ${riskyUnvalued === 1 ? "has" : "have"} no extracted value and ${riskyUnvalued === 1 ? "is" : "are"} not in this figure.` : ""}
            </>
          ) : hasRisky ? (
            <>{plural(riskyCount, "contract")} {riskyCount === 1 ? "is" : "are"} rated high or critical, but no value was extracted for {riskyCount === 1 ? "it" : "any of them"}, so the amount at risk is unknown.</>
          ) : (
            <>No {unassessedContracts === 0 ? "" : "assessed "}contract has a clause rated high or critical.</>
          )}
          {unassessedNote}
        </p>
      </div>

      {(single || anomaly) && (
        <div className="min-w-0 space-y-4">
          {/* Proportion: at-risk vs total extracted value (one currency only) */}
          {single && single[1] > 0 && (
            <div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                <div className="h-full rounded-full bg-white" style={{ width: `${singleAtRisk > 0 ? Math.max(3, pct ?? 0) : 0}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-xs tabular-nums text-[var(--navy-foreground)]">
                <span>At risk {fmtMoney(singleAtRisk, single[0] || null)}</span>
                <span>Total extracted {fmtMoney(single[1], single[0] || null)}</span>
              </div>
            </div>
          )}

          {anomaly && (
            <Link href="/projects?risk=attention" className="flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]">
              <ShieldAlert size={14} className="shrink-0" />
              <span className="min-w-0">
                {[
                  criticalClauses > 0 ? plural(criticalClauses, "critical clause") : "",
                  failed > 0 ? `${plural(failed, "document")} failed analysis` : "",
                ].filter(Boolean).join(" · ")}
              </span>
              <ArrowRight size={14} strokeWidth={2} className="ml-auto shrink-0" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ValueDelta({ delta, currency }: { delta: number; currency: string | null }) {
  if (!delta) return <Dash />;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums text-[var(--ink-700)]`}>
      {up ? <ArrowUp size={12} strokeWidth={2} /> : <ArrowDown size={12} strokeWidth={2} />}
      <span className="sr-only">{up ? "Increased by" : "Decreased by"}</span>
      {fmtMoney(Math.abs(delta), currency)}
    </span>
  );
}

function ReconciledBadge({ reconciled, hasValue }: { reconciled: boolean | null; hasValue: boolean }) {
  if (!hasValue) return <Dash />;
  if (reconciled === true) return <span title="Figures reconcile to the stated total" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]"><CheckCircle2 size={13} />Reconciled</span>;
  if (reconciled === false) return <span title="Figures don't reconcile. Review them." className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warning)]"><AlertTriangle size={13} />Check</span>;
  // The figure is the extracted one; the validation step just had nothing to reconcile it against.
  return <span title="Extracted from the document. No stated total was available to reconcile it against." className="text-xs text-muted-foreground">Not reconciled</span>;
}

function SortableTh({ label, k, sort, onSort, align = "left", className = "" }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; align?: "left" | "right"; className?: string }) {
  const active = sort.key === k;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-1 md:px-5 ${align === "right" ? "text-right" : ""} ${className}`}>
      <button
        type="button" onClick={() => onSort(k)}
        className={`inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-sm text-xs font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronDown size={13} className="text-[var(--ink-300)]" />}
      </button>
    </th>
  );
}

function Card({ title, icon, sub, children, className }: { title: string; icon: ReactNode; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 ${className ?? ""}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-muted-foreground">{icon}</span><h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3></div>
        {sub && <span className="text-xs tabular-nums text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** Largest amount per currency, so a bar is only ever scaled against its own currency. */
function maxByCurrency(rows: { currency: string; value: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.currency, Math.max(m.get(r.currency) ?? 1, r.value));
  return m;
}

function ValueByYearBars({ rows, multiCurrency }: { rows: YearRow[]; multiCurrency: boolean }) {
  const max = maxByCurrency(rows);
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const scale = max.get(r.currency) ?? 1;
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-foreground">{r.year}{multiCurrency ? <span className="font-normal text-muted-foreground"> · {r.currency || "currency not extracted"}</span> : null}</span>
              <span className="tabular-nums text-[var(--ink-600)]">{fmtMoney(r.value, r.currency || null)}{r.atRisk > 0 ? <span className="ml-1.5 font-medium text-[var(--danger)]">· {fmtMoney(r.atRisk, r.currency || null)} high or critical</span> : null}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--viz-primary)]" style={{ width: `${(r.value / scale) * 100}%` }} />
              {r.atRisk > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--danger)]" style={{ width: `${(r.atRisk / scale) * 100}%` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** `rows` are the contracts on screen; `scaleRows` is the full valued list, so
 *  bar lengths do not change when the list is expanded. */
function ValueByProject({ rows, scaleRows }: { rows: Agg[]; scaleRows: Agg[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = maxByCurrency(scaleRows.map((r) => ({ currency: (r.currency ?? "").toUpperCase(), value: r.value ?? 0 })));
  return (
    <div className="space-y-1">
      {rows.map((r, i) => {
        const risky = isRisky(r.overallRisk);
        const value = r.value ?? 0;
        return (
          <Link
            key={r.project.id} href={`/projects/${r.project.id}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className={`-mx-2 block rounded-lg px-2 py-2 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${hover === null || hover === i ? "" : "opacity-60"}`}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-foreground">{r.project.name}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {fmtMoney(value, r.currency)}
                {risky && <span className={`ml-1.5 font-medium ${r.overallRisk === "critical" ? "text-[var(--danger)]" : "text-[var(--warning-fg)]"}`}>· {RISK_LABEL[r.overallRisk as RiskLevel].toLowerCase()} risk</span>}
                {r.overallRisk === null && <span className="ml-1.5 font-normal text-muted-foreground">· risk not assessed</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-[var(--viz-primary)]" style={{ width: `${(value / (max.get((r.currency ?? "").toUpperCase()) ?? 1)) * 100}%` }} /></div>
          </Link>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mx-auto max-w-[52ch] py-6 text-center text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="h-[188px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)}</div>
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12"><Skeleton className="h-72 rounded-xl lg:col-span-7" /><Skeleton className="h-72 rounded-xl lg:col-span-5" /></div>
    </>
  );
}

function ErrorState({ onRetry, detail }: { onRetry: () => void; detail?: string | null }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-14 text-center md:py-20">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={24} strokeWidth={1.5} /></span>
      <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load your portfolio</h2>
      <p className="mt-2 max-w-md break-words text-base leading-relaxed text-[var(--ink-600)]">
        The request for your documents or projects failed, so no figures are shown. Try again in a moment.
      </p>
      {detail && <p className="mt-1 max-w-md break-words text-sm text-[var(--ink-600)]">{detail}</p>}
      <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}
