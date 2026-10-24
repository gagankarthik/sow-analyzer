// Cells for the Contracts list: a compact tag, the stage as a tinted badge,
// the owner as avatar + name, risk as a dot and a word, and the time in the
// stage, which takes the danger colour only once it runs past target.
// Colour carries status meaning only; everything else stays in ink.

import * as React from "react";
import { Avatar } from "@/components/ds/Avatar";
import { TONE_DOT, TONE_SOFT, TONE_TEXT, type Tone } from "@/components/ds/tone";
import { STAGE_LABEL } from "@/lib/govern/labels";
import { daysPastTarget } from "@/lib/govern/stage-time";
import type { Contract, SlaStatus } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
// Same icons as the Filters menu, so a row reads like its filter.
import { RiskBars } from "./PropertyChip";
import { StageIcon } from "./StageIcon";

/** 22px tag, 12px text, a status dot: risk, SLA, counts. */
export function ListTag({ tone = "unknown", dashed, className, children }: { tone?: Tone; dashed?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2 text-[12px] leading-none whitespace-nowrap",
        TONE_SOFT[tone],
        dashed && "border-dashed bg-transparent text-[var(--ink-600)]",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dashed ? "bg-[var(--ink-400)]" : TONE_DOT[tone])} />
      <span className="truncate">{children}</span>
    </span>
  );
}


/** The stage: the same icon the Filters menu shows, then its name. */
export function StageMeter({ contract: c }: { contract: Pick<Contract, "stage" | "state"> }) {
  const rejected = c.state === "rejected";
  const label = rejected ? "Rejected" : STAGE_LABEL[c.stage];
  return (
    <span className="inline-flex items-center gap-2">
      <StageIcon stage={c.stage} state={c.state} size={14} />
      <span className={cn("truncate text-[14px] font-medium", rejected ? "text-[var(--danger)]" : "text-[var(--ink-900)]")}>{label}</span>
    </span>
  );
}

/** Avatar and name; the name mails the owner (the click does not open the row). */
export function OwnerCell({ owner }: { owner: Contract["owner"] }) {
  if (!owner) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--ink-600)]">
        <Avatar size="xs" decorative />
        Unassigned
      </span>
    );
  }
  const name = owner.name || owner.email;
  return (
    <a
      href={`mailto:${owner.email}`}
      title={owner.email}
      className="-mx-1.5 inline-flex max-w-[14rem] items-center gap-1.5 rounded-md px-1.5 py-1 text-[var(--ink-900)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Avatar size="xs" name={owner.name} email={owner.email} decorative />
      <span className="truncate">{name}</span>
    </a>
  );
}

const RISK_WORD: Record<RiskLevel, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

export const RISK_TEXT = RISK_WORD;

const RISK_FG: Record<RiskLevel, string> = {
  critical: "text-[var(--danger)]", high: "text-[var(--danger)]", medium: "text-[var(--warning-fg)]", low: "text-[var(--success-fg)]",
};

/** Risk as the filter's bars and a word: red for high and critical only, amber for
 *  medium, green for low. */
export function RiskCell({ risk }: { risk: RiskLevel | null }) {
  if (!risk) return <span className="inline-flex items-center gap-2 text-[var(--ink-600)]"><RiskBars risk={null} />Not assessed</span>;
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium whitespace-nowrap", RISK_FG[risk])}>
      <RiskBars risk={risk} />
      {RISK_WORD[risk]}
    </span>
  );
}

/** "8 days · 3 past target": ink while on time, the danger colour once the
 *  stage runs past its target. */
export function TimeInStageCell({ days, target }: { days: number; target?: number | null }) {
  const past = daysPastTarget(days, target);
  return (
    <span className={cn("tabular-nums whitespace-nowrap", past !== null ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-700)]")}>
      {days} {days === 1 ? "day" : "days"}
      {past !== null && <> · {past} past target</>}
    </span>
  );
}

const SLA_TONE: Record<SlaStatus, Tone> = { on_track: "unknown", amber: "caution", red: "blocked", none: "unknown" };
const SLA_FILL: Record<SlaStatus, string> = { on_track: "", amber: "fill-[var(--warning)]", red: "fill-[var(--danger)]", none: "" };
const SLA_WORD: Record<SlaStatus, string> = { on_track: "On track", amber: "Due soon", red: "Overdue", none: "No target" };

/**
 * Days in the current step, in ink unless the step is running late. With a
 * target, a short bar beside the figure shows the time used against it
 * (full at the target; late steps fill in their status colour).
 */
export function DaysCell({ days, sla, target }: { days: number; sla: SlaStatus; target?: number | null }) {
  const late = sla === "amber" || sla === "red";
  const used = target && target > 0 ? Math.min(1, days / target) : null;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      {used !== null && (
        <svg aria-hidden viewBox="0 0 40 4" className="h-1 w-10 shrink-0 overflow-hidden rounded-full">
          <rect width="40" height="4" rx="2" className="fill-[var(--ink-100)]" />
          <rect
            width={Math.max(4, Math.round(used * 40))}
            height="4"
            rx="2"
            className={late ? SLA_FILL[sla] : "fill-[var(--ink-400)]"}
          />
        </svg>
      )}
      <span className={cn("tabular-nums", late ? cn(TONE_TEXT[SLA_TONE[sla]], "font-medium") : "text-[var(--ink-900)]")}>
        {days}
        {target ? <span className="text-[var(--ink-500)]">/{target}</span> : null}
        {late && <span className="sr-only">, {SLA_WORD[sla].toLowerCase()}</span>}
        {target ? <span className="sr-only"> of a {target}-day target</span> : null}
      </span>
    </span>
  );
}

export function SlaTag({ sla }: { sla: SlaStatus }) {
  return <ListTag tone={SLA_TONE[sla]} dashed={sla === "none"}>{SLA_WORD[sla]}</ListTag>;
}

export const SLA_TEXT = SLA_WORD;
