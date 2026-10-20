"use client";

import { useEditionFeature, useEditionTerms } from "@/lib/govern/queries";
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
  ChevronDown, Trash2, Copy, Layers, Loader2, Sonar, CheckCircle2, ExternalLink, Eye, XCircle,
} from "@/components/ui/icons";
import { RecordHeader, type Highlight } from "@/components/ds/Record";
import type { DocHeaderModel } from "@/lib/api";
import { useDeleteDocument } from "@/lib/queries/documents";
import { docTypeShort } from "@/lib/doc-types";
import { useUIStore } from "@/lib/stores/ui";
import { can } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import { ProjectTabs } from "@/components/ProjectTabs";
import { displayTitle, formatRelativeDays, formatDate } from "@/lib/format";
import { WorkflowLinkChip } from "@/components/govern/WorkflowLinkChip";

const NUMBER = new Intl.NumberFormat("en-US");

/** Header band for one document (UI_SPEC section 8): breadcrumb, the
 *  document name with its object tag, a highlights strip, one action and an
 *  "Actions" menu, then the sub-page tabs. Every value shown is read from the
 *  API row (`project._raw`); there are no fallbacks that could pass for real data. */
export function ProjectHeader({ project }: { project: DocHeaderModel }) {
  const showSow = useEditionFeature("sowDocuments");
  const terms = useEditionTerms();
  const router = useRouter();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteDoc = useDeleteDocument();
  const deleting = deleteDoc.isPending;

  const raw = project._raw;
  const docId = raw.docId;
  const title = displayTitle(raw.title) || "Untitled document";
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
      toast.error("Couldn't delete the document", { description: e instanceof Error ? e.message : "Try again." });
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

  const highlights: Highlight[] = [
    { label: "Status", value: <StatusBadge status={status} lifecycle={raw.lifecycle} /> },
    { label: "Type", value: docTypeShort(raw.docType) },
    { label: "Version", value: `v${raw.latestVersion}` },
    {
      label: "Parties",
      value: partyCount > 0 ? NUMBER.format(partyCount) : "—",
    },
    raw.updatedAt
      ? { label: "Updated", value: <span title={formatDate(raw.updatedAt)}>{formatRelativeDays(raw.updatedAt)}</span> }
      : { label: "Clauses", value: typeof clauseCount === "number" ? NUMBER.format(clauseCount) : "—" },
  ];

  return (
    <>
      <RecordHeader
        breadcrumb={[{ label: terms.projects, href: "/projects" }, { label: title }]}
        title={title}
        objectTag="Project"
        highlights={highlights}
        primaryAction={
          <Button variant="ai" className="max-md:flex-1" onClick={toggleCopilot}>
            <Sonar size={16} aria-hidden />Ask Sonar
          </Button>
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions<ChevronDown size={12} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href={`/projects/${docId}/documents`}><Layers size={16} aria-hidden className="text-muted-foreground" />View versions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink} className="cursor-pointer gap-2">
                <Copy size={16} aria-hidden className="text-muted-foreground" />Copy link
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href={`/projects/${docId}/sow`}><ExternalLink size={16} aria-hidden className="text-muted-foreground" />{showSow ? "Open SOW analyzer" : "Open clause analysis"}</Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="cursor-pointer gap-2 text-[var(--danger)] focus:bg-[var(--danger-soft)] focus:text-[var(--danger)]">
                    <Trash2 size={16} aria-hidden />Delete document…
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        {/* Empty (and hidden) unless the document is in workflow or shared. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 empty:hidden">
          <WorkflowLinkChip docId={docId} />
          {shared && role && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-600)]">
              <Eye size={12} aria-hidden className="shrink-0" />
              <span className="min-w-0 truncate">
                Shared with you{raw.ownerEmail ? ` by ${raw.ownerEmail}` : ""} · {ROLE_META[role].label}
                {role === "viewer" ? " (read only)" : " (only the owner can delete)"}
              </span>
            </p>
          )}
        </div>
        {/* Section tabs: the one route to every sub-page of this document.
            They sit on the band's bottom border. */}
        <div className="-mb-4">
          <ProjectTabs projectId={docId} />
        </div>
      </RecordHeader>

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
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90">
              {deleting ? <><Loader2 size={12} aria-hidden className="mr-1.5 animate-spin" />Deleting…</> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Analysis state: words plus an icon, never colour alone. */
function StatusBadge({ status, lifecycle }: { status: string; lifecycle: string }) {
  if (status === "READY") {
    return (
      <span className="inline-flex items-center gap-1 capitalize text-[var(--success-fg)]">
        <CheckCircle2 size={12} aria-hidden />{lifecycle}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--danger)]">
        <XCircle size={12} aria-hidden />Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[var(--ink-600)]">
      <Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />
      {status.charAt(0) + status.slice(1).toLowerCase()}…
    </span>
  );
}
