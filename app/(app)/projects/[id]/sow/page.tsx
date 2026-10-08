"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { ProcessingState } from "@/components/ProcessingState";
import { SonarMark } from "@/components/ui/SonarMark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Files, XCircle, ChevronDown, ChevronUp, ShieldAlert,
  AlertTriangle, Info, Building2, CalendarClock, Sparkles, FileText,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useClassification } from "@/lib/queries/documents";
import { useUIStore } from "@/lib/stores/ui";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";
import { docTypeShort } from "@/lib/doc-types";
import { categoryLabel, clauseSpecificType } from "@/lib/clause-categories";
import { formatDate } from "@/lib/format";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { ClausePlaybookPanel, OutcomeBadge, OUTCOME_DOT } from "@/components/playbook/Outcome";
import { ReanalyseNotice } from "@/components/dates/ReanalyseNotice";
import { OUTCOME_LABEL, PLAYBOOK_OUTCOMES, SOURCE_LABEL, type PlaybookOutcome } from "@/lib/playbook";
import { extractionReview } from "@/lib/document-review";
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
/** Filter value for clauses the API sent without a category (a select item
 *  cannot have an empty value). They stay filterable as "Uncategorised". */
const NO_CATEGORY = "__uncategorised";
const categoryKey = (c: ApiClause) => c.category || NO_CATEGORY;
/** A clause the API returned without a risk level is "not assessed", never "low". */
const isRated = (c: ApiClause) => c.riskRated !== false;
/** Sort rank: critical first; clauses with no risk level go last. */
const riskRank = (c: ApiClause) => (isRated(c) ? RISK_RANK[c.riskLevel] : 4);
/** Filter value for clauses with no playbook result at all (an older analysis). */
const NOT_ASSESSED = "not_assessed";
const outcomeKey = (c: ApiClause): PlaybookOutcome | typeof NOT_ASSESSED => c.playbook?.outcome ?? NOT_ASSESSED;
const isUnclassified = (c: ApiClause) => c.classificationStatus === "unclassified";
/** Left indent per nesting level in clause order. Capped: a deep outline must
 *  still fit a 360px screen. */
