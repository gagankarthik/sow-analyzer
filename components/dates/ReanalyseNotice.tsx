"use client";

// Shown when a document was analysed before a feature existed (key dates,
// playbook grading), so what is on screen is incomplete rather than empty.
// It says so, and offers Re-analyse to people whose role allows it.

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw } from "@/components/ui/icons";
import { canReanalyse } from "@/lib/key-dates";
import { useReprocess } from "@/lib/queries/documents";
import { cn } from "@/lib/utils";

export function ReanalyseNotice({
  docId,
  role,
  title,
  children,
  busy = false,
  className,
}: {
  docId: string;
  /** The signed-in user's role on the document. Missing = treated as allowed. */
  role: string | null | undefined;
  title: string;
  children: React.ReactNode;
  /** The document is already being analysed. */
  busy?: boolean;
  className?: string;
}) {
  const reprocess = useReprocess();
  const allowed = canReanalyse(role);

  async function run() {
    try {
      await reprocess.mutateAsync(docId);
      toast.success("Re-analysing", { description: "This document is being analysed again. This page updates when it finishes." });
    } catch (e) {
      toast.error("Couldn't start the re-analysis", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-[var(--info)]/30 bg-[var(--info-soft)] p-4 sm:flex-row sm:items-start md:px-5", className)}>
      <Info size={18} className="mt-0.5 hidden shrink-0 text-[var(--info)] sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-700)]">{children}</p>
        {!allowed && (
          <p className="mt-1.5 text-sm text-[var(--ink-700)]">Your role on this document is view-only. Ask its owner or an editor to re-analyse it.</p>
        )}
      </div>
      {allowed && (
        <Button variant="outline" size="lg" className="w-full shrink-0 sm:w-auto md:h-9" onClick={run} disabled={reprocess.isPending || busy}>
          <RefreshCw size={14} className={reprocess.isPending ? "animate-spin motion-reduce:animate-none" : undefined} />
          {reprocess.isPending ? "Starting…" : busy ? "Analysing…" : "Re-analyse"}
        </Button>
      )}
    </div>
  );
}
