"use client";

// Requirement 2, counterparty rounds: each revised version the other side
// returns is a new document, re-checked against the matrix. The timeline
// shows how the open items fall from one round to the next.

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, CheckCircle2, ExternalLink, Loader2, Upload, XCircle } from "@/components/ui/icons";
import { useGovernErrorToast } from "@/components/govern/actions";
import { uploadToS3WithProgress } from "@/lib/api";
import { getRevisionUploadUrl } from "@/lib/govern/api";
import { governKeys } from "@/lib/govern/queries";
import { documentKeys } from "@/lib/queries/documents";
import { plural } from "@/lib/govern/labels";
import type { ContractDetail, ContractVersion } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RoundChanges } from "./RoundChanges";
import { Section } from "./SectionParts";
import { TierBar, TierLegend, blockingCount } from "./TierBar";

const ACCEPT = ".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

export function RoundsSection({ contract: c, uploadRef }: { contract: ContractDetail; uploadRef?: React.Ref<HTMLButtonElement> }) {
  const versions = [...c.versions].sort((a, b) => a.round - b.round || a.createdAt.localeCompare(b.createdAt));
  const counted = versions.filter((v) => v.matrixCounts);
  const first = counted[0];
  const last = counted[counted.length - 1];
  const improved = first && last && first !== last ? { from: blockingCount(first.matrixCounts!), to: blockingCount(last.matrixCounts!) } : null;
  const canUpload = c.state !== "rejected" && c.state !== "closed" && c.state !== "signed" && c.state !== "active";

  return (
    <Section
      title="Rounds and versions"
      description={`${plural(c.rounds, "round")} with the other side so far. Each version they send back is re-checked against the matrix.`}
    >
      {improved && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card p-5">
          <span className="text-sm text-[var(--ink-700)]">Items to resolve</span>
          <span className="inline-flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl font-semibold text-[var(--ink-500)]">{improved.from}</span>
            <ArrowRight size={16} className="self-center text-[var(--ink-500)]" aria-label="to" />
            <span className={cn("text-3xl font-semibold", improved.to === 0 ? "text-[var(--success)]" : improved.to < improved.from ? "text-foreground" : "text-[var(--warning)]")}>{improved.to}</span>
          </span>
          <span className="text-sm text-[var(--ink-700)]">
            {improved.to === 0 ? "The latest version is clean against the matrix." : improved.to < improved.from ? `${improved.from - improved.to} resolved since the first version.` : "No better than the first version."}
          </span>
        </div>
      )}

      {canUpload && <RevisionUpload contract={c} buttonRef={uploadRef} />}

      {versions.length > 1 && <RoundChanges contract={c} versions={versions} />}

      {versions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-sm text-[var(--ink-600)]">No versions yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-border">
          {versions.map((v, i) => (
            <VersionRow key={v.docId} version={v} index={i} previous={versions[i - 1]} current={v.docId === c.currentDocId} />
          ))}
        </ol>
      )}
    </Section>
  );
}

function VersionRow({ version: v, index, previous, current }: { version: ContractVersion; index: number; previous?: ContractVersion; current: boolean }) {
  const ready = v.status === "READY";
  const failed = v.status === "FAILED";
  const now = v.matrixCounts ? blockingCount(v.matrixCounts) : null;
  const before = previous?.matrixCounts ? blockingCount(previous.matrixCounts) : null;
  return (
    <li className="relative flex gap-3">
      <span className={cn("relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-[var(--background)]",
        current ? "bg-[var(--brand-primary-600)] text-white" : "bg-[var(--ink-100)] text-[var(--ink-700)]")}>
        v{index + 1}
      </span>
      <div className={cn("min-w-0 flex-1 rounded-xl border bg-card p-4", current ? "border-[var(--brand-primary-300)]" : "border-border")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {v.round === 0 ? "First version" : `Round ${v.round}`}
              {current && <span className="ml-2 rounded-md bg-structure-soft px-1.5 py-0.5 text-xs font-semibold text-structure-soft-fg">Current</span>}
            </p>
            <p className="mt-0.5 truncate text-sm text-[var(--ink-600)]">{v.title || "Untitled"} · {formatDate(v.createdAt)}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${encodeURIComponent(v.docId)}`}><ExternalLink size={13} />Open analysis</Link>
          </Button>
        </div>
        <div className="mt-3">
          {ready && v.matrixCounts ? (
            <div className="flex flex-col gap-2">
              <TierBar counts={v.matrixCounts} size="sm" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TierLegend counts={v.matrixCounts} compact />
                {now !== null && before !== null && now !== before && (
                  <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", now < before ? "text-[var(--success)]" : "text-[var(--warning)]")}>
                    <ArrowDown size={12} className={now > before ? "rotate-180" : undefined} />
                    {now < before ? `${before - now} fewer to resolve` : `${now - before} more to resolve`}
                  </span>
                )}
              </div>
            </div>
          ) : failed ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--danger)]"><XCircle size={14} />Sonar could not read this version. Open it to try again.</p>
          ) : ready ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-600)]"><CheckCircle2 size={14} />Read, not checked against the matrix.</p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--ai-ink)]"><Loader2 size={14} className="animate-spin motion-reduce:animate-none" />Sonar is reading and checking this version…</p>
          )}
        </div>
      </div>
    </li>
  );
}

type UploadState = { kind: "idle" } | { kind: "uploading"; pct: number; name: string } | { kind: "done"; name: string };

function RevisionUpload({ contract: c, buttonRef }: { contract: ContractDetail; buttonRef?: React.Ref<HTMLButtonElement> }) {
  const qc = useQueryClient();
  const onError = useGovernErrorToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const analysing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  const busy = state.kind === "uploading";

  async function upload(file: File) {
    setState({ kind: "uploading", pct: 0, name: file.name });
    try {
      const { uploadUrl } = await getRevisionUploadUrl(c.contractId, file.name);
      await uploadToS3WithProgress(uploadUrl, file, (pct) => setState({ kind: "uploading", pct, name: file.name }));
      setState({ kind: "done", name: file.name });
      toast.success("Revised version uploaded", { description: "Sonar is checking it against the matrix now." });
      void qc.invalidateQueries({ queryKey: governKeys.contract(c.contractId) });
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    } catch (e) {
      setState({ kind: "idle" });
      onError(e, "upload the revised version", c.contractId);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-5", c.state === "sent_back" ? "border-structure-border bg-structure-soft" : "border-dashed border-[var(--ink-300)] bg-card")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Got a revised version back?</p>
          <p className="text-sm text-[var(--ink-600)]">Upload it here. Sonar re-checks it and the open items update by themselves.</p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <Button ref={buttonRef} type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload the other side&rsquo;s revised version
        </Button>
      </div>
      {state.kind === "uploading" && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <div className="flex justify-between text-xs text-[var(--ink-700)]"><span className="truncate">{state.name}</span><span className="tabular-nums">{state.pct}%</span></div>
          <progress max={100} value={state.pct} aria-label={`Uploading ${state.name}`} className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-[var(--brand-primary-600)] [&::-webkit-progress-bar]:bg-[var(--ink-100)] [&::-webkit-progress-value]:bg-[var(--brand-primary-600)]" />
        </div>
      )}
      {(state.kind === "done" || analysing) && (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ai-ink)]" aria-live="polite">
          {analysing ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
          {analysing ? "Sonar is reading the new version and re-checking it against the matrix…" : `${state.kind === "done" ? state.name : "The new version"} is checked. See the results below.`}
        </p>
      )}
    </div>
  );
}
