"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { ProcessingState } from "@/components/ProcessingState";
import { BluelyMark } from "@/components/ui/BluelyMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Files, XCircle, ChevronDown, ChevronUp, Search } from "@/components/ui/icons";
import { apiDocToProject, getClassification } from "@/lib/api";
import { useDocumentDetail } from "@/lib/use-document";
import type { ApiClassification, ApiClause } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

// Risk level per clause category
const CATEGORY_RISK: Record<string, "critical" | "high" | "medium" | "low"> = {
  Liability:        "critical",
  IP:               "critical",
  Indemnity:        "high",
  Termination:      "high",
  DataProtection:   "high",
  Fees:             "medium",
  Payment:          "medium",
  Compliance:       "medium",
  GoverningLaw:     "medium",
  DisputeResolution:"medium",
  Confidentiality:  "medium",
  Warranty:         "medium",
  ChangeControl:    "medium",
  ScopeOfWork:      "low",
  Deliverables:     "low",
  Definitions:      "low",
  Term:             "low",
  Acceptance:       "low",
  ForceMajeure:     "low",
  Notices:          "low",
  Assignment:       "low",
  Subcontracting:   "low",
  Other:            "low",
};

const RISK_STYLES = {
  critical: { bg: "bg-[var(--danger-soft)]",   text: "text-[var(--danger)]",   dot: "bg-[var(--danger)]",   label: "Critical" },
  high:     { bg: "bg-[var(--warning-soft)]",  text: "text-[var(--warning)]",  dot: "bg-[var(--warning)]",  label: "High"     },
  medium:   { bg: "bg-[var(--ink-100)]",        text: "text-[var(--ink-600)]",  dot: "bg-[var(--ink-400)]",  label: "Medium"   },
  low:      { bg: "bg-muted",                   text: "text-muted-foreground",  dot: "bg-[var(--ink-300)]",  label: "Low"      },
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch classification once the doc is READY
  useEffect(() => {
    if (!detail || detail.document.status !== "READY") return;
    setClassLoading(true);
    setClassError(false);
    getClassification(id)
      .then(setClassification)
      .catch(() => setClassError(true))
      .finally(() => setClassLoading(false));
  }, [id, detail?.document.status]);

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
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
          This engagement may have been archived or the link is out of date.
        </p>
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

  // Filter and sort clauses
  const allClauses: ApiClause[] = classification?.clauses ?? [];
  const filtered = allClauses.filter((c) => {
    const matchCat = !activeCategory || c.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.number.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const c of allClauses) catCounts[c.category] = (catCounts[c.category] ?? 0) + 1;
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

  // Risk summary
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const c of allClauses) {
    const r = CATEGORY_RISK[c.category] ?? "low";
    riskCounts[r]++;
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8">
        {isFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4 mb-6">
            <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-[var(--danger)] leading-relaxed">
              <span className="font-semibold">Processing failed.</span>{" "}
              Delete this document and try uploading again.
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="mb-6">
            <ProcessingState status={rawStatus} title="Bluely is analyzing this SOW" subtitle="Clause extraction appears automatically as each stage completes." />
          </div>
        )}

        {isReady && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── LEFT — Category navigator ─── */}
            <aside className="lg:col-span-3 space-y-4">
              {/* Risk summary */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Risk heatmap
                </div>
                {classLoading ? (
                  <div className="space-y-2">
                    {[32, 24, 48, 20].map((w, i) => <Skeleton key={i} className={`h-3 rounded`} style={{ width: `${w * 2}px` }} />)}
                  </div>
                ) : classification ? (
                  <div className="space-y-2">
                    {(["critical", "high", "medium", "low"] as const).map((r) => {
                      const n = riskCounts[r];
                      if (n === 0) return null;
                      const s = RISK_STYLES[r];
                      const pct = Math.round((n / allClauses.length) * 100);
                      return (
                        <div key={r}>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className={`font-medium ${s.text}`}>{s.label}</span>
                            <span className="tabular-nums text-muted-foreground">{n}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${s.dot}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-border mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>low risk</span>
                      <span className="flex gap-0.5">
                        <span className="h-1.5 w-2.5 rounded-sm bg-[var(--ink-300)]" />
                        <span className="h-1.5 w-2.5 rounded-sm bg-[var(--ink-400)]" />
                        <span className="h-1.5 w-2.5 rounded-sm bg-[var(--warning)]/60" />
                        <span className="h-1.5 w-2.5 rounded-sm bg-[var(--danger)]" />
                      </span>
                      <span>critical</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">No data yet.</p>
                )}
              </div>

              {/* Category list */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Categories
                  </div>
                  {activeCategory && (
                    <button onClick={() => setActiveCategory(null)} className="text-[10.5px] text-[var(--brand-primary-600)] hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                {classLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}
                  </div>
                ) : sortedCats.length > 0 ? (
                  <ul className="space-y-1">
                    {sortedCats.map(([cat, count]) => {
                      const risk = CATEGORY_RISK[cat] ?? "low";
                      const s = RISK_STYLES[risk];
                      const isActive = activeCategory === cat;
                      return (
                        <li key={cat}>
                          <button
                            onClick={() => setActiveCategory(isActive ? null : cat)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors ${
                              isActive
                                ? `${s.bg} ${s.text} font-medium`
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                              <span className="truncate">{cat}</span>
                            </span>
                            <span className="tabular-nums text-muted-foreground text-[11px] shrink-0">{count}</span>
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

            {/* ── MIDDLE — Clause list ─────── */}
            <main className="lg:col-span-6 space-y-4">
              {/* Toolbar */}
              <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <Search size={13} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search clauses…"
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {classification && (
                    <Badge variant="neutral" size="sm">
                      {filtered.length} / {allClauses.length} clause{allClauses.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <Badge variant="ai" size="sm">Bluely ready</Badge>
                </div>
              </div>

              {/* Clause cards */}
              {classLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : classError ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                  <p className="text-[13.5px] font-medium text-foreground mb-1">Classification data not available.</p>
                  <p className="text-[12.5px] text-muted-foreground">This may be the first time this document was processed.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-10 flex flex-col items-center text-center">
                  <p className="text-[13.5px] font-medium text-foreground mb-1">No matching clauses.</p>
                  <p className="text-[12.5px] text-muted-foreground">Try adjusting your search or category filter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((clause) => (
                    <ClauseCard
                      key={clause.number}
                      clause={clause}
                      isExpanded={expanded.has(clause.number)}
                      onToggle={() => toggleExpand(clause.number)}
                    />
                  ))}
                </div>
              )}
            </main>

            {/* ── RIGHT — Bluely + metadata ─ */}
            <aside className="lg:col-span-3 space-y-4">
              <div className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BluelyMark size="sm" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">
                    Bluely · analysis
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-foreground">
                  {classification
                    ? `${allClauses.length} clauses extracted. Ask Bluely for risk analysis, playbook deviation, or negotiation strategy.`
                    : "Bluely has indexed this document. Ask a question to get AI-powered clause analysis."}
                </p>
                <Button variant="ai" size="sm" className="mt-4 w-full">Ask a question</Button>
              </div>

              {/* Doc metadata */}
              {classification && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Document info
                  </div>
                  <InfoRow label="Type">
                    <Badge variant="neutral" size="sm">{classification.docType}</Badge>
                  </InfoRow>
                  <InfoRow label="Lifecycle">
                    <Badge variant="neutral" size="sm">{classification.lifecycle}</Badge>
                  </InfoRow>
                  {classification.effectiveDate && (
                    <InfoRow label="Effective">
                      <span className="text-[12px] font-medium text-foreground">{classification.effectiveDate}</span>
                    </InfoRow>
                  )}
                  {classification.parties.length > 0 && (
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1.5">Parties</span>
                      <ul className="space-y-1">
                        {classification.parties.map((p) => (
                          <li key={p} className="text-[12px] font-medium text-foreground truncate">{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Playbook compare */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Compare to playbook
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3">
                  Side-by-side view of every clause against your firm&apos;s standard positions.
                </p>
                <Button variant="outline" size="sm" className="w-full" disabled={!classification}>
                  {classification ? "Open playbook view" : "Available once clauses load"}
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Clause card ─── */

function ClauseCard({
  clause,
  isExpanded,
  onToggle,
}: {
  clause: ApiClause;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const risk = CATEGORY_RISK[clause.category] ?? "low";
  const s = RISK_STYLES[risk];
  const preview = clause.body.length > 240 ? clause.body.slice(0, 240) + "…" : clause.body;

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs hover:shadow-sm transition-shadow">
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 min-w-[2.5rem] text-right">
            {clause.number}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[13.5px] font-semibold text-foreground leading-snug">
                {clause.title || clause.number}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {clause.category}
              </span>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {isExpanded ? clause.body : preview}
            </p>
          </div>
        </div>
      </div>
      {clause.body.length > 240 && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1 border-t border-border py-2 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp size={12} /> Show less</>
          ) : (
            <><ChevronDown size={12} /> Show full clause</>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Info row ─── */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/* ─── Skeleton ─── */

function SowSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="app-container">
          <div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div>
        </div>
      </div>
      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-56 rounded-lg" /></div>
          <div className="lg:col-span-6 space-y-3"><Skeleton className="h-12 rounded-lg" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
          <div className="lg:col-span-3 space-y-4"><Skeleton className="h-36 rounded-lg" /><Skeleton className="h-32 rounded-lg" /></div>
        </div>
      </div>
    </>
  );
}

export { riskBg, riskText, riskPill };

function riskBg(risk: string): string {
  return ({ low: "bg-[var(--ink-200)]", medium: "bg-[var(--warning)]/60", high: "bg-[var(--danger)]/70", critical: "bg-[var(--danger)]" } as Record<string, string>)[risk] ?? "bg-[var(--ink-200)]";
}
function riskText(risk: string): string {
  return ({ low: "text-muted-foreground", medium: "text-[var(--warning)]", high: "text-[var(--danger)]", critical: "text-[var(--danger)]" } as Record<string, string>)[risk] ?? "text-muted-foreground";
}
function riskPill(risk: string): string {
  return ({ low: "bg-[var(--ink-100)] text-[var(--ink-600)]", medium: "bg-[var(--warning-soft)] text-[var(--warning)]", high: "bg-[var(--danger-soft)] text-[var(--danger)]", critical: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30" } as Record<string, string>)[risk] ?? "bg-[var(--ink-100)] text-[var(--ink-600)]";
}
