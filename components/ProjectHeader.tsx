"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
  Sparkles, CheckCircle2, ExternalLink, Building2,
} from "@/components/ui/icons";
import { deleteDocument } from "@/lib/api";
import { documentKeys } from "@/lib/queries/documents";
import { removeDocFromAllProjects } from "@/lib/projects-store";
import { useUIStore } from "@/lib/stores/ui";
import { formatRelativeDays, formatDate } from "@/lib/format";
import type { Project, ApiDocument } from "@/lib/types";

type HeaderProject = Project & { _raw?: ApiDocument };

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

export function ProjectHeader({ project }: { project: HeaderProject }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const raw = project._raw;
  const docId = raw?.docId ?? project.id;
  const title = raw?.title || project.name || "Untitled";
  const docType = raw?.docType ?? project.tags?.[0] ?? "OTHER";
  const status = raw?.status ?? "READY";
  const version = raw?.latestVersion ?? project.amendments ?? 1;
  const updatedAt = raw?.updatedAt ?? project.signed ?? "";
  const partyCount = raw?.parties?.length ?? 0;
  const clauseCount = raw?.clauseCount;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDocument(docId);
      removeDocFromAllProjects(docId);
      await qc.invalidateQueries({ queryKey: documentKeys.all });
      toast.success("Document deleted");
      router.push("/projects");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Please try again." });
      setDeleting(false);
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
    <div className="border-b border-border bg-card">
      <div className="app-container pt-5 md:pt-6 pb-4">
        <Link href="/projects" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft size={13} />Back to projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          {/* Title block */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0">
                <FileText size={17} strokeWidth={1.75} />
              </span>
              <h1 className="text-[clamp(18px,2vw,24px)] font-bold tracking-tight text-foreground leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h1>
              <StatusBadge status={status} lifecycle={project.status} />
            </div>

            {/* Meta row */}
            <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px] text-muted-foreground pl-[46px]">
              <span className="font-mono text-[11px]">{String(docId).slice(0, 8).toUpperCase()}</span>
              <Dot />
              <span>v{version}</span>
              <Dot />
              <span title={formatDate(updatedAt)}>Updated {formatRelativeDays(updatedAt)}</span>
              <Dot />
              <span className="font-medium text-foreground">{docType}</span>
              {partyCount > 0 && (<><Dot /><span className="inline-flex items-center gap-1"><Building2 size={11} />{partyCount} part{partyCount === 1 ? "y" : "ies"}</span></>)}
              {typeof clauseCount === "number" && clauseCount > 0 && (<><Dot /><span>{clauseCount} clauses</span></>)}
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2">
            <Button variant="ai" size="md" className="gap-1.5" onClick={toggleCopilot}>
              <Sparkles size={13} />Ask Sonar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Document actions"><MoreHorizontal size={15} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href={`/projects/${docId}/documents`}><Layers size={13} className="text-muted-foreground" />View versions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink} className="gap-2 cursor-pointer">
                  <Copy size={13} className="text-muted-foreground" />Copy link
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href={`/projects/${docId}/sow`}><ExternalLink size={13} className="text-muted-foreground" />Open SOW analyzer</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-soft)]">
                  <Trash2 size={13} />Delete document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{title}</strong> and all its versions, clauses, and analytics will be permanently removed. This cannot be undone.
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
  return <span className="text-muted-foreground/40" aria-hidden>·</span>;
}

function StatusBadge({ status, lifecycle }: { status: string; lifecycle: string }) {
  if (status === "READY") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--success-soft)] text-[var(--success)] shrink-0 capitalize">
        <CheckCircle2 size={11} />{lifecycle}
      </span>
    );
  }
  if (status === "FAILED") {
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--danger-soft)] text-[var(--danger)] shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />Failed</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--ink-100)] text-[var(--ink-600)] shrink-0">
      <Loader2 size={10} className="animate-spin" />{status.charAt(0) + status.slice(1).toLowerCase()}…
    </span>
  );
}
