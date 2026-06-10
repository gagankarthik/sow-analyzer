"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProcessingState } from "@/components/ProcessingState";
import { SonarMark } from "@/components/ui/SonarMark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Files, XCircle, ChevronDown, ChevronUp, Search, ShieldAlert,
  AlertTriangle, Info, Building2, CalendarClock, Sparkles, FileText,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useClassification } from "@/lib/queries/documents";
import { useUIStore } from "@/lib/stores/ui";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { CategoryRadar } from "@/components/charts/CategoryRadar";
import { MotionReveal } from "@/components/MotionReveal";
import { docTypeShort } from "@/lib/doc-types";
import { categoryLabel } from "@/lib/clause-categories";
import type { ApiClause, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", dot: "bg-[var(--danger)]" },
  high: { label: "High", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  medium: { label: "Medium", bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-600)]", dot: "bg-[var(--ink-400)]" },
  low: { label: "Low", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", dot: "bg-[var(--success)]" },
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={13} /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={13} /> },
};

export default function SowPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);

  const { data: detail, isLoading, isError, error } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, error: classErr, refetch: refetchClass } = useClassification(id, !!isReady);

  const [search, setSearch] = useState("");
  const [activeRisk, setActiveRisk] = useState<RiskLevel | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allClauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);
  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const cl of allClauses) c[cl.riskLevel ?? "low"]++;
    return c;
  }, [allClauses]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of allClauses) set.add(c.category);
    return Array.from(set).sort();
  }, [allClauses]);
  const catData = useMemo<CatDatum[]>(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    for (const c of allClauses) {
      const e = (m[c.category] ??= { count: 0, risk: "low" });
      e.count++;
      if (RISK_RANK[c.riskLevel ?? "low"] < RISK_RANK[e.risk]) e.risk = c.riskLevel ?? "low";
    }
    return Object.entries(m).map(([name, v]) => ({ name: categoryLabel(name), count: v.count, risk: v.risk })).sort((a, b) => b.count - a.count);
  }, [allClauses]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allClauses
      .filter((c) => {
        if (activeRisk && c.riskLevel !== activeRisk) return false;
        if (activeCategory !== "ALL" && c.category !== activeCategory) return false;
        if (q && !c.title.toLowerCase().includes(q) && !c.body.toLowerCase().includes(q) &&
          !c.number.toLowerCase().includes(q) && !(c.summary ?? "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"]);
  }, [allClauses, search, activeRisk, activeCategory]);

  if (isLoading) return <SowSkeleton />;
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
  const rawStatus = detail.document.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";

  const toggleExpand = (n: string) =>
    setExpanded((prev) => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8 space-y-6">
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-[var(--danger)] leading-relaxed"><span className="font-semibold">Processing failed.</span> Delete this document and try uploading again.</p>
          </div>
        )}
        {isProcessing && <ProcessingState status={rawStatus} title="Sonar is analyzing this document" subtitle="Clause extraction and risk analysis appear automatically as each stage completes." />}

        {isReady && (
          <>
            {/* Executive summary */}
            <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 md:p-6 shadow-xs">
              <div className="flex items-start gap-3.5">
                <SonarMark size="md" tile pulse />
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">Sonar · executive summary</div>
                  {classLoading ? (
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                  ) : classification?.summary ? (
                    <p className="text-[14px] leading-relaxed text-foreground max-w-[78ch]">{classification.summary}</p>
                  ) : (
                    <p className="text-[13.5px] text-muted-foreground">Sonar has indexed this document. Ask a question for a deeper read.</p>
                  )}
                  {classification && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{docTypeShort(classification.docType)}</span>
                      {classification.effectiveDate && <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarClock size={12} />{classification.effectiveDate}</span>}
                      {classification.parties.slice(0, 2).map((p) => <span key={p} className="inline-flex items-center gap-1 text-muted-foreground"><Building2 size={12} />{p}</span>)}
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><FileText size={12} />{allClauses.length} clauses</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Key findings */}
            {classification && classification.keyFindings.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3"><h2 className="text-[14px] font-semibold tracking-tight text-foreground">Key findings</h2><span className="text-[11px] font-mono text-muted-foreground">{classification.keyFindings.length}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((f, i) => {
                    const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                    return (
                      <div key={i} className="rounded-lg border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${s.bg} ${s.text} shrink-0`}>{s.icon}</span><span className="text-[13px] font-semibold text-foreground leading-tight">{f.label}</span></div>
                        <p className="text-[12.5px] text-muted-foreground leading-relaxed">{f.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Risk intelligence (visual) */}
            {allClauses.length > 0 && (
              <MotionReveal><RiskIntelligence counts={riskCounts} categories={catData} /></MotionReveal>
            )}

            {/* Risk analysis: heatmap + radar */}
            {allClauses.length > 0 && (
              <MotionReveal delay={0.05}>
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xs">
                    <div className="flex items-baseline justify-between gap-2 mb-4">
                      <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Risk by category</h3>
                      <span className="text-[11px] font-mono text-muted-foreground">category × severity</span>
                    </div>
                    <ClauseHeatmap clauses={allClauses} />
                  </div>
                  <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xs">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Category coverage</h3>
                      <span className="text-[11px] font-mono text-muted-foreground">{catData.length}</span>
                    </div>
                    <CategoryRadar data={catData} />
                  </div>
                </section>
              </MotionReveal>
            )}

            {/* Two-column: clause list (70%) + sticky copilot (30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <main className="lg:col-span-8 space-y-4">
                {/* Toolbar */}
                <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                      <Search size={13} className="text-muted-foreground shrink-0" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clauses…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
                    </div>
                    {categories.length > 0 && (
                      <Select value={activeCategory} onValueChange={setActiveCategory}>
                        <SelectTrigger className="h-8 text-[12.5px] w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All categories</SelectItem>
                          {categories.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {/* Risk filter chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RiskChip label="All" count={allClauses.length} active={activeRisk === null} onClick={() => setActiveRisk(null)} />
                    {RISK_ORDER.map((r) => riskCounts[r] > 0 && (
                      <RiskChip key={r} label={RISK_META[r].label} count={riskCounts[r]} active={activeRisk === r} onClick={() => setActiveRisk(activeRisk === r ? null : r)} risk={r} />
                    ))}
                  </div>
                </div>

                {/* Clauses */}
                {classLoading ? (
                  <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
                ) : classError ? (
                  <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)] mb-3"><AlertTriangle size={18} /></span>
                    <p className="text-[13.5px] font-medium text-foreground mb-1">
                      {errorStatus(classErr) === 404 ? "No clause analysis for this document yet" : "Couldn't load clause analysis"}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground max-w-sm">
                      {errorStatus(classErr) === 404
                        ? "This document was processed before clause extraction was available, or extraction didn't complete. Re-upload it to generate the analysis."
                        : (classErr instanceof Error ? classErr.message : "A network error occurred.")}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => refetchClass()}>Retry</Button>
                      <Button variant="primary" size="sm" asChild><Link href="/projects/new">Re-upload</Link></Button>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                    <p className="text-[13.5px] font-medium text-foreground mb-1">No matching clauses.</p>
                    <p className="text-[12.5px] text-muted-foreground">Adjust your search or filters.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((c) => <ClauseCard key={c.number} clause={c} isExpanded={expanded.has(c.number)} onToggle={() => toggleExpand(c.number)} />)}
                  </div>
                )}
              </main>

              {/* Sticky AI Co-pilot rail */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-[76px] space-y-4">
                  <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 shadow-[var(--shadow-ai)]">
                    <div className="flex items-center gap-2 mb-3"><SonarMark size="sm" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">Sonar Co-pilot</span></div>
                    <p className="text-[12.5px] leading-relaxed text-foreground">
                      {riskCounts.critical + riskCounts.high > 0
                        ? `${riskCounts.critical + riskCounts.high} clause(s) flagged high or critical. Ask how to negotiate them.`
                        : "Ask about obligations, deadlines, or playbook deviations in this document."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Summarize", "Find risks", "Compare to playbook"].map((q) => (
                        <button key={q} onClick={toggleCopilot} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border border-[var(--ai-border)] bg-card text-[var(--ai-ink)] hover:bg-[var(--ai-surface)] transition-colors">
                          <Sparkles size={10} />{q}
                        </button>
                      ))}
                    </div>
                    <Button variant="ai" size="sm" className="mt-3 w-full" onClick={toggleCopilot}>Ask a question</Button>
                  </div>

                  {classification && classification.parties.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Parties</div>
                      <ul className="space-y-2">
                        {classification.parties.map((p) => (
                          <li key={p} className="flex items-center gap-2.5">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0"><Building2 size={13} strokeWidth={1.75} /></span>
                            <span className="text-[12.5px] font-medium text-foreground truncate">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── components ──────────────────────────────────────────── */

function RiskChip({ label, count, active, onClick, risk }: { label: string; count: number; active: boolean; onClick: () => void; risk?: RiskLevel }) {
  const m = risk ? RISK_META[risk] : null;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium border transition-colors ${
        active
          ? m ? `${m.bg} ${m.text} border-transparent` : "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] border-[var(--brand-primary-200)]"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
      }`}
    >
      {m && <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />}
      {label}
      <span className="tabular-nums text-[11px] opacity-70">{count}</span>
    </button>
  );
}

function ClauseCard({ clause, isExpanded, onToggle }: { clause: ApiClause; isExpanded: boolean; onToggle: () => void }) {
  const m = RISK_META[clause.riskLevel ?? "low"];
  const longBody = clause.body.length > 240;
  const preview = longBody ? clause.body.slice(0, 240) + "…" : clause.body;
  return (
    <div className={`rounded-lg border bg-card shadow-xs hover:shadow-sm transition-shadow ${clause.riskLevel === "critical" ? "border-[var(--danger)]/30" : "border-border"}`}>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 min-w-[2.5rem] text-right">{clause.number}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[13.5px] font-semibold text-foreground leading-snug">{clause.title || clause.number}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{categoryLabel(clause.category)}</span>
            </div>
            {clause.summary && <p className="text-[12.5px] text-foreground/80 leading-relaxed mb-2 italic">{clause.summary}</p>}
            <p className="text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-line">{isExpanded ? clause.body : preview}</p>
          </div>
        </div>
      </div>
      {longBody && (
        <button onClick={onToggle} className="w-full flex items-center justify-center gap-1 border-t border-border py-2 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          {isExpanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show original text</>}
        </button>
      )}
    </div>
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
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function SowSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card"><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-3"><Skeleton className="h-16 rounded-lg" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
          <div className="lg:col-span-4 space-y-4"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>
        </div>
      </div>
    </>
  );
}
