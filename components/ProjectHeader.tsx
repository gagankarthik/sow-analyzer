"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, FileText, MoreHorizontal, Trash2, Copy, Layers, Loader2,
  Sparkles, CheckCircle2, ExternalLink, Building2, Eye,
} from "@/components/ui/icons";
import type { DocHeaderModel } from "@/lib/api";
import { useDeleteDocument } from "@/lib/queries/documents";
import { docTypeShort } from "@/lib/doc-types";
import { useUIStore } from "@/lib/stores/ui";
import { can } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import { ProjectTabs } from "@/components/ProjectTabs";
import { formatRelativeDays, formatDate } from "@/lib/format";
import { WorkflowLinkChip } from "@/components/govern/WorkflowLinkChip";

/** Header for one document. Every value shown is read from the API row
 *  (`project._raw`); there are no fallbacks that could pass for real data. */
export function ProjectHeader({ project }: { project: DocHeaderModel }) {
  const router = useRouter();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteDoc = useDeleteDocument();
  const deleting = deleteDoc.isPending;

  const raw = project._raw;
  const docId = raw.docId;
  const title = raw.title || "Untitled document";
  const status = raw.status;
  const partyCount = raw.parties?.length ?? 0;
  const clauseCount = raw.clauseCount;
  // The signed-in user's role on this document, from the server: `owner` for
  // their own uploads, else their role in the project it is shared through.
  const role = raw.role;
  const canDelete = can(role, "delete_document");
  const shared = !!role && role !== "owner";

  async function handleDelete() {
    try {
      // The shared mutation removes the document from every project and
      // refreshes the document list, so no page keeps showing it.
      await deleteDoc.mutateAsync(docId);
      toast.success("Document deleted");
      router.push("/projects");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
      setConfirmDelete(false);
    }
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <div>
      <div className="app-container pb-5 pt-4 md:pt-6">
        <Link
          href="/projects"
          className="-ml-1 mb-2 inline-flex h-10 items-center gap-1 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
        >
          <ChevronLeft size={14} />Back to projects
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          {/* Title block */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-structure-soft text-structure-soft-fg sm:inline-flex">
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="min-w-0 break-words text-2xl font-semibold leading-[1.2] tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
                <StatusBadge status={status} lifecycle={raw.lifecycle} />
                <WorkflowLinkChip docId={docId} />
              </div>

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-[var(--ink-700)]">{docTypeShort(raw.docType)}</span>
                <span className="font-mono text-xs">{String(docId).slice(0, 8).toUpperCase()}</span>
                <Dot />
                <span>v{raw.latestVersion}</span>
                {raw.updatedAt && (<><Dot /><span title={formatDate(raw.updatedAt)}>Updated {formatRelativeDays(raw.updatedAt)}</span></>)}
                {partyCount > 0 && (<><Dot /><span className="inline-flex items-center gap-1"><Building2 size={13} />{partyCount} part{partyCount === 1 ? "y" : "ies"}</span></>)}
                {typeof clauseCount === "number" && clauseCount > 0 && (<><Dot /><span>{clauseCount} clauses</span></>)}
              </div>

              {shared && role && (
                <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-[var(--ink-600)]">
                  <Eye size={14} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    <span className="font-semibold text-foreground">Shared with you{raw.ownerEmail ? ` by ${raw.ownerEmail}` : ""}</span>
                    {" · "}{ROLE_META[role].label}.{" "}
                    {role === "viewer" ? "You can read it; you cannot edit, re-analyze or delete it." : "You can edit and re-analyze it; only its owner can delete it."}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ai" size="lg" className="flex-1 md:h-9 md:flex-none" onClick={toggleCopilot}>
              <Sparkles size={14} />Ask Sonar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-lg" className="md:size-9" aria-label="Document actions"><MoreHorizontal size={16} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href={`/projects/${docId}/documents`}><Layers size={14} className="text-muted-foreground" />View versions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink} className="gap-2 cursor-pointer">
                  <Copy size={14} className="text-muted-foreground" />Copy link
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href={`/projects/${docId}/sow`}><ExternalLink size={14} className="text-muted-foreground" />Open SOW analyzer</Link>
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-soft)]">
                      <Trash2 size={14} />Delete document
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Section tabs: the one route to every sub-page of this document. */}
      <ProjectTabs projectId={docId} />

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{title}</strong> and all its versions, clauses, and analytics will be permanently removed, for everyone it is shared with. This cannot be undone.
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
    </div>
  );
}

function Dot() {
  return <span className="text-[var(--ink-300)]" aria-hidden>·</span>;
}

function StatusBadge({ status, lifecycle }: { status: string; lifecycle: string }) {
  if (status === "READY") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--success-soft)] text-[var(--success-fg)] shrink-0 capitalize">
        <CheckCircle2 size={12} />{lifecycle}
      </span>
    );
  }
  if (status === "FAILED") {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--danger-soft)] text-[var(--danger)] shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />Failed</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--ink-100)] text-[var(--ink-600)] shrink-0">
      <Loader2 size={12} className="animate-spin" />{status.charAt(0) + status.slice(1).toLowerCase()}…
    </span>
  );
}
