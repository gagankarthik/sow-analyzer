"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { MiniRiskDonut } from "@/components/charts/MiniRiskDonut";
import {
  Plus, Search, ArrowRight, ArrowUp, ArrowDown, Layers, LayoutGrid, Menu, Loader2,
  ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, XCircle, RefreshCw, CalendarClock,
  FileSignature, Eye, GitCompare, Edit3, Repeat, Check, Users,
} from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { useDocuments, useClassifications, isProcessing } from "@/lib/queries/documents";
import { useNow } from "@/lib/use-now";
import { DOC_TYPE_META, docTypeShort } from "@/lib/doc-types";
import { computeContractValue, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { useProjects, useProjectsSync, refreshProjects, withUngroupedDocs, projectOwnerEmail, type LocalProject } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import type { ApiClassification, ApiDocument, Lifecycle, RiskLevel } from "@/lib/types";
// (ApiClassification is the type of the shared classification cache entries.)

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success-fg)]",
};
const RISK_HEX: Record<RiskLevel, string> = { critical: "var(--danger)", high: "var(--warning)", medium: "var(--ink-400)", low: "var(--success)" };
const DAY = 86_400_000;

// Lifecycle → icon + label so status reads from shape + text, never color alone.
const STATUS_META: Record<string, { label: string; Icon: typeof Check }> = {
  draft: { label: "Draft", Icon: Edit3 },
  review: { label: "Review", Icon: Eye },
  negotiation: { label: "Negotiation", Icon: GitCompare },
  approval: { label: "Approval", Icon: Check },
  signed: { label: "Signed", Icon: FileSignature },
  active: { label: "Active", Icon: CheckCircle2 },
  renewal: { label: "Renewal", Icon: Repeat },
  expired: { label: "Expired", Icon: XCircle },
};

type Agg = {
  project: LocalProject;
  docCount: number;
  /** Clauses across the analysed documents; null when none has a clause count yet. */
  clauseCount: number | null;
  rc: { low: number; medium: number; high: number; critical: number };
  /** Rated clauses (sum of rc). 0 = no risk data, which is not the same as "low". */
  total: number;
  highRisk: number;
  /** Worst clause risk level found; null when no document has risk counts. */
  overallRisk: RiskLevel | null;
  processing: number;
  failed: number;
  value: number;
  valueDelta: number;
  reconciled: boolean | null;
  currency: string | null;
  lifecycle: Lifecycle | "—";
  expired: boolean;
  /** Days until the nearest upcoming renewal or term-end date the pipeline
   *  extracted; null when no such date exists. (Effective dates are not used:
   *  a contract's start is not a renewal.) */
  daysToDate: number | null;
  /** Which kind of date `daysToDate` counts down to. */
  dateKind: "renewal" | "term-end" | null;
  attention: string | null;
};

