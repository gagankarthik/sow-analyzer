"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KeyDateList } from "@/components/dates/KeyDateList";
import { ReanalyseNotice } from "@/components/dates/ReanalyseNotice";
import {
  Upload, GitBranch, CheckCircle2, CalendarClock, Files, Layers, Clock, AlertTriangle,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useClassification, useDocument, useTimeline } from "@/lib/queries/documents";
import { useNow } from "@/lib/use-now";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { fmtMoney } from "@/lib/contract-value";
import {
  buildKeyDateTimeline, documentKeyDates, formatIsoDay, hasIssue, kindLabel, relativeDays, ruleText, stateLabel,
  KEY_DATE_KINDS, KEY_DATE_STATES,
  type DerivedKeyDate, type KeyDateState, type TermPeriod,
} from "@/lib/key-dates";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type Project = ReturnType<typeof apiDocToProject>;
type DotState = "done" | "active" | "pending" | "forecast";

type Ev = {
  id: string;
  date?: string;
  state: DotState;
  icon: React.ReactNode;
  badge: { label: string; bg: string; text: string };
  title: string;
  body?: string;
  meta?: string;
  /** Signed change in contract value, when the amendment states one. */
  valueDelta?: number | null;
  inForce?: boolean;
};

const BADGE = {
  created: { label: "Created", bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]" },
  version: { label: "Version", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
  amendment: { label: "Amendment", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
  current: { label: "Now", bg: "bg-structure-soft", text: "text-structure-soft-fg" },
  forecast: { label: "Forecast", bg: "bg-[var(--ai-surface)]", text: "text-[var(--ai-ink)]" },
};

const STATE_DOT: Record<KeyDateState, string> = {
  completed: "bg-[var(--ink-400)]",
  current: "bg-[var(--brand-primary-600)]",
  upcoming: "bg-[var(--brand-primary-300)]",
  undated: "bg-[var(--ink-300)]",
};

const HAS_ISSUE = "issue";
const NO_ISSUE = "clean";

/** "+$3,000" / "−$1,200": the sign is always written. */
function signedMoney(n: number, currency?: string | null): string {
  return n > 0 ? `+${fmtMoney(n, currency)}` : fmtMoney(n, currency);
}

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: detail, isLoading, isError, error, refetch, isFetching } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, error: classErr } = useClassification(id, !!isReady);
  const { data: timeline, isError: timelineError, error: timelineErr } = useTimeline(id, !!isReady);
  const now = useNow(); // the real clock, re-read every minute

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState(ALL);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [issueFilter, setIssueFilter] = useState(ALL);

  // Key dates from the best source there is: the classification's full list,
  // else the list on the document row, else the older date fields.
  const doc = detail?.document;
  const source = useMemo(() => (doc ? documentKeyDates(doc, classification) : null), [doc, classification]);
  const dates = useMemo(() => buildKeyDateTimeline(source?.dates ?? [], now), [source, now]);

  const shown = useMemo<DerivedKeyDate[]>(() => {
    const term = query.trim().toLowerCase();
    return dates.items.filter((k) => {
      if (stateFilter !== ALL && k.state !== stateFilter) return false;
      if (kindFilter !== ALL && k.kind !== kindFilter) return false;
      if (issueFilter === HAS_ISSUE && !hasIssue(k)) return false;
      if (issueFilter === NO_ISSUE && hasIssue(k)) return false;
      if (!term) return true;
      const haystack = `${k.label} ${kindLabel(k.kind)} ${k.rawText ?? ""} ${k.sectionRef ?? ""} ${k.clauseNumber ?? ""} ${ruleText(k) ?? ""} ${k.date ?? ""}`;
      return haystack.toLowerCase().includes(term);
    });
  }, [dates, query, stateFilter, kindFilter, issueFilter]);

  // How the contract changed: versions, the amendment chain and the resulting state.
  const events = useMemo<Ev[]>(() => {
    if (!detail) return [];
    const out: Ev[] = [];
    const d = detail.document;

    out.push({
      id: "created", date: d.createdAt, state: "done",
      icon: <Upload size={14} />, badge: BADGE.created,
      title: "Document created", meta: d.docType,
    });

    const versions = [...detail.versions].sort((a, b) => a.versionNumber - b.versionNumber);
    for (const v of versions) {
      const tags: string[] = [];
      if (v.diffKey) tags.push("diff");
      if (v.timelineKey) tags.push("timeline");
      out.push({
        id: `v-${v.versionNumber}`, date: v.createdAt, state: "done",
        icon: <Layers size={14} />, badge: BADGE.version,
        title: `Version ${v.versionNumber} recorded`,
        body: `Extraction: ${v.extractionMethod || "not recorded"}${tags.length ? ` · ${tags.join(" · ")}` : ""}`,
      });
    }

    // The amendment chain, in the order the API replayed it (effective date,
    // then upload time; undated amendments last).
    for (const amd of timeline?.amendmentChain ?? []) {
      // `inForce` is the API's own reading of the lifecycle stage; older
      // timelines do not carry it, so fall back to the stage itself.
      const inForce = typeof amd.inForce === "boolean" ? amd.inForce : (amd.lifecycle ?? "").toLowerCase() === "active";
      out.push({
        id: `amd-${amd.docId}`, date: amd.effectiveDate ?? undefined,
        state: inForce ? "done" : "pending",
        icon: <GitBranch size={14} />, badge: BADGE.amendment,
        title: amd.title || `${amd.docType ?? "Amendment"}`,
        meta: amd.lifecycle ?? undefined,
        valueDelta: amd.valueDelta,
        inForce: typeof amd.inForce === "boolean" ? amd.inForce : undefined,
      });
    }

    if (timeline) {
      const currentCount = Object.keys(timeline.currentState ?? {}).length;
      out.push({
        id: "current", state: "active", icon: <CheckCircle2 size={14} />, badge: BADGE.current,
        title: "Current state", body: `${currentCount} clause${currentCount === 1 ? "" : "s"} in force`,
      });
      if (timeline.futureState && Object.keys(timeline.futureState).length > 0) {
        const futureCount = Object.keys(timeline.futureState).length;
        out.push({
          id: "forecast", state: "forecast", icon: <CalendarClock size={14} />, badge: BADGE.forecast,
          title: "Expected after pending amendments", body: `${futureCount} clause${futureCount === 1 ? "" : "s"} projected`,
        });
      }
    }
    return out;
  }, [detail, timeline]);

  if (isLoading) return <TimelineSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail || !source) return null;

  const project: Project = apiDocToProject(detail.document);
  const status = detail.document.status;
  const isProcessing = status !== "READY" && status !== "FAILED";
  // Until the classification has answered we do not know whether the full list
  // exists, so nothing is said about "analysed before date extraction" yet.
  const datesPending = !!isReady && classLoading;
  const classFailed = classError && errorStatus(classErr) !== 404;
  const { counts } = dates;

  const kindsPresent = KEY_DATE_KINDS.filter((k) => dates.items.some((i) => i.kind === k));
  const issueCount = counts.withIssues;
  const filterGroups: FilterGroup[] = [
    {
      id: "state", label: "State", value: stateFilter, onChange: setStateFilter,
      options: KEY_DATE_STATES.filter((s) => counts[s] > 0).map((s) => ({ value: s, label: stateLabel(s), count: counts[s], dot: STATE_DOT[s] })),
    },
    {
      id: "issue", label: "Check", value: issueFilter, onChange: setIssueFilter,
      options: issueCount > 0
        ? [{ value: HAS_ISSUE, label: "Has an issue", count: issueCount }, { value: NO_ISSUE, label: "No issue", count: counts.total - issueCount }]
        : [],
    },
    {
      id: "kind", label: "Kind", as: "select", allLabel: "All kinds", value: kindFilter, onChange: setKindFilter,
      options: kindsPresent.map((k) => ({ value: k, label: kindLabel(k) })),
    },
  ];
  const clearFilters = () => { setQuery(""); setStateFilter(ALL); setKindFilter(ALL); setIssueFilter(ALL); };

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        {isProcessing && (
          <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 md:mb-6 md:px-5">
            <Clock size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <p className="text-base leading-relaxed text-foreground"><span className="font-semibold">This document is still being analysed.</span> Its dates and history appear here when the analysis finishes.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <main className="min-w-0 space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Key dates</h2>
            </div>

            {/* Honest about where the list came from. */}
            {classFailed && (
              <p role="alert" className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-foreground">
                The full analysis couldn&apos;t be loaded
                {source.source === "document"
                  ? ", so these are the dates stored on the document record, with shortened wording and without their rules or issues."
                  : ", so the dates it holds are not shown."}
              </p>
            )}
            {source.source === "document" && source.truncated && (
              <p role="status" className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-foreground">
                Showing {source.dates.length}{source.total !== null ? ` of ${source.total}` : ""} dates: the list stored on the document record was cut off to fit. The full list is in the analysis.
              </p>
            )}
            {isReady && !datesPending && !classFailed && !source.extracted && (
              <ReanalyseNotice docId={id} role={detail.document.role} busy={isProcessing} title="This document was analysed before full date extraction">
                {source.source === "legacy"
                  ? `Showing the ${source.dates.length} date${source.dates.length === 1 ? "" : "s"} the earlier analysis recorded. Re-analyse this document to extract every date, deadline and payment, with its source clause.`
                  : "The earlier analysis recorded no dates. Re-analyse this document to extract dates."}
              </ReanalyseNotice>
            )}

            {dates.term && <TermStrip term={dates.term} />}

            {datesPending ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : counts.total === 0 ? (
              isReady && source.extracted && (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-10 text-center">
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]"><CalendarClock size={18} /></span>
                  <p className="text-base font-semibold text-foreground">No dates were found in this document</p>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">The analysis looked for effective, term, renewal, notice, milestone, deliverable and payment dates and found none stated.</p>
                </div>
              )
            ) : (
              <>
                <ListFilters
                  className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
                  search={query}
                  onSearch={setQuery}
                  placeholder="Search dates, wording or clause"
                  groups={filterGroups}
                  shown={shown.length}
                  total={counts.total}
                  noun="dates"
                  onClear={clearFilters}
                />
                {shown.length === 0
                  ? <NoResults noun="dates" onClear={clearFilters} />
                  : <KeyDateList items={shown} docId={id} today={dates.today} />}
              </>
            )}

            {/* ── How this contract changed ─────────────────────── */}
            <section aria-labelledby="history-heading" className="pt-4">
              <div className="mb-3">
                <h2 id="history-heading" className="text-lg font-semibold tracking-tight text-foreground">How this contract changed</h2>
                <p className="mt-0.5 text-sm text-[var(--ink-600)]">Versions of this document and the amendments in its chain, in order.</p>
              </div>
              {/* A document with no amendment chain has no timeline artifact (404):
                  that is expected. Any other failure is said out loud. */}
              {timelineError && errorStatus(timelineErr) !== 404 && (
                <p role="alert" className="mb-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-foreground">
                  The amendment history couldn&apos;t be loaded, so amendment and current-state events are missing below.
                </p>
              )}
              <ol className="relative">
                {events.map((e, i) => {
                  // The "current state" event is this section's focal block.
                  const focal = e.state === "active";
                  return (
                    <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0 md:gap-4">
                      {i < events.length - 1 && <span className="absolute bottom-0 left-4 top-8 w-px -translate-x-1/2 bg-[var(--ink-300)]" aria-hidden />}
                      <Node state={e.state} icon={e.icon} />
                      <div className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${focal ? "bg-[var(--navy-800)] text-white" : "border border-border bg-card shadow-xs"}`}>
                        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${focal ? "bg-white text-[var(--brand-primary-700)]" : `${e.badge.bg} ${e.badge.text}`}`}>{e.badge.label}</span>
                          {e.meta && <span className={`text-xs capitalize ${focal ? "text-white" : "text-[var(--ink-600)]"}`}>{e.meta}</span>}
                          {e.inForce !== undefined && (
                            <Badge variant={e.inForce ? "success" : "neutral"} size="sm">{e.inForce ? "In force" : "Not in force"}</Badge>
                          )}
                          <span className={`ml-auto shrink-0 text-xs tabular-nums ${focal ? "text-white" : "text-muted-foreground"}`} title={e.date ? formatDate(e.date) : undefined}>
                            {e.state === "active" ? "Now" : e.state === "forecast" ? "Projected" : e.date ? formatRelativeDays(e.date, new Date(now)) : "No date"}
                          </span>
                        </div>
                        <p className={`break-words font-semibold ${focal ? "text-lg text-white" : "text-base text-foreground"}`}>{e.title}</p>
                        {e.body && <p className={`mt-0.5 text-sm leading-snug ${focal ? "text-white" : "text-[var(--ink-600)]"}`}>{e.body}</p>}
                        {/* Signed: an amendment can lower the contract value as well as raise it. */}
                        {e.valueDelta !== undefined && (
                          <p className="mt-1 text-sm text-[var(--ink-600)]">
                            {typeof e.valueDelta === "number" && e.valueDelta !== 0 ? (
                              <>
                                Contract value{" "}
                                <span className="font-semibold tabular-nums text-foreground">{signedMoney(e.valueDelta, detail.document.currency)}</span>
                                {e.valueDelta < 0 ? " (a reduction)" : " (an increase)"}
                              </>
                            ) : e.valueDelta === 0 ? "No change in contract value" : "Value change not stated"}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </main>

          <aside className="min-w-0 lg:col-span-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5 lg:sticky lg:top-[76px]">
              <h3 className="text-base font-semibold mb-3 text-foreground">At a glance</h3>
              <ul className="divide-y divide-[var(--ink-100)] text-sm">
                {datesPending ? (
                  <Row label="Key dates"><Skeleton className="h-4 w-10" /></Row>
                ) : (
                  <>
                    {KEY_DATE_STATES.map((s) => (
                      <Row key={s} label={stateLabel(s)}>
                        <span className="inline-flex items-center gap-2 font-semibold tabular-nums text-foreground">
                          <span className={`h-2 w-2 rounded-full ${STATE_DOT[s]}`} aria-hidden />{counts[s]}
                        </span>
                      </Row>
                    ))}
                    {counts.overdue > 0 && <Row label="Due date passed"><span className="font-semibold tabular-nums text-[var(--danger)]">{counts.overdue}</span></Row>}
                    {counts.withIssues > 0 && (
                      <Row label="To check">
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-[var(--warning)]"><AlertTriangle size={13} />{counts.withIssues}</span>
                      </Row>
                    )}
                  </>
                )}
                <Row label="Versions"><span className="font-semibold tabular-nums text-foreground">{detail.versions.length}</span></Row>
                {timeline && <Row label="Clauses now"><span className="font-semibold tabular-nums text-foreground">{Object.keys(timeline.currentState ?? {}).length}</span></Row>}
                {timeline && timeline.amendmentChain.length > 0 && <Row label="Amendments"><span className="font-semibold tabular-nums text-foreground">{timeline.amendmentChain.length}</span></Row>}
                <Row label="Created"><span className="font-medium text-foreground">{formatDate(detail.document.createdAt)}</span></Row>
              </ul>
              {counts.overdue > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  &ldquo;Due date passed&rdquo; means the date is behind us. Blue-IQ does not record whether an obligation was met.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/** The contract term as one bar: where today falls between start and end. */
function TermStrip({ term }: { term: TermPeriod }) {
  const pct = term.totalDays > 0 ? Math.round((term.elapsedDays / term.totalDays) * 100) : term.state === "upcoming" ? 0 : 100;
  const headline = term.state === "current" ? "Contract term in force" : term.state === "upcoming" ? "Contract term not started" : "Contract term has ended";
  const detail = term.state === "current"
    ? `Ends ${relativeDays(term.remainingDays)}`
    : term.state === "upcoming"
      // today → start = (today → end) − (start → end)
      ? `Starts ${relativeDays(term.remainingDays - term.totalDays)}`
      : `Ended ${relativeDays(term.remainingDays)}`;
  return (
    <section aria-label="Contract term" className="rounded-xl bg-[var(--navy)] p-4 text-white md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold tracking-tight">{headline}</h3>
        <p className="text-sm tabular-nums text-[var(--navy-foreground)]">{detail}</p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--navy-border)]"
        role="progressbar"
        aria-label="Share of the contract term that has passed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        {/* Width is data (share of the term elapsed), so it is set inline. */}
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-xs text-[var(--navy-foreground)]">
        <span>{term.startKind === "start" ? "Started" : "Effective"} <time dateTime={term.start} className="tabular-nums text-white">{formatIsoDay(term.start)}</time></span>
        <span>Term ends <time dateTime={term.end} className="tabular-nums text-white">{formatIsoDay(term.end)}</time></span>
      </div>
    </section>
  );
}

function Node({ state, icon }: { state: DotState; icon: React.ReactNode }) {
  const base = "relative z-10 mt-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center";
  if (state === "active") {
    return <span className={`${base} rounded-lg bg-[var(--brand-primary-600)] text-white ring-4 ring-[var(--brand-primary-100)]`}>{icon}</span>;
  }
  if (state === "forecast") {
    return <span className={`${base} rounded-full border-2 border-dashed border-[var(--ai-ink)] bg-card text-[var(--ai-ink)]`}>{icon}</span>;
  }
  if (state === "pending") {
    return <span className={`${base} rounded-full border-2 border-[var(--warning)] bg-card text-[var(--warning)]`}>{icon}</span>;
  }
  return <span className={`${base} rounded-full border border-[var(--ink-300)] bg-card text-[var(--ink-700)]`}>{icon}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><span className="text-muted-foreground">{label}</span>{children}</li>;
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

function TimelineSkeleton() {
  return (
    <>
      <div><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="app-container py-6 md:py-8"><div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12"><div className="space-y-4 lg:col-span-8">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div><div className="space-y-4 lg:col-span-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div></div></div>
    </>
  );
}
