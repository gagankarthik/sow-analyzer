"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "@/components/ui/icons";

type Tone = "neutral" | "success" | "danger" | "warning" | "ai" | "brand";

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
  neutral: "bg-muted text-[var(--ink-600)]",
  success: "bg-[var(--success-soft)] text-[var(--success-fg)]",
  danger:  "bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  ai:      "bg-[var(--ai-surface)] text-[var(--ai-ink)]",
  brand:   "bg-structure-soft text-structure-soft-fg",
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
        "relative min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs md:p-5",
        className,
      )}
    >
      {/* The inner wrapper is the size container: the value scales with the
          card's own width, so a long figure shrinks instead of overflowing. */}
      <div className="@container min-w-0">
        {/* Label wraps (never truncates); icon stays pinned top-right. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-medium leading-snug text-[var(--ink-600)]">{label}</div>
          {icon && (
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                ICON_TONE[tone],
              )}
            >
              {icon}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className="min-w-0 text-[clamp(18px,14cqw,28px)] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-foreground [overflow-wrap:anywhere]">
            {value}
          </div>
          {delta && <DeltaPill direction={delta.direction} value={delta.value} />}
        </div>

        {/* Optional sparkline (32px height per spec) */}
        {chart && (
          <div className="mt-3 h-8 overflow-hidden" aria-hidden>
            {chart}
          </div>
        )}

        {hint && (
          <div className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</div>
        )}
      </div>
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
      ? "bg-[var(--success-soft)] text-[var(--success-fg)]"
      : direction === "down"
      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
      : "bg-muted text-muted-foreground";
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        cls,
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2} />}
      {value}
    </span>
  );
}
