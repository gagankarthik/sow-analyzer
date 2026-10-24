"use client";

// A contract's properties as small bordered chips (24px, icon + value): the
// right side of a list row, the bottom of a board card. One renderer per
// property id, the same ids as the list's columns, so "Show properties" and
// the spreadsheet's columns are one setting. Every chip carries its meaning
// in words or an icon as well as colour. Chips are display-only, except the
// owner chip, which opens Assign when the person may assign the contract.

import * as React from "react";
import { Avatar } from "@/components/ds/Avatar";
import { formatDate } from "@/components/ds/format";
import { Blocker, Building2, Calendar, Clause, Clock, Coins, Flag, Hourglass } from "@/components/ui/icons";
import { AGREEMENT_TYPE_LABEL, WAITING_ON_SHORT } from "@/lib/govern/labels";
import { riskBars } from "@/lib/govern/list-properties";
import { contractValueText, formatCompact } from "@/lib/govern/metrics";
import { daysPastTarget } from "@/lib/govern/stage-time";
import type { Contract, SlaStatus } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StageIcon } from "./StageIcon";
import { RISK_TEXT, SLA_TEXT } from "./list-cells";

export const CHIP_CLASS =
  "relative z-[1] inline-flex h-6 max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-surface-raised px-1.5 text-[12px] leading-none whitespace-nowrap text-[var(--ink-700)]";

export function Chip({ title, className, children }: { title?: string; className?: string; children: React.ReactNode }) {
  return <span title={title} className={cn(CHIP_CLASS, className)}>{children}</span>;
}

/* ─── Risk as signal bars ────────────────────────────────────────── */

const BAR_FILL: Record<RiskLevel, string> = {
  low: "fill-[var(--success)]", medium: "fill-[var(--warning)]", high: "fill-[var(--danger)]", critical: "fill-[var(--danger)]",
};

/** Four rising bars, one filled per level (low 1 … critical 4). */
export function RiskBars({ risk, className }: { risk: RiskLevel | null; className?: string }) {
  const filled = riskBars(risk);
  return (
    <svg viewBox="0 0 14 12" width="14" height="12" aria-hidden className={cn("shrink-0", className)}>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 3.5 + 0.25}
          y={9 - i * 3}
          width="2.5"
          height={3 + i * 3}
          rx="0.75"
          className={risk && i < filled ? BAR_FILL[risk] : "fill-[var(--ink-300)]"}
        />
      ))}
    </svg>
  );
}

export const RISK_FG: Record<RiskLevel, string> = {
  low: "text-[var(--success-fg)]", medium: "text-[var(--warning-fg)]", high: "text-[var(--danger)]", critical: "text-[var(--danger)]",
};

/* ─── Days in step ───────────────────────────────────────────────── */

/** "8d", or "12d · 3 over" in the danger colour once past target. */
export function daysText(c: Pick<Contract, "daysInStage" | "targetDays">): { short: string; long: string; past: number | null } {
  const past = daysPastTarget(c.daysInStage, c.targetDays);
  const unit = c.daysInStage === 1 ? "day" : "days";
  return {
    short: past !== null ? `${c.daysInStage}d · ${past} over` : `${c.daysInStage}d`,
    long: `${c.daysInStage} ${unit} in this step${past !== null ? `, ${past} past target` : c.targetDays ? ` of a ${c.targetDays}-day target` : ""}`,
    past,
  };
}

const SLA_ICON_FG: Record<SlaStatus, string> = {
  red: "text-[var(--danger)]", amber: "text-[var(--warning-fg)]", on_track: "text-[var(--ink-500)]", none: "text-[var(--ink-500)]",
};

/* ─── One chip per property ──────────────────────────────────────── */

export type ChipContext = {
  /** Opens Assign for this contract; omitted when the person may not assign it. */
  onAssign?: () => void;
};

const dash = <span className="text-[var(--ink-500)]">—</span>;

