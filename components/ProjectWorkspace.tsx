"use client";

import { Fragment, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { SonarMark } from "@/components/ui/SonarMark";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { CategoryRadar } from "@/components/charts/CategoryRadar";
import { ContractValueChart } from "@/components/charts/ContractValueChart";
import { SowTimeline } from "@/components/SowTimeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ALL, ListFilters, NoResults, activeFilterCount, type FilterGroup } from "@/app/(app)/projects/[id]/_components/ListFilters";
import {
  FileText, CheckCircle2, Loader2, XCircle, ArrowRight, Layers,
  Building2, ShieldAlert, AlertTriangle, Info, Plus, GitBranch, Users, Sparkles, Trash2, DollarSign,
  RefreshCw, Maximize2, Download, Clock, ExternalLink, CalendarClock, MoreHorizontal, Pencil, Minus, Eye,
} from "@/components/ui/icons";
import { RISK_LABEL } from "@/lib/chart-theme";
import { useNow } from "@/lib/use-now";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocuments, useClassifications, useDeleteDocument, useReprocess, documentKeys, isProcessing } from "@/lib/queries/documents";
import { getDocFile, askSonar, getSimilarClauses, isNotFound, type ApiDocFile } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/lib/stores/ui";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";
import {
  useProject, useProjectsSync, refreshProjects, loadProject, removeDocFromProject, renameProject, deleteProject,
  can, projectMembers, projectOwnerEmail, type LocalProject,
} from "@/lib/projects-store";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { InviteDialog } from "@/components/team/InviteDialog";
import { ProjectMemberList } from "@/components/team/ProjectMemberList";
import { ROLE_META, readOnlyReason } from "@/components/team/roles";
import { formatRelativeDays, formatDate } from "@/lib/format";
import { categoryLabel } from "@/lib/clause-categories";
import { computeContractValue, fmtMoney, docValueOrNull, persistedOf, type ValueSegment } from "@/lib/contract-value";
import type { ApiClause, ApiClassification, ApiDocument, ProjectRole, RiskLevel, FindingSeverity } from "@/lib/types";

const RISK_SORT: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_RANK: Record<FindingSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const SEG_COLORS = ["var(--brand-primary-600)", "var(--success)", "var(--info)", "var(--brand-primary-400)", "var(--warning)", "var(--ai-ink)"];

const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]" },
  high: { label: "High", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
  medium: { label: "Medium", bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-600)]" },
  low: { label: "Low", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};
const RISK_DOT: Record<RiskLevel, string> = { critical: "bg-[var(--danger)]", high: "bg-[var(--warning)]", medium: "bg-[var(--ink-500)]", low: "bg-[var(--success)]" };
/** Shown for a clause the analysis returned without a risk level. It is never styled or counted as "low". */
const UNRATED_META = { label: "Not assessed", bg: "bg-muted", text: "text-[var(--ink-600)]" };
const UNRATED = "unrated";

type Counts = { low: number; medium: number; high: number; critical: number };
const sumCounts = (c: Counts) => c.low + c.medium + c.high + c.critical;
const worstOf = (c: Counts): RiskLevel | null =>
  sumCounts(c) === 0 ? null : c.critical > 0 ? "critical" : c.high > 0 ? "high" : c.medium > 0 ? "medium" : "low";
const isRated = (c: { riskRated?: boolean }) => c.riskRated !== false;
/** Pill colours and label for one clause; "Not assessed" when it has no risk level. */
const clauseRiskMeta = (c: { riskLevel: RiskLevel; riskRated?: boolean }) => (isRated(c) ? RISK_META[c.riskLevel] : UNRATED_META);
const clauseRiskText = (c: { riskLevel: RiskLevel; riskRated?: boolean }) => (isRated(c) ? `${RISK_META[c.riskLevel].label} risk` : UNRATED_META.label);

/** A document's overall risk as stored by the analysis — but only when it has
 *  rated clauses. (The stored level reads "low" for a document with no clauses.) */
function docOverallRisk(d: ApiDocument): RiskLevel | null {
  const rated = d.riskCounts ? sumCounts(d.riskCounts) : d.clauseCount ?? 0;
  if (rated <= 0) return null;
  return d.overallRisk ?? (d.riskCounts ? worstOf(d.riskCounts) : null);
}
/** The currency extracted for one document; null when none was. */
const docCurrency = (d: ApiDocument, c?: ApiClassification): string | null => d.currency ?? c?.commercials?.currency ?? null;
const NOOP_SUBSCRIBE = () => () => {};

function docStatusKey(d: ApiDocument): "ready" | "analyzing" | "failed" {
  return d.status === "READY" ? "ready" : d.status === "FAILED" ? "failed" : "analyzing";
}
const DOC_STATUS_LABEL = { ready: "Ready", analyzing: "Analyzing", failed: "Failed" } as const;

type AggClause = ApiClause & { _docId: string; _docTitle: string };
type TabId = "overview" | "sow" | "amendments" | "timeline" | "team" | "documents";

type View = {
  project: LocalProject;
  docs: ApiDocument[];
  readyDocs: ApiDocument[];
  allClauses: AggClause[];
  /** Rated clauses per level. Clauses without a risk level are in `unratedCount`. */
  riskCounts: Counts;
  unratedCount: number;
  catData: CatDatum[];
  keyFindings: { label: string; detail: string; severity: FindingSeverity; docTitle: string }[];
  attention: AggClause[];
  parties: string[];
  /** Each document's own extracted value; null when none was extracted. */
  valueByDoc: Map<string, number | null>;
  valueSegments: ValueSegment[];
  valueTotal: number;
  valueCurrency: string | null;
  reconciledAll: boolean | null;
  classByDoc: Map<string, ApiClassification>;
  analyzingClauses: boolean;
  /** Clauses across the analysed documents; null when no count is known yet. */
  totalClauses: number | null;
  highRisk: number;
  /** Worst rated clause level; null when no clause has a risk level. */
  overallRisk: RiskLevel | null;
  processingCount: number;
  hasAnalysis: boolean;
  /** Real current time, re-read every minute. */
  now: number;
  /** The signed-in user's role on this project, from the server. */
  role: ProjectRole;
  /** Owner and editors may upload into the project. */
  canUpload: boolean;
  /** Owner and editors may take a document out of the project. */
  canManageDocs: boolean;
  goTo: (t: TabId) => void;
  onDocReady: () => void;
  onDelete: (doc: ApiDocument) => void;
  onRemove: (doc: ApiDocument) => void;
};

/** What the signed-in user may do with one document: their role on the document
 *  itself (owner of their own uploads), which the server sends with every row. */
