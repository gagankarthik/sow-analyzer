// Matrix outcome: colour + icon + word, never colour alone. The words come
// from lib/govern/labels (one vocabulary everywhere); the colours from the
// --outcome-* tokens; the shapes differ per outcome so the badge still reads
// in greyscale, print and forced-colours mode.

import * as React from "react";
import { cn } from "@/lib/utils";
import { TIER_HINT, TIER_LABEL } from "@/lib/govern/labels";
import type { Tier } from "@/lib/govern/types";

/** A matrix tier, plus the independent "beneficial" mark. */
export type Outcome = Tier | "beneficial";

export const OUTCOME_LABEL: Record<Outcome, string> = { ...TIER_LABEL, beneficial: "Benefits OSU" };
export const OUTCOME_HINT: Record<Outcome, string> = { ...TIER_HINT, beneficial: "This term benefits OSU." };

/** Chart/mark colour per outcome (CSS variable references). */
export const OUTCOME_COLOR: Record<Outcome, string> = {
  within: "var(--outcome-within)",
  fallback: "var(--outcome-fallback)",
  deviates: "var(--outcome-deviates)",
  unacceptable: "var(--outcome-unacceptable)",
  beneficial: "var(--outcome-beneficial)",
  review: "var(--status-unknown)",
  missing: "var(--outcome-missing)",
};

const STYLE: Record<Outcome, string> = {
  within: "bg-outcome-within-soft text-outcome-within-fg border-status-ok-border",
  fallback: "bg-outcome-fallback-soft text-outcome-fallback-fg border-status-acceptable-border",
  deviates: "bg-outcome-deviates-soft text-outcome-deviates-fg border-status-caution-border",
  unacceptable: "bg-outcome-unacceptable-soft text-outcome-unacceptable-fg border-status-blocked-border",
  beneficial: "bg-transparent text-outcome-beneficial-fg border-status-ok-border",
  review: "bg-status-unknown-soft text-status-unknown-fg border-status-unknown-border",
  missing: "bg-transparent text-outcome-missing-fg border-dashed border-border-control",
};

/** The outcome's shape, 12px, drawn in currentColor. */
export function OutcomeIcon({ outcome, className }: { outcome: Outcome; className?: string }) {
  const common = { viewBox: "0 0 12 12", "aria-hidden": true, className: cn("size-3 shrink-0", className) } as const;
  switch (outcome) {
    case "within": // check in a circle
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="5" />
          <path d="M3.8 6.2l1.5 1.5 2.9-3" />
        </svg>
      );
    case "fallback": // half-filled circle
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 1.1a4.9 4.9 0 0 1 0 9.8z" fill="currentColor" />
        </svg>
      );
    case "deviates": // triangle with bar
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M6 1.4l4.9 8.8H1.1z" />
          <path d="M6 4.8v2.2M6 8.7v.1" />
        </svg>
      );
    case "unacceptable": // octagon with cross
      return (
        <svg {...common}>
          <path d="M4 .8h4L11.2 4v4L8 11.2H4L.8 8V4z" fill="currentColor" />
          <path d="M4.3 4.3l3.4 3.4M7.7 4.3L4.3 7.7" stroke="var(--surface-raised)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "beneficial": // plus (success outline; never the teal accent)
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 2v8M2 6h8" />
        </svg>
      );
    case "review": // question in a circle
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="6" cy="6" r="5" />
          <path d="M4.6 4.6a1.5 1.5 0 1 1 2 1.4c-.4.2-.6.5-.6.9M6 8.8v.1" />
        </svg>
      );
    case "missing": // dashed circle
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6">
          <circle cx="6" cy="6" r="4.9" />
        </svg>
      );
  }
}

export type OutcomeBadgeProps = Omit<React.ComponentProps<"span">, "children"> & {
  outcome: Outcome;
  /** Override the label (keep it from labels.ts where possible). */
  label?: string;
  size?: "sm" | "md";
};

/** Matrix outcome badge for a clause or finding. Title carries the hint. */
export function OutcomeBadge({ outcome, label, size = "md", className, ...props }: OutcomeBadgeProps) {
  return (
    <span
      title={OUTCOME_HINT[outcome]}
      data-outcome={outcome}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border font-semibold whitespace-nowrap",
        size === "md" ? "h-6 px-2 text-caption" : "h-5 px-1.5 text-caption",
        STYLE[outcome],
        className,
      )}
      {...props}
    >
      <OutcomeIcon outcome={outcome} />
      <span className="truncate">{label ?? OUTCOME_LABEL[outcome]}</span>
    </span>
  );
}
