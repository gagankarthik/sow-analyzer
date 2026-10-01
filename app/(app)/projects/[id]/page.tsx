"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { ProcessingState } from "@/components/ProcessingState";
import { SonarMark } from "@/components/ui/SonarMark";
import { ContractEvolution } from "@/components/ContractEvolution";
import { KeyDatesCard } from "@/components/dates/KeyDatesCard";
import { ReanalyseNotice } from "@/components/dates/ReanalyseNotice";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { CategoryRadar } from "@/components/charts/CategoryRadar";
import { MotionReveal } from "@/components/MotionReveal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, Files, XCircle, Loader2, Pencil, RefreshCw,
  Building2, FileText, ShieldAlert, AlertTriangle, Info,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { isProjectId } from "@/lib/projects-store";
import { useDocument, useClassification, useTimeline, useUpdateDocument, useReprocess } from "@/lib/queries/documents";
import { formatDate } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { buildKeyDateTimeline, canReanalyse, documentKeyDates } from "@/lib/key-dates";
import { can } from "@/lib/projects-store";
import { clauseTypeLabel } from "@/lib/clause-categories";
import type { ApiClause, ApiKeyFinding, DocType, Lifecycle, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "LICENSE", "DPA", "BAA", "COMPLIANCE", "OTHER"];
const LIFECYCLE_OPTIONS: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];
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
const SEV_FILL: Record<FindingSeverity, string> = {
  critical: "bg-[var(--danger)]", high: "bg-[var(--warning)]", medium: "bg-[var(--ink-400)]", low: "bg-[var(--success)]", info: "bg-[var(--info)]",
};
const SEV_ORDER: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

export default function ProjectRoutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  // A `proj_…` id is a named project container (multiple uploaded docs);
  // anything else is a single document's analysis workspace.
  if (isProjectId(id)) return <ProjectWorkspace projectId={id} />;
  return <DocumentOverview />;
}

