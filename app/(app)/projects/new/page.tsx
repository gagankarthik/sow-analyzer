"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import {
  ChevronLeft, Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw,
} from "@/components/ui/icons";
import { getUploadUrl, uploadToS3WithProgress, getDocument } from "@/lib/api";
import type { DocType } from "@/lib/types";

const ACCEPTED = ".pdf,.docx,.doc,.txt";
const isAccepted = (f: File) => /\.(pdf|docx?|txt)$/i.test(f.name);
const TERMINAL = new Set(["READY", "FAILED"]);

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

export default function NewProjectPage() {
  const [docType, setDocType] = useState<DocType>("SOW");
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
    <>
      <PageHeader
        eyebrow="New document"
        title="Upload contracts"
        subtitle="Drop one or more files. Bluely extracts every clause, scores risk, and prepares the workspace — usually within 90 seconds."
        actions={
          <Link href="/projects" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card hover:bg-muted text-foreground text-[13px] font-medium transition-colors">
            <ChevronLeft size={14} />Back to projects
          </Link>
        }
      />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT — dropzone + type */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Document type</label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger className="w-full h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">Applied to files you add next. You can change a contract&apos;s type later.</p>
            </div>

            <label
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-20 ${
                dragOver ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-border bg-muted/30 hover:bg-muted hover:border-[var(--brand-primary-300)]"
              }`}
            >
              <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">
                <Upload size={22} strokeWidth={1.75} />
              </span>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-foreground">Drop contracts here, or <span className="text-[var(--brand-primary-700)]">browse</span></p>
                <p className="text-[12.5px] text-muted-foreground mt-1">PDF, DOCX, DOC, TXT · up to 50 MB · processed privately in your tenant</p>
              </div>
            </label>

            {reject && (
              <div className="flex items-start gap-2.5 rounded-md border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
                <AlertCircle size={14} className="text-[var(--warning)] mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-[var(--warning)]">{reject}</p>
              </div>
            )}
          </div>

          {/* RIGHT — queue */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card shadow-xs flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h3 className="text-[13px] font-semibold text-foreground">Upload queue {queue.length > 0 && <span className="text-muted-foreground font-mono ml-1">{queue.length}</span>}</h3>
                {queue.length > 0 && (
                  <Button variant="primary" size="sm" asChild><Link href="/projects">Go to projects<ArrowRight size={12} /></Link></Button>
                )}
              </div>
              {queue.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3"><FileText size={18} strokeWidth={1.5} /></span>
                  <p className="text-[13px] font-medium text-foreground">Files appear here</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Each shows upload progress, then live pipeline status.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border overflow-y-auto">
                  {queue.map((item) => (
                    <UploadItem key={item.id} item={item} onRemove={() => setQueue((q) => q.filter((x) => x.id !== item.id))} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type Phase = "uploading" | "processing" | "ready" | "failed";

function UploadItem({ item, onRemove }: { item: QueueItem; onRemove: () => void }) {
  const [phase, setPhase] = useState<Phase>("uploading");
  const [progress, setProgress] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState("PENDING");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let notFound = 0;

    async function run() {
      setPhase("uploading"); setProgress(0); setErrorMsg(null);
      try {
        const { uploadUrl, docId: id } = await getUploadUrl(item.file.name, item.docType);
        if (!alive) return;
        setDocId(id);
        await uploadToS3WithProgress(uploadUrl, item.file, (p) => alive && setProgress(p));
        if (!alive) return;
        setPhase("processing");
        const poll = () => {
          getDocument(id)
            .then((d) => {
              if (!alive) return;
              notFound = 0;
              setDocStatus(d.document.status);
              if (d.document.status === "READY") setPhase("ready");
              else if (d.document.status === "FAILED") { setPhase("failed"); setErrorMsg(d.document.errorMessage || "Processing failed."); }
              else timer = setTimeout(poll, 4000);
            })
            .catch((e: unknown) => {
              if (!alive) return;
              // Freshly-created row may briefly 404 — retry a few times.
              if (notFound++ < 8) timer = setTimeout(poll, 4000);
              else { setPhase("failed"); setErrorMsg(e instanceof Error ? e.message : "Could not read processing status."); }
            });
        };
        poll();
      } catch (e) {
        if (alive) { setPhase("failed"); setErrorMsg(e instanceof Error ? e.message : "Upload failed."); }
      }
    }
    run();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [item, attempt]);

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card shrink-0">
          <FileText size={14} className="text-[var(--brand-primary-600)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {phase === "ready" && docId ? (
              <Link href={`/projects/${docId}`} className="text-[13px] font-semibold text-foreground hover:text-[var(--brand-primary-700)] transition-colors truncate">{item.file.name}</Link>
            ) : (
              <span className="text-[13px] font-semibold text-foreground truncate">{item.file.name}</span>
            )}
            <span className="ml-auto shrink-0 flex items-center gap-2">
              <PhaseBadge phase={phase} status={docStatus} />
              {(phase === "ready" || phase === "failed") && (
                <button onClick={onRemove} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Remove from queue"><X size={13} /></button>
              )}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{formatBytes(item.file.size)} · {item.docType}</p>

          {/* Upload progress bar */}
          {phase === "uploading" && (
            <div className="mt-2.5">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[var(--brand-primary-600)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1 tabular-nums">Uploading… {progress}%</p>
            </div>
          )}

          {/* Pipeline stepper */}
          {phase === "processing" && (
            <div className="mt-3"><PipelineStepper status={docStatus} showLabels={false} /></div>
          )}

          {/* Ready */}
          {phase === "ready" && docId && (
            <Link href={`/projects/${docId}`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] transition-colors">
              Open workspace <ArrowRight size={11} strokeWidth={2.25} />
            </Link>
          )}

          {/* Failed */}
          {phase === "failed" && (
            <div className="mt-2 space-y-2">
              {errorMsg && <p className="text-[11.5px] text-[var(--danger)] leading-snug break-words">{errorMsg.length > 160 ? errorMsg.slice(0, 160) + "…" : errorMsg}</p>}
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
