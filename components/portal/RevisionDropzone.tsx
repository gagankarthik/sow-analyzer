"use client";

// The one place to hand back a revised version: drop or choose a PDF / Word
// file, upload it, see that it arrived.

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileUp, Loader2 } from "@/components/ui/icons";
import { PORTAL_ACCEPT, checkPortalFile, fileSizeText } from "@/lib/portal/helpers";
import { putPortalFile, requestPortalUpload } from "@/lib/portal/public";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; pct: number }
  | { kind: "done"; name: string }
  | { kind: "failed"; message: string };

export function RevisionDropzone({ token }: { token: string }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  function choose(next: File | undefined | null) {
    if (!next) return;
    const check = checkPortalFile(next);
    setPhase({ kind: "idle" });
    if (!check.ok) {
      setFile(null);
      setProblem(check.error);
      return;
    }
    setProblem(null);
    setFile(next);
  }

  async function upload() {
    if (!file) return;
    setPhase({ kind: "uploading", pct: 0 });
    try {
      const ticket = await requestPortalUpload(token, file);
      await putPortalFile(ticket, file, (pct) => setPhase({ kind: "uploading", pct }));
      setPhase({ kind: "done", name: file.name });
      setFile(null);
      if (input.current) input.current.value = "";
    } catch (e) {
      setPhase({ kind: "failed", message: e instanceof Error ? e.message : "The upload didn't finish. Please try again." });
    }
  }

  if (phase.kind === "done") {
    return (
      <section aria-labelledby="portal-upload" className="flex flex-col gap-3">
        <h2 id="portal-upload" className="text-base font-semibold text-foreground">Revised version</h2>
        <div role="status" className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Received</p>
            <p className="text-sm text-[var(--ink-600)] [overflow-wrap:anywhere]">
              {phase.name} is with your contact now. You can close this page.
            </p>
            <button type="button" onClick={() => setPhase({ kind: "idle" })} className="mt-1 self-start text-sm font-medium text-[var(--brand-primary-600)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)]">
              Upload another file
            </button>
          </div>
        </div>
      </section>
    );
  }

  const busy = phase.kind === "uploading";
  return (
    <section aria-labelledby="portal-upload" className="flex flex-col gap-3">
      <h2 id="portal-upload" className="text-base font-semibold text-foreground">Revised version</h2>
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) choose(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-start gap-1 rounded-lg border border-dashed border-[var(--ink-300)] bg-card px-4 py-6 transition-colors duration-150",
          "hover:border-[var(--brand-primary-600)] has-[:focus-visible]:border-[var(--brand-primary-600)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-primary-600)]",
          dragging && "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]",
          busy && "pointer-events-none opacity-70",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileUp size={16} className="text-[var(--ink-500)]" aria-hidden />
          {file ? file.name : "Drop the file here, or choose one"}
        </span>
        <span className="text-xs text-[var(--ink-600)]">
          {file ? fileSizeText(file.size) : "PDF or Word (.docx), up to 25 MB"}
        </span>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={PORTAL_ACCEPT}
          className="sr-only"
          disabled={busy}
          aria-describedby={problem ? `${inputId}-problem` : undefined}
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </label>
      {problem && <p id={`${inputId}-problem`} role="alert" className="text-sm text-[var(--danger)]">{problem}</p>}
      {phase.kind === "failed" && <p role="alert" className="text-sm text-[var(--danger)]">{phase.message}</p>}
      <div className="flex items-center gap-3">
        <Button type="button" size="lg" variant="primary" onClick={upload} disabled={!file || busy}>
          {busy && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
          {busy ? `Uploading ${phase.pct}%` : "Upload revised version"}
        </Button>
        {busy && (
          <progress value={phase.pct} max={100} aria-label="Upload progress" className="h-1.5 w-32 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--ink-100)] [&::-webkit-progress-value]:bg-[var(--brand-primary-600)] [&::-moz-progress-bar]:bg-[var(--brand-primary-600)]" />
        )}
      </div>
    </section>
  );
}