const docCan = (doc: ApiDocument, capability: Parameters<typeof can>[1]) => can(doc.role, capability);

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  // The projects list has its own load state: "not loaded yet" and "couldn't
  // load" must not read as "this project does not exist".
  const projectsSync = useProjectsSync();
  const router = useRouter();
  // Everything a person may do here follows from the role the server returned.
  const role: ProjectRole = project?.role ?? "viewer";
  const isOwner = role === "owner";
  const canUpload = can(role, "upload");
  const canManageDocs = can(role, "manage_documents");
  const docsQuery = useDocuments();
  const allDocs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);
  const qc = useQueryClient();
  const del = useDeleteDocument();
  const reprocess = useReprocess();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const now = useNow();
  // False on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, () => true, () => false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  // Not in the loaded list: it may have been shared a moment ago (the list is
  // re-read once a minute), so ask the server for this one project before
  // saying it does not exist. A 404 means it does not, or is not shared with you.
  const missing = mounted && !project && projectsSync.status === "ready" && !deletingProject;
  const probe = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => loadProject(projectId),
    enabled: missing,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameClient, setRenameClient] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [toRemove, setToRemove] = useState<ApiDocument | null>(null);
  const [removing, setRemoving] = useState(false);

  // `DELETE /projects/{id}`: the result is reported only once the server answers.
  // The list drops the project at once and gets it back if the server refuses.
  async function handleDeleteProject() {
    if (deletingProject) return;
    setDeletingProject(true);
    try {
      await deleteProject(projectId);
      // Its documents are kept, but are no longer shared with the other members.
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      toast.success("Project deleted", { description: "The project was removed. Its documents stay with whoever uploaded them." });
      router.push("/projects");
    } catch (e) {
      toast.error("The project was not deleted", { description: e instanceof Error ? e.message : "The server did not accept the change. Try again." });
      setDeletingProject(false);
      setConfirmDeleteProject(false);
    }
  }

  function openRename() {
    setRenameName(project?.name ?? "");
    setRenameClient(project?.client ?? "");
    setRenaming(true);
  }

  // `PUT /projects/{id}` (owner only).
  async function handleRename() {
    if (savingRename || !renameName.trim()) return;
    setSavingRename(true);
    try {
      await renameProject(projectId, renameName, renameClient);
      toast.success("Project updated");
      setRenaming(false);
    } catch (e) {
      toast.error("The project was not changed", { description: e instanceof Error ? e.message : "The server did not accept the change. Try again." });
    } finally {
      setSavingRename(false);
    }
  }

  // `DELETE /projects/{id}/documents/{docId}` (owner or editor). The document is kept.
  async function confirmRemove() {
    if (!toRemove || removing) return;
    const doc = toRemove;
    setRemoving(true);
    try {
      await removeDocFromProject(projectId, doc.docId);
      // Whether the remover still sees the document depends on who uploaded it.
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      toast.success("Removed from project", { description: doc.title || "Untitled document" });
    } catch (e) {
      toast.error("The document was not removed", { description: e instanceof Error ? e.message : "The server did not accept the change. Try again." });
    } finally {
      setRemoving(false);
      setToRemove(null);
    }
  }
  // Open on the Overview (project summary/rollup); the SOW clause details are
  // one tab away.
  const [tab, setTab] = useState<TabId>("overview");
  const [toDelete, setToDelete] = useState<ApiDocument | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  const docs = useMemo<ApiDocument[]>(() => {
    if (!project) return [];
    const byId = new Map(allDocs.map((d) => [d.docId, d]));
    return project.docIds.map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
  }, [project, allDocs]);

  const readyDocs = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);
  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  // Same cache keys as every other page that reads classifications.
  const { byDoc: classByDoc, loadingCount: classLoading } = useClassifications(docs);
  const analyzingClauses = readyDocs.length > 0 && classLoading > 0;

  const allClauses = useMemo<AggClause[]>(() => {
    const out: AggClause[] = [];
    for (const d of readyDocs) for (const c of classByDoc.get(d.docId)?.clauses ?? []) out.push({ ...c, _docId: d.docId, _docTitle: d.title });
    return out;
  }, [readyDocs, classByDoc]);

  // Rated clauses per level. A clause without a risk level is counted apart —
  // never as "low". Before the clause detail loads, the counts stored on each
  // document row are used.
  const { riskCounts, unratedCount } = useMemo(() => {
    const r: Counts = { low: 0, medium: 0, high: 0, critical: 0 };
    let unrated = 0;
    if (allClauses.length > 0) {
      for (const c of allClauses) { if (isRated(c)) r[c.riskLevel] += 1; else unrated += 1; }
    } else {
      for (const d of readyDocs) if (d.riskCounts) { r.low += d.riskCounts.low; r.medium += d.riskCounts.medium; r.high += d.riskCounts.high; r.critical += d.riskCounts.critical; unrated += d.riskCounts.unrated ?? 0; }
    }
    return { riskCounts: r, unratedCount: unrated };
  }, [allClauses, readyDocs]);

  const catData: CatDatum[] = useMemo(() => {
    const m = new Map<string, { count: number; rc: Counts }>();
    for (const c of allClauses) {
      const e = m.get(c.category) ?? { count: 0, rc: { low: 0, medium: 0, high: 0, critical: 0 } };
      e.count += 1;
      if (isRated(c)) e.rc[c.riskLevel] += 1;
      m.set(c.category, e);
    }
    return [...m.entries()].map(([name, v]) => ({ name, count: v.count, risk: worstOf(v.rc) })).sort((a, b) => b.count - a.count);
  }, [allClauses]);

  const keyFindings = useMemo(() => {
    const out: View["keyFindings"] = [];
    readyDocs.forEach((d) => (classByDoc.get(d.docId)?.keyFindings ?? []).forEach((f) => out.push({ ...f, docTitle: d.title })));
    return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  }, [readyDocs, classByDoc]);

  const attention = useMemo(
    () => allClauses
      .filter((c) => isRated(c) && (c.riskLevel === "critical" || c.riskLevel === "high"))
      .sort((a, b) => RISK_SORT[a.riskLevel] - RISK_SORT[b.riskLevel]),
    [allClauses],
  );

  // Contract value via the running-total model (SOW initial + amendment deltas),
  // from the figures the backend extracted and validated.
  const { valueSegments, valueTotal, valueByDoc, valueCurrency, reconciledAll } = useMemo(() => {
    const { total, segments, currency, reconciled } = computeContractValue(readyDocs.map((d) => ({
      docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt,
      classification: classByDoc.get(d.docId), persisted: persistedOf(d),
    })));
    return {
      valueSegments: segments, valueTotal: total, valueCurrency: currency,
      // Per-document "amount" = each document's OWN contract value (consistent
      // with the document reader and Insights), not its delta-contribution to
      // the running total. The base+deltas breakdown lives in the value bar.
      valueByDoc: new Map(readyDocs.map((d) => [d.docId, docValueOrNull(classByDoc.get(d.docId), persistedOf(d))])),
      reconciledAll: reconciled,
    };
  }, [readyDocs, classByDoc]);

  // Clause count: the loaded clauses, else the counts stored on the document
  // rows; null when neither is known (shown as nothing, not as 0).
  const storedClauseCounts = readyDocs.filter((d) => typeof d.clauseCount === "number");
  const totalClauses: number | null = allClauses.length > 0
    ? allClauses.length
    : storedClauseCounts.length > 0 ? storedClauseCounts.reduce((s, d) => s + (d.clauseCount as number), 0) : null;
  const highRisk = riskCounts.high + riskCounts.critical;
  const overallRisk = worstOf(riskCounts);
  const parties = useMemo(() => { const s = new Set<string>(); docs.forEach((d) => d.parties?.forEach((p) => s.add(p))); return Array.from(s); }, [docs]);

  const projectsLoading = projectsSync.status === "idle" || projectsSync.status === "loading";
  // While a delete is on the wire the project is already out of the list; hold
  // the skeleton rather than flash "not found" before the redirect (or the rollback).
  if (!mounted || (!project && (projectsLoading || deletingProject)) || (!!project && docsQuery.isLoading)) return <WorkspaceSkeleton />;
  if (!project) {
    if (projectsSync.status === "error") {
      return <LoadFailed message={projectsSync.error ?? "The request for your projects failed."} onRetry={() => void refreshProjects()} />;
    }
    if (missing && probe.isPending) return <WorkspaceSkeleton />;
    if (probe.isError && !isNotFound(probe.error)) {
      return <LoadFailed message={probe.error instanceof Error ? probe.error.message : "The request for this project failed."} onRetry={() => void probe.refetch()} />;
    }
    return <NotFound />;
  }
  // Without the documents list there is nothing truthful to show about this project.
  if (docsQuery.isError && !docsQuery.data) {
    return <LoadFailed message={docsQuery.error instanceof Error ? docsQuery.error.message : "The request for your documents failed."} onRetry={() => void docsQuery.refetch()} />;
  }

  const hasDocs = docs.length > 0;
  const hasAnalysis = allClauses.length > 0;
  const amendments = docs.filter((d) => d.docType === "AMENDMENT");

  async function confirmDelete() {
    if (!toDelete) return;
    const doc = toDelete;
    try {
      // The server deletes the document and takes it out of the project.
      await del.mutateAsync(doc.docId);
      toast.success("Document deleted", { description: doc.title || "Untitled document" });
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setToDelete(null);
    }
  }

  // Re-run the analysis pipeline on every document in the project that isn't
  // already processing and that this user may re-analyze. Each re-analysis is
  // independent, so we fire them all and report how many were re-queued even if
  // one fails.
  const reanalyzable = docs.filter((d) => docCan(d, "reprocess"));
  async function reanalyzeAll() {
    const targets = reanalyzable.filter((d) => !isProcessing(d.status));
    if (reanalyzing || targets.length === 0) return;
    setReanalyzing(true);
    try {
      const results = await Promise.allSettled(targets.map((d) => reprocess.mutateAsync(d.docId)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      qc.invalidateQueries({ queryKey: documentKeys.all });
      if (ok > 0) toast.success("Re-analyzing project", { description: `${ok} document${ok === 1 ? "" : "s"} are being analyzed again.` });
      if (failed > 0) toast.error("Some documents couldn't be re-analyzed", { description: `${failed} failed to re-queue. Try again.` });
    } finally {
      setReanalyzing(false);
    }
  }

  const v: View = {
    project, docs, readyDocs, allClauses, riskCounts, unratedCount, catData, keyFindings, attention, parties, now,
    valueByDoc, valueSegments, valueTotal, valueCurrency, reconciledAll,
    classByDoc, analyzingClauses, totalClauses, highRisk, overallRisk, processingCount, hasAnalysis,
    role, canUpload, canManageDocs,
    goTo: setTab,
    // An upload is filed in the project by the server (upload-url?projectId=),
    // and the dropzone refreshes the document list itself.
    onDocReady: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
    onDelete: (doc) => setToDelete(doc),
    onRemove: (doc) => setToRemove(doc),
  };
  const ownerEmail = projectOwnerEmail(project);

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "sow", label: "SOW", count: hasAnalysis && totalClauses !== null ? totalClauses : undefined },
    { id: "amendments", label: "Amendments", count: amendments.length || undefined },
    { id: "timeline", label: "Timeline" },
    { id: "team", label: "Team" },
    { id: "documents", label: "Documents", count: docs.length || undefined },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        title={project.name}
        subtitle={`${project.client ? `${project.client} · ` : ""}${hasDocs ? `${docs.length} document${docs.length === 1 ? "" : "s"}${processingCount > 0 ? ` · ${processingCount} analyzing` : ""}${totalClauses !== null ? ` · ${totalClauses.toLocaleString()} clause${totalClauses === 1 ? "" : "s"}` : ""}` : "No documents yet"}`}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="ai" size="lg" className="flex-1 sm:flex-none md:h-9" onClick={toggleCopilot}><Sparkles size={14} />Ask Sonar</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="md:h-9" aria-label="More actions">
                  <MoreHorizontal size={16} /><span className="hidden sm:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {reanalyzable.length > 0 && (
                  <DropdownMenuItem onClick={reanalyzeAll} disabled={reanalyzing || reanalyzable.every((d) => isProcessing(d.status))}>
                    <RefreshCw size={14} className={reanalyzing ? "animate-spin" : undefined} />
                    {reanalyzing ? "Re-analyzing…" : "Re-analyze all"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setTab("documents")}><FileText size={14} />Documents</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("team")}><Users size={14} />{isOwner ? <>Team &amp; invites</> : "Team"}</DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openRename}><Pencil size={14} />Rename project</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setConfirmDeleteProject(true)}
                      className="text-[var(--danger)] focus:text-[var(--danger)]"
                    >
                      <Trash2 size={14} />Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Dialog open={confirmDeleteProject} onOpenChange={(o) => !deletingProject && setConfirmDeleteProject(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
          </DialogHeader>
          <p className="text-base leading-relaxed text-[var(--ink-600)]">
            <strong className="font-semibold text-foreground">{project.name}</strong> will be removed as a project. Its documents stay in your library and can be regrouped later.
          </p>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setConfirmDeleteProject(false)} disabled={deletingProject}>Cancel</Button>
            <Button size="lg" className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 md:h-9" onClick={handleDeleteProject} disabled={deletingProject}>
              {deletingProject ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Deleting…</> : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming} onOpenChange={(o) => !savingRename && setRenaming(o)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <form id="rename-project" className="space-y-4" onSubmit={(e) => { e.preventDefault(); void handleRename(); }}>
            <div className="space-y-1.5">
              <label htmlFor="rename-project-name" className="block text-sm font-medium text-foreground">Project name</label>
              <Input id="rename-project-name" required maxLength={200} value={renameName} onChange={(e) => setRenameName(e.target.value)} className="h-10 border-[var(--ink-300)] text-base" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rename-project-client" className="block text-sm font-medium text-foreground">
                Client or counterparty <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input id="rename-project-client" maxLength={200} value={renameClient} onChange={(e) => setRenameClient(e.target.value)} className="h-10 border-[var(--ink-300)] text-base" />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setRenaming(false)} disabled={savingRename}>Cancel</Button>
            <Button type="submit" form="rename-project" size="lg" className="md:h-9" disabled={savingRename || !renameName.trim()}>
              {savingRename ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toRemove} onOpenChange={(o) => !o && !removing && setToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Remove from this project?</DialogTitle></DialogHeader>
          <p className="py-1 text-base leading-relaxed text-[var(--ink-600)]">
            <span className="font-semibold text-foreground">{toRemove?.title || "Untitled document"}</span> will be taken out of {project.name}. It is not deleted: it stays with whoever uploaded it, and the other people on this project lose access to it.
          </p>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setToRemove(null)} disabled={removing}>Cancel</Button>
            <Button variant="outline" size="lg" className="md:h-9" onClick={confirmRemove} disabled={removing}>
              {removing ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Removing…</> : <><Minus size={13} />Remove from project</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Someone else's project: say whose it is and what this role allows. */}
      {!isOwner && (
        <div className="border-b border-border bg-[var(--panel)]">
          <p className="app-container flex items-start gap-2 py-2.5 text-sm leading-relaxed text-[var(--ink-700)]">
            <Eye size={15} className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
            <span className="min-w-0 break-words">
              <span className="font-semibold text-foreground">Shared with you{ownerEmail ? ` by ${ownerEmail}` : ""}.</span>{" "}
              You are {role === "editor" ? "an editor" : "a viewer"}. {ROLE_META[role].summary}
            </span>
          </p>
        </div>
      )}

      <div className="border-b border-border bg-card">
        <div className="app-container">
          <nav className="-mb-px flex items-center gap-5 overflow-x-auto pr-4 scrollbar-none md:gap-6" aria-label="Project sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} data-active={tab === t.id || undefined} aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 border-transparent px-1 text-base font-medium text-[var(--ink-600)] outline-none transition-colors hover:border-[var(--ink-300)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  "data-[active=true]:border-[var(--brand-primary-600)] data-[active=true]:font-semibold data-[active=true]:text-[var(--brand-primary-700)]",
                )}>
                {t.label}
                {typeof t.count === "number" && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--ink-600)]">{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        {tab === "overview" && <OverviewPanel v={v} />}
        {tab === "sow" && <SowPanel v={v} />}
        {tab === "amendments" && <AmendmentsPanel amendments={amendments} v={v} />}
        {tab === "timeline" && <TimelinePanel v={v} />}
        {tab === "team" && <TeamPanel v={v} />}
        {tab === "documents" && <DocumentsPanel v={v} />}
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
          <p className="py-1 text-base leading-relaxed text-[var(--ink-600)]">
            <span className="font-semibold text-foreground">{toDelete?.title || "Untitled document"}</span> and its analysis will be permanently deleted, for everyone it is shared with. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setToDelete(null)} disabled={del.isPending}>Cancel</Button>
            <Button variant="outline" size="lg" onClick={confirmDelete} disabled={del.isPending} className="border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)] hover:border-[var(--danger)]/50 hover:bg-[var(--danger-soft)]">
              {del.isPending ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Deleting…</> : <><Trash2 size={13} className="mr-1.5" />Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Overview ──────────────────────────────────────────────────── */
function OverviewPanel({ v }: { v: View }) {
  if (!v.docs.length) return <UploadPrompt v={v} />;
  const ratedCount = sumCounts(v.riskCounts);
  return (
    <>
      <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-6">
        <div className="flex items-start gap-3.5">
          <SonarMark size="md" tile className="hidden sm:inline-flex" />
          <div className="min-w-0 flex-1">
            <h3 className="mb-1.5 text-sm font-semibold text-[var(--ai-ink)]">Sonar project overview</h3>
            {!v.hasAnalysis ? (
              <p className="text-base text-[var(--ink-600)]">{v.analyzingClauses || v.processingCount > 0 ? "Analyzing the documents in this project. The overview appears as each SOW finishes." : "Upload a SOW and Sonar will summarize the project here."}</p>
            ) : (
              <p className="max-w-[80ch] text-base leading-relaxed text-foreground">
                This project spans <strong>{v.readyDocs.length}</strong> analyzed document{v.readyDocs.length === 1 ? "" : "s"} and <strong>{v.allClauses.length.toLocaleString()}</strong> clause{v.allClauses.length === 1 ? "" : "s"}.{" "}
                {v.overallRisk === null ? (
                  <>None of them has a risk level yet, so the project&apos;s risk is not assessed.</>
                ) : (
                  <>
                    The highest clause risk level is <span className={`font-semibold ${RISK_META[v.overallRisk].text}`}>{RISK_META[v.overallRisk].label.toLowerCase()}</span>.{" "}
                    {v.highRisk > 0
                      ? <><strong>{v.highRisk}</strong> clause{v.highRisk === 1 ? " is" : "s are"} rated high or critical and need{v.highRisk === 1 ? "s" : ""} review.</>
                      : <>None of the {ratedCount.toLocaleString()} rated clause{ratedCount === 1 ? "" : "s"} is high or critical.</>}
                    {v.unratedCount > 0 && <> {v.unratedCount.toLocaleString()} clause{v.unratedCount === 1 ? " has" : "s have"} no risk level and {v.unratedCount === 1 ? "is" : "are"} not assessed.</>}
                  </>
                )}
                {v.parties.length > 0 && <> Parties named: {v.parties.slice(0, 3).join(", ")}{v.parties.length > 3 ? `, and ${v.parties.length - 3} more (all listed below)` : ""}.</>}
              </p>
            )}
          </div>
        </div>
      </section>

      {v.valueTotal > 0 && <ValueBar segments={v.valueSegments} total={v.valueTotal} currency={v.valueCurrency} reconciled={v.reconciledAll} />}

      {v.valueTotal > 0 && v.valueSegments.length >= 2 && (
        <MotionReveal delay={0.03}>
          <ContractValueChart segments={v.valueSegments} total={v.valueTotal} currency={v.valueCurrency} />
        </MotionReveal>
      )}

      {v.hasAnalysis && <CommercialTerms v={v} />}

      {v.hasAnalysis && (
        <MotionReveal delay={0.04}>
          <SowTimeline
            classifications={v.readyDocs.map((d) => v.classByDoc.get(d.docId)).filter((c): c is ApiClassification => !!c)}
            currency={v.valueCurrency}
          />
        </MotionReveal>
      )}

      {v.hasAnalysis && <MotionReveal><RiskIntelligence counts={v.riskCounts} categories={v.catData} unrated={v.unratedCount} /></MotionReveal>}

      {v.hasAnalysis && (
        <MotionReveal delay={0.05}>
          <section className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
            <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-7">
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Risk by category</h3>
              <ClauseHeatmap clauses={v.allClauses} />
            </div>
            <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-5">
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">Category coverage</h3>
              <CategoryRadar data={v.catData} />
            </div>
          </section>
        </MotionReveal>
      )}

      {v.attention.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><ShieldAlert size={16} className="shrink-0 text-[var(--danger)]" /><h3 className="text-lg font-semibold tracking-tight text-foreground">Clauses that need attention</h3></div>
            <button onClick={() => v.goTo("sow")} type="button" className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">All clauses<ArrowRight size={13} strokeWidth={2.25} /></button>
          </div>
          <div className="space-y-2.5">{v.attention.slice(0, 5).map((c, i) => <AttentionRow key={`${c._docId}-${c.number}-${i}`} c={c} />)}</div>
          {v.attention.length > 5 && (
            <p className="mt-3 text-sm text-[var(--ink-600)]">
              Showing the first 5 of {v.attention.length} clauses rated high or critical.{" "}
              <button onClick={() => v.goTo("sow")} type="button" className="inline-flex min-h-10 items-center rounded-md font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">See all {v.attention.length}</button>
            </p>
          )}
        </section>
      )}

      {v.parties.length > 0 && <PartiesCard parties={v.parties} />}
    </>
  );
}

