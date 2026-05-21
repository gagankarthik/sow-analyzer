"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw,
} from "@/components/ui/icons";
import { getUploadUrl, uploadToS3WithProgress, getDocument } from "@/lib/api";
import type { DocType } from "@/lib/types";

const ACCEPTED = ".pdf,.docx,.doc,.txt";
const isAccepted = (f: File) => /\.(pdf|docx?|txt)$/i.test(f.name);

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "SOW", label: "Statement of Work (SOW)" },
  { value: "MSA", label: "Master Service Agreement (MSA)" },
  { value: "AMENDMENT", label: "Amendment" },
  { value: "NDA", label: "Non-Disclosure Agreement (NDA)" },
  { value: "OTHER", label: "Other" },
];

type QueueItem = { id: string; file: File; docType: DocType };

export type UploadDropzoneProps = {
  /** Initial document type applied to newly-added files. */
  defaultDocType?: DocType;
  /** Hide the document-type selector and force a single type. */
  showTypeSelector?: boolean;
  /** Smaller dropzone, for in-context (inside a project) use. */
  compact?: boolean;
  /** Fired once the backend row is created (docId known), before processing. */
  onDocCreated?: (docId: string, file: File) => void;
  /** Fired when a document reaches READY. */
  onDocReady?: (docId: string) => void;
  /** Show a per-item "Open" link to the document workspace. */
  linkOnReady?: boolean;
};