export function PropertyChip({ id, contract: c, ctx }: { id: string; contract: Contract; ctx?: ChipContext }) {
  switch (id) {
    case "stage":
      return (
        <Chip title="Stage">
          <StageIcon stage={c.stage} state={c.state} size={12} />
          <span className={cn("truncate", c.state === "rejected" && "text-[var(--danger)]")}>
            <span className="sr-only">Stage: </span>
            {c.state === "rejected" ? "Rejected" : STAGE_SHORT[c.stage]}
          </span>
        </Chip>
      );
    case "owner":
      return <OwnerChip owner={c.owner} onAssign={ctx?.onAssign} />;
    case "risk":
      return (
        <Chip title={c.overallRisk ? `${RISK_TEXT[c.overallRisk]} risk` : "Risk not assessed"}>
          <RiskBars risk={c.overallRisk} />
          <span className={cn(c.overallRisk ? cn("font-medium", RISK_FG[c.overallRisk]) : "text-[var(--ink-500)]")}>
            {c.overallRisk ? RISK_TEXT[c.overallRisk] : "None"}
            <span className="sr-only"> risk</span>
          </span>
        </Chip>
      );
    case "days": {
      const d = daysText(c);
      return (
        <Chip title={d.long} className={cn(d.past !== null && "border-[var(--danger-border)] bg-[var(--danger-soft)]")}>
          <Clock size={12} aria-hidden className={d.past !== null ? "text-[var(--danger)]" : "text-[var(--ink-500)]"} />
          <span aria-hidden className={cn("tabular-nums", d.past !== null && "font-semibold text-[var(--danger)]")}>{d.short}</span>
          <span className="sr-only">{d.long}</span>
        </Chip>
      );
    }
    case "value":
      return (
        <Chip title={`Value: ${contractValueText(c)}`}>
          <Coins size={12} aria-hidden className="text-[var(--ink-500)]" />
          <span className="sr-only">Value: </span>
          {c.value === null ? dash : <span className="tabular-nums text-[var(--ink-900)]">{formatCompact(c.value, c.currency)}</span>}
        </Chip>
      );
    case "type":
      return (
        <Chip title={`Agreement type: ${AGREEMENT_TYPE_LABEL[c.agreementType]}`}>
          <Clause size={12} aria-hidden className="text-[var(--ink-500)]" />
          <span className="truncate"><span className="sr-only">Agreement type: </span>{AGREEMENT_TYPE_LABEL[c.agreementType]}</span>
        </Chip>
      );
    case "waitingOn":
      return (
        <Chip title={c.waitingOn.label || `Waiting on ${WAITING_ON_SHORT[c.waitingOn.kind]}`}>
          <Hourglass size={12} aria-hidden className="text-[var(--ink-500)]" />
          <span className="truncate"><span className="sr-only">Waiting on: </span>{WAITING_ON_SHORT[c.waitingOn.kind]}</span>
        </Chip>
      );
    case "sla":
      return (
        <Chip title={`SLA: ${SLA_TEXT[c.slaStatus]}`}>
          <Flag size={12} aria-hidden className={SLA_ICON_FG[c.slaStatus]} />
          <span><span className="sr-only">SLA: </span>{SLA_TEXT[c.slaStatus]}</span>
        </Chip>
      );
    case "department":
      return (
        <Chip title={c.department ? `Department: ${c.department}` : "No department"}>
          <Building2 size={12} aria-hidden className="text-[var(--ink-500)]" />
          <span className="truncate"><span className="sr-only">Department: </span>{c.department ?? dash}</span>
        </Chip>
      );
    case "blockers":
      return (
        <Chip title={`${c.openBlockers} open blockers`} className={cn(c.openBlockers > 0 && "text-[var(--danger)]")}>
          <Blocker size={12} aria-hidden className={c.openBlockers > 0 ? "text-[var(--danger)]" : "text-[var(--ink-500)]"} />
          <span className="tabular-nums">{c.openBlockers}</span>
          <span className="sr-only"> open blockers</span>
        </Chip>
      );
    case "requested":
    case "termEnd":
    case "updated": {
      const label = DATE_LABEL[id];
      const iso = id === "requested" ? c.requestedDate : id === "termEnd" ? c.termEndDate : c.updatedAt;
      return (
        <Chip title={`${label}: ${iso ? formatDate(iso) : "not set"}`}>
          <Calendar size={12} aria-hidden className="text-[var(--ink-500)]" />
          <span className="sr-only">{label}: </span>
          {iso ? <span className="tabular-nums">{formatDate(iso)}</span> : dash}
        </Chip>
      );
    }
    default:
      return null;
  }
}

const DATE_LABEL: Record<string, string> = { requested: "Requested", termEnd: "Term ends", updated: "Updated" };

/** Chip-length stage names (the full name is the group header and tooltip). */
const STAGE_SHORT: Record<Contract["stage"], string> = {
  draft: "New",
  review: "In review",
  negotiation: "Other side",
  approval: "Approval",
  signed: "Signed",
  active: "Active",
  renewal: "Renewal",
  expired: "Closed out",
};

/** Avatar and first name; a button to Assign when `onAssign` is given. */
export function OwnerChip({ owner, onAssign, avatarOnly = false }: { owner: Contract["owner"]; onAssign?: () => void; avatarOnly?: boolean }) {
  const name = owner ? owner.name || owner.email : "Unassigned";
  const first = owner ? (owner.name?.split(/\s+/)[0] || owner.email.split("@")[0]) : "Unassigned";
  const body = (
    <>
      {owner ? <Avatar size="xs" name={owner.name} email={owner.email} decorative className="-ms-0.5" /> : <Avatar size="xs" decorative className="-ms-0.5" />}
      {!avatarOnly && <span className={cn("truncate", !owner && "text-[var(--ink-500)]")}>{first}</span>}
    </>
  );
  if (onAssign) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAssign(); }}
        aria-label={owner ? `Owner: ${name}. Reassign` : "Unassigned. Assign an owner"}
        title={owner ? `${name} · click to reassign` : "Assign an owner"}
        className={cn(CHIP_CLASS, "cursor-pointer transition-colors duration-150 hover:border-[var(--ink-300)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus", avatarOnly && "border-transparent bg-transparent px-0.5")}
      >
        {body}
      </button>
    );
  }
  return (
    <span title={name} className={cn(CHIP_CLASS, avatarOnly && "border-transparent bg-transparent px-0.5")}>
      {body}
      <span className="sr-only">{avatarOnly ? `Owner: ${name}` : ""}</span>
    </span>
  );
}
