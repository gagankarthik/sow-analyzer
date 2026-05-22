"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { CategoryRadar } from "@/components/charts/CategoryRadar";
import { ContractValueChart } from "@/components/charts/ContractValueChart";
import { SowTimeline } from "@/components/SowTimeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, FileText, CheckCircle2, Loader2, XCircle, ArrowRight, Layers, Search,
  Building2, ShieldAlert, AlertTriangle, Info, Plus, GitBranch, Users, Sparkles, Trash2, DollarSign,
  RefreshCw, Maximize2, Download, Clock, ExternalLink, CalendarClock,
} from "@/components/ui/icons";
import { useDocuments, useDeleteDocument, useReprocess, documentKeys } from "@/lib/queries/documents";
import { getClassification, getDocFile, askBluey, type ApiDocFile } from "@/lib/api";
import { useUIStore } from "@/lib/stores/ui";
import { useProject, addDocToProject, removeDocFromProject, type LocalProject } from "@/lib/projects-store";
import { formatRelativeDays, formatDate } from "@/lib/format";
import { computeContractValue, fmtMoney, docValue, persistedOf, type ValueSegment } from "@/lib/contract-value";
import type { ApiClause, ApiClassification, ApiDocument, RiskLevel, FindingSeverity } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
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
const RISK_HEX: Record<RiskLevel, string> = { critical: "var(--danger)", high: "var(--warning)", medium: "var(--ink-400)", low: "var(--success)" };

type AggClause = ApiClause & { _docId: string; _docTitle: string };
type TabId = "overview" | "sow" | "amendments" | "timeline" | "team" | "documents";

