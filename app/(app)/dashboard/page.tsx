"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  Briefcase, ShieldAlert, ArrowRight, ArrowUp, ArrowDown, Plus, RefreshCw, Layers, FileText, DollarSign,
  AlertTriangle, CheckCircle2, Check, CalendarClock, BarChart3, TrendingUp, Database, Boxes, ShieldCheck,
  ChevronUp, ChevronDown, XCircle, Filter,
} from "@/components/ui/icons";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { getClassification } from "@/lib/api";
import { computeContractValue, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { categoryLabel } from "@/lib/clause-categories";
import { docTypeShort } from "@/lib/doc-types";
import { HBarChart, type HBarDatum } from "@/components/charts/HBarChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, withUngroupedDocs, type LocalProject } from "@/lib/projects-store";
import { useEnabledPacks, COMPLIANCE_PACKS } from "@/lib/compliance-packs";
import type { ApiClause, ApiClassification, ApiDocument, DocType, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_COLOR: Record<RiskLevel, string> = { low: "var(--success)", medium: "var(--ink-400)", high: "var(--warning)", critical: "var(--danger)" };
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const SCOPE_CATS = ["ScopeOfWork", "Deliverables", "Acceptance", "ChangeControl"];
const DAY = 86_400_000;

// Persist the contracts-table filters so a returning user keeps their view.
const FILTER_KEY = "biq-dashboard-filters";
const DOC_TYPE_ORDER: DocType[] = ["SOW", "MSA", "AMENDMENT", "LICENSE", "DPA", "BAA", "COMPLIANCE", "NDA", "OTHER"];
type SavedFilters = { risk?: RiskLevel | "all"; docType?: DocType | "all"; sortKey?: SortKey; sortDir?: SortDir };
function loadFilters(): SavedFilters | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(FILTER_KEY) || "null"); } catch { return null; }
}

type Agg = {
  project: LocalProject;
  docs: ApiDocument[];
  docCount: number;
  clauseCount: number;
  rc: { low: number; medium: number; high: number; critical: number };
  total: number;
  highRisk: number;
  overallRisk: RiskLevel;
  value: number;
  valueDelta: number;
  reconciled: boolean | null;
  currency: string | null;
  hasReady: boolean;
  processing: number;
  failed: number;
  expired: boolean;
  upcoming: boolean;
  status: string;
};

type SortKey = "name" | "status" | "docCount" | "clauseCount" | "highRisk" | "value" | "risk";
type SortDir = "asc" | "desc";

