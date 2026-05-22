"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/icons";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { MotionReveal } from "@/components/MotionReveal";
import { listDocuments, deleteDocument, updateDocument } from "@/lib/api";
import { useProjects } from "@/lib/projects-store";
import type { ApiDocument, DocType, Lifecycle } from "@/lib/types";
import { STATUS_TONE } from "@/lib/status-tone";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "OTHER"];

const LIFECYCLE_OPTIONS: Lifecycle[] = [
  "draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired",
];

const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft",
  review: "Review",
  negotiation: "Negotiation",
  approval: "Approval",
  signed: "Signed",
  active: "Active",
  renewal: "Renewal",
  expired: "Expired",
};

const PROCESSING_STATUSES = new Set([
  "PENDING", "PARSING", "CLASSIFYING", "EMBEDDING",
  "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING",
]);

type SortKey = "title" | "docType" | "lifecycle" | "createdAt" | "latestVersion";

export default function LibraryPage() {
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Projects live in localStorage and group documents by docId. We join each
  // document to the project that contains it to surface its name and let the
  // search match on it. useProjects() is backed by useSyncExternalStore, which
  // returns an empty list on the server so there's no hydration mismatch.
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "createdAt",
    dir: "desc",
  });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<ApiDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(doc: ApiDocument) {
    setEditTarget(doc);
    setEditTitle(doc.title || "");
    setEditLifecycle(doc.lifecycle);
    setEditDocType(doc.docType);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.docId);
      setDocs((prev) => prev.filter((d) => d.docId !== deleteTarget.docId));
      toast.success("Document deleted", { description: deleteTarget.title });
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const patch: { title?: string; lifecycle?: string; docType?: string } = {};
      if (editTitle.trim() !== editTarget.title) patch.title = editTitle.trim();
      if (editLifecycle !== editTarget.lifecycle) patch.lifecycle = editLifecycle;
      if (editDocType !== editTarget.docType) patch.docType = editDocType;

      if (Object.keys(patch).length === 0) {
        setEditTarget(null);
        return;
      }

      const updated = await updateDocument(editTarget.docId, patch);
      setDocs((prev) =>
        prev.map((d) => (d.docId === updated.docId ? updated : d)),
      );
      toast.success("Document updated");
      setEditTarget(null);
    } catch (e) {
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    let arr = docs;
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter((d) =>
        d.title?.toLowerCase().includes(s) ||
        (projectByDocId.get(d.docId)?.toLowerCase().includes(s) ?? false),
      );
    }
    if (docTypeFilter !== "All") arr = arr.filter((d) => d.docType === docTypeFilter);
    if (lifecycleFilter !== "All") arr = arr.filter((d) => d.lifecycle === lifecycleFilter);
    if (statusFilter === "READY") arr = arr.filter((d) => d.status === "READY");
    else if (statusFilter === "FAILED") arr = arr.filter((d) => d.status === "FAILED");
    else if (statusFilter === "processing") arr = arr.filter((d) => PROCESSING_STATUSES.has(d.status));

    arr = [...arr].sort((a, b) => {
      const av = (a[sort.key] ?? "") as string | number;
      const bv = (b[sort.key] ?? "") as string | number;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [docs, q, docTypeFilter, lifecycleFilter, statusFilter, sort, projectByDocId]);

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
  }

  const lifecycles = ["All", ...Array.from(new Set(docs.map((d) => d.lifecycle))).sort()];

  return (
    <>
      <PageHeader
        eyebrow={`${docs.length} document${docs.length === 1 ? "" : "s"} · contract library`}
        title="Contract library"
        subtitle="The system of record. Every SOW, MSA, and amendment — searchable down to a single clause."
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} />
            New document
          </Link>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Filters */}
        <MotionReveal>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-[420px]">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                placeholder="Search by title or project…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 rounded-full border border-border bg-card pl-9 pr-4 focus-visible:border-[var(--brand-primary-400)] focus-visible:ring-4 focus-visible:ring-[var(--brand-primary-100)]"
              />
            </div>

            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger className="h-10 w-[160px] rounded-full">
                <span className="text-muted-foreground mr-1.5 text-[12px]">Type</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
              <SelectTrigger className="h-10 w-[170px] rounded-full">
                <span className="text-muted-foreground mr-1.5 text-[12px]">Lifecycle</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lifecycles.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">
                    {l === "All" ? "All stages" : LIFECYCLE_LABEL[l as Lifecycle] ?? l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[170px] rounded-full">
                <span className="text-muted-foreground mr-1.5 text-[12px]">Status</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button variant="ai" size="md" className="h-10 rounded-full gap-1.5 pl-2">
              <BlueyMark size="sm" />
              Ask Bluey to analyze
            </Button>
          </div>
        </MotionReveal>

        {/* Table */}
        <MotionReveal delay={0.05}>
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent h-9 border-b border-border">
                  <ThSort label="Title" onClick={() => toggleSort("title")} dir={sort.key === "title" ? sort.dir : undefined} />
                  <TableHead className="eyebrow">Project</TableHead>
                  <ThSort label="Type" onClick={() => toggleSort("docType")} dir={sort.key === "docType" ? sort.dir : undefined} />
                  <ThSort label="Lifecycle" onClick={() => toggleSort("lifecycle")} dir={sort.key === "lifecycle" ? sort.dir : undefined} />
                  <TableHead className="eyebrow">Status</TableHead>
                  <TableHead className="eyebrow text-right">Parties</TableHead>
                  <TableHead className="eyebrow text-right">Version</TableHead>
                  <ThSort label="Created" onClick={() => toggleSort("createdAt")} dir={sort.key === "createdAt" ? sort.dir : undefined} />
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="h-11">
                      <TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-[var(--brand-primary-50)] flex items-center justify-center mb-4">
                          <FileText size={22} className="text-[var(--brand-primary-600)]" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground mb-1.5">
                          {docs.length === 0 ? "No documents yet" : "No documents match"}
                        </h3>
                        <p className="text-[12.5px] text-muted-foreground max-w-xs mb-5">
                          {docs.length === 0
                            ? "Upload your first document to get started."
                            : "Try clearing your filters or adjusting your search."}
                        </p>
                        {docs.length === 0 ? (
                          <Link
                            href="/projects/new"
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors"
                          >
                            <Plus size={13} strokeWidth={2.5} />
                            Upload a document
                          </Link>
                        ) : (
                          <Button variant="primary" size="md" className="rounded-full" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((doc) => {
                    const lifecycle = doc.lifecycle as Lifecycle;
                    const tone = STATUS_TONE[lifecycle] ?? STATUS_TONE.draft;
                    const statusBadge = getStatusBadge(doc.status);
                    return (
                      <TableRow key={doc.docId} className="group h-11 text-[13px] hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/projects/${doc.docId}`} className="block min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate max-w-[280px] group-hover:text-[var(--brand-primary-700)] transition-colors">
                              {doc.title || "Untitled"}
                            </div>
                            <div className="text-[10.5px] font-mono text-muted-foreground">
                              {doc.docId.slice(0, 8).toUpperCase()}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          <span className="block truncate max-w-[200px]">
                            {projectByDocId.get(doc.docId) ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" size="sm">{doc.docType}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tone.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            {LIFECYCLE_LABEL[lifecycle] ?? lifecycle}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[13px] text-muted-foreground tabular-nums">
                          {doc.parties?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-[13px] text-muted-foreground tabular-nums">
                          v{doc.latestVersion}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground font-mono">
                          {formatDate(doc.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon-sm">
                                  <Link href={`/projects/${doc.docId}`}><ArrowUpRight /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEdit(doc)}
                                >
                                  <Pencil size={13} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-muted-foreground hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                                  onClick={() => setDeleteTarget(doc)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border text-[12px] text-muted-foreground">
            <span className="font-mono">
              {loading ? "Loading…" : `showing ${filtered.length} of ${docs.length}`}
            </span>
          </div>
        </div>
        </MotionReveal>

        {error && (
          <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/30 p-4 text-[13px] text-[var(--danger)]">
            Failed to load documents: {error}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title || "This document"}</strong> and all its
              versions, clauses, and analytics will be permanently removed. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
            >
              {deleting ? (
                <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Document title"
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Lifecycle stage</label>
              <Select value={editLifecycle} onValueChange={(v) => setEditLifecycle(v as Lifecycle)}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{LIFECYCLE_LABEL[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</>
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

function getStatusBadge(status: string) {
  if (status === "READY") return { label: "Ready", cls: "bg-[var(--success-soft)] text-[var(--success)]" };
  if (status === "FAILED") return { label: "Failed", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" };
  return { label: "Processing", cls: "bg-[var(--ink-100)] text-[var(--ink-600)]" };
}

function ThSort({
  label, onClick, dir, align = "left",
}: {
  label: string; onClick: () => void; dir?: "asc" | "desc"; align?: "left" | "right";
}) {
  return (
    <TableHead className={cn("eyebrow", align === "right" && "text-right")}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "justify-end w-full",
        )}
      >
        {label}
        {dir === "asc" && <ArrowUp size={10} />}
        {dir === "desc" && <ArrowDown size={10} />}
      </button>
    </TableHead>
  );
}