type View = {
  project: LocalProject;
  docs: ApiDocument[];
  readyDocs: ApiDocument[];
  allClauses: AggClause[];
  riskCounts: { low: number; medium: number; high: number; critical: number };
  catData: CatDatum[];
  keyFindings: { label: string; detail: string; severity: FindingSeverity; docTitle: string }[];
  attention: AggClause[];
  parties: string[];
  valueByDoc: Map<string, number>;
  valueSegments: ValueSegment[];
  valueTotal: number;
  valueCurrency: string | null;
  reconciledAll: boolean | null;
  classByDoc: Map<string, ApiClassification>;
  analyzingClauses: boolean;
  totalClauses: number;
  highRisk: number;
  overallRisk: RiskLevel;
  processingCount: number;
  hasAnalysis: boolean;
  goTo: (t: TabId) => void;
  onDocCreated: (docId: string) => void;
  onDocReady: () => void;
  onDelete: (doc: ApiDocument) => void;
};

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { data: allDocs = [] } = useDocuments();
  const qc = useQueryClient();
  const del = useDeleteDocument();
  const reprocess = useReprocess();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [toDelete, setToDelete] = useState<ApiDocument | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const docs = useMemo<ApiDocument[]>(() => {
    if (!project) return [];
    const byId = new Map(allDocs.map((d) => [d.docId, d]));
    return project.docIds.map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
  }, [project, allDocs]);

  const readyDocs = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);
  const processingCount = docs.filter((d) => PROCESSING.has(d.status)).length;

  const classQueries = useQueries({
    queries: readyDocs.map((d) => ({
      queryKey: documentKeys.classification(d.docId),
      queryFn: () => getClassification(d.docId),
      staleTime: 5 * 60_000,
    })),
  });

  const classByDoc = new Map<string, ApiClassification>();
  readyDocs.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });
  const analyzingClauses = readyDocs.length > 0 && classQueries.some((q) => q.isLoading);

  const allClauses: AggClause[] = [];
  readyDocs.forEach((d) => (classByDoc.get(d.docId)?.clauses ?? []).forEach((c) => allClauses.push({ ...c, _docId: d.docId, _docTitle: d.title })));

  const riskCounts = useMemo(() => {
    const r = { low: 0, medium: 0, high: 0, critical: 0 };
    if (allClauses.length > 0) { for (const c of allClauses) r[c.riskLevel ?? "low"]++; return r; }
    for (const d of readyDocs) if (d.riskCounts) { r.low += d.riskCounts.low; r.medium += d.riskCounts.medium; r.high += d.riskCounts.high; r.critical += d.riskCounts.critical; }
    return r;
  }, [allClauses, readyDocs]);

  const catData: CatDatum[] = useMemo(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    for (const c of allClauses) { const e = (m[c.category] ??= { count: 0, risk: "low" }); e.count++; if (RANK[c.riskLevel ?? "low"] > RANK[e.risk]) e.risk = c.riskLevel ?? "low"; }
    return Object.entries(m).map(([name, val]) => ({ name, count: val.count, risk: val.risk })).sort((a, b) => b.count - a.count);
  }, [allClauses]);

  const keyFindings = useMemo(() => {
    const out: View["keyFindings"] = [];
    readyDocs.forEach((d) => (classByDoc.get(d.docId)?.keyFindings ?? []).forEach((f) => out.push({ ...f, docTitle: d.title })));
    return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  }, [allClauses]); // eslint-disable-line react-hooks/exhaustive-deps

  const attention = useMemo(() => allClauses.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").sort((a, b) => RISK_SORT[a.riskLevel] - RISK_SORT[b.riskLevel]), [allClauses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Contract value via the running-total model (SOW initial + amendment deltas),
  // preferring the backend's validated commercials when present.
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
      valueByDoc: new Map(readyDocs.map((d) => [d.docId, docValue(classByDoc.get(d.docId), persistedOf(d))])),
      reconciledAll: reconciled,
    };
  }, [allClauses]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalClauses = allClauses.length || readyDocs.reduce((s, d) => s + (d.clauseCount ?? 0), 0);
  const highRisk = riskCounts.high + riskCounts.critical;
  const overallRisk: RiskLevel = riskCounts.critical > 0 ? "critical" : riskCounts.high > 0 ? "high" : riskCounts.medium > 0 ? "medium" : "low";
  const parties = useMemo(() => { const s = new Set<string>(); docs.forEach((d) => d.parties?.forEach((p) => s.add(p))); return Array.from(s); }, [docs]);

  if (!mounted) return <WorkspaceSkeleton />;
  if (!project) return <NotFound />;

  const hasDocs = docs.length > 0;
  const hasAnalysis = allClauses.length > 0;
  const amendments = docs.filter((d) => d.docType === "AMENDMENT");

  async function confirmDelete() {
    if (!toDelete) return;
    const doc = toDelete;
    try {
      await del.mutateAsync(doc.docId);
      removeDocFromProject(projectId, doc.docId);
      toast.success("Document deleted", { description: doc.title || "Untitled document" });
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setToDelete(null);
    }
  }

  // Re-run the analysis pipeline on every document in the project that isn't
  // already processing. Each re-analysis is independent, so we fire them all and
  // report how many were re-queued even if one fails.
  async function reanalyzeAll() {
    const targets = docs.filter((d) => !PROCESSING.has(d.status));
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
    project, docs, readyDocs, allClauses, riskCounts, catData, keyFindings, attention, parties,
    valueByDoc, valueSegments, valueTotal, valueCurrency, reconciledAll,
    classByDoc, analyzingClauses, totalClauses, highRisk, overallRisk, processingCount, hasAnalysis,
    goTo: setTab,
    onDocCreated: (docId) => { addDocToProject(projectId, docId); qc.invalidateQueries({ queryKey: documentKeys.all }); },
    onDocReady: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
    onDelete: (doc) => setToDelete(doc),
  };

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "sow", label: "SOW", count: hasAnalysis ? totalClauses : undefined },
    { id: "amendments", label: "Amendments", count: amendments.length || undefined },
    { id: "timeline", label: "Timeline" },
    { id: "team", label: "Team" },
    { id: "documents", label: "Documents", count: docs.length || undefined },
  ];

  return (
    <>
      <PageHeader
        eyebrow={project.client ? `Project · ${project.client}` : "Project"}
        title={project.name}
        subtitle={hasDocs ? `${docs.length} document${docs.length === 1 ? "" : "s"}${processingCount > 0 ? ` · ${processingCount} analyzing` : ""} · ${totalClauses.toLocaleString()} clauses` : "Upload your SOW to begin the analysis."}
        actions={
          <div className="flex items-center gap-2">
            {hasDocs && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={reanalyzeAll} disabled={reanalyzing || processingCount === docs.length} title="Re-run analysis on every document in this project">
                <RefreshCw size={14} className={reanalyzing ? "animate-spin" : undefined} />{reanalyzing ? "Re-analyzing…" : "Re-analyze"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("documents")}><FileText size={14} />Documents</Button>
            <Button variant="ai" size="sm" className="gap-1.5" onClick={toggleCopilot}><Sparkles size={13} />Ask Bluey</Button>
            <Link href="/projects" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
              <ChevronLeft size={14} />Projects
            </Link>
          </div>
        }
      />

      <div className="border-b border-border bg-card">
        <div className="app-container">
          <nav className="-mb-px flex items-center gap-6 overflow-x-auto scrollbar-none" aria-label="Project sections">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} data-active={tab === t.id || undefined}
                className={cn(
                  "-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "data-[active=true]:border-[var(--brand-primary-600)] data-[active=true]:text-foreground",
                )}>
                {t.label}
                {typeof t.count === "number" && <span className="ml-0.5 font-mono text-[10.5px] tabular-nums text-muted-foreground/70">{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="app-container space-y-6 py-6 md:py-8">
        {tab === "overview" && <OverviewPanel v={v} />}
        {tab === "sow" && <SowPanel v={v} />}
        {tab === "amendments" && <AmendmentsPanel amendments={amendments} v={v} />}
        {tab === "timeline" && <TimelinePanel v={v} />}
        {tab === "team" && <TeamPanel v={v} />}
        {tab === "documents" && <DocumentsPanel v={v} />}
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
          <p className="py-1 text-[13.5px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{toDelete?.title || "Untitled document"}</span> and its analysis will be permanently removed from this project. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setToDelete(null)} disabled={del.isPending}>Cancel</Button>
            <Button variant="outline" size="md" onClick={confirmDelete} disabled={del.isPending} className="border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)] hover:border-[var(--danger)]/50 hover:bg-[var(--danger-soft)]">
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
  return (
    <>
      <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 shadow-xs md:p-6">
        <div className="flex items-start gap-3.5">
          <BlueyMark size="md" tile pulse={v.analyzingClauses} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">Bluey · project overview</div>
            {!v.hasAnalysis ? (
              <p className="text-[13.5px] text-muted-foreground">{v.analyzingClauses || v.processingCount > 0 ? "Analyzing the documents in this project — the overview appears as each SOW finishes." : "Upload a SOW and Bluey will summarize the project here."}</p>
            ) : (
              <p className="max-w-[80ch] text-[14px] leading-relaxed text-foreground">
                This project spans <strong>{v.readyDocs.length}</strong> analyzed document{v.readyDocs.length === 1 ? "" : "s"} and <strong>{v.totalClauses.toLocaleString()}</strong> clauses, with an overall risk of <span className={`font-semibold ${RISK_META[v.overallRisk].text}`}>{RISK_META[v.overallRisk].label.toLowerCase()}</span>.{" "}
                {v.highRisk > 0 ? <><strong>{v.highRisk}</strong> clause{v.highRisk === 1 ? "" : "s"} are high or critical and need review.</> : "No high or critical clauses were found."}
                {v.parties.length > 0 && <> Counterparties: {v.parties.slice(0, 3).join(", ")}{v.parties.length > 3 ? `, +${v.parties.length - 3} more` : ""}.</>}
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

      {v.hasAnalysis && <MotionReveal><RiskIntelligence counts={v.riskCounts} categories={v.catData} /></MotionReveal>}

      {v.hasAnalysis && (
        <MotionReveal delay={0.05}>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6 lg:col-span-7">
              <h3 className="mb-4 text-[14px] font-semibold tracking-tight text-foreground">Risk by category</h3>
              <ClauseHeatmap clauses={v.allClauses} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6 lg:col-span-5">
              <h3 className="mb-2 text-[14px] font-semibold tracking-tight text-foreground">Category coverage</h3>
              <CategoryRadar data={v.catData} />
            </div>
          </section>
        </MotionReveal>
      )}

      {v.hasAnalysis && <CategoryBars catData={v.catData} />}

      {v.attention.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><ShieldAlert size={15} className="text-[var(--danger)]" /><h3 className="text-[14px] font-semibold tracking-tight text-foreground">Clauses that need attention</h3></div>
            <button onClick={() => v.goTo("sow")} className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">All clauses<ArrowRight size={11} strokeWidth={2.25} /></button>
          </div>
          <div className="space-y-2.5">{v.attention.slice(0, 5).map((c, i) => <AttentionRow key={`${c._docId}-${c.number}-${i}`} c={c} />)}</div>
        </section>
      )}

      {v.parties.length > 0 && <PartiesCard parties={v.parties} />}
    </>
  );
}

function ValueBar({ segments, total, currency, reconciled }: { segments: ValueSegment[]; total: number; currency: string | null; reconciled: boolean | null }) {
  const [hover, setHover] = useState<number | null>(null);
  // We have an authoritative total when reconciled is known (true = parts add up
  // to the document's stated total; false = stated total used but parts don't).
  const authoritative = reconciled != null;
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><DollarSign size={12} className="text-[var(--success)]" />{authoritative ? "Total contract value" : "Estimated contract value"}</div>
          <div className="mt-1 text-[30px] font-bold leading-none tabular-nums text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{fmtMoney(total, currency)}</div>
        </div>
        <div className="flex items-center gap-2">
          {reconciled === true && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--success)]" title="The document's stated total and the component amounts reconcile."><CheckCircle2 size={11} />Validated</span>}
          {reconciled === false && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--warning)]" title="Showing the document's stated total. The component amounts are estimates and don't fully reconcile — re-analyze for validated figures."><AlertTriangle size={11} />Stated total · review parts</span>}
          <span className="text-[11px] text-muted-foreground">{segments.length} document{segments.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="mt-4 flex h-4 overflow-hidden rounded-md bg-muted">
        {segments.map((s, i) => (
          <div key={`${s.docId}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="h-full transition-opacity" title={`${s.label}: ${fmtMoney(s.value, currency)}${s.source ? `\n“${s.source}”` : ""}`}
            style={{ width: `${(s.value / total) * 100}%`, background: SEG_COLORS[i % SEG_COLORS.length], opacity: hover === null || hover === i ? 1 : 0.35 }} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        {segments.map((s, i) => (
          <span key={`${s.docId}-${i}`} className="contents">
            {i > 0 && <span className="font-semibold text-muted-foreground">+</span>}
            <Link href={`/projects/${s.docId}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 transition-all hover:border-[var(--brand-primary-300)]"
              style={{ opacity: hover === null || hover === i ? 1 : 0.5 }} title={s.source ?? undefined}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold tabular-nums text-foreground">{fmtMoney(s.value, currency)}</span>
            </Link>
          </span>
        ))}
        <span className="font-semibold text-muted-foreground">=</span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand-primary-50)] px-2.5 py-1.5">
          <span className="font-semibold text-[var(--brand-primary-700)]">Total</span>
          <span className="font-bold tabular-nums text-[var(--brand-primary-700)]">{fmtMoney(total, currency)}</span>
        </span>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {reconciled === true
          ? "Read from the documents and reconciled by Bluey's validation agent (SOW base + each amendment add up to the stated total). Hover a segment to see the source text; click to open that document."
          : reconciled === false
          ? "Showing the document's stated total (e.g. “New Total Project Cost”), which is authoritative. The component amounts below are estimates that don't fully reconcile to it — re-analyze the documents for validated per-amendment figures."
          : "Estimated from monetary amounts detected in the contract text. Re-analyze the documents for validated figures. Hover a segment to highlight; click to open that document."}
      </p>
    </section>
  );
}