const INDENT = ["", "ml-4 md:ml-8", "ml-8 md:ml-16"];

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
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);

  const { data: detail, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, error: classErr, refetch: refetchClass, isFetching: classFetching, dataUpdatedAt: classUpdatedAt } = useClassification(id, !!isReady);

  const [search, setSearch] = useState("");
  const [activeRisk, setActiveRisk] = useState<RiskLevel | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeType, setActiveType] = useState<string>(ALL);
  const [activeOutcome, setActiveOutcome] = useState<string>(ALL);
  const [sort, setSort] = useState<"risk" | "number">("risk");
  // A deep link (/sow#clause-<number>, from the insights "needs attention"
  // lists) opens with that clause expanded.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return hash.startsWith("clause-") ? new Set([hash.slice("clause-".length)]) : new Set();
  });

  const allClauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);
  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const cl of allClauses) if (isRated(cl)) c[cl.riskLevel]++;
    return c;
  }, [allClauses]);
  const unratedCount = useMemo(() => allClauses.filter((c) => !isRated(c)).length, [allClauses]);
  // Every category the API sent becomes a filter option — including ones this
  // app has never seen — with its clause count.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allClauses) counts.set(categoryKey(c), (counts.get(categoryKey(c)) ?? 0) + 1);
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: categoryLabel(key === NO_CATEGORY ? "" : key) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allClauses]);
  // Finer-grained clause types, when the API provides them (optional field).
  const specificTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allClauses) {
      const t = clauseSpecificType(c);
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ key, count, label: categoryLabel(key) })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allClauses]);
  // Playbook outcome per clause. A clause with no result (a document analysed
  // before grading existed) is counted as "not assessed", never as a pass.
  const outcomeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allClauses) counts.set(outcomeKey(c), (counts.get(outcomeKey(c)) ?? 0) + 1);
    return counts;
  }, [allClauses]);
  const graded = allClauses.some((c) => c.playbook != null);
  // Nesting depth of each clause, from its `parent` chain (clauses whose parent
  // is not in the list sit at the top level).
  const depthOf = useMemo(() => {
    const byNumber = new Map(allClauses.map((c) => [c.number, c]));
    const depth = new Map<string, number>();
    for (const c of allClauses) {
      let d = 0;
      let cur: ApiClause | undefined = c;
      const seen = new Set<string>();
      while (cur?.parent && byNumber.has(cur.parent) && !seen.has(cur.number)) {
        seen.add(cur.number);
        cur = byNumber.get(cur.parent);
        d += 1;
      }
      depth.set(c.number, d);
    }
    return depth;
  }, [allClauses]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allClauses
      .filter((c) => {
        if (activeRisk && (!isRated(c) || c.riskLevel !== activeRisk)) return false;
        if (activeOutcome !== ALL && outcomeKey(c) !== activeOutcome) return false;
        if (activeCategory !== "ALL" && categoryKey(c) !== activeCategory) return false;
        if (activeType !== ALL && clauseSpecificType(c) !== activeType) return false;
        if (q) {
          const specific = clauseSpecificType(c);
          const haystack = `${c.number} ${c.title} ${c.body} ${c.summary ?? ""} ${categoryLabel(c.category)} ${specific ? categoryLabel(specific) : ""} ${c.section ?? ""} ${c.playbook ? OUTCOME_LABEL[c.playbook.outcome] : ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => sort === "number"
        ? a.number.localeCompare(b.number, undefined, { numeric: true })
        : riskRank(a) - riskRank(b));
  }, [allClauses, search, activeRisk, activeCategory, activeType, activeOutcome, sort]);

  // ...and scrolls to it once the clause list has rendered.
  const clauseTotal = allClauses.length;
  useEffect(() => {
    if (clauseTotal === 0) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash.startsWith("clause-")) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }, [clauseTotal]);

  if (isLoading) return <SowSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const rawStatus = detail.document.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const review = extractionReview(detail.document, classification);
  const outcomeOptions = [
    ...PLAYBOOK_OUTCOMES.filter((o) => (outcomeCounts.get(o) ?? 0) > 0).map((o) => ({ value: o as string, label: OUTCOME_LABEL[o], count: outcomeCounts.get(o) ?? 0, dot: OUTCOME_DOT[o] })),
    // Only alongside graded clauses; when nothing is graded the notice below says so once.
    ...(graded && (outcomeCounts.get(NOT_ASSESSED) ?? 0) > 0 ? [{ value: NOT_ASSESSED, label: "Not assessed", count: outcomeCounts.get(NOT_ASSESSED) ?? 0, dot: "bg-[var(--ink-300)]" }] : []),
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "risk", label: "Risk", value: activeRisk ?? ALL,
      onChange: (v) => setActiveRisk(v === ALL ? null : (v as RiskLevel)),
      options: RISK_ORDER.filter((r) => riskCounts[r] > 0).map((r) => ({ value: r, label: RISK_META[r].label, count: riskCounts[r], dot: RISK_META[r].dot })),
    },
    { id: "outcome", label: "Playbook", value: activeOutcome, onChange: setActiveOutcome, options: graded ? outcomeOptions : [] },
    {
      id: "category", label: "Category", as: "select", allLabel: "All categories",
      value: activeCategory === "ALL" ? ALL : activeCategory,
      onChange: (v) => setActiveCategory(v === ALL ? "ALL" : v),
      options: categories.map((c) => ({ value: c.key, label: c.label, count: c.count })),
    },
    ...(specificTypes.length > 0
      ? [{
          id: "type", label: "Clause type", as: "select" as const, allLabel: "All clause types",
          value: activeType, onChange: setActiveType,
          options: specificTypes.map((t) => ({ value: t.key, label: t.label, count: t.count })),
        }]
      : []),
  ];
  const gradedWith = classification?.playbook?.source;
  const playbookSource = gradedWith === "custom"
    ? "which had rules of its own"
    : gradedWith ? `${SOURCE_LABEL[gradedWith].toLowerCase()} rules only` : null;
  const clearFilters = () => { setSearch(""); setActiveRisk(null); setActiveCategory("ALL"); setActiveType(ALL); setActiveOutcome(ALL); };

  const toggleExpand = (n: string) =>
    setExpanded((prev) => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        {isFailed && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 md:px-5">
            <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <p className="text-base leading-relaxed text-[var(--ink-700)]"><span className="font-semibold text-[var(--danger)]">Processing failed.</span> Delete this document and try uploading again.</p>
          </div>
        )}
        {isProcessing && <ProcessingState status={rawStatus} title="Sonar is analyzing this document" subtitle="Clause extraction and risk analysis appear automatically as each stage completes." />}

        {isReady && (
          <>
            {/* Executive summary */}
            <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-6">
              <div className="flex items-start gap-3.5">
                <SonarMark size="md" tile className="hidden sm:inline-flex" />
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1.5 text-sm font-semibold text-[var(--ai-ink)]">Sonar executive summary</h2>
                  {classLoading ? (
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                  ) : classification?.summary ? (
                    <p className="max-w-[60ch] text-base leading-relaxed text-foreground">{classification.summary}</p>
                  ) : classError ? (
                    <p className="text-base text-[var(--ink-600)]">The summary couldn&apos;t be loaded.</p>
                  ) : (
                    <p className="text-base text-[var(--ink-600)]">No summary was extracted for this document.</p>
                  )}
                  {classification && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--ink-600)]">
                      <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-[var(--ink-700)] ring-1 ring-[var(--ai-border)]">{docTypeShort(classification.docType)}</span>
                      {classification.effectiveDate && <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} className="shrink-0" />Effective {formatDate(classification.effectiveDate)}</span>}
                      {classification.parties.slice(0, 2).map((p) => <span key={p} className="inline-flex min-w-0 items-center gap-1.5"><Building2 size={14} className="shrink-0" /><span className="break-words">{p}</span></span>)}
                      <span className="inline-flex items-center gap-1.5"><FileText size={14} className="shrink-0" />{allClauses.length} clause{allClauses.length === 1 ? "" : "s"}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* The analysis's own report that it is incomplete: said before the list, with its reasons. */}
            {classification && review.incomplete && (
              <section role="status" aria-labelledby="review-heading" className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 md:px-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                  <div className="min-w-0">
                    <h2 id="review-heading" className="text-base font-semibold text-foreground">This analysis is incomplete. Check the document yourself.</h2>
                    {review.reasons.length > 0 ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--ink-700)]">
                        {review.reasons.map((r) => <li key={r} className="[overflow-wrap:anywhere]">{r}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--ink-700)]">No reason was recorded with the flag.</p>
                    )}
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums text-[var(--ink-700)]">
                      <span>Text covered by clauses: <span className="font-semibold text-foreground">{review.coverage !== null ? `${Math.round(review.coverage * 100)}%` : "Not assessed"}</span></span>
                      <span>Clauses not classified: <span className="font-semibold text-foreground">{review.unclassified !== null ? review.unclassified : "Not assessed"}</span></span>
                    </p>
                    {(outcomeCounts.get("unclassified") ?? 0) > 0 && (
                      <button type="button" onClick={() => setActiveOutcome("unclassified")} className="mt-2 inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-[var(--brand-primary-600)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">
                        Show the clauses that were not classified
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Clauses analysed before playbook grading: say so once, offer re-analysis. */}
            {classification && allClauses.length > 0 && !graded && (
              <ReanalyseNotice docId={id} role={detail.document.role} busy={isProcessing} title="These clauses were not compared with the playbook">
                This document was analysed before clauses were graded against a playbook, so each one shows &ldquo;not assessed&rdquo;. Re-analyse it to grade every clause against the playbook of the workspace it was uploaded into.
              </ReanalyseNotice>
            )}

            {/* Split view: clause list first, Sonar rail beside it on desktop and beneath it on mobile/tablet */}
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
              <main className="min-w-0 space-y-3 lg:col-span-8">
                <LastUpdated className="justify-end" updatedAt={classUpdatedAt || dataUpdatedAt} isFetching={isFetching || classFetching} onRefresh={() => { void refetch(); void refetchClass(); }} failed={isError || classError} />
                {/* Focal block: clause register header + filters */}
                <section aria-labelledby="clauses-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[var(--navy)] px-4 py-4 text-white md:px-5">
                    <div>
                      <h2 id="clauses-heading" className="text-xl font-semibold tracking-tight">Clauses</h2>
                    </div>
                    {/* A number only once the clauses have loaded: "0" would read as "no risk". */}
                    <p className="flex flex-wrap items-baseline gap-2 text-sm text-[var(--navy-foreground)]">
                      <span className="text-3xl font-semibold leading-none tabular-nums text-white">{classification ? riskCounts.critical + riskCounts.high : "—"}</span>
                      high or critical
                      {unratedCount > 0 && <span>· {unratedCount} not assessed</span>}
                    </p>
                  </div>

                  {/* Playbook outcome counts: every clause is in exactly one. */}
                  {graded && (
                    <div className="border-b border-border px-4 py-3 md:px-5">
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Playbook outcomes">
                        {outcomeOptions.map((o) => (
                          <li key={o.value} className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-700)]">
                            <span className={`h-2 w-2 rounded-full ${o.dot}`} aria-hidden />
                            {o.label} <span className="font-semibold tabular-nums text-foreground">{o.count}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        Graded when this document was last analysed, against the playbook of the workspace it was uploaded into
                        {playbookSource ? ` (${playbookSource})` : ""}.
                        {" "}&ldquo;No rule&rdquo; and &ldquo;not classified&rdquo; mean nothing was checked.{" "}
                        <Link href="/settings/playbook" className="font-semibold text-[var(--brand-primary-600)] hover:underline">View the playbook</Link>
                      </p>
                    </div>
                  )}

                  <ListFilters
                    className="p-3 md:p-4"
                    search={search}
                    onSearch={setSearch}
                    placeholder="Search clauses"
                    groups={filterGroups}
                    sort={{
                      value: sort,
                      onChange: (v) => setSort(v as "risk" | "number"),
                      options: [{ value: "risk", label: "Highest risk first" }, { value: "number", label: "Clause order" }],
                    }}
                    shown={filtered.length}
                    total={allClauses.length}
                    noun="clauses"
                    onClear={clearFilters}
                  />
                </section>

                {/* Clauses */}
                {classLoading ? (
                  <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
                ) : classError && !classification ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-10 text-center">
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-fg)]"><AlertTriangle size={18} /></span>
                    <p className="mb-1 text-base font-semibold text-foreground">
                      {errorStatus(classErr) === 404 ? "No clause analysis for this document yet" : "Couldn't load clause analysis"}
                    </p>
                    <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                      {errorStatus(classErr) === 404
                        ? "This document was processed before clause extraction was available, or extraction didn't complete. Re-upload it to generate the analysis."
                        : (classErr instanceof Error ? classErr.message : "A network error occurred.")}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button variant="outline" size="lg" className="md:h-9" onClick={() => refetchClass()}>Retry</Button>
                      <Button size="lg" className="md:h-9" asChild><Link href="/projects/new">Re-upload</Link></Button>
                    </div>
                  </div>
                ) : allClauses.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-10 text-center">
                    <p className="mb-1 text-base font-semibold text-foreground">No clauses were extracted.</p>
                    <p className="max-w-sm text-sm text-[var(--ink-600)]">Sonar didn&apos;t find clause-level content in this document.</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <NoResults noun="clauses" onClear={clearFilters} />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((c) => (
                      <ClauseCard
                        key={c.id ?? c.number}
                        clause={c}
                        isExpanded={expanded.has(c.number)}
                        onToggle={() => toggleExpand(c.number)}
                        // Indentation only means something in document order.
                        depth={sort === "number" ? depthOf.get(c.number) ?? 0 : 0}
                      />
                    ))}
                  </div>
                )}
              </main>

              {/* Sonar rail: sticky beside the list on desktop, stacked beneath it otherwise */}
              <aside className="min-w-0 lg:col-span-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:sticky lg:top-[76px] lg:grid-cols-1">
                  <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-5">
                    <div className="mb-2 flex items-center gap-2"><SonarMark size="sm" /><h3 className="text-sm font-semibold text-[var(--ai-ink)]">Sonar Co-pilot</h3></div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {riskCounts.critical + riskCounts.high > 0
                        ? `${riskCounts.critical + riskCounts.high} clause${riskCounts.critical + riskCounts.high === 1 ? " is" : "s are"} rated high or critical. Ask Sonar about them.`
                        : "Ask about obligations, deadlines, or payment terms in this document."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Summarize", "Find risks"].map((q) => (
                        <button key={q} type="button" onClick={toggleCopilot} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--ai-border)] bg-card px-3 text-sm font-medium text-[var(--ai-ink)] transition-colors hover:border-[var(--ai-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-ink)] md:h-8">
                          <Sparkles size={13} />{q}
                        </button>
                      ))}
                    </div>
                    <Button variant="ai" size="lg" className="mt-3 w-full md:h-9" onClick={toggleCopilot}>Ask a question</Button>
                  </div>

                  {classification && classification.parties.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
                      <h3 className="mb-3 text-base font-semibold text-foreground">Parties</h3>
                      <ul className="space-y-2.5">
                        {classification.parties.map((p) => (
                          <li key={p} className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-structure-soft text-structure-soft-fg"><Building2 size={15} strokeWidth={1.75} /></span>
                            <span className="min-w-0 break-words text-sm font-medium text-foreground">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {/* Key findings */}
            {classification && classification.keyFindings.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2"><h2 className="text-lg font-semibold tracking-tight text-foreground">Key findings</h2><span className="text-sm tabular-nums text-muted-foreground">{classification.keyFindings.length}</span></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((f, i) => {
                    const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                    return (
                      <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                        <div className="mb-2 flex items-start gap-2.5">
                          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.text}`}>{s.icon}</span>
                          <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold leading-snug text-foreground">{f.label}</span><span className={`text-xs font-medium capitalize ${s.text}`}>{f.severity}</span></span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </>
        )}
      </div>
    </>
  );
}

