// Small shared pieces every Govern screen uses, so a tier, a clock or a
// "waiting on" reads the same on the home view, the board, the contract page
// and the reports. Colour is never the only signal: each carries its words.

import { cn } from "@/lib/utils";
import { Clock, Building2, Users, UserRound, PenLine, CircleDashed } from "@/components/ui/icons";
import { SLA_LABEL, TIER_HINT, TIER_LABEL, WAITING_ON_LABEL, daysLabel } from "@/lib/govern/labels";
import type { SlaStatus, Tier, WaitingOn, WaitingOnKind } from "@/lib/govern/types";

export const TIER_TONE: Record<Tier, string> = {
  within: "bg-[var(--success-soft)] text-[var(--success-fg)] border-[color-mix(in_srgb,var(--success)_22%,transparent)]",
  fallback: "bg-[var(--info-soft)] text-[var(--info)] border-[color-mix(in_srgb,var(--info)_22%,transparent)]",
  deviates: "bg-[var(--warning-soft)] text-[var(--warning-fg)] border-[color-mix(in_srgb,var(--warning)_25%,transparent)]",
  unacceptable: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_25%,transparent)]",
  review: "bg-[var(--ink-100)] text-[var(--ink-700)] border-[var(--ink-300)]",
  missing: "bg-card text-[var(--ink-700)] border-dashed border-[var(--ink-400)]",
};

/** Chart/mark colour per tier (token references only). */
export const TIER_COLOR: Record<Tier, string> = {
  within: "var(--success)",
  fallback: "var(--info)",
  deviates: "var(--warning)",
  unacceptable: "var(--danger)",
  review: "var(--viz-other)",
  missing: "var(--ink-300)",
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      title={TIER_HINT[tier]}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold whitespace-nowrap",
        TIER_TONE[tier],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {TIER_LABEL[tier]}
    </span>
  );
}

export function BeneficialBadge({ className }: { className?: string }) {
  return (
    <span
      title="This term favours your organization."
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--success)_30%,transparent)] px-2 text-xs font-semibold text-[var(--success)]",
        className,
      )}
    >
      <span aria-hidden>+</span> Favours you
    </span>
  );
}

const SLA_TONE: Record<SlaStatus, string> = {
  on_track: "text-[var(--ink-700)] bg-[var(--ink-100)]",
  amber: "text-[var(--warning-fg)] bg-[var(--warning-soft)]",
  red: "text-[var(--danger)] bg-[var(--danger-soft)]",
  none: "text-[var(--ink-600)] bg-[var(--ink-100)]",
};

/** "6 days in stage · Running late". Amber past the target, red well past it. */
export function DaysInStage({
  days, sla, target, compact = false, className,
}: {
  days: number; sla: SlaStatus; target?: number | null; compact?: boolean; className?: string;
}) {
  const late = sla === "amber" || sla === "red";
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-semibold tabular-nums whitespace-nowrap", SLA_TONE[sla], className)}
      title={target ? `Target ${daysLabel(target)} in this stage` : "No target set for this stage"}
    >
      <Clock size={12} aria-hidden />
      {daysLabel(days)}
      {!compact && late && <span className="font-medium">· {SLA_LABEL[sla]}</span>}
      {compact && late && <span className="sr-only">, {SLA_LABEL[sla]}</span>}
    </span>
  );
}

const WAITING_ICON: Record<WaitingOnKind, typeof Clock> = {
  internal_reviewer: UserRound,
  internal_office: Building2,
  counterparty: Users,
  pi_department: Users,
  signatory: PenLine,
  nobody: CircleDashed,
};

/** Who holds the contract right now, in plain words. */
export function WaitingOnChip({ waitingOn, className }: { waitingOn: WaitingOn; className?: string }) {
  // Unknown kinds fall back to a neutral icon instead of breaking the page.
  const Icon = WAITING_ICON[waitingOn.kind] ?? CircleDashed;
  const external = waitingOn.kind === "counterparty";
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
        external ? "border-[var(--ink-300)] text-[var(--ink-700)]" : "border-structure-border bg-structure-soft text-structure-soft-fg",
        className,
      )}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      <span className="truncate">{waitingOn.label || WAITING_ON_LABEL[waitingOn.kind]}</span>
    </span>
  );
}

/** Initials avatar for an owner. */
export function PersonDot({ name, email, className }: { name: string | null; email: string; className?: string }) {
  const label = (name || email).trim();
  const initials = label.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span
      title={label}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink-100)] text-xs font-semibold text-[var(--ink-700)] ring-1 ring-[var(--ink-200)]",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
