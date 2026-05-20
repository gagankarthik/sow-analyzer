"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "@/components/ui/icons";

/**
 * Horizontal 7-stage pipeline stepper. Drives off the live document status.
 *
 * Backend statuses: PENDING → PARSING → CLASSIFYING → EMBEDDING → GRAPHING →
 * DIFFING → TIMELINING → PERSISTING → READY (or FAILED at any stage).
 *
 * Each node: completed (filled brand + check), active (brand + pulsing ring),
 * pending (hollow gray), failed (red + X). Connector lines fill up to current.
 */

const STAGES = [
  { key: "PARSING", label: "Parse" },
  { key: "CLASSIFYING", label: "Classify" },
  { key: "EMBEDDING", label: "Embed" },
  { key: "GRAPHING", label: "Graph" },
  { key: "DIFFING", label: "Diff" },
  { key: "TIMELINING", label: "Timeline" },
  { key: "PERSISTING", label: "Save" },
] as const;

// Index in the full ordered lifecycle. PENDING = 0, stages = 1..7, READY = 8.
const ORDER = ["PENDING", ...STAGES.map((s) => s.key), "READY"];

export function PipelineStepper({
  status,
  className,
  showLabels = true,
}: {
  status: string;
  className?: string;
  showLabels?: boolean;
}) {
  const failed = status === "FAILED";
  const ready = status === "READY";
  // Where in the pipeline we currently are. READY → past the last stage.
  const currentIdx = ready ? STAGES.length + 1 : Math.max(0, ORDER.indexOf(status));

  return (
    <div className={cn("flex items-start", className)} role="list" aria-label="Processing pipeline">
      {STAGES.map((stage, i) => {
        const stageIdx = i + 1; // PENDING occupies 0
        const done = currentIdx > stageIdx;
        const active = currentIdx === stageIdx && !failed;
        const isFailedHere = failed && currentIdx === stageIdx;
        const isLast = i === STAGES.length - 1;

        return (
          <div key={stage.key} className="flex flex-1 flex-col items-center" role="listitem">
            <div className="flex w-full items-center">
              {/* spacer to center the node over its label */}
              <div className="flex-1">
                {i > 0 && <Connector filled={currentIdx >= stageIdx} failed={failed && currentIdx >= stageIdx} />}
              </div>
              <Node done={done} active={active} failed={isFailedHere} />
              <div className="flex-1">
                {!isLast && <Connector filled={currentIdx > stageIdx} failed={false} />}
              </div>
            </div>
            {showLabels && (
              <span
                className={cn(
                  "mt-2 text-[11px] font-medium whitespace-nowrap transition-colors",
                  done && "text-foreground",
                  active && "text-[var(--brand-primary-700)]",
                  isFailedHere && "text-[var(--danger)]",
                  !done && !active && !isFailedHere && "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Node({ done, active, failed }: { done: boolean; active: boolean; failed: boolean }) {
  if (failed) {
    return (
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--danger)] text-white">
        <X size={13} strokeWidth={2.5} />
      </span>
    );
  }
  if (done) {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white">
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (active) {
    return (
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[var(--brand-primary-400)] opacity-40 animate-ping" />
        <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary-600)] ring-4 ring-[var(--brand-primary-100)]">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </span>
    );
  }
  return <span className="inline-flex h-6 w-6 shrink-0 rounded-full border-2 border-[var(--ink-300)] bg-card" />;
}

function Connector({ filled, failed }: { filled: boolean; failed: boolean }) {
  return (
    <span
      className={cn(
        "block h-0.5 w-full transition-colors",
        failed ? "bg-[var(--danger)]" : filled ? "bg-[var(--brand-primary-600)]" : "bg-[var(--ink-200)]",
      )}
    />
  );
}
