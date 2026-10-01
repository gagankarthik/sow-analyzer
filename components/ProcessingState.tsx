"use client";

import { cn } from "@/lib/utils";
import { SonarMark } from "@/components/ui/SonarMark";
import { Loader2, CheckCircle2 } from "@/components/ui/icons";

const STAGES = [
  { key: "PARSING", label: "Parsing" },
  { key: "CLASSIFYING", label: "Classifying" },
  { key: "EMBEDDING", label: "Embedding" },
  { key: "GRAPHING", label: "Graphing" },
  { key: "DIFFING", label: "Diffing" },
  { key: "TIMELINING", label: "Timelining" },
  { key: "PERSISTING", label: "Persisting" },
];

// Index 0 = PENDING, 1..7 = the stages above, 8 = READY.
const ORDER = ["PENDING", ...STAGES.map((s) => s.key), "READY"];

/**
 * Live, animated processing indicator. As `status` advances (the page polls
 * for it), each stage flips from pending → active → done, so the user sees
 * real forward progress instead of a frozen "still loading" message.
 */
export function ProcessingState({
  status,
  title,
  subtitle,
}: {
  status: string;
  title?: string;
  subtitle?: string;
}) {
  const currentIdx = Math.max(0, ORDER.indexOf(status));

  return (
    <div
      role="status"
      className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 md:p-6"
    >
      <div className="flex items-start gap-3">
        <SonarMark size="sm" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 text-lg font-semibold leading-snug text-foreground">
            <span className="min-w-0">{title ?? "Sonar is analyzing this document"}</span>
            <Loader2 size={15} className="mt-1 shrink-0 animate-spin text-[var(--ai-ink)]" />
          </div>
          <div className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">
            {subtitle ??
              "Results appear as each stage completes. You do not need to refresh."}
          </div>
        </div>
      </div>

      {/* Stage chips — done / active / pending read from icon + text, not colour alone */}
      <ol className="mt-4 flex flex-wrap gap-1.5">
        {STAGES.map((s, i) => {
          const stageIdx = i + 1; // PENDING occupies index 0
          const done = currentIdx > stageIdx;
          const active = currentIdx === stageIdx || (status === "PENDING" && i === 0);
          return (
            <li
              key={s.key}
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                done
                  ? "border-transparent bg-[var(--success-soft)] text-[var(--success)]"
                  : active
                    ? "border-[var(--ai-ink)] bg-card text-[var(--ai-text)]"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {done && <CheckCircle2 size={12} />}
              {active && <Loader2 size={12} className="animate-spin" />}
              {s.label}
            </li>
          );
        })}
      </ol>

      {/* Indeterminate progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--ai-border)]">
        <div className="bar-indeterminate h-full w-1/3 rounded-full bg-[var(--ai-ink)]" />
      </div>
    </div>
  );
}
