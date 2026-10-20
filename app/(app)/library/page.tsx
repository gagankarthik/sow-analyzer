"use client";

// Library: every document the user can see, in one flat table (UI_SPEC
// sections 3, 7, 9): title + count, processing-status views as tabs (URL
// ?view=), the shared toolbar, edit and delete on each row (delete confirms).

import { STAGE_LABEL } from "@/lib/govern/labels";
import { byEdition, noun } from "@/lib/edition-runtime";
import { docTypesFor } from "@/lib/doc-types";
import { useEditionFeature } from "@/lib/govern/queries";
import { docTypeLabel } from "@/lib/doc-types";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { docTypeShort } from "@/lib/doc-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Pencil, Loader2, AlertTriangle } from "@/components/ui/icons";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { Toolbar } from "@/components/ds/Toolbar";
import { ViewTabs, type ListView } from "@/components/ds/ViewTabs";
import {
  InViewFooter, MoreFilters, QuickFilters, SheetFilters, activeFilterCount, type IndexFilter,
} from "@/components/govern/IndexFilters";
import { LibrarySkeleton } from "./_components/LibrarySkeleton";
import { useDocuments, useDeleteDocument, useUpdateAnyDocument, isProcessing } from "@/lib/queries/documents";
import { can, useProjects } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import type { ApiDocument, DocType, Lifecycle } from "@/lib/types";
import { STATUS_TONE } from "@/lib/status-tone";
import { displayTitle, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "LICENSE", "DPA", "BAA", "COMPLIANCE", "OTHER"];

// The same words as the workflow board, so a stage reads the same everywhere.
const LIFECYCLE_LABEL: Record<Lifecycle, string> = STAGE_LABEL;

type ViewId = "all" | "ready" | "processing" | "failed";
const VIEWS: { id: ViewId; label: string; test: (d: ApiDocument) => boolean }[] = [
  { id: "all", label: "All documents", test: () => true },
  { id: "ready", label: "Ready", test: (d) => d.status === "READY" },
  { id: "processing", label: "Analyzing", test: (d) => isProcessing(d.status) },
  { id: "failed", label: "Failed", test: (d) => d.status === "FAILED" },
];

const ICON_ACTION =
  "inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-600)] transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus max-md:size-11";

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Library />
    </Suspense>
  );
}

