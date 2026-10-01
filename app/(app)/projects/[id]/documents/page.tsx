"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/ProjectHeader";
import { DocLoadError } from "@/components/DocLoadError";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LastUpdated } from "@/components/ui/LastUpdated";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2, Clock, FileText, Layers, Loader2, Files, Upload,
  MoreHorizontal, CheckCircle2, Building2, XCircle,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useDeleteVersion, useDeleteDocument } from "@/lib/queries/documents";
import { can } from "@/lib/projects-store";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import type { ApiVersion } from "@/lib/types";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type Project = ReturnType<typeof apiDocToProject>;

function methodLabel(m: string): string {
  return m ? m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Not recorded";
}

/** What the API records for a version: its analysis artifacts. A version with a
 *  classification artifact was analysed; the current version follows the
 *  document's live status. Nothing is assumed "Processed". */
function versionState(v: ApiVersion, isCurrent: boolean, docStatus: string): { label: string; tone: "ok" | "busy" | "bad" | "none" } {
  if (isCurrent && docStatus === "FAILED") return { label: "Failed", tone: "bad" };
  if (isCurrent && docStatus !== "READY") return { label: "Processing", tone: "busy" };
  return v.classificationKey ? { label: "Analysed", tone: "ok" } : { label: "No analysis", tone: "none" };
}

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDocument(id);
  const deleteVersionMut = useDeleteVersion(id);
  const deleteDocMut = useDeleteDocument();

  const [versionTarget, setVersionTarget] = useState<number | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(false);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState(ALL);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  if (isLoading) return <DocumentsSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  // Only when there is nothing to show: a failed background refresh keeps the
  // last good data on screen instead of replacing the page with an error.
  if (isError && !detail) return <DocLoadError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const canDelete = can(doc.role, "delete_document");
  const versions = [...detail.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const current = versions[0];
  const latestVersion = current?.versionNumber ?? 0;
  // The API stores one upload key per document (the current file); earlier
  // versions' file names are not recorded, so they are not shown as if they were.
  const filename = doc.rawKey ? doc.rawKey.split("/").pop() || null : null;
  const isLastVersion = versions.length <= 1;

  // Client-side filtering of the version list.
  const term = query.trim().toLowerCase();
  const methods = Array.from(new Set(versions.map((v) => v.extractionMethod).filter(Boolean)));
  const shownVersions = versions
    .filter((v) => (method === ALL || v.extractionMethod === method)
      && (!term || `v${v.versionNumber} version ${v.versionNumber} ${methodLabel(v.extractionMethod)} ${formatDate(v.createdAt)}`.toLowerCase().includes(term)))
    .sort((a, b) => (sort === "oldest" ? a.versionNumber - b.versionNumber : b.versionNumber - a.versionNumber));
  const filterGroups: FilterGroup[] = [
    { id: "method", label: "Extraction", value: method, onChange: setMethod, options: methods.map((m) => ({ value: m, label: methodLabel(m), count: versions.filter((v) => v.extractionMethod === m).length })) },
  ];
  const clearFilters = () => { setQuery(""); setMethod(ALL); };

  async function confirmVersionDelete() {
    if (versionTarget == null) return;
    try {
      if (isLastVersion) {
        await deleteDocMut.mutateAsync(id);
        toast.success("Document deleted");
        router.push("/projects");
        return;
      }
      await deleteVersionMut.mutateAsync(versionTarget);
      toast.success(`Version ${versionTarget} deleted`);
      setVersionTarget(null);
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }

  async function handleDeleteDoc() {
    try {
      await deleteDocMut.mutateAsync(id);
      toast.success("Document deleted");
      router.push("/projects");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
      setConfirmDeleteDoc(false);
    }
  }

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <main className="min-w-0 space-y-4 md:space-y-6 lg:col-span-8">
            {/* Toolbar */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Versions <span className="ml-1 text-base font-normal tabular-nums text-muted-foreground">{versions.length}</span></h2>
                <p className="mt-1 text-sm text-[var(--ink-600)]">Every version of this document on record.</p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />
                <Button size="lg" className="flex-1 sm:flex-none md:h-9" asChild><Link href="/projects/upload"><Upload size={14} />Upload new</Link></Button>
                {/* Deleting needs the delete permission; the server enforces it too. */}
                {canDelete && (
                  <Button variant="outline" size="lg" className="flex-1 border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] sm:flex-none md:h-9" onClick={() => setConfirmDeleteDoc(true)}>
                    <Trash2 size={14} />Delete document
                  </Button>
                )}
              </div>
            </div>

            {/* Focal block: the version in force */}
            {current && (
              <section aria-label="Current version" className="rounded-xl bg-[var(--navy)] p-5 text-white md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[var(--navy-foreground)]">Current version</h3>
                    <div className="mt-1 text-4xl font-bold leading-none tabular-nums tracking-tight">v{current.versionNumber}</div>
                    <p className="mt-2 flex items-start gap-1.5 text-base text-white"><FileText size={15} className="mt-0.5 shrink-0 text-[var(--navy-foreground)]" /><span className="min-w-0 break-all">{filename ?? "File name not recorded"}</span></p>
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <div>
                      <dt className="text-[var(--navy-foreground)]">Uploaded</dt>
                      <dd className="mt-0.5 font-semibold" title={formatDate(current.createdAt)}>{formatRelativeDays(current.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--navy-foreground)]">Extraction</dt>
                      <dd className="mt-0.5 font-semibold">{methodLabel(current.extractionMethod)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            )}

            {versions.length > 0 && (
              <ListFilters
                className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
                search={query}
                onSearch={setQuery}
                placeholder="Search versions"
                groups={filterGroups}
                sort={{ value: sort, onChange: (v) => setSort(v as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
                shown={shownVersions.length}
                total={versions.length}
                noun="versions"
                onClear={clearFilters}
              />
            )}

            {/* Versions table */}
            {versions.length === 0 ? (
              <EmptyState />
            ) : shownVersions.length === 0 ? (
              <NoResults noun="versions" onClear={clearFilters} />
            ) : (
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px]">
                    <thead>
                      <tr className="border-b border-border bg-[var(--panel)] text-xs font-semibold text-[var(--ink-600)]">
                        <th scope="col" className="px-3 py-2.5 text-left md:px-4">Version</th>
                        <th scope="col" className="hidden px-4 py-2.5 text-left md:table-cell">Filename</th>
                        <th scope="col" className="hidden px-4 py-2.5 text-left sm:table-cell">Status</th>
                        <th scope="col" className="hidden px-4 py-2.5 text-left lg:table-cell">Extraction</th>
                        <th scope="col" className="px-3 py-2.5 text-left md:px-4">Uploaded</th>
                        <th scope="col" className="w-14 px-2 py-2.5"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownVersions.map((v) => (
                        <VersionRow
                          key={v.versionNumber}
                          v={v}
                          filename={v.versionNumber === latestVersion ? filename : null}
                          docStatus={doc.status}
                          isCurrent={v.versionNumber === latestVersion}
                          onDelete={canDelete ? () => setVersionTarget(v.versionNumber) : undefined}
                          sowHref={`/projects/${id}/sow`}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Upload zone */}
            <Link href="/projects/new" className="block rounded-xl border-2 border-dashed border-[var(--ink-300)] bg-card p-6 text-center transition-colors hover:border-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-8">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><Upload size={18} strokeWidth={1.75} /></span>
              <h3 className="text-base font-semibold text-foreground">Upload a new version</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-[var(--ink-600)]">Add an updated document to your workspace.</p>
            </Link>
          </main>

          {/* Sidebar */}
          <aside className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 md:gap-6 lg:col-span-4 lg:grid-cols-1">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
              <h3 className="mb-3 text-base font-semibold text-foreground">Document info</h3>
              <ul className="divide-y divide-[var(--ink-100)] text-sm">
                <Row label="Type"><DocTypeBadge type={doc.docType} /></Row>
                <Row label="Lifecycle"><span className="font-semibold text-foreground capitalize">{doc.lifecycle}</span></Row>
                <Row label="Status"><Badge variant={doc.status === "READY" ? "success" : doc.status === "FAILED" ? "danger" : "warning"} size="sm" className="text-xs">{doc.status}</Badge></Row>
                <Row label="Versions"><span className="font-semibold text-foreground tabular-nums">{versions.length}</span></Row>
                {doc.effectiveDate && <Row label="Effective"><span className="font-semibold text-foreground">{formatDate(doc.effectiveDate)}</span></Row>}
              </ul>
            </div>

            {doc.parties.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
                <h3 className="mb-3 text-base font-semibold text-foreground">Parties</h3>
                <ul className="space-y-2.5">
                  {doc.parties.map((p) => (
                    <li key={p} className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"><Building2 size={15} strokeWidth={1.75} /></span>
                      <span className="min-w-0 break-words text-sm font-medium text-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Delete version / last-version confirm */}
      <AlertDialog open={versionTarget != null} onOpenChange={(o) => !o && setVersionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isLastVersion ? "Delete the only version?" : `Delete version ${versionTarget}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {isLastVersion
                ? "This is the only version. Deleting it removes the entire document, including all clauses and analytics. This cannot be undone."
                : `Version ${versionTarget} will be permanently deleted and the document will roll back to the previous version. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVersionMut.isPending || deleteDocMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVersionDelete} disabled={deleteVersionMut.isPending || deleteDocMut.isPending} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white">
              {(deleteVersionMut.isPending || deleteDocMut.isPending) ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : isLastVersion ? "Delete document" : "Delete version"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete whole document */}
      <AlertDialog open={confirmDeleteDoc} onOpenChange={(o) => !o && setConfirmDeleteDoc(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription><strong>{doc.title || "This document"}</strong> and all {versions.length} version{versions.length === 1 ? "" : "s"}, clauses, and analytics will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} disabled={deleteDocMut.isPending} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white">
              {deleteDocMut.isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const VERSION_TONE = { ok: "text-[var(--success)]", busy: "text-[var(--warning)]", bad: "text-[var(--danger)]", none: "text-[var(--ink-600)]" } as const;

function VersionRow({ v, filename, docStatus, isCurrent, onDelete, sowHref }: {
  v: ApiVersion; filename: string | null; docStatus: string; isCurrent: boolean; onDelete?: () => void; sowHref: string;
}) {
  const state = versionState(v, isCurrent, docStatus);
  return (
    <tr className="border-b border-[var(--ink-100)] transition-colors last:border-0 hover:bg-[var(--panel)]">
      <td className="px-3 py-3 md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--ink-700)]"><Layers size={14} /></span>
          <span className="text-base font-semibold tabular-nums text-foreground">v{v.versionNumber}</span>
          {isCurrent && <Badge variant="success" size="sm" className="text-xs">Current</Badge>}
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        {filename
          ? <span className="inline-flex items-center gap-1.5 text-sm text-foreground"><FileText size={14} className="shrink-0 text-muted-foreground" /><span className="max-w-[220px] truncate" title={filename}>{filename}</span></span>
          : <span className="text-sm text-muted-foreground">Not recorded</span>}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ${VERSION_TONE[state.tone]}`}>
          {state.tone === "ok" ? <CheckCircle2 size={14} /> : state.tone === "busy" ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : state.tone === "bad" ? <XCircle size={14} /> : null}
          {state.label}
        </span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell"><span className="text-sm text-[var(--ink-600)]">{methodLabel(v.extractionMethod)}</span></td>
      <td className="px-3 py-3 md:px-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-[var(--ink-600)]" title={formatDate(v.createdAt)}><Clock size={13} className="shrink-0" />{formatRelativeDays(v.createdAt)}</span></td>
      <td className="px-2 py-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-lg" aria-label={`Actions for version ${v.versionNumber}`}><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="gap-2 cursor-pointer"><Link href={sowHref}><FileText size={14} className="text-muted-foreground" />View clauses</Link></DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-soft)]">
                  <Trash2 size={14} />{isCurrent ? "Delete (rollback)" : "Delete version"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><span className="text-muted-foreground">{label}</span>{children}</li>;
}

function EmptyState() {
  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4"><Layers size={20} strokeWidth={1.5} /></span>
      <h3 className="text-base font-semibold text-foreground">No versions yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--ink-600)]">No processed versions found. Upload a file to get started.</p>
    </section>
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

function DocumentsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card"><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="app-container py-6 md:py-8"><div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12"><div className="space-y-4 lg:col-span-8"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div><div className="lg:col-span-4 space-y-5"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div></div></div>
    </>
  );
}
