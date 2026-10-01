"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LastUpdated } from "@/components/ui/LastUpdated";
import {
  CheckCircle2,
  Clock,
  Files,
  Loader2,
  XCircle,
  GitBranch,
  Database,
  FileText,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument } from "@/lib/queries/documents";
import { formatDate } from "@/lib/format";
import { docTypeShort } from "@/lib/doc-types";
import type { ApiVersion } from "@/lib/types";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type Project = ReturnType<typeof apiDocToProject>;

// Pipeline stages in order
const PIPELINE_STAGES = [
  { key: "PARSING",    label: "Text extraction",   icon: Files },
  { key: "CLASSIFYING",label: "Classification",    icon: FileText },
  { key: "EMBEDDING",  label: "Embeddings",        icon: Database },
  { key: "GRAPHING",   label: "Knowledge graph",   icon: GitBranch },
  { key: "DIFFING",    label: "Diff analysis",     icon: GitBranch },
  { key: "TIMELINING", label: "Timeline build",    icon: Clock },
  { key: "PERSISTING", label: "Persistence",       icon: Database },
  { key: "READY",      label: "Ready",             icon: CheckCircle2 },
] as const;

type StageKey = typeof PIPELINE_STAGES[number]["key"];

const STAGE_ORDER: StageKey[] = [
  "PARSING","CLASSIFYING","EMBEDDING","GRAPHING",
  "DIFFING","TIMELINING","PERSISTING","READY",
];

type StageState = "done" | "active" | "pending" | "unknown" | "no-output";

/**
 * State of one pipeline stage, from the two things the API reports: the
 * document's current status, and which artifacts the latest version produced.
 *  - FAILED: the API does not say which stage failed, so every stage is
 *    "unknown" rather than guessed.
 *  - READY: stages are done — except the diff and timeline stages when the
 *    latest version has no diff / timeline artifact, which read "no output".
 */
function stageStatus(currentStatus: string, stageKey: StageKey, latest: ApiVersion | undefined): StageState {
  if (currentStatus === "FAILED") return "unknown";
  if (currentStatus === "READY") {
    if (stageKey === "DIFFING" && latest && !latest.diffKey) return "no-output";
    if (stageKey === "TIMELINING" && latest && !latest.timelineKey) return "no-output";
    return "done";
  }
  const currentIdx = STAGE_ORDER.indexOf(currentStatus as StageKey);
  const stageIdx = STAGE_ORDER.indexOf(stageKey);
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "active";
  return "pending";
}

const STAGE_STATUS_LABEL: Record<StageState, string> = { done: "Done", active: "Running", pending: "Pending", unknown: "Not reported", "no-output": "No output" };
const STATUS_CHIP = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
} as const;

function versionArtifacts(version: ApiVersion) {
  const items: { label: string; key: string; available: boolean }[] = [
    { label: "Parsed text",     key: "parsedKey",        available: !!version.parsedKey },
    { label: "Classification",  key: "classificationKey",available: !!version.classificationKey },
    { label: "Timeline data",   key: "timelineKey",      available: !!version.timelineKey },
    { label: "Diff report",     key: "diffKey",          available: !!version.diffKey },
  ];
  return items;
}

