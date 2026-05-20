"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BluelyMark } from "@/components/ui/BluelyMark";
import {
  FileText, CheckCircle2, Clock, ArrowRight, Plus, Loader2,
  XCircle, Building2, Files, ShieldAlert, ShieldCheck, Layers,
} from "@/components/ui/icons";
import { listDocuments } from "@/lib/api";
import type { ApiDocument, DocType, RiskLevel } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PROCESSING_STATUSES = new Set([
  "PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING",
]);

const DOC_TYPE_COLORS: Record<DocType, string> = {
  SOW:       "bg-[var(--brand-primary-600)]",
  MSA:       "bg-[#7C3AED]",
  AMENDMENT: "bg-[var(--warning)]",
  NDA:       "bg-[var(--success)]",
  OTHER:     "bg-[var(--ink-400)]",
};
const DOC_TYPE_SOFT: Record<DocType, string> = {
  SOW:       "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
  MSA:       "bg-purple-50 text-purple-700",
  AMENDMENT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  NDA:       "bg-[var(--success-soft)] text-[var(--success)]",
  OTHER:     "bg-[var(--ink-100)] text-[var(--ink-600)]",
};

const STAGE_LABELS: Record<string, string> = {
  PENDING: "Queued", PARSING: "Parsing", CLASSIFYING: "Classifying",
  EMBEDDING: "Embedding", GRAPHING: "Graphing", DIFFING: "Diffing",
  TIMELINING: "Timelining", PERSISTING: "Persisting",
};

