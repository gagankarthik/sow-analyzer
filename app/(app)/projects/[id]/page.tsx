"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight, CheckCircle2, Clock, CalendarClock, Files, GitBranch,
  XCircle, Loader2, Pencil, Trash2, Building2, FileText, Hash,
} from "@/components/ui/icons";
import {
  getDocument, deleteDocument, updateDocument, apiDocToProject,
  getClassification, errorStatus,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ApiDocumentDetail, ApiClassification, DocType, Lifecycle } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "OTHER"];
const LIFECYCLE_OPTIONS: Lifecycle[] = [
  "draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired",
];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};

const PROCESSING_STATUSES = new Set([
  "PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING",
]);

const CATEGORY_RISK: Record<string, "critical" | "high" | "medium" | "low"> = {
  Liability: "critical", IP: "critical", Indemnity: "high", Termination: "high",
  DataProtection: "high", Fees: "medium", Payment: "medium", Compliance: "medium",
  GoverningLaw: "medium", DisputeResolution: "medium", Confidentiality: "medium",
  Warranty: "medium", ChangeControl: "medium",
};
const RISK_STYLES = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", bar: "bg-[var(--danger)]" },
  high:     { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", bar: "bg-[var(--warning)]" },
  medium:   { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-600)]", bar: "bg-[var(--ink-400)]" },
  low:      { bg: "bg-muted", text: "text-muted-foreground", bar: "bg-[var(--ink-300)]" },
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

    setLoading(true);
    setNotFound(false);
    setError(null);

    const tick = () => {
      getDocument(id)
        .then((d) => {
          if (!alive) return;
          setDetail(d);
          setError(null);
          setNotFound(false);
          setLoading(false);
          notFoundRetries = 0;
          if (PROCESSING_STATUSES.has(d.document.status)) {
            timer = setTimeout(tick, 5000);
          }
        })
        .catch((err: unknown) => {
          if (!alive) return;
          if (errorStatus(err) === 404) {
            if (notFoundRetries < MAX_404_RETRIES) {
              notFoundRetries++;
              setLoading(true);
              timer = setTimeout(tick, 5000);
            } else {
              setLoading(false);
              setNotFound(true);
            }
          } else {
            setLoading(false);
            setError(err instanceof Error ? err.message : "Failed to load document");
          }
        });
    };

    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [id]);

  // Load classification once READY
  useEffect(() => {
    if (!detail || detail.document.status !== "READY") return;
    getClassification(id)
      .then(setClassification)
      .catch(() => {});
  }, [id, detail?.document.status]);

  if (loading) return <ProjectOverviewSkeleton />;

  if (notFound) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
          <Files size={24} strokeWidth={1.5} />
        </span>
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>
          Project not found
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
          This engagement may have been archived, or the link is out of date.
        </p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">
          Back to projects
        </Link>
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

  // Classification stats
  const clauses = classification?.clauses ?? [];
  const riskCounts = clauses.reduce(
    (acc, c) => { const r = CATEGORY_RISK[c.category] ?? "low"; acc[r]++; return acc; },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  const catCounts: Record<string, number> = {};
  for (const c of clauses) catCounts[c.category] = (catCounts[c.category] ?? 0) + 1;
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDocument(id);
      toast.success("Document deleted");
      router.push("/projects");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  function openEdit() {
    setEditTitle(detail!.document.title || "");
    setEditLifecycle(detail!.document.lifecycle);
    setEditDocType(detail!.document.docType);
    setShowEditDialog(true);
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
      toast.success("Document updated");
      setShowEditDialog(false);
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="md" className="gap-1.5" onClick={openEdit}>
            <Pencil size={13} />Edit
          </Button>
          <Button
            variant="outline" size="md"
            className="gap-1.5 text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)] hover:border-[var(--danger)]/50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 size={13} />Delete
          </Button>
        </div>

        {/* Processing banners */}
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--danger)]">Processing failed.</p>
              {doc.errorMessage ? (
                <p className="mt-1 text-[12px] text-[var(--danger)]/80 font-mono leading-relaxed break-all">
                  {doc.errorMessage.length > 300 ? doc.errorMessage.slice(0, 300) + "…" : doc.errorMessage}
                </p>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-[var(--danger)]/80">
                  Delete this document and try uploading again. If the problem persists, check CloudWatch logs.
                </p>
              )}
            </div>
          </div>
        )}

        {isProcessing && <ProcessingState status={rawStatus} />}

        {/* ── Metric tiles ─────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile
            icon={<Building2 size={16} strokeWidth={1.75} />}
            label="Parties"
            value={doc.parties.length > 0 ? String(doc.parties.length) : "—"}
            sub={doc.parties[0] ?? "No parties identified"}
            tone="brand"
          />
          <MetricTile
            icon={<CheckCircle2 size={16} strokeWidth={1.75} />}
            label="Clauses"
            value={isReady && clauses.length > 0 ? String(clauses.length) : "—"}
            sub={
              isReady && clauses.length > 0
                ? `${riskCounts.critical + riskCounts.high} high-risk`
                : rawStatus === "READY" ? "No clauses extracted" : rawStatus.toLowerCase()
            }
            tone={riskCounts.critical > 0 ? "danger" : riskCounts.high > 0 ? "warning" : "success"}
          />
          <MetricTile
            icon={<CalendarClock size={16} strokeWidth={1.75} />}
            label="Effective date"
            value={doc.effectiveDate ? formatDate(doc.effectiveDate) : "—"}
            sub={`Created ${formatDate(doc.createdAt)}`}
            tone="neutral"
          />
          <MetricTile
            icon={<GitBranch size={16} strokeWidth={1.75} />}
            label="Versions"
            value={String(doc.latestVersion || detail.versions.length || "—")}
            sub="Document versions processed"
            tone="neutral"
          />
        </section>

        {/* ── Two-column grid ───────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Clause risk panel */}
          <Panel title="Clause risk" hint={isReady && clauses.length > 0 ? `${clauses.length} clauses` : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Clause analysis will appear once the document is processed.</p>
            ) : clauses.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No clause data available yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(["critical", "high", "medium", "low"] as const).map((r) => {
                  const n = riskCounts[r];
                  if (n === 0) return null;
                  const s = RISK_STYLES[r];
                  const pct = Math.round((n / clauses.length) * 100);
                  return (
                    <div key={r}>
                      <div className="flex items-center justify-between text-[11.5px] mb-1">
                        <span className={`font-medium capitalize ${s.text}`}>{r}</span>
                        <span className="tabular-nums text-muted-foreground">{n} clause{n !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.bar} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <FooterLink href={`/projects/${project.id}/sow`} label="Open SOW analyzer" />
          </Panel>

          {/* Document details panel */}
          <Panel title="Document details">
            <dl className="space-y-3">
              <DetailItem label="Type">
                <Badge variant="neutral" size="sm">{doc.docType}</Badge>
              </DetailItem>
              <DetailItem label="Lifecycle">
                <Badge variant="neutral" size="sm" className="capitalize">{doc.lifecycle}</Badge>
              </DetailItem>
              <DetailItem label="Status">
                <Badge
                  variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"}
                  size="sm" className="font-mono"
                >
                  {rawStatus}
                </Badge>
              </DetailItem>
              {doc.effectiveDate && (
                <DetailItem label="Effective">
                  <span className="text-[12px] font-medium text-foreground">{formatDate(doc.effectiveDate)}</span>
                </DetailItem>
              )}
              {doc.parentDocId && (
                <DetailItem label="Parent">
                  <Link href={`/projects/${doc.parentDocId}`} className="text-[11.5px] font-mono text-[var(--brand-primary-600)] hover:underline truncate max-w-[120px] inline-block">
                    {doc.parentDocId.slice(0, 12)}…
                  </Link>
                </DetailItem>
              )}
              <DetailItem label="Doc ID">
                <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px] inline-block">{doc.docId.slice(0, 12)}…</span>
              </DetailItem>
            </dl>
          </Panel>

          {/* Top categories panel */}
          <Panel title="Top clause categories" hint={isReady && topCats.length > 0 ? `${Object.keys(catCounts).length} total` : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Categories will appear after processing completes.</p>
            ) : topCats.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No category data yet.</p>
            ) : (
              <div className="space-y-2">
                {topCats.map(([cat, count]) => {
                  const risk = CATEGORY_RISK[cat] ?? "low";
                  const s = RISK_STYLES[risk];
                  const pct = Math.round((count / clauses.length) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2.5">
                      <span className={`text-[10.5px] font-medium w-28 truncate ${s.text}`}>{cat}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular-nums text-[11px] text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <FooterLink href={`/projects/${project.id}/sow`} label="View all clauses" />
          </Panel>
        </section>

        {/* ── Parties section ───────────────────────────────────── */}
        {doc.parties.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
                Contract parties · {doc.parties.length}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {doc.parties.map((party, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0">
                    <Building2 size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{party}</div>
                    <div className="text-[11px] text-muted-foreground">Party {i + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bluely panel ─────────────────────────────────────── */}
        <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/60 p-5 md:p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <BluelyMark size="md" tile pulse />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">
                Bluely · contract intelligence
              </div>
              <p className="text-[14px] leading-relaxed text-foreground max-w-[68ch]">
                {isReady && clauses.length > 0
                  ? `${clauses.length} clauses indexed across ${Object.keys(catCounts).length} categories. ${riskCounts.critical + riskCounts.high} clause${riskCounts.critical + riskCounts.high !== 1 ? "s" : ""} flagged high or critical risk. Ask Bluely to drill into any obligation, timeline, or exposure.`
                  : "Bluely is ready to analyze this document. Ask a question to get AI-powered insights on risk, obligations, and negotiation strategy."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="ai" size="sm">Ask Bluely</Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}/sow`}>
                    <FileText size={12} /> View clauses
                    <ArrowRight size={11} strokeWidth={2.25} />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick links ───────────────────────────────────────── */}
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
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{doc.title || "This document"}</strong> and all its versions,
              clauses, and analytics will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete} disabled={deleting}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
            >
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
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Document title" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Lifecycle stage</label>
              <Select value={editLifecycle} onValueChange={(v) => setEditLifecycle(v as Lifecycle)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{LIFECYCLE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Building blocks ─── */

function MetricTile({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  tone: "brand" | "success" | "warning" | "danger" | "neutral";
}) {
  const TONE = {
    brand:   { bg: "var(--brand-primary-50)", text: "var(--brand-primary-700)" },
    success: { bg: "var(--success-soft)",     text: "var(--success)"           },
    warning: { bg: "var(--warning-soft)",     text: "var(--warning)"           },
    danger:  { bg: "var(--danger-soft)",      text: "var(--danger)"            },
    neutral: { bg: "var(--ink-100)",          text: "var(--ink-700)"           },
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: TONE.bg, color: TONE.text }}>{icon}</span>
      </div>
      <div className="text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.025em" }}>
        {value}
      </div>
      <div className="mt-2 text-[12px] text-muted-foreground">{sub}</div>
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
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-5 pt-4 border-t border-border">
      <Link href={href} className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
        {label}<ArrowRight size={12} strokeWidth={2.25} />
      </Link>
    </div>
  );
}

function DeepLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-sm hover:border-[var(--brand-primary-300)] transition-all flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-[var(--brand-primary-50)] group-hover:text-[var(--brand-primary-700)] transition-colors shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[13px] font-semibold text-foreground group-hover:text-[var(--brand-primary-700)] transition-colors">
          {title}
          <ArrowRight size={11} strokeWidth={2.25} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">{sub}</div>
      </div>
    </Link>
  );
}

function ProjectOverviewSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-5 gap-6 pt-4 border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-20" /></div>)}
          </div>
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="app-container">
          <div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div>
        </div>
      </div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </>
  );
}
