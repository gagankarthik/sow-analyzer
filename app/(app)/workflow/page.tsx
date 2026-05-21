"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { MotionReveal } from "@/components/MotionReveal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Filter,
  MoreHorizontal,
  Kanban,
} from "@/components/ui/icons";
import { listDocuments } from "@/lib/api";
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

const PROCESSING_STATUSES = new Set([
  "PENDING",
  "PARSING",
  "CLASSIFYING",
  "EMBEDDING",
  "GRAPHING",
  "DIFFING",
  "TIMELINING",
  "PERSISTING",
]);

export default function WorkflowPage() {
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = STAGES.reduce<Record<Lifecycle, number>>(
    (acc, s) => {
      acc[s] = docs.filter((d) => d.lifecycle === s).length;
      return acc;
    },
    {} as Record<Lifecycle, number>,
  );

  const totalDocs = docs.length;

  return (
    <>
      <PageHeader
        eyebrow="Pipeline · live view"
        title="Workflow"
        subtitle="Documents organized by lifecycle stage — track progress from draft through to active and renewal."
        actions={
          <>
            <Button variant="outline" size="md">
              <Filter size={12} /> Filter
            </Button>
            <Button variant="ai" size="md" className="gap-1.5 pl-1.5">
              <BlueyMark size="xs" />
              Ask Bluey
            </Button>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors"
            >
              <Plus size={13} /> New document
            </Link>
          </>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Stage summary strip */}
        <MotionReveal>
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STAGES.map((s, i) => {
            const accent = STAGE_ACCENT[s];
            const count = totals[s] ?? 0;
            return (
              <MotionReveal key={s} delay={Math.min(i * 0.04, 0.2)}>
              <div
                className="rounded-2xl border border-border bg-card p-4 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
                  <span className="text-[11px] font-medium text-foreground truncate">
                    {STAGE_LABEL[s]}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  {loading ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <span
                      className="numeric tabular-nums text-foreground leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 22,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                {/* Mini share-of-pipeline bar */}
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full", accent.dot)}
                    style={{
                      width:
                        totalDocs > 0
                          ? `${Math.max(2, (count / totalDocs) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              </MotionReveal>
            );
          })}
        </section>
        </MotionReveal>

        {/* Kanban board */}
        <MotionReveal delay={0.05}>
        <section className="overflow-x-auto pb-2">
          <div className="grid grid-cols-8 gap-4 min-w-[1760px]">
            {STAGES.map((s) => {
              const stageItems = docs.filter((d) => d.lifecycle === s);
              const accent = STAGE_ACCENT[s];
              return (
                <div
                  key={s}
                  className="flex flex-col min-h-[720px] rounded-2xl border border-border bg-card shadow-xs"
                >
                  {/* Column header */}
                  <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", accent.dot)} />
                      <span className="text-[13.5px] font-semibold text-foreground truncate">
                        {STAGE_LABEL[s]}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                          accent.soft,
                          accent.ink,
                        )}
                      >
                        {loading ? "…" : stageItems.length}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="eyebrow">
                          {STAGE_LABEL[s]}
                        </DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Plus /> Add document
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BlueyMark size="xs" /> Ask Bluey to summarize
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Hide column</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {loading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                        ))}
                      </div>
                    ) : stageItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-border bg-muted/30">
                        <div className="h-10 w-10 rounded-2xl bg-card flex items-center justify-center mb-2 shadow-xs">
                          <Kanban size={15} className="text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          No documents in this stage
                        </p>
                      </div>
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

        {error && (
          <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/30 p-4 text-[13px] text-[var(--danger)]">
            Failed to load documents: {error}
          </div>
        )}
      </div>
    </>
  );
}

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
      className="block group rounded-2xl border border-border bg-card hover:border-[var(--brand-primary-300)] hover:shadow-md transition-all duration-200 p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="font-mono text-[11px] text-muted-foreground tracking-wide truncate">
          {doc.docId.slice(0, 8).toUpperCase()}
        </div>
        <Badge variant="secondary" size="sm" className="shrink-0 text-[10.5px]">
          {doc.docType}
        </Badge>
      </div>

      <div className="text-[14.5px] font-semibold text-foreground leading-snug line-clamp-2 mb-3 group-hover:text-[var(--brand-primary-700)] transition-colors">
        {doc.title || "Untitled"}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
            statusIndicator.cls,
          )}
        >
          {statusIndicator.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {doc.parties?.length > 0
            ? `${doc.parties.length} part${doc.parties.length === 1 ? "y" : "ies"}`
            : "—"}
        </span>
      </div>

      {doc.parties?.length > 0 && (
        <div className="text-[10.5px] text-muted-foreground truncate">
          {doc.parties[0]}
          {doc.parties.length > 1 && ` +${doc.parties.length - 1} more`}
        </div>
      )}
    </Link>
  );
}