// ── Risk visual language ─────────────────────────────────────
const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_LABELS: Record<RiskLevel, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};
// Solid fill color for stacked-bar segments / dots.
const RISK_FILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger)]",
  high:     "bg-[var(--warning)]",
  medium:   "bg-[var(--ink-400)]",
  low:      "bg-[var(--success)]",
};
// Soft pill className per risk level (background + text).
function riskPillClass(risk: RiskLevel): string {
  switch (risk) {
    case "critical": return "bg-[var(--danger-soft)] text-[var(--danger)]";
    case "high":     return "bg-[var(--warning-soft)] text-[var(--warning)]";
    case "medium":   return "bg-[var(--ink-100)] text-[var(--ink-600)]";
    case "low":      return "bg-[var(--success-soft)] text-[var(--success)]";
  }
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Computed stats
  const totalDocs    = docs.length;
  const readyDocs    = docs.filter((d) => d.status === "READY");
  const processingDocs = docs.filter((d) => PROCESSING_STATUSES.has(d.status));
  const failedDocs   = docs.filter((d) => d.status === "FAILED");
  const readyPct     = totalDocs > 0 ? Math.round((readyDocs.length / totalDocs) * 100) : 0;

  // Doc type breakdown
  const byType: Partial<Record<DocType, number>> = {};
  for (const d of docs) byType[d.docType] = (byType[d.docType] ?? 0) + 1;
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]) as [DocType, number][];
  const maxTypeCount = Math.max(1, ...typeEntries.map(([, n]) => n));

  // Processing pipeline breakdown
  const byStage: Record<string, number> = {};
  for (const d of processingDocs) byStage[d.status] = (byStage[d.status] ?? 0) + 1;

  // Recent docs
  const recentDocs = [...docs]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .slice(0, 6);

  // Parties across portfolio
  const allParties = new Set<string>();
  for (const d of docs) d.parties?.forEach((p) => allParties.add(p));

  // ── Portfolio risk aggregates (only meaningful for READY docs) ──
  const riskTotals: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let totalClauses = 0;
  let totalHighRisk = 0;
  for (const d of readyDocs) {
    const rc = d.riskCounts;
    if (rc) {
      riskTotals.low      += rc.low ?? 0;
      riskTotals.medium   += rc.medium ?? 0;
      riskTotals.high     += rc.high ?? 0;
      riskTotals.critical += rc.critical ?? 0;
    }
    totalClauses  += d.clauseCount ?? 0;
    totalHighRisk += d.highRiskCount ?? 0;
  }
  const totalRiskClauses = riskTotals.low + riskTotals.medium + riskTotals.high + riskTotals.critical;

  // Portfolio-level risk posture: worst level that has any clauses.
  const portfolioRisk: RiskLevel | null =
    riskTotals.critical > 0 ? "critical"
    : riskTotals.high   > 0 ? "high"
    : riskTotals.medium > 0 ? "medium"
    : riskTotals.low    > 0 ? "low"
    : null;

  // Risk-ranked watchlist — docs with the most high+critical clauses.
  const watchlist = [...readyDocs]
    .filter((d) => (d.highRiskCount ?? 0) > 0)
    .sort((a, b) => (b.highRiskCount ?? 0) - (a.highRiskCount ?? 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio overview"
        title="Dashboard"
        subtitle="Live status across every contract — processing pipeline, document health, and recent activity."
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* ── KPI row ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-lg" />)
          ) : (
            <>
              <MetricCard
                label="Total contracts"
                value={totalDocs}
                hint={`${allParties.size} unique part${allParties.size === 1 ? "y" : "ies"}`}
                icon={<Files size={14} strokeWidth={1.75} />}
                tone="neutral"
              />
              <MetricCard
                label="Ready"
                value={readyDocs.length}
                hint={totalDocs > 0 ? `${readyPct}% of portfolio` : "No documents yet"}
                icon={<CheckCircle2 size={14} strokeWidth={1.75} />}
                tone="success"
              />
              <MetricCard
                label="Processing"
                value={processingDocs.length}
                hint={processingDocs.length > 0 ? "Pipeline active" : "All clear"}
                icon={<Clock size={14} strokeWidth={1.75} />}
                tone={processingDocs.length > 0 ? "warning" : "neutral"}
              />
              <MetricCard
                label="Portfolio risk"
                value={
                  portfolioRisk
                    ? <span className="capitalize">{RISK_LABELS[portfolioRisk]}</span>
                    : readyDocs.length > 0 ? "Clear" : "—"
                }
                hint={
                  totalHighRisk > 0
                    ? `${totalHighRisk} high-risk clause${totalHighRisk === 1 ? "" : "s"}`
                    : failedDocs.length > 0
                      ? `${failedDocs.length} need re-processing`
                      : readyDocs.length > 0 ? "No high-risk exposure" : "Awaiting analysis"
                }
                icon={
                  portfolioRisk === "critical" || portfolioRisk === "high"
                    ? <ShieldAlert size={14} strokeWidth={1.75} />
                    : <ShieldCheck size={14} strokeWidth={1.75} />
                }
                tone={
                  portfolioRisk === "critical" ? "danger"
                  : portfolioRisk === "high" || portfolioRisk === "medium" ? "warning"
                  : "success"
                }
              />
            </>
          )}
        </section>

        {/* ── Portfolio risk distribution ──────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Stacked risk bar */}
          <div className="lg:col-span-8 rounded-lg border border-border bg-card p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Portfolio · risk distribution
                </div>
                <div className="mt-1.5 numeric text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>
                  {loading ? (
                    <Skeleton className="h-7 w-20 inline-block" />
                  ) : (
                    <>{totalRiskClauses}<span className="text-[13px] font-medium text-muted-foreground ml-1.5">clauses scored</span></>
                  )}
                </div>
              </div>
              {!loading && portfolioRisk && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${riskPillClass(portfolioRisk)}`}>
                  {RISK_LABELS[portfolioRisk]} posture
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-3 rounded-full" />
                <Skeleton className="h-5 w-2/3 rounded" />
              </div>
            ) : totalRiskClauses === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)] mb-3">
                  <ShieldCheck size={20} strokeWidth={1.5} />
                </span>
                <p className="text-[13px] font-medium text-foreground mb-1">No risk-scored clauses yet</p>
                <p className="text-[12px] text-muted-foreground">Risk insights appear once documents finish analysis.</p>
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                  {RISK_ORDER.map((level) => {
                    const n = riskTotals[level];
                    if (n === 0) return null;
                    return (
                      <div
                        key={level}
                        className={`h-full ${RISK_FILL[level]} transition-all`}
                        style={{ width: `${(n / totalRiskClauses) * 100}%` }}
                        title={`${RISK_LABELS[level]}: ${n}`}
                      />
                    );
                  })}
                </div>

                {/* Legend */}
                <ul className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RISK_ORDER.map((level) => {
                    const n = riskTotals[level];
                    const pct = totalRiskClauses > 0 ? Math.round((n / totalRiskClauses) * 100) : 0;
                    return (
                      <li key={level} className="flex items-center gap-2.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${RISK_FILL[level]}`} aria-hidden />
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-foreground leading-none">
                            <span className="numeric tabular-nums">{n}</span>
                            <span className="text-[11px] font-medium text-muted-foreground ml-1.5">{pct}%</span>
                          </div>
                          <div className="text-[10.5px] text-muted-foreground mt-1">{RISK_LABELS[level]}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* Clauses analyzed insight */}
          <div className="lg:col-span-4 rounded-lg border border-border bg-card p-6 shadow-xs flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
                <Layers size={14} strokeWidth={1.75} />
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Analysis depth
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 flex-1">
                <Skeleton className="h-9 w-24 rounded" />
                <Skeleton className="h-9 w-20 rounded" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-5">
                <div>
                  <div className="numeric text-foreground leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.025em" }}>
                    {totalClauses}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1.5">Clauses analyzed</div>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="numeric leading-none flex items-baseline gap-2" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.025em" }}>
                    <span className={totalHighRisk > 0 ? "text-[var(--danger)]" : "text-foreground"}>{totalHighRisk}</span>
                    {totalHighRisk > 0 && <ShieldAlert size={16} className="text-[var(--danger)]" strokeWidth={1.75} />}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1.5">High-risk clauses</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Main 2-col grid ──────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT — Doc type + pipeline */}
          <div className="lg:col-span-7 space-y-4">
            {/* Document type breakdown */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="eyebrow">Portfolio · by document type</div>
                  <div className="mt-1.5 numeric text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>
                    {loading ? <Skeleton className="h-7 w-16 inline-block" /> : <>{totalDocs} <span className="text-[13px] font-medium text-muted-foreground ml-1">contracts</span></>}
                  </div>
                </div>
                <Button variant="primary" size="md" asChild>
                  <Link href="/projects/new">
                    <Plus size={13} /> Upload
                  </Link>
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}</div>
              ) : typeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <FileText size={20} strokeWidth={1.5} />
                  </span>
                  <p className="text-[13px] font-medium text-foreground mb-1">No contracts yet</p>
                  <p className="text-[12px] text-muted-foreground mb-4">Upload your first document to get started.</p>
                  <Button variant="primary" size="md" asChild>
                    <Link href="/projects/new"><Plus size={13} /> Upload contract</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {typeEntries.map(([type, count]) => (
                    <li key={type} className="flex items-center gap-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-20 text-center shrink-0 ${DOC_TYPE_SOFT[type]}`}>{type}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${DOC_TYPE_COLORS[type]} transition-all`}
                          style={{ width: `${(count / maxTypeCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right numeric text-[12px] font-semibold tabular-nums text-foreground shrink-0">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Processing pipeline — only show when active */}
            {!loading && processingDocs.length > 0 && (
              <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)]/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 size={14} className="text-[var(--warning)] animate-spin" />
                  <span className="text-[12.5px] font-semibold text-foreground">
                    {processingDocs.length} document{processingDocs.length !== 1 ? "s" : ""} currently processing
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byStage).map(([stage, count]) => (
                    <span key={stage} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-card border border-border text-foreground">
                      <Loader2 size={10} className="animate-spin text-[var(--warning)]" />
                      {STAGE_LABELS[stage] ?? stage} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Failed docs alert */}
            {!loading && failedDocs.length > 0 && (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-5">
                <div className="flex items-start gap-3">
                  <XCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-[var(--danger)] mb-2">
                      {failedDocs.length} document{failedDocs.length !== 1 ? "s" : ""} need re-processing
                    </p>
                    <ul className="space-y-1.5">
                      {failedDocs.slice(0, 3).map((d) => (
                        <li key={d.docId}>
                          <Link href={`/projects/${d.docId}`} className="text-[12px] text-[var(--danger)]/80 hover:text-[var(--danger)] font-medium inline-flex items-center gap-1 transition-colors">
                            {d.title || "Untitled"} <ArrowRight size={10} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Recent activity */}
          <div className="lg:col-span-5 rounded-lg border border-border bg-card p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="eyebrow">Recent contracts</div>
              <Link href="/library" className="text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
                View all <ArrowRight size={11} strokeWidth={2.25} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 flex-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}</div>
            ) : recentDocs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <p className="text-[13px] text-muted-foreground mb-1">No documents yet</p>
                <Link href="/projects/new" className="mt-2 text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
                  Upload your first contract <ArrowRight size={11} strokeWidth={2.5} />
                </Link>
              </div>
            ) : (
              <ul className="space-y-1 flex-1">
                {recentDocs.map((doc) => {
                  const isReady     = doc.status === "READY";
                  const isFailed    = doc.status === "FAILED";
                  const isProc      = PROCESSING_STATUSES.has(doc.status);
                  return (
                    <li key={doc.docId}>
                      <Link
                        href={`/projects/${doc.docId}`}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${DOC_TYPE_SOFT[doc.docType]}`}>
                          <FileText size={12} strokeWidth={1.75} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate group-hover:text-[var(--brand-primary-700)] transition-colors">
                            {doc.title || "Untitled"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DOC_TYPE_SOFT[doc.docType]}`}>{doc.docType}</span>
                            {doc.parties?.[0] && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[120px]">
                                <Building2 size={9} /> {doc.parties[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {isReady && <CheckCircle2 size={13} className="text-[var(--success)]" />}
                          {isFailed && <XCircle size={13} className="text-[var(--danger)]" />}
                          {isProc  && <Loader2 size={13} className="text-[var(--warning)] animate-spin" />}
                          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(doc.updatedAt ?? doc.createdAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── Risk-ranked watchlist ────────────────────────── */}
        {!loading && readyDocs.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-muted-foreground" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Risk watchlist · highest exposure
                </span>
              </div>
              {watchlist.length > 0 && (
                <Link href="/library" className="text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={11} strokeWidth={2.25} />
                </Link>
              )}
            </div>

            {watchlist.length === 0 ? (
              <div className="flex items-center gap-3 rounded-md bg-[var(--success-soft)] px-4 py-3.5">
                <ShieldCheck size={16} className="text-[var(--success)] shrink-0" />
                <p className="text-[12.5px] font-medium text-[var(--success)]">
                  No high-risk exposure across the portfolio.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {watchlist.map((doc) => {
                  const risk = doc.overallRisk ?? "low";
                  const highRisk = doc.highRiskCount ?? 0;
                  const clauses = doc.clauseCount ?? 0;
                  return (
                    <li key={doc.docId}>
                      <Link
                        href={`/projects/${doc.docId}`}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
                      >
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${DOC_TYPE_SOFT[doc.docType]}`}>
                          <FileText size={13} strokeWidth={1.75} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate group-hover:text-[var(--brand-primary-700)] transition-colors">
                            {doc.title || "Untitled"}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5 tabular-nums">
                            {highRisk} high-risk · {clauses} clause{clauses === 1 ? "" : "s"}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${DOC_TYPE_SOFT[doc.docType]}`}>
                          {doc.docType}
                        </span>
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${riskPillClass(risk)}`}>
                          {RISK_LABELS[risk]}
                        </span>
                        <ArrowRight size={13} className="text-muted-foreground/50 shrink-0 group-hover:text-[var(--brand-primary-600)] group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ── Unique parties strip ──────────────────────────── */}
        {!loading && allParties.size > 0 && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={14} className="text-muted-foreground" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Contracting parties · {allParties.size} identified
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(allParties).slice(0, 12).map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-border bg-card text-foreground">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] text-[9px] font-bold shrink-0">
                    {p.charAt(0).toUpperCase()}
                  </span>
                  {p}
                </span>
              ))}
              {allParties.size > 12 && (
                <span className="inline-flex items-center text-[12px] text-muted-foreground px-3 py-1.5">
                  +{allParties.size - 12} more
                </span>
              )}
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 text-[13px] text-[var(--danger)]">
            Failed to load documents: {error}
          </section>
        )}

        {/* ── Bluely strip ─────────────────────────────────── */}
        <section className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/40 px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <BluelyMark size="sm" pulse />
            <div>
              <span className="text-[12.5px] font-semibold text-[var(--ai-ink)]">Ask Bluely</span>
              <span className="hidden sm:inline text-[12px] text-muted-foreground ml-2">
                — get a portfolio-wide risk summary, find expiring contracts, or flag unusual clauses.
              </span>
            </div>
            <div className="flex-1" />
            <Button variant="ai" size="sm">Ask Bluely</Button>
          </div>
        </section>
      </div>
    </>
  );
}
