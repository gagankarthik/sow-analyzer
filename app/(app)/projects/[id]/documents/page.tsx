"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch, Trash2, Clock, FileText, Layers, Loader2, Files, Upload, Lock,
  MoreHorizontal, CheckCircle2, Building2,
} from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useDeleteVersion, useDeleteDocument } from "@/lib/queries/documents";
import { formatDate, formatRelativeDays } from "@/lib/format";
import type { ApiVersion } from "@/lib/types";

type Project = ReturnType<typeof apiDocToProject>;

function methodLabel(m: string): string {
  return m ? m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);
  const deleteVersionMut = useDeleteVersion(id);
  const deleteDocMut = useDeleteDocument();

  const [versionTarget, setVersionTarget] = useState<number | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(false);

  if (isLoading) return <DocumentsSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  if (isError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">{error instanceof Error ? error.message : "Failed to load document"}</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }
  if (!detail) return null;

  const project: Project = apiDocToProject(detail.document);
  const doc = detail.document;
  const versions = [...detail.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = versions[0]?.versionNumber ?? 0;
  const filename = doc.rawKey ? doc.rawKey.split("/").pop() || "—" : "—";
  const isLastVersion = versions.length <= 1;

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
      <ProjectTabs projectId={project.id} />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8 space-y-6">
            {/* Toolbar */}
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Versions · {versions.length}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">Every processed version of this document. Bluely indexes each one.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="md" asChild><Link href="/projects/new"><Upload size={13} />Upload new</Link></Button>
                <Button variant="outline" size="md" className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)]" onClick={() => setConfirmDeleteDoc(true)}>
                  <Trash2 size={13} />Delete document
                </Button>
              </div>
            </div>

            {/* Versions table */}
            {versions.length === 0 ? (
              <EmptyState />
            ) : (
              <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        <th className="text-left px-4 py-2.5">Version</th>
                        <th className="text-left px-4 py-2.5">Filename</th>
                        <th className="text-left px-4 py-2.5">Status</th>
                        <th className="text-left px-4 py-2.5">Extraction</th>
                        <th className="text-left px-4 py-2.5">Uploaded</th>
                        <th className="px-4 py-2.5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <VersionRow
                          key={v.versionNumber}
                          v={v}
                          filename={filename}
                          isCurrent={v.versionNumber === latestVersion}
                          onDelete={() => setVersionTarget(v.versionNumber)}
                          sowHref={`/projects/${id}/sow`}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Upload zone */}
            <Link href="/projects/new" className="block rounded-xl border-2 border-dashed border-border bg-card/40 hover:bg-card hover:border-[var(--brand-primary-400)] transition-colors p-8 text-center group">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] mb-4 group-hover:scale-110 transition-transform"><Upload size={18} strokeWidth={1.75} /></span>
              <h3 className="text-[14px] font-semibold text-foreground">Upload a new version</h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground max-w-xs mx-auto">Drop an updated document — Bluely will diff it against the current version automatically.</p>
            </Link>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Document info</div>
              <ul className="space-y-2.5 text-[12.5px]">
                <Row label="Type"><span className="font-semibold text-foreground">{doc.docType}</span></Row>
                <Row label="Lifecycle"><span className="font-semibold text-foreground capitalize">{doc.lifecycle}</span></Row>
                <Row label="Status"><Badge variant={doc.status === "READY" ? "success" : doc.status === "FAILED" ? "danger" : "warning"} size="sm" className="font-mono">{doc.status}</Badge></Row>
                <Row label="Versions"><span className="font-semibold text-foreground tabular-nums">{versions.length}</span></Row>
                {doc.effectiveDate && <Row label="Effective"><span className="font-semibold text-foreground">{formatDate(doc.effectiveDate)}</span></Row>}
                <Row label="Encryption"><span className="inline-flex items-center gap-1 text-[var(--success)] font-semibold"><Lock size={11} />AES-256</span></Row>
              </ul>
            </div>

            {doc.parties.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Parties</div>
                <ul className="space-y-2">
                  {doc.parties.map((p) => (
                    <li key={p} className="flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0"><Building2 size={13} strokeWidth={1.75} /></span>
                      <span className="text-[12.5px] font-medium text-foreground truncate">{p}</span>
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
                ? "This is the only version — deleting it removes the entire document, including all clauses and analytics. This cannot be undone."
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

function VersionRow({ v, filename, isCurrent, onDelete, sowHref }: {
  v: ApiVersion; filename: string; isCurrent: boolean; onDelete: () => void; sowHref: string;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground shrink-0"><Layers size={12} /></span>
          <span className="text-[13px] font-semibold text-foreground">v{v.versionNumber}</span>
          {isCurrent && <Badge variant="neutral" size="sm" className="bg-[var(--success-soft)] text-[var(--success)] text-[9.5px]">current</Badge>}
        </div>
      </td>
      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground"><FileText size={13} className="text-muted-foreground shrink-0" /><span className="truncate max-w-[180px]">{filename}</span></span></td>
      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]"><CheckCircle2 size={11} />Processed</span></td>
      <td className="px-4 py-3"><span className="text-[12.5px] text-muted-foreground font-mono">{methodLabel(v.extractionMethod)}</span></td>
      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[11.5px] font-mono text-muted-foreground" title={formatDate(v.createdAt)}><Clock size={10} />{formatRelativeDays(v.createdAt)}</span></td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Version actions"><MoreHorizontal size={15} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild className="gap-2 cursor-pointer"><Link href={sowHref}><FileText size={13} className="text-muted-foreground" />View clauses</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-soft)]">
              <Trash2 size={13} />{isCurrent ? "Delete (rollback)" : "Delete version"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <li className="flex items-baseline justify-between gap-2"><span className="text-muted-foreground">{label}</span>{children}</li>;
}

function EmptyState() {
  return (
    <section className="rounded-xl border border-border bg-card p-12 flex flex-col items-center text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4"><Layers size={20} strokeWidth={1.5} /></span>
      <h3 className="text-[14px] font-semibold text-foreground">No versions yet</h3>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground max-w-xs">No processed versions found. Upload a file to get started.</p>
    </section>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5"><Files size={24} strokeWidth={1.5} /></span>
      <h1 className="text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em" }}>Project not found</h1>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">This engagement may have been archived, or the link is out of date.</p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">Back to projects</Link>
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card"><div className="app-container pt-5 md:pt-6 pb-4 space-y-3"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <div className="border-b border-border bg-card"><div className="app-container"><div className="flex items-center gap-6 h-9">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-16" />)}</div></div></div>
      <div className="app-container py-6 md:py-8"><div className="grid grid-cols-1 lg:grid-cols-12 gap-6"><div className="lg:col-span-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-48 rounded-xl" /></div><div className="lg:col-span-4 space-y-5"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div></div></div>
    </>
  );
}
