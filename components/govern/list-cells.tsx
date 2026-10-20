// Cells for the Contracts list: a compact tag, the stage as a segmented
// meter, the owner as avatar + name, and days in step as a plain number that
// takes colour only when the step runs late. Colour carries status meaning
// only (risk, SLA); everything else stays in ink.

import * as React from "react";
import { Avatar } from "@/components/ds/Avatar";
import { TONE_SOFT, TONE_TEXT, type Tone } from "@/components/ds/tone";
import { STAGE_LABEL } from "@/lib/govern/labels";
import type { Contract, SlaStatus } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 22px tag, 12px text: risk, SLA, counts. */
export function ListTag({ tone = "unknown", dashed, className, children }: { tone?: Tone; dashed?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full shrink-0 items-center rounded-md border px-2 text-[12px] leading-none whitespace-nowrap",
        TONE_SOFT[tone],
        dashed && "border-dashed bg-transparent text-[var(--ink-600)]",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

const PHASES = ["draft", "review", "negotiation", "approval", "signed"] as const;

function phaseIndex(stage: Contract["stage"]): number {
  const i = PHASES.indexOf(stage as (typeof PHASES)[number]);
  return i === -1 ? PHASES.length - 1 : i; // active, renewal, expired: past signature
}

/** Where the contract is on its way to signature: one segment per step,
 *  done steps filled, the current one half-filled, the rest track. */
export function StageMeter({ contract: c }: { contract: Pick<Contract, "stage" | "state"> }) {
  const at = phaseIndex(c.stage);
  const signed = at === PHASES.length - 1;
  const rejected = c.state === "rejected";
  const label = rejected ? "Rejected" : STAGE_LABEL[c.stage];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        role="meter"
        aria-label="Progress to signature"
        aria-valuemin={0}
        aria-valuemax={PHASES.length}
        aria-valuenow={signed ? PHASES.length : at}
        aria-valuetext={label}
        className="flex h-[14px] w-[58px] shrink-0 items-center gap-[2px] rounded-[2px] bg-[var(--ink-100)] px-[2px]"
      >
        {PHASES.map((p, i) => {
          const done = i < at || signed;
          const here = i === at && !signed;
          return (
            <span
              key={p}
              className={cn(
                "h-[10px] min-w-px flex-1 rounded-[1px]",
                rejected && i <= at ? "bg-[var(--danger)]"
                  : done ? "bg-[var(--brand-primary-600)]"
                  : here ? "bg-[var(--brand-primary-300)]"
                  : "bg-[var(--ink-200)]",
              )}
            />
          );
        })}
      </span>
      <span className={cn("truncate text-[14px]", rejected ? "text-[var(--danger)]" : "text-[var(--ink-900)]")}>{label}</span>
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

const SLA_TONE: Record<SlaStatus, Tone> = { on_track: "unknown", amber: "caution", red: "blocked", none: "unknown" };
const SLA_WORD: Record<SlaStatus, string> = { on_track: "On track", amber: "Due soon", red: "Overdue", none: "No target" };

/** Days in the current step, in ink unless the step is running late. */
export function DaysCell({ days, sla }: { days: number; sla: SlaStatus }) {
  const late = sla === "amber" || sla === "red";
  return (
    <span className={cn("tabular-nums", late ? cn(TONE_TEXT[SLA_TONE[sla]], "font-medium") : "text-[var(--ink-900)]")}>
      {days}
      {late && <span className="sr-only">, {SLA_WORD[sla].toLowerCase()}</span>}
    </span>
  );
}

export function SlaTag({ sla }: { sla: SlaStatus }) {
  return <ListTag tone={SLA_TONE[sla]} dashed={sla === "none"}>{SLA_WORD[sla]}</ListTag>;
}

export const SLA_TEXT = SLA_WORD;

const RISK_TONE: Record<RiskLevel, Tone> = { critical: "blocked", high: "caution", medium: "unknown", low: "unknown" };
const RISK_WORD: Record<RiskLevel, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

export function RiskTag({ risk }: { risk: RiskLevel | null }) {
  if (!risk) return <span className="text-[12px] text-[var(--ink-600)]">Not assessed</span>;
  return <ListTag tone={RISK_TONE[risk]} dashed={risk === "low"}>{RISK_WORD[risk]}</ListTag>;
}

export const RISK_TEXT = RISK_WORD;