function aggregate(project: LocalProject, byId: Map<string, ApiDocument>, classByDoc: Map<string, ApiClassification>, now: number): Agg {
  const rc = { low: 0, medium: 0, high: 0, critical: 0 };
  let clauseCount: number | null = null, processing = 0, failed = 0, expired = false;
  let nearest: number | null = null;
  let dateKind: Agg["dateKind"] = null;
  const pdocs: ApiDocument[] = [];
  for (const id of project.docIds) {
    const d = byId.get(id);
    if (!d) continue;
    pdocs.push(d);
    if (typeof d.clauseCount === "number") clauseCount = (clauseCount ?? 0) + d.clauseCount;
    if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
    if (isProcessing(d.status)) processing++;
    if (d.status === "FAILED") failed++;
    if (d.lifecycle === "expired") expired = true;
    for (const [iso, kind] of [[d.renewalDate, "renewal"], [d.termEndDate, "term-end"]] as const) {
      const t = iso ? new Date(iso).getTime() : NaN;
      if (Number.isFinite(t) && t >= now && (nearest === null || t < nearest)) { nearest = t; dateKind = kind; }
    }
  }
  const valued: ValuedDoc[] = pdocs.filter((d) => d.status === "READY").map((d) => ({ docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt, classification: classByDoc.get(d.docId), persisted: persistedOf(d) }));
  const cv = computeContractValue(valued);
  const valueDelta = cv.segments.filter((s) => s.isAmendment).reduce((s, x) => s + x.value, 0);
  const total = rc.low + rc.medium + rc.high + rc.critical;
  const highRisk = rc.high + rc.critical;
  // Worst clause level present. With no rated clauses there is no level at all.
  const overallRisk: RiskLevel | null = total === 0 ? null : rc.critical > 0 ? "critical" : rc.high > 0 ? "high" : rc.medium > 0 ? "medium" : "low";
  const root = pdocs.find((d) => d.docType !== "AMENDMENT") ?? pdocs[0];
  const lifecycle = (root?.lifecycle ?? "—") as Lifecycle | "—";
  const daysToDate = nearest !== null ? Math.round((nearest - now) / DAY) : null;

  let attention: string | null = null;
  if (failed > 0) attention = `${failed} failed`;
  else if (rc.critical > 0) attention = "Critical risk";
  else if (rc.high > 0) attention = "High risk";
  else if (expired) attention = "Expired";
  else if (daysToDate !== null && daysToDate <= 90) attention = `${dateKind === "renewal" ? "Renews" : "Term ends"} in ${daysToDate}d`;

  // docCount counts the documents that actually exist, so it agrees with the library.
  return { project, docCount: pdocs.length, clauseCount, rc, total, highRisk, overallRisk, processing, failed, value: cv.total, valueDelta, reconciled: cv.reconciled, currency: cv.currency, lifecycle, expired, daysToDate, dateKind, attention };
}

type RiskFilter = "all" | "attention" | RiskLevel;
type StatusFilter = "any" | "active" | "expiring" | "expired";
type ViewMode = "table" | "grid";
type SortKey = "name" | "status" | "risk" | "highRisk" | "docCount" | "clauseCount" | "value" | "date";
type SortDir = "asc" | "desc";