export default function DashboardPage() {
  const { data: docs = [], isLoading, isFetching, isError, refetch } = useDocuments();
  const rawProjects = useProjects();
  // The dashboard is a portfolio overview, so it rolls up EVERY document —
  // manual projects plus a synthetic entry for any ungrouped document (in
  // memory only; the Projects page stays a separate manual organizer).
  const projects = useMemo(() => withUngroupedDocs(rawProjects, docs), [rawProjects, docs]);
  const [mounted, setMounted] = useState(false);
  const [now] = useState(() => Date.now()); // mount-time reference for date windows

  useEffect(() => { setMounted(true); }, []);

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);
  const projectDocIds = useMemo(() => new Set(projects.flatMap((p) => p.docIds)), [projects]);
  const readyDocs = useMemo(() => docs.filter((d) => projectDocIds.has(d.docId) && d.status === "READY"), [docs, projectDocIds]);

  const classQueries = useQueries({
    queries: readyDocs.map((d) => ({ queryKey: documentKeys.classification(d.docId), queryFn: () => getClassification(d.docId), staleTime: 5 * 60_000 })),
  });
  const classByDoc = new Map<string, ApiClassification>();
  readyDocs.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });

  const allClauses: ApiClause[] = [];
  classByDoc.forEach((c) => c.clauses.forEach((cl) => allClauses.push(cl)));
  const classKey = classQueries.map((q) => q.dataUpdatedAt).join(",");

  const aggregates: Agg[] = projects.map((p) => {
    const pdocs = p.docIds.map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
    const rc = { low: 0, medium: 0, high: 0, critical: 0 };
    let clauseCount = 0, processing = 0, failed = 0, expired = false, upcoming = false, hasReady = false;
    for (const d of pdocs) {
      clauseCount += d.clauseCount ?? 0;
      if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
      if (PROCESSING.has(d.status)) processing++;
      if (d.status === "FAILED") failed++;
      if (d.status === "READY") hasReady = true;
      if (d.lifecycle === "expired") expired = true;
      if (d.effectiveDate) { const t = new Date(d.effectiveDate).getTime(); if (t >= now && t <= now + 90 * DAY) upcoming = true; }
    }
    const valued: ValuedDoc[] = pdocs.filter((d) => d.status === "READY").map((d) => ({ docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt, classification: classByDoc.get(d.docId), persisted: persistedOf(d) }));
    const cv = computeContractValue(valued);
    const valueDelta = cv.segments.filter((s) => s.isAmendment).reduce((s, x) => s + x.value, 0);
    const total = rc.low + rc.medium + rc.high + rc.critical;
    const highRisk = rc.high + rc.critical;
    const overallRisk: RiskLevel = rc.critical > 0 ? "critical" : rc.high > 0 ? "high" : rc.medium > 0 ? "medium" : "low";
    const root = pdocs.find((d) => d.docType !== "AMENDMENT") ?? pdocs[0];
    const status = root?.lifecycle ? root.lifecycle.charAt(0).toUpperCase() + root.lifecycle.slice(1) : "—";
    return { project: p, docs: pdocs, docCount: pdocs.length, clauseCount, rc, total, highRisk, overallRisk, value: cv.total, valueDelta, reconciled: cv.reconciled, currency: cv.currency, hasReady, processing, failed, expired, upcoming, status };
  });

  const tcv = aggregates.reduce((s, a) => s + a.value, 0);
  const valueAtRisk = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical").reduce((s, a) => s + a.value, 0);
  const varPct = tcv > 0 ? Math.round((valueAtRisk / tcv) * 100) : 0;
  const highCritCount = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical").length;
  const failedTotal = aggregates.reduce((s, a) => s + a.failed, 0);
  const renew = aggregates.filter((a) => a.upcoming);
  const renewValue = renew.reduce((s, a) => s + a.value, 0);
  const analyzingCount = aggregates.reduce((s, a) => s + a.processing, 0);
  const rcAll = aggregates.reduce((acc, a) => { acc.low += a.rc.low; acc.medium += a.rc.medium; acc.high += a.rc.high; acc.critical += a.rc.critical; return acc; }, { low: 0, medium: 0, high: 0, critical: 0 });
  const totalRiskClauses = rcAll.low + rcAll.medium + rcAll.high + rcAll.critical;

  // Value coverage: of the contracts we've analyzed, how many have an extracted
  // value — i.e. how complete (and trustworthy) the TCV figure actually is.
  const analyzable = aggregates.filter((a) => a.hasReady);
  const valuedCount = analyzable.filter((a) => a.value > 0).length;
  const coveragePct = analyzable.length > 0 ? Math.round((valuedCount / analyzable.length) * 100) : 0;
  const tcvPrev = useMemo(() => {
    // Prior cumulative value = TCV excluding the most recently created project,
    // so the headline TCV carries an honest "since last contract" delta.
    const ordered = [...aggregates].sort((a, b) => new Date(a.project.createdAt).getTime() - new Date(b.project.createdAt).getTime());
    return ordered.slice(0, -1).reduce((s, a) => s + a.value, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcv, projects.length]);
  const tcvDeltaPct = tcvPrev > 0 ? Math.round(((tcv - tcvPrev) / tcvPrev) * 100) : 0;

  const catData: CatDatum[] = useMemo(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    classByDoc.forEach((c) => c.clauses.forEach((cl) => { const e = (m[cl.category] ??= { count: 0, risk: "low" }); e.count++; if (RANK[cl.riskLevel ?? "low"] > RANK[e.risk]) e.risk = cl.riskLevel ?? "low"; }));
    return Object.entries(m).map(([name, val]) => ({ name: categoryLabel(name), count: val.count, risk: val.risk })).sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  // Risk by document type — high-risk clause count per type (SOW vs License vs
  // DPA/BAA/Compliance), so the riskiest document classes are visible at a glance.
  const riskByType: HBarDatum[] = useMemo(() => {
    const m: Record<string, { docs: number; total: number; high: number; risk: RiskLevel }> = {};
    for (const d of readyDocs) {
      const e = (m[d.docType] ??= { docs: 0, total: 0, high: 0, risk: "low" });
      e.docs++;
      for (const cl of classByDoc.get(d.docId)?.clauses ?? []) {
        e.total++;
        if (cl.riskLevel === "high" || cl.riskLevel === "critical") e.high++;
        if (RANK[cl.riskLevel ?? "low"] > RANK[e.risk]) e.risk = cl.riskLevel ?? "low";
      }
    }
    return Object.entries(m)
      .map(([type, v]) => ({ id: type, label: docTypeShort(type), value: v.high, color: RISK_COLOR[v.risk], sub: `${v.docs} doc${v.docs > 1 ? "s" : ""} · ${v.total} clauses` }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);
  const hasTypeRisk = riskByType.some((r) => r.value > 0);

  // Documents by type — total count per type (SOW, MSA, licence, DPA, BAA,
  // compliance), so the full document mix is visible at a glance.
  const docsByType: HBarDatum[] = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of readyDocs) m[d.docType] = (m[d.docType] ?? 0) + 1;
    return Object.entries(m)
      .map(([t, n]) => ({ id: t, label: docTypeShort(t), value: n, color: "var(--brand-primary-500)" }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  const tcvSeries = useMemo(() => {
    const ordered = [...aggregates].sort((a, b) => new Date(a.project.createdAt).getTime() - new Date(b.project.createdAt).getTime());
    let run = 0; const out: number[] = [];
    for (const a of ordered) { run += a.value; out.push(run); }
    return out.length > 1 ? out : out.length === 1 ? [0, out[0]] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcv, projects.length]);

  // Value AND at-risk value by contract effective year — exposure in context of size.
  const valueByYear = useMemo(() => {
    const m = new Map<string, { value: number; atRisk: number }>();
    for (const a of aggregates) {
      const dates = a.docs.map((d) => d.effectiveDate || d.createdAt).filter(Boolean).sort();
      const year = dates.length ? String(new Date(dates[0]!).getFullYear()) : "Undated";
      const e = m.get(year) ?? { value: 0, atRisk: 0 };
      e.value += a.value;
      if (a.overallRisk === "high" || a.overallRisk === "critical") e.atRisk += a.value;
      m.set(year, e);
    }
    return [...m.entries()].filter(([, v]) => v.value > 0).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcv, projects.length]);

  const scopeRows = SCOPE_CATS.map((cat) => ({ cat, n: allClauses.filter((cl) => cl.category === cat).length })).filter((x) => x.n > 0);
  const attention = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical" || a.failed > 0).sort((a, b) => RISK_RANK[a.overallRisk] - RISK_RANK[b.overallRisk] || b.value - a.value);
  const valueRows = aggregates.filter((a) => a.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  // Compliance coverage: of each enabled framework's clause obligations, how many
  // are actually present (and how many are weak) across analysed DPA/BAA/compliance docs.
  const { enabled: enabledPacks, mounted: packsMounted } = useEnabledPacks();
  const hasComplianceDocs = aggregates.some((a) => a.docs.some((d) => d.docType === "DPA" || d.docType === "BAA" || d.docType === "COMPLIANCE"));
  const complianceCoverage = useMemo(() => {
    const present = new Set<string>();
    const weak = new Set<string>();
    for (const cl of allClauses) {
      if (!cl.category) continue;
      present.add(cl.category);
      if (cl.riskLevel === "high" || cl.riskLevel === "critical") weak.add(cl.category);
    }
    return COMPLIANCE_PACKS.filter((p) => enabledPacks[p.id]).map((p) => {
      const covered = p.checks.filter((c) => present.has(c));
      const gaps = p.checks.filter((c) => !present.has(c));
      const pct = p.checks.length ? Math.round((covered.length / p.checks.length) * 100) : 0;
      return { id: p.id, name: p.name, pct, covered: covered.length, total: p.checks.length, gaps: gaps.length, weak: covered.filter((c) => weak.has(c)).length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classKey, enabledPacks]);
  const complianceGaps = complianceCoverage.reduce((s, c) => s + c.gaps, 0);

  // Sortable contracts table
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(() => {
    const f = loadFilters();
    return f?.sortKey ? { key: f.sortKey, dir: f.sortDir ?? "desc" } : { key: "risk", dir: "asc" };
  });
  const sortedRows = useMemo(() => {
    const rows = [...aggregates];
    const dir = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sort.key) {
        case "name": return a.project.name.localeCompare(b.project.name) * dir;
        case "status": return a.status.localeCompare(b.status) * dir;
        case "docCount": return (a.docCount - b.docCount) * dir;
        case "clauseCount": return (a.clauseCount - b.clauseCount) * dir;
        case "highRisk": return (a.highRisk - b.highRisk) * dir;
        case "value": return (a.value - b.value) * dir;
        case "risk": return (RISK_RANK[a.overallRisk] - RISK_RANK[b.overallRisk]) * dir || b.value - a.value;
        default: return 0;
      }
    });
    return rows;
  }, [aggregates, sort]);
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

  // Contracts-table options (dropdown-driven): filter by risk, by document type,
  // and choose a sort key. Selections persist (see effect below) so they're kept.
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">(() => loadFilters()?.risk ?? "all");
  const [docTypeFilter, setDocTypeFilter] = useState<DocType | "all">(() => loadFilters()?.docType ?? "all");

  // Document types actually present in the portfolio, in a sensible order.
  const availableDocTypes = useMemo(() => {
    const present = new Set<DocType>();
    for (const a of aggregates) for (const d of a.docs) if (d.docType) present.add(d.docType);
    return DOC_TYPE_ORDER.filter((t) => present.has(t));
  }, [aggregates]);

  const visibleRows = useMemo(() => {
    let rows = sortedRows;
    if (riskFilter !== "all") rows = rows.filter((a) => a.overallRisk === riskFilter);
    if (docTypeFilter !== "all") rows = rows.filter((a) => a.docs.some((d) => d.docType === docTypeFilter));
    return rows;
  }, [sortedRows, riskFilter, docTypeFilter]);

  const filtersActive = riskFilter !== "all" || docTypeFilter !== "all";
  const setSortKey = (key: SortKey) =>
    setSort({ key, dir: key === "name" || key === "status" ? "asc" : "desc" });
  const resetFilters = () => { setRiskFilter("all"); setDocTypeFilter("all"); };

  // Cross-filtering: clicking a "by type" chart bar filters the contracts table
  // to that document type and brings it into view.
  const tableRef = useRef<HTMLElement>(null);
  const focusContractsByType = (type: string) => {
    setDocTypeFilter((cur) => (cur === type ? "all" : (type as DocType)));
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Keep the user's filter + sort choices across navigation and reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: SavedFilters = { risk: riskFilter, docType: docTypeFilter, sortKey: sort.key, sortDir: sort.dir };
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(payload)); } catch { /* ignore quota/private-mode */ }
  }, [riskFilter, docTypeFilter, sort]);

  const loading = !mounted || isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio command center"
        title="Dashboard"
        subtitle="Value, risk, and what needs attention across every SOW, MSA, licence, DPA, BAA, and compliance document — live."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}><RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />Refresh</Button>
            <Link href="/projects/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-700)]"><Plus size={15} strokeWidth={2.5} />New project</Link>
          </div>
        }
      />

      <div className="app-container space-y-6 py-6 md:py-8">
        {loading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <SectionLabel>Overview</SectionLabel>
            {/* Health band — focal value-at-risk + the few KPIs that answer "is everything okay?" */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <FocalValueAtRisk
                valueAtRisk={valueAtRisk} tcv={tcv} varPct={varPct} count={highCritCount}
                criticalClauses={rcAll.critical} failed={failedTotal}
              />
              <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:grid-cols-3">
                <MetricCard
                  label="Needs attention" value={attention.length}
                  tone={attention.length > 0 ? "danger" : "success"} icon={<ShieldAlert size={14} />}
                  hint={attention.length > 0 ? `${rcAll.critical} critical · ${rcAll.high} high` : "all clear"}
                />
                <MetricCard
                  label="Total contract value" value={tcv > 0 ? fmtMoney(tcv) : "—"} tone="brand" icon={<DollarSign size={14} />}
                  delta={tcvPrev > 0 ? { value: `${tcvDeltaPct >= 0 ? "+" : ""}${tcvDeltaPct}%`, direction: tcvDeltaPct > 0 ? "up" : tcvDeltaPct < 0 ? "down" : "flat" } : undefined}
                  hint="since last contract"
                  chart={tcvSeries.length > 1 ? <Sparkline data={tcvSeries} variant="up" width={240} height={32} className="w-full" /> : undefined}
                />
                <CoverageCard pct={coveragePct} valued={valuedCount} total={analyzable.length} />
                <MetricCard label="Active contracts" value={projects.length} icon={<Briefcase size={14} />} hint={`${readyDocs.length} analyzed${analyzingCount ? ` · ${analyzingCount} processing` : ""}`} />
                <MetricCard label="Renewals · 90d" value={renew.length} icon={<CalendarClock size={14} />} hint={renewValue > 0 ? fmtMoney(renewValue) : "no upcoming dates"} />
                <MetricCard label="Clauses analyzed" value={totalRiskClauses.toLocaleString()} icon={<FileText size={14} />} hint={`${readyDocs.length} documents`} />
              </div>
            </section>

            <SectionLabel>Risk &amp; value</SectionLabel>
            {/* Risk intelligence */}
            {totalRiskClauses > 0 && <MotionReveal><RiskIntelligence counts={rcAll} categories={catData} /></MotionReveal>}

            {/* Heatmap + value/exposure by year */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-7" title="Risk by category" icon={<BarChart3 size={15} />} sub="category × severity">
                  {allClauses.length === 0 ? <Empty text="The clause heatmap appears once analysis completes." /> : <ClauseHeatmap clauses={allClauses} />}
                </Card>
                <Card className="lg:col-span-5" title="Value & exposure by year" icon={<TrendingUp size={15} />} sub={tcv > 0 ? fmtMoney(tcv) : undefined}>
                  {valueByYear.length === 0 ? <Empty text="No dated contract value yet." /> : (
                    <>
                      <ValueByYearBars rows={valueByYear} />
                      <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--brand-primary-600)]" />Total value</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--danger)]" />At risk</span>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </MotionReveal>

            {/* Documents by type + risk by type */}
            {docsByType.length > 0 && (
              <MotionReveal delay={0.05}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card title="Documents by type" icon={<Layers size={15} />} sub="click a bar to filter contracts">
                    <HBarChart data={docsByType} valueFormatter={(n) => n.toLocaleString()} onSelect={focusContractsByType} />
                  </Card>
                  <Card title="Risk by document type" icon={<BarChart3 size={15} />} sub="click a bar to filter contracts">
                    {hasTypeRisk ? <HBarChart data={riskByType} valueFormatter={(n) => n.toLocaleString()} onSelect={focusContractsByType} /> : <Empty text="No high-risk clauses by type yet." />}
                  </Card>
                </div>
              </MotionReveal>
            )}

            {/* Compliance coverage — gauges per enabled framework */}
            {packsMounted && hasComplianceDocs && complianceCoverage.length > 0 && (
              <MotionReveal delay={0.05}>
                <Card
                  title="Compliance coverage"
                  icon={<ShieldCheck size={15} />}
                  sub={complianceGaps > 0 ? `${complianceGaps} clause gap${complianceGaps === 1 ? "" : "s"} across enabled packs` : "all obligations present"}
                >
                  <div className="flex flex-wrap items-start justify-around gap-x-6 gap-y-6 pt-1">
                    {complianceCoverage.map((c) => (
                      <RadialGauge
                        key={c.id}
                        pct={c.pct}
                        label={c.name}
                        sub={c.gaps > 0 ? `${c.covered}/${c.total} · ${c.gaps} gap${c.gaps === 1 ? "" : "s"}` : `${c.covered}/${c.total} met`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--success)]" />Strong ≥80%</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--warning)]" />Partial 50–79%</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--danger)]" />Weak &lt;50%</span>
                    <Link href="/settings/compliance" className="ml-auto inline-flex items-center gap-1 font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">Manage packs<ArrowRight size={12} strokeWidth={2.25} /></Link>
                  </div>
                </Card>
              </MotionReveal>
            )}

            {/* Needs attention + value by project */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:col-span-7">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                    <ShieldAlert size={15} className={attention.length ? "text-[var(--danger)]" : "text-[var(--success)]"} />
                    <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Needs your attention</h3>
                    {attention.length > 0 && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{attention.length}</span>}
                  </div>
                  {attention.length === 0 ? (
                    <div className="flex flex-col items-center px-5 py-10 text-center"><CheckCircle2 size={24} className="mb-2 text-[var(--success)]" /><p className="text-[13px] font-semibold text-foreground">All clear</p><p className="mt-0.5 text-[12px] text-muted-foreground">No contracts are high-risk or need review right now.</p></div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {attention.slice(0, 6).map((a) => (
                        <li key={a.project.id}>
                          <Link href={`/projects/${a.project.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span>
                            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-foreground">{a.project.name}</div><div className="text-[11.5px] text-muted-foreground">{a.highRisk > 0 ? `${a.highRisk} high-risk clause${a.highRisk === 1 ? "" : "s"}` : ""}{a.failed > 0 ? `${a.highRisk > 0 ? " · " : ""}${a.failed} failed` : ""}{a.value > 0 ? ` · ${fmtMoney(a.value, a.currency)}` : ""}</div></div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary-600)]">Review<ArrowRight size={12} strokeWidth={2.25} /></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <Card className="lg:col-span-5" title="Value by project" icon={<DollarSign size={15} />} sub={tcv > 0 ? `${fmtMoney(tcv)} total` : undefined}>
                  {valueRows.length === 0 ? <Empty text="Estimated values appear once SOWs are analyzed." /> : <ValueByProject rows={valueRows} />}
                </Card>
              </div>
            </MotionReveal>

            {/* Scope coverage */}
            {scopeRows.length > 0 && (
              <Card title="Scope coverage" icon={<Boxes size={15} />} sub="scope & deliverable clauses">
                <BarList rows={scopeRows.map((s) => ({ label: s.cat.replace(/([A-Z])/g, " $1").trim(), value: s.n, color: "var(--brand-primary-400)" }))} />
              </Card>
            )}

            <SectionLabel>Contracts</SectionLabel>
            {/* Contracts table — sortable roll-up with dropdown options */}
            <section ref={tableRef} className="scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={15} className="text-[var(--brand-primary-600)]" />
                  <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Contracts <span className="ml-1 font-mono text-[11px] text-muted-foreground">{visibleRows.length}{filtersActive ? `/${projects.length}` : ""}</span></h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {filtersActive && (
                    <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <XCircle size={13} />Clear
                    </button>
                  )}
                  {availableDocTypes.length > 1 && (
                    <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as DocType | "all")}>
                      <SelectTrigger size="sm" className="h-8 w-[140px] text-[12.5px]"><Layers size={13} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {availableDocTypes.map((t) => (
                          <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
                    <SelectTrigger size="sm" className="h-8 w-[130px] text-[12.5px]"><Filter size={13} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All risk</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sort.key} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger size="sm" className="h-8 w-[150px] text-[12.5px]"><span className="text-muted-foreground">Sort:</span><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk level</SelectItem>
                      <SelectItem value="value">Contract value</SelectItem>
                      <SelectItem value="highRisk">High-risk clauses</SelectItem>
                      <SelectItem value="clauseCount">Clause count</SelectItem>
                      <SelectItem value="docCount">Document count</SelectItem>
                      <SelectItem value="name">Project name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link href="/projects" className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">View all<ArrowRight size={12} strokeWidth={2.25} /></Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <SortableTh label="Project" k="name" sort={sort} onSort={toggleSort} />
                      <SortableTh label="Status" k="status" sort={sort} onSort={toggleSort} />
                      <SortableTh label="Docs" k="docCount" sort={sort} onSort={toggleSort} align="right" />
                      <SortableTh label="Clauses" k="clauseCount" sort={sort} onSort={toggleSort} align="right" />
                      <SortableTh label="High-Risk" k="highRisk" sort={sort} onSort={toggleSort} align="right" />
                      <SortableTh label="Value" k="value" sort={sort} onSort={toggleSort} align="right" />
                      <th className="px-5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Δ</th>
                      <th className="px-5 py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Data</th>
                      <SortableTh label="Risk" k="risk" sort={sort} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 && (
                      <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-muted-foreground">No contracts match this filter.</td></tr>
                    )}
                    {visibleRows.map((a) => (
                      <tr key={a.project.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3"><Link href={`/projects/${a.project.id}`} className="font-semibold text-foreground hover:text-[var(--brand-primary-700)]">{a.project.name}</Link>{a.project.client && <div className="truncate text-[11px] text-muted-foreground">{a.project.client}</div>}</td>
                        <td className="px-5 py-3 text-muted-foreground">{a.status}{a.expired ? " · expired" : ""}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.docCount}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.clauseCount.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.highRisk > 0 ? <span className="font-semibold text-[var(--danger)]">{a.highRisk}</span> : "0"}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.value > 0 ? fmtMoney(a.value, a.currency) : "—"}</td>
                        <td className="px-5 py-3 text-right"><ValueDelta delta={a.valueDelta} currency={a.currency} /></td>
                        <td className="px-5 py-3 text-center"><ReconciledBadge reconciled={a.reconciled} hasValue={a.value > 0} /></td>
                        <td className="px-5 py-3">{a.total > 0 ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span> : <span className="text-[11px] text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Operations & finance — pending connected systems */}
            <ConnectDataSources />
          </>
        )}
      </div>
    </>
  );
}

/* ── Focal: value at risk ─────────────────────────────────────── */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 first:pt-0">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

function gaugeTone(pct: number): string {
  if (pct >= 80) return "var(--success)";
  if (pct >= 50) return "var(--warning)";
  return "var(--danger)";
}

function RadialGauge({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.max(0, Math.min(100, pct)) / 100) * circ;
  const tone = gaugeTone(pct);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[70px] w-[70px]">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="text-center">
        <div className="text-[12px] font-semibold text-foreground">{label}</div>
        <div className="text-[10.5px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function FocalValueAtRisk({ valueAtRisk, tcv, varPct, count, criticalClauses, failed }: {
  valueAtRisk: number; tcv: number; varPct: number; count: number; criticalClauses: number; failed: number;
}) {
  const hasRisk = valueAtRisk > 0;
  const anomaly = criticalClauses > 0 || failed > 0;
  return (
    <section className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="eyebrow">Value at risk</div>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${hasRisk ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>
            {hasRisk ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          </span>
        </div>
        <div className="numeric mt-3 leading-none text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.025em", fontSize: 44 }}>
          {hasRisk ? fmtMoney(valueAtRisk) : tcv > 0 ? fmtMoney(0) : "—"}
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {hasRisk
            ? <><span className="font-semibold text-foreground">{varPct}%</span> of {fmtMoney(tcv)} portfolio · {count} contract{count === 1 ? "" : "s"} high/critical</>
            : tcv > 0 ? "No high-risk contracts in the portfolio." : "Value appears once SOWs are analyzed."}
        </p>
      </div>

      {/* Proportion: at-risk vs total portfolio value */}
      {tcv > 0 && (
        <div className="mt-5" aria-hidden>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--success-soft)]">
            <div className="h-full rounded-full bg-[var(--danger)]" style={{ width: `${Math.max(hasRisk ? 3 : 0, varPct)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-muted-foreground">
            <span>At risk {fmtMoney(valueAtRisk)}</span>
            <span>Total {fmtMoney(tcv)}</span>
          </div>
        </div>
      )}

      {anomaly && (
        <Link href="/projects?risk=attention" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-[12px] font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10">
          <ShieldAlert size={14} className="shrink-0" />
          {criticalClauses > 0 ? `${criticalClauses} critical clause${criticalClauses === 1 ? "" : "s"}` : ""}
          {criticalClauses > 0 && failed > 0 ? " · " : ""}
          {failed > 0 ? `${failed} failed analysis` : ""}
          <ArrowRight size={12} strokeWidth={2.25} className="ml-auto" />
        </Link>
      )}
    </section>
  );
}

/* ── KPI: value coverage with progress toward 100% ────────────── */
function CoverageCard({ pct, valued, total }: { pct: number; valued: number; total: number }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow truncate">Value coverage</div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground"><Check size={14} /></span>
      </div>
      <div className="numeric mt-3 leading-none text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.025em", fontSize: 36 }}>
        {total > 0 ? `${pct}%` : "—"}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct}% of analyzed contracts have an extracted value`}>
        <div className="h-full rounded-lg bg-[var(--brand-primary-600)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{total > 0 ? `${valued} of ${total} contracts valued` : "awaiting analysis"}</div>
    </div>
  );
}

function ValueDelta({ delta, currency }: { delta: number; currency: string | null }) {
  if (!delta) return <span className="text-[11px] text-muted-foreground">—</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
      {up ? <ArrowUp size={11} strokeWidth={2.25} /> : <ArrowDown size={11} strokeWidth={2.25} />}
      {fmtMoney(Math.abs(delta), currency)}
    </span>
  );
}

function ReconciledBadge({ reconciled, hasValue }: { reconciled: boolean | null; hasValue: boolean }) {
  if (!hasValue) return <span className="text-[11px] text-muted-foreground">—</span>;
  if (reconciled === true) return <span title="Figures reconcile to the stated total" className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]"><CheckCircle2 size={12} />Reconciled</span>;
  if (reconciled === false) return <span title="Figures don't reconcile — review" className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--warning)]"><AlertTriangle size={12} />Check</span>;
  return <span title="Single estimated figure" className="text-[11px] text-muted-foreground">Estimated</span>;
}

function SortableTh({ label, k, sort, onSort, align = "left" }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; align?: "left" | "right" }) {
  const active = sort.key === k;
  return (
    <th aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button" onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] rounded ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
      </button>
    </th>
  );
}

/* ── Existing helpers (kept) ──────────────────────────────────── */
function Card({ title, icon, sub, children, className }: { title: string; icon: ReactNode; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="text-[var(--brand-primary-600)]">{icon}</span><h3 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h3></div>
        {sub && <span className="font-mono text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; sub?: string; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-[12px]"><span className="font-medium text-foreground">{r.label}</span><span className="tabular-nums text-muted-foreground">{r.sub ?? r.value.toLocaleString()}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--brand-primary-600)" }} /></div>
        </div>
      ))}
    </div>
  );
}

function ValueByYearBars({ rows }: { rows: [string, { value: number; atRisk: number }][] }) {
  const max = Math.max(1, ...rows.map(([, v]) => v.value));
  return (
    <div className="space-y-3">
      {rows.map(([year, v]) => (
        <div key={year}>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="font-medium text-foreground">{year}</span>
            <span className="tabular-nums text-muted-foreground">{fmtMoney(v.value)}{v.atRisk > 0 ? <span className="ml-1.5 text-[var(--danger)]">· {fmtMoney(v.atRisk)} at risk</span> : null}</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 rounded-lg bg-[var(--brand-primary-600)]" style={{ width: `${(v.value / max) * 100}%` }} />
            {v.atRisk > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--danger)]" style={{ width: `${(v.atRisk / max) * 100}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueByProject({ rows }: { rows: Agg[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <Link key={r.project.id} href={`/projects/${r.project.id}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="block" style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}>
          <div className="mb-1 flex items-center justify-between text-[12px]"><span className="truncate font-medium text-foreground">{r.project.name}</span><span className="shrink-0 font-semibold tabular-nums text-foreground">{fmtMoney(r.value, r.currency)}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.overallRisk === "critical" || r.overallRisk === "high" ? "var(--danger)" : "var(--brand-primary-600)" }} /></div>
        </Link>
      ))}
    </div>
  );
}

function ConnectDataSources() {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-5 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Database size={18} strokeWidth={1.75} /></span>
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Operations &amp; finance</h2>
            <p className="mt-0.5 max-w-xl text-[12.5px] text-muted-foreground">Connect your ERP, HRIS, or PM systems to add margin, P&amp;L, invoicing, milestones, and utilisation alongside contract risk.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
          <Link href="/settings"><Database size={13} />Connect data source</Link>
        </Button>
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[12.5px] text-muted-foreground">{text}</p>;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[228px] rounded-2xl lg:col-span-5" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}</div>
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12"><Skeleton className="h-72 rounded-2xl lg:col-span-7" /><Skeleton className="h-72 rounded-2xl lg:col-span-5" /></div>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-[var(--danger)]/30 bg-[var(--danger-soft)]/50 py-20 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"><XCircle size={26} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">Couldn&apos;t load your portfolio</h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">The document service didn&apos;t respond. Your data is safe — try again in a moment.</p>
      <Button variant="outline" size="md" className="mt-6 gap-1.5" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><Layers size={28} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">No contracts yet</h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">Create a project and upload its SOW. Sonar scores risk, estimates value, and rolls it up across your whole portfolio here.</p>
      <Button variant="primary" size="lg" className="mt-6" asChild><Link href="/projects/new"><Plus size={15} />New project</Link></Button>
    </div>
  );
}