export default function AuditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: detail, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDocument(id);
  const [query, setQuery] = useState("");
  const [artifactState, setArtifactState] = useState(ALL);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  if (isLoading) return <AuditSkeleton />;

  if (isError && errorStatus(error) === 404) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
          <Files size={24} strokeWidth={1.5} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project not found</h1>
        <p className="mt-2 max-w-sm text-base text-[var(--ink-600)]">
          This engagement may have been archived, or the link is out of date.
        </p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-sm font-semibold transition-colors">
          Back to projects
        </Link>
      </div>
    );
  }

  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;

  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const { document: doc, versions } = detail;
  const rawStatus = doc.status;
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  // Client-side filtering of the version audit log.
  const isComplete = (v: ApiVersion) => versionArtifacts(v).every((a) => a.available);
  const term = query.trim().toLowerCase();
  const shownVersions = sortedVersions
    .filter((v) => (artifactState === ALL || (artifactState === "complete") === isComplete(v))
      && (!term || `v${v.versionNumber} version ${v.versionNumber} ${v.extractionMethod || ""} ${formatDate(v.createdAt)} ${versionArtifacts(v).filter((a) => a.available).map((a) => a.label).join(" ")}`.toLowerCase().includes(term)));
  if (sort === "oldest") shownVersions.reverse();
  const completeCount = sortedVersions.filter(isComplete).length;
  const filterGroups: FilterGroup[] = [
    { id: "artifacts", label: "Artifacts", value: artifactState, onChange: setArtifactState, options: [
      { value: "complete", label: "All generated", count: completeCount },
      { value: "missing", label: "Some missing", count: sortedVersions.length - completeCount },
    ].filter((o) => o.count > 0) },
  ];
  const clearFilters = () => { setQuery(""); setArtifactState(ALL); };
  const statusTone = rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning";

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container space-y-6 py-6 md:space-y-8 md:py-8">

        {/* ── Status (focal) + document integrity ───────────── */}
        <LastUpdated className="justify-end" updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />

        <section className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <div className="flex flex-col rounded-xl bg-[var(--navy)] p-5 text-white md:p-6 lg:col-span-4">
            <h2 className="text-sm font-medium text-[var(--navy-foreground)]">Processing status</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-3xl font-semibold capitalize leading-none tracking-tight">{rawStatus.toLowerCase()}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[statusTone]}`}>
                {statusTone === "success" ? <CheckCircle2 size={12} /> : statusTone === "danger" ? <XCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
                {statusTone === "success" ? "Complete" : statusTone === "danger" ? "Needs attention" : "In progress"}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--navy-border)] pt-4 text-sm lg:mt-auto">
              <div>
                <dt className="text-[var(--navy-foreground)]">Latest version</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">v{doc.latestVersion}</dd>
              </div>
              <div>
                <dt className="text-[var(--navy-foreground)]">Last updated</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(doc.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6 lg:col-span-8">
            <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">Document record</h2>
            <p className="mb-4 text-sm text-[var(--ink-600)]">Identifiers and hashes as stored for this document.</p>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <IntegrityField label="Document ID" value={doc.docId} mono />
              <IntegrityField label="Tenant" value={doc.tenantId} mono />
              <IntegrityField label="Document type" value={docTypeShort(doc.docType)} />
              <IntegrityField label="Lifecycle stage" value={doc.lifecycle} capitalize />
              <IntegrityField label="Created" value={formatDate(doc.createdAt)} />
              {doc.structuralHash && <IntegrityField label="Structural hash" value={doc.structuralHash} mono />}
              {doc.checksum && <IntegrityField label="File checksum" value={doc.checksum} mono />}
            </dl>
          </div>
        </section>

        {/* ── Processing pipeline ───────────────────────────── */}
        <section>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Processing pipeline</h2>
              <p className="mt-0.5 text-sm text-[var(--ink-600)]">
                {rawStatus === "FAILED"
                  ? "Processing failed. The service does not report which stage failed."
                  : "Analysis stages run in order on each document version."}
              </p>
              {rawStatus === "FAILED" && doc.errorMessage && (
                <p role="alert" className="mt-1 break-words font-mono text-xs leading-relaxed text-[var(--danger)]">{doc.errorMessage}</p>
              )}
            </div>
          </div>

          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
            {PIPELINE_STAGES.map((stage) => {
              const status = stageStatus(rawStatus, stage.key, sortedVersions[0]);
              const Icon = stage.icon;
              return (
                <li
                  key={stage.key}
                  className={[
                    "flex items-center gap-3 p-3 md:flex-col md:justify-center md:gap-2 md:p-4 md:text-center",
                    status === "active" ? "bg-[var(--warning-soft)]" :
                    status === "done" ? "bg-card" :
                    "bg-[var(--panel)]",
                  ].join(" ")}
                >
                  <span className={[
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    status === "done" ? "bg-[var(--success)] text-white" :
                    status === "active" ? "bg-[var(--warning)] text-white" :
                    "bg-[var(--ink-100)] text-[var(--ink-600)]",
                  ].join(" ")}>
                    {status === "active" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icon size={16} strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug text-foreground">{stage.label}</span>
                    <span className={[
                      "block text-xs",
                      status === "done" ? "text-[var(--success)]" :
                      status === "active" ? "text-[var(--warning)]" :
                      "text-muted-foreground",
                    ].join(" ")}>{STAGE_STATUS_LABEL[status]}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Version audit ─────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Version audit <span className="ml-1 text-base font-normal text-muted-foreground">{sortedVersions.length} version{sortedVersions.length === 1 ? "" : "s"}</span>
            </h2>
            <p className="mt-0.5 text-sm text-[var(--ink-600)]">
              Each version logs what processing artifacts were generated.
            </p>
          </div>

          {sortedVersions.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]">
                <GitBranch size={20} strokeWidth={1.5} />
              </span>
              <p className="text-base font-semibold text-foreground">No versions yet</p>
              <p className="mt-1 text-sm text-[var(--ink-600)]">Upload a document to start generating version records.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ListFilters
                className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
                search={query}
                onSearch={setQuery}
                placeholder="Search versions"
                groups={filterGroups}
                sort={{ value: sort, onChange: (v) => setSort(v as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
                shown={shownVersions.length}
                total={sortedVersions.length}
                noun="versions"
                onClear={clearFilters}
              />
              {shownVersions.length === 0 && <NoResults noun="versions" onClear={clearFilters} />}
              {shownVersions.map((v) => {
                const artifacts = versionArtifacts(v);
                const isCurrent = v.versionNumber === doc.latestVersion;
                return (
                  <div key={v.versionNumber} className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums text-foreground">
                        v{v.versionNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-foreground">
                            Version {v.versionNumber}
                          </span>
                          {isCurrent && (
                            <Badge variant="success" size="sm" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-[var(--ink-600)]">
                          <span>{v.extractionMethod || "Extraction method not recorded"}</span>
                          <span aria-hidden className="text-[var(--ink-300)]">·</span>
                          <span>
                            {formatDate(v.createdAt)}, {new Date(v.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Artifacts grid */}
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {artifacts.map((a) => (
                        <li
                          key={a.key}
                          className={[
                            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
                            a.available
                              ? "border-transparent bg-[var(--success-soft)] text-foreground"
                              : "border-border bg-[var(--panel)] text-[var(--ink-600)]",
                          ].join(" ")}
                        >
                          {a.available ? (
                            <CheckCircle2 size={14} className="shrink-0 text-[var(--success)]" />
                          ) : (
                            <Clock size={14} className="shrink-0" />
                          )}
                          <span className="min-w-0 flex-1 font-medium">{a.label}</span>
                          <span className="shrink-0 text-xs">{a.available ? "Generated" : "Not generated"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </>
  );
}

function IntegrityField({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={[
          "mt-0.5 break-all text-foreground",
          mono ? "font-mono text-xs" : "text-base font-medium",
          capitalize ? "capitalize" : "",
        ].filter(Boolean).join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container space-y-3 pb-5 pt-4 md:pt-6">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2 sm:w-1/3" />
        </div>
      </div>
      <div className="app-container space-y-6 py-6 md:space-y-8 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <Skeleton className="h-44 rounded-xl lg:col-span-4" />
          <Skeleton className="h-44 rounded-xl lg:col-span-8" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  );
}