export default function ProjectsPage() {
  const { data, isLoading: docsLoading, isError: docsError, isFetching, dataUpdatedAt, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const rawProjects = useProjects();
  // The projects list has its own load state: until it has been read from the
  // server the page is loading, and if that read fails it is an error — never
  // an empty "No projects yet".
  const projectsSync = useProjectsSync();
  const isLoading = docsLoading || projectsSync.status === "idle" || projectsSync.status === "loading";
  const isError = (docsError && !data) || projectsSync.status === "error";
  const refreshAll = () => { void refetch(); void refreshProjects(); };
  // The server returns only the projects and documents this user may see (their
  // own, and the ones shared with them), so nothing is filtered for access here.
  // Show every visible document too — real projects plus a synthetic entry for
  // any ungrouped document — so the page reflects the portfolio instead of
  // sitting empty. (Synthetic entries aren't persisted.)
  const projects = useMemo(() => withUngroupedDocs(rawProjects, docs), [rawProjects, docs]);
  // False on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const now = useNow(); // real current time, re-read every minute
  const [q, setQ] = useState("");
  // ?risk=attention (etc.) preselects the filter. The filter bar only renders
  // after mount, so reading the URL here cannot cause a hydration mismatch.
  const [risk, setRisk] = useState<RiskFilter>(() => {
    if (typeof window === "undefined") return "all";
    const p = new URLSearchParams(window.location.search).get("risk");
    return p === "attention" || p === "critical" || p === "high" ? p : "all";
  });
  const [status, setStatus] = useState<StatusFilter>("any");
  const [docType, setDocType] = useState<string>("All");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "risk", dir: "asc" });

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);

  // Reuse the cached classification queries (same keys as Dashboard) to value contracts.
  const inProjects = useMemo(() => {
    const ids = new Set(projects.flatMap((p) => p.docIds));
    return docs.filter((d) => ids.has(d.docId));
  }, [projects, docs]);
  const { byDoc: classByDoc } = useClassifications(inProjects);

  const aggregates = useMemo(() => projects.map((p) => aggregate(p, byId, classByDoc, now)), [projects, byId, classByDoc, now]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return aggregates.filter((a) => {
      if (risk === "attention" && a.highRisk === 0 && a.failed === 0) return false;
      if (risk !== "all" && risk !== "attention" && a.overallRisk !== risk) return false;
      if (status === "active" && !(a.lifecycle === "active" || a.lifecycle === "signed")) return false;
      if (status === "expiring" && !(a.daysToDate !== null && a.daysToDate <= 90 && !a.expired)) return false;
      if (status === "expired" && !a.expired) return false;
      if (docType !== "All" && !a.project.docIds.some((id) => byId.get(id)?.docType === docType)) return false;
      if (term && !`${a.project.name} ${a.project.client ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [aggregates, q, risk, status, docType, byId]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    const dateVal = (a: Agg) => (a.expired ? -1 : a.daysToDate ?? Number.MAX_SAFE_INTEGER);
    rows.sort((a, b) => {
      switch (sort.key) {
        case "name": return a.project.name.localeCompare(b.project.name) * dir;
        case "status": return String(a.lifecycle).localeCompare(String(b.lifecycle)) * dir;
        // Projects with no risk data sort after every rated one.
        case "risk": return ((a.overallRisk ? RISK_RANK[a.overallRisk] : 4) - (b.overallRisk ? RISK_RANK[b.overallRisk] : 4)) * dir || b.value - a.value;
        case "highRisk": return (a.highRisk - b.highRisk) * dir;
        case "docCount": return (a.docCount - b.docCount) * dir;
        case "clauseCount": return ((a.clauseCount ?? -1) - (b.clauseCount ?? -1)) * dir;
        case "value": return (a.value - b.value) * dir;
        case "date": return (dateVal(a) - dateVal(b)) * dir;
        default: return 0;
      }
    });
    return rows;
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

  const totalDocs = aggregates.reduce((s, a) => s + a.docCount, 0);
  const resetFilters = () => { setQ(""); setRisk("all"); setStatus("any"); setDocType("All"); };
  const activeFilters = (q.trim() ? 1 : 0) + (risk !== "all" ? 1 : 0) + (status !== "any" ? 1 : 0) + (docType !== "All" ? 1 : 0);

  const attentionCount = aggregates.filter((a) => a.highRisk > 0 || a.failed > 0).length;
  const highRiskClauses = aggregates.reduce((s, a) => s + a.highRisk, 0);
  const hasProjects = mounted && projects.length > 0 && !isError;

  return (
    <>
      <PageHeader
        title="Projects"
        actions={
          <>
            <LastUpdated
              updatedAt={Math.min(dataUpdatedAt || 0, projectsSync.updatedAt || 0) || undefined}
              isFetching={isFetching || projectsSync.refreshing || projectsSync.status === "loading"}
              onRefresh={refreshAll}
              failed={docsError || !!projectsSync.error}
            />
            <Button asChild className="h-10 md:h-9">
              <Link href="/projects/new"><Plus size={15} strokeWidth={2.25} />New project</Link>
            </Button>
          </>
        }
      />

      <div className="app-container app-page">
        {/* Focal block: the one thing to act on. Hidden when nothing needs attention. */}
        {hasProjects && !isLoading && (attentionCount > 0 || risk === "attention") && (
          <section aria-label="Needs attention" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl bg-[var(--navy)] p-4 text-white md:px-5">
            <div className="flex min-w-0 items-center gap-4">
              <p className="text-4xl font-bold leading-none tabular-nums">{attentionCount}</p>
              <div className="min-w-0">
                <p className="text-base font-semibold">Project{attentionCount === 1 ? "" : "s"} need{attentionCount === 1 ? "s" : ""} attention</p>
                <p className="text-sm leading-snug text-[var(--navy-foreground)]">
                  {highRiskClauses.toLocaleString()} high or critical risk clause{highRiskClauses === 1 ? "" : "s"}, or a failed document.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRisk(risk === "attention" ? "all" : "attention")}
              aria-pressed={risk === "attention"}
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/30 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto md:h-9"
            >
              {risk === "attention" ? "Show all projects" : <>Review them <ArrowRight size={14} /></>}
            </button>
          </section>
        )}

        {hasProjects && (
          <section aria-label="Filters" className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-start">
              <div className="relative w-full md:w-[260px] md:shrink-0">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" aria-label="Search projects"
                  className="h-10 w-full rounded-lg border border-[var(--ink-300)] bg-card pl-9 pr-3 text-base text-foreground outline-none transition-shadow placeholder:text-[var(--ink-400)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)]" />
              </div>
              <div className={FILTER_ROW}>
                <Select value={risk} onValueChange={(v) => setRisk(v as RiskFilter)}>
                  <SelectTrigger aria-label="Filter by risk" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Risk</span><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="attention">Needs attention</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger aria-label="Filter by status" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Status</span><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    <SelectItem value="active">Active / Signed</SelectItem>
                    <SelectItem value="expiring">Renewal or term end · 90d</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger aria-label="Filter by document type" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Type</span><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {DOC_TYPE_KEYS.map((t) => <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sort.key} onValueChange={(v) => setSort({ key: v as SortKey, dir: SORT_OPTIONS.find((o) => o.key === v)?.dir ?? "desc" })}>
                  <SelectTrigger aria-label="Sort projects" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Sort</span><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div role="group" aria-label="View" className="inline-flex shrink-0 items-center rounded-lg border border-[var(--ink-300)] bg-card p-0.5 md:ml-auto">
                  {([{ m: "table", icon: <Menu size={16} /> }, { m: "grid", icon: <LayoutGrid size={16} /> }] as { m: ViewMode; icon: React.ReactNode }[]).map((vm) => (
                    <button key={vm.m} type="button" onClick={() => setView(vm.m)} data-active={view === vm.m} aria-pressed={view === vm.m} aria-label={`${vm.m} view`}
                      className="inline-flex h-[34px] w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] data-[active=true]:bg-[var(--brand-primary-600)] data-[active=true]:text-white">
                      {vm.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 text-sm md:min-h-0">
              <span className="tabular-nums text-[var(--ink-600)]" aria-live="polite">
                {isLoading ? "Loading…" : `Showing ${filtered.length} of ${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalDocs} document${totalDocs === 1 ? "" : "s"}`}
              </span>
              {activeFilters > 0 && (
                <>
                  <span className="rounded-full bg-structure-soft px-2 py-0.5 text-xs font-semibold text-structure-soft-fg">
                    {activeFilters} filter{activeFilters === 1 ? "" : "s"} active
                  </span>
                  <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center rounded font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:min-h-0">
                    Clear filters
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {!mounted || isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={refreshAll} />
        ) : projects.length === 0 ? (
          <EmptyState pristine />
        ) : filtered.length === 0 ? (
          <EmptyState pristine={false} reset={resetFilters} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((a, i) => (
              <MotionReveal key={a.project.id} delay={Math.min(i * 0.04, 0.2)} className="min-w-0"><ProjectGridCard a={a} /></MotionReveal>
            ))}
          </div>
        ) : (
          <ProjectTable rows={sorted} sort={sort} onSort={toggleSort} />
        )}
      </div>
    </>
  );
}

// Filter bar: full-width search, then a chip row that scrolls sideways on a phone and wraps from md.
const FILTER_ROW = "-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-1 md:flex-wrap md:overflow-visible md:px-0";
const FILTER_TRIGGER = "w-auto shrink-0 gap-2 border-[var(--ink-300)] bg-card text-sm data-[size=default]:h-10";
const FILTER_PREFIX = "shrink-0 text-xs font-medium text-muted-foreground";
const DOC_TYPE_KEYS = Object.keys(DOC_TYPE_META) as (keyof typeof DOC_TYPE_META)[];
const SORT_OPTIONS: { key: SortKey; label: string; dir: SortDir }[] = [
  { key: "risk", label: "Highest risk", dir: "asc" },
  { key: "name", label: "Name", dir: "asc" },
  { key: "value", label: "Value", dir: "desc" },
  { key: "date", label: "Renewal or term end", dir: "asc" },
  { key: "docCount", label: "Documents", dir: "desc" },
  { key: "highRisk", label: "High-risk clauses", dir: "desc" },
  { key: "status", label: "Status", dir: "asc" },
  { key: "clauseCount", label: "Clauses", dir: "desc" },
];

/* ── Table ────────────────────────────────────────────────────── */
// Columns drop out as the viewport narrows; below md the status and attention
// tags fold under the project name so nothing important is lost on a phone.
const TH = "px-3 py-3 text-xs font-semibold text-[var(--ink-600)] whitespace-nowrap md:px-4";
const TD = "px-3 py-3 align-middle md:px-4";

function ProjectTable({ rows, sort, onSort }: { rows: Agg[]; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-[var(--panel)] text-left">
            <Th label="Project" k="name" sort={sort} onSort={onSort} />
            <Th label="Status" k="status" sort={sort} onSort={onSort} className="hidden md:table-cell" />
            <Th label="Risk" k="risk" sort={sort} onSort={onSort} />
            <Th label="High-risk" k="highRisk" sort={sort} onSort={onSort} align="right" className="hidden lg:table-cell" />
            <Th label="Docs" k="docCount" sort={sort} onSort={onSort} align="right" className="hidden lg:table-cell" />
            <Th label="Value" k="value" sort={sort} onSort={onSort} align="right" />
            <th className={`${TH} hidden text-right xl:table-cell`}>Change</th>
            <th className={`${TH} hidden xl:table-cell`}>Data</th>
            <Th label="Renewal / term end" k="date" sort={sort} onSort={onSort} className="hidden md:table-cell" />
            <th className={`${TH} hidden md:table-cell`}>Attention</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.project.id} className="border-b border-border transition-colors last:border-0 hover:bg-[var(--panel)]">
              <td className={`${TD} max-w-[46vw] md:max-w-[280px]`}>
                <Link href={`/projects/${a.project.id}`} className="block break-words text-base font-semibold text-foreground hover:text-[var(--brand-primary-700)] focus-visible:underline focus-visible:outline-none">{a.project.name}</Link>
                {a.project.client && <div className="truncate text-xs text-muted-foreground">{a.project.client}</div>}
                <SharedNote project={a.project} />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                  <StatusPill lifecycle={a.lifecycle} hideEmpty />
                  {a.attention && <AttentionTag reason={a.attention} risk={a.overallRisk} expired={a.expired} failed={a.failed > 0} />}
                </div>
              </td>
              <td className={`${TD} hidden md:table-cell`}><StatusPill lifecycle={a.lifecycle} /></td>
              <td className={TD}>
                {a.overallRisk ? (
                  <div className="flex items-center gap-2">
                    <RiskPill level={a.overallRisk} />
                    <SeverityBar rc={a.rc} total={a.total} />
                  </div>
                ) : a.processing > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warning)]"><Loader2 size={12} className="animate-spin" />Analyzing</span>
                ) : <Dash />}
              </td>
              <td className={`${TD} hidden text-right tabular-nums lg:table-cell`}>{a.total === 0 ? <Dash /> : a.highRisk > 0 ? <span className="font-semibold text-[var(--danger)]">{a.highRisk}</span> : <span className="text-[var(--ink-600)]">0</span>}</td>
              <td className={`${TD} hidden text-right tabular-nums text-[var(--ink-600)] lg:table-cell`}>{a.docCount}</td>
              <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-foreground`}>{a.value > 0 ? fmtMoney(a.value, a.currency) : <Dash />}</td>
              <td className={`${TD} hidden whitespace-nowrap text-right xl:table-cell`}><ValueDelta delta={a.valueDelta} currency={a.currency} /></td>
              <td className={`${TD} hidden whitespace-nowrap xl:table-cell`}><ReconciledBadge reconciled={a.reconciled} hasValue={a.value > 0} /></td>
              <td className={`${TD} hidden whitespace-nowrap md:table-cell`}><RenewalCell expired={a.expired} days={a.daysToDate} kind={a.dateKind} /></td>
              <td className={`${TD} hidden md:table-cell`}><AttentionTag reason={a.attention} risk={a.overallRisk} expired={a.expired} failed={a.failed > 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, k, sort, onSort, align = "left", className = "" }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; align?: "left" | "right"; className?: string }) {
  const active = sort.key === k;
  return (
    <th aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`${TH} ${align === "right" ? "text-right" : ""} ${className}`}>
      <button type="button" onClick={() => onSort(k)}
        className={`-my-2 inline-flex min-h-10 items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}>
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronDown size={13} className="opacity-40" />}
      </button>
    </th>
  );
}

function Dash() {
  return <span className="text-sm text-muted-foreground">—</span>;
}

/** Worst clause risk level in the project (not a blended score). */
function RiskPill({ level }: { level: RiskLevel }) {
  return <span title="Highest clause risk level found in this project" className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${RISK_PILL[level]}`}>{level}</span>;
}

function StatusPill({ lifecycle, hideEmpty = false }: { lifecycle: Lifecycle | "—"; hideEmpty?: boolean }) {
  if (lifecycle === "—") return hideEmpty ? null : <Dash />;
  const meta = STATUS_META[lifecycle] ?? { label: lifecycle, Icon: Check };
  const Icon = meta.Icon;
  const danger = lifecycle === "expired";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${danger ? "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]" : "border-border bg-[var(--panel)] text-[var(--ink-700)]"}`}>
      <Icon size={12} />{meta.label}
    </span>
  );
}

function SeverityBar({ rc, total }: { rc: Agg["rc"]; total: number }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: rc.critical }, { k: "high", n: rc.high }, { k: "medium", n: rc.medium }, { k: "low", n: rc.low },
  ];
  return (
    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted lg:flex" title={`critical ${rc.critical} · high ${rc.high} · medium ${rc.medium} · low ${rc.low}`}>
      {segs.map(({ k, n }) => (n > 0 ? <span key={k} style={{ width: `${(n / total) * 100}%`, background: RISK_HEX[k] }} /> : null))}
    </span>
  );
}

function ValueDelta({ delta, currency }: { delta: number; currency: string | null }) {
  if (!delta) return <Dash />;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium tabular-nums ${up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
      {up ? <ArrowUp size={12} strokeWidth={2.25} /> : <ArrowDown size={12} strokeWidth={2.25} />}
      <span className="sr-only">{up ? "Up" : "Down"}</span>
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

function RenewalCell({ expired, days, kind }: { expired: boolean; days: number | null; kind: Agg["dateKind"] }) {
  if (expired) return <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]"><CalendarClock size={13} />Expired</span>;
  if (days === null) return <Dash />;
  const soon = days <= 90;
  const when = days === 0 ? "today" : `in ${days}d`;
  return <span className={`inline-flex items-center gap-1 text-xs ${soon ? "font-medium text-[var(--warning)]" : "text-muted-foreground"}`}><CalendarClock size={13} />{kind === "renewal" ? "Renews" : "Term ends"} {when}</span>;
}

function AttentionTag({ reason, risk, expired, failed }: { reason: string | null; risk: RiskLevel | null; expired: boolean; failed: boolean }) {
  if (!reason) return <Dash />;
  const danger = failed || expired || risk === "critical" || risk === "high";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${danger ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning-fg)]"}`}>
      <AlertTriangle size={12} />{reason}
    </span>
  );
}