export function UploadDropzone({
  defaultDocType = "SOW",
  showTypeSelector = true,
  compact = false,
  onDocCreated,
  onDocReady,
  linkOnReady = true,
}: UploadDropzoneProps) {
  const [docType, setDocType] = useState<DocType>(defaultDocType);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [reject, setReject] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const accepted: QueueItem[] = [];
    let rejected = 0;
    Array.from(files).forEach((f) => {
      if (isAccepted(f)) accepted.push({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file: f, docType });
      else rejected++;
    });
    setReject(rejected > 0 ? `${rejected} file${rejected === 1 ? "" : "s"} skipped — only PDF, DOCX, DOC, and TXT are accepted.` : null);
    if (accepted.length) setQueue((q) => [...accepted, ...q]);
    if (inputRef.current) inputRef.current.value = "";
  }, [docType]);

  return (
    <div className="space-y-4">
      {showTypeSelector && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <label className="mb-1.5 block text-[12px] font-medium text-foreground">Document type</label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
            <SelectTrigger className="h-9 w-full text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">Applied to files you add next. You can change a document&apos;s type later.</p>
        </div>
      )}

      <label
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${compact ? "py-10" : "py-20"} ${
          dragOver ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-border bg-muted/30 hover:border-[var(--brand-primary-300)] hover:bg-muted"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">
          <Upload size={22} strokeWidth={1.75} />
        </span>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-foreground">Drop {showTypeSelector ? "contracts" : "your SOW"} here, or <span className="text-[var(--brand-primary-700)]">browse</span></p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">PDF, DOCX, DOC, TXT · up to 50 MB · processed privately in your tenant</p>
        </div>
      </label>

      {reject && (
        <div className="flex items-start gap-2.5 rounded-md border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <p className="text-[12.5px] text-[var(--warning)]">{reject}</p>
        </div>
      )}

      {queue.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {queue.map((item) => (
            <UploadItem
              key={item.id}
              item={item}
              linkOnReady={linkOnReady}
              onDocCreated={onDocCreated}
              onDocReady={onDocReady}
              onRemove={() => setQueue((q) => q.filter((x) => x.id !== item.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type Phase = "uploading" | "processing" | "ready" | "failed";

function UploadItem({
  item, onRemove, onDocCreated, onDocReady, linkOnReady,
}: {
  item: QueueItem;
  onRemove: () => void;
  onDocCreated?: (docId: string, file: File) => void;
  onDocReady?: (docId: string) => void;
  linkOnReady: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("uploading");
  const [progress, setProgress] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState("PENDING");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Latest callbacks kept in a ref so the upload effect doesn't re-run when the
  // parent re-renders with new closures.
  const cbRef = useRef({ onDocCreated, onDocReady });
  cbRef.current = { onDocCreated, onDocReady };

  // Refs survive React Strict Mode's mount→unmount→mount cycle. getUploadUrl
  // creates a document row server-side, so it must fire EXACTLY ONCE per
  // attempt — otherwise Strict Mode's double-invoke leaves an orphaned PENDING
  // document (the duplicate-row bug).
  const startedAttempt = useRef(-1);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (startedAttempt.current === attempt) return; // ignore Strict Mode's 2nd invoke
    startedAttempt.current = attempt;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    const safe = (fn: () => void) => { if (mountedRef.current) fn(); };
    let notFound = 0;

    (async () => {
      safe(() => { setPhase("uploading"); setProgress(0); setErrorMsg(null); });
      try {
        const { uploadUrl, docId: id } = await getUploadUrl(item.file.name, item.docType);
        safe(() => setDocId(id));
        cbRef.current.onDocCreated?.(id, item.file);
        await uploadToS3WithProgress(uploadUrl, item.file, (p) => safe(() => setProgress(p)));
        safe(() => setPhase("processing"));
        const poll = () => {
          getDocument(id)
            .then((d) => {
              notFound = 0;
              safe(() => setDocStatus(d.document.status));
              if (d.document.status === "READY") { safe(() => setPhase("ready")); cbRef.current.onDocReady?.(id); }
              else if (d.document.status === "FAILED") safe(() => { setPhase("failed"); setErrorMsg(d.document.errorMessage || "Processing failed."); });
              else timerRef.current = setTimeout(poll, 4000);
            })
            .catch((e: unknown) => {
              if (notFound++ < 8) timerRef.current = setTimeout(poll, 4000);
              else safe(() => { setPhase("failed"); setErrorMsg(e instanceof Error ? e.message : "Could not read processing status."); });
            });
        };
        poll();
      } catch (e) {
        safe(() => { setPhase("failed"); setErrorMsg(e instanceof Error ? e.message : "Upload failed."); });
      }
    })();
  }, [item, attempt]);

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
          <FileText size={14} className="text-[var(--brand-primary-600)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {phase === "ready" && docId && linkOnReady ? (
              <Link href={`/projects/${docId}`} className="truncate text-[13px] font-semibold text-foreground transition-colors hover:text-[var(--brand-primary-700)]">{item.file.name}</Link>
            ) : (
              <span className="truncate text-[13px] font-semibold text-foreground">{item.file.name}</span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <PhaseBadge phase={phase} status={docStatus} />
              {(phase === "ready" || phase === "failed") && (
                <button onClick={onRemove} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Remove from queue"><X size={13} /></button>
              )}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatBytes(item.file.size)} · {item.docType}</p>

          {phase === "uploading" && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[var(--brand-primary-600)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[10.5px] tabular-nums text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}

          {phase === "processing" && <div className="mt-3"><PipelineStepper status={docStatus} showLabels={false} /></div>}

          {phase === "ready" && docId && linkOnReady && (
            <Link href={`/projects/${docId}`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)]">
              Open analysis <ArrowRight size={11} strokeWidth={2.25} />
            </Link>
          )}

          {phase === "failed" && (
            <div className="mt-2 space-y-2">
              {errorMsg && <p className="break-words text-[11.5px] leading-snug text-[var(--danger)]">{errorMsg.length > 160 ? errorMsg.slice(0, 160) + "…" : errorMsg}</p>}
              <Button variant="outline" size="sm" onClick={() => setAttempt((a) => a + 1)}><RefreshCw size={12} />Retry</Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function PhaseBadge({ phase, status }: { phase: Phase; status: string }) {
  if (phase === "uploading") return <Pill tone="brand"><Loader2 size={10} className="animate-spin" />Uploading</Pill>;
  if (phase === "processing") return <Pill tone="brand"><Loader2 size={10} className="animate-spin" />{status.charAt(0) + status.slice(1).toLowerCase()}</Pill>;
  if (phase === "ready") return <Pill tone="success"><CheckCircle2 size={10} />Ready</Pill>;
  return <Pill tone="danger"><AlertCircle size={10} />Failed</Pill>;
}

function Pill({ tone, children }: { tone: "brand" | "success" | "danger"; children: React.ReactNode }) {
  const cls = {
    brand: "bg-[var(--ink-100)] text-[var(--ink-600)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}
