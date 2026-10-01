"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw,
} from "@/components/ui/icons";
import {
  getUploadUrl, uploadToS3WithProgress, getDocument, deleteDocument, reprocessDocument,
  errorCode, errorStatus, isForbidden,
} from "@/lib/api";
import { noteDocFiled, removeDocFromAllProjects } from "@/lib/projects-store";
import { useInvalidateDocuments } from "@/lib/queries/documents";
import type { DocType } from "@/lib/types";

// Mirrors the backend upload-url handler: it signs uploads for .pdf, .docx and
// .txt only (legacy .doc has no parser) and accepts file names of 1 to 200
// characters from the set below.
const ACCEPTED = ".pdf,.docx,.txt";
const MAX_BYTES = 50 * 1024 * 1024;
const isAccepted = (f: File) => /\.(pdf|docx|txt)$/i.test(f.name);

/** The name sent to the backend: unsupported characters become "_". */
function uploadName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = name.slice(dot);
  const stem = name.slice(0, dot).replace(/[^A-Za-z0-9._ -]/g, "_").trim().slice(0, 200 - ext.length);
  return `${stem || "document"}${ext}`;
}

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
  { value: "LICENSE", label: "Licence / Technology Agreement" },
  { value: "DPA", label: "Data Processing Agreement (DPA)" },
  { value: "BAA", label: "Business Associate Agreement (BAA)" },
  { value: "COMPLIANCE", label: "Compliance (SOC 2 / VPAT / Policy)" },
  { value: "OTHER", label: "Other" },
];

type QueueItem = { id: string; file: File; docType: DocType; projectId?: string };

// The API signs an upload link for 5 minutes. A retry inside this window sends
// the file to the same link (and the same document) instead of asking for a new one.
const UPLOAD_LINK_MS = 4 * 60_000;

/** One document row created by `GET /documents/upload-url`, and how far it got. */
type Ticket = { docId: string; uploadUrl: string; issuedAt: number; stored: boolean };

/**
 * Remove the document row of an upload whose file never arrived. It is deleted
 * only while the server still shows it as PENDING — once the pipeline has
 * picked a file up, the document is real and is left alone.
 */
async function discardIfEmpty(docId: string): Promise<"removed" | "has-file" | "unknown"> {
  try {
    const { document } = await getDocument(docId);
    if (document.status !== "PENDING") return "has-file";
    await deleteDocument(docId);
    removeDocFromAllProjects(docId);
    return "removed";
  } catch (e) {
    return errorStatus(e) === 404 ? "removed" : "unknown";
  }
}

/** Why an upload could not start or finish, in the user's terms. */
function uploadFailure(e: unknown, intoProject: boolean): string {
  if (isForbidden(e)) {
    return intoProject
      ? "You do not have permission to upload to this project. Only its owner and editors can add documents."
      : "You do not have permission to do this.";
  }
  if (intoProject && errorStatus(e) === 404) return "This project no longer exists, or is no longer shared with you.";
  return e instanceof Error && e.message ? e.message : "Upload failed.";
}

