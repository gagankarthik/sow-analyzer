"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessingState } from "@/components/ProcessingState";
import {
  ArrowRight, Files, XCircle, CheckCircle2, TrendingUp, ShieldAlert,
  AlertTriangle, Info, Sparkles, FileText,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useDocuments, useClassification } from "@/lib/queries/documents";
import { useUIStore } from "@/lib/stores/ui";
import type { FindingSeverity, RiskLevel } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode; rank: number }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={14} />, rank: 4 },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={14} />, rank: 3 },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={14} />, rank: 2 },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={14} />, rank: 1 },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={14} />, rank: 0 },
};

export default function ProjectInsightsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);

  const { data: detail, isLoading, isError, error } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification } = useClassification(id, !!isReady);
  const { data: allDocs = [] } = useDocuments();

  const findings = useMemo(
    () => [...(classification?.keyFindings ?? [])].sort((a, b) => SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank),
    [classification],
  );

  if (isLoading) return <InsightsSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
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

  const clauseCount = doc.clauseCount ?? classification?.clauses.length ?? 0;
  const highRisk = doc.highRiskCount ?? 0;
  const overallRisk = (doc.overallRisk ?? "low") as RiskLevel;
  const summary = classification?.summary || doc.summary || "";

  // Portfolio comparison: where does this doc rank by high-risk clause count?
  const readyDocs = allDocs.filter((d) => d.status === "READY");
  const higherThan = readyDocs.length > 1
    ? Math.round((readyDocs.filter((d) => (d.highRiskCount ?? 0) < highRisk).length / (readyDocs.length - 1)) * 100)
    : 0;

  const RISK_TEXT: Record<RiskLevel, string> = {
    critical: "text-[var(--danger)]", high: "text-[var(--warning)]", medium: "text-[var(--ink-700)]", low: "text-[var(--success)]",
  };

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8 space-y-6">
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-[var(--danger)] leading-relaxed"><span className="font-semibold">Processing failed.</span> Insights are unavailable.</p>
          </div>
        )}
        {isProcessing && <ProcessingState status={rawStatus} title="Bluey is analyzing this document" subtitle="Insights appear automatically as each stage completes." />}

        {/* Strategic read */}
        <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/60 p-5 md:p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <BlueyMark size="md" tile pulse />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">Bluey · strategic read</div>
              {summary ? (
                <p className="text-[14px] leading-relaxed text-foreground max-w-[72ch]">{summary}</p>
              ) : (
                <p className="text-[14px] leading-relaxed text-foreground max-w-[72ch]">Bluey has indexed this document. Ask a question to get AI-powered insight on risk, obligations, timelines, and negotiation strategy.</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="ai" size="sm" onClick={toggleCopilot}><Sparkles size={12} />Ask Bluey</Button>
                <Button variant="outline" size="sm" asChild><Link href={`/projects/${project.id}/sow`}><FileText size={12} />View clauses</Link></Button>
              </div>
            </div>
          </div>
        </section>

        {/* KPI row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Clauses analyzed" value={isReady ? clauseCount : "—"} hint={isReady ? `${classification?.keyFindings.length ?? 0} key findings` : rawStatus.toLowerCase()} icon={<FileText size={14} />} />
          <MetricCard label="High-risk clauses" value={isReady ? highRisk : "—"} hint={highRisk > 0 ? "needs review" : isReady ? "no high exposure" : "—"} tone={overallRisk === "critical" ? "danger" : highRisk > 0 ? "warning" : "success"} icon={<ShieldAlert size={14} />} />
          <MetricCard label="Overall risk" value={isReady ? <span className={`capitalize ${RISK_TEXT[overallRisk]}`} style={{ fontSize: 24 }}>{overallRisk}</span> : "—"} hint="Bluey assessment" icon={<TrendingUp size={14} />} tone="neutral" />
          <MetricCard label="Portfolio context" value={readyDocs.length} hint={readyDocs.length > 1 && isReady ? `higher risk than ${higherThan}% of portfolio` : `${readyDocs.length} processed`} tone="ai" icon={<TrendingUp size={14} />} />
        </section>

        {/* What Bluey is watching */}
        <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <BlueyMark size="sm" />
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-foreground">What Bluey is watching</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Findings that may need your attention before signing.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild><Link href={`/projects/${project.id}/sow`}>Open SOW<ArrowRight size={11} /></Link></Button>
          </div>

          {!isReady ? (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3"><Sparkles size={18} strokeWidth={1.5} /></span>
              <p className="text-[13.5px] font-medium text-foreground mb-1">Insights appear once processing completes.</p>
              <p className="text-[12.5px] text-muted-foreground">Bluey is still analyzing this document.</p>
            </div>
          ) : findings.length === 0 ? (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)] mb-3"><CheckCircle2 size={18} /></span>
              <p className="text-[13.5px] font-medium text-foreground mb-1">No flagged findings.</p>
              <p className="text-[12.5px] text-muted-foreground max-w-sm">Bluey didn&apos;t surface notable risks in this document.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {findings.map((f, i) => {
                const s = SEVERITY_META[f.severity];
                return (
                  <li key={i} className="flex items-start gap-3 px-6 py-4">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} ${s.text} shrink-0`}>{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-foreground">{f.label}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>{f.severity}</span>
                      </div>
                      <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">{f.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Document details */}
        <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Document details</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Detail label="Title" value={doc.title || "—"} />
            <Detail label="Doc type" value={doc.docType} />
            <Detail label="Lifecycle" value={doc.lifecycle} />
            <Detail label="Parties" value={doc.parties?.join(", ") || "—"} />
            <Detail label="Effective date" value={doc.effectiveDate ?? "—"} />
            <Detail label="Latest version" value={`v${doc.latestVersion}`} />
          </div>
        </section>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-[13.5px] text-foreground truncate">{value}</span>
    </div>
  );
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

function InsightsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card"><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  );
}
