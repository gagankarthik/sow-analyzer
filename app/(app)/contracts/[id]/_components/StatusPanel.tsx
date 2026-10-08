"use client";

// Requirement 3 at a glance: who has it, how long it has sat there against
// its target, where it is on the road to signature, and what it is worth.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleDashed, Coins, UserRound } from "@/components/ui/icons";
import { DaysInStage, PersonDot, WaitingOnChip } from "@/components/govern/primitives";
import { ActionDialogHost, availableActions, type ActionKind } from "@/components/govern/actions";
import { DIRECTION_LABEL, STAGE_LABEL, STATE_LABEL, daysLabel, personName, plural } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { ContractDetail, SlaStatus } from "@/lib/govern/types";

const VALUE_SOURCE: Record<NonNullable<ContractDetail["valueSource"]>, string> = {
  manual: "entered by a reviewer",
  extracted: "found by Sonar",
  expected: "expected at intake",
};

export function StatusPanel({ contract: c, onShowMissing }: { contract: ContractDetail; onShowMissing: () => void }) {
  const [dialog, setDialog] = useState<ActionKind | null>(null);
  const closed = c.state === "rejected" || c.state === "closed";
  const canAssign = availableActions(c).includes("assign");
  const gaps = c.captureGaps?.length ?? 0;

  return (
    <section aria-label="Where it is" className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {/* Who has it */}
      <div className="flex flex-col gap-2.5 p-5">
        <h2 className="text-lg font-semibold">Who has it</h2>
        <div className="flex flex-wrap items-center gap-2">
          <WaitingOnChip waitingOn={c.waitingOn} className="h-7 text-sm" />
          <span className="text-sm text-[var(--ink-600)]">{STATE_LABEL[c.state]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--ink-600)]">Owner</span>
          {c.owner ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
              <PersonDot name={c.owner.name} email={c.owner.email} />
              <span className="truncate">{personName(c.owner)}</span>
            </span>
          ) : !canAssign ? (
            <span className="text-[var(--ink-600)]">{closed ? "—" : "Unassigned"}</span>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setDialog("assign")} className="border-dashed border-[var(--warning)] text-[var(--warning)]">
              <UserRound size={13} />Unassigned — assign a reviewer
            </Button>
          )}
        </div>
      </div>

      {/* How long */}
      {!closed && (
        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold">How long</h2>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{c.daysInStage}</span>
            <span className="text-sm text-[var(--ink-700)]">{c.daysInStage === 1 ? "day" : "days"} at this step · {STAGE_LABEL[c.stage]}</span>
            <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} className="ml-auto" />
          </div>
          <ClockBar days={c.daysInStage} target={c.targetDays} sla={c.slaStatus} />
          <p className="text-xs text-[var(--ink-600)]">
            {c.targetDays ? `Target ${daysLabel(c.targetDays)} in this stage` : "No target set for this stage"}
            {" · "}{daysLabel(c.totalDays)} since it arrived
            {c.rounds > 0 && <> · {plural(c.rounds, "round")} with the other side</>}
          </p>
        </div>
      )}


      {/* Value */}
      <div className="flex flex-col gap-2 p-5">
        <h2 className="text-lg font-semibold">Value · {DIRECTION_LABEL[c.direction]}</h2>
        {c.value !== null ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-semibold tabular-nums text-foreground">{contractValueText(c)}</span>
            <span className="text-xs text-[var(--ink-600)]">
              {c.valueSource ? VALUE_SOURCE[c.valueSource] : ""}
              {c.valueBucket === "current" ? " · counts as current" : c.valueBucket === "potential" ? " · counts as potential" : ""}
            </span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--ink-700)]">No value yet — totals are incomplete</span>
            {!closed && (
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog("add_value")}>
                <Coins size={13} />Add the value
              </Button>
            )}
          </div>
        )}
        {gaps > 0 && (
          <button type="button" onClick={onShowMissing} className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-[var(--brand-primary-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
            <CircleDashed size={13} />{plural(gaps, "detail")} missing — fill them in
          </button>
        )}
      </div>

      <ActionDialogHost kind={dialog} contract={c} onClose={() => setDialog(null)} />
    </section>
  );
}

const CLOCK_FILL: Record<SlaStatus, string> = {
  on_track: "var(--success)",
  none: "var(--ink-400)",
  amber: "var(--warning)",
  red: "var(--danger)",
};

/** Days so far against the stage target. The target sits at 2/3 of the bar,
 *  so time past it stays visible instead of overflowing. */
function ClockBar({ days, target, sla }: { days: number; target: number | null; sla: SlaStatus }) {
  if (!target) return null;
  const scale = target * 1.5;
  const fill = Math.min(days / scale, 1) * 100;
  const mark = (target / scale) * 100;
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full" role="img" aria-label={`${days} of ${target} target days`}>
      <rect x="0" y="0" width="100" height="8" rx="4" fill="var(--ink-100)" />
      <rect x="0" y="0" width={Math.max(fill, 1)} height="8" rx="4" fill={CLOCK_FILL[sla]} />
      <rect x={mark - 0.4} y="0" width="0.8" height="8" fill="var(--ink-700)" />
    </svg>
  );
}

