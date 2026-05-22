"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { MiniRiskDonut } from "@/components/charts/MiniRiskDonut";
import {
  Plus, Search, Briefcase, ArrowRight, ArrowUp, ArrowDown, Layers, LayoutGrid, Menu, Loader2,
  ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, XCircle, RefreshCw, CalendarClock,
  FileSignature, Eye, GitCompare, Edit3, Repeat, Check, Trash2,
} from "@/components/ui/icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { getClassification, deleteDocument } from "@/lib/api";
import { computeContractValue, fmtMoney, persistedOf, type ValuedDoc } from "@/lib/contract-value";
import { useProjects, deleteProject, withUngroupedDocs, type LocalProject } from "@/lib/projects-store";
import type { ApiClassification, ApiDocument, Lifecycle, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
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
  clauseCount: number;
  rc: { low: number; medium: number; high: number; critical: number };
  total: number;
  highRisk: number;
  overallRisk: RiskLevel;
  processing: number;
  failed: number;
  value: number;
  valueDelta: number;
  reconciled: boolean | null;
  currency: string | null;
  lifecycle: Lifecycle | "—";
  expired: boolean;
  daysToDate: number | null; // days to nearest upcoming effective date
  attention: string | null;
};

function aggregate(project: LocalProject, byId: Map<string, ApiDocument>, classByDoc: Map<string, ApiClassification>, now: number): Agg {
  const rc = { low: 0, medium: 0, high: 0, critical: 0 };
  let clauseCount = 0, processing = 0, failed = 0, expired = false;
  let nearest: number | null = null;
  const pdocs: ApiDocument[] = [];
  for (const id of project.docIds) {
    const d = byId.get(id);
    if (!d) continue;
    pdocs.push(d);
    clauseCount += d.clauseCount ?? 0;
    if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
    if (PROCESSING.has(d.status)) processing++;
    if (d.status === "FAILED") failed++;
    if (d.lifecycle === "expired") expired = true;
    if (d.effectiveDate) {
      const t = new Date(d.effectiveDate).getTime();
      if (t >= now && (nearest === null || t < nearest)) nearest = t;
    }
  }
  const valued: ValuedDoc[] = pdocs.filter((d) => d.status === "READY").map((d) => ({ docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt, classification: classByDoc.get(d.docId), persisted: persistedOf(d) }));
  const cv = computeContractValue(valued);
  const valueDelta = cv.segments.filter((s) => s.isAmendment).reduce((s, x) => s + x.value, 0);
  const total = rc.low + rc.medium + rc.high + rc.critical;
  const highRisk = rc.high + rc.critical;
  const overallRisk: RiskLevel = rc.critical > 0 ? "critical" : rc.high > 0 ? "high" : rc.medium > 0 ? "medium" : "low";
  const root = pdocs.find((d) => d.docType !== "AMENDMENT") ?? pdocs[0];
  const lifecycle = (root?.lifecycle ?? "—") as Lifecycle | "—";
  const daysToDate = nearest !== null ? Math.round((nearest - now) / DAY) : null;

  let attention: string | null = null;
  if (failed > 0) attention = `${failed} failed`;
  else if (rc.critical > 0) attention = "Critical risk";
  else if (rc.high > 0) attention = "High risk";
  else if (expired) attention = "Expired";
  else if (daysToDate !== null && daysToDate <= 90) attention = `In ${daysToDate}d`;

  return { project, docCount: project.docIds.length, clauseCount, rc, total, highRisk, overallRisk, processing, failed, value: cv.total, valueDelta, reconciled: cv.reconciled, currency: cv.currency, lifecycle, expired, daysToDate, attention };
}

type RiskFilter = "all" | "attention" | RiskLevel;
type StatusFilter = "any" | "active" | "expiring" | "expired";
type ViewMode = "table" | "grid";
type SortKey = "name" | "status" | "risk" | "highRisk" | "docCount" | "clauseCount" | "value" | "date";
type SortDir = "asc" | "desc";

/** Every document that must be deleted with a project: the project's own docIds
 *  plus every amendment whose parentDocId chain leads back to one of them, so
 *  deleting a project removes the whole contract family — not orphaning
 *  amendments that were never explicitly added to the project. */
