"use client";

// Projects (Engagements in Workforce): every project the user can see, as a
// flat table by default or as cards (?layout=grid). The list-page pattern
// (UI_SPEC sections 3, 7, 9): title + count, views as tabs (URL ?view=), the
// shared toolbar, an "N in view" footer.

import { byEdition, noun } from "@/lib/edition-runtime";
import { useEditionTerms } from "@/lib/govern/queries";
import { Suspense, useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ProjectsBodySkeleton, ProjectsSkeleton } from "./_components/ProjectsSkeleton";
import { MiniRiskDonut } from "@/components/charts/MiniRiskDonut";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { Toolbar } from "@/components/ds/Toolbar";
import { ViewTabs, type ListView } from "@/components/ds/ViewTabs";
import {
  InViewFooter, MoreFilters, QuickFilters, SheetFilters, activeFilterCount, type IndexFilter,
} from "@/components/govern/IndexFilters";
import {
  Plus, ArrowRight, ArrowUp, ArrowDown, Layers, LayoutGrid, Menu, Loader2,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, CalendarClock,
  FileSignature, Eye, GitCompare, Edit3, Repeat, Check, Users,
} from "@/components/ui/icons";
import { useDocuments, useClassifications, isProcessing } from "@/lib/queries/documents";
import { useNow } from "@/lib/use-now";
import { DOC_TYPE_META, docTypeShort } from "@/lib/doc-types";
import { computeContractValue, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { useProjects, useProjectsSync, refreshProjects, withUngroupedDocs, projectOwnerEmail, type LocalProject } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import { displayTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiClassification, ApiDocument, Lifecycle, RiskLevel } from "@/lib/types";
import { StatusPill as DsStatusPill } from "@/components/ds/StatusPill";
import { RecordDrawer } from "@/components/ds/RecordDrawer";
import { KeyValueList } from "@/components/ds/KeyValueList";
// (ApiClassification is the type of the shared classification cache entries.)

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
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
  /** Clauses across the analyzed documents; null when none has a clause count yet. */
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

type ViewId = "all" | "attention" | "active" | "expiring" | "expired";
const VIEWS: { id: ViewId; label: string; test: (a: Agg) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "attention", label: "Needs attention", test: (a) => a.highRisk > 0 || a.failed > 0 },
  { id: "active", label: "Active or signed", test: (a) => a.lifecycle === "active" || a.lifecycle === "signed" },
  { id: "expiring", label: "Renews or ends in 90 days", test: (a) => a.daysToDate !== null && a.daysToDate <= 90 && !a.expired },
  { id: "expired", label: "Expired", test: (a) => a.expired },
];
type Layout = "table" | "grid";
const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <Projects />
    </Suspense>
  );
}

