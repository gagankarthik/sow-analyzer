"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { SonarMark } from "@/components/ui/SonarMark";
import { ConfidenceDots } from "@/components/ui/ConfidenceDots";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { ChartCard } from "@/components/charts/primitives";
import { ValueRiskScatter, type ScatterPoint } from "@/components/charts/ValueRiskScatter";
import { HBarChart, type HBarDatum } from "@/components/charts/HBarChart";
import { CompositionBar, type CompositionSegment } from "@/components/charts/CompositionBar";
import { CumulativeArea, type AreaPoint } from "@/components/charts/CumulativeArea";
import { riskIndex } from "@/components/charts/RiskGauge";
import {
  RISK_COLOR, RISK_LABEL, SEVERITY_COLOR, SEVERITY_ORDER_DESC, categoricalColor, fmtCompactMoney,
} from "@/lib/chart-theme";
import {
  ShieldAlert, AlertTriangle, Info, ScatterChart as ScatterChartIcon, BarChart3, TrendingUp,
  Building2, X, GitBranch, RefreshCw, XCircle,
} from "@/components/ui/icons";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { getClassification } from "@/lib/api";
import { docValue, persistedOf } from "@/lib/contract-value";
import { categoryLabel } from "@/lib/clause-categories";
import { docTypeShort } from "@/lib/doc-types";
import type { ApiClassification, DocType, RiskLevel, FindingSeverity, PricingModel } from "@/lib/types";

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const SEV_RANK: Record<FindingSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};
const PRICING_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed price", time_and_materials: "Time & materials", milestone: "Milestone", retainer: "Retainer", mixed: "Mixed", unknown: "Unknown",
};

type Finding = { label: string; detail: string; severity: FindingSeverity; docId: string; docTitle: string };

