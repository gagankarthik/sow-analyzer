"use client";

import { Button } from "@/components/ui/button";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { SonarMark } from "@/components/ui/SonarMark";
import { AlertCircle, Check, Loader2, RefreshCw, Upload } from "@/components/ui/icons";
import { useReprocess } from "@/lib/queries/documents";
import type { ApiDocument, DocStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";

// The pipeline's stages in order (the DocStatus values in lib/types.ts, the
// same ones PipelineStepper draws). Each description says what that backend
// stage actually does (lambdas/pipeline/stages/*.py), in plain words.
const STAGES: { key: DocStatus; title: string; body: string }[] = [
  { key: "PARSING", title: "Reading the file", body: "The full text is extracted from the file. Scanned PDF pages are read with OCR." },
  { key: "CLASSIFYING", title: "Extracting clauses and terms", body: "The clauses are identified, each with a category and a risk level, along with the parties, dates and commercial figures. The money figures are then checked against the text." },
  { key: "EMBEDDING", title: "Indexing the clauses", body: "Each clause is indexed for search. This is what lets Sonar answer questions about this contract and find similar clauses." },
  { key: "GRAPHING", title: "Finding the contract it amends", body: "For an amendment, the contract it amends is looked up among your documents. Other document types pass straight through this stage." },
  { key: "DIFFING", title: "Working out what changed", body: "If a parent contract or an earlier version was found, the changes are listed and scored for impact. A first contract has nothing to compare." },
  { key: "TIMELINING", title: "Replaying the amendments", body: "The original clauses and each amendment's changes are replayed in order, giving the contract as first written, as it stands now, and with pending amendments applied." },
  { key: "PERSISTING", title: "Saving the results", body: "Clause counts, risk totals, contract value and key dates are saved to your workspace. The document is then ready." },
];
const ORDER: string[] = ["PENDING", ...STAGES.map((s) => s.key), "READY"];
const SPIN = "animate-spin motion-reduce:animate-none";

export function AnalysisStep({
  doc,
  loadError,
  refetching,
  onRefetch,
  onUploadDifferent,
}: {
  /** The uploaded document, from the shared documents query (it refetches every 5s while anything is processing). */
  doc?: ApiDocument;
  /** The documents list could not be loaded. */
  loadError: boolean;
  refetching: boolean;
  onRefetch: () => void;
  onUploadDifferent: () => void;
}) {
  const reprocess = useReprocess();

  if (!doc) {
    return (
      <StepCard title="Analysis">
        {loadError ? (
          <Notice title="Progress could not be checked">
            <p>The document service did not respond. Your upload is not affected.</p>
            <Button className="mt-4 h-10" onClick={onRefetch} disabled={refetching}>
              <RefreshCw size={14} className={refetching ? SPIN : undefined} />Check again
            </Button>
          </Notice>
        ) : (
          <p role="status" className="flex items-center gap-2 text-base text-[var(--ink-600)]">
            <Loader2 size={15} className={SPIN} />Checking where the analysis is.
          </p>
        )}
      </StepCard>
    );
  }

  const name = doc.title || "your contract";

  if (doc.status === "FAILED") {
    const reason = doc.errorMessage?.trim();
    return (
      <StepCard title="Analysis" lead={`The analysis of ${name} stopped before it finished.`}>
        <Notice title="Analysis did not finish">
          <p className="break-words">
            {reason ? (reason.length > 240 ? `${reason.slice(0, 240)}…` : reason) : "No reason was returned by the pipeline."}
          </p>
          <p className="mt-2">
            Trying again re-runs the analysis on the same file. If it fails again, upload a different copy of the
            contract.
          </p>
          {reprocess.isError && (
            <p className="mt-2 font-medium">
              The retry could not be started{reprocess.error instanceof Error ? `: ${reprocess.error.message}` : "."}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="h-10" onClick={() => reprocess.mutate(doc.docId)} disabled={reprocess.isPending}>
              <RefreshCw size={14} className={reprocess.isPending ? SPIN : undefined} />Try again
            </Button>
            <Button variant="outline" className="h-10" onClick={onUploadDifferent}>
              <Upload size={14} />Upload a different file
            </Button>
          </div>
        </Notice>
      </StepCard>
    );
  }

  const currentIdx = Math.max(0, ORDER.indexOf(doc.status));
  const activeStage = STAGES[currentIdx - 1];

  return (
    <StepCard
      title="Analysis"
      lead={`Sonar is working through ${name}. You can stay here or leave: the analysis keeps running, and setup resumes at this step when you come back.`}
    >
      <div className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4">
        <p role="status" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <SonarMark size="sm" />
          <span className="min-w-0">
            {activeStage ? `Stage ${currentIdx} of ${STAGES.length}: ${activeStage.title}` : "Waiting for the analysis to start"}
          </span>
          <Loader2 size={15} className={cn("shrink-0 text-[var(--ai-ink)]", SPIN)} />
        </p>
        <PipelineStepper status={doc.status} showLabels={false} className="mt-4" />
      </div>

      <ol className="mt-5 space-y-1">
        {STAGES.map((stage, i) => {
          const idx = i + 1; // PENDING is 0
          const done = currentIdx > idx;
          const active = currentIdx === idx;
          return (
            <li
              key={stage.key}
              aria-current={active ? "step" : undefined}
              className={cn("flex gap-3 rounded-lg px-3 py-2.5", active && "bg-[var(--panel)]")}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  done && "bg-[var(--success-soft)] text-[var(--success-fg)]",
                  active && "bg-[var(--brand-primary-600)] text-white",
                  !done && !active && "border border-[var(--ink-300)] text-muted-foreground",
                )}
              >
                {done ? <Check size={12} strokeWidth={3} aria-hidden /> : idx}
              </span>
              <div className="min-w-0">
                <h3 className={cn("text-base font-semibold", done || active ? "text-foreground" : "text-[var(--ink-600)]")}>
                  {stage.title}
                  <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : " (not started)"}</span>
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{stage.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </StepCard>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <AlertCircle size={16} className="shrink-0 text-[var(--danger)]" />{title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-[var(--ink-600)]">{children}</div>
    </div>
  );
}