function DocumentOverview() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: detail, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, refetch: refetchClass } = useClassification(id, !!isReady);
  const now = useNow(); // the real clock, re-read every minute
  const { data: timeline } = useTimeline(id, !!isReady);
  const updateMut = useUpdateDocument(id);
  const reprocess = useReprocess();

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");

  const clauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);
  const storedCounts = detail?.document.riskCounts;
  const riskCounts = useMemo(() => {
    if (storedCounts) return storedCounts;
    // Fallback for documents without stored counts: count the clauses the API
    // actually rated. A clause with no risk level is not counted as "low".
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const cl of clauses) if (cl.riskRated !== false) c[cl.riskLevel]++;
    return c;
  }, [storedCounts, clauses]);
  const topRiskClauses = useMemo(() =>
    [...clauses].sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"])
      .filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").slice(0, 4),
    [clauses]);
  const catData = useMemo<CatDatum[]>(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    for (const c of clauses) {
      const e = (m[c.category] ??= { count: 0, risk: "low" });
      e.count++;
      if (RISK_RANK[c.riskLevel ?? "low"] < RISK_RANK[e.risk]) e.risk = c.riskLevel ?? "low";
    }
    return Object.entries(m).map(([name, v]) => ({ name, count: v.count, risk: v.risk })).sort((a, b) => b.count - a.count);
  }, [clauses]);

  // Key dates from the best source there is (classification, else the document
  // row, else the older date fields), with each date's state as of today.
  const docRow = detail?.document;
  const dateSource = useMemo(() => (docRow ? documentKeyDates(docRow, classification) : null), [docRow, classification]);
  const keyDates = useMemo(() => buildKeyDateTimeline(dateSource?.dates ?? [], now), [dateSource, now]);

  if (isLoading) return <OverviewSkeleton />;

  if (isError && errorStatus(error) === 404) {
    return <NotFound />;
  }
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const totalRiskClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const summary = classification?.summary || doc.summary || "";
  const needsReview = riskCounts.critical + riskCounts.high;
  const showFocal = !!isReady && totalRiskClauses > 0;

  function openEdit() {
    setEditTitle(doc.title || "");
    setEditLifecycle(doc.lifecycle);
    setEditDocType(doc.docType);
    setShowEdit(true);
  }
  async function onReanalyze() {
    try {
      await reprocess.mutateAsync(id);
      toast.success("Re-analyzing", { description: "This document is being analyzed again." });
    } catch (e) {
      toast.error("Couldn't re-analyze", { description: e instanceof Error ? e.message : "Please try again." });
    }
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

      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Overview</h2>
          <div className="flex flex-wrap items-center gap-2">
            <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />
            {/* Owners and editors only; the API enforces it either way. */}
            {canReanalyse(doc.role) && (
              <Button variant="outline" size="lg" className="md:h-9" onClick={onReanalyze} disabled={reprocess.isPending || isProcessing} title="Re-run the analysis pipeline on this document">
                <RefreshCw size={14} className={reprocess.isPending ? "animate-spin" : undefined} />{reprocess.isPending ? "Re-analyzing…" : "Re-analyze"}
              </Button>
            )}
            {can(doc.role, "edit") && (
              <Button variant="outline" size="lg" className="md:h-9" onClick={openEdit}><Pencil size={14} />Edit details</Button>
            )}
          </div>
        </div>

        {isFailed && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 md:px-5">
            <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--danger)]">Processing failed.</p>
              {doc.errorMessage ? (
                <p className="mt-1 break-all font-mono text-xs leading-relaxed text-[var(--ink-700)]">{doc.errorMessage.length > 300 ? doc.errorMessage.slice(0, 300) + "…" : doc.errorMessage}</p>
              ) : (
                <p className="mt-0.5 text-sm text-[var(--ink-700)]">The pipeline reported no reason. Re-analyze the document, or delete it and upload it again.</p>
              )}
            </div>
          </div>
        )}
        {isProcessing && <ProcessingState status={rawStatus} />}

        {/* ── Executive summary + focal block: clauses needing review ── */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <section className={`rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-6 ${showFocal ? "lg:col-span-8" : "lg:col-span-12"}`}>
            <div className="flex items-start gap-3.5">
              <SonarMark size="md" tile className="hidden sm:inline-flex" />
              <div className="min-w-0 flex-1">
                <h3 className="mb-1.5 text-sm font-semibold text-[var(--ai-ink)]">Sonar executive summary</h3>
                {!isReady ? (
                  <p className="text-base text-[var(--ink-600)]">The summary appears once processing completes.</p>
                ) : summary ? (
                  <p className="max-w-[78ch] text-base leading-relaxed text-foreground">{summary}</p>
                ) : !classification && classError ? (
                  <p className="text-base text-[var(--ink-600)]">
                    The analysis for this document couldn&apos;t be loaded.{" "}
                    <button type="button" onClick={() => refetchClass()} className="font-semibold text-[var(--brand-primary-600)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Try again</button>
                  </p>
                ) : !classification ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                ) : (
                  <p className="text-base text-[var(--ink-600)]">No summary was extracted. Open the SOW analyzer for the full clause breakdown.</p>
                )}
                <div className="mt-4">
                  <Button variant="outline" size="lg" className="md:h-9" asChild>
                    <Link href={`/projects/${project.id}/sow`}><FileText size={14} />View all clauses<ArrowRight size={13} strokeWidth={2.25} /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {showFocal && (
            <section aria-label="Clauses needing review" className="flex flex-col rounded-xl bg-[var(--navy)] p-5 text-white md:p-6 lg:col-span-4">
              <h3 className="text-sm font-medium text-[var(--navy-foreground)]">Clauses needing review</h3>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-bold leading-none tabular-nums tracking-tight">{needsReview}</span>
                <span className="text-sm text-[var(--navy-foreground)]">of {totalRiskClauses} clauses are high or critical</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-[var(--navy-border)] pt-4 text-sm">
                {RISK_LEVELS.map((r) => (
                  <div key={r} className="flex items-center justify-between gap-2">
                    <dt className="text-[var(--navy-foreground)]">{RISK_META[r].label}</dt>
                    <dd className="font-semibold tabular-nums">{riskCounts[r]}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 lg:mt-auto lg:pt-5">
                <Button size="lg" className="w-full" asChild>
                  <Link href={`/projects/${project.id}/sow`}>Review clauses<ArrowRight size={14} strokeWidth={2.25} /></Link>
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* ── Risk intelligence (visual) ────────────────────── */}
        {isReady && totalRiskClauses > 0 && (
          <MotionReveal><RiskIntelligence counts={riskCounts} categories={catData} /></MotionReveal>
        )}

        {/* ── Risk analysis: heatmap + radar ────────────────── */}
        {isReady && clauses.length > 0 && (
          <MotionReveal delay={0.05}>
            <section className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
              <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-7">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Risk by category</h3>
                  <span className="text-sm text-muted-foreground">Category by severity</span>
                </div>
                {/* Rated clauses only (an unrated clause is not "low"), and every
                    category listed: no row cap, so none is silently dropped. */}
                <ClauseHeatmap clauses={clauses.filter((c) => c.riskRated !== false)} maxRows={Math.max(1, catData.length)} />
              </div>
              <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-5">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Category coverage</h3>
                  <span className="text-sm tabular-nums text-muted-foreground">{catData.length} categories</span>
                </div>
                <CategoryRadar data={catData} />
              </div>
            </section>
          </MotionReveal>
        )}

        {/* ── Key dates: current, next and most recent ──────── */}
        {isReady && dateSource && (classLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <>
            {!dateSource.extracted && !(classError && !classification) && (
              <ReanalyseNotice docId={id} role={doc.role} busy={isProcessing} title="Analysed before full date extraction">
                {dateSource.source === "legacy"
                  ? "The dates below are the ones the earlier analysis recorded. Re-analyse this document to extract every date, deadline and payment."
                  : "The earlier analysis recorded no dates. Re-analyse this document to extract dates."}
              </ReanalyseNotice>
            )}
            <KeyDatesCard docId={id} source={dateSource} timeline={keyDates} />
          </>
        ))}

        {/* ── Contract evolution (hero) ─────────────────────── */}
        {isReady && timeline && (Object.keys(timeline.currentState).length > 0 || Object.keys(timeline.initialState).length > 0) && (
          <ContractEvolution timeline={timeline} />
        )}

        {/* ── Key findings (visual) ─────────────────────────── */}
        {isReady && classification && classification.keyFindings.length > 0 && (
          <section>
            <FindingsStrip findings={classification.keyFindings} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((f, i) => {
                const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="mb-2 flex items-start gap-2.5">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${s.bg} ${s.text} shrink-0`}>{s.icon}</span>
                      <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold leading-snug text-foreground">{f.label}</span><span className={`text-xs font-medium capitalize ${s.text}`}>{f.severity}</span></span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Attention clauses ─────────────────────────────── */}
        {isReady && topRiskClauses.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><ShieldAlert size={16} className="shrink-0 text-[var(--danger)]" /><h3 className="text-lg font-semibold tracking-tight text-foreground">Clauses that need attention</h3></div>
              <Link href={`/projects/${project.id}/sow`} className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">View all<ArrowRight size={13} strokeWidth={2.25} /></Link>
            </div>
            <div className="space-y-2.5">
              {topRiskClauses.map((c) => {
                const m = RISK_META[c.riskLevel ?? "low"];
                return (
                  <div key={c.number} className={`rounded-lg border ${c.riskLevel === "critical" ? "border-[var(--danger)]/40" : "border-border"} bg-card p-3.5`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 min-w-[2rem] shrink-0 font-mono text-xs text-muted-foreground">{c.number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="break-words text-base font-semibold text-foreground">{c.title || c.number}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${m.bg} ${m.text}`}>{m.label} risk</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{clauseTypeLabel(c)}</span>
                        </div>
                        {c.summary && <p className="text-sm leading-relaxed text-[var(--ink-600)]">{c.summary}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Row D: Parties + Document details ─────────────── */}
        <section className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">Contract parties {doc.parties.length > 0 && <span className="ml-1 text-sm font-normal tabular-nums text-muted-foreground">{doc.parties.length}</span>}</h3>
            {doc.parties.length === 0 ? (
              <p className="text-sm text-[var(--ink-600)]">No parties identified in this document.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doc.parties.map((party, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0"><Building2 size={15} strokeWidth={1.75} /></span>
                    <div className="min-w-0"><div className="break-words text-base font-semibold text-foreground">{party}</div><div className="text-xs text-muted-foreground">Party {i + 1}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Document details</h3>
            <dl className="divide-y divide-[var(--ink-100)]">
              <DetailItem label="Type"><DocTypeBadge type={doc.docType} /></DetailItem>
              <DetailItem label="Lifecycle"><Badge variant="neutral" size="sm" className="text-xs capitalize">{doc.lifecycle}</Badge></DetailItem>
              <DetailItem label="Status"><Badge variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"} size="sm" className="text-xs">{rawStatus}</Badge></DetailItem>
              {doc.effectiveDate && <DetailItem label="Effective"><span className="text-sm font-medium text-foreground">{formatDate(doc.effectiveDate)}</span></DetailItem>}
              {doc.parentDocId && <DetailItem label="Parent"><Link href={`/projects/${doc.parentDocId}`} className="text-xs font-mono text-[var(--brand-primary-600)] hover:underline truncate max-w-[120px] inline-block">{doc.parentDocId.slice(0, 12)}…</Link></DetailItem>}
              <DetailItem label="Versions"><span className="text-sm font-semibold tabular-nums text-foreground">{doc.latestVersion}</span></DetailItem>
            </dl>
          </div>
        </section>

      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Edit document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label htmlFor="edit-doc-title" className="text-sm font-medium text-foreground">Title</label><Input id="edit-doc-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Document title" className="h-10 text-base md:h-9" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}><SelectTrigger className="w-full text-base md:data-[size=default]:h-9"><SelectValue /></SelectTrigger><SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">Lifecycle stage</label>
              <Select value={editLifecycle} onValueChange={(v) => setEditLifecycle(v as Lifecycle)}><SelectTrigger className="w-full text-base md:data-[size=default]:h-9"><SelectValue /></SelectTrigger><SelectContent>{LIFECYCLE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{LIFECYCLE_LABEL[l]}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setShowEdit(false)} disabled={updateMut.isPending}>Cancel</Button>
            <Button size="lg" className="md:h-9" onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── building blocks ─────────────────────────────────────── */

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 text-right">{children}</dd></div>;
}

function sevRank(s: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

function FindingsStrip({ findings }: { findings: ApiKeyFinding[] }) {
  const total = findings.length;
  const counts = SEV_ORDER.map((sev) => ({ sev, n: findings.filter((f) => f.severity === sev).length })).filter((x) => x.n > 0);
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="shrink-0 text-[var(--warning)]" />
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Key findings</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{total}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2 md:max-w-md md:flex-1">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {counts.map(({ sev, n }) => <div key={sev} className={SEV_FILL[sev]} style={{ width: `${(n / total) * 100}%` }} />)}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {counts.map(({ sev, n }) => (
            <span key={sev} className="inline-flex items-center gap-1.5 text-xs capitalize text-[var(--ink-600)]">
              <span className={`h-2 w-2 rounded-full ${SEV_FILL[sev]}`} />{sev} <span className="font-semibold tabular-nums text-foreground">{n}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project not found</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-sm font-semibold transition-colors">Back to projects</Link>
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
          <Skeleton className="h-4 w-1/2 sm:ml-[46px] sm:w-1/3" />
        </div>
      </div>
      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12"><Skeleton className="h-40 rounded-xl lg:col-span-8" /><Skeleton className="h-40 rounded-xl lg:col-span-4" /></div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      </div>
    </>
  );
}
