// Small shared pieces every Govern screen uses, so a tier, a clock or a
// "waiting on" reads the same on the home view, the board, the contract page
// and the reports. Colour is never the only signal: each carries its words.

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ds/Avatar";
import { AlertTriangle, Clock, Building2, Users, UserRound, PenLine, CircleDashed } from "@/components/ui/icons";
import { SLA_LABEL, TIER_HINT, TIER_LABEL, WAITING_ON_LABEL, WAITING_ON_SHORT, daysLabel } from "@/lib/govern/labels";
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
      {tier === "unacceptable"
        ? <AlertTriangle size={12} aria-hidden />
        : <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
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
/** `short`: the one-word form for dense tables ("Other side", "Reviewer"); the full sentence is the tooltip. */
export function WaitingOnChip({ waitingOn, short = false, className }: { waitingOn: WaitingOn; short?: boolean; className?: string }) {
  // Unknown kinds fall back to a neutral icon instead of breaking the page.
  const Icon = WAITING_ICON[waitingOn.kind] ?? CircleDashed;
  const external = waitingOn.kind === "counterparty";
  return (
    <span
      title={short ? waitingOn.label || WAITING_ON_LABEL[waitingOn.kind] : undefined}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-xs font-medium",
        external ? "border-[var(--ink-300)] text-[var(--ink-700)]" : "border-structure-border bg-structure-soft text-structure-soft-fg",
        className,
      )}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      <span className="truncate" aria-hidden={short || undefined}>{short ? WAITING_ON_SHORT[waitingOn.kind] ?? waitingOn.kind : waitingOn.label || WAITING_ON_LABEL[waitingOn.kind]}</span>
      {/* The full sentence for screen readers; the title is mouse-only. */}
      {short && <span className="sr-only">{waitingOn.label || WAITING_ON_LABEL[waitingOn.kind]}</span>}
    </span>
  );
}

/** Initials avatar for one person, in their identity tint (see ds/Avatar). */
export function PersonDot({ name, email, className }: { name: string | null; email: string; className?: string }) {
  const label = (name || email).trim();
  return <Avatar name={name} email={email} size="base" title={label} className={className} />;
}

/** Whose turn and how long, as one pill for dense tables: "Other side · 45d".
 *  The days take the step's timing colour; the full sentence is the tooltip. */
export function TurnPill({ waitingOn, days, sla, className }: { waitingOn: WaitingOn; days: number; sla: SlaStatus; className?: string }) {
  const Icon = WAITING_ICON[waitingOn.kind] ?? CircleDashed;
  const late = sla === "amber" || sla === "red";
  return (
    <span
      title={`${waitingOn.label || WAITING_ON_LABEL[waitingOn.kind]} · ${daysLabel(days)} in this step${late ? ` · ${SLA_LABEL[sla]}` : ""}`}
      className={cn("inline-flex h-6 max-w-full items-center overflow-hidden whitespace-nowrap rounded-md border border-border bg-card text-xs font-medium text-[var(--ink-800)]", className)}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5 px-2">
        <Icon size={12} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
        <span className="truncate" aria-hidden>{WAITING_ON_SHORT[waitingOn.kind] ?? waitingOn.kind}</span>
        <span className="sr-only">{waitingOn.label || WAITING_ON_LABEL[waitingOn.kind]}, </span>
      </span>
      <span className={cn("inline-flex h-full items-center border-l border-border px-1.5 font-semibold tabular-nums", SLA_TONE[sla])}>
        {days}d{late && <span className="sr-only">, {SLA_LABEL[sla]}</span>}
      </span>
    </span>
  );
}

