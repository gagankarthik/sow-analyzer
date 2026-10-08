import type { DataTableColumn } from "@/components/ds/DataTable";
import { AvatarStack } from "@/components/ds/Avatar";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { StageDots } from "@/components/govern/StageDots";
import { RISK_LABEL } from "@/lib/chart-theme";
import { AGREEMENT_TYPE_LABEL, STAGES } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import { contractPeople } from "@/lib/govern/people";
import type { Contract } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/* The Contracts dashboard's columns: name and party, where it is (stage
   dots), whose turn and for how long, the people on it, then value, type,
   risk and last update for wider screens. */

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const CONTRACT_COLUMNS: DataTableColumn<Contract>[] = [
  {
    id: "title", header: "Name", card: "title", className: "min-w-[16rem] max-w-[26rem]",
    sortValue: (c) => c.title.toLowerCase(),
    cell: (c) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate" title={c.title}>{c.title || "Untitled agreement"}</span>
        {(c.counterparty || c.sponsor) && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{c.counterparty || c.sponsor}</span>}
      </span>
    ),
  },
  { id: "stage", header: "Stage", card: "status", className: "w-36", sortValue: (c) => STAGES.indexOf(c.stage), cell: (c) => <StageDots contract={c} /> },
  { id: "waiting", header: "Turn", card: "status", cell: (c) => <WaitingOnChip waitingOn={c.waitingOn} short />, sortValue: (c) => c.waitingOn.kind },
  { id: "days", header: "In step", numeric: true, sortFirst: "desc", sortValue: (c) => c.daysInStage, cell: (c) => <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} /> },
  { id: "value", header: "Value", numeric: true, sortFirst: "desc", sortValue: (c) => c.value, cell: (c) => contractValueText(c) },
  {
    id: "owner", header: "People", priority: 2,
    sortValue: (c) => c.owner?.name?.toLowerCase() ?? c.owner?.email ?? null,
    cell: (c) => <AvatarStack people={contractPeople(c)} emptyLabel="Unassigned" />,
  },
  { id: "type", header: "Type", priority: 2, sortValue: (c) => AGREEMENT_TYPE_LABEL[c.agreementType], cell: (c) => AGREEMENT_TYPE_LABEL[c.agreementType] },
  {
    id: "risk", header: "Risk", priority: 3,
    sortValue: (c) => (c.overallRisk ? RISK_ORDER[c.overallRisk] : null),
    cell: (c) => c.overallRisk ? (
      <span className={cn("text-sm font-medium", c.overallRisk === "critical" ? "text-[var(--danger)]" : c.overallRisk === "high" ? "text-[var(--warning-fg)]" : "text-[var(--ink-700)]")}>
        {RISK_LABEL[c.overallRisk]}
      </span>
    ) : <span className="text-[var(--ink-500)]">Not assessed</span>,
  },
  { id: "updated", header: "Updated", priority: 3, numeric: true, sortFirst: "desc", sortValue: (c) => c.updatedAt, cell: (c) => new Date(c.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) },
];