function Projects() {
  const terms = useEditionTerms();
  const params = useSearchParams();
  const pathname = usePathname();
  const { data, isLoading: docsLoading, isError: docsError, refetch } = useDocuments();
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

  // The open view and layout live in the URL. ?risk=attention (older links)
  // opens the "Needs attention" view.
  const viewParam = params.get("view") ?? (params.get("risk") === "attention" ? "attention" : null);
  const view = VIEWS.find((v) => v.id === viewParam) ?? VIEWS[0];
  const layout: Layout = params.get("layout") === "grid" ? "grid" : "table";
  const hrefWith = (next: { view?: ViewId; layout?: Layout }) => {
    const sp = new URLSearchParams();
    const v = next.view ?? view.id;
    const l = next.layout ?? layout;
    if (v !== "all") sp.set("view", v);
    if (l === "grid") sp.set("layout", "grid");
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [risk, setRisk] = useState<string[]>(() => {
    const p = params.get("risk");
    return p === "critical" || p === "high" ? [p] : [];
  });
  const [docType, setDocType] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | undefined>(undefined);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);

  // Reuse the cached classification queries (same keys as Dashboard) to value contracts.
  const inProjects = useMemo(() => {
    const ids = new Set(projects.flatMap((p) => p.docIds));
    return docs.filter((d) => ids.has(d.docId));
  }, [projects, docs]);
  const { byDoc: classByDoc } = useClassifications(inProjects);

  const aggregates = useMemo(() => projects.map((p) => aggregate(p, byId, classByDoc, now)), [projects, byId, classByDoc, now]);
  const inView = aggregates.filter(view.test);

  const filtered = inView.filter((a) => {
    if (risk.length > 0 && !(a.overallRisk && risk.includes(a.overallRisk))) return false;
    if (docType.length > 0 && !a.project.docIds.some((id) => docType.includes(byId.get(id)?.docType ?? ""))) return false;
    if (query && !`${a.project.name} ${a.project.client ?? ""}`.toLowerCase().includes(query)) return false;
    return true;
  });

  // Card layout keeps the old default order: highest risk first, then value.
  const gridSorted = [...filtered].sort((a, b) => ((a.overallRisk ? RISK_RANK[a.overallRisk] : 4) - (b.overallRisk ? RISK_RANK[b.overallRisk] : 4)) || b.value - a.value);

  const resetFilters = () => { setQ(""); setRisk([]); setDocType([]); };

  const typeCounts = new Map<string, number>();
  for (const a of inView) for (const t of new Set(a.project.docIds.map((id) => byId.get(id)?.docType).filter(Boolean) as string[])) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  const filters: IndexFilter[] = [
    {
      id: "risk", label: "Risk", selected: risk, onChange: setRisk,
      options: RISK_LEVELS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1), count: inView.filter((a) => a.overallRisk === l).length })).filter((o) => o.count > 0 || risk.includes(o.value)),
    },
    {
      id: "type", label: "Type", selected: docType, onChange: setDocType,
      options: DOC_TYPE_KEYS.filter((t) => typeCounts.has(t)).map((t) => ({ value: t, label: docTypeShort(t), count: typeCounts.get(t) })),
    },
  ];
  const activeCount = activeFilterCount(filters);

  const tabs: ListView[] = VIEWS.map((v) => ({
    id: v.id, label: v.label, count: !mounted || isLoading ? null : aggregates.filter(v.test).length, href: hrefWith({ view: v.id }),
  }));

  const columns: DataTableColumn<Agg>[] = [
    {
      id: "name", header: noun("Project"), card: "title", className: "min-w-[14rem]", sortValue: (a) => a.project.name.toLowerCase(),
      cell: (a) => (
        <span className="flex min-w-0 max-w-[min(22rem,34cqw)] flex-col">
          <span className="truncate">{displayTitle(a.project.name)}</span>
          {a.project.client && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{a.project.client}</span>}
          <SharedNote project={a.project} />
        </span>
      ),
    },
    { id: "status", header: "Status", card: "status", sortValue: (a) => (a.lifecycle === "—" ? null : a.lifecycle), cell: (a) => <StatusPill lifecycle={a.lifecycle} /> },
    {
      id: "risk", header: "Risk", sortValue: (a) => (a.overallRisk ? RISK_RANK[a.overallRisk] : null),
      cell: (a) => a.overallRisk ? (
        <span className="flex items-center gap-2">
          <RiskPill level={a.overallRisk} />
          <SeverityBar rc={a.rc} total={a.total} />
        </span>
      ) : a.processing > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-600)]"><Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />Analyzing</span>
      ) : <Dash />,
    },
    {
      id: "highRisk", header: "High-risk", numeric: true, priority: 2, sortFirst: "desc", sortValue: (a) => (a.total === 0 ? null : a.highRisk),
      cell: (a) => (a.total === 0 ? <Dash /> : a.highRisk > 0 ? <span className="font-semibold text-[var(--danger-fg)]">{a.highRisk}</span> : <span className="text-[var(--ink-600)]">0</span>),
    },
    { id: "docCount", header: "Docs", numeric: true, priority: 2, sortFirst: "desc", sortValue: (a) => a.docCount, cell: (a) => a.docCount },
    { id: "value", header: "Value", numeric: true, sortFirst: "desc", sortValue: (a) => (a.value > 0 ? a.value : null), cell: (a) => (a.value > 0 ? fmtMoney(a.value, a.currency) : <Dash />) },
    { id: "change", header: "Change", numeric: true, priority: 3, sortValue: (a) => a.valueDelta || null, cell: (a) => <ValueDelta delta={a.valueDelta} currency={a.currency} /> },
    { id: "data", header: "Data", priority: 3, sortable: false, cell: (a) => <ReconciledBadge reconciled={a.reconciled} hasValue={a.value > 0} /> },
    {
      id: "date", header: "Renewal or term end", priority: 2, sortValue: (a) => (a.expired ? -1 : a.daysToDate),
      cell: (a) => <RenewalCell expired={a.expired} days={a.daysToDate} kind={a.dateKind} />,
    },
    { id: "attention", header: "Attention", priority: 2, sortable: false, cell: (a) => <AttentionTag reason={a.attention} risk={a.overallRisk} expired={a.expired} failed={a.failed > 0} /> },
  ];

  const highRiskInView = filtered.reduce((s, a) => s + a.highRisk, 0);
  const docsInView = filtered.reduce((s, a) => s + a.docCount, 0);
  const ready = mounted && !isLoading;

  const layoutSwitch = (
    <div role="group" aria-label="Layout" className="inline-flex h-8 shrink-0 rounded-[6px] border border-border-strong bg-surface-raised p-0.5 max-md:h-11">
      {(["table", "grid"] as const).map((l) => (
        <Link
          key={l}
          href={hrefWith({ layout: l })}
          scroll={false}
          aria-current={layout === l ? "page" : undefined}
          aria-label={l === "table" ? "Table" : "Cards"}
          className={cn(
            "inline-flex w-8 items-center justify-center rounded-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus max-md:w-10",
            layout === l ? "bg-surface-sunken text-[var(--ink-900)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
          )}
        >
          {l === "table" ? <Menu size={16} aria-hidden /> : <LayoutGrid size={16} aria-hidden />}
        </Link>
      ))}
    </div>
  );

  const toolbar = (
    <Toolbar
      label={byEdition("Project filters", "Engagement filters")}
      activeCount={activeCount}
      mobileSheet={<SheetFilters filters={filters} onClear={resetFilters} />}
      mobileActions={layoutSwitch}
    >
      <Toolbar.Search label={byEdition("Search projects", "Search engagements")} placeholder={byEdition("Search projects", "Search engagements")} value={q} onChange={setQ} />
      <Toolbar.Filters><QuickFilters filters={filters} /></Toolbar.Filters>
      <Toolbar.More><MoreFilters filters={filters} /></Toolbar.More>
      <Toolbar.Clear count={activeCount} onClear={resetFilters} />
      <Toolbar.Actions>{layoutSwitch}</Toolbar.Actions>
    </Toolbar>
  );

  const footer = filtered.length > 0 ? (
    <InViewFooter
      count={filtered.length}
      noun={[noun("project"), noun("projects")]}
      cells={[
        { label: "Documents", value: docsInView.toLocaleString() },
        { label: "High-risk clauses", value: highRiskInView.toLocaleString(), tone: highRiskInView > 0 ? "danger" : undefined },
      ]}
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title={terms.projects}
        count={ready && !isError ? filtered.length : null}
        countLoading={!ready}
        actions={
          <Button asChild>
            <Link href="/projects/new"><Plus size={16} aria-hidden />{byEdition("New project", "New engagement")}</Link>
          </Button>
        }
        meta={<ViewTabs label={byEdition("Project views", "Engagement views")} views={tabs} activeId={view.id} loading={!ready} />}
      />

      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        {!ready ? (
          <ProjectsBodySkeleton layout={layout} columns={columns} />
        ) : isError ? (
          <ErrorState onRetry={refreshAll} />
        ) : projects.length === 0 ? (
          <EmptyState pristine />
        ) : layout === "grid" ? (
          <>
            {toolbar}
            {filtered.length === 0 ? (
              <EmptyState pristine={false} reset={resetFilters} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {gridSorted.map((a) => <ProjectGridCard key={a.project.id} a={a} />)}
                </div>
                {footer}
              </>
            )}
          </>
        ) : (
          <DataTable
            caption={view.label}
            noun={noun("projects")}
            columns={columns}
            rows={filtered}
            getRowId={(a) => a.project.id}
            selection={{ selected, onChange: setSelected }}
            exportName={byEdition("projects", "engagements")}
            onRowClick={(a) => setPreviewId(a.project.id)}
            activeRowId={previewId}
            getRowLabel={(a) => `Preview ${a.project.name}`}
            defaultSort={{ columnId: "risk", direction: "asc" }}
            pageSize={50}
            columnsKey="projects-table"
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            isFiltered={activeCount > 0 || !!query || view.id !== "all"}
            onClearFilters={resetFilters}
            footer={footer}
            toolbar={toolbar}
          />
        )}
      </div>
      <ProjectDrawer agg={previewId ? aggregates.find((a) => a.project.id === previewId) ?? null : null} onClose={() => setPreviewId(null)} />
    </>
  );
}

