"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { ConfidenceDots } from "@/components/ui/ConfidenceDots";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import {
  ArrowRight, FileText, ShieldAlert, AlertTriangle, Info, Layers, Building2,
} from "@/components/ui/icons";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { getClassification } from "@/lib/api";
import type { ApiClassification, DocType, RiskLevel, FindingSeverity } from "@/lib/types";

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_RANK: Record<FindingSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};

export default function InsightsPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);

  const classQueries = useQueries({
    queries: readyDocs.map((d) => ({ queryKey: documentKeys.classification(d.docId), queryFn: () => getClassification(d.docId), staleTime: 5 * 60_000 })),
  });
  const classByDoc = new Map<string, ApiClassification>();
  readyDocs.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });
  const analyzing = readyDocs.length > 0 && classQueries.some((q) => q.isLoading);

  const riskCounts = useMemo(() => {
    const r = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const d of readyDocs) if (d.riskCounts) { r.low += d.riskCounts.low; r.medium += d.riskCounts.medium; r.high += d.riskCounts.high; r.critical += d.riskCounts.critical; }
    return r;
  }, [readyDocs]);
  const totalClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const highRisk = riskCounts.high + riskCounts.critical;

  const catData: CatDatum[] = useMemo(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    classByDoc.forEach((c) => c.clauses.forEach((cl) => { const e = (m[cl.category] ??= { count: 0, risk: "low" }); e.count++; if (RANK[cl.riskLevel ?? "low"] > RANK[e.risk]) e.risk = cl.riskLevel ?? "low"; }));
    return Object.entries(m).map(([name, v]) => ({ name, count: v.count, risk: v.risk })).sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classQueries.map((q) => q.dataUpdatedAt).join(",")]);

  const findings = useMemo(() => {
    const out: { label: string; detail: string; severity: FindingSeverity; docId: string; docTitle: string }[] = [];
    readyDocs.forEach((d) => (classByDoc.get(d.docId)?.keyFindings ?? []).forEach((f) => out.push({ ...f, docId: d.docId, docTitle: d.title || "Untitled" })));
    return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classQueries.map((q) => q.dataUpdatedAt).join(",")]);

  const attention = useMemo(
    () => readyDocs.filter((d) => d.overallRisk === "high" || d.overallRisk === "critical").sort((a, b) => RISK_RANK[a.overallRisk ?? "low"] - RISK_RANK[b.overallRisk ?? "low"]).slice(0, 6),
    [readyDocs],
  );

  const byType = useMemo(() => {
    const m: Partial<Record<DocType, number>> = {};
    docs.forEach((d) => { m[d.docType] = (m[d.docType] ?? 0) + 1; });
    return Object.entries(m) as [DocType, number][];
  }, [docs]);

  const topCat = catData[0]?.name;
  const loading = isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Bluey · contract intelligence"
        title="Portfolio insights"
        subtitle="Risk, key findings, and where exposure concentrates across every analyzed contract."
      />

      <div className="app-container space-y-6 py-6 md:py-8">
        {/* Bluey brief */}
        <MotionReveal>
          <Card ai inset="lg" className="relative overflow-hidden rounded-2xl">
            <div className="ai-rule absolute left-0 right-0 top-0" />
            <div className="flex items-start gap-3.5">
              <BlueyMark size="lg" tile pulse={analyzing} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <div className="eyebrow text-[var(--ai-ink)]">Portfolio read · Bluey</div>
                  <ConfidenceDots level={loading ? 1 : readyDocs.length > 0 ? 3 : 1} showLabel className="ml-auto" />
                </div>
                <p className="max-w-[74ch] text-[15px] leading-relaxed text-foreground">
                  {loading ? "Loading your portfolio…" : readyDocs.length === 0 ? (
                    "No analyzed contracts yet. Upload a SOW or MSA and Bluey will surface risk and key findings here."
                  ) : (
                    <>
                      Across <strong>{readyDocs.length}</strong> analyzed document{readyDocs.length === 1 ? "" : "s"} and <strong>{totalClauses.toLocaleString()}</strong> clauses, the portfolio carries{" "}
                      <span className={highRisk > 0 ? "font-semibold text-[var(--danger)]" : "font-semibold text-[var(--success)]"}>{highRisk}</span> high or critical clause{highRisk === 1 ? "" : "s"}
                      {topCat ? <> and <strong>{findings.length}</strong> key finding{findings.length === 1 ? "" : "s"}, concentrated in <strong>{topCat}</strong>.</> : "."}
                      {highRisk === 0 && readyDocs.length > 0 ? " No high-risk exposure detected." : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </MotionReveal>

        {/* KPIs */}
        <MotionReveal>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Analyzed documents" value={readyDocs.length} hint={`${docs.length} total`} icon={<FileText size={14} />} />
            <MetricCard label="Clauses analyzed" value={totalClauses.toLocaleString()} hint="across the portfolio" icon={<Layers size={14} />} />
            <MetricCard label="High-risk clauses" value={highRisk} tone={highRisk > 0 ? "danger" : "success"} hint={`${riskCounts.critical} critical · ${riskCounts.high} high`} icon={<ShieldAlert size={14} />} />
            <MetricCard label="Key findings" value={findings.length} tone={findings.some((f) => f.severity === "critical") ? "danger" : "warning"} hint="surfaced by Bluey" icon={<AlertTriangle size={14} />} />
          </section>
        </MotionReveal>

        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : readyDocs.length === 0 ? null : (
          <>
            {totalClauses > 0 && <MotionReveal><RiskIntelligence counts={riskCounts} categories={catData} /></MotionReveal>}

            {/* Key findings across portfolio */}
            {findings.length > 0 && (
              <MotionReveal>
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert size={15} className="text-[var(--warning)]" />
                    <h2 className="text-[16px] font-semibold tracking-tight text-foreground">Key findings across the portfolio</h2>
                    <span className="font-mono text-[11px] text-muted-foreground">{findings.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {findings.slice(0, 9).map((f, i) => {
                      const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                      return (
                        <Link key={i} href={`/projects/${f.docId}`} className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-[var(--brand-primary-300)] hover:shadow-sm">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.text}`}>{s.icon}</span>
                            <span className="flex-1 text-[13px] font-semibold leading-tight text-foreground">{f.label}</span>
                          </div>
                          <p className="text-[12px] leading-relaxed text-muted-foreground">{f.detail}</p>
                          <p className="mt-1.5 truncate text-[10.5px] text-muted-foreground/70">{f.docTitle}</p>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </MotionReveal>
            )}

            {/* Contracts needing attention + by type */}
            <MotionReveal>
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <Card inset="lg" className="rounded-2xl lg:col-span-8">
                  <CardHeader title="Contracts needing attention" eyebrow="Highest risk first" action={<Badge variant="neutral" size="sm">{attention.length}</Badge>} />
                  {attention.length === 0 ? (
                    <p className="mt-5 text-[13px] text-muted-foreground">No high-risk contracts right now.</p>
                  ) : (
                    <ul className="mt-4 flex flex-col">
                      {attention.map((d) => (
                        <li key={d.docId} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[d.overallRisk ?? "low"]}`}>{d.overallRisk}</span>
                          <Link href={`/projects/${d.docId}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground hover:text-[var(--brand-primary-700)]">{d.title || "Untitled document"}</Link>
                          <span className="shrink-0 text-[11.5px] text-muted-foreground">{d.highRiskCount ?? 0} high-risk · {d.clauseCount ?? 0} clauses</span>
                          <ArrowRight size={13} className="shrink-0 text-muted-foreground" />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card inset="lg" className="rounded-2xl lg:col-span-4">
                  <CardHeader title="By document type" eyebrow="Portfolio composition" />
                  <ul className="mt-4 flex flex-col">
                    {byType.map(([type, count]) => (
                      <li key={type} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground"><Building2 size={13} className="text-muted-foreground" />{type}</span>
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{count}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            </MotionReveal>
          </>
        )}
      </div>
    </>
  );
}
