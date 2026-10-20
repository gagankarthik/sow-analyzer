"use client";

import dynamic from "next/dynamic";
import { docTypesFor } from "@/lib/doc-types";
import { useEditionFeature } from "@/lib/govern/queries";
import { docTypeLabel } from "@/lib/doc-types";
import { stageLabel } from "@/lib/govern/labels";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectRecordSkeleton } from "@/components/ProjectRecordSkeleton";
import { PanelSkeleton, SkeletonText } from "@/components/ds/skeletons";
import { DocLoadError } from "@/components/DocLoadError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { ProcessingState } from "@/components/ProcessingState";
import { ContractEvolution } from "@/components/ContractEvolution";
import { KeyDatesCard } from "@/components/dates/KeyDatesCard";
import { ReanalyseNotice } from "@/components/dates/ReanalyseNotice";
import { RiskIntelligence, type CatDatum } from "@/components/charts/RiskIntelligence";
import { ClauseHeatmap } from "@/components/charts/ClauseHeatmap";
import { MotionReveal } from "@/components/MotionReveal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, Files, Loader2, Pencil, RefreshCw,
  Building2, ShieldAlert, AlertTriangle, Info, Sonar,
} from "@/components/ui/icons";
import { ListPanel, Panel, PanelRow } from "@/components/ds/Panel";
import { Path, PathGuidance, RecordLayout, RecordSidebar, type PathStep } from "@/components/ds/Record";
import { apiDocToProject, errorStatus } from "@/lib/api";
// Only projects with several documents use the workspace; single documents never load it.
const ProjectWorkspace = dynamic(() => import("@/components/ProjectWorkspace").then((m) => m.ProjectWorkspace), { loading: () => <ProjectRecordSkeleton section="workspace" /> });
import { isProjectId } from "@/lib/projects-store";
import { useDocument, useClassification, useTimeline, useUpdateDocument, useReprocess } from "@/lib/queries/documents";
import { displayTitle, formatDate } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { buildKeyDateTimeline, canReanalyze, documentKeyDates } from "@/lib/key-dates";
import { can } from "@/lib/projects-store";
import { clauseTypeLabel } from "@/lib/clause-categories";
import type { ApiClause, ApiKeyFinding, DocType, Lifecycle, RiskLevel, FindingSeverity } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "LICENSE", "DPA", "BAA", "COMPLIANCE", "OTHER"];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};

/** The lifecycle as Path stages; renewal and expired follow active. */
const PATH_STAGES: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active"];
const STATUS_LABEL: Record<string, string> = { READY: "Analyzed", FAILED: "Failed" };
const NUMBER = new Intl.NumberFormat("en-US");
const TEXT_LINK =
  "inline-flex items-center gap-1 rounded-sm text-xs font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline underline-offset-2 max-md:min-h-11";

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];
const RISK_META: Record<RiskLevel, { label: string; bg: string; text: string; bar: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", bar: "bg-[var(--danger)]" },
  high: { label: "High", bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", bar: "bg-[var(--warning)]" },
  medium: { label: "Medium", bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-600)]", bar: "bg-[var(--ink-400)]" },
  low: { label: "Low", bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", bar: "bg-[var(--success)]" },
};
const SEVERITY_META: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-[var(--danger-soft)]", text: "text-[var(--danger)]", icon: <ShieldAlert size={12} aria-hidden /> },
  high: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", icon: <AlertTriangle size={12} aria-hidden /> },
  medium: { bg: "bg-[var(--ink-100)]", text: "text-[var(--ink-700)]", icon: <AlertTriangle size={12} aria-hidden /> },
  low: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", icon: <Info size={12} aria-hidden /> },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]", icon: <Info size={12} aria-hidden /> },
};
const SEV_FILL: Record<FindingSeverity, string> = {
  critical: "bg-[var(--danger)]", high: "bg-[var(--warning)]", medium: "bg-[var(--ink-400)]", low: "bg-[var(--success)]", info: "bg-[var(--info)]",
};
const SEV_ORDER: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

export default function ProjectRoutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  // A `proj_…` id is a named project container (multiple uploaded docs);
  // anything else is a single document's analysis workspace.
  if (isProjectId(id)) return <ProjectWorkspace projectId={id} />;
  return <DocumentOverview />;
}