export type UploadDropzoneProps = {
  /**
   * Upload into this project. The server checks that the signed-in user may
   * upload there (owner or editor) and files the new document in the project
   * itself, so the caller does not add it afterwards. Leave unset for a
   * document that belongs to no project.
   */
  projectId?: string;
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
  projectId,
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
  const typeId = useId();

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const accepted: QueueItem[] = [];
    let rejected = 0;
    let wrongSize = 0;
    Array.from(files).forEach((f) => {
      if (!isAccepted(f)) rejected++;
      else if (f.size === 0 || f.size > MAX_BYTES) wrongSize++;
      else accepted.push({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file: f, docType, projectId });
    });
    const notes: string[] = [];
    if (rejected > 0) notes.push(`${rejected} file${rejected === 1 ? "" : "s"} skipped. Only PDF, DOCX and TXT are accepted.`);
    if (wrongSize > 0) notes.push(`${wrongSize} file${wrongSize === 1 ? "" : "s"} skipped. Files must not be empty or larger than 50 MB.`);
    setReject(notes.length ? notes.join(" ") : null);
    if (accepted.length) setQueue((q) => [...accepted, ...q]);
    if (inputRef.current) inputRef.current.value = "";
  }, [docType, projectId]);

  return (
    <div className="space-y-4">
      {showTypeSelector && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <label htmlFor={typeId} className="mb-1.5 block text-sm font-medium text-foreground">Document type</label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
            <SelectTrigger id={typeId} className="w-full border-[var(--ink-300)] text-base data-[size=default]:h-10 sm:max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">Applied to files you add next. You can change a document&apos;s type later.</p>
        </div>
      )}

      <label
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 transition-colors focus-within:border-[var(--brand-primary-600)] focus-within:ring-2 focus-within:ring-[var(--brand-primary-200)] ${compact ? "py-8 sm:py-10" : "py-12 sm:py-16"} ${
          dragOver ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-[var(--ink-300)] bg-card hover:border-[var(--brand-primary-400)] hover:bg-[var(--brand-primary-50)]"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-600)] text-white">
          <Upload size={22} strokeWidth={1.75} />
        </span>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Drop {showTypeSelector ? "contracts" : "your SOW"} here, or <span className="text-[var(--brand-primary-600)] underline underline-offset-2">browse</span></p>
          <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-snug text-muted-foreground">PDF, DOCX, TXT · up to 50 MB · processed privately in your tenant</p>
        </div>
      </label>

      {reject && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <p className="text-sm text-[var(--warning)]">{reject}</p>
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

  // Every upload refreshes the shared document list — when the row is created
  // (so it shows up everywhere as "processing" and polling starts) and again
  // when it finishes or fails — wherever this dropzone is used.
  const invalidateDocuments = useInvalidateDocuments();

  // Latest callbacks kept in a ref so the upload effect doesn't re-run when the
  // parent re-renders with new closures.
  const cbRef = useRef({ onDocCreated, onDocReady, invalidateDocuments });
  cbRef.current = { onDocCreated, onDocReady, invalidateDocuments };

  // Refs survive React Strict Mode's mount→unmount→mount cycle. getUploadUrl
  // creates a document row server-side, so it must fire EXACTLY ONCE per
  // attempt — otherwise Strict Mode's double-invoke leaves an orphaned PENDING
  // document (the duplicate-row bug).
  const startedAttempt = useRef(-1);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The document row this item created. The API mints a new document on every
  // upload-url call and has no way to re-issue a link for an existing one, so a
  // retry reuses this row wherever it can instead of creating another.
  const ticketRef = useRef<Ticket | null>(null);

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
        let ticket = ticketRef.current;
        if (ticket && !ticket.stored && Date.now() - ticket.issuedAt > UPLOAD_LINK_MS) {
          // The link expired. If no file ever arrived, that row will never get
          // one: remove it and start over. If one did arrive, follow that document.
          const fate = await discardIfEmpty(ticket.docId);
          if (fate === "has-file") ticket.stored = true;
          else ticket = ticketRef.current = null;
        } else if (ticket?.stored) {
          // The file reached storage and the analysis failed: run the analysis
          // again on the same document rather than uploading a second copy.
          safe(() => { setPhase("processing"); setDocStatus("PENDING"); });
          try {
            await reprocessDocument(ticket.docId);
          } catch (e) {
            // "Already in progress" means a run is under way: just follow it.
            if (errorCode(e) !== "in_progress") throw e;
          }
        }
        if (!ticket?.stored) {
          if (!ticket) {
            const res = await getUploadUrl(uploadName(item.file.name), item.docType, item.projectId);
            ticket = ticketRef.current = { docId: res.docId, uploadUrl: res.uploadUrl, issuedAt: Date.now(), stored: false };
            // The server filed it in the project; tell the in-memory projects list.
            if (item.projectId) noteDocFiled(item.projectId, res.docId);
            const created = res.docId;
            safe(() => setDocId(created));
            cbRef.current.onDocCreated?.(created, item.file);
            cbRef.current.invalidateDocuments();
          }
          await uploadToS3WithProgress(ticket.uploadUrl, item.file, (p) => safe(() => setProgress(p)));
          ticket.stored = true;
        }
        const id = ticket.docId;
        cbRef.current.invalidateDocuments();
        safe(() => setPhase("processing"));
        const poll = () => {
          getDocument(id)
            .then((d) => {
              notFound = 0;
              safe(() => setDocStatus(d.document.status));
              if (d.document.status === "READY") { safe(() => setPhase("ready")); cbRef.current.onDocReady?.(id); cbRef.current.invalidateDocuments(); }
              else if (d.document.status === "FAILED") { cbRef.current.invalidateDocuments(); safe(() => { setPhase("failed"); setErrorMsg(d.document.errorMessage || "Processing failed. The pipeline reported no reason."); }); }
              else timerRef.current = setTimeout(poll, 4000);
            })
            .catch((e: unknown) => {
              // A refusal will not change by asking again; anything else may be a blip.
              if (!isForbidden(e) && notFound++ < 8) timerRef.current = setTimeout(poll, 4000);
              else safe(() => { setPhase("failed"); setErrorMsg(e instanceof Error ? e.message : "Could not read processing status."); });
            });
        };
        poll();
      } catch (e) {
        safe(() => { setPhase("failed"); setErrorMsg(uploadFailure(e, !!item.projectId)); });
      }
    })();
  }, [item, attempt]);

  // Dismissing an upload whose file never reached storage also removes the
  // empty PENDING document it created, so nothing is left behind in the lists.
  function dismiss() {
    const ticket = ticketRef.current;
    if (ticket && !ticket.stored) {
      ticketRef.current = null;
      void discardIfEmpty(ticket.docId).then((fate) => { if (fate === "removed") cbRef.current.invalidateDocuments(); });
    }
    onRemove();
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)]">
          <FileText size={16} className="text-[var(--brand-primary-600)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {phase === "ready" && docId && linkOnReady ? (
              <Link href={`/projects/${docId}`} className="min-w-0 break-words text-base font-semibold leading-snug text-foreground transition-colors hover:text-[var(--brand-primary-700)]">{item.file.name}</Link>
            ) : (
              <span className="min-w-0 break-words text-base font-semibold leading-snug text-foreground">{item.file.name}</span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <PhaseBadge phase={phase} status={docStatus} />
              {(phase === "ready" || phase === "failed") && (
                <button type="button" onClick={dismiss} className="-my-2 -mr-2 inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]" aria-label="Remove from queue"><X size={16} /></button>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(item.file.size)} · {item.docType}</p>

          {phase === "uploading" && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[var(--brand-primary-600)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}

          {phase === "processing" && <div className="mt-3 overflow-x-auto scrollbar-none"><PipelineStepper status={docStatus} showLabels={false} /></div>}

          {phase === "ready" && docId && linkOnReady && (
            <Link href={`/projects/${docId}`} className="mt-1 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] md:min-h-8">
              Open analysis <ArrowRight size={13} strokeWidth={2.25} />
            </Link>
          )}

          {phase === "failed" && (
            <div className="mt-2 space-y-2">
              {errorMsg && <p className="break-words text-sm leading-snug text-[var(--danger)]">{errorMsg.length > 160 ? errorMsg.slice(0, 160) + "…" : errorMsg}</p>}
              <Button variant="outline" className="h-10 md:h-9" onClick={() => setAttempt((a) => a + 1)}><RefreshCw size={14} />Retry</Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function PhaseBadge({ phase, status }: { phase: Phase; status: string }) {
  if (phase === "uploading") return <Pill tone="brand"><Loader2 size={12} className="animate-spin" />Uploading</Pill>;
  if (phase === "processing") return <Pill tone="brand"><Loader2 size={12} className="animate-spin" />{status.charAt(0) + status.slice(1).toLowerCase()}</Pill>;
  if (phase === "ready") return <Pill tone="success"><CheckCircle2 size={12} />Ready</Pill>;
  return <Pill tone="danger"><AlertCircle size={12} />Failed</Pill>;
}

function Pill({ tone, children }: { tone: "brand" | "success" | "danger"; children: React.ReactNode }) {
  const cls = {
    brand: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}