function collectProjectDocIds(rootIds: string[], allDocs: ApiDocument[]): string[] {
  const ids = new Set(rootIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of allDocs) {
      if (d.parentDocId && ids.has(d.parentDocId) && !ids.has(d.docId)) {
        ids.add(d.docId);
        grew = true;
      }
    }
  }
  return [...ids];
}

export default function ProjectsPage() {
  const { data: docs = [], isLoading, isError, refetch } = useDocuments();
  const rawProjects = useProjects();
  // Show every uploaded document here too — manual projects plus a synthetic
  // entry for any ungrouped document — so the page reflects your portfolio
  // instead of sitting empty. (Synthetic entries aren't persisted.)
  const projects = useMemo(() => withUngroupedDocs(rawProjects, docs), [rawProjects, docs]);
  const [mounted, setMounted] = useState(false);
  const [now] = useState(() => Date.now()); // mount-time reference for relative dates
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "risk", dir: "asc" });
  const [deleteTarget, setDeleteTarget] = useState<LocalProject | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const qc = useQueryClient();
  // Documents the delete will actually remove: the project's docs + linked amendments.
  const deleteCount = deleteTarget ? collectProjectDocIds(deleteTarget.docIds, docs).length : 0;

  // Delete entirely: every document in the project (plus its linked amendments)
  // is removed from the backend, then the local project container is dropped.
  // The backend DELETE purges S3 + OpenSearch + all DynamoDB rows per document.
  async function confirmDelete() {
    if (!deleteTarget || deletingProject) return;
    const proj = deleteTarget;
    const ids = collectProjectDocIds(proj.docIds, docs);
    setDeletingProject(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteDocument(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      deleteProject(proj.id); // also clears the local container + its doc refs
      await qc.invalidateQueries({ queryKey: documentKeys.all });
      if (failed > 0) {
        toast.error("Project deleted, but some documents failed", {
          description: `${failed} of ${ids.length} document(s) couldn't be removed from the backend — retry from the Library.`,
        });
      } else {
        toast.success("Project deleted", {
          description: `"${proj.name}"${ids.length ? ` and its ${ids.length} document${ids.length === 1 ? "" : "s"}` : ""} were permanently removed.`,
        });
      }
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setDeletingProject(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    const p = new URLSearchParams(window.location.search).get("risk");
    if (p === "attention" || p === "critical" || p === "high" || p === "all") setRisk(p);
  }, []);

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);

  // Reuse the cached classification queries (same keys as Dashboard) to value contracts.
  const readyInProjects = useMemo(() => {
    const ids = new Set(projects.flatMap((p) => p.docIds));
    return docs.filter((d) => ids.has(d.docId) && d.status === "READY");
  }, [projects, docs]);
  const classQueries = useQueries({
    queries: readyInProjects.map((d) => ({ queryKey: documentKeys.classification(d.docId), queryFn: () => getClassification(d.docId), staleTime: 5 * 60_000 })),
  });
  const classByDoc = new Map<string, ApiClassification>();
  readyInProjects.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });

  const aggregates = projects.map((p) => aggregate(p, byId, classByDoc, now));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return aggregates.filter((a) => {
      if (risk === "attention" && a.highRisk === 0 && a.failed === 0) return false;
      if (risk !== "all" && risk !== "attention" && a.overallRisk !== risk) return false;
      if (status === "active" && !(a.lifecycle === "active" || a.lifecycle === "signed")) return false;
      if (status === "expiring" && !(a.daysToDate !== null && a.daysToDate <= 90 && !a.expired)) return false;
      if (status === "expired" && !a.expired) return false;
      if (term && !`${a.project.name} ${a.project.client ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [aggregates, q, risk, status]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    const dateVal = (a: Agg) => (a.expired ? -1 : a.daysToDate ?? Number.MAX_SAFE_INTEGER);
    rows.sort((a, b) => {
      switch (sort.key) {
        case "name": return a.project.name.localeCompare(b.project.name) * dir;
        case "status": return String(a.lifecycle).localeCompare(String(b.lifecycle)) * dir;
        case "risk": return (RISK_RANK[a.overallRisk] - RISK_RANK[b.overallRisk]) * dir || b.value - a.value;
        case "highRisk": return (a.highRisk - b.highRisk) * dir;
        case "docCount": return (a.docCount - b.docCount) * dir;
        case "clauseCount": return (a.clauseCount - b.clauseCount) * dir;
        case "value": return (a.value - b.value) * dir;
        case "date": return (dateVal(a) - dateVal(b)) * dir;
        default: return 0;
      }
    });
    return rows;
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

  const totalDocs = projects.reduce((s, p) => s + p.docIds.length, 0);
  const resetFilters = () => { setQ(""); setRisk("all"); setStatus("any"); };

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="app-container flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"><Briefcase size={17} strokeWidth={1.75} /></span>
            <div>
              <h1 className="text-[18px] font-bold leading-tight tracking-tight text-foreground">Projects</h1>
              <p className="text-[12px] text-muted-foreground">
                {mounted ? `${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalDocs} document${totalDocs === 1 ? "" : "s"}` : "Your contracts and the documents inside them"}
              </p>
            </div>
          </div>
          <Link href="/projects/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-700)]">
            <Plus size={15} strokeWidth={2.5} />New project
          </Link>
        </div>
      </header>

      <div className="app-container py-5 md:py-6">
        {mounted && projects.length > 0 && !isError && (
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative flex min-w-[200px] flex-1 items-center sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…"
                className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-4 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-[var(--brand-primary-400)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-100)]" />
            </div>
            <div className="flex items-center gap-1">
              {([
                { k: "all", label: "All" },
                { k: "attention", label: "Needs attention" },
                { k: "critical", label: "Critical" },
                { k: "high", label: "High" },
              ] as { k: RiskFilter; label: string }[]).map((f) => (
                <button key={f.k} onClick={() => setRisk(f.k)} data-active={risk === f.k}
                  className="inline-flex h-8 items-center rounded-full border border-transparent px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)]">
                  {f.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="status-filter">Filter by status</label>
            <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-8 rounded-full border border-border bg-card px-3 text-[12.5px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
              <option value="any">Any status</option>
              <option value="active">Active / Signed</option>
              <option value="expiring">Expiring · 90d</option>
              <option value="expired">Expired</option>
            </select>
            <div className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5">
              {([{ m: "table", icon: <Menu size={15} /> }, { m: "grid", icon: <LayoutGrid size={15} /> }] as { m: ViewMode; icon: React.ReactNode }[]).map((vm) => (
                <button key={vm.m} onClick={() => setView(vm.m)} data-active={view === vm.m} aria-label={`${vm.m} view`}
                  className="inline-flex h-7 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)]">
                  {vm.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {!mounted || isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState pristine />
        ) : filtered.length === 0 ? (
          <EmptyState pristine={false} reset={resetFilters} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((a, i) => (
              <MotionReveal key={a.project.id} delay={Math.min(i * 0.04, 0.2)}><ProjectGridCard a={a} onDelete={setDeleteTarget} /></MotionReveal>
            ))}
          </div>
        ) : (
          <ProjectTable rows={sorted} sort={sort} onSort={toggleSort} onDelete={setDeleteTarget} />
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and its{" "}
              <strong>{deleteCount} document{deleteCount === 1 ? "" : "s"}</strong>{" "}
              (with all clauses, analysis, and versions) will be <strong>permanently deleted</strong>
              {" "}from the backend. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deletingProject}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
            >
              {deletingProject ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Table (default) ──────────────────────────────────────────── */
function ProjectTable({ rows, sort, onSort, onDelete }: { rows: Agg[]; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; onDelete: (p: LocalProject) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table className="w-full min-w-[940px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <Th label="Project" k="name" sort={sort} onSort={onSort} />
            <Th label="Status" k="status" sort={sort} onSort={onSort} />
            <Th label="Risk" k="risk" sort={sort} onSort={onSort} />
            <Th label="High-risk" k="highRisk" sort={sort} onSort={onSort} align="right" />
            <Th label="Docs" k="docCount" sort={sort} onSort={onSort} align="right" />
            <Th label="Value" k="value" sort={sort} onSort={onSort} align="right" />
            <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Δ</th>
            <th className="px-4 py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Data</th>
            <Th label="Renewal" k="date" sort={sort} onSort={onSort} />
            <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Attention</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.project.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/projects/${a.project.id}`} className="font-semibold text-foreground hover:text-[var(--brand-primary-700)]">{a.project.name}</Link>
                {a.project.client && <div className="truncate text-[11px] text-muted-foreground">{a.project.client}</div>}
              </td>
              <td className="px-4 py-3"><StatusPill lifecycle={a.lifecycle} /></td>
              <td className="px-4 py-3">
                {a.total > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span>
                    <SeverityBar rc={a.rc} total={a.total} />
                  </div>
                ) : a.processing > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--warning)]"><Loader2 size={11} className="animate-spin" />Analyzing</span>
                ) : <span className="text-[11px] text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{a.highRisk > 0 ? <span className="font-semibold text-[var(--danger)]">{a.highRisk}</span> : "0"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{a.docCount}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{a.value > 0 ? fmtMoney(a.value, a.currency) : "—"}</td>
              <td className="px-4 py-3 text-right"><ValueDelta delta={a.valueDelta} currency={a.currency} /></td>
              <td className="px-4 py-3 text-center"><ReconciledBadge reconciled={a.reconciled} hasValue={a.value > 0} /></td>
              <td className="px-4 py-3"><RenewalCell expired={a.expired} days={a.daysToDate} /></td>
              <td className="px-4 py-3"><AttentionTag reason={a.attention} risk={a.overallRisk} expired={a.expired} failed={a.failed > 0} /></td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => onDelete(a.project)} aria-label={`Remove project ${a.project.name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, k, sort, onSort, align = "left" }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; align?: "left" | "right" }) {
  const active = sort.key === k;
  return (
    <th aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${align === "right" ? "text-right" : ""}`}>
      <button type="button" onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}>
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
      </button>
    </th>
  );
}

