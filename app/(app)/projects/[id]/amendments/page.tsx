"use client";

import { stageLabel } from "@/lib/govern/labels";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { ProcessingState } from "@/components/ProcessingState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import {
  Plus, GitBranch, Files, XCircle, AlertCircle, ChevronDown, ChevronUp,
  ArrowRight, ShieldAlert, RefreshCw,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useDiff } from "@/lib/queries/documents";
import type { ApiDiffChange } from "@/lib/types";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type Project = ReturnType<typeof apiDocToProject>;

type ChangeKind = "added" | "removed" | "modified";
function kindOf(c: ApiDiffChange): ChangeKind {
  if (!c.before && c.after) return "added";
  if (c.before && !c.after) return "removed";
  return "modified";
}
const KIND_META: Record<ChangeKind, { label: string; bg: string; text: string }> = {
  added: { label: "Added", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
  removed: { label: "Removed", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]" },
  modified: { label: "Modified", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
};
/**
 * Impact band for a change. The score (0–100) comes from the API; the bands are
 * a display grouping applied here: high = 70 or more, medium = 40–69, low =
 * under 40. A change the API did not score has no band ("unscored") — it is
 * never shown as low impact.
 */
type Band = "high" | "medium" | "low" | "unscored";
const HIGH_IMPACT = 70;
const MEDIUM_IMPACT = 40;
function bandOf(score: number | null): Band {
  if (score === null) return "unscored";
  return score >= HIGH_IMPACT ? "high" : score >= MEDIUM_IMPACT ? "medium" : "low";
}
const BAND_META: Record<Band, { label: string; bg: string; text: string }> = {
  high: { label: "High", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]" },
  medium: { label: "Medium", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
  low: { label: "Low", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
  unscored: { label: "Not scored", bg: "bg-muted", text: "text-[var(--ink-600)]" },
};
const FIELD_LABEL: Record<string, string> = { title: "Title", body: "Body", category: "Category" };

export default function AmendmentsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: detail, isLoading, isError, error, refetch, isFetching } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: diff, isLoading: diffLoading, isError: diffIsError, error: diffError, refetch: refetchDiff } = useDiff(id, !!isReady);
  // A document with no parent has no diff (404): expected. Anything else is a failure.
  const diffFailed = diffIsError && errorStatus(diffError) !== 404;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(ALL);
  const [impact, setImpact] = useState(ALL);
  const [sort, setSort] = useState<"impact" | "clause">("impact");

  // Highest impact first; unscored changes last.
  const changes = useMemo(() => [...(diff?.changes ?? [])].sort((a, b) => (b.impactScore ?? -1) - (a.impactScore ?? -1)), [diff]);
  const bands = useMemo(() => {
    const n: Record<Band, number> = { high: 0, medium: 0, low: 0, unscored: 0 };
    for (const c of changes) n[bandOf(c.impactScore)]++;
    return n;
  }, [changes]);

  if (isLoading) return <AmendmentsSkeleton />;
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
  const isAmendment = doc.docType === "AMENDMENT";

  // Client-side filtering of the change list (already sorted by impact).
  const term = query.trim().toLowerCase();
  const shownChanges = changes
    .filter((c) => (kind === ALL || kindOf(c) === kind)
      && (impact === ALL || bandOf(c.impactScore) === impact)
      && (!term || `${c.clauseNumber ?? ""} ${FIELD_LABEL[c.field] ?? c.field} ${c.impactRationale ?? ""} ${c.before ?? ""} ${c.after ?? ""}`.toLowerCase().includes(term)));
  if (sort === "clause") shownChanges.sort((a, b) => (a.clauseNumber ?? "").localeCompare(b.clauseNumber ?? "", undefined, { numeric: true }));
  const kindCount = (k: ChangeKind) => changes.filter((c) => kindOf(c) === k).length;
  const filterGroups: FilterGroup[] = [
    { id: "kind", label: "Change", value: kind, onChange: setKind, options: (["added", "removed", "modified"] as ChangeKind[]).filter((k) => kindCount(k) > 0).map((k) => ({ value: k, label: KIND_META[k].label, count: kindCount(k) })) },
    { id: "impact", label: "Impact", value: impact, onChange: setImpact, options: ([["high", "High", bands.high, "bg-[var(--danger)]"], ["medium", "Medium", bands.medium, "bg-[var(--warning)]"], ["low", "Low", bands.low, "bg-[var(--success)]"], ["unscored", "Not scored", bands.unscored, "bg-[var(--ink-400)]"]] as const).filter(([, , n]) => n > 0).map(([value, label, count, dot]) => ({ value, label, count, dot })) },
  ];
  const clearFilters = () => { setQuery(""); setKind(ALL); setImpact(ALL); };

  const toggle = (cid: string) => setExpanded((p) => { const n = new Set(p); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <main className="min-w-0 space-y-4 md:space-y-6 lg:col-span-8">
            {isFailed && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 md:px-5">
                <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                <p className="text-base leading-relaxed text-[var(--ink-700)]"><span className="font-semibold text-[var(--danger)]">Processing failed.</span> Amendment data is unavailable.</p>
              </div>
            )}
            {isProcessing && <ProcessingState status={rawStatus} title="Sonar is analyzing this document" subtitle="Amendment changes appear automatically as each stage completes." />}

            {/* Parent relationship */}
            {isAmendment && doc.parentDocId && (
              <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between md:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--info)]" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">Amendment relationship</h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">This document is an <Badge variant="neutral" size="sm" className="text-xs">AMENDMENT</Badge> to a parent contract.</p>
                  </div>
                </div>
                <Link href={`/projects/${doc.parentDocId}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GitBranch size={14} />View parent document<ArrowRight size={13} strokeWidth={2.25} /></Link>
              </section>
            )}

            {/* Change analysis + changes */}
            {isReady && (
              diffLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
              ) : diffFailed ? (
                <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-12 text-center">
                  <h3 className="text-base font-semibold mb-1 text-foreground">Couldn&apos;t load the change analysis</h3>
                  <p className="mb-5 max-w-sm break-words text-sm leading-relaxed text-[var(--ink-600)]">{diffError instanceof Error ? diffError.message : "The request failed."}</p>
                  <Button variant="outline" size="lg" onClick={() => refetchDiff()}><RefreshCw size={14} />Try again</Button>
                </div>
              ) : changes.length > 0 ? (
                <>
                  {/* Focal block: how much changed, and how badly */}
                  <section aria-labelledby="change-analysis" className="rounded-xl bg-[var(--navy)] p-5 text-white md:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 id="change-analysis" className="text-lg font-semibold">Sonar change analysis</h2>
                      <span className="text-sm text-[var(--navy-foreground)]">vs parent, v{doc.latestVersion}</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                      <div className="shrink-0">
                        <div className="text-4xl font-bold leading-none tabular-nums tracking-tight">{changes.length}</div>
                        <div className="mt-1 text-sm text-[var(--navy-foreground)]">clause change{changes.length === 1 ? "" : "s"}</div>
                      </div>
                      <p className="max-w-[58ch] text-base leading-relaxed text-white">{diff?.impactSummary || "No written summary was returned for these changes."}</p>
                    </div>
                    {/* Counts per band, straight from the scored changes — no overall "risk" verdict is invented. */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--navy-border)] pt-4 text-sm">
                      {bands.high > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-2.5 py-1 font-semibold text-[var(--danger)]"><ShieldAlert size={13} />{bands.high} high impact</span>}
                      {bands.medium > 0 && <span className="inline-flex items-center rounded-full bg-[var(--navy-accent)] px-2.5 py-1 font-medium text-white">{bands.medium} medium impact</span>}
                      {bands.low > 0 && <span className="inline-flex items-center rounded-full bg-[var(--navy-accent)] px-2.5 py-1 font-medium text-white">{bands.low} low impact</span>}
                      {bands.unscored > 0 && <span className="inline-flex items-center rounded-full bg-[var(--navy-accent)] px-2.5 py-1 font-medium text-white">{bands.unscored} not scored</span>}
                    </div>
                  </section>

                  {/* Change cards */}
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Clause changes</h2>
                    <ListFilters
                      className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
                      search={query}
                      onSearch={setQuery}
                      placeholder="Search changes"
                      groups={filterGroups}
                      sort={{ value: sort, onChange: (v) => setSort(v as "impact" | "clause"), options: [{ value: "impact", label: "Highest impact first" }, { value: "clause", label: "Clause order" }] }}
                      shown={shownChanges.length}
                      total={changes.length}
                      noun="changes"
                      onClear={clearFilters}
                    />
                    {shownChanges.length === 0 ? (
                      <NoResults noun="changes" onClear={clearFilters} />
                    ) : (
                      shownChanges.map((c) => <ChangeCard key={c.changeId} change={c} isExpanded={expanded.has(c.changeId)} onToggle={() => toggle(c.changeId)} />)
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-14 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><GitBranch size={20} className="text-[var(--ink-600)]" /></div>
                  <h3 className="text-base font-semibold mb-1 text-foreground">{isAmendment ? "No clause changes detected" : "No changes to show"}</h3>
                  <p className="mb-5 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                    {isAmendment
                      ? "This amendment introduced no detected clause changes versus its parent, or the parent could not be matched."
                      : "No change analysis exists for this document. Upload an amendment that references it and Sonar compares the clauses."}
                  </p>
                  <Button size="lg" asChild><Link href="/projects/new"><Plus size={14} />Upload amendment</Link></Button>
                </div>
              )
            )}
          </main>

          {/* Sidebar */}
          <aside className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 md:gap-6 lg:col-span-4 lg:grid-cols-1">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
              <h3 className="text-base font-semibold mb-3 text-foreground">Document info</h3>
              <ul className="divide-y divide-[var(--ink-100)]">
                <InfoRow label="Type"><DocTypeBadge type={doc.docType} /></InfoRow>
                <InfoRow label="Stage"><Badge variant="neutral" size="sm" className="text-xs">{stageLabel(doc.lifecycle)}</Badge></InfoRow>
                <InfoRow label="Status"><Badge variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"} size="sm" className="text-xs">{rawStatus}</Badge></InfoRow>
                <InfoRow label="Versions"><span className="text-sm font-semibold tabular-nums text-foreground">{doc.latestVersion}</span></InfoRow>
                <li className="py-2.5"></li>
                {isReady && diff && <InfoRow label="Changes"><span className="text-sm font-semibold tabular-nums text-foreground">{changes.length}</span></InfoRow>}
                {doc.parentDocId && <InfoRow label="Parent"><code className="font-mono text-xs text-foreground">{doc.parentDocId.slice(0, 12)}…</code></InfoRow>}
              </ul>
            </div>

            {isReady && changes.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
                <h3 className="text-base font-semibold mb-3 text-foreground">Impact breakdown</h3>
                <div className="space-y-3">
                  {([["High impact", "70 or more", bands.high, "bg-[var(--danger)]"], ["Medium impact", "40 to 69", bands.medium, "bg-[var(--warning)]"], ["Low impact", "under 40", bands.low, "bg-[var(--success)]"], ["Not scored", "", bands.unscored, "bg-[var(--ink-400)]"]] as const).filter(([label, , n]) => label !== "Not scored" || n > 0).map(([label, range, n, bar]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="text-[var(--ink-600)]">{label}{range ? <span className="text-muted-foreground"> · {range}</span> : null}</span><span className="font-semibold tabular-nums text-foreground">{n}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${bar}`} style={{ width: `${changes.length ? (n / changes.length) * 100 : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Each change carries an impact score from 0 to 100 from the analysis. The bands group those scores.</p>
              </div>
            )}

          </aside>
        </div>
      </div>
    </>
  );
}

function ChangeCard({ change, isExpanded, onToggle }: { change: ApiDiffChange; isExpanded: boolean; onToggle: () => void }) {
  const kind = kindOf(change);
  const km = KIND_META[kind];
  const band = bandOf(change.impactScore);
  const im = BAND_META[band];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <button type="button" onClick={onToggle} aria-expanded={isExpanded} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="font-mono text-xs text-muted-foreground">{change.clauseNumber || "—"}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${km.bg} ${km.text}`}>{km.label}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${im.bg} ${im.text}`}>{band === "high" && <ShieldAlert size={12} />}{band === "unscored" ? "Impact not scored" : `${im.label} impact · ${change.impactScore}`}</span>
          </div>
          <div className="text-base font-semibold text-foreground">{FIELD_LABEL[change.field] ?? change.field}</div>
          {change.impactRationale && <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">{change.impactRationale}</p>}
        </div>
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-[var(--ink-600)]">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {isExpanded && (
        <div className="grid grid-cols-1 gap-3 border-t border-border p-4 md:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-1.5 text-xs font-semibold text-[var(--danger)]">Before</div>
            <div className="max-h-56 overflow-y-auto whitespace-pre-line break-words rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm leading-relaxed text-[var(--ink-700)]">{change.before || <span className="text-[var(--ink-600)]">Not present</span>}</div>
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 text-xs font-semibold text-[var(--success)]">After</div>
            <div className="max-h-56 overflow-y-auto whitespace-pre-line break-words rounded-lg border border-[var(--success)]/20 bg-[var(--success-soft)] p-3 text-sm leading-relaxed text-[var(--ink-700)]">{change.after || <span className="text-[var(--ink-600)]">Removed</span>}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><span className="text-sm text-muted-foreground">{label}</span><span className="min-w-0 text-right">{children}</span></li>;
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

function AmendmentsSkeleton() {
  return (
    <>
      <div><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="app-container py-6 md:py-8"><div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12"><div className="space-y-4 lg:col-span-8"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div><div className="space-y-4 lg:col-span-4"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div></div></div>
    </>
  );
}