/** The row's slide-over: status, risk, documents, value and the next key date. */
function ProjectDrawer({ agg: a, onClose }: { agg: Agg | null; onClose: () => void }) {
  if (!a) return null;
  return (
    <RecordDrawer
      title={displayTitle(a.project.name)}
      subtitle={a.project.client || undefined}
      status={<><StatusPill lifecycle={a.lifecycle} hideEmpty />{a.overallRisk && <RiskPill level={a.overallRisk} />}</>}
      href={`/projects/${a.project.id}`}
      openLabel={byEdition("Open project", "Open engagement")}
      onClose={onClose}
    >
      <KeyValueList
        columns={2}
        items={[
          { label: "Documents", value: a.docCount },
          { label: "Clauses", value: a.clauseCount },
          { label: "High-risk clauses", value: a.total === 0 ? null : a.highRisk },
          { label: "Value", value: a.value > 0 ? fmtMoney(a.value, a.currency) : null },
          {
            label: a.dateKind === "renewal" ? "Renews" : "Term ends",
            value: a.expired ? "Expired" : a.daysToDate === null ? null : a.daysToDate === 0 ? "Today" : `In ${a.daysToDate} days`,
          },
          { label: "Analyzing", value: a.processing > 0 ? `${a.processing} document${a.processing === 1 ? "" : "s"}` : "None" },
        ]}
      />
    </RecordDrawer>
  );
}

