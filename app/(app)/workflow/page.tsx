"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import {
  Plus,
  Search,
  Kanban,
} from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_TYPE_META, docTypeShort } from "@/lib/doc-types";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { useDocuments, isProcessing } from "@/lib/queries/documents";
import { ROLE_META } from "@/components/team/roles";

const DOC_TYPE_KEYS = Object.keys(DOC_TYPE_META) as (keyof typeof DOC_TYPE_META)[];
import type { ApiDocument, Lifecycle } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: Lifecycle[] = [
  "draft",
  "review",
  "negotiation",
  "approval",
  "signed",
  "active",
  "renewal",
  "expired",
];

const STAGE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft",
  review: "Review",
  negotiation: "Negotiation",
  approval: "Approval",
  signed: "Signed",
  active: "Active",
  renewal: "Renewal",
  expired: "Expired",
};

const STAGE_ACCENT: Record<Lifecycle, { dot: string; soft: string; ink: string }> = {
  draft:       { dot: "bg-[var(--ink-400)]",   soft: "bg-[var(--ink-100)]",        ink: "text-[var(--ink-600)]" },
  review:      { dot: "bg-[var(--info)]",       soft: "bg-[var(--info-soft)]",      ink: "text-[var(--info)]" },
  negotiation: { dot: "bg-[var(--warning)]",    soft: "bg-[var(--warning-soft)]",   ink: "text-[var(--warning)]" },
  approval:    { dot: "bg-[var(--ai-ink)]",     soft: "bg-[var(--ai-surface)]",     ink: "text-[var(--ai-ink)]" },
  signed:      { dot: "bg-[var(--success)]",    soft: "bg-[var(--success-soft)]",   ink: "text-[var(--success)]" },
  active:      { dot: "bg-[var(--success)]",    soft: "bg-[var(--success-soft)]",   ink: "text-[var(--success)]" },
  renewal:     { dot: "bg-[var(--warning)]",    soft: "bg-[var(--warning-soft)]",   ink: "text-[var(--warning)]" },
  expired:     { dot: "bg-[var(--danger)]",     soft: "bg-[var(--danger-soft)]",    ink: "text-[var(--danger)]" },
};

