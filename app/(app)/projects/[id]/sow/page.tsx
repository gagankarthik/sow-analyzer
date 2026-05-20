"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { ProcessingState } from "@/components/ProcessingState";
import { BluelyMark } from "@/components/ui/BluelyMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Files, XCircle, ChevronDown, ChevronUp, Search, ShieldAlert,
  AlertTriangle, Info, FileText, Building2, CalendarClock,
} from "@/components/ui/icons";
import { apiDocToProject, getClassification } from "@/lib/api";
import { useDocumentDetail } from "@/lib/use-document";
import type { ApiClassification, ApiClause, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string; dot: string; ring: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]",  text: "text-[var(--danger)]",  dot: "bg-[var(--danger)]",  ring: "ring-[var(--danger)]/30" },
  high:     { label: "High",     bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", dot: "bg-[var(--warning)]", ring: "ring-[var(--warning)]/30" },
  medium:   { label: "Medium",   bg: "bg-[var(--ink-100)]",      text: "text-[var(--ink-600)]", dot: "bg-[var(--ink-400)]", ring: "ring-[var(--ink-300)]" },
  low:      { label: "Low",      bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", dot: "bg-[var(--success)]", ring: "ring-[var(--success)]/30" },
};

const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]",  text: "text-[var(--danger)]",  icon: <ShieldAlert size={13} /> },
  high:     { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={13} /> },
  medium:   { bg: "bg-[var(--ink-100)]",      text: "text-[var(--ink-700)]", icon: <AlertTriangle size={13} /> },
  low:      { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={13} /> },
  info:     { bg: "bg-[var(--info-soft)]",    text: "text-[var(--info)]",    icon: <Info size={13} /> },
};

