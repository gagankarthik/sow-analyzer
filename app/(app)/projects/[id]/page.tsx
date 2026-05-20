"use client";

import { useMemo, useState } from "react";
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
import { ContractEvolution } from "@/components/ContractEvolution";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, Clock, CalendarClock, Files, GitBranch, XCircle, Loader2, Pencil,
  Building2, FileText, Hash, ShieldAlert, AlertTriangle, Info,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useClassification, useTimeline, useUpdateDocument } from "@/lib/queries/documents";
import { formatDate } from "@/lib/format";
import type { ApiClause, DocType, Lifecycle, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "OTHER"];
const LIFECYCLE_OPTIONS: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};

const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string; bar: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", bar: "bg-[var(--danger)]" },
  high: { label: "High", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", bar: "bg-[var(--warning)]" },
  medium: { label: "Medium", bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-600)]", bar: "bg-[var(--ink-400)]" },
  low: { label: "Low", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", bar: "bg-[var(--success)]" },
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification } = useClassification(id, !!isReady);
  const { data: timeline } = useTimeline(id, !!isReady);
  const updateMut = useUpdateDocument(id);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");

  const clauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);
  const riskCounts = useMemo(() => {
    if (detail?.document.riskCounts) return detail.document.riskCounts;
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const cl of clauses) c[cl.riskLevel ?? "low"]++;
    return c;
  }, [detail?.document.riskCounts, clauses]);
  const topRiskClauses = useMemo(() =>
    [...clauses].sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"])
      .filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").slice(0, 4),
    [clauses]);
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of clauses) m[c.category] = (m[c.category] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [clauses]);

  if (isLoading) return <OverviewSkeleton />;

  if (isError && errorStatus(error) === 404) {
    return <NotFound />;
  }
  if (isError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">{error instanceof Error ? error.message : "Failed to load document"}</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const totalRiskClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const summary = classification?.summary || doc.summary || "";

  function openEdit() {
    setEditTitle(doc.title || "");
    setEditLifecycle(doc.lifecycle);
    setEditDocType(doc.docType);
    setShowEdit(true);
  }
  async function handleSave() {
    const patch: { title?: string; lifecycle?: string; docType?: string } = {};
    if (editTitle.trim() !== doc.title) patch.title = editTitle.trim();
    if (editLifecycle !== doc.lifecycle) patch.lifecycle = editLifecycle;
    if (editDocType !== doc.docType) patch.docType = editDocType;
    if (Object.keys(patch).length === 0) { setShowEdit(false); return; }
    try {
      await updateMut.mutateAsync(patch);
      toast.success("Document updated");
      setShowEdit(false);
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}><Pencil size={13} />Edit details</Button>
        </div>

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

        {/* ── Row A: Executive summary + Risk profile ───────── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 md:p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <BluelyMark size="md" tile pulse />
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">Bluely · executive summary</div>
                {!isReady ? (
                  <p className="text-[13.5px] text-muted-foreground">The summary appears once processing completes.</p>
                ) : summary ? (
                  <p className="text-[14px] leading-relaxed text-foreground max-w-[68ch]">{summary}</p>
                ) : !classification ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                ) : (
                  <p className="text-[13.5px] text-muted-foreground">No summary was extracted. Open the SOW analyzer for the full clause breakdown.</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}/sow`}><FileText size={12} />View all clauses<ArrowRight size={11} strokeWidth={2.25} /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Panel className="lg:col-span-2" title="Risk profile" hint={isReady && totalRiskClauses > 0 ? `${totalRiskClauses} clauses` : undefined}>
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
        </section>

        {/* ── Row B: Contract evolution (hero) ──────────────── */}
        {isReady && timeline && (Object.keys(timeline.currentState).length > 0 || Object.keys(timeline.initialState).length > 0) && (
          <ContractEvolution timeline={timeline} />
        )}

        {/* ── Row C: Key findings + Top categories ──────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Key findings" hint={classification && classification.keyFindings.length > 0 ? String(classification.keyFindings.length) : undefined}>
            {!isReady ? (
              <p className="text-[12.5px] text-muted-foreground">Findings appear after analysis completes.</p>
            ) : !classification ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
            ) : classification.keyFindings.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No notable findings flagged.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((f, i) => {
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

        {/* ── Attention clauses ─────────────────────────────── */}
        {isReady && topRiskClauses.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><ShieldAlert size={15} className="text-[var(--danger)]" /><h3 className="text-[14px] font-semibold tracking-tight text-foreground">Clauses that need attention</h3></div>
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

        {/* ── Row D: Parties + Document details ─────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        </section>

        {/* ── Quick links ───────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DeepLink href={`/projects/${project.id}/sow`} icon={<Files size={15} strokeWidth={1.75} />} title="SOW Analyzer" sub="Clause-level risk" />
          <DeepLink href={`/projects/${project.id}/amendments`} icon={<GitBranch size={15} strokeWidth={1.75} />} title="Amendments" sub={`${doc.latestVersion} version${doc.latestVersion === 1 ? "" : "s"}`} />
          <DeepLink href={`/projects/${project.id}/timeline`} icon={<Clock size={15} strokeWidth={1.75} />} title="Timeline" sub="Activity history" />
          <DeepLink href={`/projects/${project.id}/documents`} icon={<Hash size={15} strokeWidth={1.75} />} title="Documents" sub={`${detail.versions.length} version${detail.versions.length === 1 ? "" : "s"}`} />
        </section>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
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
            <Button variant="outline" size="md" onClick={() => setShowEdit(false)} disabled={updateMut.isPending}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── building blocks ─────────────────────────────────────── */

function Panel({ title, hint, className, children }: { title: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs flex flex-col ${className ?? ""}`}>
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

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>Project not found</h1>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-5 md:pt-6 pb-4 space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <div className="flex items-center gap-2.5"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-7 w-1/2" /></div>
          <Skeleton className="h-4 w-1/3 ml-[46px]" />
        </div>
      </div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4"><Skeleton className="lg:col-span-3 h-40 rounded-xl" /><Skeleton className="lg:col-span-2 h-40 rounded-xl" /></div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      </div>
    </>
  );
}