function StatusPill({ lifecycle }: { lifecycle: Lifecycle | "—" }) {
  if (lifecycle === "—") return <span className="text-[11px] text-muted-foreground">—</span>;
  const meta = STATUS_META[lifecycle] ?? { label: lifecycle, Icon: Check };
  const Icon = meta.Icon;
  const danger = lifecycle === "expired";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${danger ? "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]" : "border-border bg-muted/60 text-foreground"}`}>
      <Icon size={11} />{meta.label}
    </span>
  );
}

function SeverityBar({ rc, total }: { rc: Agg["rc"]; total: number }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: rc.critical }, { k: "high", n: rc.high }, { k: "medium", n: rc.medium }, { k: "low", n: rc.low },
  ];
  return (
    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:flex" title={`critical ${rc.critical} · high ${rc.high} · medium ${rc.medium} · low ${rc.low}`}>
      {segs.map(({ k, n }) => (n > 0 ? <span key={k} style={{ width: `${(n / total) * 100}%`, background: RISK_HEX[k] }} /> : null))}
    </span>
  );
}

function ValueDelta({ delta, currency }: { delta: number; currency: string | null }) {
  if (!delta) return <span className="text-[11px] text-muted-foreground">—</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
      {up ? <ArrowUp size={11} strokeWidth={2.25} /> : <ArrowDown size={11} strokeWidth={2.25} />}{fmtMoney(Math.abs(delta), currency)}
    </span>
  );
}

function ReconciledBadge({ reconciled, hasValue }: { reconciled: boolean | null; hasValue: boolean }) {
  if (!hasValue) return <span className="text-[11px] text-muted-foreground">—</span>;
  if (reconciled === true) return <span title="Figures reconcile to the stated total" className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]"><CheckCircle2 size={12} />Reconciled</span>;
  if (reconciled === false) return <span title="Figures don't reconcile — review" className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--warning)]"><AlertTriangle size={12} />Check</span>;
  return <span title="Single estimated figure" className="text-[11px] text-muted-foreground">Estimated</span>;
}

function RenewalCell({ expired, days }: { expired: boolean; days: number | null }) {
  if (expired) return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--danger)]"><CalendarClock size={12} />Expired</span>;
  if (days === null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const soon = days <= 90;
  return <span className={`inline-flex items-center gap-1 text-[11.5px] ${soon ? "font-medium text-[var(--warning)]" : "text-muted-foreground"}`}><CalendarClock size={12} />in {days}d</span>;
}

function AttentionTag({ reason, risk, expired, failed }: { reason: string | null; risk: RiskLevel; expired: boolean; failed: boolean }) {
  if (!reason) return <span className="text-[11px] text-muted-foreground">—</span>;
  const danger = failed || expired || risk === "critical" || risk === "high";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${danger ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>
      <AlertTriangle size={10} />{reason}
    </span>
  );
}

/* ── Grid card (toggle) ───────────────────────────────────────── */
function ProjectGridCard({ a, onDelete }: { a: Agg; onDelete: (p: LocalProject) => void }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: a.rc.critical }, { k: "high", n: a.rc.high }, { k: "medium", n: a.rc.medium }, { k: "low", n: a.rc.low },
  ];
  return (
    <div className="group relative h-full">
    <Link href={`/projects/${a.project.id}`} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-[var(--brand-primary-300)] hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{a.project.name}</h3>
          {a.project.client && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{a.project.client}</p>}
        </div>
        {a.total > 0 ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span>
        ) : a.processing > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]"><Loader2 size={10} className="animate-spin" />Analyzing</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <MiniRiskDonut counts={a.rc} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat value={a.docCount} label="Docs" />
          <Stat value={a.clauseCount} label="Clauses" />
          <Stat value={a.highRisk} label="High-risk" tone={a.highRisk > 0 ? "danger" : undefined} />
        </div>
      </div>

      {a.total > 0 && (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {segs.map(({ k, n }) => (n > 0 ? <div key={k} style={{ width: `${(n / a.total) * 100}%`, background: RISK_HEX[k] }} /> : null))}
          </div>
        </div>
      )}

      {/* Footer: value, status, data trust, renewal */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-[11.5px]">
        {a.value > 0 && <span className="font-semibold tabular-nums text-foreground">{fmtMoney(a.value, a.currency)}</span>}
        <StatusPill lifecycle={a.lifecycle} />
        {a.value > 0 && <ReconciledBadge reconciled={a.reconciled} hasValue />}
        {(a.expired || a.daysToDate !== null) && <RenewalCell expired={a.expired} days={a.daysToDate} />}
      </div>
    </Link>
      <button
        type="button"
        onClick={() => onDelete(a.project)}
        aria-label={`Remove project ${a.project.name}`}
        className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-all hover:border-[var(--danger)]/40 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "danger" }) {
  return (
    <div>
      <div className={`text-[18px] font-bold leading-none tabular-nums ${tone === "danger" ? "text-[var(--danger)]" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)]/50 py-16 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"><XCircle size={26} strokeWidth={1.5} /></span>
      <h3 className="text-[17px] font-semibold text-foreground">Couldn&apos;t load your projects</h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">The document service didn&apos;t respond. Your projects are safe — try again in a moment.</p>
      <Button variant="outline" size="md" className="mt-6 gap-1.5 rounded-full" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}

function EmptyState({ pristine, reset }: { pristine: boolean; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><Layers size={28} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">{pristine ? "No projects yet" : "No projects match"}</h3>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
        {pristine ? "Create a project, then upload its SOW. Bluey extracts clauses, scores risk, and rolls it up here." : "Try a different filter or clear your search."}
      </p>
      {pristine ? (
        <Button variant="primary" size="lg" className="mt-6 rounded-full" asChild><Link href="/projects/new"><Plus size={15} />Create your first project</Link></Button>
      ) : (
        <Button variant="outline" size="md" className="mt-6 rounded-full" onClick={reset}>Clear filters</Button>
      )}
      {pristine && <Link href="/projects/new" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">or add documents <ArrowRight size={12} /></Link>}
    </div>
  );
}