function ValueBar({ segments, total, currency, reconciled }: { segments: ValueSegment[]; total: number; currency: string | null; reconciled: boolean | null }) {
  const [hover, setHover] = useState<number | null>(null);
  // `reconciled` is known when a document states a total: true = the extracted
  // parts add up to it; false = the stated total is shown but the parts did not
  // add up. null = no stated total to check the extracted amounts against.
  const authoritative = reconciled != null;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 bg-[var(--navy)] p-5 text-white md:p-6">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--navy-foreground)]">{authoritative ? "Total contract value" : "Extracted contract value"}</h3>
          <div className="mt-1.5 break-words text-3xl font-bold leading-none tabular-nums tracking-tight md:text-4xl">{fmtMoney(total, currency)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {reconciled === true && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--success)]" title="The document's stated total and the component amounts reconcile."><CheckCircle2 size={12} />Reconciled</span>}
          {reconciled === false && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--warning)]" title="Showing the document's stated total. The amounts extracted per document do not add up to it."><AlertTriangle size={12} />Stated total, parts don&apos;t add up</span>}
          {reconciled === null && <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white" title="Extracted from the documents. No stated total was available to reconcile it against.">Not reconciled</span>}
          <span className="text-sm text-[var(--navy-foreground)]">{segments.length} amount{segments.length === 1 ? "" : "s"}{currency ? "" : " · currency not extracted"}</span>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {segments.map((s, i) => (
            <div key={`${s.docId}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              className="h-full transition-opacity" title={`${s.label}: ${fmtMoney(s.value, currency)}${s.source ? `\n“${s.source}”` : ""}`}
              style={{ width: `${Math.max(0, (s.value / total) * 100)}%`, background: SEG_COLORS[i % SEG_COLORS.length], opacity: hover === null || hover === i ? 1 : 0.35 }} />
          ))}
        </div>

        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {segments.map((s, i) => (
            <li key={`${s.docId}-${i}`} className="min-w-0 max-w-full">
              <Link href={`/projects/${s.docId}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors hover:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
                style={{ opacity: hover === null || hover === i ? 1 : 0.5 }} title={s.source ?? undefined}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                <span className="min-w-0 break-words text-[var(--ink-600)]">{s.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{fmtMoney(s.value, currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-[80ch] text-xs leading-relaxed text-muted-foreground">
          {reconciled === true
            ? "Read from the documents and reconciled by the analysis: the amounts shown add up to the stated total."
            : reconciled === false
            ? "This is the total the documents state. The amounts extracted per document did not add up to it, so the last amount shown was adjusted to make the parts match. Check the figures in the documents."
            : "These are the amounts the analysis extracted from the documents. No stated total was found to reconcile them against, so the figure is not reconciled."}
        </p>
      </div>
    </section>
  );
}

/* ── Commercial terms — aggregated across the SOW AND every amendment ──── */
type Tagged<T> = T & { _src: string; _amend: boolean; _cur: string | null };

function CommercialTerms({ v }: { v: View }) {
  const now = v.now;

  // Pull a collection from every ready document, tagging each row with the
  // document it came from (so amendment additions are attributed), then drop
  // exact restatements that repeat verbatim across documents.
  function collect<T extends object>(pick: (c: ApiClassification) => T[] | undefined, key: (x: T) => string): Tagged<T>[] {
    const out: Tagged<T>[] = [];
    const seen = new Set<string>();
    for (const d of v.readyDocs) {
      const c = v.classByDoc.get(d.docId);
      if (!c) continue;
      for (const x of pick(c) ?? []) {
        const k = key(x);
        if (seen.has(k)) continue;
        seen.add(k);
        // Each amount keeps the currency of the document it was read from.
        out.push({ ...x, _src: d.title || "Untitled", _amend: d.docType === "AMENDMENT", _cur: docCurrency(d, c) });
      }
    }
    return out;
  }
  const ts = (s?: string | null) => (s ? new Date(s).getTime() || Infinity : Infinity);

  const deliverables = collect((c) => c.deliverables, (d) => `${d.name}|${d.dueDate ?? ""}|${d.value ?? ""}`)
    .sort((a, b) => ts(a.dueDate) - ts(b.dueDate));
  const milestones = collect((c) => c.timelineDetail?.milestones, (m) => `${m.name}|${m.date ?? ""}|${m.payment ?? ""}`)
    .sort((a, b) => ts(a.date) - ts(b.date));
  const schedule = collect((c) => c.commercials?.paymentSchedule, (p) => `${p.label}|${p.percent ?? ""}|${p.amount ?? ""}|${p.trigger ?? ""}`);
  const rateCard = collect((c) => c.commercials?.rateCard, (r) => `${r.role}|${r.rate ?? ""}|${r.unit ?? ""}`);
  const slas = collect((c) => c.slas, (s) => `${s.metric}|${s.target ?? ""}|${s.window ?? ""}`);
  const personnel = collect((c) => c.personnel, (p) => `${p.name ?? ""}|${p.role}`);

  // Consolidated deadlines: every dated obligation across all documents.
  const deadlines: { label: string; date: string; kind: string; amend: boolean }[] = [];
  for (const d of v.readyDocs) {
    const c = v.classByDoc.get(d.docId);
    if (!c) continue;
    const amend = d.docType === "AMENDMENT";
    for (const x of c.deliverables ?? []) if (x.dueDate) deadlines.push({ label: x.name, date: x.dueDate, kind: "Deliverable", amend });
    for (const m of c.timelineDetail?.milestones ?? []) if (m.date) deadlines.push({ label: m.name, date: m.date, kind: "Milestone", amend });
    for (const ph of c.timelineDetail?.phases ?? []) if (ph.end) deadlines.push({ label: `${ph.name} ends`, date: ph.end, kind: "Phase", amend });
    if (c.timelineDetail?.endDate) deadlines.push({ label: "Contract end", date: c.timelineDetail.endDate, kind: "Term", amend });
  }
  const seenD = new Set<string>();
  const allDeadlines = deadlines
    .filter((x) => { const k = `${x.label}|${x.date}`; if (seenD.has(k) || formatDate(x.date) === "—") return false; seenD.add(k); return true; })
    .sort((a, b) => ts(a.date) - ts(b.date));

  // Commercial facts — last non-null across documents (a later amendment that
  // restates a cap / payment terms wins over the SOW's original).
  let pricingModel = "", paymentTerms = "", caps: number | null = null, capsCurrency: string | null = null, expenses = "", latePayment = "";
  for (const d of v.readyDocs) {
    const com = v.classByDoc.get(d.docId)?.commercials;
    if (!com) continue;
    if (com.pricingModel && com.pricingModel !== "unknown") pricingModel = com.pricingModel;
    if (com.paymentTerms) paymentTerms = com.paymentTerms;
    if (com.caps != null) { caps = com.caps; capsCurrency = docCurrency(d, v.classByDoc.get(d.docId)); }
    if (com.expenses) expenses = com.expenses;
    if (com.latePayment) latePayment = com.latePayment;
  }
  const facts: { label: string; value: string }[] = [];
  if (pricingModel) facts.push({ label: "Pricing model", value: PRICING_LABEL[pricingModel] ?? pricingModel });
  if (paymentTerms) facts.push({ label: "Payment terms", value: paymentTerms });
  if (caps != null) facts.push({ label: "Not-to-exceed cap", value: fmtMoney(caps, capsCurrency) });
  if (expenses) facts.push({ label: "Expenses", value: expenses });
  if (latePayment) facts.push({ label: "Late payment", value: latePayment });

  const hasAnything = facts.length || schedule.length || rateCard.length || deliverables.length || milestones.length || slas.length || personnel.length || allDeadlines.length;
  if (!hasAnything) return null;

  return (
    <MotionReveal delay={0.04}>
      <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"><FileSignatureFallback />Commercial terms</h3>
        <p className="mb-4 text-sm text-[var(--ink-600)]">As extracted from the {v.readyDocs.length} analyzed document{v.readyDocs.length === 1 ? "" : "s"} in this project. Where a later document restates a term, the later one is shown.</p>

        {facts.length > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((f) => <Detail key={f.label} label={f.label} value={f.value} />)}
          </div>
        )}

        {allDeadlines.length > 0 && (
          <div className="mb-5">
            <TermsBlock title="Deadlines & key dates" count={allDeadlines.length}>
              {allDeadlines.map((dl, i) => {
                const t = new Date(dl.date).getTime();
                const overdue = !isNaN(t) && t < now;
                return (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                    <span className="flex min-w-0 flex-1 basis-[11rem] flex-wrap items-center gap-x-2 gap-y-1">
                      <CalendarClock size={13} className={`shrink-0 ${overdue ? "text-[var(--danger)]" : "text-muted-foreground"}`} />
                      <span className="min-w-0 break-words text-foreground">{dl.label}</span>
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-[var(--ink-600)]">{dl.kind}</span>
                      {dl.amend && <AmendTag />}
                    </span>
                    <span className={`tabular-nums ${overdue ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-600)]"}`}>
                      {overdue ? "Overdue · " : ""}{formatDate(dl.date)} · {formatRelativeDays(dl.date, new Date(now))}
                    </span>
                  </li>
                );
              })}
            </TermsBlock>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
          {schedule.length > 0 && (
            <TermsBlock title="Payment schedule" count={schedule.length}>
              {schedule.map((p, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><span className="min-w-0 break-words text-foreground">{p.label}{p.trigger ? <span className="text-muted-foreground"> · {p.trigger}</span> : null}</span>{p._amend && <AmendTag />}</span>
                  <span className="font-semibold tabular-nums text-foreground">{p.percent != null ? `${p.percent}%` : ""}{p.percent != null && p.amount != null ? " · " : ""}{p.amount != null ? fmtMoney(p.amount, p._cur) : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {milestones.length > 0 && (
            <TermsBlock title="Milestones" count={milestones.length}>
              {milestones.map((mst, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><Clock size={13} className="shrink-0 text-muted-foreground" /><span className="min-w-0 break-words text-foreground">{mst.name}</span>{mst._amend && <AmendTag />}</span>
                  <span className="tabular-nums text-[var(--ink-600)]">{mst.date ? formatDate(mst.date) : ""}{mst.payment != null ? ` · ${fmtMoney(mst.payment, mst._cur)}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {deliverables.length > 0 && (
            <TermsBlock title="Deliverables" count={deliverables.length}>
              {deliverables.map((d, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><span className="min-w-0 break-words text-foreground">{d.name}</span>{d._amend && <AmendTag />}</span>
                  <span className="tabular-nums text-[var(--ink-600)]">{d.dueDate ? formatDate(d.dueDate) : ""}{d.value != null ? ` · ${fmtMoney(d.value, d._cur)}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {rateCard.length > 0 && (
            <TermsBlock title="Rate card" count={rateCard.length}>
              {rateCard.map((r, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><span className="min-w-0 break-words text-foreground">{r.role}</span>{r._amend && <AmendTag />}</span>
                  <span className="font-semibold tabular-nums text-foreground">{r.rate != null ? fmtMoney(r.rate, r._cur) : "—"}{r.unit ? <span className="font-normal text-muted-foreground">/{r.unit}</span> : null}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {slas.length > 0 && (
            <TermsBlock title="Service levels" count={slas.length}>
              {slas.map((s, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><span className="min-w-0 break-words text-foreground">{s.metric}</span>{s._amend && <AmendTag />}</span>
                  <span className="tabular-nums text-[var(--ink-600)]">{s.target ?? ""}{s.window ? ` · ${s.window}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {personnel.length > 0 && (
            <TermsBlock title="Key personnel" count={personnel.length}>
              {personnel.map((p, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 basis-[11rem] items-center gap-1.5"><span className="min-w-0 break-words text-foreground">{p.name || p.role}{p.name ? <span className="text-muted-foreground"> · {p.role}</span> : null}</span>{p._amend && <AmendTag />}</span>
                  {p.keyPerson && <span className="shrink-0 rounded-full bg-[var(--brand-primary-50)] px-1.5 py-0.5 text-xs font-semibold text-[var(--brand-primary-700)]">Key person</span>}
                </li>
              ))}
            </TermsBlock>
          )}
        </div>
      </section>
    </MotionReveal>
  );
}

/** Small chip marking a row that an amendment introduced (vs. the original SOW). */
function AmendTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--warning)]" title="Added or changed by an amendment">
      <GitBranch size={11} />Amended
    </span>
  );
}

const PRICING_LABEL: Record<string, string> = {
  fixed: "Fixed fee", time_and_materials: "Time & materials", milestone: "Milestone-based", retainer: "Retainer", mixed: "Mixed", unknown: "—",
};

function FileSignatureFallback() {
  return <DollarSign size={16} className="shrink-0 text-[var(--success)]" />;
}

function TermsBlock({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-[var(--panel)] p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

/* ── SOW (filters + clause side panel) ─────────────────────────── */
function SowPanel({ v }: { v: View }) {
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<string>(ALL);
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<AggClause | null>(null);
  const [sort, setSort] = useState<"risk" | "number">("risk");

  const categories = useMemo(() => Array.from(new Set(v.allClauses.map((c) => c.category))).sort(), [v.allClauses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...v.allClauses]
      .filter((c) => (risk === ALL || (risk === UNRATED ? !isRated(c) : isRated(c) && c.riskLevel === risk)) && (category === "all" || c.category === category) && (!term || `${c.number} ${c.title} ${categoryLabel(c.category)} ${c.summary} ${c._docTitle}`.toLowerCase().includes(term)))
      .sort((a, b) => sort === "number"
        ? a._docTitle.localeCompare(b._docTitle) || a.number.localeCompare(b.number, undefined, { numeric: true })
        // Clauses without a risk level sort after every rated one.
        : (isRated(a) ? RISK_SORT[a.riskLevel] : 4) - (isRated(b) ? RISK_SORT[b.riskLevel] : 4));
  }, [v.allClauses, q, risk, category, sort]);

  if (!v.hasAnalysis) return <AnalyzingOrEmpty v={v} label="Clause analysis appears here once a SOW finishes processing." />;

  const riskLevels: RiskLevel[] = ["critical", "high", "medium", "low"];
  const filterGroups: FilterGroup[] = [
    {
      id: "risk", label: "Risk", value: risk, onChange: setRisk,
      options: [
        ...riskLevels.filter((r) => v.riskCounts[r] > 0).map((r) => ({ value: r as string, label: RISK_META[r].label, count: v.riskCounts[r], dot: RISK_DOT[r] })),
        ...(v.unratedCount > 0 ? [{ value: UNRATED, label: UNRATED_META.label, count: v.unratedCount }] : []),
      ],
    },
    { id: "category", label: "Category", as: "select", allLabel: "All categories", value: category, onChange: setCategory, options: categories.map((c) => ({ value: c, label: categoryLabel(c) })) },
  ];
  const clearFilters = () => { setQ(""); setRisk(ALL); setCategory("all"); };

  return (
    <>
      <ListFilters
        className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
        search={q}
        onSearch={setQ}
        placeholder="Search clauses, categories, documents"
        groups={filterGroups}
        sort={{ value: sort, onChange: (val) => setSort(val as "risk" | "number"), options: [{ value: "risk", label: "Highest risk first" }, { value: "number", label: "Document and clause order" }] }}
        shown={filtered.length}
        total={v.allClauses.length}
        noun="clauses"
        onClear={clearFilters}
      />

      {/* clauses */}
      {filtered.length === 0 ? (
        <NoResults noun="clauses" onClear={clearFilters} />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <ul className="divide-y divide-[var(--ink-100)] lg:max-h-[640px] lg:overflow-y-auto">
            {filtered.map((c, i) => {
              const m = clauseRiskMeta(c);
              return (
                <li key={`${c._docId}-${c.number}-${i}`}>
                  <button type="button" onClick={() => setSelected(c)} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="font-mono text-xs text-muted-foreground">{c.number}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${m.bg} ${m.text}`}>{clauseRiskText(c)}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(c.category)}</span>
                      </div>
                      <div className="break-words text-base font-semibold text-foreground">{c.title || c.number}</div>
                      {c.summary && <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-[var(--ink-600)]">{c.summary}</p>}
                      <p className="mt-1 break-words text-xs text-muted-foreground">{c._docTitle}</p>
                    </div>
                    <ArrowRight size={15} className="mt-1 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* clause detail side panel */}
      <ClauseSheet
        clause={selected}
        related={selected ? v.allClauses.filter((c) => c.category === selected.category && !(c._docId === selected._docId && c.number === selected.number)).slice(0, 6) : []}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function ClauseSheet({ clause, related, onClose }: { clause: AggClause | null; related: AggClause[]; onClose: () => void }) {
  return (
    <Sheet open={!!clause} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-full gap-0 sm:max-w-xl">
        {/* Keyed by clause, so the drafted revision belongs to the clause on screen. */}
        {clause && <ClauseSheetBody key={`${clause._docId}:${clause.number}`} clause={clause} related={related} />}
      </SheetContent>
    </Sheet>
  );
}

function ClauseSheetBody({ clause, related }: { clause: AggClause; related: AggClause[] }) {
  const m = clauseRiskMeta(clause);
  const [sug, setSug] = useState<{ loading: boolean; text: string | null; err: string | null }>({ loading: false, text: null, err: null });

  // Top-KNN: semantically similar clauses across all the tenant's documents.
  const similar = useQuery({
    queryKey: [...documentKeys.detail(clause._docId), "similar", clause.number],
    queryFn: () => getSimilarClauses(clause._docId, clause.number, 5),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const similarItems = similar.data ?? [];

  async function generate() {
    setSug({ loading: true, text: null, err: null });
    try {
      const q = `Suggest an improved, more balanced revision of clause ${clause.number}${clause.title ? ` (${clause.title})` : ""} that reduces our risk while staying fair to both parties. Return only the revised clause text, with no preamble.`;
      const res = await askSonar(clause._docId, q);
      setSug({ loading: false, text: res.answer, err: null });
    } catch (e) {
      setSug({ loading: false, text: null, err: e instanceof Error ? e.message : "Could not generate a suggestion." });
    }
  }

  return (
          <>
            <SheetHeader className="border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${m.bg} ${m.text}`}>{clauseRiskText(clause)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(clause.category)}</span>
                <span className="font-mono text-xs text-muted-foreground">Clause {clause.number}</span>
              </div>
              <SheetTitle className="mt-1 text-lg">{clause.title || `Clause ${clause.number}`}</SheetTitle>
              <SheetDescription>From <span className="font-medium text-foreground">{clause._docTitle}</span></SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* Original */}
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-foreground">Original clause</h4>
                <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-[var(--panel)] p-3 text-sm leading-relaxed text-foreground">{clause.body || "No clause text was extracted."}</p>
              </div>

              {/* Suggested (real, generated by Sonar on request) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ai-ink)]"><Sparkles size={13} />Suggested revision by Sonar</h4>
                  {sug.text && !sug.loading && <button type="button" onClick={generate} className="inline-flex min-h-10 items-center rounded-md px-1 text-sm font-semibold text-[var(--ai-ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-ink)] md:min-h-0">Regenerate</button>}
                </div>
                {sug.loading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] p-3 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" />Sonar is drafting a revision from this contract&apos;s clauses…</div>
                ) : sug.text ? (
                  <p className="whitespace-pre-wrap rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] p-3 text-sm leading-relaxed text-foreground">{sug.text}</p>
                ) : sug.err ? (
                  <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]">{sug.err}</div>
                ) : (
                  <button type="button" onClick={generate} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--ai-ink)] bg-[var(--ai-surface)] p-3 text-sm font-semibold text-[var(--ai-ink)] transition-colors hover:border-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-ink)]">
                    <Sparkles size={13} />Ask Sonar to draft a more balanced version
                  </button>
                )}
              </div>

              {clause.summary && (
                <div>
                  <h4 className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ai-ink)]"><Sparkles size={12} />Sonar&apos;s analysis</h4>
                  <p className="text-base leading-relaxed text-[var(--ink-700)]">{clause.summary}</p>
                </div>
              )}

              {related.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-sm font-semibold text-foreground">Related clauses · {categoryLabel(clause.category)}</h4>
                  <ul className="space-y-1.5">
                    {related.map((r, i) => {
                      const rm = clauseRiskMeta(r);
                      return (
                        <li key={`${r._docId}-${r.number}-${i}`}>
                          <Link href={`/projects/${r._docId}/sow`} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="font-mono text-xs text-muted-foreground">{r.number}</span>
                            <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{r.title || r.number}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${rm.bg} ${rm.text}`}>{rm.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Top-KNN: semantically similar clauses across every document, by
                  embedding similarity (not just same-category). */}
              {(similar.isLoading || similar.isError || similarItems.length > 0) && (
                <div>
                  <h4 className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Layers size={12} />Similar clauses · across your documents
                  </h4>
                  {similar.isLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <Loader2 size={13} className="animate-spin" />Finding the most similar clauses…
                    </div>
                  ) : similar.isError ? (
                    <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-[var(--ink-600)]">Similar clauses couldn&apos;t be loaded, so none are shown. That does not mean there are none.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {similarItems.map((s, i) => (
                        <li key={`${s.docId}-${s.clauseNumber}-${i}`}>
                          <Link href={`/projects/${s.docId}/sow`} className="block rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{s.clauseNumber}</span>
                              <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{s.docTitle || "Untitled document"}</span>
                              <span className="shrink-0 rounded-full bg-[var(--brand-primary-50)] px-1.5 py-0.5 text-xs font-semibold text-[var(--brand-primary-700)]">{Math.min(100, Math.round(s.score * 100))}% similarity</span>
                            </div>
                            {s.text && <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--ink-600)]">{s.text}</p>}
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-[var(--ink-600)]">{s.docType}</span>
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(s.category)}</span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail label="Risk level" value={m.label} />
                <Detail label="Category" value={categoryLabel(clause.category)} />
                <Detail label="Clause number" value={clause.number} />
                <Detail label="Source file" value={clause._docTitle} />
              </div>
            </div>

            <SheetFooter className="border-t border-border">
              <Button size="lg" asChild>
                <Link href={`/projects/${clause._docId}`}><FileText size={14} />Open document</Link>
              </Button>
            </SheetFooter>
          </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-base font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

/* ── Amendments ────────────────────────────────────────────────── */
function AmendmentsPanel({ amendments, v }: { amendments: ApiDocument[]; v: View }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState<"updated" | "title">("updated");

  if (!v.docs.length) return <UploadPrompt v={v} />;
  if (amendments.length === 0) return <EmptyPanel icon={<GitBranch size={22} strokeWidth={1.5} />} title="No amendments yet" body="Upload an amendment to a contract in this project and it'll appear here, diffed against the original." />;

  const term = q.trim().toLowerCase();
  const shown = amendments
    .filter((d) => (status === ALL || docStatusKey(d) === status) && (!term || (d.title || "Untitled amendment").toLowerCase().includes(term)))
    .sort((a, b) => (sort === "title" ? (a.title || "").localeCompare(b.title || "") : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  const filterGroups: FilterGroup[] = [statusGroup(amendments, status, setStatus)];
  const clearFilters = () => { setQ(""); setStatus(ALL); };

  return (
    <>
      <ListFilters
        className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
        search={q}
        onSearch={setQ}
        placeholder="Search amendments"
        groups={filterGroups}
        sort={{ value: sort, onChange: (val) => setSort(val as "updated" | "title"), options: [{ value: "updated", label: "Recently updated" }, { value: "title", label: "Title A to Z" }] }}
        shown={shown.length}
        total={amendments.length}
        noun="amendments"
        onClear={clearFilters}
      />
      {shown.length === 0 ? (
        <NoResults noun="amendments" onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {shown.map((d) => (
            <Link key={d.docId} href={`/projects/${d.docId}/amendments`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-[box-shadow,border-color] hover:border-[var(--brand-primary-300)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><GitBranch size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="break-words text-base font-semibold text-foreground">{d.title || "Untitled amendment"}</div>
                <div className="mt-0.5 text-sm text-[var(--ink-600)]">v{d.latestVersion} · updated {formatRelativeDays(d.updatedAt, new Date(v.now))}{v.valueByDoc.get(d.docId) ? ` · ${fmtMoney(v.valueByDoc.get(d.docId)!, docCurrency(d, v.classByDoc.get(d.docId)))}` : ""}</div>
              </div>
              <ArrowRight size={15} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/** Status filter group shared by the project's document lists. */
function statusGroup(docs: ApiDocument[], value: string, onChange: (value: string) => void): FilterGroup {
  return {
    id: "status", label: "Status", value, onChange,
    options: (["ready", "analyzing", "failed"] as const)
      .map((k) => ({ value: k, label: DOC_STATUS_LABEL[k], count: docs.filter((d) => docStatusKey(d) === k).length }))
      .filter((o) => o.count > 0),
  };
}

/** Document-type filter group built from the types present in the list. */
function typeGroup(docs: ApiDocument[], value: string, onChange: (value: string) => void): FilterGroup {
  const types = Array.from(new Set(docs.map((d) => d.docType)));
  return { id: "type", label: "Type", value, onChange, options: types.map((t) => ({ value: t, label: t, count: docs.filter((d) => d.docType === t).length })) };
}

/* ── Timeline + activity ───────────────────────────────────────── */
function TimelinePanel({ v }: { v: View }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  if (!v.docs.length) return <UploadPrompt v={v} />;

  const term = q.trim().toLowerCase();
  const items = v.docs
    .filter((d) => (type === ALL || d.docType === type) && (status === ALL || docStatusKey(d) === status) && (!term || (d.title || "Untitled").toLowerCase().includes(term)))
    .sort((a, b) => (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * (sort === "oldest" ? -1 : 1));
  const filterGroups: FilterGroup[] = [typeGroup(v.docs, type, setType), statusGroup(v.docs, status, setStatus)];
  const clearFilters = () => { setQ(""); setType(ALL); setStatus(ALL); };
  const statusText = (d: ApiDocument) => d.status === "READY" ? "Analysis completed" : d.status === "FAILED" ? "Processing failed" : "Processing…";
  const statusTone = (d: ApiDocument) => d.status === "READY" ? "bg-[var(--success-soft)] text-[var(--success)]" : d.status === "FAILED" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]";
  return (
    <>
      <ListFilters
        className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
        search={q}
        onSearch={setQ}
        placeholder="Search activity"
        groups={filterGroups}
        sort={{ value: sort, onChange: (val) => setSort(val as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
        shown={items.length}
        total={v.docs.length}
        noun="documents"
        onClear={clearFilters}
      />
      {items.length === 0 ? (
        <NoResults noun="documents" onClear={clearFilters} />
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
          <h3 className="mb-5 text-lg font-semibold tracking-tight text-foreground">Timeline &amp; activity</h3>
          <ol className="relative space-y-5 border-l border-[var(--ink-300)] pl-5 md:pl-6">
            {items.map((d) => (
              <li key={d.docId} className="relative">
                <span className="absolute -left-[1.6rem] top-1 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-card bg-[var(--brand-primary-600)] md:-left-[1.85rem]" aria-hidden />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <Link href={`/projects/${d.docId}`} className="break-words rounded-sm text-base font-semibold text-foreground hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{d.title || "Untitled"}</Link>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-[var(--ink-600)]">{d.docType}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(d)}`}>{statusText(d)}</span>
                </div>
                <div className="mt-1 text-sm text-[var(--ink-600)]">Added {formatDate(d.createdAt)}{d.effectiveDate ? ` · effective ${formatDate(d.effectiveDate)}` : ""} · updated {formatRelativeDays(d.updatedAt, new Date(v.now))}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/* ── Team ──────────────────────────────────────────────────────── */
function TeamPanel({ v }: { v: View }) {
  const { user } = useAuth();
  const router = useRouter();
  // Everyone on the project, owner first (the server lists the owner as a member).
  const members = projectMembers(v.project);
  const canManage = can(v.role, "invite");
  const [inviting, setInviting] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  // Client-side filtering of the member list.
  const term = q.trim().toLowerCase();
  const shown = members.filter((m) => (roleFilter === ALL || m.role === roleFilter) && (statusFilter === ALL || m.status === statusFilter) && (!term || m.email.toLowerCase().includes(term)));
  const roles = Array.from(new Set(members.map((m) => m.role)));
  const statuses = Array.from(new Set(members.map((m) => m.status).filter(Boolean)));
  const filterGroups: FilterGroup[] = [
    { id: "role", label: "Role", value: roleFilter, onChange: setRoleFilter, options: roles.map((r) => ({ value: r, label: ROLE_META[r].label, count: members.filter((m) => m.role === r).length })) },
    { id: "status", label: "Status", value: statusFilter, onChange: setStatusFilter, options: statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: members.filter((m) => m.status === s).length })) },
  ];
  const filtering = activeFilterCount(q, filterGroups) > 0;
  const clearFilters = () => { setQ(""); setRoleFilter(ALL); setStatusFilter(ALL); };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Team</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">
            The people who can open {v.project.name}, and what each may do.{" "}
            {canManage ? "Manage everyone across your projects in" : "See every project you are on in"}{" "}
            <Link href="/settings/team" className="font-semibold text-[var(--brand-primary-600)] hover:underline">Settings</Link>.
          </p>
        </div>
        {canManage && (
          <Button size="lg" className="w-full shrink-0 sm:w-auto" onClick={() => setInviting(true)}>
            <Plus size={14} />Invite people
          </Button>
        )}
      </div>
      {canManage && <InviteDialog open={inviting} onClose={() => setInviting(false)} projects={[v.project]} lockedProjectId={v.project.id} />}

      {members.length > 1 && (
        <ListFilters
          className="mt-5 border-t border-[var(--ink-100)] pt-5"
          search={q}
          onSearch={setQ}
          placeholder="Search people by email"
          groups={filterGroups}
          shown={shown.length}
          total={members.length}
          noun="people"
          onClear={clearFilters}
        />
      )}

      {filtering && shown.length === 0 ? (
        <div className="mt-4"><NoResults noun="people" onClear={clearFilters} /></div>
      ) : (
        <div className="mt-4">
          <ProjectMemberList
            project={v.project}
            members={shown}
            canManage={canManage}
            currentEmail={user?.email}
            onLeft={() => router.push("/projects")}
          />
        </div>
      )}
    </section>
  );
}

/* ── Documents (file tree: SOW → nested amendments) ───────────── */
function buildTree(docs: ApiDocument[]) {
  const inProject = new Set(docs.map((d) => d.docId));
  const childrenByParent = new Map<string, ApiDocument[]>();
  const roots: ApiDocument[] = [];
  for (const d of docs) {
    if (d.parentDocId && inProject.has(d.parentDocId)) {
      const arr = childrenByParent.get(d.parentDocId) ?? [];
      arr.push(d);
      childrenByParent.set(d.parentDocId, arr);
    } else roots.push(d);
  }
  const byDate = (a: ApiDocument, b: ApiDocument) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  roots.sort((a, b) => (a.docType === "AMENDMENT" ? 1 : 0) - (b.docType === "AMENDMENT" ? 1 : 0) || byDate(a, b));
  childrenByParent.forEach((arr) => arr.sort(byDate));
  return { roots, childrenByParent };
}

function DocumentsPanel({ v }: { v: View }) {
  const [showUpload, setShowUpload] = useState(!v.docs.length && v.canUpload);
  const [reader, setReader] = useState<ApiDocument | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState<"tree" | "updated" | "title">("tree");
  const { roots, childrenByParent } = useMemo(() => buildTree(v.docs), [v.docs]);

  // Client-side filtering. With a filter or a non-tree sort the list is flat;
  // otherwise amendments stay nested under the contract they amend.
  const filterGroups: FilterGroup[] = [typeGroup(v.docs, type, setType), statusGroup(v.docs, status, setStatus)];
  const filtering = activeFilterCount(q, filterGroups) > 0;
  const term = q.trim().toLowerCase();
  const matches = v.docs.filter((d) => (type === ALL || d.docType === type) && (status === ALL || docStatusKey(d) === status) && (!term || (d.title || "Untitled document").toLowerCase().includes(term)));
  const flat = [...matches].sort((a, b) => (sort === "title" ? (a.title || "").localeCompare(b.title || "") : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  const clearFilters = () => { setQ(""); setType(ALL); setStatus(ALL); };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Documents</h3>
        {v.canUpload
          ? v.docs.length > 0 && <Button size="lg" className="md:h-9" aria-expanded={showUpload} onClick={() => setShowUpload((s) => !s)}><Plus size={14} />Add document</Button>
          : <p className="text-sm text-[var(--ink-600)]">{readOnlyReason(v.role)}</p>}
      </div>

      {v.canUpload && (showUpload || !v.docs.length) && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
          <p className="mb-3 text-sm text-[var(--ink-600)]">Drop a contract or an amendment. It is filed in this project and shared with everyone on it. Amendments nest under the contract they amend.</p>
          <UploadDropzone projectId={v.project.id} defaultDocType="SOW" compact onDocReady={v.onDocReady} />
        </section>
      )}

      {!v.canUpload && !v.docs.length && <NoDocuments v={v} />}

      {v.docs.length > 0 && (
        <ListFilters
          className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
          search={q}
          onSearch={setQ}
          placeholder="Search documents"
          groups={filterGroups}
          sort={{ value: sort, onChange: (val) => setSort(val as "tree" | "updated" | "title"), options: [{ value: "tree", label: "Contract, then amendments" }, { value: "updated", label: "Recently updated" }, { value: "title", label: "Title A to Z" }] }}
          shown={matches.length}
          total={v.docs.length}
          noun="documents"
          onClear={clearFilters}
        />
      )}

      {v.docs.length > 0 && (matches.length === 0 ? (
        <NoResults noun="documents" onClear={clearFilters} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {filtering || sort !== "tree"
            ? flat.map((d) => <DocRow key={d.docId} doc={d} value={v.valueByDoc.get(d.docId)} currency={docCurrency(d, v.classByDoc.get(d.docId))} now={v.now} depth={0} canRemove={v.canManageDocs} onRemove={() => v.onRemove(d)} onDelete={() => v.onDelete(d)} onView={() => setReader(d)} />)
            : <DocTree nodes={roots} childrenByParent={childrenByParent} depth={0} v={v} onView={setReader} />}
        </div>
      ))}

      <DocumentReader
        doc={reader}
        classification={reader ? v.classByDoc.get(reader.docId) : undefined}
        onClose={() => setReader(null)}
      />
    </>
  );
}

function DocTree({ nodes, childrenByParent, depth, v, onView }: { nodes: ApiDocument[]; childrenByParent: Map<string, ApiDocument[]>; depth: number; v: View; onView: (d: ApiDocument) => void }) {
  return (
    <>
      {nodes.map((d) => {
        const kids = childrenByParent.get(d.docId) ?? [];
        return (
          <Fragment key={d.docId}>
            <DocRow doc={d} value={v.valueByDoc.get(d.docId)} currency={docCurrency(d, v.classByDoc.get(d.docId))} now={v.now} depth={depth} canRemove={v.canManageDocs} onRemove={() => v.onRemove(d)} onDelete={() => v.onDelete(d)} onView={() => onView(d)} />
            {kids.length > 0 && <DocTree nodes={kids} childrenByParent={childrenByParent} depth={depth + 1} v={v} onView={onView} />}
          </Fragment>
        );
      })}
    </>
  );
}

function DocRow({ doc, value, currency, now, depth, canRemove, onRemove, onDelete, onView }: { doc: ApiDocument; value?: number | null; currency: string | null; now: number; depth: number; canRemove: boolean; onRemove: () => void; onDelete: () => void; onView: () => void }) {
  const processing = isProcessing(doc.status);
  // Per document, from the role the server sent with it: an editor may
  // re-analyze any document here but delete only the ones they uploaded.
  const canReanalyze = docCan(doc, "reprocess");
  const canDelete = docCan(doc, "delete_document");
  const risk = doc.status === "READY" ? docOverallRisk(doc) : null;
  const indent = 16 + depth * 20;
  const reprocess = useReprocess();

  async function onReanalyze() {
    try {
      await reprocess.mutateAsync(doc.docId);
      toast.success("Re-analyzing", { description: `${doc.title || "Document"} is being analyzed again.` });
    } catch (e) {
      toast.error("Couldn't re-analyze", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }

  const rowAction = "h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--ink-600)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const name = doc.title || "document";

  return (
    <div className={cn("flex items-center gap-1 border-t border-[var(--ink-100)] pr-2 transition-colors first:border-t-0 hover:bg-[var(--panel)] md:pr-3", depth > 0 && "bg-[var(--panel)]")}>
      {/* Indent is computed from tree depth. */}
      <Link href={`/projects/${doc.docId}`} className="group flex min-w-0 flex-1 items-center gap-2.5 py-3.5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" style={{ paddingLeft: indent }}>
        {depth > 0 && <GitBranch size={14} className="shrink-0 -scale-x-100 text-muted-foreground" />}
        <StatusDot doc={doc} />
        <div className="min-w-0 flex-1">
          <div className="break-words text-base font-semibold text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">{doc.title || "Untitled document"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--ink-600)]">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">{doc.docType}</span>
            {processing ? <span className="inline-flex items-center gap-1 font-medium text-[var(--warning)]"><Loader2 size={12} className="animate-spin" />Analyzing…</span>
              : doc.status === "FAILED" ? <span className="font-medium text-[var(--danger)]">Processing failed</span>
              : <>{typeof doc.clauseCount === "number" ? `${doc.clauseCount.toLocaleString()} clause${doc.clauseCount === 1 ? "" : "s"} · ` : ""}updated {formatRelativeDays(doc.updatedAt, new Date(now))}</>}
            {typeof value === "number" && value > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--success)] sm:hidden" title="Value extracted for this document">{fmtMoney(value, currency)}</span>
            )}
            {risk && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold sm:hidden ${RISK_META[risk].bg} ${RISK_META[risk].text}`}>{RISK_LABEL[risk]} risk</span>
            )}
          </div>
        </div>
        {typeof value === "number" && value > 0 && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--success)] sm:inline-flex" title="Value extracted for this document">{fmtMoney(value, currency)}</span>
        )}
        {risk && (
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline ${RISK_META[risk].bg} ${RISK_META[risk].text}`} title="Highest clause risk level in this document">{RISK_LABEL[risk]} risk</span>
        )}
      </Link>

      {/* md and up: inline icon actions */}
      <button type="button" onClick={onView} aria-label={`Open ${name} in split view`} title="Open document & analysis side by side" className={cn("hidden md:inline-flex hover:bg-muted hover:text-foreground", rowAction)}>
        <Maximize2 size={16} />
      </button>
      {canReanalyze && (
        <button type="button" onClick={onReanalyze} disabled={reprocess.isPending || processing} aria-label={`Re-analyze ${name}`} title="Re-run analysis on this document" className={cn("hidden md:inline-flex hover:bg-muted hover:text-foreground disabled:opacity-40", rowAction)}>
          <RefreshCw size={16} className={reprocess.isPending ? "animate-spin" : undefined} />
        </button>
      )}
      {canRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${name} from this project`} title="Remove from this project (the document is kept)" className={cn("hidden md:inline-flex hover:bg-muted hover:text-foreground", rowAction)}>
          <Minus size={16} />
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={onDelete} aria-label={`Delete ${name}`} title="Delete this document permanently" className={cn("hidden md:inline-flex hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]", rowAction)}>
          <Trash2 size={16} />
        </button>
      )}

      {/* below md: the same actions in one menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Actions for ${name}`} className={cn("inline-flex md:hidden hover:bg-muted hover:text-foreground", rowAction)}>
            <MoreHorizontal size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={onView}><Maximize2 size={14} />Open with analysis</DropdownMenuItem>
          {canReanalyze && <DropdownMenuItem onClick={onReanalyze} disabled={reprocess.isPending || processing}><RefreshCw size={14} />Re-analyze</DropdownMenuItem>}
          {canRemove && <DropdownMenuItem onClick={onRemove}><Minus size={14} />Remove from project</DropdownMenuItem>}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-[var(--danger)] focus:text-[var(--danger)]"><Trash2 size={14} />Delete</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ── Split-view reader: original file ⟷ AI analysis (with provenance) ── */
function DocumentReader({ doc, classification, onClose }: { doc: ApiDocument | null; classification?: ApiClassification; onClose: () => void }) {
  // The original file, plus its converted form where the browser needs one
  // (DOCX → HTML, TXT → text). PDFs render through an <iframe>.
  const docId = doc?.docId ?? "";
  const preview = useQuery({
    queryKey: [...documentKeys.detail(docId), "file-preview"],
    enabled: !!docId,
    // The file link is short-lived, so it is fetched again each time the reader opens.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async (): Promise<{ file: ApiDocFile; html: string | null; text: string | null }> => {
      const f = await getDocFile(docId);
      const name = f.filename.toLowerCase();
      const isDocx = name.endsWith(".docx") || f.contentType.includes("wordprocessingml");
      const isTxt = f.contentType.startsWith("text/") || name.endsWith(".txt");
      if (isDocx) {
        const buf = await (await fetch(f.url)).arrayBuffer();
        const mammoth = await import("mammoth/mammoth.browser");
        const res = await mammoth.convertToHtml({ arrayBuffer: buf });
        // The converter does not sanitise link targets, so the markup is
        // rebuilt from an allowlist before it is injected below.
        return { file: f, html: sanitizeDocumentHtml(res.value) || "<p>This document has no extractable text.</p>", text: null };
      }
      if (isTxt) return { file: f, html: null, text: await (await fetch(f.url)).text() };
      // .doc / other types fall back to "open original".
      return { file: f, html: null, text: null };
    },
  });
  const file = preview.data?.file ?? null;
  const html = preview.data?.html ?? null;
  const text = preview.data?.text ?? null;
  const loading = preview.isLoading;
  const err = preview.isError ? (preview.error instanceof Error ? preview.error.message : "Could not load the document.") : null;

  const fname = file?.filename.toLowerCase() ?? "";
  const isPdf = file?.contentType === "application/pdf" || fname.endsWith(".pdf");
  const lineItems = classification?.validation?.lineItems ?? [];
  const findings = classification?.keyFindings ?? [];
  const reconciled = doc?.reconciled ?? classification?.validation?.reconciled;
  const value = docValueOrNull(classification, doc ? persistedOf(doc) : undefined);
  // The document's own currency; an amount with no extracted currency prints without a symbol.
  const currency = doc ? docCurrency(doc, classification) : null;

  // GDPR data portability — export this document's record + analysis as JSON.
  function exportJson() {
    if (!doc) return;
    const payload = { exportedAt: new Date().toISOString(), document: doc, analysis: classification ?? null };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(doc.title || "document").replace(/[^\w.-]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 ring-0 sm:max-w-none">
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border py-2 pl-4 pr-2 md:py-3">
          <DialogTitle className="flex min-w-0 items-center gap-2 text-base font-semibold md:text-lg">
            <FileText size={15} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{doc?.title || "Document"}</span>
          </DialogTitle>
          <div className="mr-10 flex shrink-0 items-center gap-2">
            <button onClick={exportJson} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9" title="Export this document's data + analysis as JSON"><Download size={14} /><span className="hidden sm:inline">Export</span><span className="sr-only sm:hidden">Export</span></button>
            {file && <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9"><ExternalLink size={14} /><span className="hidden sm:inline">Original</span><span className="sr-only sm:hidden">Open original</span></a>}
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          {/* Original file (PDF inline · DOCX converted · TXT · else download).
              Below lg the panes stack and the dialog body scrolls, with the
              analysis first (order-1) and the file beneath it; lg+ puts the file
              on the left and the analysis on the right, each scrolling on its own. */}
          <div id="reader-file" className="order-2 min-h-[70dvh] overflow-hidden border-t border-border bg-muted lg:order-1 lg:min-h-0 lg:border-r lg:border-t-0">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 size={16} className="mr-2 animate-spin" />Loading document…</div>
            ) : err ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground"><XCircle size={20} className="text-[var(--danger)]" />{err}</div>
            ) : isPdf && file ? (
              <iframe src={file.url} title={doc?.title || "Document"} className="h-full w-full" />
            ) : html != null ? (
              <div className="h-full overflow-y-auto px-4 py-6">
                <div className="docx-page mx-auto max-w-[820px] rounded-lg border border-border bg-card p-5 md:p-12" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            ) : text != null ? (
              <div className="h-full overflow-y-auto px-4 py-6">
                <pre className="mx-auto max-w-[820px] whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-5 font-mono text-sm leading-relaxed text-foreground md:p-12">{text}</pre>
              </div>
            ) : file ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><FileText size={22} /></span>
                <p className="text-sm font-medium text-foreground">Preview unavailable for .{file.filename.split(".").pop()?.toUpperCase()} files</p>
                <p className="max-w-xs text-sm text-[var(--ink-600)]">Open the original to view it alongside the analysis. (PDF, DOCX and TXT render here directly.)</p>
                <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary-600)] px-4 text-base font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><ExternalLink size={14} />Open original</a>
              </div>
            ) : null}
          </div>

          {/* AI analysis with provenance — first on mobile and tablet */}
          <div className="order-1 bg-card p-4 md:p-5 lg:order-2 lg:min-h-0 lg:overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--ai-ink)]"><Sparkles size={14} />Sonar extracted from this document</h3>
              <button type="button" onClick={() => document.getElementById("reader-file")?.scrollIntoView()} className="inline-flex h-10 items-center gap-1 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">Jump to document<ArrowRight size={13} className="rotate-90" /></button>
            </div>

            {/* Value + reconciliation */}
            {value !== null && value > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-[var(--panel)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--ink-600)]">Contract value{currency ? "" : " · currency not extracted"}</span>
                  {reconciled != null && (reconciled
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success)]"><CheckCircle2 size={11} />Reconciled</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--warning)]"><AlertTriangle size={11} />Needs review</span>)}
                </div>
                <div className="mt-1 break-words text-3xl font-semibold leading-tight tabular-nums tracking-tight text-foreground">{fmtMoney(value, currency)}</div>
              </div>
            )}

            {/* Where the figures came from */}
            {lineItems.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-base font-semibold text-foreground">Figures &amp; where they came from</h4>
                <ul className="space-y-2">
                  {lineItems.map((li, i) => (
                    <li key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="min-w-0 break-words text-sm font-medium text-foreground">{li.label}</span>
                        {li.amount != null && <span className="font-semibold tabular-nums text-foreground">{fmtMoney(li.amount, currency)}</span>}
                      </div>
                      {li.source && <p className="mt-1.5 border-l-2 border-[var(--brand-primary-300)] pl-2.5 text-sm leading-relaxed text-[var(--ink-600)]">“{li.source}”</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {classification?.validation?.issues && classification.validation.issues.length > 0 && (
              <div className="mt-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3">
                <div className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--warning)]"><AlertTriangle size={14} />Review notes</div>
                <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">{classification.validation.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
              </div>
            )}

            {findings.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-base font-semibold text-foreground">Key findings</h4>
                <ul className="space-y-2">
                  {findings.map((f, i) => {
                    const meta = SEVERITY_META[f.severity];
                    return (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
                        <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.bg} ${meta.text}`}>{meta.icon}</span>
                        <div className="min-w-0"><div className="break-words text-base font-semibold text-foreground">{f.label} <span className={`text-xs font-medium capitalize ${meta.text}`}>· {f.severity}</span></div><p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!classification && <p className="mt-4 text-sm text-[var(--ink-600)]">Analysis isn&apos;t available yet for this document.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── shared ────────────────────────────────────────────────────── */
function UploadPrompt({ v }: { v: View }) {
  // A viewer cannot upload: say that the project is empty instead of offering a dropzone.
  if (!v.canUpload) return <NoDocuments v={v} />;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <h3 className="mb-1 text-xl font-semibold tracking-tight text-foreground">Upload your SOW</h3>
      <p className="mb-4 text-sm text-[var(--ink-600)]">Drop the contract for {v.project.name}. Sonar extracts clauses, scores risk, and surfaces key findings.</p>
      <UploadDropzone projectId={v.project.id} defaultDocType="SOW" onDocReady={v.onDocReady} />
    </section>
  );
}

/** An empty project, for someone who may not add to it. */
function NoDocuments({ v }: { v: View }) {
  const owner = projectOwnerEmail(v.project);
  return (
    <EmptyPanel
      icon={<FileText size={22} strokeWidth={1.5} />}
      title="No documents in this project yet"
      body={`${readOnlyReason(v.role)} Documents appear here when the owner${owner ? ` (${owner})` : ""} or an editor adds them.`}
    />
  );
}

function AnalyzingOrEmpty({ v, label }: { v: View; label: string }) {
  if (!v.docs.length) return <UploadPrompt v={v} />;
  return <EmptyPanel icon={v.processingCount > 0 || v.analyzingClauses ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} strokeWidth={1.5} />} title={v.processingCount > 0 || v.analyzingClauses ? "Analyzing…" : "Nothing here yet"} body={label} />;
}

function EmptyPanel({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-14 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">{icon}</span>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-[var(--ink-600)]">{body}</p>
    </div>
  );
}

function AttentionRow({ c }: { c: AggClause }) {
  const m = clauseRiskMeta(c);
  return (
    <Link href={`/projects/${c._docId}/sow`} className={`block rounded-lg border bg-card p-3.5 transition-colors hover:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${c.riskLevel === "critical" ? "border-[var(--danger)]/40" : "border-border"}`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-xs text-muted-foreground">{c.number}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${m.bg} ${m.text}`}>{clauseRiskText(c)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(c.category)}</span>
      </div>
      <div className="break-words text-base font-semibold text-foreground">{c.title || c.number}</div>
      {c.summary && <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{c.summary}</p>}
      <p className="mt-1 break-words text-xs text-muted-foreground">{c._docTitle}</p>
    </Link>
  );
}

function PartiesCard({ parties }: { parties: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Contract parties <span className="ml-1 text-sm font-normal tabular-nums text-muted-foreground">{parties.length}</span></h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {parties.map((party, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"><Building2 size={16} strokeWidth={1.75} /></span>
            <div className="min-w-0"><div className="break-words text-base font-semibold text-foreground">{party}</div><div className="text-xs text-muted-foreground">Party {i + 1}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusDot({ doc }: { doc: ApiDocument }) {
  if (doc.status === "READY") return <CheckCircle2 size={17} className="shrink-0 text-[var(--success)]" />;
  if (doc.status === "FAILED") return <XCircle size={17} className="shrink-0 text-[var(--danger)]" />;
  if (isProcessing(doc.status)) return <Loader2 size={17} className="shrink-0 animate-spin text-[var(--warning)]" />;
  return <FileText size={17} className="shrink-0 text-muted-foreground" />;
}

function NotFound() {
  return (
    <div className="app-container flex flex-col items-center py-20 text-center">
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Layers size={24} strokeWidth={1.5} /></span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project not found</h1>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-[var(--ink-600)]">There is no project with this ID that you can open. It may have been deleted, it may no longer be shared with you, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary-600)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)]">Back to projects</Link>
    </div>
  );
}

function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="app-container flex flex-col items-center py-20 text-center">
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]"><XCircle size={24} strokeWidth={1.5} /></span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Couldn&apos;t load this project</h1>
      <p className="mt-2 max-w-md break-words text-base leading-relaxed text-[var(--ink-600)]">{message}</p>
      <Button variant="outline" size="lg" className="mt-6" onClick={onRetry}><RefreshCw size={14} />Try again</Button>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container space-y-3 pb-5 pt-6 md:pb-7 md:pt-8"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-8 w-2/3 sm:w-1/2" /><Skeleton className="h-4 w-1/2 sm:w-1/3" /></div>
      </div>
      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div>
    </>
  );
}