function Library() {
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

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const deleting = deleteMut.isPending;

  // Edit state
  const [editTarget, setEditTarget] = useState<ApiDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  const saving = updateMut.isPending;
  // The title is checked once the field is left or a save is tried.
  const [titleChecked, setTitleChecked] = useState(false);
  const titleError = titleChecked && !editTitle.trim() ? "Give the document a title." : undefined;

  function openEdit(doc: ApiDocument) {
    setEditTarget(doc);
    setTitleChecked(false);
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
    // The API rejects an empty title: say so under the field instead of saving.
    if (!editTitle.trim()) {
      setTitleChecked(true);
      document.getElementById("edit-doc-title")?.focus();
      return;
    }
    try {
      const patch: { title?: string; lifecycle?: string; docType?: string } = {};
      if (editTitle.trim() !== editTarget.title) patch.title = editTitle.trim();
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

  const params = useSearchParams();
  const pathname = usePathname();
  const view = VIEWS.find((v) => v.id === params.get("view")) ?? VIEWS[0];

  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [docTypeFilter, setDocTypeFilter] = useState<string[]>([]);
  const [lifecycleFilter, setLifecycleFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | undefined>(undefined);

  const inView = useMemo(() => docs.filter(view.test), [docs, view]);
  const filtered = useMemo(() => inView.filter((d) =>
    (!query
      || (d.title || "Untitled").toLowerCase().includes(query)
      || (projectByDocId.get(d.docId)?.toLowerCase().includes(query) ?? false))
    && (docTypeFilter.length === 0 || docTypeFilter.includes(d.docType))
    && (lifecycleFilter.length === 0 || lifecycleFilter.includes(d.lifecycle))
    && (projectFilter.length === 0 || projectFilter.includes(projectByDocId.get(d.docId) ?? "")),
  ), [inView, query, docTypeFilter, lifecycleFilter, projectFilter, projectByDocId]);

  function clearFilters() {
    setQ("");
    setDocTypeFilter([]);
    setLifecycleFilter([]);
    setProjectFilter([]);
  }

  const countBy = (pick: (d: ApiDocument) => string | undefined) => {
    const m = new Map<string, number>();
    for (const d of inView) {
      const k = pick(d);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const typeCounts = countBy((d) => d.docType);
  const stageCounts = countBy((d) => d.lifecycle);
  const projectCounts = countBy((d) => projectByDocId.get(d.docId));

  const filters: IndexFilter[] = [
    {
      id: "type", label: "Type", selected: docTypeFilter, onChange: setDocTypeFilter,
      options: DOC_TYPES.filter((t) => typeCounts.has(t)).map((t) => ({ value: t, label: docTypeShort(t), count: typeCounts.get(t) })),
    },
    {
      id: "stage", label: "Stage", selected: lifecycleFilter, onChange: setLifecycleFilter,
      options: [...stageCounts.keys()].sort().map((l) => ({ value: l, label: LIFECYCLE_LABEL[l as Lifecycle] ?? l, count: stageCounts.get(l) })),
    },
    ...(projectCounts.size > 0 ? [{
      id: "project", label: noun("Project"), selected: projectFilter, onChange: setProjectFilter,
      options: [...projectCounts.keys()].sort().map((p) => ({ value: p, label: p, count: projectCounts.get(p) })),
    }] : []),
  ];
  const activeCount = activeFilterCount(filters);

  const tabs: ListView[] = VIEWS.map((v) => ({
    id: v.id, label: v.label, count: loading ? null : docs.filter(v.test).length,
    href: v.id === "all" ? pathname : `${pathname}?view=${v.id}`,
  }));

  const columns: DataTableColumn<ApiDocument>[] = [
    {
      id: "title", header: "Title", card: "title", className: "min-w-[14rem]", sortValue: (d) => (d.title || "").toLowerCase(),
      cell: (d) => (
        <span className="flex min-w-0 max-w-[min(26rem,38cqw)] flex-col">
          <span className="truncate">{displayTitle(d.title) || "Untitled"}</span>
          <span className="truncate text-xs font-normal text-[var(--ink-600)]">
            <span className="font-mono">{d.docId.slice(0, 8).toUpperCase()}</span>
            <SharedLine doc={d} />
          </span>
        </span>
      ),
    },
    {
      id: "project", header: noun("Project"), priority: 2, sortValue: (d) => projectByDocId.get(d.docId)?.toLowerCase() ?? null,
      cell: (d) => <span className="block max-w-[200px] truncate text-[var(--ink-600)]">{projectByDocId.get(d.docId) ?? "—"}</span>,
    },
    { id: "type", header: "Type", sortValue: (d) => d.docType, cell: (d) => <DocTypeBadge type={d.docType} /> },
    { id: "lifecycle", header: "Stage", card: "status", sortValue: (d) => d.lifecycle, cell: (d) => <LifecycleLabel lifecycle={d.lifecycle as Lifecycle} /> },
    { id: "status", header: "Status", sortValue: (d) => d.status, cell: (d) => <StatusBadge status={d.status} code={d.errorCode} /> },
    {
      id: "parties", header: "Parties", numeric: true, priority: 3, sortValue: (d) => (d.status === "READY" ? d.parties?.length ?? 0 : null),
      // Parties are extracted by the analysis: unknown until it is READY.
      cell: (d) => (d.status === "READY" ? d.parties?.length ?? 0 : "—"),
    },
    { id: "version", header: "Version", numeric: true, priority: 3, sortValue: (d) => d.latestVersion, cell: (d) => `v${d.latestVersion}` },
    { id: "created", header: "Created", sortFirst: "desc", sortValue: (d) => d.createdAt, cell: (d) => <span className="whitespace-nowrap tabular-nums text-[var(--ink-600)]">{formatDate(d.createdAt)}</span> },
  ];

  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  return (
    <>
      <PageHeader
        title="Library"
        count={loading || failed ? null : filtered.length}
        countLoading={loading}
        actions={
          <Button asChild>
            <Link href="/projects/upload">
              <Plus size={16} aria-hidden />
              Upload contract
            </Link>
          </Button>
        }
        meta={<ViewTabs label="Document views" views={tabs} activeId={view.id} loading={loading} />}
      />

      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        {error && !failed && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words">Couldn&apos;t refresh, so this list may be out of date: {error}</span>
            <button type="button" onClick={() => refetch()} className="shrink-0 rounded font-semibold underline underline-offset-2 max-md:min-h-11">Try again</button>
          </div>
        )}
        {processingCount > 0 && (
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-600)]" aria-live="polite">
            <Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />
            {processingCount} analyzing, updating automatically
          </p>
        )}

        <DataTable
          caption={view.label}
          noun="documents"
          columns={columns}
          rows={filtered}
          getRowId={(d) => d.docId}
          getRowHref={(d) => `/projects/${d.docId}`}
          getRowLabel={(d) => `Open ${d.title || "document"}`}
          defaultSort={{ columnId: "created", direction: "desc" }}
          pageSize={50}
          columnsKey="library-table"
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          state={loading ? "loading" : failed ? "error" : "ready"}
          onRetry={() => void refetch()}
          errorDetail={error ?? undefined}
          isFiltered={activeCount > 0 || !!query || (view.id !== "all" && docs.length > 0)}
          onClearFilters={clearFilters}
          rowActions={(d) => (
            <span className="flex items-center justify-end gap-0.5">
              {can(d.role, "edit") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={`Edit ${d.title || "document"}`} onClick={() => openEdit(d)} className={ICON_ACTION}>
                      <Pencil size={16} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              )}
              {can(d.role, "delete_document") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={`Delete ${d.title || "document"}`} onClick={() => setDeleteTarget(d)} className={cn(ICON_ACTION, "hover:bg-[var(--danger-soft)] hover:text-[var(--danger-fg)]")}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              )}
            </span>
          )}
          footer={filtered.length > 0 ? (
            <InViewFooter
              count={filtered.length}
              noun={["document", "documents"]}
              cells={[
                { label: "Ready", value: filtered.filter((d) => d.status === "READY").length },
                { label: "Failed", value: filtered.filter((d) => d.status === "FAILED").length, tone: filtered.some((d) => d.status === "FAILED") ? "danger" : undefined },
              ]}
            />
          ) : undefined}
          toolbar={
            <Toolbar label="Document filters" activeCount={activeCount} mobileSheet={<SheetFilters filters={filters} onClear={clearFilters} />}>
              <Toolbar.Search label="Search documents" placeholder={byEdition("Search title or project", "Search title or engagement")} value={q} onChange={setQ} />
              <Toolbar.Filters><QuickFilters filters={filters} /></Toolbar.Filters>
              <Toolbar.More><MoreFilters filters={filters} /></Toolbar.More>
              <Toolbar.Clear count={activeCount} onClear={clearFilters} />
            </Toolbar>
          }
          empty={
            <div className="flex flex-col items-center border-y border-border-default px-4 py-14 text-center">
              <p className="mb-1 text-base font-semibold text-foreground">No documents yet</p>
              <p className="mb-5 max-w-xs text-sm text-[var(--ink-600)]">
                {byEdition("Your uploads and the documents of projects shared with you appear here.", "Your uploads and the documents of engagements shared with you appear here.")}
              </p>
              <Button asChild variant="outline">
                <Link href="/projects/upload"><Plus size={16} aria-hidden />Upload contract</Link>
              </Button>
            </div>
          }
        />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="break-words font-semibold text-foreground">{deleteTarget?.title ? displayTitle(deleteTarget.title) : "This document"}</strong> and all its
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
                <><Loader2 size={16} aria-hidden className="mr-1.5 animate-spin" />Deleting…</>
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
                onBlur={() => setTitleChecked(true)}
                placeholder="Document title"
                className="h-10 border-[var(--ink-300)]"
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? "edit-doc-title-error" : undefined}
              />
              {titleError && <p id="edit-doc-title-error" role="alert" className="text-xs text-[var(--danger)]">{titleError}</p>}
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
              {saving && <Loader2 size={16} aria-hidden className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
      <span aria-hidden className={`h-2 w-2 rounded-full ${tone.dot}`} />
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
  // Ready is the normal case on almost every row, so it stays quiet; analysing
  // uses Sonar's colour everywhere; only a failure is red.
  if (status === "READY") return { label: "Ready", cls: "bg-[var(--ink-100)] text-[var(--ink-700)]" };
  if (status === "FAILED") return { label: "Failed", cls: "bg-[var(--danger-soft)] text-[var(--danger-fg)]" };
  return { label: "Analyzing", cls: "bg-[var(--ai-surface)] text-[var(--ai-ink)]" };
}
