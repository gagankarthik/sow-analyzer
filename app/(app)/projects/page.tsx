"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, FileText, Loader2, MoreHorizontal, Pencil, Trash2, Download, Building2,
} from "@/components/ui/icons";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { useDocuments, documentKeys } from "@/lib/queries/documents";
import { deleteDocument, updateDocument } from "@/lib/api";
import type { ApiDocument, DocType, Lifecycle, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const DOC_TYPES: DocType[] = ["SOW", "MSA", "AMENDMENT", "NDA", "OTHER"];
const LIFECYCLE_OPTIONS: Lifecycle[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];
const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: "Draft", review: "Review", negotiation: "Negotiation", approval: "Approval",
  signed: "Signed", active: "Active", renewal: "Renewal", expired: "Expired",
};

const TYPE_PILL: Record<DocType, string> = {
  SOW: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
  MSA: "bg-purple-50 text-purple-700",
  AMENDMENT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  NDA: "bg-[var(--success-soft)] text-[var(--success)]",
  OTHER: "bg-[var(--ink-100)] text-[var(--ink-600)]",
};
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[#C2410C]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};

type ViewKey = "all" | "risk" | "processing" | "failed";

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useDocuments();

  const [view, setView] = useState<ViewKey>("all");
  const [typeFilter, setTypeFilter] = useState<"ALL" | DocType>("ALL");

  // Delete (single + bulk)
  const [deleteTargets, setDeleteTargets] = useState<ApiDocument[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit
  const [editTarget, setEditTarget] = useState<ApiDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLifecycle, setEditLifecycle] = useState<Lifecycle>("draft");
  const [editDocType, setEditDocType] = useState<DocType>("OTHER");
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => ({
    all: docs.length,
    risk: docs.filter((d) => (d.highRiskCount ?? 0) > 0 || d.overallRisk === "high" || d.overallRisk === "critical").length,
    processing: docs.filter((d) => PROCESSING.has(d.status)).length,
    failed: docs.filter((d) => d.status === "FAILED").length,
  }), [docs]);

  const rows = useMemo(() => docs.filter((d) => {
    if (view === "risk" && !((d.highRiskCount ?? 0) > 0 || d.overallRisk === "high" || d.overallRisk === "critical")) return false;
    if (view === "processing" && !PROCESSING.has(d.status)) return false;
    if (view === "failed" && d.status !== "FAILED") return false;
    if (typeFilter !== "ALL" && d.docType !== typeFilter) return false;
    return true;
  }), [docs, view, typeFilter]);

  function openEdit(d: ApiDocument) {
    setEditTarget(d);
    setEditTitle(d.title || "");
    setEditLifecycle(d.lifecycle);
    setEditDocType(d.docType);
  }

  async function handleDelete() {
    if (!deleteTargets) return;
    setDeleting(true);
    try {
      await Promise.all(deleteTargets.map((d) => deleteDocument(d.docId)));
      await qc.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(deleteTargets.length === 1 ? "Document deleted" : `${deleteTargets.length} documents deleted`);
      setDeleteTargets(null);
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
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
      if (Object.keys(patch).length === 0) { setEditTarget(null); return; }
      await updateDocument(editTarget.docId, patch);
      await qc.invalidateQueries({ queryKey: documentKeys.all });
      toast.success("Document updated");
      setEditTarget(null);
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const header = ["Title", "Type", "Parties", "Clauses", "Risk", "Status", "Updated"];
    const lines = rows.map((d) => [
      d.title || "Untitled", d.docType, (d.parties ?? []).join("; "),
      d.clauseCount ?? "", d.overallRisk ?? "", d.status, d.updatedAt,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contracts.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<ApiDocument>[]>(() => [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link href={`/projects/${row.original.docId}`} className="inline-flex items-center gap-2 font-medium text-foreground hover:text-[var(--brand-primary-700)] transition-colors max-w-[280px]">
          <FileText size={14} className="text-muted-foreground shrink-0" />
          <span className="truncate">{row.original.title || "Untitled"}</span>
        </Link>
      ),
    },
    {
      accessorKey: "docType",
      header: "Type",
      cell: ({ row }) => <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_PILL[row.original.docType]}`}>{row.original.docType}</span>,
    },
    {
      id: "parties",
      accessorFn: (d) => (d.parties ?? []).join(", "),
      header: "Parties",
      enableSorting: false,
      cell: ({ row }) => {
        const ps = row.original.parties ?? [];
        if (ps.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground max-w-[200px]" title={ps.join(", ")}>
            <Building2 size={12} className="shrink-0" />
            <span className="truncate">{ps[0]}{ps.length > 1 ? ` +${ps.length - 1}` : ""}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "clauseCount",
      header: "Clauses",
      cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.clauseCount ?? "—"}</span>,
    },
    {
      accessorKey: "overallRisk",
      header: "Risk",
      cell: ({ row }) => {
        const r = row.original.overallRisk;
        if (!r || row.original.status !== "READY") return <span className="text-muted-foreground">—</span>;
        return <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${RISK_PILL[r]}`}>{r}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusCell status={row.original.status} lifecycle={row.original.lifecycle} />,
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums" title={formatDate(row.original.updatedAt)}>{formatRelativeDays(row.original.updatedAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      size: 48,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions"><MoreHorizontal size={15} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild className="gap-2 text-[13px] cursor-pointer">
                <Link href={`/projects/${row.original.docId}`}><FileText size={13} className="text-muted-foreground" />Open</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-[13px] cursor-pointer" onClick={() => openEdit(row.original)}>
                <Pencil size={13} className="text-muted-foreground" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-[13px] text-[var(--danger)] focus:text-[var(--danger)] cursor-pointer" onClick={() => setDeleteTargets([row.original])}>
                <Trash2 size={13} />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], []);

  return (
    <>
      <PageHeader
        eyebrow={isLoading ? "Loading…" : `${counts.all} contract${counts.all === 1 ? "" : "s"}`}
        title="Projects"
        subtitle="Every contract, its risk, and its processing status — in one workspace."
        actions={
          <Link href="/projects/new" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">
            <Plus size={14} strokeWidth={2.5} />Upload contract
          </Link>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-5">
        {/* Saved views */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all", label: "All" },
            { key: "risk", label: "High risk" },
            { key: "processing", label: "Processing" },
            { key: "failed", label: "Needs attention" },
          ] as const).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              data-active={view === v.key}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-muted text-[12.5px] font-medium text-muted-foreground data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)] data-[active=true]:border-[var(--brand-primary-200)] transition-colors"
            >
              {v.label}
              <span className="tabular-nums text-[11px] opacity-70">{isLoading ? "…" : counts[v.key]}</span>
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          enableSelection
          searchPlaceholder="Search by title or party…"
          getRowId={(d) => d.docId}
          initialPageSize={25}
          toolbar={
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "ALL" | DocType)}>
                <SelectTrigger className="h-8 text-[12.5px] w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}><Download size={13} />Export</Button>
            </div>
          }
          bulkActions={(sel) => (
            <Button variant="outline" size="sm" className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)]" onClick={() => setDeleteTargets(sel)}>
              <Trash2 size={13} />Delete {sel.length}
            </Button>
          )}
          empty={{
            title: view === "all" && typeFilter === "ALL" ? "No contracts yet" : "No contracts match these filters",
            description: view === "all" && typeFilter === "ALL"
              ? "Upload your first SOW and Bluely will extract clauses, score risk, and build the workspace."
              : "Try a different view or type filter.",
            action: view === "all" && typeFilter === "ALL"
              ? <Button variant="primary" size="md" asChild><Link href="/projects/new"><Plus size={14} />Upload your first contract</Link></Button>
              : <Button variant="outline" size="sm" onClick={() => { setView("all"); setTypeFilter("ALL"); }}>Clear filters</Button>,
          }}
        />
      </div>

      {/* Delete confirmation (single + bulk) */}
      <AlertDialog open={!!deleteTargets} onOpenChange={(open) => !open && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTargets && deleteTargets.length > 1 ? `Delete ${deleteTargets.length} documents?` : "Delete document?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargets && deleteTargets.length === 1 ? <><strong>{deleteTargets[0].title || "This document"}</strong> and all its versions, clauses, and analytics will be permanently removed.</> : "All selected documents and their versions, clauses, and analytics will be permanently removed."} This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white">
              {deleting ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Document title" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Document type</label>
              <Select value={editDocType} onValueChange={(v) => setEditDocType(v as DocType)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Lifecycle stage</label>
              <Select value={editLifecycle} onValueChange={(v) => setEditLifecycle(v as Lifecycle)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{LIFECYCLE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusCell({ status, lifecycle }: { status: string; lifecycle: Lifecycle }) {
  if (status === "READY") {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-[var(--success-soft)] text-[var(--success)] capitalize"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />{lifecycle}</span>;
  }
  if (status === "FAILED") {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-[var(--danger-soft)] text-[var(--danger)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />Failed</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-[var(--ink-100)] text-[var(--ink-600)]">
      <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary-400)] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-primary-500)]" /></span>
      {status.charAt(0) + status.slice(1).toLowerCase()}…
    </span>
  );
}