/* ── Grid card (toggle) ───────────────────────────────────────── */
function ProjectGridCard({ a }: { a: Agg }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: a.rc.critical }, { k: "high", n: a.rc.high }, { k: "medium", n: a.rc.medium }, { k: "low", n: a.rc.low },
  ];
  return (
    <Link href={`/projects/${a.project.id}`} className="group flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-[box-shadow,border-color] duration-150 hover:border-[var(--brand-primary-300)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 break-words text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">{a.project.name}</h3>
          {a.project.client && <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.project.client}</p>}
          <SharedNote project={a.project} />
        </div>
        {a.overallRisk ? (
          <RiskPill level={a.overallRisk} />
        ) : a.processing > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--warning-fg)]"><Loader2 size={12} className="animate-spin" />Analyzing</span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <MiniRiskDonut counts={a.rc} />
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          <Stat value={a.docCount} label="Docs" />
          <Stat value={a.clauseCount} label="Clauses" />
          <Stat value={a.total > 0 ? a.highRisk : null} label="High-risk" tone={a.highRisk > 0 ? "danger" : undefined} />
        </div>
      </div>

      {a.total > 0 && (
        <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-muted" title={`critical ${a.rc.critical} · high ${a.rc.high} · medium ${a.rc.medium} · low ${a.rc.low}`}>
          {segs.map(({ k, n }) => (n > 0 ? <div key={k} style={{ width: `${(n / a.total) * 100}%`, background: RISK_HEX[k] }} /> : null))}
        </div>
      )}

      {/* Footer: value, status, data trust, renewal */}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
          {a.value > 0 && <span className="text-base font-semibold tabular-nums text-foreground">{fmtMoney(a.value, a.currency)}</span>}
          <StatusPill lifecycle={a.lifecycle} />
          {a.value > 0 && <ReconciledBadge reconciled={a.reconciled} hasValue />}
          {(a.expired || a.daysToDate !== null) && <RenewalCell expired={a.expired} days={a.daysToDate} kind={a.dateKind} />}
        </div>
      </div>
    </Link>
  );
}