function DocumentOverview() {
  const showSow = useEditionFeature("sowDocuments");
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: detail, isLoading, isError, error, refetch, isFetching } = useDocument(id);
  const isReady = detail?.document.status === "READY";
  const { data: classification, isLoading: classLoading, isError: classError, refetch: refetchClass } = useClassification(id, !!isReady);
  const now = useNow(); // the real clock, re-read every minute
  const { data: timeline } = useTimeline(id, !!isReady);
  const updateMut = useUpdateDocument(id);
  const reprocess = useReprocess();

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  // The title is checked once the field is left or a save is tried.
  const [titleChecked, setTitleChecked] = useState(false);
  const titleError = titleChecked && !editTitle.trim() ? "Give the document a title." : undefined;

  const clauses = useMemo<ApiClause[]>(() => classification?.clauses ?? [], [classification]);
  const storedCounts = detail?.document.riskCounts;
  const riskCounts = useMemo(() => {
    if (storedCounts) return storedCounts;
    // Fallback for documents without stored counts: count the clauses the API
    // actually rated. A clause with no risk level is not counted as "low".
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const cl of clauses) if (cl.riskRated !== false) c[cl.riskLevel]++;
    return c;
  }, [storedCounts, clauses]);
  const topRiskClauses = useMemo(() =>
    [...clauses].sort((a, b) => RISK_RANK[a.riskLevel ?? "low"] - RISK_RANK[b.riskLevel ?? "low"])
      .filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").slice(0, 4),
    [clauses]);
  const catData = useMemo<CatDatum[]>(() => {
    const m: Record<string, { count: number; risk: RiskLevel }> = {};
    for (const c of clauses) {
      const e = (m[c.category] ??= { count: 0, risk: "low" });
      e.count++;
      if (RISK_RANK[c.riskLevel ?? "low"] < RISK_RANK[e.risk]) e.risk = c.riskLevel ?? "low";
    }
    return Object.entries(m).map(([name, v]) => ({ name, count: v.count, risk: v.risk })).sort((a, b) => b.count - a.count);
  }, [clauses]);

  // Key dates from the best source there is (classification, else the document
  // row, else the older date fields), with each date's state as of today.
  const docRow = detail?.document;
  const dateSource = useMemo(() => (docRow ? documentKeyDates(docRow, classification) : null), [docRow, classification]);
  const keyDates = useMemo(() => buildKeyDateTimeline(dateSource?.dates ?? [], now), [dateSource, now]);

  if (isLoading) return <ProjectRecordSkeleton section="overview" />;

  if (isError && errorStatus(error) === 404) {
    return <NotFound />;
  }
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const rawStatus = doc.status;
  const isProcessing = rawStatus !== "READY" && rawStatus !== "FAILED";
  const isFailed = rawStatus === "FAILED";
  const totalRiskClauses = riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;
  const summary = classification?.summary || doc.summary || "";
  const needsReview = riskCounts.critical + riskCounts.high;

  function openEdit() {
    setEditTitle(doc.title || "");
    setEditLifecycle(doc.lifecycle);
    setEditDocType(doc.docType);
    setTitleChecked(false);
    setShowEdit(true);
  }
  async function onReanalyze() {
    try {
      await reprocess.mutateAsync(id);
      toast.success("Re-analyzing", { description: "This document is being analyzed again." });
    } catch (e) {
      toast.error("Couldn't re-analyze", { description: e instanceof Error ? e.message : "Try again." });
    }
  }
  async function handleSave() {
    // The API rejects an empty title: say so under the field instead of saving.
    if (!editTitle.trim()) {
      setTitleChecked(true);
      document.getElementById("edit-doc-title")?.focus();
      return;
    }
    const patch: { title?: string; lifecycle?: string; docType?: string } = {};
    if (editTitle.trim() !== doc.title) patch.title = editTitle.trim();
    if (editLifecycle !== doc.lifecycle) patch.lifecycle = editLifecycle;
    if (editDocType !== doc.docType) patch.docType = editDocType;
    if (Object.keys(patch).length === 0) { setShowEdit(false); return; }
    try {
      await updateMut.mutateAsync(patch);
      toast.success("Document updated");
      setShowEdit(false);
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  // The stages as a Path (UI_SPEC section 8): the lifecycle, with the
  // analysis state as the current step's guidance. It replaces the large
  // failure banner and the "clauses needing review" focal block.
  const stageIndex = PATH_STAGES.indexOf(doc.lifecycle);
  const pathSteps: PathStep[] = [
    ...PATH_STAGES.map((st, i): PathStep => ({
      id: st,
      label: LIFECYCLE_LABEL[st],
      status: stageIndex < 0 || i < stageIndex ? "done" : i === stageIndex ? (isFailed ? "blocked" : "current") : "upcoming",
    })),
    ...(stageIndex < 0 ? [{ id: doc.lifecycle, label: LIFECYCLE_LABEL[doc.lifecycle], status: (isFailed ? "blocked" : "current") as PathStep["status"] }] : []),
  ];
  const reanalyzeButton = canReanalyze(doc.role) ? (
    <Button variant="outline" onClick={onReanalyze} disabled={reprocess.isPending || isProcessing}>
      <RefreshCw size={16} aria-hidden className={reprocess.isPending ? "animate-spin motion-reduce:animate-none" : undefined} />
      {reprocess.isPending ? "Re-analyzing…" : "Re-analyze"}
    </Button>
  ) : null;
  const guidance = isFailed ? (
    <PathGuidance
      title="Processing failed"
      holder={doc.errorMessage ? undefined : "No reason was reported. Re-analyze, or delete the document and upload it again."}
      action={reanalyzeButton}
    >
      {doc.errorMessage && (
        <p role="alert" className="break-all font-mono text-xs leading-relaxed text-[var(--ink-700)]">
          {doc.errorMessage.length > 300 ? doc.errorMessage.slice(0, 300) + "…" : doc.errorMessage}
        </p>
      )}
    </PathGuidance>
  ) : isProcessing ? (
    <PathGuidance title="Analysis in progress" holder="Sonar is reading the document" />
  ) : needsReview > 0 ? (
    <PathGuidance
      title={`Review ${NUMBER.format(needsReview)} high or critical ${needsReview === 1 ? "clause" : "clauses"}`}
      holder={`${NUMBER.format(totalRiskClauses)} clauses rated`}
      fields={RISK_LEVELS.map((r) => ({ label: RISK_META[r].label, value: NUMBER.format(riskCounts[r]) }))}
      action={
        <Button asChild>
          <Link href={`/projects/${project.id}/sow`}>Review clauses<ArrowRight size={16} aria-hidden /></Link>
        </Button>
      }
    />
  ) : (
    <PathGuidance title={LIFECYCLE_LABEL[doc.lifecycle]} holder={isReady ? "No high or critical clauses" : undefined} />
  );

  const sidebar = (
    <RecordSidebar
      label="Document details"
      tabs={[
        {
          id: "details",
          label: "Details",
          content: (
            <div className="flex flex-col gap-4">
              <dl className="divide-y divide-[var(--ink-100)]">
                <DetailItem label="Type"><DocTypeBadge type={doc.docType} /></DetailItem>
                <DetailItem label="Stage"><span className="text-sm text-foreground">{stageLabel(doc.lifecycle)}</span></DetailItem>
                <DetailItem label="Status"><span className="text-sm text-foreground">{STATUS_LABEL[rawStatus] ?? rawStatus}</span></DetailItem>
                {doc.effectiveDate && <DetailItem label="Effective"><span className="text-sm text-foreground">{formatDate(doc.effectiveDate)}</span></DetailItem>}
                <DetailItem label="Versions"><span className="text-sm tabular-nums text-foreground">{NUMBER.format(doc.latestVersion)}</span></DetailItem>
                {isReady && <DetailItem label="Clauses rated"><span className="text-sm tabular-nums text-foreground">{NUMBER.format(totalRiskClauses)}</span></DetailItem>}
              </dl>
              {/* Owners and editors only; the API enforces it either way. */}
              {(can(doc.role, "edit") || reanalyzeButton) && (
                <div className="flex flex-wrap items-center gap-2">
                  {can(doc.role, "edit") && (
                    <Button variant="outline" onClick={openEdit}><Pencil size={16} aria-hidden />Edit details</Button>
                  )}
                  {!isFailed && reanalyzeButton}
                </div>
              )}
            </div>
          ),
        },
        {
          id: "related",
          label: "Related",
          count: doc.parties.length + (doc.parentDocId ? 1 : 0),
          content: (
            <div className="flex flex-col gap-4">
              {doc.parentDocId && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">Parent agreement</p>
                  <Link href={`/projects/${doc.parentDocId}`} className="w-fit truncate font-mono text-xs text-[var(--brand-primary-600)] hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">
                    {doc.parentDocId.slice(0, 12)}…
                  </Link>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Parties</p>
                {doc.parties.length === 0 ? (
                  <p className="text-sm text-[var(--ink-600)]">No parties identified in this document.</p>
                ) : (
                  <ul className="divide-y divide-[var(--ink-100)]">
                    {doc.parties.map((party, i) => (
                      <li key={i} className="flex min-w-0 items-center gap-2 py-2 first:pt-0 last:pb-0">
                        <Building2 size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
                        <span className="min-w-0 break-words text-sm text-foreground">{party}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ),
        },
        {
          id: "files",
          label: "Files",
          content: (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground">
                <span className="tabular-nums">{NUMBER.format(doc.latestVersion)}</span> {doc.latestVersion === 1 ? "version" : "versions"}
              </p>
              <Button variant="outline" asChild className="w-fit">
                <Link href={`/projects/${project.id}/documents`}><Files size={16} aria-hidden />Versions and files</Link>
              </Button>
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container flex flex-col gap-6 py-5 md:py-6">
        <Path label="Document stages" steps={pathSteps}>{guidance}</Path>

        <RecordLayout
          sidebar={sidebar}
          main={
            <>
              {isProcessing && <ProcessingState status={rawStatus} />}

              {/* Sonar summary */}
              <Panel
                as="h2"
                title={<span className="inline-flex items-center gap-2"><Sonar size={16} aria-hidden className="text-[var(--ai-ink)]" />Sonar summary</span>}
                actions={
                  <Link href={`/projects/${project.id}/sow`} className={TEXT_LINK}>
                    All clauses<ArrowRight size={12} aria-hidden />
                  </Link>
                }
              >
                {!isReady ? (
                  <p className="text-sm text-[var(--ink-600)]">The summary appears once processing completes.</p>
                ) : summary ? (
                  <p className="max-w-[72ch] text-sm leading-relaxed text-foreground">{summary}</p>
                ) : !classification && classError ? (
                  <p className="text-sm text-[var(--ink-600)]">
                    The analysis for this document couldn&apos;t be loaded.{" "}
                    <button type="button" onClick={() => refetchClass()} className="font-semibold text-[var(--brand-primary-600)] underline-offset-2 hover:underline">Try again</button>
                  </p>
                ) : !classification ? (
                  <SkeletonText lines={2} label="the summary" />
                ) : (
                  <p className="text-sm text-[var(--ink-600)]">No summary was extracted. Open the clause analysis for the full breakdown.</p>
                )}
              </Panel>

              {/* Risk intelligence (visual) */}
              {isReady && totalRiskClauses > 0 && (
                <MotionReveal><RiskIntelligence counts={riskCounts} /></MotionReveal>
              )}

              {/* Clauses that need attention: one flat list */}
              {isReady && topRiskClauses.length > 0 && (
                <ListPanel
                  as="h2"
                  title="Clauses that need attention"
                  meta={NUMBER.format(topRiskClauses.length)}
                  actions={<Link href={`/projects/${project.id}/sow`} className={TEXT_LINK}>View all<ArrowRight size={12} aria-hidden /></Link>}
                >
                  <ul>
                    {topRiskClauses.map((c) => {
                      const m = RISK_META[c.riskLevel ?? "low"];
                      return (
                        <PanelRow key={c.number} className="flex items-start gap-3">
                          <span className="mt-0.5 min-w-[2rem] shrink-0 font-mono text-xs text-muted-foreground">{c.number}</span>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="min-w-0 break-words text-sm font-medium text-foreground">{displayTitle(c.title) || c.number}</span>
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.text}`}>
                                {c.riskLevel === "critical" ? <ShieldAlert size={12} aria-hidden /> : <AlertTriangle size={12} aria-hidden />}
                                {m.label} risk
                              </span>
                              <span className="text-xs text-[var(--ink-600)]">{clauseTypeLabel(c)}</span>
                            </div>
                            {c.summary && <p className="text-sm leading-relaxed text-[var(--ink-600)]">{c.summary}</p>}
                          </div>
                        </PanelRow>
                      );
                    })}
                  </ul>
                </ListPanel>
              )}

              {/* Key findings: a flat list, most severe first */}
              {isReady && classification && classification.keyFindings.length > 0 && (
                <ListPanel as="h2" title="Key findings" meta={NUMBER.format(classification.keyFindings.length)}>
                  <div className="border-b border-border px-4 py-3">
                    <FindingsStrip findings={classification.keyFindings} />
                  </div>
                  <ul>
                    {[...classification.keyFindings].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((f, i) => {
                      const s = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
                      return (
                        <PanelRow key={i} className="flex items-start gap-3">
                          <span className={`mt-0.5 shrink-0 ${s.text}`}>{s.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                              <span className="min-w-0 break-words font-medium text-foreground">{f.label}</span>
                              <span className={`text-xs font-medium capitalize ${s.text}`}>{f.severity}</span>
                            </p>
                            <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{f.detail}</p>
                          </div>
                        </PanelRow>
                      );
                    })}
                  </ul>
                </ListPanel>
              )}

              {/* Risk by category: heatmap */}
              {isReady && clauses.length > 0 && (
                <MotionReveal delay={0.05}>
                  <Panel as="h2" title="Risk by category">
                    {/* Rated clauses only (an unrated clause is not "low"), and every
                        category listed: no row cap, so none is silently dropped. */}
                    <ClauseHeatmap clauses={clauses.filter((c) => c.riskRated !== false)} maxRows={Math.max(1, catData.length)} />
                  </Panel>
                </MotionReveal>
              )}

              {/* Key dates: current, next and most recent */}
              {isReady && dateSource && (classLoading ? (
                <PanelSkeleton title="Key dates" rows={3} label="key dates" />
              ) : (
                <>
                  {!dateSource.extracted && !(classError && !classification) && (
                    <ReanalyseNotice docId={id} role={doc.role} busy={isProcessing} title="Analyzed before full date extraction">
                      {dateSource.source === "legacy"
                        ? "These dates come from the earlier analysis. Re-analyze to extract every date, deadline and payment."
                        : "The earlier analysis recorded no dates. Re-analyze to extract them."}
                    </ReanalyseNotice>
                  )}
                  <KeyDatesCard docId={id} source={dateSource} timeline={keyDates} />
                </>
              ))}

              {/* Contract evolution */}
              {isReady && timeline && (Object.keys(timeline.currentState).length > 0 || Object.keys(timeline.initialState).length > 0) && (
                <ContractEvolution timeline={timeline} />
              )}
            </>
          }
        />
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Edit document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label htmlFor="edit-doc-title" className="text-sm font-medium text-foreground">Title</label><Input id="edit-doc-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => setTitleChecked(true)} placeholder="Document title" className="h-10 text-base md:h-9"
              aria-invalid={titleError ? true : undefined} aria-describedby={titleError ? "edit-doc-title-error" : undefined} />
              {titleError && <p id="edit-doc-title-error" role="alert" className="text-xs text-[var(--danger)]">{titleError}</p>}
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{docTypesFor(DOC_TYPES, showSow).map((t) => <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><p className="text-sm font-medium text-foreground">Stage</p>
              <p className="text-sm text-foreground">{LIFECYCLE_LABEL[editLifecycle]}</p>
              <p className="text-xs text-[var(--ink-600)]">Moves on its own as people review, approve and sign the agreement in Govern.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setShowEdit(false)} disabled={updateMut.isPending}>Cancel</Button>
            <Button size="lg" className="md:h-9" onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending && <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── building blocks ─────────────────────────────────────── */

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 text-right">{children}</dd></div>;
}

function sevRank(s: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

function FindingsStrip({ findings }: { findings: ApiKeyFinding[] }) {
  const total = findings.length;
  const counts = SEV_ORDER.map((sev) => ({ sev, n: findings.filter((f) => f.severity === sev).length })).filter((x) => x.n > 0);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-2 md:max-w-md">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {counts.map(({ sev, n }) => <div key={sev} className={SEV_FILL[sev]} style={{ width: `${(n / total) * 100}%` }} />)}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {counts.map(({ sev, n }) => (
            <span key={sev} className="inline-flex items-center gap-1.5 text-xs capitalize text-[var(--ink-600)]">
              <span aria-hidden className={`h-2 w-2 rounded-full ${SEV_FILL[sev]}`} />{sev} <span className="font-semibold tabular-nums text-foreground">{n}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} aria-hidden /></span>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Document not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">It may have been deleted, or the link is out of date.</p>
      <Button asChild className="mt-6"><Link href="/projects">Back to projects</Link></Button>
    </div>
  );
}