export default function WorkflowPage() {
  // The shared documents query (polls while anything is processing; kept in
  // step with every upload / edit / delete elsewhere in the app). It holds
  // exactly the documents the server lets this user see; the board is read-only,
  // so it is the same for owners, editors and viewers.
  const { data, isLoading: loading, isError, error: loadError, isFetching, dataUpdatedAt, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const failed = isError && !data;
  const error = isError ? (loadError instanceof Error ? loadError.message : "The request failed.") : null;

  const [docTypeFilter, setDocTypeFilter] = useState<string>("All");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<"createdAt" | "title">("createdAt");

  const term = q.trim().toLowerCase();
  const visibleDocs = docs
    .filter((d) => {
      if (docTypeFilter !== "All" && d.docType !== docTypeFilter) return false;
      if (statusFilter === "READY" && d.status !== "READY") return false;
      if (statusFilter === "FAILED" && d.status !== "FAILED") return false;
      if (statusFilter === "processing" && !isProcessing(d.status)) return false;
      if (term && !`${d.title ?? ""} ${(d.parties ?? []).join(" ")}`.toLowerCase().includes(term)) return false;
      return true;
    })
    .sort((a, b) =>
      sortKey === "title"
        ? (a.title || "").localeCompare(b.title || "")
        : String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );

  const activeFilters = (term ? 1 : 0) + (docTypeFilter !== "All" ? 1 : 0) + (statusFilter !== "All" ? 1 : 0);
  const clearFilters = () => { setQ(""); setDocTypeFilter("All"); setStatusFilter("All"); };
  const totalDocs = visibleDocs.length;
  const noMatches = !loading && docs.length > 0 && visibleDocs.length === 0;

  return (
    <>
      <PageHeader
        title="Workflow"
        actions={
          <>
            <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />
            <Button asChild className="h-10 md:h-9">
              <Link href="/projects/upload">
                <Plus size={15} strokeWidth={2.25} /> New document
              </Link>
            </Button>
          </>
        }
      />

      <div className="app-container flex flex-col gap-4 py-6 md:gap-6 md:py-8">
        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            <span className="min-w-0 flex-1 break-words">
              {failed ? "Failed to load documents: " : "Couldn\u2019t refresh, so this board may be out of date: "}{error}
            </span>
            <button type="button" onClick={() => refetch()} className="shrink-0 rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">Try again</button>
          </div>
        )}

        {/* Filter bar: full-width search, then a chip row that scrolls sideways on a phone. */}
        <section aria-label="Filters" className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start">
            <div className="relative w-full md:w-[260px] md:shrink-0">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search documents"
                placeholder="Search by title or party…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 border-[var(--ink-300)] bg-card pl-9 pr-3 placeholder:text-[var(--ink-400)]"
              />
            </div>
            <div className={FILTER_ROW}>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger aria-label="Filter by document type" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Type</span><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {DOC_TYPE_KEYS.map((t) => <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filter by processing status" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Status</span><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as "createdAt" | "title")}>
                <SelectTrigger aria-label="Sort documents" className={FILTER_TRIGGER}><span className={FILTER_PREFIX}>Sort</span><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 text-sm md:min-h-0">
            <span className="tabular-nums text-[var(--ink-600)]" aria-live="polite">
              {loading ? "Loading…" : failed ? "Documents not loaded" : `Showing ${totalDocs} of ${docs.length} document${docs.length === 1 ? "" : "s"}`}
            </span>
            {activeFilters > 0 && (
              <>
                <span className="rounded-full bg-[var(--brand-primary-50)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-primary-700)]">
                  {activeFilters} filter{activeFilters === 1 ? "" : "s"} active
                </span>
                <button type="button" onClick={clearFilters} className="inline-flex min-h-10 items-center rounded font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:min-h-0">
                  Clear filters
                </button>
              </>
            )}
          </div>
        </section>

        {failed ? null : noMatches ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center md:py-16">
            <Kanban size={24} className="mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">No documents match these filters</h2>
            <p className="mt-1.5 max-w-xs text-sm text-[var(--ink-600)]">Try a different search or clear the filters to see the whole pipeline.</p>
            <Button variant="outline" size="lg" className="mt-5" onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : !loading && !error && docs.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center md:py-16">
            <Kanban size={24} className="mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">No documents yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-[var(--ink-600)]">Documents you upload, and the documents of projects shared with you, appear here in their lifecycle stage.</p>
            <Button asChild variant="outline" size="lg" className="mt-5">
              <Link href="/projects/upload"><Plus size={15} strokeWidth={2.25} />Upload a document</Link>
            </Button>
          </div>
        ) : (
        /* Kanban board — fixed-width columns that scroll sideways and snap on touch. */
        <MotionReveal delay={0.05}>
          <section aria-label="Documents by stage">
            <p className="mb-2 text-xs text-muted-foreground xl:hidden">Swipe sideways to see every stage.</p>
            <div
              tabIndex={0}
              role="group"
              aria-label="Stage columns, scroll horizontally"
              className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:mx-0 sm:scroll-px-0 sm:px-0 md:snap-proximity md:gap-4"
            >
              {STAGES.map((s) => {
                const stageItems = visibleDocs.filter((d) => d.lifecycle === s);
                const accent = STAGE_ACCENT[s];
                return (
                  <div
                    key={s}
                    className="flex max-h-[70vh] min-h-[280px] w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-xl border border-border bg-[var(--panel)] sm:w-[280px]"
                  >
                    <div className="flex items-center gap-2 rounded-t-xl border-b border-border bg-card px-4 py-3">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", accent.dot)} />
                      <h3 className="text-base font-semibold text-foreground">{STAGE_LABEL[s]}</h3>
                      <span
                        className={cn(
                          "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                          accent.soft,
                          accent.ink,
                        )}
                      >
                        {loading ? "…" : stageItems.length}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto p-2">
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-28 w-full rounded-lg" />
                        ))
                      ) : stageItems.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-[var(--ink-300)] px-3 py-8 text-center text-sm text-muted-foreground">
                          No documents in this stage
                        </p>
                      ) : (
                        stageItems.map((doc) => (
                          <KanbanCard key={doc.docId} doc={doc} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </MotionReveal>
        )}
      </div>
    </>
  );
}

// Filter bar: full-width search, then a chip row that scrolls sideways on a phone and wraps from md.
const FILTER_ROW = "-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-1 md:flex-wrap md:overflow-visible md:px-0";
const FILTER_TRIGGER = "w-auto shrink-0 gap-2 border-[var(--ink-300)] bg-card text-sm data-[size=default]:h-10";
const FILTER_PREFIX = "shrink-0 text-xs font-medium text-muted-foreground";

function getStatusIndicator(status: string) {
  if (status === "READY")
    return { label: "Ready", cls: "bg-[var(--success-soft)] text-[var(--success)]" };
  if (status === "FAILED")
    return { label: "Failed", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" };
  return { label: "Processing", cls: "bg-[var(--ink-100)] text-[var(--ink-600)]" };
}

function KanbanCard({ doc }: { doc: ApiDocument }) {
  const statusIndicator = getStatusIndicator(doc.status);

  return (
    <Link
      href={`/projects/${doc.docId}`}
      className="group block rounded-lg border border-border bg-card p-3 shadow-xs transition-[box-shadow,border-color] duration-150 hover:border-[var(--brand-primary-300)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="truncate font-mono text-xs text-muted-foreground">
          {doc.docId.slice(0, 8).toUpperCase()}
        </div>
        <Badge variant="secondary" size="sm" className="shrink-0 text-xs">
          {doc.docType}
        </Badge>
      </div>

      <div className="mb-3 line-clamp-2 break-words text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">
        {doc.title || "Untitled"}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            statusIndicator.cls,
          )}
        >
          {statusIndicator.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {/* Parties come from the analysis: nothing is claimed before it is READY. */}
          {doc.status !== "READY"
            ? ""
            : doc.parties?.length > 0
              ? `${doc.parties.length} part${doc.parties.length === 1 ? "y" : "ies"}`
              : "No parties extracted"}
        </span>
      </div>

      {doc.parties?.length > 0 && (
        <div className="mt-2 truncate text-xs text-muted-foreground">
          {doc.parties[0]}
          {doc.parties.length > 1 && ` +${doc.parties.length - 1} more`}
        </div>
      )}

      {doc.role && doc.role !== "owner" && (
        <div className="mt-2 truncate border-t border-border pt-2 text-xs text-[var(--ink-600)]">
          Shared with you{doc.ownerEmail ? ` by ${doc.ownerEmail}` : ""} · {ROLE_META[doc.role].label}
        </div>
      )}
    </Link>
  );
}