/** For a project someone else owns: who owns it, and this user's role on it.
 *  Nothing is shown for the user's own projects or for ungrouped documents. */
function SharedNote({ project }: { project: LocalProject }) {
  if (!project.role || project.role === "owner") return null;
  const owner = projectOwnerEmail(project);
  return (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-600)]">
      <Users size={12} className="shrink-0" />
      <span className="min-w-0 truncate" title={owner ? `Owned by ${owner}` : undefined}>
        Shared with you{owner ? ` by ${owner}` : ""}
      </span>
      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-semibold text-[var(--ink-700)]">{ROLE_META[project.role].label}</span>
    </p>
  );
}

/** `null` = not known yet (nothing analysed), shown as a dash rather than 0. */
function Stat({ value, label, tone }: { value: number | null; label: string; tone?: "danger" }) {
  return (
    <div className="min-w-0">
      <div className={`text-xl font-semibold leading-none tabular-nums ${value === null ? "text-muted-foreground" : tone === "danger" ? "text-[var(--danger)]" : "text-foreground"}`}>{value === null ? "—" : value.toLocaleString()}</div>
      <div className="mt-1 text-xs leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-12 text-center md:py-16">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={24} strokeWidth={1.75} /></span>
      <h3 className="text-xl font-semibold text-foreground">Couldn&apos;t load your projects</h3>
      <p className="mt-2 max-w-md text-base text-[var(--ink-600)]">The request for your projects or documents failed. Try again in a moment.</p>
      <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}

function EmptyState({ pristine, reset }: { pristine: boolean; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center md:py-20">
      <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-structure-soft text-structure-soft-fg"><Layers size={24} strokeWidth={1.75} /></span>
      <h3 className="text-xl font-semibold text-foreground">{pristine ? "No projects yet" : "No projects match"}</h3>
      <p className="mt-2 max-w-sm text-base text-[var(--ink-600)]">
        {pristine ? "Create a project, then upload its SOW. Sonar extracts clauses, scores risk, and rolls it up here. Projects other people share with you appear here too." : "Try a different filter or clear your search."}
      </p>
      {pristine ? (
        <Button variant="outline" size="lg" className="mt-6" asChild><Link href="/projects/new"><Plus size={15} />Create your first project</Link></Button>
      ) : (
        <Button variant="outline" size="lg" className="mt-6" onClick={reset}>Clear filters</Button>
      )}
      {pristine && <Link href="/projects/upload" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">or upload a document without a project <ArrowRight size={13} /></Link>}
    </div>
  );
}