/* ── components ──────────────────────────────────────────── */

function ClauseCard({ clause, isExpanded, onToggle, depth }: { clause: ApiClause; isExpanded: boolean; onToggle: () => void; depth: number }) {
  const rated = isRated(clause);
  const m = RISK_META[clause.riskLevel];
  const specific = clauseSpecificType(clause);
  const unclassified = isUnclassified(clause);
  const subclauses = clause.subclauses ?? [];
  const longBody = clause.body.length > 240;
  const preview = longBody ? clause.body.slice(0, 240) + "…" : clause.body;
  const panelId = `clause-detail-${clause.id ?? clause.number}`;
  return (
    <article id={`clause-${clause.number}`} tabIndex={-1} className={`scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] target:border-[var(--brand-primary-600)] ${rated && clause.riskLevel === "critical" ? "border-[var(--danger)]/40" : "border-border"} ${INDENT[Math.min(depth, INDENT.length - 1)]}`}>
      <div className="p-4">
        {/* Where the clause sits: its parent clause, section heading and page. */}
        {(clause.parent || clause.section || clause.page) && (
          <p className="mb-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {clause.parent && <span>Part of clause {clause.parent}</span>}
            {clause.section && <span className="[overflow-wrap:anywhere]">{clause.parent ? "· " : ""}{clause.section}</span>}
            {clause.page && <span className="tabular-nums">{clause.parent || clause.section ? "· " : ""}Page {clause.page}</span>}
          </p>
        )}
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-mono text-xs text-muted-foreground">{clause.number}</span>
          {rated ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${m.bg} ${m.text}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />{m.label} risk</span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-dashed border-[var(--ink-300)] px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">Risk not assessed</span>
          )}
          <OutcomeBadge result={clause.playbook} />
          {/* The specific clause type, when the API sends one, is the more precise label. */}
          {specific && <span className="rounded-full bg-structure-soft px-2 py-0.5 text-xs font-medium text-structure-soft-fg">{categoryLabel(specific)}{clause.typeIsCustom ? " · custom type" : ""}</span>}
          {!unclassified && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(clause.category)}</span>}
          {clause.needsReview && !unclassified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--warning-fg)]"><AlertTriangle size={12} />Needs review</span>
          )}
        </div>
        <h3 className="break-words text-lg font-semibold leading-snug text-foreground">{clause.title || clause.number}</h3>
        {unclassified && (
          <p role="note" className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2 text-sm leading-relaxed text-foreground">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <span>Sonar could not classify this clause: review it yourself. It has no type and was not checked against the playbook.</span>
          </p>
        )}
        {clause.summary && <p className="mt-1.5 text-base leading-relaxed text-[var(--ink-700)]">{clause.summary}</p>}
        <p className="mt-2 whitespace-pre-line break-words border-l-2 border-[var(--ink-200)] pl-3 text-sm leading-relaxed text-[var(--ink-600)]">{isExpanded ? clause.body : preview}</p>
      </div>

      <div id={panelId} hidden={!isExpanded} className="space-y-4 border-t border-border bg-[var(--panel)] p-4">
        <section aria-label="Playbook result">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Against the playbook</h4>
          <ClausePlaybookPanel result={clause.playbook} />
        </section>
        {subclauses.length > 0 && (
          <section aria-label="Sub-clauses">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Sub-clauses <span className="font-normal tabular-nums text-muted-foreground">{subclauses.length}</span></h4>
            <ol className="space-y-2 border-l-2 border-[var(--ink-200)] pl-3 sm:ml-2 sm:pl-4">
              {subclauses.map((s) => (
                <li key={`${s.ref}-${s.start}`} className="text-sm leading-relaxed">
                  <span className="font-mono text-xs font-semibold text-[var(--ink-700)]">{s.ref}</span>{" "}
                  <span className="whitespace-pre-line break-words text-[var(--ink-600)]">{clause.body.slice(s.start, s.end).trim()}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <button type="button" onClick={onToggle} aria-expanded={isExpanded} aria-controls={panelId} className="flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-border py-2 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        {isExpanded
          ? <><ChevronUp size={14} />Show less</>
          : <><ChevronDown size={14} />{longBody ? "Show full text and playbook result" : "Show playbook result"}{subclauses.length > 0 ? ` · ${subclauses.length} sub-clause${subclauses.length === 1 ? "" : "s"}` : ""}</>}
      </button>
    </article>
  );
}

function sevRank(s: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project not found</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-sm">This engagement may have been archived or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-sm font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function SowSkeleton() {
  return (
    <>
      <div><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-3"><Skeleton className="h-40 rounded-xl" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          <div className="lg:col-span-4 space-y-4"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>
        </div>
      </div>
    </>
  );
}