export default function SowPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { detail, loading, notFound: isNotFound, error } = useDocumentDetail(id);
  const [classification, setClassification] = useState<ApiClassification | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRisk, setActiveRisk] = useState<RiskLevel | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!detail || detail.document.status !== "READY") return;
    setClassLoading(true);
    setClassError(false);
    getClassification(id)
      .then(setClassification)
      .catch(() => setClassError(true))
      .finally(() => setClassLoading(false));
  }, [id, detail?.document.status]);

  const allClauses: ApiClause[] = useMemo(() => classification?.clauses ?? [], [classification]);

  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const cl of allClauses) c[cl.riskLevel ?? "low"]++;
    return c;
  }, [allClauses]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of allClauses) m[c.category] = (m[c.category] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [allClauses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allClauses
      .filter((c) => {
        if (activeCategory && c.category !== activeCategory) return false;
        if (activeRisk && c.riskLevel !== activeRisk) return false;
        if (q && !c.title.toLowerCase().includes(q) && !c.body.toLowerCase().includes(q) &&
            !c.number.toLowerCase().includes(q) && !(c.summary ?? "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"]);
  }, [allClauses, search, activeCategory, activeRisk]);

  if (loading) return <SowSkeleton />;

  if (isNotFound) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
          <Files size={24} strokeWidth={1.5} />
        </span>
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>
          Project not found
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived or the link is out of date.</p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">
          Back to projects
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">{error}</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }

  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const rawStatus = detail.document.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const isReady = rawStatus === "READY";

  const toggleExpand = (n: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8 space-y-6">
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-[var(--danger)] leading-relaxed">
              <span className="font-semibold">Processing failed.</span>{" "}
              Delete this document and try uploading again.
            </p>
          </div>
        )}

        {isProcessing && (
          <ProcessingState status={rawStatus} title="Bluely is analyzing this document" subtitle="Clause extraction and risk analysis appear automatically as each stage completes." />
        )}

        {isReady && (
          <>
            {/* ── Executive summary ─────────────────────────── */}
            <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 md:p-6 shadow-xs">
              <div className="flex items-start gap-3.5">
                <BluelyMark size="md" tile pulse />
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">
                    Bluely · executive summary
                  </div>
                  {classLoading ? (
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                  ) : classification?.summary ? (
                    <p className="text-[14px] leading-relaxed text-foreground max-w-[78ch]">{classification.summary}</p>
                  ) : (
                    <p className="text-[13.5px] text-muted-foreground">Bluely has indexed this document. Ask a question for a deeper read.</p>
                  )}
                  {classification && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[12px]">
                      <Badge variant="neutral" size="sm">{classification.docType}</Badge>
                      {classification.effectiveDate && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CalendarClock size={12} /> {classification.effectiveDate}
                        </span>
                      )}
                      {classification.parties.slice(0, 2).map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 text-muted-foreground">
                          <Building2 size={12} /> {p}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FileText size={12} /> {allClauses.length} clauses
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Key findings ──────────────────────────────── */}
            {classification && classification.keyFindings.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Key findings</h2>
                  <span className="text-[11px] font-mono text-muted-foreground">{classification.keyFindings.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...classification.keyFindings]
                    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
                    .map((f, i) => {
                      const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                      return (
                        <div key={i} className="rounded-lg border border-border bg-card p-4 shadow-xs">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${s.bg} ${s.text} shrink-0`}>{s.icon}</span>
                            <span className="text-[13px] font-semibold text-foreground leading-tight">{f.label}</span>
                          </div>
                          <p className="text-[12.5px] text-muted-foreground leading-relaxed">{f.detail}</p>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* ── Clause workspace ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT — risk + categories */}
              <aside className="lg:col-span-3 space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Risk profile</div>
                  {classLoading ? (
                    <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
                  ) : allClauses.length > 0 ? (
                    <div className="space-y-2.5">
                      {RISK_ORDER.map((r) => {
                        const n = riskCounts[r];
                        if (n === 0) return null;
                        const m = RISK_META[r];
                        const pct = Math.round((n / allClauses.length) * 100);
                        const isActive = activeRisk === r;
                        return (
                          <button
                            key={r}
                            onClick={() => setActiveRisk(isActive ? null : r)}
                            className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${isActive ? `${m.bg} ring-1 ${m.ring}` : "hover:bg-muted"}`}
                          >
                            <div className="flex items-center justify-between text-[11.5px] mb-1">
                              <span className={`font-medium ${m.text}`}>{m.label}</span>
                              <span className="tabular-nums text-muted-foreground">{n}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${m.dot}`} style={{ width: `${pct}%` }} />
                            </div>
                          </button>
                        );
                      })}
                      {activeRisk && (
                        <button onClick={() => setActiveRisk(null)} className="text-[10.5px] text-[var(--brand-primary-600)] hover:underline pt-1">
                          Clear risk filter
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-muted-foreground">No clause data.</p>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Categories</div>
                    {activeCategory && (
                      <button onClick={() => setActiveCategory(null)} className="text-[10.5px] text-[var(--brand-primary-600)] hover:underline">Clear</button>
                    )}
                  </div>
                  {classLoading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}</div>
                  ) : catCounts.length > 0 ? (
                    <ul className="space-y-1">
                      {catCounts.map(([cat, count]) => {
                        const isActive = activeCategory === cat;
                        return (
                          <li key={cat}>
                            <button
                              onClick={() => setActiveCategory(isActive ? null : cat)}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors ${isActive ? "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] font-medium" : "text-foreground hover:bg-muted"}`}
                            >
                              <span className="truncate">{cat}</span>
                              <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-[11.5px] text-muted-foreground">No categories.</p>
                  )}
                </div>
              </aside>

              {/* CENTER — clauses */}
              <main className="lg:col-span-6 space-y-4">
                <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                    <Search size={13} className="text-muted-foreground shrink-0" />
                    <input
                      type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search clauses…"
                      className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {classification && (
                    <Badge variant="neutral" size="sm">{filtered.length} / {allClauses.length}</Badge>
                  )}
                </div>

                {classLoading ? (
                  <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
                ) : classError ? (
                  <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                    <p className="text-[13.5px] font-medium text-foreground mb-1">Clause data not available.</p>
                    <p className="text-[12.5px] text-muted-foreground">Try re-uploading this document.</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                    <p className="text-[13.5px] font-medium text-foreground mb-1">No matching clauses.</p>
                    <p className="text-[12.5px] text-muted-foreground">Adjust your search or filters.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((c) => (
                      <ClauseCard key={c.number} clause={c} isExpanded={expanded.has(c.number)} onToggle={() => toggleExpand(c.number)} />
                    ))}
                  </div>
                )}
              </main>

              {/* RIGHT — Bluely + metadata */}
              <aside className="lg:col-span-3 space-y-4">
                <div className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BluelyMark size="sm" />
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">Ask Bluely</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-foreground">
                    {riskCounts.critical + riskCounts.high > 0
                      ? `${riskCounts.critical + riskCounts.high} clause(s) flagged high or critical. Ask Bluely how to negotiate them.`
                      : "Ask Bluely about obligations, deadlines, or playbook deviations in this document."}
                  </p>
                  <Button variant="ai" size="sm" className="mt-4 w-full">Ask a question</Button>
                </div>

                {classification && classification.parties.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Parties</div>
                    <ul className="space-y-2">
                      {classification.parties.map((p) => (
                        <li key={p} className="flex items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0">
                            <Building2 size={13} strokeWidth={1.75} />
                          </span>
                          <span className="text-[12.5px] font-medium text-foreground truncate">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Compare to playbook</div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3">Score every clause against your firm&apos;s standard positions.</p>
                  <Button variant="outline" size="sm" className="w-full" disabled={!classification}>
                    {classification ? "Open playbook view" : "Available once clauses load"}
                  </Button>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Clause card ─── */

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
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{clause.category}</span>
            </div>
            {clause.summary && (
              <p className="text-[12.5px] text-foreground/80 leading-relaxed mb-2 italic">{clause.summary}</p>
            )}
            <p className="text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {isExpanded ? clause.body : preview}
            </p>
          </div>
        </div>
      </div>
      {longBody && (
        <button onClick={onToggle} className="w-full flex items-center justify-center gap-1 border-t border-border py-2 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          {isExpanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show full clause</>}
        </button>
      )}
    </div>
  );
}

function severityRank(s: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

/* ─── Skeleton ─── */

function SowSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div>
      </div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-56 rounded-lg" /></div>
          <div className="lg:col-span-6 space-y-3"><Skeleton className="h-12 rounded-lg" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
          <div className="lg:col-span-3 space-y-4"><Skeleton className="h-36 rounded-lg" /><Skeleton className="h-32 rounded-lg" /></div>
        </div>
      </div>
    </>
  );
}

/* ─── Risk color helpers (used by other views) ─── */

export function riskBg(risk: string): string {
  return ({ low: "bg-[var(--success)]", medium: "bg-[var(--ink-400)]", high: "bg-[var(--warning)]", critical: "bg-[var(--danger)]" } as Record<string, string>)[risk] ?? "bg-[var(--ink-200)]";
}
export function riskText(risk: string): string {
  return ({ low: "text-[var(--success)]", medium: "text-[var(--ink-600)]", high: "text-[var(--warning)]", critical: "text-[var(--danger)]" } as Record<string, string>)[risk] ?? "text-muted-foreground";
}
export function riskPill(risk: string): string {
  return ({ low: "bg-[var(--success-soft)] text-[var(--success)]", medium: "bg-[var(--ink-100)] text-[var(--ink-600)]", high: "bg-[var(--warning-soft)] text-[var(--warning)]", critical: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30" } as Record<string, string>)[risk] ?? "bg-[var(--ink-100)] text-[var(--ink-600)]";
}
