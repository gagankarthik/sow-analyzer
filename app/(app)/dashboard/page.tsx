"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskDonut } from "@/components/dashboard/RiskDonut";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Files, CheckCircle2, ShieldAlert, Clock, ArrowRight, Plus, Loader2,
  XCircle, Sparkles, Building2,
} from "@/components/ui/icons";
import { MotionReveal } from "@/components/MotionReveal";
import { useDocuments } from "@/lib/queries/documents";
import { formatRelativeDays } from "@/lib/format";
import type { ApiDocument, DocType, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

const TYPE_PILL: Record<DocType, string> = {
  SOW: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
  MSA: "bg-purple-50 text-purple-700",
  AMENDMENT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  NDA: "bg-[var(--success-soft)] text-[var(--success)]",
  OTHER: "bg-[var(--ink-100)] text-[var(--ink-600)]",
};
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[#C2410C]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};

// ── count-up animation (respects reduced motion) ────────────────
function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}
function CountUp({ value }: { value: number }) {
  const n = useCountUp(value);
  return <>{n.toLocaleString()}</>;
}

export default function DashboardPage() {
  const { data: docs = [], isLoading, isError } = useDocuments();

  const ready = docs.filter((d) => d.status === "READY");
  const processing = docs.filter((d) => PROCESSING.has(d.status));
  const failed = docs.filter((d) => d.status === "FAILED");
  const readyPct = docs.length ? Math.round((ready.length / docs.length) * 100) : 0;

  const risk = { low: 0, medium: 0, high: 0, critical: 0 };
  let clauseTotal = 0;
  let highRiskTotal = 0;
  for (const d of ready) {
    if (d.riskCounts) {
      risk.low += d.riskCounts.low ?? 0; risk.medium += d.riskCounts.medium ?? 0;
      risk.high += d.riskCounts.high ?? 0; risk.critical += d.riskCounts.critical ?? 0;
    }
    clauseTotal += d.clauseCount ?? 0;
    highRiskTotal += d.highRiskCount ?? 0;
  }

  const parties = new Set<string>();
  for (const d of docs) d.parties?.forEach((p) => parties.add(p));

  const watchlist = [...ready].filter((d) => (d.highRiskCount ?? 0) > 0).sort((a, b) => (b.highRiskCount ?? 0) - (a.highRiskCount ?? 0)).slice(0, 5);
  const recent = [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio overview"
        title="Dashboard"
        subtitle="Live status across every contract — risk, pipeline, and recent activity."
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* ── ROW 1: KPI strip ─────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
          ) : (
            <>
              <MetricCard label="Total contracts" value={<CountUp value={docs.length} />} hint={`${parties.size} unique part${parties.size === 1 ? "y" : "ies"}`} icon={<Files size={14} />} />
              <MetricCard label="Ready" value={<CountUp value={ready.length} />} hint={docs.length ? `${readyPct}% of portfolio` : "No documents yet"} tone="success" icon={<CheckCircle2 size={14} />} />
              <MetricCard label="High-risk clauses" value={<CountUp value={highRiskTotal} />} hint={`across ${clauseTotal.toLocaleString()} analyzed`} tone={risk.critical > 0 ? "danger" : highRiskTotal > 0 ? "warning" : "neutral"} icon={<ShieldAlert size={14} />} />
              <MetricCard label="Processing" value={<CountUp value={processing.length} />} hint={failed.length > 0 ? `${failed.length} need attention` : processing.length > 0 ? "pipeline active" : "all clear"} tone={failed.length > 0 ? "danger" : processing.length > 0 ? "warning" : "neutral"} icon={<Clock size={14} />} />
            </>
          )}
        </section>

        {isError && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger)]">
            Couldn&apos;t load your portfolio. Check your connection and try again.
          </div>
        )}

        {/* ── ROW 2: Risk distribution + pipeline status ───── */}
        <MotionReveal><section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Risk distribution" hint={`${ready.length} processed`}>
            {isLoading ? <Skeleton className="h-[180px] rounded-lg" /> : <RiskDonut counts={risk} />}
          </Card>

          <Card title="Pipeline" hint={processing.length > 0 ? `${processing.length} active` : undefined}>
            {isLoading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : processing.length === 0 ? (
              <div className="flex h-[180px] flex-col items-center justify-center text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)] mb-3"><CheckCircle2 size={18} /></span>
                <p className="text-[13px] font-medium text-foreground">Pipeline is clear</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">No contracts are processing right now.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {processing.slice(0, 4).map((d) => (
                  <li key={d.docId}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Link href={`/projects/${d.docId}`} className="text-[13px] font-medium text-foreground truncate hover:text-[var(--brand-primary-700)] transition-colors">{d.title || "Untitled"}</Link>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--warning)] shrink-0"><Loader2 size={11} className="animate-spin" />{d.status.toLowerCase()}</span>
                    </div>
                    <PipelineStepper status={d.status} showLabels={false} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section></MotionReveal>

        {/* ── ROW 3: AI insights ───────────────────────────── */}
        {!isLoading && (
          <MotionReveal delay={0.05}><section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AIInsight
              body={highRiskTotal > 0
                ? `${highRiskTotal} clause${highRiskTotal === 1 ? "" : "s"} across ${watchlist.length} contract${watchlist.length === 1 ? "" : "s"} are flagged high or critical risk.`
                : ready.length > 0 ? "No high or critical risk detected across processed contracts." : "Upload a contract to surface risk insights."}
              confidence={ready.length > 2 ? 4 : ready.length > 0 ? 3 : 1}
              href="/insights"
              tone={risk.critical > 0 ? "danger" : "default"}
            />
            <AIInsight
              body={processing.length > 0
                ? `${processing.length} contract${processing.length === 1 ? "" : "s"} are being analyzed and will be ready shortly.`
                : `${clauseTotal.toLocaleString()} clauses analyzed across ${parties.size} part${parties.size === 1 ? "y" : "ies"}.`}
              confidence={3}
              href="/projects"
            />
            <AIInsight
              body={failed.length > 0
                ? `${failed.length} contract${failed.length === 1 ? "" : "s"} failed to process and need re-uploading.`
                : `Portfolio is healthy — ${readyPct}% of contracts fully processed.`}
              confidence={ready.length > 0 ? 4 : 2}
              href="/projects"
              tone={failed.length > 0 ? "danger" : "default"}
            />
          </section></MotionReveal>
        )}

        {/* ── ROW 4: Watchlist + recent ────────────────────── */}
        <MotionReveal delay={0.1}><section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Risk watchlist" hint={watchlist.length > 0 ? `top ${watchlist.length}` : undefined}>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : watchlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)] mb-3"><CheckCircle2 size={18} /></span>
                <p className="text-[13px] font-medium text-foreground">No high-risk exposure</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Nothing needs review across the portfolio.</p>
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {watchlist.map((d) => (
                    <tr key={d.docId} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-2">
                        <Link href={`/projects/${d.docId}`} className="text-[13px] font-medium text-foreground hover:text-[var(--brand-primary-700)] transition-colors line-clamp-1">{d.title || "Untitled"}</Link>
                      </td>
                      <td className="py-2.5 px-1 w-16"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_PILL[d.docType]}`}>{d.docType}</span></td>
                      <td className="py-2.5 px-1 w-20"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${RISK_PILL[d.overallRisk ?? "low"]}`}>{d.overallRisk ?? "low"}</span></td>
                      <td className="py-2.5 pl-1 text-right w-16 text-[12px] tabular-nums text-muted-foreground">{d.highRiskCount} hi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <FooterLink href="/projects" label="View all contracts" />
          </Card>

          <Card title="Recent contracts">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-[13px] text-muted-foreground mb-3">No contracts yet</p>
                <Button variant="primary" size="md" asChild><Link href="/projects/new"><Plus size={13} /> Upload contract</Link></Button>
              </div>
            ) : (
              <ol className="relative">
                {recent.map((d, i) => (
                  <li key={d.docId} className="relative flex gap-3 pb-3 last:pb-0">
                    {i < recent.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-border" aria-hidden />}
                    <StatusDot doc={d} />
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <Link href={`/projects/${d.docId}`} className="text-[13px] font-medium text-foreground hover:text-[var(--brand-primary-700)] transition-colors line-clamp-1">{d.title || "Untitled"}</Link>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className={`font-semibold px-1.5 py-0.5 rounded-full ${TYPE_PILL[d.docType]}`}>{d.docType}</span>
                        {d.parties?.[0] && <span className="inline-flex items-center gap-1 truncate max-w-[120px]"><Building2 size={9} />{d.parties[0]}</span>}
                        <span className="ml-auto font-mono shrink-0">{formatRelativeDays(d.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section></MotionReveal>
      </div>
    </>
  );
}

/* ── building blocks ─────────────────────────────────────── */

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-5">
        <h2 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <span className="text-[11px] font-mono text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-4 pt-3 border-t border-border">
      <Link href={href} className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">{label}<ArrowRight size={12} strokeWidth={2.25} /></Link>
    </div>
  );
}

function AIInsight({ body, confidence, href, tone = "default" }: { body: string; confidence: number; href: string; tone?: "default" | "danger" }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: tone === "danger" ? "var(--danger)" : "var(--ai-gradient)" }} aria-hidden />
      <div className="flex items-center gap-1.5 mb-2.5 mt-1">
        <Sparkles size={13} className="text-[var(--ai-ink)]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">AI Insight</span>
      </div>
      <p className="text-[13.5px] leading-relaxed text-foreground min-h-[3.5em]">{body}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1" aria-label={`Confidence ${confidence} of 4`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < confidence ? "var(--ai-ink)" : "var(--ink-300)" }} />
          ))}
        </span>
        <Link href={href} className="text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
          View <ArrowRight size={11} strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}

function StatusDot({ doc }: { doc: ApiDocument }) {
  const ready = doc.status === "READY";
  const failed = doc.status === "FAILED";
  return (
    <span className="relative z-10 mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center">
      {ready ? <CheckCircle2 size={12} className="text-[var(--success)]" />
        : failed ? <XCircle size={12} className="text-[var(--danger)]" />
        : <Loader2 size={12} className="text-[var(--warning)] animate-spin" />}
    </span>
  );
}
