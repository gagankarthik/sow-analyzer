"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlueyMark } from "@/components/ui/BlueyMark";
import {
  Upload, GitBranch, CheckCircle2, CalendarClock, Files, Layers, Clock,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useTimeline } from "@/lib/queries/documents";
import { formatDate, formatRelativeDays } from "@/lib/format";

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
};

const BADGE = {
  created: { label: "Created", bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]" },
  version: { label: "Version", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
  amendment: { label: "Amendment", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
  current: { label: "Now", bg: "bg-[var(--brand-primary-50)]", text: "text-[var(--brand-primary-700)]" },
  forecast: { label: "Forecast", bg: "bg-[var(--ai-surface)]", text: "text-[var(--ai-ink)]" },
};

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: timeline } = useTimeline(id, !!isReady);

  const events = useMemo<Ev[]>(() => {
    if (!detail) return [];
    const out: Ev[] = [];
    const doc = detail.document;

    out.push({
      id: "created", date: doc.createdAt, state: "done",
      icon: <Upload size={12} />, badge: BADGE.created,
      title: "Document created", meta: doc.docType,
    });

    const versions = [...detail.versions].sort((a, b) => a.versionNumber - b.versionNumber);
    for (const v of versions) {
      const tags: string[] = [];
      if (v.diffKey) tags.push("diff");
      if (v.timelineKey) tags.push("timeline");
      out.push({
        id: `v-${v.versionNumber}`, date: v.createdAt, state: "done",
        icon: <Layers size={12} />, badge: BADGE.version,
        title: `Version ${v.versionNumber} processed`,
        body: `Extraction: ${v.extractionMethod || "—"}${tags.length ? ` · ${tags.join(" · ")}` : ""}`,
      });
    }

    // Amendment chain (from the timeline replay), chronological.
    const chain = [...(timeline?.amendmentChain ?? [])].sort((a, b) => (a.effectiveDate ?? "").localeCompare(b.effectiveDate ?? ""));
    for (const amd of chain) {
      const active = (amd.lifecycle ?? "").toLowerCase() === "active";
      out.push({
        id: `amd-${amd.docId}`, date: amd.effectiveDate ?? undefined,
        state: active ? "done" : "pending",
        icon: <GitBranch size={12} />, badge: BADGE.amendment,
        title: amd.title || `${amd.docType ?? "Amendment"}`,
        meta: amd.lifecycle ?? undefined,
      });
    }

    if (timeline) {
      const currentCount = Object.keys(timeline.currentState ?? {}).length;
      out.push({
        id: "current", state: "active", icon: <CheckCircle2 size={12} />, badge: BADGE.current,
        title: "Current state", body: `${currentCount} clause${currentCount === 1 ? "" : "s"} in force`,
      });
      if (timeline.futureState && Object.keys(timeline.futureState).length > 0) {
        const futureCount = Object.keys(timeline.futureState).length;
        out.push({
          id: "forecast", state: "forecast", icon: <CalendarClock size={12} />, badge: BADGE.forecast,
          title: "Expected after pending amendments", body: `${futureCount} clause${futureCount === 1 ? "" : "s"} projected`,
        });
      }
    }
    return out;
  }, [detail, timeline]);

  if (isLoading) return <TimelineSkeleton />;
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
  const isProcessing = detail.document.status !== "READY" && detail.document.status !== "FAILED";

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        {isProcessing && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-5 py-4">
            <Clock size={18} strokeWidth={1.75} className="text-[var(--warning)] shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[13.5px] text-foreground leading-relaxed"><span className="font-semibold">This document is still processing.</span> More timeline events appear as the pipeline completes.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Contract timeline</h2>
              <span className="text-[11px] font-mono text-muted-foreground">{events.length} event{events.length === 1 ? "" : "s"}</span>
            </div>

            <ol className="relative">
              {events.map((e, i) => (
                <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < events.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
                  <Node state={e.state} icon={e.icon} />
                  <div className="flex-1 min-w-0 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full ${e.badge.bg} ${e.badge.text}`}>{e.badge.label}</span>
                      {e.meta && <span className="text-[11px] font-mono text-muted-foreground capitalize">{e.meta}</span>}
                      <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0" title={e.date ? formatDate(e.date) : undefined}>
                        {e.state === "active" ? "now" : e.state === "forecast" ? "projected" : e.date ? formatRelativeDays(e.date) : "—"}
                      </span>
                    </div>
                    <p className="text-[13.5px] font-medium text-foreground">{e.title}</p>
                    {e.body && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{e.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </main>

          <aside className="lg:col-span-4 space-y-5">
            <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/60 p-5">
              <div className="flex items-center gap-2 mb-3"><BlueyMark size="sm" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">Bluey · activity read</span></div>
              <p className="text-[12.5px] leading-relaxed text-foreground">Ask Bluey to summarize how this contract has evolved and flag the inflection points that changed its risk.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">At a glance</div>
              <ul className="space-y-2.5 text-[12.5px]">
                <Row label="Versions"><span className="tabular-nums font-semibold text-foreground">{detail.versions.length}</span></Row>
                {timeline && <Row label="Clauses now"><span className="tabular-nums font-semibold text-foreground">{Object.keys(timeline.currentState ?? {}).length}</span></Row>}
                {timeline && timeline.amendmentChain.length > 0 && <Row label="Amendments"><span className="tabular-nums font-semibold text-foreground">{timeline.amendmentChain.length}</span></Row>}
                <Row label="Created"><span className="font-mono text-[11.5px] text-foreground">{formatDate(detail.document.createdAt)}</span></Row>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Node({ state, icon }: { state: DotState; icon: React.ReactNode }) {
  if (state === "active") {
    return (
      <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white ring-4 ring-[var(--brand-primary-100)]">{icon}</span>
    );
  }
  if (state === "forecast") {
    return <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--ai-ink)] text-[var(--ai-ink)] bg-card">{icon}</span>;
  }
  if (state === "pending") {
    return <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--warning)] text-[var(--warning)] bg-card">{icon}</span>;
  }
  return <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">{icon}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{label}</span>{children}</li>;
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>Project not found</h1>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card"><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8"><div className="grid grid-cols-1 lg:grid-cols-12 gap-6"><div className="lg:col-span-8 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div><div className="lg:col-span-4 space-y-5"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div></div></div>
    </>
  );
}