/* ── Commercial terms — aggregated across the SOW AND every amendment ──── */
type Tagged<T> = T & { _src: string; _amend: boolean };

function CommercialTerms({ v }: { v: View }) {
  const cur = v.valueCurrency;
  const [now] = useState(() => Date.now()); // mount-time reference for overdue dates

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
        out.push({ ...x, _src: d.title || "Untitled", _amend: d.docType === "AMENDMENT" });
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
  let pricingModel = "", paymentTerms = "", caps: number | null = null, expenses = "", latePayment = "";
  for (const d of v.readyDocs) {
    const com = v.classByDoc.get(d.docId)?.commercials;
    if (!com) continue;
    if (com.pricingModel && com.pricingModel !== "unknown") pricingModel = com.pricingModel;
    if (com.paymentTerms) paymentTerms = com.paymentTerms;
    if (com.caps != null) caps = com.caps;
    if (com.expenses) expenses = com.expenses;
    if (com.latePayment) latePayment = com.latePayment;
  }
  const facts: { label: string; value: string }[] = [];
  if (pricingModel) facts.push({ label: "Pricing model", value: PRICING_LABEL[pricingModel] ?? pricingModel });
  if (paymentTerms) facts.push({ label: "Payment terms", value: paymentTerms });
  if (caps != null) facts.push({ label: "Not-to-exceed cap", value: fmtMoney(caps, cur) });
  if (expenses) facts.push({ label: "Expenses", value: expenses });
  if (latePayment) facts.push({ label: "Late payment", value: latePayment });

  const hasAnything = facts.length || schedule.length || rateCard.length || deliverables.length || milestones.length || slas.length || personnel.length || allDeadlines.length;
  if (!hasAnything) return null;

  return (
    <MotionReveal delay={0.04}>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6">
        <h3 className="mb-1 flex items-center gap-2 text-[14px] font-semibold tracking-tight text-foreground"><FileSignatureFallback />Commercial terms</h3>
        <p className="mb-4 text-[11.5px] text-muted-foreground">Aggregated across the SOW and all {v.readyDocs.length} analyzed document{v.readyDocs.length === 1 ? "" : "s"}.</p>

        {facts.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                  <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <CalendarClock size={11} className={`shrink-0 ${overdue ? "text-[var(--danger)]" : "text-muted-foreground"}`} />
                      <span className="truncate text-foreground">{dl.label}</span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">{dl.kind}</span>
                      {dl.amend && <AmendTag />}
                    </span>
                    <span className={`shrink-0 tabular-nums ${overdue ? "font-semibold text-[var(--danger)]" : "text-muted-foreground"}`}>
                      {formatDate(dl.date)} · {formatRelativeDays(dl.date)}
                    </span>
                  </li>
                );
              })}
            </TermsBlock>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {schedule.length > 0 && (
            <TermsBlock title="Payment schedule" count={schedule.length}>
              {schedule.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-foreground">{p.label}{p.trigger ? <span className="text-muted-foreground"> · {p.trigger}</span> : null}</span>{p._amend && <AmendTag />}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">{p.percent != null ? `${p.percent}%` : ""}{p.percent != null && p.amount != null ? " · " : ""}{p.amount != null ? fmtMoney(p.amount, cur) : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {milestones.length > 0 && (
            <TermsBlock title="Milestones" count={milestones.length}>
              {milestones.map((mst, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><Clock size={11} className="shrink-0 text-muted-foreground" /><span className="truncate text-foreground">{mst.name}</span>{mst._amend && <AmendTag />}</span>
                  <span className="shrink-0 text-muted-foreground">{mst.date ? formatDate(mst.date) : ""}{mst.payment != null ? ` · ${fmtMoney(mst.payment, cur)}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {deliverables.length > 0 && (
            <TermsBlock title="Deliverables" count={deliverables.length}>
              {deliverables.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-foreground">{d.name}</span>{d._amend && <AmendTag />}</span>
                  <span className="shrink-0 text-muted-foreground">{d.dueDate ? formatDate(d.dueDate) : ""}{d.value != null ? ` · ${fmtMoney(d.value, cur)}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {rateCard.length > 0 && (
            <TermsBlock title="Rate card" count={rateCard.length}>
              {rateCard.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-foreground">{r.role}</span>{r._amend && <AmendTag />}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">{r.rate != null ? fmtMoney(r.rate, cur) : "—"}{r.unit ? <span className="font-normal text-muted-foreground">/{r.unit}</span> : null}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {slas.length > 0 && (
            <TermsBlock title="Service levels" count={slas.length}>
              {slas.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-foreground">{s.metric}</span>{s._amend && <AmendTag />}</span>
                  <span className="shrink-0 text-muted-foreground">{s.target ?? ""}{s.window ? ` · ${s.window}` : ""}</span>
                </li>
              ))}
            </TermsBlock>
          )}

          {personnel.length > 0 && (
            <TermsBlock title="Key personnel" count={personnel.length}>
              {personnel.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-foreground">{p.name || p.role}{p.name ? <span className="text-muted-foreground"> · {p.role}</span> : null}</span>{p._amend && <AmendTag />}</span>
                  {p.keyPerson && <span className="shrink-0 rounded-full bg-[var(--brand-primary-50)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--brand-primary-700)]">Key person</span>}
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
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[var(--warning-soft)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--warning)]" title="Added or changed by an amendment">
      <GitBranch size={8} />Amd
    </span>
  );
}

const PRICING_LABEL: Record<string, string> = {
  fixed: "Fixed fee", time_and_materials: "Time & materials", milestone: "Milestone-based", retainer: "Retainer", mixed: "Mixed", unknown: "—",
};

function FileSignatureFallback() {
  return <DollarSign size={15} className="text-[var(--success)]" />;
}

function TermsBlock({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h4>
        <span className="font-mono text-[10.5px] text-muted-foreground/70">{count}</span>
      </div>
      <ul className="divide-y divide-border/60">{children}</ul>
    </div>
  );
}

function CategoryBars({ catData }: { catData: CatDatum[] }) {
  const max = Math.max(1, ...catData.map((c) => c.count));
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6">
      <h3 className="mb-4 text-[14px] font-semibold tracking-tight text-foreground">Clauses by category</h3>
      <div className="space-y-3">
        {catData.map((c) => (
          <div key={c.name}>
            <div className="mb-1 flex items-center justify-between text-[12px]"><span className="font-medium text-foreground">{c.name}</span><span className="tabular-nums text-muted-foreground">{c.count}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: RISK_HEX[c.risk] }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── SOW (filters + clause side panel) ─────────────────────────── */
function SowPanel({ v }: { v: View }) {
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<AggClause | null>(null);

  const categories = useMemo(() => Array.from(new Set(v.allClauses.map((c) => c.category))).sort(), [v.allClauses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...v.allClauses]
      .filter((c) => (risk === "all" || c.riskLevel === risk) && (category === "all" || c.category === category) && (!term || `${c.number} ${c.title} ${c.category} ${c.summary} ${c._docTitle}`.toLowerCase().includes(term)))
      .sort((a, b) => RISK_SORT[a.riskLevel] - RISK_SORT[b.riskLevel]);
  }, [v.allClauses, q, risk, category]);

  if (!v.hasAnalysis) return <AnalyzingOrEmpty v={v} label="Clause analysis appears here once a SOW finishes processing." />;

  return (
    <>
      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex min-w-[200px] flex-1 items-center">
          <Search size={15} className="pointer-events-none absolute left-3 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clauses, categories, documents…"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-[var(--brand-primary-400)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-100)]" />
        </div>
        <Select value={risk} onValueChange={(val) => setRisk(val as RiskLevel | "all")}>
          <SelectTrigger className="h-9 w-[150px] text-[13px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[170px] text-[13px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="font-mono text-[11px] text-muted-foreground">{filtered.length}/{v.allClauses.length}</span>
      </div>

      {/* clauses */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">No clauses match your filters.</div>
        ) : (
          <div className="max-h-[640px] divide-y divide-border overflow-y-auto">
            {filtered.map((c, i) => {
              const m = RISK_META[c.riskLevel ?? "low"];
              return (
                <button key={`${c._docId}-${c.number}-${i}`} onClick={() => setSelected(c)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40">
                  <span className="mt-0.5 min-w-[2.5rem] shrink-0 text-right font-mono text-[11px] text-muted-foreground">{c.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{c.title || c.number}</span>
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{c.category}</span>
                    </div>
                    {c.summary && <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-muted-foreground">{c.summary}</p>}
                    <p className="mt-1 truncate text-[10.5px] text-muted-foreground/70">{c._docTitle}</p>
                  </div>
                  <ArrowRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </section>

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
  const m = clause ? RISK_META[clause.riskLevel ?? "low"] : RISK_META.low;
  const [sug, setSug] = useState<{ loading: boolean; text: string | null; err: string | null }>({ loading: false, text: null, err: null });
  const key = clause ? `${clause._docId}:${clause.number}` : "";
  useEffect(() => { setSug({ loading: false, text: null, err: null }); }, [key]);

  async function generate() {
    if (!clause) return;
    setSug({ loading: true, text: null, err: null });
    try {
      const q = `Suggest an improved, more balanced revision of clause ${clause.number}${clause.title ? ` (${clause.title})` : ""} that reduces our risk while staying fair to both parties. Return only the revised clause text, with no preamble.`;
      const res = await askBluey(clause._docId, q);
      setSug({ loading: false, text: res.answer, err: null });
    } catch (e) {
      setSug({ loading: false, text: null, err: e instanceof Error ? e.message : "Could not generate a suggestion." });
    }
  }

  return (
    <Sheet open={!!clause} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        {clause && (
          <>
            <SheetHeader className="border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label} risk</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{clause.category}</span>
                <span className="font-mono text-[11px] text-muted-foreground">Clause {clause.number}</span>
              </div>
              <SheetTitle className="mt-1 text-[16px]">{clause.title || `Clause ${clause.number}`}</SheetTitle>
              <SheetDescription>From <span className="font-medium text-foreground">{clause._docTitle}</span></SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* Original */}
              <div>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Original clause</h4>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-mono text-[12px] leading-relaxed text-foreground">{clause.body || "No clause text was extracted."}</p>
              </div>

              {/* Suggested (real, generated by Bluey on request) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h4 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ai-ink)]"><Sparkles size={12} />Suggested revision · Bluey</h4>
                  {sug.text && !sug.loading && <button onClick={generate} className="text-[11px] font-semibold text-[var(--ai-ink)] hover:underline">Regenerate</button>}
                </div>
                {sug.loading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/40 p-3 text-[12px] text-muted-foreground"><Loader2 size={13} className="animate-spin" />Bluey is drafting a revision from this contract&apos;s clauses…</div>
                ) : sug.text ? (
                  <p className="whitespace-pre-wrap rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/40 p-3 text-[12.5px] leading-relaxed text-foreground">{sug.text}</p>
                ) : sug.err ? (
                  <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-[12px] text-[var(--danger)]">{sug.err}</div>
                ) : (
                  <button onClick={generate} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--ai-border)] bg-[var(--ai-surface)]/30 p-3 text-[12.5px] font-medium text-[var(--ai-ink)] transition-colors hover:bg-[var(--ai-surface)]/60">
                    <Sparkles size={13} />Ask Bluey to draft a more balanced version
                  </button>
                )}
              </div>

              {clause.summary && (
                <div>
                  <h4 className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ai-ink)]"><Sparkles size={12} />Bluey&apos;s analysis</h4>
                  <p className="text-[13.5px] leading-relaxed text-foreground">{clause.summary}</p>
                </div>
              )}

              {related.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Related clauses · {clause.category}</h4>
                  <ul className="space-y-1.5">
                    {related.map((r, i) => {
                      const rm = RISK_META[r.riskLevel ?? "low"];
                      return (
                        <li key={`${r._docId}-${r.number}-${i}`}>
                          <Link href={`/projects/${r._docId}/sow`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-[var(--brand-primary-300)]">
                            <span className="font-mono text-[10.5px] text-muted-foreground">{r.number}</span>
                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">{r.title || r.number}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${rm.bg} ${rm.text}`}>{rm.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Detail label="Risk level" value={m.label} />
                <Detail label="Category" value={clause.category} />
                <Detail label="Clause number" value={clause.number} />
                <Detail label="Source file" value={clause._docTitle} />
              </div>
            </div>

            <SheetFooter className="border-t border-border">
              <Button variant="primary" size="md" asChild>
                <Link href={`/projects/${clause._docId}`}><FileText size={14} />Open document</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

/* ── Amendments ────────────────────────────────────────────────── */
function AmendmentsPanel({ amendments, v }: { amendments: ApiDocument[]; v: View }) {
  if (!v.docs.length) return <UploadPrompt v={v} />;
  if (amendments.length === 0) return <EmptyPanel icon={<GitBranch size={22} strokeWidth={1.5} />} title="No amendments yet" body="Upload an amendment to a contract in this project and it'll appear here, diffed against the original." />;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {amendments.map((d) => (
        <Link key={d.docId} href={`/projects/${d.docId}/amendments`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-[var(--brand-primary-300)] hover:shadow-sm">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><GitBranch size={16} /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-foreground">{d.title || "Untitled amendment"}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">v{d.latestVersion} · updated {formatRelativeDays(d.updatedAt)}{v.valueByDoc.get(d.docId) ? ` · ~${fmtMoney(v.valueByDoc.get(d.docId)!)}` : ""}</div>
          </div>
          <ArrowRight size={14} className="mt-1 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

/* ── Timeline + activity ───────────────────────────────────────── */
function TimelinePanel({ v }: { v: View }) {
  if (!v.docs.length) return <UploadPrompt v={v} />;
  const items = [...v.docs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const statusText = (d: ApiDocument) => d.status === "READY" ? "Analysis completed" : d.status === "FAILED" ? "Processing failed" : "Processing…";
  const statusTone = (d: ApiDocument) => d.status === "READY" ? "bg-[var(--success-soft)] text-[var(--success)]" : d.status === "FAILED" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]";
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <h3 className="mb-5 text-[14px] font-semibold tracking-tight text-foreground">Timeline &amp; activity</h3>
      <ol className="relative space-y-5 border-l border-border pl-6">
        {items.map((d) => (
          <li key={d.docId} className="relative">
            <span className="absolute -left-[1.6rem] top-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-card bg-[var(--brand-primary-600)]" />
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/projects/${d.docId}`} className="text-[13.5px] font-semibold text-foreground hover:text-[var(--brand-primary-700)]">{d.title || "Untitled"}</Link>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{d.docType}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(d)}`}>{statusText(d)}</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">Added {formatDate(d.createdAt)}{d.effectiveDate ? ` · effective ${formatDate(d.effectiveDate)}` : ""} · updated {formatRelativeDays(d.updatedAt)}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Team ──────────────────────────────────────────────────────── */
function TeamPanel({ v }: { v: View }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Team</h3>
        <Button variant="outline" size="sm" className="gap-1.5"><Plus size={13} />Invite</Button>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-[12px] font-semibold text-white">YO</span>
        <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-foreground">You</div><div className="text-[11.5px] text-muted-foreground">Owner</div></div>
        <Users size={15} className="text-muted-foreground" />
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">Invite colleagues to review {v.project.name} together. Shared projects and roles are coming soon.</p>
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
  const [showUpload, setShowUpload] = useState(!v.docs.length);
  const [reader, setReader] = useState<ApiDocument | null>(null);
  const { roots, childrenByParent } = useMemo(() => buildTree(v.docs), [v.docs]);
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Documents {v.docs.length > 0 && <span className="ml-1 font-mono text-[11px] text-muted-foreground">{v.docs.length}</span>}</h3>
        {v.docs.length > 0 && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowUpload((s) => !s)}><Plus size={13} />Add document</Button>}
      </div>

      {(showUpload || !v.docs.length) && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="mb-3 text-[12.5px] text-muted-foreground">Drop a SOW, MSA, or amendment. Amendments nest under the contract they amend; open any document for its full analysis.</p>
          <UploadDropzone defaultDocType="SOW" compact onDocCreated={v.onDocCreated} onDocReady={v.onDocReady} />
        </section>
      )}

      {v.docs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <DocTree nodes={roots} childrenByParent={childrenByParent} depth={0} v={v} onView={setReader} />
        </div>
      )}

      <DocumentReader
        doc={reader}
        classification={reader ? v.classByDoc.get(reader.docId) : undefined}
        currency={v.valueCurrency}
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
            <DocRow doc={d} value={v.valueByDoc.get(d.docId)} depth={depth} onDelete={() => v.onDelete(d)} onView={() => onView(d)} />
            {kids.length > 0 && <DocTree nodes={kids} childrenByParent={childrenByParent} depth={depth + 1} v={v} onView={onView} />}
          </Fragment>
        );
      })}
    </>
  );
}

function DocRow({ doc, value, depth, onDelete, onView }: { doc: ApiDocument; value?: number; depth: number; onDelete: () => void; onView: () => void }) {
  const processing = PROCESSING.has(doc.status);
  const indent = 20 + depth * 26;
  const reprocess = useReprocess();

  async function onReanalyze() {
    try {
      await reprocess.mutateAsync(doc.docId);
      toast.success("Re-analyzing", { description: `${doc.title || "Document"} is being analyzed again.` });
    } catch (e) {
      toast.error("Couldn't re-analyze", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }

  return (
    <div className={cn("flex items-center gap-1 border-t border-border transition-colors first:border-t-0 hover:bg-muted/40", depth > 0 && "bg-muted/20")}>
      <Link href={`/projects/${doc.docId}`} className="group flex min-w-0 flex-1 items-center gap-2.5 py-3.5 pr-2" style={{ paddingLeft: indent }}>
        {depth > 0 && <GitBranch size={13} className="shrink-0 -scale-x-100 text-muted-foreground/50" />}
        <StatusDot doc={doc} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">{doc.title || "Untitled document"}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{doc.docType}</span>
            {processing ? <span className="inline-flex items-center gap-1 text-[var(--warning)]"><Loader2 size={10} className="animate-spin" />Analyzing…</span>
              : doc.status === "FAILED" ? <span className="text-[var(--danger)]">Processing failed</span>
              : <>{doc.clauseCount ?? 0} clauses · updated {formatRelativeDays(doc.updatedAt)}</>}
          </div>
        </div>
        {typeof value === "number" && value > 0 && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--success)] sm:inline-flex" title="Contract value for this document"><DollarSign size={11} />{fmtMoney(value)}</span>
        )}
        {doc.status === "READY" && doc.overallRisk && (
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${RISK_META[doc.overallRisk].bg} ${RISK_META[doc.overallRisk].text}`}>{doc.overallRisk}</span>
        )}
      </Link>
      <button onClick={onView} aria-label={`Open ${doc.title || "document"} in split view`} title="Open document & analysis side by side"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <Maximize2 size={15} />
      </button>
      <button onClick={onReanalyze} disabled={reprocess.isPending || processing} aria-label={`Re-analyze ${doc.title || "document"}`} title="Re-run analysis on this document"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40">
        <RefreshCw size={15} className={reprocess.isPending ? "animate-spin" : undefined} />
      </button>
      <button onClick={onDelete} aria-label={`Delete ${doc.title || "document"}`} className="mr-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

/* ── Split-view reader: original file ⟷ AI analysis (with provenance) ── */
function DocumentReader({ doc, classification, currency, onClose }: { doc: ApiDocument | null; classification?: ApiClassification; currency: string | null; onClose: () => void }) {
  const [file, setFile] = useState<ApiDocFile | null>(null);
  const [html, setHtml] = useState<string | null>(null);   // converted DOCX
  const [text, setText] = useState<string | null>(null);   // plain-text files
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) { setFile(null); setHtml(null); setText(null); setErr(null); return; }
    let alive = true;
    setLoading(true); setErr(null); setFile(null); setHtml(null); setText(null);

    (async () => {
      try {
        const f = await getDocFile(doc.docId);
        if (!alive) return;
        setFile(f);
        const name = f.filename.toLowerCase();
        const isDocx = name.endsWith(".docx") || f.contentType.includes("wordprocessingml");
        const isTxt = f.contentType.startsWith("text/") || name.endsWith(".txt");
        if (isDocx) {
          const buf = await (await fetch(f.url)).arrayBuffer();
          const mammoth = await import("mammoth/mammoth.browser");
          const res = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (alive) setHtml(res.value || "<p>This document has no extractable text.</p>");
        } else if (isTxt) {
          const t = await (await fetch(f.url)).text();
          if (alive) setText(t);
        }
        // PDFs render via <iframe>; .doc / other types fall back to "open original".
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not load the document.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [doc?.docId]);

  const fname = file?.filename.toLowerCase() ?? "";
  const isPdf = file?.contentType === "application/pdf" || fname.endsWith(".pdf");
  const lineItems = classification?.validation?.lineItems ?? [];
  const findings = classification?.keyFindings ?? [];
  const reconciled = doc?.reconciled ?? classification?.validation?.reconciled;
  const value = docValue(classification, doc ? persistedOf(doc) : undefined);

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
      <DialogContent className="left-0 top-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 ring-0 sm:max-w-none">
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <DialogTitle className="flex min-w-0 items-center gap-2 text-[14px]">
            <FileText size={15} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{doc?.title || "Document"}</span>
          </DialogTitle>
          <div className="mr-8 flex shrink-0 items-center gap-2">
            <button onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" title="Export this document's data + analysis as JSON"><Download size={13} />Export</button>
            {file && <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"><ExternalLink size={13} />Original</a>}
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          {/* Left — original file (PDF inline · DOCX converted · TXT · else download).
              On mobile the panes stack and the dialog body scrolls; give each a sensible
              min-height so the file pane never collapses to zero. lg+ restores the
              equal-split, independently-scrolling columns. */}
          <div className="min-h-[55vh] overflow-hidden border-b border-border bg-muted/30 lg:min-h-0 lg:border-b-0 lg:border-r">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground"><Loader2 size={16} className="mr-2 animate-spin" />Loading document…</div>
            ) : err ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-muted-foreground"><XCircle size={20} className="text-[var(--danger)]" />{err}</div>
            ) : isPdf && file ? (
              <iframe src={file.url} title={doc?.title || "Document"} className="h-full w-full" />
            ) : html != null ? (
              <div className="h-full overflow-y-auto px-4 py-6">
                <div className="docx-page mx-auto max-w-[820px] rounded-lg bg-white p-8 shadow-sm md:p-12" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            ) : text != null ? (
              <div className="h-full overflow-y-auto px-4 py-6">
                <pre className="mx-auto max-w-[820px] whitespace-pre-wrap rounded-lg bg-white p-8 font-mono text-[12.5px] leading-relaxed text-foreground shadow-sm md:p-12">{text}</pre>
              </div>
            ) : file ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><FileText size={22} /></span>
                <p className="text-[13px] font-medium text-foreground">Preview unavailable for .{file.filename.split(".").pop()?.toUpperCase()} files</p>
                <p className="max-w-xs text-[12px] text-muted-foreground">Open the original to view it alongside the analysis. (PDF, DOCX and TXT render here directly.)</p>
                <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand-primary-600)] px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)]"><ExternalLink size={13} />Open original</a>
              </div>
            ) : null}
          </div>

          {/* Right — AI analysis with provenance */}
          <div className="bg-card p-4 lg:min-h-0 lg:overflow-y-auto">
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]"><Sparkles size={12} />Bluey · extracted from this document</div>

            {/* Value + reconciliation */}
            {value > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contract value</span>
                  {reconciled != null && (reconciled
                    ? <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--success)]"><CheckCircle2 size={11} />Reconciled</span>
                    : <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--warning)]"><AlertTriangle size={11} />Needs review</span>)}
                </div>
                <div className="mt-1 text-[24px] font-bold tabular-nums text-foreground">{fmtMoney(value, currency)}</div>
              </div>
            )}

            {/* Where the figures came from */}
            {lineItems.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Figures &amp; where they came from</h4>
                <ul className="space-y-2">
                  {lineItems.map((li, i) => (
                    <li key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12.5px] font-medium text-foreground">{li.label}</span>
                        {li.amount != null && <span className="shrink-0 font-semibold tabular-nums text-foreground">{fmtMoney(li.amount, currency)}</span>}
                      </div>
                      {li.source && <p className="mt-1 border-l-2 border-[var(--brand-primary-300)] pl-2 text-[11.5px] italic leading-relaxed text-muted-foreground">“{li.source}”</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {classification?.validation?.issues && classification.validation.issues.length > 0 && (
              <div className="mt-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3">
                <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--warning)]"><AlertTriangle size={12} />Review notes</div>
                <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-foreground">{classification.validation.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
              </div>
            )}

            {findings.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Key findings</h4>
                <ul className="space-y-2">
                  {findings.map((f, i) => {
                    const meta = SEVERITY_META[f.severity];
                    return (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
                        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.text}`}>{meta.icon}</span>
                        <div className="min-w-0"><div className="text-[12.5px] font-semibold text-foreground">{f.label}</div><p className="text-[12px] leading-relaxed text-muted-foreground">{f.detail}</p></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!classification && <p className="mt-4 text-[12.5px] text-muted-foreground">Analysis isn&apos;t available yet for this document.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── shared ────────────────────────────────────────────────────── */
function UploadPrompt({ v }: { v: View }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <h3 className="mb-1 text-[15px] font-semibold tracking-tight text-foreground">Upload your SOW</h3>
      <p className="mb-4 text-[12.5px] text-muted-foreground">Drop the contract for {v.project.name}. Bluey extracts clauses, scores risk, and surfaces key findings.</p>
      <UploadDropzone defaultDocType="SOW" onDocCreated={v.onDocCreated} onDocReady={v.onDocReady} />
    </section>
  );
}

function AnalyzingOrEmpty({ v, label }: { v: View; label: string }) {
  if (!v.docs.length) return <UploadPrompt v={v} />;
  return <EmptyPanel icon={v.processingCount > 0 || v.analyzingClauses ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} strokeWidth={1.5} />} title={v.processingCount > 0 || v.analyzingClauses ? "Analyzing…" : "Nothing here yet"} body={label} />;
}

function EmptyPanel({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">{icon}</span>
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-[12.5px] text-muted-foreground">{body}</p>
    </div>
  );
}

function AttentionRow({ c }: { c: AggClause }) {
  const m = RISK_META[c.riskLevel ?? "low"];
  return (
    <Link href={`/projects/${c._docId}/sow`} className="block rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-[var(--brand-primary-300)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 min-w-[2.5rem] shrink-0 text-right font-mono text-[11px] text-muted-foreground">{c.number}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">{c.title || c.number}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{c.category}</span>
          </div>
          {c.summary && <p className="text-[12px] leading-relaxed text-muted-foreground">{c.summary}</p>}
          <p className="mt-1 truncate text-[10.5px] text-muted-foreground/70">{c._docTitle}</p>
        </div>
      </div>
    </Link>
  );
}

function PartiesCard({ parties }: { parties: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <h3 className="mb-4 text-[14px] font-semibold tracking-tight text-foreground">Contract parties <span className="ml-1 font-mono text-[11px] text-muted-foreground">{parties.length}</span></h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {parties.map((party, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"><Building2 size={15} strokeWidth={1.75} /></span>
            <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-foreground">{party}</div><div className="text-[11px] text-muted-foreground">Party {i + 1}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusDot({ doc }: { doc: ApiDocument }) {
  if (doc.status === "READY") return <CheckCircle2 size={17} className="shrink-0 text-[var(--success)]" />;
  if (doc.status === "FAILED") return <XCircle size={17} className="shrink-0 text-[var(--danger)]" />;
  if (PROCESSING.has(doc.status)) return <Loader2 size={17} className="shrink-0 animate-spin text-[var(--warning)]" />;
  return <FileText size={17} className="shrink-0 text-muted-foreground" />;
}

function NotFound() {
  return (
    <div className="app-container flex flex-col items-center py-20 text-center">
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Layers size={24} strokeWidth={1.5} /></span>
      <h1 className="text-[22px] font-semibold text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>Project not found</h1>
      <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">This project was created on another device or browser — projects are stored locally for now.</p>
      <Link href="/projects" className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)]">Back to projects</Link>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container space-y-3 pb-4 pt-5 md:pt-6"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div>
      </div>
      <div className="app-container space-y-6 py-6 md:py-8"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-56 rounded-2xl" /></div>
    </>
  );
}
