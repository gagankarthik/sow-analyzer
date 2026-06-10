"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { SonarMark } from "@/components/ui/SonarMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  Files,
  Loader2,
  XCircle,
  GitBranch,
  Database,
  Zap,
  ShieldCheck,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument } from "@/lib/queries/documents";
import { formatDate } from "@/lib/format";
import { docTypeShort } from "@/lib/doc-types";
import type { ApiVersion } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

// Pipeline stages in order
const PIPELINE_STAGES = [
  { key: "PARSING",    label: "Text extraction",   icon: Files },
  { key: "CLASSIFYING",label: "Classification",    icon: Zap },
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

function stageStatus(currentStatus: string, stageKey: StageKey): "done" | "active" | "pending" | "failed" {
  if (currentStatus === "FAILED") {
    const currentIdx = STAGE_ORDER.indexOf(currentStatus as StageKey);
    const stageIdx = STAGE_ORDER.indexOf(stageKey);
    if (stageIdx < currentIdx) return "done";
    if (stageIdx === currentIdx) return "failed";
    return "pending";
  }
  if (currentStatus === "READY") return "done";
  const currentIdx = STAGE_ORDER.indexOf(currentStatus as StageKey);
  const stageIdx = STAGE_ORDER.indexOf(stageKey);
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "active";
  return "pending";
}

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
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);

  if (isLoading) return <AuditSkeleton />;

  if (isError && errorStatus(error) === 404) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
          <Files size={24} strokeWidth={1.5} />
        </span>
        <h1 className="text-foreground text-[28px] font-bold tracking-tight">Project not found</h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
          This engagement may have been archived, or the link is out of date.
        </p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">
          Back to projects
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">
          {error instanceof Error ? error.message : "Failed to load document"}
        </p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const { document: doc, versions } = detail;
  const rawStatus = doc.status;
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8 space-y-8">

        {/* ── Document integrity ────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <IntegrityCard label="Document ID" value={doc.docId} mono />
          <IntegrityCard label="Tenant" value={doc.tenantId} mono />
          <IntegrityCard
            label="Processing status"
            value={rawStatus}
            tone={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"}
          />
          <IntegrityCard label="Document type" value={docTypeShort(doc.docType)} />
          <IntegrityCard label="Lifecycle stage" value={doc.lifecycle} />
          <IntegrityCard label="Latest version" value={`v${doc.latestVersion}`} />
          <IntegrityCard label="Created" value={formatDate(doc.createdAt)} />
          <IntegrityCard label="Last updated" value={formatDate(doc.updatedAt)} />
          {doc.structuralHash && (
            <IntegrityCard label="Structural hash" value={doc.structuralHash} mono truncate />
          )}
        </section>

        {/* ── Processing pipeline ───────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground tracking-tight">Processing pipeline</h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                AI pipeline stages run sequentially on each document version.
              </p>
            </div>
            <Badge
              variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"}
              dot
            >
              {rawStatus.toLowerCase()}
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="grid grid-cols-4 md:grid-cols-8">
              {PIPELINE_STAGES.map((stage, i) => {
                const status = stageStatus(rawStatus, stage.key);
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.key}
                    className={[
                      "flex flex-col items-center justify-center gap-2 p-4 border-r border-b md:border-b-0 border-border last:border-r-0",
                      status === "done" ? "bg-[var(--success-soft)]/30" :
                      status === "active" ? "bg-[var(--warning-soft)]/40" :
                      status === "failed" ? "bg-[var(--danger-soft)]/40" :
                      "bg-muted/20",
                    ].join(" ")}
                  >
                    <span className={[
                      "inline-flex h-9 w-9 items-center justify-center rounded-full",
                      status === "done" ? "bg-[var(--success)] text-white" :
                      status === "active" ? "bg-[var(--warning)] text-white" :
                      status === "failed" ? "bg-[var(--danger)] text-white" :
                      "bg-muted text-muted-foreground",
                    ].join(" ")}>
                      {status === "active" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : status === "failed" ? (
                        <XCircle size={16} />
                      ) : (
                        <Icon size={16} strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-center leading-tight text-muted-foreground">
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Version audit ─────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
              Version audit · {sortedVersions.length} version{sortedVersions.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Each version logs what processing artifacts were generated.
            </p>
          </div>

          {sortedVersions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <GitBranch size={20} strokeWidth={1.5} />
              </span>
              <p className="text-[13px] font-semibold text-foreground">No versions yet</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">Upload a document to start generating version records.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedVersions.map((v) => {
                const artifacts = versionArtifacts(v);
                const isCurrent = v.versionNumber === doc.latestVersion;
                return (
                  <div key={v.versionNumber} className="rounded-xl border border-border bg-card shadow-xs p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground font-semibold text-[13px] shrink-0">
                          v{v.versionNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-foreground">
                              Version {v.versionNumber}
                            </span>
                            {isCurrent && (
                              <Badge variant="success" size="sm">current</Badge>
                            )}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">
                            <span className="font-mono">{v.extractionMethod || "standard"}</span>
                            {" · "}
                            {formatDate(v.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-mono text-muted-foreground">
                        {new Date(v.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Artifacts grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {artifacts.map((a) => (
                        <div
                          key={a.key}
                          className={[
                            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]",
                            a.available
                              ? "bg-[var(--success-soft)]/40 text-foreground"
                              : "bg-muted/40 text-muted-foreground",
                          ].join(" ")}
                        >
                          {a.available ? (
                            <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />
                          ) : (
                            <Clock size={12} className="shrink-0 opacity-40" />
                          )}
                          <span className="font-medium truncate">{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Sonar compliance read ────────────────────────── */}
        <section className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <SonarMark size="lg" tile pulse />
            <div className="flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1">
                Sonar · audit assistant
              </p>
              <p className="text-[14px] leading-relaxed text-foreground">
                Ask Sonar to run a compliance check on this document — identify missing clauses,
                flag deviations from your playbook, or summarise version-to-version changes.
              </p>
            </div>
            <Button variant="ai" size="md" className="shrink-0 self-start sm:self-center gap-1.5 pl-2">
              <SonarMark size="sm" />
              Run audit
            </Button>
          </div>
        </section>

        {/* ── Security & integrity ──────────────────────────── */}
        <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldCheck size={16} strokeWidth={1.75} className="text-[var(--success)]" />
            <h3 className="text-[14px] font-semibold text-foreground">Security &amp; integrity</h3>
          </div>
          <ul className="space-y-3 text-[13px]">
            <SecurityRow label="Storage encryption" value="AES-256 at rest" ok />
            <SecurityRow label="Transport encryption" value="TLS 1.3 in transit" ok />
            <SecurityRow label="Tenant isolation" value={`Tenant: ${doc.tenantId}`} ok />
            <SecurityRow label="Versioned backups" value={`${sortedVersions.length} version${sortedVersions.length === 1 ? "" : "s"} retained`} ok />
            {doc.checksum && (
              <SecurityRow label="Document checksum" value={doc.checksum} ok mono />
            )}
          </ul>
        </section>

      </div>
    </>
  );
}

function IntegrityCard({
  label,
  value,
  mono,
  truncate,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </div>
      <div
        className={[
          "text-[13px] font-semibold",
          mono ? "font-mono text-[11.5px]" : "",
          truncate ? "truncate" : "",
          tone === "success" ? "text-[var(--success)]" :
          tone === "warning" ? "text-[var(--warning)]" :
          tone === "danger" ? "text-[var(--danger)]" :
          "text-foreground",
        ].filter(Boolean).join(" ")}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function SecurityRow({
  label,
  value,
  ok,
  mono,
}: {
  label: string;
  value: string;
  ok?: boolean;
  mono?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok && <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />}
        <span className={["font-medium text-foreground", mono ? "font-mono text-[11.5px]" : ""].filter(Boolean).join(" ")}>
          {value}
        </span>
      </div>
    </li>
  );
}

function AuditSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-5 gap-6 pt-4 border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="app-container">
          <div className="flex items-center gap-6 h-9">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}
          </div>
        </div>
      </div>
      <div className="app-container py-6 md:py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  );
}
