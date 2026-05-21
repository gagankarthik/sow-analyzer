"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  Briefcase, ShieldAlert, ArrowRight, Plus, RefreshCw, Layers, FileText, DollarSign,
  AlertTriangle, CheckCircle2, Clock, CalendarClock, BarChart3, PieChart, Users, TrendingUp,
  Scale, Database, Tag, Kanban, LineChart, Boxes,
} from "@/components/ui/icons";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { getClassification } from "@/lib/api";
import { computeContractValue, fmtMoney, type ValuedDoc } from "@/lib/contract-value";
import { useProjects, type LocalProject } from "@/lib/projects-store";
import type { ApiClause, ApiClassification, ApiDocument, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const SCOPE_CATS = ["ScopeOfWork", "Deliverables", "Acceptance", "ChangeControl"];
const DAY = 86_400_000;

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < DAY) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / DAY).toFixed(1)}d`;
}

type Agg = {
  project: LocalProject;
  docs: ApiDocument[];
  docCount: number;
  clauseCount: number;
  rc: { low: number; medium: number; high: number; critical: number };
  total: number;
  highRisk: number;
  overallRisk: RiskLevel;
  value: number;
  processing: number;
  failed: number;
  expired: boolean;
  upcoming: boolean;
  status: string;
};

export default function DashboardPage() {
  const { data: docs = [], isLoading, isFetching, refetch } = useDocuments();
  const projects = useProjects();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);
  const projectDocIds = useMemo(() => new Set(projects.flatMap((p) => p.docIds)), [projects]);
  const readyDocs = useMemo(() => docs.filter((d) => projectDocIds.has(d.docId) && d.status === "READY"), [docs, projectDocIds]);

  const classQueries = useQueries({
    queries: readyDocs.map((d) => ({ queryKey: documentKeys.classification(d.docId), queryFn: () => getClassification(d.docId), staleTime: 5 * 60_000 })),
  });
  const classByDoc = new Map<string, ApiClassification>();
  readyDocs.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });

  const allClauses: ApiClause[] = [];
  classByDoc.forEach((c) => c.clauses.forEach((cl) => allClauses.push(cl)));

  const now = Date.now();
  const aggregates: Agg[] = projects.map((p) => {
    const pdocs = p.docIds.map((id) => byId.get(id)).filter((d): d is ApiDocument => !!d);
    const rc = { low: 0, medium: 0, high: 0, critical: 0 };
    let clauseCount = 0, processing = 0, failed = 0, expired = false, upcoming = false;
    for (const d of pdocs) {
      clauseCount += d.clauseCount ?? 0;
      if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
      if (PROCESSING.has(d.status)) processing++;
      if (d.status === "FAILED") failed++;
      if (d.lifecycle === "expired") expired = true;
      if (d.effectiveDate) { const t = new Date(d.effectiveDate).getTime(); if (t >= now && t <= now + 90 * DAY) upcoming = true; }
    }
    const valued: ValuedDoc[] = pdocs.filter((d) => d.status === "READY").map((d) => ({ docId: d.docId, title: d.title || "Untitled", isAmendment: d.docType === "AMENDMENT", createdAt: d.createdAt, classification: classByDoc.get(d.docId) }));
    const value = computeContractValue(valued).total;
    const total = rc.low + rc.medium + rc.high + rc.critical;
    const highRisk = rc.high + rc.critical;
    const overallRisk: RiskLevel = rc.critical > 0 ? "critical" : rc.high > 0 ? "high" : rc.medium > 0 ? "medium" : "low";
    const root = pdocs.find((d) => d.docType !== "AMENDMENT") ?? pdocs[0];
    const status = root?.lifecycle ? root.lifecycle.charAt(0).toUpperCase() + root.lifecycle.slice(1) : "—";
    return { project: p, docs: pdocs, docCount: pdocs.length, clauseCount, rc, total, highRisk, overallRisk, value, processing, failed, expired, upcoming, status };
  });

  const tcv = aggregates.reduce((s, a) => s + a.value, 0);
  const valueAtRisk = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical").reduce((s, a) => s + a.value, 0);
  const varPct = tcv > 0 ? Math.round((valueAtRisk / tcv) * 100) : 0;
  const highCritCount = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical").length;
  const expiredCount = aggregates.filter((a) => a.expired).length;
  const renew = aggregates.filter((a) => a.upcoming);
  const renewValue = renew.reduce((s, a) => s + a.value, 0);
  const analyzingCount = aggregates.reduce((s, a) => s + a.processing, 0);
  const rcAll = aggregates.reduce((acc, a) => { acc.low += a.rc.low; acc.medium += a.rc.medium; acc.high += a.rc.high; acc.critical += a.rc.critical; return acc; }, { low: 0, medium: 0, high: 0, critical: 0 });
  const totalRiskClauses = rcAll.low + rcAll.medium + rcAll.high + rcAll.critical;

  const catData: CatDatum[] = useMemo(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    classByDoc.forEach((c) => c.clauses.forEach((cl) => { const e = (m[cl.category] ??= { count: 0, risk: "low" }); e.count++; if (RANK[cl.riskLevel ?? "low"] > RANK[e.risk]) e.risk = cl.riskLevel ?? "low"; }));
    return Object.entries(m).map(([name, val]) => ({ name, count: val.count, risk: val.risk })).sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classQueries.map((q) => q.dataUpdatedAt).join(",")]);

  const tcvSeries = useMemo(() => {
    const ordered = [...aggregates].sort((a, b) => new Date(a.project.createdAt).getTime() - new Date(b.project.createdAt).getTime());
    let run = 0; const out: number[] = [];
    for (const a of ordered) { run += a.value; out.push(run); }
    return out.length > 1 ? out : out.length === 1 ? [0, out[0]] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcv, projects.length]);

  const avgAnalyzeMs = useMemo(() => {
    const spans = readyDocs.map((d) => new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()).filter((n) => n > 0);
    return spans.length ? spans.reduce((s, n) => s + n, 0) / spans.length : 0;
  }, [readyDocs]);

  const valueByYear = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of aggregates) {
      const dates = a.docs.map((d) => d.effectiveDate || d.createdAt).filter(Boolean).sort();
      const year = dates.length ? String(new Date(dates[0]!).getFullYear()) : "Undated";
      m.set(year, (m.get(year) ?? 0) + a.value);
    }
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcv, projects.length]);

  const scopeRows = SCOPE_CATS.map((cat) => ({ cat, n: allClauses.filter((cl) => cl.category === cat).length })).filter((x) => x.n > 0);
  const attention = aggregates.filter((a) => a.overallRisk === "high" || a.overallRisk === "critical" || a.failed > 0).sort((a, b) => RISK_RANK[a.overallRisk] - RISK_RANK[b.overallRisk] || b.value - a.value);
  const valueRows = aggregates.filter((a) => a.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  const ranked = [...aggregates].sort((a, b) => RISK_RANK[a.overallRisk] - RISK_RANK[b.overallRisk] || b.value - a.value);
  const loading = !mounted || isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio command center"
        title="Dashboard"
        subtitle="Contract value, risk, and what needs attention across every project — live."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}><RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />Refresh</Button>
            <Link href="/projects/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-700)]"><Plus size={15} strokeWidth={2.5} />New project</Link>
          </div>
        }
      />

      <div className="app-container space-y-6 py-6 md:py-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Executive KPIs */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard label="Total contract value" value={tcv > 0 ? fmtMoney(tcv) : "—"} tone="brand" icon={<DollarSign size={14} />} hint="under management" chart={tcvSeries.length > 1 ? <Sparkline data={tcvSeries} variant="up" width={240} height={32} className="w-full" /> : undefined} />
              <MetricCard label="Value at risk" value={valueAtRisk > 0 ? fmtMoney(valueAtRisk) : "—"} tone={valueAtRisk > 0 ? "danger" : "success"} icon={<AlertTriangle size={14} />} hint={tcv > 0 ? `${varPct}% of portfolio` : "no exposure"} />
              <MetricCard label="Active contracts" value={projects.length} icon={<Briefcase size={14} />} hint={`${readyDocs.length} analyzed${analyzingCount ? ` · ${analyzingCount} processing` : ""}`} />
              <MetricCard label="High & critical" value={highCritCount} tone={highCritCount > 0 ? "danger" : "success"} icon={<ShieldAlert size={14} />} hint={`${rcAll.critical} critical · ${rcAll.high} high`} />
              <MetricCard label="Clauses analyzed" value={totalRiskClauses.toLocaleString()} icon={<FileText size={14} />} hint={`${readyDocs.length} documents`} />
              <MetricCard label="Avg. analysis time" value={fmtDuration(avgAnalyzeMs)} tone="success" icon={<Clock size={14} />} hint="per document" />
              <MetricCard label="Expired" value={expiredCount} tone={expiredCount > 0 ? "warning" : "neutral"} icon={<CalendarClock size={14} />} hint="contracts past term" />
              <MetricCard label="Renewals · 90d" value={renew.length} icon={<CalendarClock size={14} />} hint={renewValue > 0 ? fmtMoney(renewValue) : "no upcoming dates"} />
            </section>

            {/* Risk intelligence */}
            {totalRiskClauses > 0 && <MotionReveal><RiskIntelligence counts={rcAll} categories={catData} /></MotionReveal>}

            {/* Heatmap + value by year */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-7" title="Risk by category" icon={<BarChart3 size={15} />} sub="category × severity">
                  {allClauses.length === 0 ? <Empty text="The clause heatmap appears once analysis completes." /> : <ClauseHeatmap clauses={allClauses} />}
                </Card>
                <Card className="lg:col-span-5" title="Contract value by year" icon={<TrendingUp size={15} />} sub={tcv > 0 ? fmtMoney(tcv) : undefined}>
                  {valueByYear.length === 0 ? <Empty text="No dated contract value yet." /> : <BarList rows={valueByYear.map(([year, v]) => ({ label: year, value: v, sub: fmtMoney(v) }))} />}
                </Card>
              </div>
            </MotionReveal>

            {/* Needs attention + value by project */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:col-span-7">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                    <ShieldAlert size={15} className={attention.length ? "text-[var(--danger)]" : "text-[var(--success)]"} />
                    <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Needs your attention</h3>
                    {attention.length > 0 && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{attention.length}</span>}
                  </div>
                  {attention.length === 0 ? (
                    <div className="flex flex-col items-center px-5 py-10 text-center"><CheckCircle2 size={24} className="mb-2 text-[var(--success)]" /><p className="text-[13px] font-semibold text-foreground">All clear</p><p className="mt-0.5 text-[12px] text-muted-foreground">No contracts are high-risk or need review right now.</p></div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {attention.slice(0, 6).map((a) => (
                        <li key={a.project.id}>
                          <Link href={`/projects/${a.project.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span>
                            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-foreground">{a.project.name}</div><div className="text-[11.5px] text-muted-foreground">{a.highRisk > 0 ? `${a.highRisk} high-risk clause${a.highRisk === 1 ? "" : "s"}` : ""}{a.failed > 0 ? `${a.highRisk > 0 ? " · " : ""}${a.failed} failed` : ""}{a.value > 0 ? ` · ${fmtMoney(a.value)}` : ""}</div></div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary-600)]">Review<ArrowRight size={12} strokeWidth={2.25} /></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <Card className="lg:col-span-5" title="Value by project" icon={<DollarSign size={15} />} sub={tcv > 0 ? `${fmtMoney(tcv)} total` : undefined}>
                  {valueRows.length === 0 ? <Empty text="Estimated values appear once SOWs are analyzed." /> : <ValueByProject rows={valueRows} />}
                </Card>
              </div>
            </MotionReveal>

            {/* Scope coverage */}
            {scopeRows.length > 0 && (
              <Card title="Scope coverage" icon={<Boxes size={15} />} sub="scope & deliverable clauses">
                <BarList rows={scopeRows.map((s) => ({ label: s.cat.replace(/([A-Z])/g, " $1").trim(), value: s.n, color: "var(--brand-primary-400)" }))} />
              </Card>
            )}

            {/* Contracts table */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2"><Briefcase size={15} className="text-[var(--brand-primary-600)]" /><h3 className="text-[14px] font-semibold tracking-tight text-foreground">Contracts <span className="ml-1 font-mono text-[11px] text-muted-foreground">{projects.length}</span></h3></div>
                <Link href="/projects" className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">View all<ArrowRight size={12} strokeWidth={2.25} /></Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-[13px]">
                  <thead><tr className="border-b border-border bg-muted/40 text-left">{["Project", "Status", "Docs", "Clauses", "High-Risk", "Value", "Risk"].map((h, i) => <th key={h} className={`px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${i >= 2 && i <= 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {ranked.map((a) => (
                      <tr key={a.project.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3"><Link href={`/projects/${a.project.id}`} className="font-semibold text-foreground hover:text-[var(--brand-primary-700)]">{a.project.name}</Link>{a.project.client && <div className="truncate text-[11px] text-muted-foreground">{a.project.client}</div>}</td>
                        <td className="px-5 py-3 text-muted-foreground">{a.status}{a.expired ? " · expired" : ""}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.docCount}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.clauseCount.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.highRisk > 0 ? <span className="font-semibold text-[var(--danger)]">{a.highRisk}</span> : "0"}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.value > 0 ? fmtMoney(a.value) : "—"}</td>
                        <td className="px-5 py-3">{a.total > 0 ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span> : <span className="text-[11px] text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Operations & finance — needs connected systems */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Operations &amp; finance</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground"><Database size={11} />Connect your ERP / HRIS / PM systems to populate these</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                <Placeholder label="Gross margin" icon={<PieChart size={15} />} />
                <Placeholder label="Operating P&L" icon={<LineChart size={15} />} />
                <Placeholder label="Invoiced" icon={<DollarSign size={15} />} />
                <Placeholder label="Billing utilisation" icon={<BarChart3 size={15} />} />
                <Placeholder label="Budget vs payments" icon={<Scale size={15} />} />
                <Placeholder label="Milestones" icon={<CalendarClock size={15} />} />
                <Placeholder label="Quality score" icon={<CheckCircle2 size={15} />} />
                <Placeholder label="Performance" icon={<TrendingUp size={15} />} />
                <Placeholder label="Employees" icon={<Users size={15} />} />
                <Placeholder label="Roles" icon={<Tag size={15} />} />
                <Placeholder label="Workload" icon={<Kanban size={15} />} />
                <Placeholder label="Utilisation" icon={<Boxes size={15} />} />
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Card({ title, icon, sub, children, className }: { title: string; icon: ReactNode; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="text-[var(--brand-primary-600)]">{icon}</span><h3 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h3></div>
        {sub && <span className="font-mono text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; sub?: string; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-[12px]"><span className="font-medium text-foreground">{r.label}</span><span className="tabular-nums text-muted-foreground">{r.sub ?? r.value.toLocaleString()}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--brand-primary-600)" }} /></div>
        </div>
      ))}
    </div>
  );
}

function ValueByProject({ rows }: { rows: Agg[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <Link key={r.project.id} href={`/projects/${r.project.id}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="block" style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}>
          <div className="mb-1 flex items-center justify-between text-[12px]"><span className="truncate font-medium text-foreground">{r.project.name}</span><span className="shrink-0 font-semibold tabular-nums text-foreground">{fmtMoney(r.value)}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--brand-primary-600)" }} /></div>
        </Link>
      ))}
    </div>
  );
}

function Placeholder({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
      <div className="flex items-center justify-between"><div className="eyebrow truncate">{label}</div><span className="text-muted-foreground/50">{icon}</span></div>
      <div className="mt-3 text-[28px] font-bold leading-none text-[var(--ink-300)]" style={{ fontFamily: "var(--font-display)" }}>—</div>
      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Database size={11} />Connect data source</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[12.5px] text-muted-foreground">{text}</p>;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><Layers size={28} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">No contracts yet</h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">Create a project and upload its SOW. Bluey scores risk, estimates value, and rolls it up across your whole portfolio here.</p>
      <Button variant="primary" size="lg" className="mt-6 rounded-full" asChild><Link href="/projects/new"><Plus size={15} />New project</Link></Button>
    </div>
  );
}
