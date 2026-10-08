"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { Button } from "@/components/ui/button";
import { SonarMark } from "@/components/ui/SonarMark";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessingState } from "@/components/ProcessingState";
import {
  ArrowRight, Files, XCircle, CheckCircle2, TrendingUp, ShieldAlert,
  AlertTriangle, Info, Sparkles, FileText,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useDocuments, useClassification } from "@/lib/queries/documents";
import { useCompliancePacks } from "@/lib/queries/compliance";
import { useUIStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { RISK_LABEL } from "@/lib/chart-theme";
import { clauseTypeLabel } from "@/lib/clause-categories";
import { docValueOrNull, fmtMoney, persistedOf } from "@/lib/contract-value";
import { formatDate } from "@/lib/format";
import type { ApiClassification, ApiDocument, FindingSeverity, RiskLevel } from "@/lib/types";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type Project = ReturnType<typeof apiDocToProject>;

const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode; rank: number }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={14} />, rank: 4 },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={14} />, rank: 3 },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={14} />, rank: 2 },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={14} />, rank: 1 },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={14} />, rank: 0 },
};

const SEVERITY_ORDER: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

export default function ProjectInsightsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);

  const { data: detail, isLoading, isError, error, refetch, isFetching } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, refetch: refetchClass } = useClassification(id, !!isReady);
  const { data: allDocs = [] } = useDocuments();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState(ALL);

  const findings = useMemo(
    () => [...(classification?.keyFindings ?? [])].sort((a, b) => SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank),
    [classification],
  );

  if (isLoading) return <InsightsSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";

  // Every figure is null when the API has not provided it, and null renders as
  // "Not available" — never as 0 or "Low".
  const clauseCount: number | null = doc.clauseCount ?? classification?.clauses.length ?? null;
  // High-risk clauses = high + critical. Prefer the per-level counts; fall back
  // to the stored aggregate.
  const highRisk: number | null = doc.riskCounts ? doc.riskCounts.high + doc.riskCounts.critical : doc.highRiskCount ?? null;
  const overallRisk: RiskLevel | null = doc.overallRisk ?? null;
  const summary = classification?.summary || doc.summary || "";

  // Portfolio comparison. Formula: among the OTHER analysed documents that have
  // a high-risk clause count, the share with strictly fewer high-risk clauses
  // than this one. Documents with no count are left out, not treated as zero.
  const readyDocs = allDocs.filter((d) => d.status === "READY");
  const highOf = (d: (typeof allDocs)[number]): number | null => (d.riskCounts ? d.riskCounts.high + d.riskCounts.critical : d.highRiskCount ?? null);
  const peers = readyDocs.filter((d) => d.docId !== doc.docId && highOf(d) !== null);
  const higherThan: number | null = highRisk !== null && peers.length > 0
    ? Math.round((peers.filter((d) => (highOf(d) as number) < highRisk).length / peers.length) * 100)
    : null;

  // Client-side filtering of the findings list (already sorted by severity).
  const term = query.trim().toLowerCase();
  const shownFindings = findings.filter((f) => (severity === ALL || f.severity === severity) && (!term || `${f.label} ${f.detail}`.toLowerCase().includes(term)));
  const filterGroups: FilterGroup[] = [
    { id: "severity", label: "Severity", value: severity, onChange: setSeverity, options: SEVERITY_ORDER.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: findings.filter((f) => f.severity === s).length })).filter((o) => o.count > 0) },
  ];
  const clearFilters = () => { setQuery(""); setSeverity(ALL); };

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        {isFailed && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 md:px-5">
            <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <p className="text-base leading-relaxed text-[var(--ink-700)]"><span className="font-semibold text-[var(--danger)]">Processing failed.</span> Insights are unavailable.</p>
          </div>
        )}
        {isProcessing && <ProcessingState status={rawStatus} title="Sonar is analyzing this document" subtitle="Insights appear automatically as each stage completes." />}

        {/* KPI row: overall risk is the focal block */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-12">
          <div className="flex flex-col rounded-xl bg-[var(--navy)] p-5 text-white sm:col-span-2 md:p-6 lg:col-span-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Overall risk</h2>
              <TrendingUp size={16} className="shrink-0 text-[var(--navy-foreground)]" />
            </div>
            <div className={`mt-2 font-bold capitalize leading-none tracking-tight ${isReady && overallRisk ? "text-4xl" : "text-2xl"}`}>{!isReady ? "—" : overallRisk ?? "Not assessed"}</div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy-foreground)] lg:mt-auto lg:pt-4">
              {isReady && !overallRisk ? "The analysis returned no overall risk level for this document." : "Sonar\u2019s assessment across every clause in this document."}
            </p>
          </div>
          <Stat
            className="lg:col-span-3"
            label="Clauses analyzed"
            value={isReady && clauseCount !== null ? clauseCount : "—"}
            hint={!isReady ? rawStatus.toLowerCase() : classification ? `${findings.length} key finding${findings.length === 1 ? "" : "s"}` : classError ? "Findings couldn\u2019t be loaded" : "Loading findings…"}
            icon={<FileText size={16} />}
          />
          <Stat
            className="lg:col-span-2"
            label="High or critical clauses"
            value={isReady && highRisk !== null ? highRisk : "—"}
            hint={!isReady ? "—" : highRisk === null ? "Not available" : highRisk > 0 ? "Need review" : "None rated high or critical"}
            icon={<ShieldAlert size={16} />}
            tone={!isReady || highRisk === null ? "neutral" : overallRisk === "critical" ? "danger" : highRisk > 0 ? "warning" : "success"}
          />
          <Stat
            className="lg:col-span-3"
            label="Compared with your portfolio"
            value={isReady && higherThan !== null ? `${higherThan}%` : "—"}
            hint={isReady && higherThan !== null
              ? `of the ${peers.length} other analysed document${peers.length === 1 ? "" : "s"} have fewer high or critical clauses`
              : "Needs this and at least one other analysed document"}
            icon={<TrendingUp size={16} />}
          />
        </section>

        {/* Strategic read */}
        <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-6">
          <div className="flex items-start gap-3.5">
            <SonarMark size="md" tile className="hidden sm:inline-flex" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold mb-1.5">Summary from the analysis</h2>
              {summary ? (
                <p className="max-w-[58ch] text-base leading-relaxed text-foreground">{summary}</p>
              ) : !isReady ? (
                <p className="max-w-[58ch] text-base leading-relaxed text-[var(--ink-600)]">The summary appears once processing completes.</p>
              ) : classLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
              ) : (
                <p className="max-w-[58ch] text-base leading-relaxed text-[var(--ink-600)]">{classError ? "The summary couldn\u2019t be loaded." : "No summary was extracted for this document."}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="ai" size="lg" className="md:h-9" onClick={toggleCopilot}><Sparkles size={14} />Ask Sonar</Button>
                <Button variant="outline" size="lg" className="md:h-9" asChild><Link href={`/projects/${project.id}/sow`}><FileText size={14} />View clauses</Link></Button>
              </div>
            </div>
          </div>
        </section>

        {isReady && <DocInsightBlocks doc={doc} classification={classification} loading={classLoading} failed={classError && !classification} />}

        {/* Key findings returned by the analysis */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 md:px-6 md:py-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <SonarMark size="sm" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">What did the analysis flag?</h2>
                <p className="mt-0.5 text-sm text-[var(--ink-600)]">Key findings from the analysis, most severe first.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" className="md:h-9" asChild><Link href={`/projects/${project.id}/sow`}>Open SOW<ArrowRight size={14} /></Link></Button>
            </div>
          </div>

          {!isReady ? (
            <div className="flex flex-col items-center px-4 py-10 text-center md:px-6">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]"><Sparkles size={18} strokeWidth={1.5} /></span>
              <p className="mb-1 text-base font-semibold text-foreground">Insights appear once processing completes.</p>
              <p className="text-sm text-[var(--ink-600)]">Sonar is still analyzing this document.</p>
            </div>
          ) : !classification && classLoading ? (
            <div className="space-y-3 p-4 md:px-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : !classification ? (
            <div className="flex flex-col items-center px-4 py-10 text-center md:px-6">
              <p className="mb-1 text-base font-semibold text-foreground">Findings couldn&apos;t be loaded.</p>
              <p className="max-w-sm text-sm text-[var(--ink-600)]">The analysis for this document didn&apos;t load, so its findings are unknown.</p>
              <Button variant="outline" size="lg" className="mt-4 md:h-9" onClick={() => refetchClass()}>Try again</Button>
            </div>
          ) : findings.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center md:px-6">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success-fg)]"><CheckCircle2 size={18} /></span>
              <p className="mb-1 text-base font-semibold text-foreground">No key findings.</p>
              <p className="max-w-sm text-sm text-[var(--ink-600)]">The analysis of this document returned no key findings.</p>
            </div>
          ) : (
            <>
            <ListFilters
              className="border-b border-border p-4 md:px-6"
              search={query}
              onSearch={setQuery}
              placeholder="Search findings"
              groups={filterGroups}
              shown={shownFindings.length}
              total={findings.length}
              noun="findings"
              onClear={clearFilters}
            />
            {shownFindings.length === 0 && <div className="p-4 md:p-6"><NoResults noun="findings" onClear={clearFilters} /></div>}
            <ul className="divide-y divide-[var(--ink-100)]">
              {shownFindings.map((f, i) => {
                const s = SEVERITY_META[f.severity];
                return (
                  <li key={i} className="flex items-start gap-3 p-4 md:px-6">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.text}`}>{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-base font-semibold text-foreground">{f.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${s.bg} ${s.text}`}>{f.severity}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </section>

      </div>
    </>
  );
}

const DAY = 86_400_000;
const RISK_PILL: Record<"critical" | "high", string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
};

function relDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

/**
 * The questions this page answers for ONE document, each from that document's
 * own API data (its list row and its classification): which clauses need
 * attention first, where its risk concentrates, what money and dates it states,
 * and what the analysis could not extract. A missing value reads "Not
 * extracted" — never 0, never a default.
 */
function DocInsightBlocks({ doc, classification, loading, failed }: {
  doc: ApiDocument; classification: ApiClassification | undefined; loading: boolean; failed: boolean;
}) {
  const now = useNow(); // real current time, re-read every minute
  const packs = useCompliancePacks();
  const [showAll, setShowAll] = useState(false);

  const clauses = useMemo(() => classification?.clauses ?? [], [classification]);
  const rated = useMemo(() => clauses.filter((c) => c.riskRated !== false), [clauses]);
  const unrated = clauses.length - rated.length;
  // Clauses rated critical or high, critical first, then in clause order.
  const attention = useMemo(
    () => rated
      .filter((c) => c.riskLevel === "critical" || c.riskLevel === "high")
      .sort((a, b) => (a.riskLevel === b.riskLevel ? 0 : a.riskLevel === "critical" ? -1 : 1) || a.number.localeCompare(b.number, undefined, { numeric: true })),
    [rated],
  );
  const categoryCount = new Set(rated.map((c) => c.category)).size;

  const value = docValueOrNull(classification, persistedOf(doc));
  const currency = doc.currency ?? classification?.commercials?.currency ?? null;
  const delta = classification?.amendment?.valueDelta ?? (doc.docType === "AMENDMENT" ? doc.valueDelta ?? null : null);
  const paymentTerms = classification?.commercials?.paymentTerms ?? doc.paymentTerms ?? null;

  // Dates as extracted; the notice deadline is the renewal date minus the notice period.
  const ms = (iso: string | null | undefined) => { const t = iso ? new Date(iso).getTime() : NaN; return Number.isFinite(t) ? t : null; };
  const renewal = ms(doc.renewalDate);
  const dates: { label: string; t: number | null; note?: string }[] = [
    { label: "Effective date", t: ms(doc.effectiveDate) },
    { label: "Term end", t: ms(doc.termEndDate) },
    { label: "Renewal", t: renewal, note: doc.autoRenews ? "Renews automatically" : undefined },
    ...(renewal !== null && typeof doc.renewalNoticeDays === "number" && doc.renewalNoticeDays > 0
      ? [{ label: "Notice deadline", t: renewal - doc.renewalNoticeDays * DAY, note: `${doc.renewalNoticeDays} days before renewal` }]
      : []),
  ];

  const packsEnabled = (packs.data?.packs.length ?? 0) > 0;
  const hasCoverage = typeof doc.complianceCoveragePct === "number";
  // What the analysis did not provide for this document.
  const missing = [
    value === null ? "No contract value was extracted." : "",
    dates.every((d) => d.t === null) ? "No effective, term-end or renewal date was extracted." : "",
    (doc.parties?.length ?? 0) === 0 ? "No parties were identified." : "",
    !doc.riskCounts && !doc.overallRisk ? "No risk assessment was returned." : "",
    unrated > 0 ? `${unrated} clause${unrated === 1 ? "" : "s"} came back without a risk level.` : "",
    failed ? "The clause-level analysis couldn\u2019t be loaded, so clause detail is unknown." : "",
  ].filter(Boolean);

  const shown = showAll ? attention : attention.slice(0, 5);

  // Until the classification has answered, "not extracted" would be a guess.
  if (!classification && loading) {
    return (
      <div className="space-y-4 md:space-y-6" aria-busy="true">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2"><Skeleton className="h-56 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div>
      </div>
    );
  }

  return (
    <>
      {/* Which clauses need attention first? */}
      <section aria-labelledby="doc-attention" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3.5 md:px-6">
          <h2 id="doc-attention" className="text-lg font-semibold tracking-tight text-foreground">Which clauses need attention first?</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{classification ? `${attention.length} rated critical or high` : loading ? "Loading…" : "Not available"}</span>
        </div>
        {!classification ? (
          loading
            ? <div className="space-y-3 p-4 md:p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            : <p className="px-4 py-8 text-center text-sm text-[var(--ink-600)] md:px-6">Clause detail isn&apos;t available for this document.</p>
        ) : attention.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-8 text-center md:px-6">
            <CheckCircle2 size={20} className="mb-2 text-[var(--success)]" />
            <p className="text-base font-semibold text-foreground">Nothing needs attention</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--ink-600)]">None of the {rated.length} rated clause{rated.length === 1 ? "" : "s"} in this document is critical or high.</p>
          </div>
        ) : (
          <>
            <ol className="divide-y divide-border">
              {shown.map((c, i) => (
                <li key={`${c.number}-${i}`}>
                  <Link href={`/projects/${doc.docId}/sow#clause-${encodeURIComponent(c.number)}`} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] md:px-6">
                    <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_PILL[c.riskLevel as "critical" | "high"]}`}>{RISK_LABEL[c.riskLevel]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="break-words text-base font-semibold text-foreground">{c.title || `Clause ${c.number}`}</span>
                        {c.number && <span className="font-mono text-xs text-muted-foreground">§{c.number}</span>}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{clauseTypeLabel(c)}</span>
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-[var(--ink-600)]">{c.summary || "No summary was returned for this clause."}</span>
                    </span>
                    <ArrowRight size={16} className="mt-1 hidden shrink-0 text-[var(--ink-300)] transition-colors group-hover:text-[var(--brand-primary-600)] sm:block" />
                  </Link>
                </li>
              ))}
            </ol>
            {attention.length > 5 && (
              <div className="border-t border-border px-4 py-2 md:px-6">
                <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] md:h-9" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show the first 5" : `Show all ${attention.length}`}</Button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {/* Where does risk concentrate? */}
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Where does risk concentrate?</h2>
            <span className="text-sm tabular-nums text-muted-foreground">{classification ? `${rated.length} rated clause${rated.length === 1 ? "" : "s"} · ${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}` : ""}</span>
          </div>
          {!classification ? (
            loading ? <Skeleton className="h-40 rounded-lg" /> : <p className="text-sm text-[var(--ink-600)]">Clause detail isn&apos;t available for this document.</p>
          ) : rated.length === 0 ? (
            <p className="text-sm text-[var(--ink-600)]">No clause in this document has a risk level.</p>
          ) : (
            // Every category is listed (no row cap), so none is dropped.
            <ClauseHeatmap clauses={rated} maxRows={Math.max(1, categoryCount)} />
          )}
        </section>

        {/* What money and dates does it state? */}
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
          <h2 className="text-lg font-semibold mb-4 tracking-tight text-foreground">What money and dates does it state?</h2>
          <dl className="divide-y divide-[var(--ink-100)] text-sm">
            <Fact label="Contract value" value={value !== null ? fmtMoney(value, currency) : null} note={value !== null && !currency ? "Currency not extracted" : undefined} />
            {(doc.docType === "AMENDMENT" || delta !== null) && (
              <Fact label="Value change in this amendment" value={delta !== null ? `${delta > 0 ? "+" : ""}${fmtMoney(delta, currency)}` : null} missing="Not stated" />
            )}
            <Fact label="Payment terms" value={paymentTerms} />
            {dates.map((d) => (
              <Fact
                key={d.label}
                label={d.label}
                value={d.t !== null ? formatDate(new Date(d.t)) : null}
                note={d.t !== null ? [relDays(Math.round((d.t - now) / DAY)), d.note].filter(Boolean).join(" · ") : undefined}
              />
            ))}
            {packsEnabled && (
              <Fact
                label="Compliance coverage"
                value={hasCoverage ? `${Math.round(doc.complianceCoveragePct as number)}%` : null}
                missing="Not recorded"
                note={hasCoverage && typeof doc.complianceGaps === "number" ? `${doc.complianceGaps} gap${doc.complianceGaps === 1 ? "" : "s"}${doc.complianceFrameworks?.length ? ` · ${doc.complianceFrameworks.join(", ")}` : ""}` : undefined}
              />
            )}
          </dl>
        </section>
      </div>

      {/* What is missing? */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What is missing?</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{missing.length} item{missing.length === 1 ? "" : "s"}</span>
        </div>
        {missing.length === 0 ? (
          <p className="text-sm text-[var(--ink-600)]">Nothing: this document has a value, at least one date, parties and a risk assessment.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-[var(--ink-700)]">
            {missing.map((m) => <li key={m} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" /><span className="min-w-0">{m}</span></li>)}
          </ul>
        )}
      </section>
    </>
  );
}

/** One labelled fact. A null value renders as "No value yet", never as a default. */
function Fact({ label, value, note, missing = "No value yet" }: { label: string; value: string | null; note?: string; missing?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className={`block break-words ${value === null ? "text-muted-foreground" : "font-semibold tabular-nums text-foreground"}`}>{value ?? missing}</span>
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

const STAT_TONE = {
  neutral: "bg-muted text-[var(--ink-700)]",
  success: "bg-[var(--success-soft)] text-[var(--success-fg)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
} as const;

function Stat({ label, value, hint, icon, tone = "neutral", className = "" }: {
  label: string; value: React.ReactNode; hint: string; icon: React.ReactNode; tone?: keyof typeof STAT_TONE; className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{label}</h3>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STAT_TONE[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 break-words text-3xl font-semibold leading-none tabular-nums tracking-tight text-foreground">{value}</div>
      <p className={`mt-2 text-sm first-letter:uppercase ${tone === "neutral" ? "text-muted-foreground" : STAT_TONE[tone].split(" ")[1]}`}>{hint}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project not found</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-sm font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <>
      <div><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  );
}
