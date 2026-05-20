"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { ProcessingState } from "@/components/ProcessingState";
import { Button } from "@/components/ui/button";
import { BluelyMark } from "@/components/ui/BluelyMark";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Plus, GitBranch, Files, XCircle, AlertCircle, ChevronDown, ChevronUp,
  ArrowRight, ShieldAlert,
} from "@/components/ui/icons";
import { apiDocToProject, getDiff } from "@/lib/api";
import { useDocumentDetail } from "@/lib/use-document";
import type { ApiDiff, ApiDiffChange } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

function impactMeta(score: number): { label: string; bg: string; text: string } {
  if (score >= 70) return { label: "High impact",   bg: "bg-[var(--danger-soft)]",  text: "text-[var(--danger)]" };
  if (score >= 40) return { label: "Medium impact", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" };
  return { label: "Low impact", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" };
}

const FIELD_LABEL: Record<string, string> = {
  title: "Title", body: "Body", category: "Category",
};

export default function AmendmentsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { detail, loading, notFound: isNotFound, error } = useDocumentDetail(id);
  const [diff, setDiff] = useState<ApiDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffMissing, setDiffMissing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!detail || detail.document.status !== "READY") return;
    setDiffLoading(true);
    setDiffMissing(false);
    getDiff(id)
      .then(setDiff)
      .catch(() => setDiffMissing(true))
      .finally(() => setDiffLoading(false));
  }, [id, detail?.document.status]);

  if (loading) return <AmendmentsSkeleton />;

  if (isNotFound) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>Project not found</h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
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
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const isReady = rawStatus === "READY";
  const isAmendment = doc.docType === "AMENDMENT";
  const changes = diff?.changes ?? [];
  const sortedChanges = [...changes].sort((a, b) => b.impactScore - a.impactScore);

  const toggle = (cid: string) =>
    setExpanded((prev) => { const n = new Set(prev); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8 space-y-6">
            {isFailed && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4">
                <XCircle size={18} strokeWidth={1.75} className="text-[var(--danger)] shrink-0 mt-0.5" />
                <p className="text-[13.5px] text-[var(--danger)] leading-relaxed"><span className="font-semibold">Processing failed.</span> Amendment data is unavailable. Delete this document and try uploading again.</p>
              </div>
            )}

            {isProcessing && (
              <ProcessingState status={rawStatus} title="Bluely is analyzing this document" subtitle="Amendment changes appear automatically as each stage completes." />
            )}

            {/* Parent relationship */}
            {isAmendment && doc.parentDocId && (
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-[var(--info)]" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Amendment relationship</span>
                </div>
                <p className="text-[13.5px] text-foreground leading-relaxed">
                  This document is an <Badge variant="neutral" size="sm">AMENDMENT</Badge> to a parent contract.
                </p>
                <div className="mt-3">
                  <Link href={`/projects/${doc.parentDocId}`} className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
                    <GitBranch size={12} /> View parent document <ArrowRight size={11} strokeWidth={2.25} />
                  </Link>
                </div>
              </section>
            )}

            {/* Change impact summary */}
            {isReady && diff && changes.length > 0 && (
              <section className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <BluelyMark size="md" tile pulse />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)] mb-1.5">Bluely · change impact</div>
                    <p className="text-[14px] leading-relaxed text-foreground max-w-[68ch]">{diff.impactSummary || `${changes.length} change(s) detected versus the parent document.`}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Changes list */}
            {isReady && (
              <section>
                {diffLoading ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
                ) : changes.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Clause changes</h2>
                      <span className="text-[11px] font-mono text-muted-foreground">{changes.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {sortedChanges.map((c) => (
                        <ChangeCard key={c.changeId} change={c} isExpanded={expanded.has(c.changeId)} onToggle={() => toggle(c.changeId)} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4"><GitBranch size={20} className="text-muted-foreground" /></div>
                    <h3 className="text-[14px] font-semibold text-foreground mb-1">{diffMissing && !isAmendment ? "No amendments yet" : "No changes detected"}</h3>
                    <p className="text-[12px] text-muted-foreground max-w-sm mb-4">
                      {isAmendment
                        ? "This amendment has no detected clause changes versus its parent, or the parent could not be matched."
                        : "This is an original document. Upload an amendment that references it and Bluely will diff the clauses automatically."}
                    </p>
                    <Button variant="primary" size="md"><Plus size={13} /> Upload amendment</Button>
                  </div>
                )}
              </section>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Document info</div>
              <ul className="space-y-4">
                <InfoRow label="Doc type"><Badge variant="neutral" size="sm">{doc.docType}</Badge></InfoRow>
                <InfoRow label="Lifecycle"><Badge variant="neutral" size="sm" className="capitalize">{doc.lifecycle}</Badge></InfoRow>
                <InfoRow label="Status"><Badge variant={rawStatus === "READY" ? "success" : rawStatus === "FAILED" ? "danger" : "warning"} size="sm" className="font-mono">{rawStatus}</Badge></InfoRow>
                <InfoRow label="Versions"><span className="tabular-nums font-semibold text-foreground">{doc.latestVersion}</span></InfoRow>
                {isReady && diff && <InfoRow label="Changes"><span className="tabular-nums font-semibold text-foreground">{changes.length}</span></InfoRow>}
                {doc.parentDocId && <InfoRow label="Parent"><code className="text-[11px] font-mono text-foreground truncate max-w-[120px] inline-block">{doc.parentDocId.slice(0, 12)}…</code></InfoRow>}
              </ul>
            </div>

            {isReady && changes.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Impact breakdown</div>
                {(() => {
                  const high = changes.filter((c) => c.impactScore >= 70).length;
                  const med = changes.filter((c) => c.impactScore >= 40 && c.impactScore < 70).length;
                  const low = changes.length - high - med;
                  const rows: [string, number, string][] = [
                    ["High impact", high, "bg-[var(--danger)]"],
                    ["Medium impact", med, "bg-[var(--warning)]"],
                    ["Low impact", low, "bg-[var(--success)]"],
                  ];
                  return (
                    <div className="space-y-2.5">
                      {rows.map(([label, n, bar]) => (
                        <div key={label}>
                          <div className="flex items-center justify-between text-[11.5px] mb-1"><span className="text-foreground">{label}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${bar}`} style={{ width: `${changes.length ? (n / changes.length) * 100 : 0}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Draft a new amendment</div>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">Bluely will pre-fill the standard fields and surface any playbook deviations introduced.</p>
              <Button variant="ai" size="sm" className="w-full"><Plus size={12} /> Open draft assistant</Button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── Change card ─── */

function ChangeCard({ change, isExpanded, onToggle }: { change: ApiDiffChange; isExpanded: boolean; onToggle: () => void }) {
  const m = impactMeta(change.impactScore);
  const isAdd = !change.before && change.after;
  const isRemove = change.before && !change.after;
  const verb = isAdd ? "Added" : isRemove ? "Removed" : "Modified";

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs">
      <button onClick={onToggle} className="w-full px-4 py-3.5 flex items-start gap-3 text-left hover:bg-muted/20 transition-colors">
        <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 min-w-[2.5rem] text-right">{change.clauseNumber || "—"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[13px] font-semibold text-foreground">{verb} · {FIELD_LABEL[change.field] ?? change.field}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}>
              {change.impactScore >= 70 && <ShieldAlert size={10} />}{m.label} · {change.impactScore}
            </span>
          </div>
          {change.impactRationale && <p className="text-[12px] text-muted-foreground leading-relaxed">{change.impactRationale}</p>}
        </div>
        <span className="shrink-0 text-muted-foreground mt-0.5">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {isExpanded && (
        <div className="border-t border-border px-4 py-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Before</div>
            <div className="rounded-md bg-[var(--danger-soft)]/40 border border-[var(--danger)]/15 p-2.5 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
              {change.before || <span className="text-muted-foreground italic">— (not present)</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">After</div>
            <div className="rounded-md bg-[var(--success-soft)]/40 border border-[var(--success)]/15 p-2.5 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
              {change.after || <span className="text-muted-foreground italic">— (removed)</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-2"><span className="text-[12.5px] text-muted-foreground">{label}</span><span className="text-right">{children}</span></li>;
}

function AmendmentsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5"><Skeleton className="h-28 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>
          <div className="lg:col-span-4 space-y-5"><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-36 rounded-lg" /></div>
        </div>
      </div>
    </>
  );
}
