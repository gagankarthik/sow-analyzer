"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProcessingState } from "@/components/ProcessingState";
import { BluelyMark } from "@/components/ui/BluelyMark";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, CheckCircle2, Clock, CalendarClock, Files, GitBranch, XCircle,
  Loader2, Pencil, Trash2, Building2, FileText, Hash, ShieldAlert, AlertTriangle, Info,
} from "@/components/ui/icons";
import {
  getDocument, deleteDocument, updateDocument, apiDocToProject, getClassification, errorStatus,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ApiDocumentDetail, ApiClassification, ApiClause, DocType, Lifecycle, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "OTHER"];
const LIFECYCLE_OPTIONS: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};
const PROCESSING_STATUSES = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string; bar: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]",  text: "text-[var(--danger)]",  bar: "bg-[var(--danger)]" },
  high:     { label: "High",     bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", bar: "bg-[var(--warning)]" },
  medium:   { label: "Medium",   bg: "bg-[var(--ink-100)]",      text: "text-[var(--ink-600)]", bar: "bg-[var(--ink-400)]" },
  low:      { label: "Low",      bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", bar: "bg-[var(--success)]" },
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]",  text: "text-[var(--danger)]",  icon: <ShieldAlert size={13} /> },
  high:     { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium:   { bg: "bg-[var(--ink-100)]",      text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low:      { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info:     { bg: "bg-[var(--info-soft)]",    text: "text-[var(--info)]",    icon: <Info size={13} /> },
};

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [detail, setDetail] = useState<ApiDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classification, setClassification] = useState<ApiClassification | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let notFoundRetries = 0;
    const MAX_404_RETRIES = 24;

    setLoading(true); setNotFound(false); setError(null);

    const tick = () => {
      getDocument(id)
        .then((d) => {
          if (!alive) return;
          setDetail(d); setError(null); setNotFound(false); setLoading(false);
          notFoundRetries = 0;
          if (PROCESSING_STATUSES.has(d.document.status)) timer = setTimeout(tick, 5000);
        })
        .catch((err: unknown) => {
          if (!alive) return;
          if (errorStatus(err) === 404) {
            if (notFoundRetries < MAX_404_RETRIES) { notFoundRetries++; setLoading(true); timer = setTimeout(tick, 5000); }
            else { setLoading(false); setNotFound(true); }
          } else { setLoading(false); setError(err instanceof Error ? err.message : "Failed to load document"); }
        });
    };
    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [id]);

  useEffect(() => {
    if (!detail || detail.document.status !== "READY") return;
    getClassification(id).then(setClassification).catch(() => {});
  }, [id, detail?.document.status]);

  const clauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);

  // Risk counts: prefer the doc-meta aggregate (instant), fall back to classification.
  const riskCounts = useMemo(() => {
    if (detail?.document.riskCounts) return detail.document.riskCounts;
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const cl of clauses) c[cl.riskLevel ?? "low"]++;
    return c;
  }, [detail?.document.riskCounts, clauses]);

  const topRiskClauses = useMemo(
    () => [...clauses].sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"])
      .filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").slice(0, 4),
    [clauses],
  );

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of clauses) m[c.category] = (m[c.category] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [clauses]);

  if (loading) return <ProjectOverviewSkeleton />;

  if (notFound) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>Project not found</h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">{error}</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }

  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = PROCESSING_STATUSES.has(rawStatus);
  const isFailed = rawStatus === "FAILED";
  const isReady = rawStatus === "READY";
  const totalRiskClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const highRisk = riskCounts.high + riskCounts.critical;
  const clauseCount = doc.clauseCount ?? clauses.length;
  const summary = classification?.summary || doc.summary || "";

  async function handleDelete() {
    setDeleting(true);
    try { await deleteDocument(id); toast.success("Document deleted"); router.push("/projects"); }
    catch (e) { toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." }); setDeleting(false); setShowDeleteDialog(false); }
  }
  function openEdit() {
    setEditTitle(detail!.document.title || ""); setEditLifecycle(detail!.document.lifecycle); setEditDocType(detail!.document.docType); setShowEditDialog(true);
  }
  async function handleSave() {
    setSaving(true);
    try {
      const patch: { title?: string; lifecycle?: string; docType?: string } = {};
      if (editTitle.trim() !== detail!.document.title) patch.title = editTitle.trim();
      if (editLifecycle !== detail!.document.lifecycle) patch.lifecycle = editLifecycle;
      if (editDocType !== detail!.document.docType) patch.docType = editDocType;
      if (Object.keys(patch).length === 0) { setShowEditDialog(false); return; }
      const updated = await updateDocument(id, patch);
      setDetail((prev) => prev ? { ...prev, document: { ...prev.document, ...updated } } : prev);
      toast.success("Document updated"); setShowEditDialog(false);
    } catch (e) { toast.error("Update failed", { description: e instanceof Error ? e.message : "Please try again." }); }
    finally { setSaving(false); }
  }

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="md" className="gap-1.5" onClick={openEdit}><Pencil size={13} />Edit</Button>
          <Button variant="outline" size="md" className="gap-1.5 text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)] hover:border-[var(--danger)]/50" onClick={() => setShowDeleteDialog(true)}><Trash2 size={13} />Delete</Button>
        </div>

        {/* Banners */}
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--danger)]">Processing failed.</p>
              {doc.errorMessage ? (
                <p className="mt-1 text-[12px] text-[var(--danger)]/80 font-mono leading-relaxed break-all">{doc.errorMessage.length > 300 ? doc.errorMessage.slice(0, 300) + "…" : doc.errorMessage}</p>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-[var(--danger)]/80">Delete this document and try uploading again. If the problem persists, check CloudWatch logs.</p>
              )}
            </div>
          </div>
        )}

        {isProcessing && <ProcessingState status={rawStatus} />}

        {/* ── Executive summary ─────────────────────────────── */}
        {isReady && (
          <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 md:p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <BluelyMark size="md" tile pulse />
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">Bluely · executive summary</div>
                {summary ? (
                  <p className="text-[14px] leading-relaxed text-foreground max-w-[78ch]">{summary}</p>
                ) : (
                  <p className="text-[13.5px] text-muted-foreground">Bluely has indexed this document. Open the SOW analyzer for the full clause breakdown.</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="ai" size="sm">Ask Bluely</Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}/sow`}><FileText size={12} /> View all clauses<ArrowRight size={11} strokeWidth={2.25} /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Metric tiles ──────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile icon={<FileText size={16} strokeWidth={1.75} />} label="Clauses" value={isReady && clauseCount > 0 ? String(clauseCount) : "—"} sub={isReady ? `${catCounts.length || "—"} categories` : rawStatus.toLowerCase()} tone="brand" />
          <MetricTile icon={<ShieldAlert size={16} strokeWidth={1.75} />} label="High-risk" value={isReady ? String(highRisk) : "—"} sub={highRisk > 0 ? "Needs review" : isReady ? "No high exposure" : "—"} tone={riskCounts.critical > 0 ? "danger" : highRisk > 0 ? "warning" : "success"} />
          <MetricTile icon={<Building2 size={16} strokeWidth={1.75} />} label="Parties" value={doc.parties.length > 0 ? String(doc.parties.length) : "—"} sub={doc.parties[0] ?? "None identified"} tone="neutral" />
          <MetricTile icon={<CalendarClock size={16} strokeWidth={1.75} />} label="Effective date" value={doc.effectiveDate ? formatDate(doc.effectiveDate) : "—"} sub={`Created ${formatDate(doc.createdAt)}`} tone="neutral" />
        </section>

        {/* ── Risk + findings + categories ──────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Risk profile" hint={isReady && totalRiskClauses > 0 ? `${totalRiskClauses} clauses` : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Risk analysis appears once processing completes.</p>
            ) : totalRiskClauses === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No clause data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {RISK_ORDER.map((r) => {
                  const n = riskCounts[r];
                  if (n === 0) return null;
                  const m = RISK_META[r];
                  const pct = Math.round((n / totalRiskClauses) * 100);
                  return (
                    <div key={r}>
                      <div className="flex items-center justify-between text-[11.5px] mb-1">
                        <span className={`font-medium ${m.text}`}>{m.label}</span>
                        <span className="tabular-nums text-muted-foreground">{n} clause{n !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${m.bar} transition-all`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
            <FooterLink href={`/projects/${project.id}/sow`} label="Open SOW analyzer" />
          </Panel>

          <Panel title="Key findings" hint={classification && classification.keyFindings.length > 0 ? String(classification.keyFindings.length) : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Findings appear after analysis completes.</p>
            ) : !classification ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
            ) : classification.keyFindings.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No notable findings flagged.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4).map((f, i) => {
                  const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${s.bg} ${s.text} shrink-0 mt-0.5`}>{s.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground leading-tight">{f.label}</div>
                        <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{f.detail}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Top categories" hint={catCounts.length > 0 ? `${catCounts.length}` : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Categories appear after processing.</p>
            ) : catCounts.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No category data yet.</p>
            ) : (
              <div className="space-y-2">
                {catCounts.map(([cat, count]) => {
                  const pct = Math.round((count / clauses.length) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2.5">
                      <span className="text-[11px] font-medium w-28 truncate text-foreground">{cat}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[var(--brand-primary-500)]" style={{ width: `${pct}%` }} /></div>
                      <span className="tabular-nums text-[11px] text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <FooterLink href={`/projects/${project.id}/sow`} label="View all clauses" />
          </Panel>
        </section>

        {/* ── Highlighted high-risk clauses ─────────────────── */}
        {isReady && topRiskClauses.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-[var(--danger)]" />
                <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Clauses that need attention</h3>
              </div>
              <Link href={`/projects/${project.id}/sow`} className="text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">View all<ArrowRight size={11} strokeWidth={2.25} /></Link>
            </div>
            <div className="space-y-2.5">
              {topRiskClauses.map((c) => {
                const m = RISK_META[c.riskLevel ?? "low"];
                return (
                  <div key={c.number} className={`rounded-lg border ${c.riskLevel === "critical" ? "border-[var(--danger)]/30" : "border-border"} bg-card p-3.5`}>
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 min-w-[2.5rem] text-right">{c.number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[13px] font-semibold text-foreground">{c.title || c.number}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}>{m.label}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.category}</span>
                        </div>
                        {c.summary && <p className="text-[12px] text-muted-foreground leading-relaxed">{c.summary}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Document details + parties ────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground mb-5">Document details</h3>
            <dl className="space-y-3">
              <DetailItem label="Type"><Badge variant="neutral" size="sm">{doc.docType}</Badge></DetailItem>
              <DetailItem label="Lifecycle"><Badge variant="neutral" size="sm" className="capitalize">{doc.lifecycle}</Badge></DetailItem>
              <DetailItem label="Status"><Badge variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"} size="sm" className="font-mono">{rawStatus}</Badge></DetailItem>
              {doc.effectiveDate && <DetailItem label="Effective"><span className="text-[12px] font-medium text-foreground">{formatDate(doc.effectiveDate)}</span></DetailItem>}
              {doc.parentDocId && <DetailItem label="Parent"><Link href={`/projects/${doc.parentDocId}`} className="text-[11.5px] font-mono text-[var(--brand-primary-600)] hover:underline truncate max-w-[120px] inline-block">{doc.parentDocId.slice(0, 12)}…</Link></DetailItem>}
              <DetailItem label="Versions"><span className="text-[12px] font-semibold text-foreground tabular-nums">{doc.latestVersion}</span></DetailItem>
            </dl>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground mb-4">Contract parties {doc.parties.length > 0 && <span className="text-[11px] font-mono text-muted-foreground ml-1">{doc.parties.length}</span>}</h3>
            {doc.parties.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No parties identified in this document.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doc.parties.map((party, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0"><Building2 size={15} strokeWidth={1.75} /></span>
                    <div className="min-w-0"><div className="text-[13px] font-semibold text-foreground truncate">{party}</div><div className="text-[11px] text-muted-foreground">Party {i + 1}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Quick links ───────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DeepLink href={`/projects/${project.id}/sow`} icon={<Files size={15} strokeWidth={1.75} />} title="SOW Analyzer" sub="Clause-level risk" />
          <DeepLink href={`/projects/${project.id}/amendments`} icon={<GitBranch size={15} strokeWidth={1.75} />} title="Amendments" sub={`${doc.latestVersion} version${doc.latestVersion === 1 ? "" : "s"}`} />
          <DeepLink href={`/projects/${project.id}/timeline`} icon={<Clock size={15} strokeWidth={1.75} />} title="Timeline" sub="Activity history" />
          <DeepLink href={`/projects/${project.id}/documents`} icon={<Hash size={15} strokeWidth={1.75} />} title="Documents" sub={`${detail.versions.length} version${detail.versions.length === 1 ? "" : "s"}`} />
        </section>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription><strong>{doc.title || "This document"}</strong> and all its versions, clauses, and analytics will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white">
              {deleting ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-[12px] font-medium text-foreground">Title</label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Document title" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><label className="text-[12px] font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}><SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger><SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><label className="text-[12px] font-medium text-foreground">Lifecycle stage</label>
              <Select value={editLifecycle} onValueChange={(v) => setEditLifecycle(v as Lifecycle)}><SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger><SelectContent>{LIFECYCLE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{LIFECYCLE_LABEL[l]}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</> : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Building blocks ─── */

function MetricTile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "brand" | "success" | "warning" | "danger" | "neutral" }) {
  const TONE = {
    brand:   { bg: "var(--brand-primary-50)", text: "var(--brand-primary-700)" },
    success: { bg: "var(--success-soft)",     text: "var(--success)" },
    warning: { bg: "var(--warning-soft)",     text: "var(--warning)" },
    danger:  { bg: "var(--danger-soft)",      text: "var(--danger)" },
    neutral: { bg: "var(--ink-100)",          text: "var(--ink-700)" },
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: TONE.bg, color: TONE.text }}>{icon}</span>
      </div>
      <div className="text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.025em" }}>{value}</div>
      <div className="mt-2 text-[12px] text-muted-foreground truncate">{sub}</div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-5">
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h3>
        {hint && <span className="text-[11px] font-mono text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-[12px] text-muted-foreground">{label}</span><span>{children}</span></div>;
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-5 pt-4 border-t border-border">
      <Link href={href} className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">{label}<ArrowRight size={12} strokeWidth={2.25} /></Link>
    </div>
  );
}

function DeepLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-sm hover:border-[var(--brand-primary-300)] transition-all flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-[var(--brand-primary-50)] group-hover:text-[var(--brand-primary-700)] transition-colors shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[13px] font-semibold text-foreground group-hover:text-[var(--brand-primary-700)] transition-colors">{title}<ArrowRight size={11} strokeWidth={2.25} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" /></div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">{sub}</div>
      </div>
    </Link>
  );
}

function sevRank(s: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

function ProjectOverviewSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-5 gap-6 pt-4 border-t border-border">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-20" /></div>)}</div>
        </div>
      </div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      </div>
    </>
  );
}
