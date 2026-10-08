"use client";

import { STAGE_LABEL } from "@/lib/govern/labels";
import { byEdition, noun } from "@/lib/edition-runtime";
import { docTypesFor } from "@/lib/doc-types";
import { useEditionFeature } from "@/lib/govern/queries";
import { docTypeLabel } from "@/lib/doc-types";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { docTypeShort } from "@/lib/doc-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  FileText,
  Trash2,
  Pencil,
  Loader2,
  AlertTriangle,
} from "@/components/ui/icons";
import { MotionReveal } from "@/components/MotionReveal";
import { useDocuments, useDeleteDocument, useUpdateAnyDocument, isProcessing } from "@/lib/queries/documents";
import { can, useProjects } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import type { ApiDocument, DocType, Lifecycle } from "@/lib/types";
import { STATUS_TONE } from "@/lib/status-tone";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "LICENSE", "DPA", "BAA", "COMPLIANCE", "OTHER"];


// The same words as the workflow board, so a stage reads the same everywhere.
const LIFECYCLE_LABEL: Record<Lifecycle, string> = STAGE_LABEL;

type SortKey = "title" | "docType" | "lifecycle" | "createdAt" | "latestVersion";

export default function LibraryPage() {
  const showSow = useEditionFeature("sowDocuments");
  // The shared documents query: polls while anything is processing, refetches
  // on focus, and is invalidated by every upload / edit / delete in the app — so
  // this list and its counts match the dashboard, workflow and notifications.
  const { data, isLoading: loading, isError, error: loadError, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  // An error with nothing loaded is a failed page; with data it is a stale list.
  const failed = isError && !data;
  const error = isError ? (loadError instanceof Error ? loadError.message : "The request failed.") : null;
  const deleteMut = useDeleteDocument();
  const updateMut = useUpdateAnyDocument();

  // The list holds exactly what the server lets this user see: their own uploads
  // plus the documents of projects shared with them — nothing is filtered for
  // access here. Each document is joined to the (visible) project that contains
  // it, to surface its name and let the search match on it. useProjects() is
  // backed by useSyncExternalStore, which returns an empty list on the server so
  // there's no hydration mismatch.
  const projects = useProjects();
  const projectByDocId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      for (const id of p.docIds) map.set(id, p.name);
    }
    return map;
  }, [projects]);

  const [q, setQ] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("All");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [projectFilter, setProjectFilter] = useState<string>("All");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "createdAt",
    dir: "desc",
  });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const deleting = deleteMut.isPending;

  // Edit state
  const [editTarget, setEditTarget] = useState<ApiDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  const saving = updateMut.isPending;

  function openEdit(doc: ApiDocument) {
    setEditTarget(doc);
    setEditTitle(doc.title || "");
    setEditLifecycle(doc.lifecycle);
    setEditDocType(doc.docType);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      // Removes it from every project and refreshes the shared list.
      await deleteMut.mutateAsync(deleteTarget.docId);
      toast.success("Document deleted", { description: deleteTarget.title || "Untitled" });
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Couldn't delete the document", {
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  }

  async function handleSave() {
    if (!editTarget) return;
    try {
      const patch: { title?: string; lifecycle?: string; docType?: string } = {};
      // The API rejects an empty title, so clearing the field keeps the current one.
      if (editTitle.trim() && editTitle.trim() !== editTarget.title) patch.title = editTitle.trim();
      if (editLifecycle !== editTarget.lifecycle) patch.lifecycle = editLifecycle;
      if (editDocType !== editTarget.docType) patch.docType = editDocType;

      if (Object.keys(patch).length === 0) {
        setEditTarget(null);
        return;
      }

      await updateMut.mutateAsync({ id: editTarget.docId, patch });
      toast.success("Document updated");
      setEditTarget(null);
    } catch (e) {
      toast.error("Couldn't save the changes", {
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  }

  const filtered = useMemo(() => {
    let arr = docs;
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter((d) =>
        (d.title || "Untitled").toLowerCase().includes(s) ||
        (projectByDocId.get(d.docId)?.toLowerCase().includes(s) ?? false),
      );
    }
    if (docTypeFilter !== "All") arr = arr.filter((d) => d.docType === docTypeFilter);
    if (lifecycleFilter !== "All") arr = arr.filter((d) => d.lifecycle === lifecycleFilter);
    if (projectFilter !== "All") arr = arr.filter((d) => projectByDocId.get(d.docId) === projectFilter);
    if (statusFilter === "READY") arr = arr.filter((d) => d.status === "READY");
    else if (statusFilter === "FAILED") arr = arr.filter((d) => d.status === "FAILED");
    else if (statusFilter === "processing") arr = arr.filter((d) => isProcessing(d.status));

    arr = [...arr].sort((a, b) => {
      const av = (a[sort.key] ?? "") as string | number;
      const bv = (b[sort.key] ?? "") as string | number;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [docs, q, docTypeFilter, lifecycleFilter, statusFilter, projectFilter, sort, projectByDocId]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );
  }

  function clearFilters() {
    setQ("");
    setDocTypeFilter("All");
    setLifecycleFilter("All");
    setStatusFilter("All");
    setProjectFilter("All");
  }

  const lifecycles = ["All", ...Array.from(new Set(docs.map((d) => d.lifecycle))).sort()];

  const projectNames = Array.from(new Set(docs.map((d) => projectByDocId.get(d.docId)).filter((p): p is string => !!p))).sort();
  const activeFilters = [q.trim() !== "", docTypeFilter !== "All", lifecycleFilter !== "All", statusFilter !== "All", projectFilter !== "All"].filter(Boolean).length;

  const empty = !loading && !failed && filtered.length === 0;
  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  return (
    <>
      <PageHeader
        title="Document library"
        subtitle={showSow ? "Every SOW, MSA and amendment in one place." : "Every agreement and document you have uploaded, in one place."}
        actions={
          <>
            <Button asChild className="h-10 md:h-9">
              <Link href="/projects/upload">
                <Plus size={15} strokeWidth={2.25} />
                Upload a contract
              </Link>
            </Button>
          </>
        }
      />

      <div className="app-container app-page">
        {/* Filter bar: full-width search, then a chip row that scrolls sideways on a phone. */}
        <section aria-label="Filters" className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start">
            <div className="relative w-full md:w-[260px] md:shrink-0">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label="Search documents"
                placeholder={byEdition("Search by title or project", "Search by title or engagement")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg border-[var(--ink-300)] bg-card pl-9 pr-3 placeholder:text-[var(--ink-500)]"
              />
            </div>

            <div className={FILTER_ROW}>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger aria-label="Filter by document type" className={FILTER_TRIGGER}>
                  <span className={FILTER_PREFIX}>Type</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                <SelectTrigger aria-label="Filter by lifecycle stage" className={FILTER_TRIGGER}>
                  <span className={FILTER_PREFIX}>Stage</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lifecycles.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l === "All" ? "All" : LIFECYCLE_LABEL[l as Lifecycle] ?? l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filter by processing status" className={FILTER_TRIGGER}>
                  <span className={FILTER_PREFIX}>Status</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              {projectNames.length > 0 && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger aria-label={byEdition("Filter by project", "Filter by engagement")} className={cn(FILTER_TRIGGER, "max-w-[240px]")}>
                    <span className={FILTER_PREFIX}>{noun("Project")}</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {projectNames.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={sort.key} onValueChange={(v) => setSort({ key: v as SortKey, dir: v === "title" ? "asc" : "desc" })}>
                <SelectTrigger aria-label="Sort documents" className={FILTER_TRIGGER}>
                  <span className={FILTER_PREFIX}>Sort</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="docType">Type</SelectItem>
                  <SelectItem value="lifecycle">Lifecycle</SelectItem>
                  <SelectItem value="latestVersion">Versions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 text-sm md:min-h-0">
            <span className="tabular-nums text-[var(--ink-600)]" aria-live="polite">
              {loading ? "Loading…" : failed ? "Documents not loaded" : `Showing ${filtered.length} of ${docs.length} document${docs.length === 1 ? "" : "s"}`}
            </span>
            {processingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[var(--ink-600)]">
                <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                {processingCount} processing, updating automatically
              </span>
            )}
            {activeFilters > 0 && (
              <>
                <span className="rounded-full bg-structure-soft px-2 py-0.5 text-xs font-semibold text-structure-soft-fg">
                  {activeFilters} filter{activeFilters === 1 ? "" : "s"} active
                </span>
                <button type="button" onClick={clearFilters} className="inline-flex min-h-10 items-center rounded font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:min-h-0">
                  Clear filters
                </button>
              </>
            )}
          </div>
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words">
              {failed ? "Couldn't load your documents: " : "Couldn\u2019t refresh, so this list may be out of date: "}{error}
            </span>
            <button type="button" onClick={() => refetch()} className="shrink-0 rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">Try again</button>
          </div>
        )}

        {!failed && (
        <MotionReveal delay={0.05}>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-4 py-3"><Skeleton className="h-10 w-full md:h-6" /></div>
                ))}
              </div>
            ) : empty ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center md:py-16">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-structure-soft">
                  <FileText size={22} className="text-[var(--brand-primary-600)]" />
                </div>
                <h3 className="text-base font-semibold mb-1.5 text-foreground">
                  {docs.length === 0 ? "No documents yet" : "No documents match these filters"}
                </h3>
                <p className="mb-5 max-w-xs text-sm text-[var(--ink-600)]">
                  {docs.length === 0
                    ? byEdition("Documents you upload appear here, along with the documents of any project that is shared with you.", "Documents you upload appear here, along with the documents of any engagement that is shared with you.")
                    : "Try clearing your filters or adjusting your search."}
                </p>
                {docs.length === 0 ? (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/projects/upload">
                      <Plus size={15} strokeWidth={2.25} />
                      Upload a document
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Phone: one stacked row per document, actions always visible. */}
                <ul className="divide-y divide-border md:hidden">
                  {filtered.map((doc) => {
                    const project = projectByDocId.get(doc.docId);
                    return (
                      <li key={doc.docId} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Link href={`/projects/${doc.docId}`} className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                            <span className="block break-words text-base font-semibold leading-snug text-foreground">
                              {doc.title || "Untitled"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {project ? `${project} · ` : ""}
                              <span className="font-mono">{doc.docId.slice(0, 8).toUpperCase()}</span>
                            </span>
                            <SharedLine doc={doc} />
                          </Link>
                          <div className="-mr-2 -mt-1.5 flex shrink-0 items-center">
                            {can(doc.role, "edit") && (
                              <Button variant="ghost" size="icon-lg" aria-label={`Edit ${doc.title || "document"}`} onClick={() => openEdit(doc)}>
                                <Pencil size={16} />
                              </Button>
                            )}
                            {can(doc.role, "delete_document") && (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                aria-label={`Delete ${doc.title || "document"}`}
                                className="text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                                onClick={() => setDeleteTarget(doc)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <DocTypeBadge type={doc.docType} />
                          <LifecycleLabel lifecycle={doc.lifecycle as Lifecycle} />
                          <StatusBadge status={doc.status} code={doc.errorCode} />
                        </div>
                        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                          {formatDate(doc.createdAt)} · v{doc.latestVersion}{doc.status === "READY" ? ` · ${doc.parties?.length ?? 0} part${(doc.parties?.length ?? 0) === 1 ? "y" : "ies"}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {/* Tablet and up: sortable table; low-priority columns appear as width allows. */}
                <div className="hidden md:block">
                  <Table className="min-w-[680px]">
                    <TableHeader className="bg-[var(--panel)]">
                      <TableRow className="h-10 border-b border-border odd:bg-transparent hover:bg-transparent">
                        <ThSort label="Title" onClick={() => toggleSort("title")} dir={sort.key === "title" ? sort.dir : undefined} />
                        <TableHead className={cn(TH, "hidden lg:table-cell")}>{noun("Project")}</TableHead>
                        <ThSort label="Type" onClick={() => toggleSort("docType")} dir={sort.key === "docType" ? sort.dir : undefined} />
                        <ThSort label="Lifecycle" onClick={() => toggleSort("lifecycle")} dir={sort.key === "lifecycle" ? sort.dir : undefined} />
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={cn(TH, "hidden text-right xl:table-cell")}>Parties</TableHead>
                        <TableHead className={cn(TH, "hidden text-right xl:table-cell")}>Version</TableHead>
                        <ThSort label="Created" onClick={() => toggleSort("createdAt")} dir={sort.key === "createdAt" ? sort.dir : undefined} />
                        <TableHead className={cn(TH, "w-28 text-right")}><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((doc) => (
                        <TableRow key={doc.docId} className="group border-b border-border text-sm odd:bg-transparent hover:bg-[var(--panel)]">
                          <TableCell className="max-w-[320px] whitespace-normal py-2.5">
                            <Link href={`/projects/${doc.docId}`} className="block min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                              <span className="line-clamp-2 break-words text-base font-semibold text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">
                                {doc.title || "Untitled"}
                              </span>
                              <span className="block font-mono text-xs text-muted-foreground">
                                {doc.docId.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground lg:hidden">
                                {projectByDocId.get(doc.docId) ?? ""}
                              </span>
                              <SharedLine doc={doc} />
                            </Link>
                          </TableCell>
                          <TableCell className="hidden text-sm text-[var(--ink-600)] lg:table-cell">
                            <span className="block max-w-[200px] truncate">
                              {projectByDocId.get(doc.docId) ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DocTypeBadge type={doc.docType} />
                          </TableCell>
                          <TableCell>
                            <LifecycleLabel lifecycle={doc.lifecycle as Lifecycle} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={doc.status} code={doc.errorCode} />
                          </TableCell>
                          <TableCell className="hidden text-right text-sm tabular-nums text-[var(--ink-600)] xl:table-cell">
                            {/* Parties are extracted by the analysis: unknown until it is READY. */}
                            {doc.status === "READY" ? doc.parties?.length ?? 0 : "—"}
                          </TableCell>
                          <TableCell className="hidden text-right text-sm tabular-nums text-[var(--ink-600)] xl:table-cell">
                            v{doc.latestVersion}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums text-[var(--ink-600)]">
                            {formatDate(doc.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild variant="ghost" size="icon">
                                    <Link href={`/projects/${doc.docId}`} aria-label={`Open ${doc.title || "document"}`}><ArrowUpRight /></Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open</TooltipContent>
                              </Tooltip>
                              {can(doc.role, "edit") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Edit ${doc.title || "document"}`}
                                      onClick={() => openEdit(doc)}
                                    >
                                      <Pencil size={15} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              )}
                              {can(doc.role, "delete_document") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Delete ${doc.title || "document"}`}
                                      className="hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                                      onClick={() => setDeleteTarget(doc)}
                                    >
                                      <Trash2 size={15} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </MotionReveal>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="break-words font-semibold text-foreground">{deleteTarget?.title || "This document"}</strong> and all its
              versions, clauses, and analytics will be permanently removed, for everyone it
              is shared with. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="h-10 md:h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="h-10 bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 md:h-9"
            >
              {deleting ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Deleting…</>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="edit-doc-title" className="block text-sm font-medium text-foreground">Title</label>
              <Input
                id="edit-doc-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Document title"
                className="h-10 border-[var(--ink-300)]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-doc-type" className="block text-sm font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}>
                <SelectTrigger id="edit-doc-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {docTypesFor(DOC_TYPES, showSow).map((t) => (
                    <SelectItem key={t} value={t}>{docTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="block text-sm font-medium text-foreground">Stage</p>
              <p className="text-sm text-foreground">{LIFECYCLE_LABEL[editLifecycle]}</p>
              <p className="text-xs text-[var(--ink-600)]">Moves on its own as people review, approve and sign the agreement in Govern.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-10 md:h-9" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-10 md:h-9" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Saving…</>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const FILTER_ROW = "-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-1 md:flex-wrap md:overflow-visible md:px-0";
const FILTER_TRIGGER =
  "w-auto shrink-0 gap-2 border-[var(--ink-300)] bg-card text-sm data-[size=default]:h-10";
const FILTER_PREFIX = "shrink-0 text-xs font-medium text-muted-foreground";
const TH = "h-10 text-xs font-semibold text-[var(--ink-600)] whitespace-nowrap";

/** For a document someone else uploaded: who it comes from and this user's
 *  role on it. A viewer has no edit or delete control on the row; this says why. */
function SharedLine({ doc }: { doc: ApiDocument }) {
  if (!doc.role || doc.role === "owner") return null;
  return (
    <span className="mt-0.5 block truncate text-xs text-[var(--ink-600)]">
      Shared with you{doc.ownerEmail ? ` by ${doc.ownerEmail}` : ""} · {ROLE_META[doc.role].label}
      {doc.role === "viewer" ? ", read-only" : ""}
    </span>
  );
}

function LifecycleLabel({ lifecycle }: { lifecycle: Lifecycle }) {
  const tone = STATUS_TONE[lifecycle] ?? STATUS_TONE.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ${tone.text}`}>
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {LIFECYCLE_LABEL[lifecycle] ?? lifecycle}
    </span>
  );
}

function StatusBadge({ status, code }: { status: string; code?: string }) {
  const badge = status === "FAILED" && code === "not_agreement"
    ? { label: "Not an agreement", cls: "bg-[var(--warning-soft)] text-[var(--warning-fg)]" }
    : getStatusBadge(status);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

function getStatusBadge(status: string) {
  if (status === "READY") return { label: "Ready", cls: "bg-[var(--success-soft)] text-[var(--success-fg)]" };
  if (status === "FAILED") return { label: "Failed", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" };
  return { label: "Processing", cls: "bg-[var(--ink-100)] text-[var(--ink-600)]" };
}

function ThSort({
  label, onClick, dir, align = "left",
}: {
  label: string; onClick: () => void; dir?: "asc" | "desc"; align?: "left" | "right";
}) {
  return (
    <TableHead
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
      className={cn(TH, align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
          dir && "text-foreground",
          align === "right" && "w-full justify-end",
        )}
      >
        {label}
        {dir === "asc" && <ArrowUp size={12} />}
        {dir === "desc" && <ArrowDown size={12} />}
      </button>
    </TableHead>
  );
}
