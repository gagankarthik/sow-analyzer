import type { DataTableColumn } from "@/components/ds/DataTable";
import { AvatarStack } from "@/components/ds/Avatar";
import { TurnPill } from "@/components/govern/primitives";
import { StageDots } from "@/components/govern/StageDots";
import { RISK_LABEL } from "@/lib/chart-theme";
import { AGREEMENT_TYPE_LABEL, STAGES } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import { contractPeople } from "@/lib/govern/people";
import type { Contract } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/* The Contracts dashboard's columns: name and party, where it is (stage
   dots), whose turn with how long it has waited, the people on it and the
   value; type, risk and last update join on the widest screens (or from the
   Columns menu), so the table fits beside the Views panel at 1280px. */

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const CONTRACT_COLUMNS: DataTableColumn<Contract>[] = [
  {
    id: "title", header: "Name", card: "title", className: "min-w-[12rem]",
    sortValue: (c) => c.title.toLowerCase(),
    // The width cap sits on the text, not the cell: table cells ignore max-width,
    // so a long name would otherwise run into the next column. It is a share of
    // the table's own width (cqw); a table with fewer columns raises --name-cap.
    cell: (c) => (
      <span className="flex min-w-0 max-w-[min(30rem,var(--name-cap,33cqw))] flex-col">
        <span className="truncate" title={c.title}>{c.title || "Untitled contract"}</span>
        {(c.counterparty || c.sponsor) && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{c.counterparty || c.sponsor}</span>}
      </span>
    ),
  },
  { id: "stage", header: "Stage", card: "status", className: "w-32", sortValue: (c) => STAGES.indexOf(c.stage), cell: (c) => <StageDots contract={c} /> },
  {
    // Whose turn, and how long it has waited there: one cell, sorted by days.
    id: "days", header: "Turn", card: "status", sortFirst: "desc", sortValue: (c) => c.daysInStage,
    cell: (c) => <TurnPill waitingOn={c.waitingOn} days={c.daysInStage} sla={c.slaStatus} />,
  },
  { id: "value", header: "Value", priority: 2, numeric: true, sortFirst: "desc", sortValue: (c) => c.value, cell: (c) => contractValueText(c) },
  {
    id: "owner", header: "People", priority: 2,
    sortValue: (c) => c.owner?.name?.toLowerCase() ?? c.owner?.email ?? null,
    cell: (c) => <AvatarStack people={contractPeople(c)} emptyLabel="Unassigned" />,
  },
  { id: "type", header: "Type", priority: 4, sortValue: (c) => AGREEMENT_TYPE_LABEL[c.agreementType], cell: (c) => AGREEMENT_TYPE_LABEL[c.agreementType] },
  {
    id: "risk", header: "Risk", priority: 4,
    sortValue: (c) => (c.overallRisk ? RISK_ORDER[c.overallRisk] : null),
    cell: (c) => c.overallRisk ? (
      <span className={cn("text-sm font-medium", c.overallRisk === "critical" ? "text-[var(--danger)]" : c.overallRisk === "high" ? "text-[var(--warning-fg)]" : "text-[var(--ink-700)]")}>
        {RISK_LABEL[c.overallRisk]}
      </span>
    ) : <span className="text-[var(--ink-500)]">Not assessed</span>,
  },
  { id: "updated", header: "Updated", priority: 4, numeric: true, sortFirst: "desc", sortValue: (c) => c.updatedAt, cell: (c) => new Date(c.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) },
];
