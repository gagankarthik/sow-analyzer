"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "@/components/ui/icons";

type Tone = "neutral" | "success" | "danger" | "warning" | "ai";

export type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional sparkline node (e.g. <TinyArea data={...} color="var(--brand-primary-600)" />) */
  chart?: React.ReactNode;
  /** Modulates the icon-bg color only — most cards stay neutral. */
  tone?: Tone;
  className?: string;
};

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  danger:  "bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  ai:      "bg-[var(--ai-surface)] text-[var(--ai-ink)]",
};

export function MetricCard({
  label,
  value,
  delta,
  hint,
  icon,
  chart,
  tone = "neutral",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all duration-200",
        className,
      )}
    >
      {/* Top row: eyebrow + delta pill (and optional icon top-right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow truncate">{label}</div>
        <div className="flex items-center gap-2 shrink-0">
          {delta && <DeltaPill direction={delta.direction} value={delta.value} />}
          {icon && (
            <span
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                ICON_TONE[tone],
              )}
            >
              {icon}
            </span>
          )}
        </div>
      </div>

      {/* Big number */}
      <div
        className="numeric mt-3 text-foreground leading-none"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          fontSize: 36,
        }}
      >
        {value}
      </div>

      {/* Optional sparkline (32px height per spec) */}
      {chart && (
        <div className="mt-3 h-8 -mx-1" aria-hidden>
          {chart}
        </div>
      )}

      {/* Optional hint */}
      {hint && (
        <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>
      )}
    </div>
  );
}

function DeltaPill({
  direction,
  value,
}: {
  direction: "up" | "down" | "flat";
  value: string;
}) {
  const cls =
    direction === "up"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : direction === "down"
      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
      : "bg-muted text-muted-foreground";
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        cls,
      )}
    >
      {Icon && <Icon size={11} strokeWidth={2} />}
      {value}
    </span>
  );
}