export default function InsightsPage() {
  const router = useRouter();
  const { data: docs = [], isLoading, isError, refetch } = useDocuments();
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);

  const classQueries = useQueries({
    queries: readyDocs.map((d) => ({ queryKey: documentKeys.classification(d.docId), queryFn: () => getClassification(d.docId), staleTime: 5 * 60_000 })),
  });
  const classByDoc = new Map<string, ApiClassification>();
  readyDocs.forEach((d, i) => { const data = classQueries[i]?.data; if (data) classByDoc.set(d.docId, data); });
  const classKey = classQueries.map((q) => q.dataUpdatedAt).join(",");
  const classifying = readyDocs.length > 0 && classQueries.some((q) => q.isLoading);

  // Cross-filter state — clicking a scatter point or doc bar narrows the findings list.
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<FindingSeverity | "all">("all");

  const riskCounts = useMemo(() => {
    const r = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const d of readyDocs) if (d.riskCounts) { r.low += d.riskCounts.low; r.medium += d.riskCounts.medium; r.high += d.riskCounts.high; r.critical += d.riskCounts.critical; }
    return r;
  }, [readyDocs]);
  const totalClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const highRisk = riskCounts.high + riskCounts.critical;

  // Value × risk scatter — one point per analyzed document that has a value.
  const scatterPoints: ScatterPoint[] = useMemo(() => {
    return readyDocs.map((d) => {
      const value = docValue(classByDoc.get(d.docId), persistedOf(d));
      const rc = d.riskCounts ?? { low: 0, medium: 0, high: 0, critical: 0 };
      const level = (d.overallRisk ?? (rc.critical ? "critical" : rc.high ? "high" : rc.medium ? "medium" : "low")) as RiskLevel;
      return { id: d.docId, name: d.title || "Untitled", value, risk: riskIndex(rc), clauses: d.clauseCount ?? 0, level, currency: d.currency };
    }).filter((p) => p.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  // Risk by document — top contracts by high-risk clause count.
  const riskByDoc: HBarDatum[] = useMemo(() => {
    return readyDocs
      .map((d) => {
        const rc = d.riskCounts ?? { low: 0, medium: 0, high: 0, critical: 0 };
        const level = (d.overallRisk ?? "low") as RiskLevel;
        return { id: d.docId, label: d.title || "Untitled", value: (rc.high ?? 0) + (rc.critical ?? 0), color: RISK_COLOR[level], sub: "High-risk clauses" };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [readyDocs]);

  // Risk by category — count per clause category, colored by its peak risk.
  const riskByCategory: HBarDatum[] = useMemo(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    classByDoc.forEach((c) => c.clauses.forEach((cl) => { const e = (m[cl.category] ??= { count: 0, risk: "low" }); e.count++; if (RANK[cl.riskLevel ?? "low"] > RANK[e.risk]) e.risk = cl.riskLevel ?? "low"; }));
    return Object.entries(m).map(([label, v]) => ({ label: categoryLabel(label), value: v.count, color: RISK_COLOR[v.risk], sub: "Clauses" })).sort((a, b) => b.value - a.value).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  // Cumulative analysis volume by upload date (the only honest time axis).
  const areaPoints: AreaPoint[] = useMemo(() => {
    const ordered = [...readyDocs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const out: AreaPoint[] = [];
    let total = 0, high = 0;
    for (const d of ordered) {
      total += d.clauseCount ?? 0;
      high += (d.riskCounts?.high ?? 0) + (d.riskCounts?.critical ?? 0);
      out.push({ t: new Date(d.createdAt).getTime(), total, highRisk: high });
    }
    return out;
  }, [readyDocs]);

  // Commercial composition — pricing model mix.
  const pricingMix: CompositionSegment[] = useMemo(() => {
    const m = new Map<PricingModel, number>();
    readyDocs.forEach((d) => {
      const model = (classByDoc.get(d.docId)?.commercials?.pricingModel ?? (d.pricingModel as PricingModel | undefined) ?? "unknown");
      m.set(model, (m.get(model) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ key: k, label: PRICING_LABEL[k] ?? k, value: v, color: categoricalColor(i) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  // Document-type composition.
  const typeMix: CompositionSegment[] = useMemo(() => {
    const m: Partial<Record<DocType, number>> = {};
    docs.forEach((d) => { m[d.docType] = (m[d.docType] ?? 0) + 1; });
    return (Object.entries(m) as [DocType, number][]).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ key: k, label: docTypeShort(k), value: v, color: categoricalColor(i) }));
  }, [docs]);

  // Amendment value movement — signed deltas from amendments that state one.
  const amendmentDeltas: HBarDatum[] = useMemo(() => {
    const out: HBarDatum[] = [];
    readyDocs.forEach((d) => {
      const delta = classByDoc.get(d.docId)?.amendment?.valueDelta ?? (d.docType === "AMENDMENT" ? d.valueDelta ?? null : null);
      if (delta != null && delta !== 0) out.push({ id: d.docId, label: d.title || "Amendment", value: delta, color: delta > 0 ? "var(--brand-primary-600)" : "var(--warning)", sub: "Value change" });
    });
    return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  // Findings, sorted by severity, with cross-filter applied.
  const allFindings: Finding[] = useMemo(() => {
    const out: Finding[] = [];
    readyDocs.forEach((d) => (classByDoc.get(d.docId)?.keyFindings ?? []).forEach((f) => out.push({ ...f, docId: d.docId, docTitle: d.title || "Untitled" })));
    return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDocs, classKey]);

  const sevCounts = useMemo(() => {
    const m = {} as Record<FindingSeverity, number>;
    allFindings.forEach((f) => { m[f.severity] = (m[f.severity] ?? 0) + 1; });
    return m;
  }, [allFindings]);
  const findingsBySeverity: CompositionSegment[] = SEVERITY_ORDER_DESC
    .filter((s) => (sevCounts[s] ?? 0) > 0)
    .map((s) => ({ key: s, label: RISK_LABEL[s as RiskLevel] ?? s, value: sevCounts[s] ?? 0, color: SEVERITY_COLOR[s] }));

  const presentSeverities = SEVERITY_ORDER_DESC.filter((s) => (sevCounts[s] ?? 0) > 0);
  const filteredFindings = allFindings.filter((f) =>
    (sevFilter === "all" || f.severity === sevFilter) && (!selectedDoc || f.docId === selectedDoc),
  );
  const selectedTitle = selectedDoc ? (readyDocs.find((d) => d.docId === selectedDoc)?.title || "Untitled") : null;
  const topCat = riskByCategory[0]?.label;

  const loading = isLoading;
  const drill = (id: string) => setSelectedDoc((cur) => (cur === id ? null : id));

  return (
    <>
      <PageHeader
        eyebrow="Sonar · contract intelligence"
        title="Portfolio insights"
        subtitle="Where exposure concentrates, why, and which contracts drive it — across every analyzed document."
      />

      <div className="app-container space-y-6 py-6 md:py-8">
        {/* Sonar brief */}
        <MotionReveal>
          <Card ai inset="lg" className="relative overflow-hidden rounded-2xl">
            <div className="ai-rule absolute left-0 right-0 top-0" />
            <div className="flex items-start gap-3.5">
              <SonarMark size="lg" tile pulse={classifying} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <div className="eyebrow text-[var(--ai-ink)]">Portfolio read · Sonar</div>
                  <ConfidenceDots level={loading ? 1 : readyDocs.length > 0 ? 3 : 1} showLabel className="ml-auto" />
                </div>
                <p className="max-w-[74ch] text-[15px] leading-relaxed text-foreground">
                  {loading ? "Loading your portfolio…" : readyDocs.length === 0 ? (
                    "No analyzed contracts yet. Upload a SOW or MSA and Sonar will surface risk and key findings here."
                  ) : (
                    <>
                      Across <strong>{readyDocs.length}</strong> analyzed document{readyDocs.length === 1 ? "" : "s"} and <strong>{totalClauses.toLocaleString()}</strong> clauses, the portfolio carries{" "}
                      <span className={highRisk > 0 ? "font-semibold text-[var(--danger)]" : "font-semibold text-[var(--success)]"}>{highRisk}</span> high or critical clause{highRisk === 1 ? "" : "s"}
                      {topCat ? <> and <strong>{allFindings.length}</strong> key finding{allFindings.length === 1 ? "" : "s"}, concentrated in <strong>{topCat}</strong>.</> : "."}
                      {highRisk === 0 && readyDocs.length > 0 ? " No high-risk exposure detected." : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </MotionReveal>

        {loading ? (
          <>
            <Skeleton className="h-[380px] rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
          </>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : readyDocs.length === 0 ? null : (
          <>
            {/* Focal: value × risk */}
            <MotionReveal>
              <ChartCard
                title="Value vs. risk" icon={<ScatterChartIcon size={15} />}
                sub="bubble = clauses · click to open"
                state={scatterPoints.length < 2 ? "empty" : "ready"}
                emptyText="A value-versus-risk map appears once at least two contracts have an extracted value."
              >
                <ValueRiskScatter points={scatterPoints} onSelect={(id) => router.push(`/projects/${id}`)} />
                <p className="mt-2 text-[11.5px] text-muted-foreground">Top-right contracts cost the most <em>and</em> carry the most risk. The dashed line marks the elevated-risk threshold.</p>
              </ChartCard>
            </MotionReveal>

            {/* Risk by document + by category */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Risk by document" icon={<ShieldAlert size={15} />} sub="high-risk clauses · click to filter"
                  state={riskByDoc.length === 0 ? "empty" : "ready"}
                  emptyText="No high-risk clauses across the portfolio yet."
                >
                  <HBarChart data={riskByDoc} onSelect={drill} accentColor="var(--danger)" />
                </ChartCard>
                <ChartCard
                  title="Risk by category" icon={<BarChart3 size={15} />} sub="clauses, by peak severity"
                  state={riskByCategory.length === 0 ? "empty" : "ready"}
                  emptyText="Category breakdown appears once clauses are classified."
                >
                  <HBarChart data={riskByCategory} valueFormatter={(n) => n.toLocaleString()} />
                </ChartCard>
              </div>
            </MotionReveal>

            {/* Cumulative analysis */}
            {areaPoints.length > 1 && (
              <MotionReveal delay={0.05}>
                <ChartCard title="Analysis volume" icon={<TrendingUp size={15} />} sub="cumulative · by upload date">
                  <CumulativeArea points={areaPoints} />
                </ChartCard>
              </MotionReveal>
            )}

            {/* Commercial + composition */}
            <MotionReveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Pricing model mix" icon={<TrendingUp size={15} />} sub={`${readyDocs.length} analyzed`}>
                  <CompositionBar segments={pricingMix} unit="" />
                </ChartCard>
                <ChartCard title="By document type" icon={<Building2 size={15} />} sub={`${docs.length} total`}>
                  <CompositionBar segments={typeMix} />
                </ChartCard>
              </div>
            </MotionReveal>

            {/* Amendment value movement */}
            {amendmentDeltas.length > 0 && (
              <MotionReveal delay={0.05}>
                <ChartCard title="Amendment value movement" icon={<GitBranch size={15} />} sub="signed change vs. base · click to open">
                  <HBarChart data={amendmentDeltas} signed valueFormatter={(n) => fmtCompactMoney(n)} onSelect={(id) => router.push(`/projects/${id}`)} />
                </ChartCard>
              </MotionReveal>
            )}

            {/* Findings explorer */}
            {allFindings.length > 0 && (
              <MotionReveal>
                <section className="rounded-2xl border border-border bg-card shadow-xs">
                  <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={15} className="text-[var(--warning)]" />
                      <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Key findings</h2>
                      <span className="font-mono text-[11px] text-muted-foreground">{filteredFindings.length}/{allFindings.length}</span>
                    </div>
                    {/* Severity segment filter */}
                    <div role="group" aria-label="Filter by severity" className="inline-flex flex-wrap items-center gap-1">
                      <FilterChip active={sevFilter === "all"} onClick={() => setSevFilter("all")}>All</FilterChip>
                      {presentSeverities.map((s) => (
                        <FilterChip key={s} active={sevFilter === s} onClick={() => setSevFilter(s)} dot={SEVERITY_COLOR[s]}>
                          {RISK_LABEL[s as RiskLevel] ?? s.charAt(0).toUpperCase() + s.slice(1)}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 pt-4">
                    <CompositionBar segments={findingsBySeverity} />
                  </div>

                  {selectedTitle && (
                    <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3 py-2 text-[12px] text-[var(--brand-primary-700)]">
                      <span>Filtered to <strong>{selectedTitle}</strong></span>
                      <button type="button" onClick={() => setSelectedDoc(null)} className="ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 hover:bg-[var(--brand-primary-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                        Clear<X size={12} />
                      </button>
                    </div>
                  )}

                  {filteredFindings.length === 0 ? (
                    <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">No findings match this filter.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
                      {filteredFindings.slice(0, 12).map((f, i) => {
                        const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                        return (
                          <Link key={`${f.docId}-${i}`} href={`/projects/${f.docId}`} className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-[var(--brand-primary-300)] hover:shadow-sm">
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
                  )}
                </section>
              </MotionReveal>
            )}
          </>
        )}
      </div>
    </>
  );
}

function FilterChip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:bg-[var(--brand-primary-50)] aria-[pressed=true]:text-[var(--brand-primary-700)]"
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)]/50 py-16 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"><XCircle size={26} strokeWidth={1.5} /></span>
      <h3 className="text-[17px] font-semibold text-foreground">Couldn&apos;t load insights</h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">The document service didn&apos;t respond. Try again in a moment.</p>
      <button type="button" onClick={onRetry} className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"><RefreshCw size={14} />Try again</button>
    </div>
  );
}
