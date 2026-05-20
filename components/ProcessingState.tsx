"use client";

import { cn } from "@/lib/utils";
import { BluelyMark } from "@/components/ui/BluelyMark";
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
    <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/40 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <BluelyMark size="sm" pulse />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            {title ?? "Bluely is analyzing this document"}
            <Loader2 size={14} className="animate-spin text-[var(--ai-ink)]" />
          </div>
          <div className="text-[12.5px] text-muted-foreground">
            {subtitle ??
              "Results appear automatically as each stage completes — no need to refresh."}
          </div>
        </div>
      </div>

      {/* Stage chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {STAGES.map((s, i) => {
          const stageIdx = i + 1; // PENDING occupies index 0
          const done = currentIdx > stageIdx;
          const active = currentIdx === stageIdx || (status === "PENDING" && i === 0);
          return (
            <span
              key={s.key}
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded-full border transition-colors",
                done
                  ? "bg-[var(--success-soft)] border-transparent text-[var(--success)]"
                  : active
                    ? "bg-card border-[var(--ai-border)] text-[var(--ai-ink)]"
                    : "bg-card/60 border-border text-muted-foreground/70",
              )}
              style={
                !done && !active
                  ? { animation: `pulse-stage 2.6s ease-in-out ${i * 0.3}s infinite` }
                  : undefined
              }
            >
              {done && <CheckCircle2 size={10} />}
              {active && <Loader2 size={9} className="animate-spin" />}
              {s.label}
            </span>
          );
        })}
      </div>

      {/* Indeterminate progress bar */}
      <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full w-1/3 rounded-full bar-indeterminate"
          style={{ background: "linear-gradient(90deg,#2563EB,#7C3AED,#22D3EE)" }}
        />
      </div>
    </div>
  );
}