const DOC_TYPE_KEYS = Object.keys(DOC_TYPE_META) as (keyof typeof DOC_TYPE_META)[];

function Dash() {
  return <span className="text-sm text-muted-foreground">—</span>;
}

/** Worst clause risk level in the project (not a blended score). */
function RiskPill({ level }: { level: RiskLevel }) {
  return (
    <DsStatusPill
      size="sm"
      tone={RISK_TONE[level]}
      className="capitalize"
      title={byEdition("Highest clause risk level found in this project", "Highest clause risk level found in this engagement")}
    >
      {level}
    </DsStatusPill>
  );
}

const RISK_TONE: Record<RiskLevel, "blocked" | "caution" | "unknown"> = { critical: "blocked", high: "caution", medium: "unknown", low: "unknown" };

function StatusPill({ lifecycle, hideEmpty = false }: { lifecycle: Lifecycle | "—"; hideEmpty?: boolean }) {
  if (lifecycle === "—") return hideEmpty ? null : <Dash />;
  const meta = STATUS_META[lifecycle] ?? { label: lifecycle };
  return <DsStatusPill size="sm" tone={lifecycle === "expired" ? "blocked" : "unknown"}>{meta.label}</DsStatusPill>;
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
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {fmtMoney(Math.abs(delta), currency)}
    </span>
  );
}

