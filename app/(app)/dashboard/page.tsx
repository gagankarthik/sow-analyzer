"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskDonut } from "@/components/dashboard/RiskDonut";
import { RiskGauge, riskIndex } from "@/components/charts/RiskGauge";
import { MiniRiskDonut } from "@/components/charts/MiniRiskDonut";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, FileText, ShieldAlert, Clock, ArrowRight, Plus, Building2, Layers,
} from "@/components/ui/icons";
import { useDocuments } from "@/lib/queries/documents";
import { groupFamilies, type ContractFamily } from "@/lib/families";
import type { ApiDocument, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[#C2410C]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const HEAT_COLS: { k: RiskLevel; label: string; color: string }[] = [
  { k: "low", label: "Low", color: "var(--success)" },
  { k: "medium", label: "Medium", color: "var(--ink-400)" },
  { k: "high", label: "High", color: "var(--warning)" },
  { k: "critical", label: "Critical", color: "var(--danger)" },
];

function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}
function CountUp({ value }: { value: number }) { return <>{useCountUp(value).toLocaleString()}</>; }

export default function DashboardPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const families = useMemo(() => groupFamilies(docs), [docs]);

  const ready = docs.filter((d) => d.status === "READY");
  const processing = docs.filter((d) => PROCESSING.has(d.status));
  const failed = docs.filter((d) => d.status === "FAILED");

  const risk = useMemo(() => {
    const r = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const d of ready) if (d.riskCounts) { r.low += d.riskCounts.low ?? 0; r.medium += d.riskCounts.medium ?? 0; r.high += d.riskCounts.high ?? 0; r.critical += d.riskCounts.critical ?? 0; }
    return r;
  }, [ready]);
  const totalClauses = ready.reduce((s, d) => s + (d.clauseCount ?? 0), 0);
  const highRiskTotal = risk.high + risk.critical;
  const parties = useMemo(() => { const s = new Set<string>(); for (const d of docs) d.parties?.forEach((p) => s.add(p)); return s; }, [docs]);
  const portfolioIdx = riskIndex(risk);

  // Riskiest projects first for the heatmap + pies.
  const ranked = useMemo(() => [...families].sort((a, b) => b.highRiskCount - a.highRiskCount || b.clauseCount - a.clauseCount), [families]);
  const heatMax = useMemo(() => Math.max(1, ...ranked.flatMap((f) => HEAT_COLS.map((c) => f.riskCounts[c.k]))), [ranked]);

  return (
    <>
      <PageHeader eyebrow="Portfolio command center" title="Dashboard" subtitle="Risk, stats, and the full picture across every contract — live." />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* ── KPIs ─────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />) : (
            <>
              <MetricCard label="Projects" value={<CountUp value={families.length} />} hint={`${docs.length} document${docs.length === 1 ? "" : "s"}`} tone="brand" icon={<Briefcase size={14} />} />
              <MetricCard label="Clauses analyzed" value={<CountUp value={totalClauses} />} hint={`${ready.length} processed`} tone="neutral" icon={<FileText size={14} />} />
              <MetricCard label="High-risk clauses" value={<CountUp value={highRiskTotal} />} hint={`${risk.critical} critical · ${risk.high} high`} tone={risk.critical > 0 ? "danger" : highRiskTotal > 0 ? "warning" : "success"} icon={<ShieldAlert size={14} />} />
              <MetricCard label="Parties" value={<CountUp value={parties.size} />} hint="across portfolio" tone="neutral" icon={<Building2 size={14} />} />
              <MetricCard label="Processing" value={<CountUp value={processing.length} />} hint={failed.length > 0 ? `${failed.length} need attention` : processing.length > 0 ? "pipeline active" : "all clear"} tone={failed.length > 0 ? "danger" : processing.length > 0 ? "warning" : "success"} icon={<Clock size={14} />} />
            </>
          )}
        </section>

        {/* ── Portfolio risk: gauge + donut ────────────────── */}
        <MotionReveal>
          <section className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="px-5 md:px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Portfolio risk</h2>
              <span className="text-[11px] font-mono text-muted-foreground">{(risk.low + risk.medium + highRiskTotal).toLocaleString()} clauses scored</span>
            </div>
            {isLoading ? (
              <div className="p-6"><Skeleton className="h-[180px] rounded-2xl" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 md:p-6 items-center">
                <div className="lg:col-span-4 flex flex-col items-center justify-center">
                  <RiskGauge score={portfolioIdx} />
                  <p className="mt-1 text-[12px] text-muted-foreground text-center">
                    {highRiskTotal > 0 ? <><span className="font-semibold text-foreground">{highRiskTotal}</span> high/critical across the book</> : ready.length ? "No high-risk exposure" : "Awaiting analysis"}
                  </p>
                </div>
                <div className="lg:col-span-8 lg:border-l border-border lg:pl-6">
                  <RiskDonut counts={risk} />
                </div>
              </div>
            )}
          </section>
        </MotionReveal>

        {/* ── Risk by project (heatmap) ────────────────────── */}
        {!isLoading && ranked.length > 0 && (
          <MotionReveal delay={0.05}>
            <section className="rounded-3xl border border-border bg-card shadow-xs p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-2 mb-4">
                <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Risk by project</h2>
                <span className="text-[11px] font-mono text-muted-foreground">project × severity</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-separate min-w-[520px]" style={{ borderSpacing: "4px" }}>
                  <thead>
                    <tr>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pb-1 pl-1 w-[40%]">Project</th>
                      {HEAT_COLS.map((c) => (
                        <th key={c.k} className="pb-1">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: c.color }}><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.slice(0, 8).map((f) => (
                      <tr key={f.id} className="group">
                        <td className="pr-2 pl-1">
                          <Link href={`/projects/${f.root.docId}`} className="text-[12.5px] font-medium text-foreground group-hover:text-[var(--brand-primary-700)] transition-colors line-clamp-1">{f.root.title || "Untitled"}</Link>
                        </td>
                        {HEAT_COLS.map((c) => {
                          const n = f.riskCounts[c.k];
                          const intensity = n === 0 ? 0 : 0.14 + 0.72 * (n / heatMax);
                          return (
                            <td key={c.k} className="p-0">
                              <Link href={`/projects/${f.root.docId}`} className="block h-10 rounded-lg flex items-center justify-center text-[12px] font-semibold tabular-nums transition-transform hover:scale-[1.04]"
                                style={{ background: n === 0 ? "var(--ink-50)" : `color-mix(in srgb, ${c.color} ${Math.round(intensity * 100)}%, transparent)`, color: n === 0 ? "var(--ink-300)" : intensity > 0.55 ? "#fff" : "var(--ink-800)" }}
                                title={`${f.root.title} · ${c.label}: ${n}`}>{n || "·"}</Link>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </MotionReveal>
        )}

        {/* ── Each project: risk pie ───────────────────────── */}
        <MotionReveal delay={0.1}>
          <section>
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Projects {families.length > 0 && <span className="text-[11px] font-mono text-muted-foreground ml-1">{families.length}</span>}</h2>
              <Link href="/projects" className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">All projects<ArrowRight size={12} strokeWidth={2.25} /></Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
            ) : families.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ranked.slice(0, 9).map((f, i) => <ProjectPieCard key={f.id} family={f} delay={Math.min(i * 0.03, 0.18)} />)}
              </div>
            )}
          </section>
        </MotionReveal>
      </div>
    </>
  );
}

function ProjectPieCard({ family, delay }: { family: ContractFamily; delay: number }) {
  return (
    <MotionReveal delay={delay}>
      <Link href={`/projects/${family.root.docId}`} className="group block rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4">
          <MiniRiskDonut counts={family.riskCounts} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground truncate group-hover:text-[var(--brand-primary-700)] transition-colors">{family.root.title || "Untitled"}</h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{family.documents.length} doc{family.documents.length === 1 ? "" : "s"} · {family.clauseCount} clauses</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${RISK_PILL[family.overallRisk]}`}>{family.overallRisk} risk</span>
              {family.highRiskCount > 0 && <span className="text-[10.5px] text-muted-foreground tabular-nums">{family.highRiskCount} high-risk</span>}
            </div>
          </div>
        </div>
        {/* legend */}
        <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between text-[10.5px]">
          {([["Critical", "var(--danger)", family.riskCounts.critical], ["High", "var(--warning)", family.riskCounts.high], ["Med", "var(--ink-400)", family.riskCounts.medium], ["Low", "var(--success)", family.riskCounts.low]] as const).map(([l, c, n]) => (
            <span key={l} className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{n}</span>
          ))}
        </div>
      </Link>
    </MotionReveal>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] mb-5"><Layers size={28} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">No projects yet</h3>
      <p className="mt-2 text-[13px] text-muted-foreground max-w-sm">Upload a contract and Bluely will analyze it, score risk, and chart it here.</p>
      <Button variant="primary" size="lg" className="mt-6 rounded-full" asChild><Link href="/projects/new"><Plus size={15} />Upload a contract</Link></Button>
    </div>
  );
}