function ReconciledBadge({ reconciled, hasValue }: { reconciled: boolean | null; hasValue: boolean }) {
  if (!hasValue) return <Dash />;
  if (reconciled === true) return <span title="Figures reconcile to the stated total" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]"><CheckCircle2 size={12} />Reconciled</span>;
  if (reconciled === false) return <span title="Figures don't reconcile. Review them." className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warning)]"><AlertTriangle size={12} />Check</span>;
  // The figure is the extracted one; the validation step just had nothing to reconcile it against.
  return <span title="Extracted from the document. No stated total was available to reconcile it against." className="text-xs text-muted-foreground">Not reconciled</span>;
}

function RenewalCell({ expired, days, kind }: { expired: boolean; days: number | null; kind: Agg["dateKind"] }) {
  if (expired) return <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]"><CalendarClock size={12} />Expired</span>;
  if (days === null) return <Dash />;
  const soon = days <= 90;
  const when = days === 0 ? "today" : `in ${days}d`;
  return <span className={`inline-flex items-center gap-1 text-xs ${soon ? "font-medium text-[var(--warning)]" : "text-muted-foreground"}`}><CalendarClock size={12} />{kind === "renewal" ? "Renews" : "Term ends"} {when}</span>;
}

function AttentionTag({ reason, risk, expired, failed }: { reason: string | null; risk: RiskLevel | null; expired: boolean; failed: boolean }) {
  if (!reason) return <Dash />;
  const danger = failed || expired || risk === "critical" || risk === "high";
  return <DsStatusPill size="sm" tone={danger ? "blocked" : "caution"}>{reason}</DsStatusPill>;
}

/* ── Grid card (toggle) ───────────────────────────────────────── */
function ProjectGridCard({ a }: { a: Agg }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: a.rc.critical }, { k: "high", n: a.rc.high }, { k: "medium", n: a.rc.medium }, { k: "low", n: a.rc.low },
  ];
  return (
    <Link href={`/projects/${a.project.id}`} className="group flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-[var(--ink-300)] focus-visible:outline-2 focus-visible:outline-focus">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold line-clamp-2 break-words leading-snug text-foreground">{displayTitle(a.project.name)}</h3>
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
      <Users size={12} aria-hidden className="shrink-0" />
      <span className="min-w-0 truncate" title={owner ? `Owned by ${owner}` : undefined}>
        Shared with you{owner ? ` by ${owner}` : ""}
      </span>
      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-semibold text-[var(--ink-700)]">{ROLE_META[project.role].label}</span>
    </p>
  );
}

/** `null` = not known yet (nothing analyzed), shown as a dash rather than 0. */
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
    <div role="alert" className="flex flex-col items-center border-y border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-12 text-center">
      <XCircle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
      <h3 className="text-base font-semibold text-foreground">{byEdition("Couldn’t load your projects", "Couldn’t load your engagements")}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--ink-600)]">{byEdition("The request for your projects or documents failed. Try again in a moment.", "The request for your engagements or documents failed. Try again in a moment.")}</p>
      <Button variant="outline" className="mt-5" onClick={onRetry}><RefreshCw size={16} aria-hidden />Try again</Button>
    </div>
  );
}

function EmptyState({ pristine, reset }: { pristine: boolean; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center border-y border-border-default px-4 py-14 text-center">
      <Layers size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
      <h3 className="text-base font-semibold text-foreground">{pristine ? `No ${noun("projects")} yet` : `No ${noun("projects")} match`}</h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--ink-600)]">
        {pristine ? byEdition("Create a project, then upload its agreements.", "Create an engagement, then upload its MSA and SOWs.") + " " + byEdition("Projects shared with you appear here too.", "Engagements shared with you appear here too.") : "Try a different filter or clear your search."}
      </p>
      {pristine ? (
        <Button variant="outline" className="mt-5" asChild><Link href="/projects/new"><Plus size={16} aria-hidden />{byEdition("Create your first project", "Create your first engagement")}</Link></Button>
      ) : (
        <Button variant="outline" className="mt-5" onClick={reset}>Clear filters</Button>
      )}
      {pristine && <Link href="/projects/upload" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">{byEdition("or upload a document without a project", "or upload a document without an engagement")} <ArrowRight size={12} aria-hidden /></Link>}
    </div>
  );
}
