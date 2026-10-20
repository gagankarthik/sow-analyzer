import type { DataTableColumn } from "@/components/ds/DataTable";
import { displayTitle } from "@/lib/format";
import { formatDate } from "@/components/ds/format";
import { AGREEMENT_TYPE_LABEL, STAGES, STAGE_LABEL, WAITING_ON_SHORT } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { DaysCell, OwnerCell, RISK_TEXT, RiskTag, SLA_TEXT, SlaTag, StageMeter } from "./list-cells";

/* The Contracts list's columns. Every one has a plain export value, so the
   CSV holds exactly what the table shows. Name, stage, days in step and
   owner always fit; the rest give way on narrow tables (into the row's
   expand panel) and can be shown, hidden and reordered from Column settings. */

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SLA_ORDER = { red: 0, amber: 1, on_track: 2, none: 3 } as const;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
const dateCell = (iso: string | null) => (iso ? <span className="tabular-nums">{formatDate(iso)}</span> : <span className="text-[var(--ink-500)]">—</span>);

export const CONTRACT_LIST_COLUMNS: DataTableColumn<Contract>[] = [
  {
    id: "title", header: "Name", card: "title", className: "min-w-[14rem]",
    sortValue: (c) => c.title.toLowerCase(),
    exportValue: (c) => c.title || "Untitled contract",
    cell: (c) => (
      <span className="flex min-w-0 max-w-[min(28rem,var(--name-cap,32cqw))] flex-col">
        <span className="truncate text-[14px]" title={c.title}>{displayTitle(c.title) || "Untitled contract"}</span>
        {(c.counterparty || c.sponsor) && <span className="truncate text-[12px] font-normal text-[var(--ink-600)]">{c.counterparty || c.sponsor}</span>}
      </span>
    ),
  },
  {
    id: "stage", header: "Stage", card: "status", className: "w-48",
    sortValue: (c) => STAGES.indexOf(c.stage),
    exportValue: (c) => (c.state === "rejected" ? "Rejected" : STAGE_LABEL[c.stage]),
    cell: (c) => <StageMeter contract={c} />,
  },
  {
    id: "days", header: "Days in step", numeric: true, sortFirst: "desc", className: "w-28",
    sortValue: (c) => c.daysInStage,
    exportValue: (c) => c.daysInStage,
    cell: (c) => <DaysCell days={c.daysInStage} sla={c.slaStatus} />,
  },
  {
    id: "owner", header: "Owner", card: "field", stopRowClick: true,
    sortValue: (c) => c.owner?.name?.toLowerCase() ?? c.owner?.email ?? null,
    exportValue: (c) => (c.owner ? c.owner.name || c.owner.email : "Unassigned"),
    cell: (c) => <OwnerCell owner={c.owner} />,
  },
  {
    id: "waitingOn", header: "Waiting on", priority: 2,
    sortValue: (c) => WAITING_ON_SHORT[c.waitingOn.kind],
    exportValue: (c) => c.waitingOn.label,
    cell: (c) => <span className="text-[var(--ink-700)]">{WAITING_ON_SHORT[c.waitingOn.kind]}</span>,
  },
  {
    id: "value", header: "Value", priority: 2, numeric: true, sortFirst: "desc",
    sortValue: (c) => c.value,
    exportValue: (c) => c.value,
    cell: (c) => (c.value === null ? <span className="text-[var(--ink-500)]">—</span> : contractValueText(c)),
  },
  {
    id: "risk", header: "Risk", priority: 3,
    sortValue: (c) => (c.overallRisk ? RISK_ORDER[c.overallRisk] : null),
    exportValue: (c) => (c.overallRisk ? RISK_TEXT[c.overallRisk] : "Not assessed"),
    cell: (c) => <RiskTag risk={c.overallRisk} />,
  },
  {
    id: "sla", header: "SLA", priority: 3,
    sortValue: (c) => SLA_ORDER[c.slaStatus],
    exportValue: (c) => SLA_TEXT[c.slaStatus],
    cell: (c) => <SlaTag sla={c.slaStatus} />,
  },
  {
    id: "type", header: "Agreement type", priority: 3,
    sortValue: (c) => AGREEMENT_TYPE_LABEL[c.agreementType],
    exportValue: (c) => AGREEMENT_TYPE_LABEL[c.agreementType],
    cell: (c) => <span className="text-[var(--ink-700)]">{AGREEMENT_TYPE_LABEL[c.agreementType]}</span>,
  },
  {
    id: "department", header: "Department", priority: 3,
    sortValue: (c) => c.department?.toLowerCase() ?? null,
    exportValue: (c) => c.department,
    truncate: (c) => c.department ?? "",
    cell: (c) => c.department ?? <span className="text-[var(--ink-500)]">—</span>,
  },
  {
    id: "blockers", header: "Open blockers", priority: 3, numeric: true, sortFirst: "desc",
    sortValue: (c) => c.openBlockers,
    exportValue: (c) => c.openBlockers,
    cell: (c) => (c.openBlockers > 0 ? c.openBlockers : <span className="text-[var(--ink-500)]">0</span>),
  },
  {
    id: "requested", header: "Requested", priority: 3, numeric: true, sortFirst: "desc",
    sortValue: (c) => c.requestedDate,
    exportValue: (c) => day(c.requestedDate),
    cell: (c) => dateCell(c.requestedDate),
  },
  {
    id: "termEnd", header: "Term ends", priority: 3, numeric: true,
    sortValue: (c) => c.termEndDate,
    exportValue: (c) => day(c.termEndDate),
    cell: (c) => dateCell(c.termEndDate),
  },
  {
    id: "updated", header: "Updated", priority: 3, numeric: true, sortFirst: "desc",
    sortValue: (c) => c.updatedAt,
    exportValue: (c) => day(c.updatedAt),
    cell: (c) => dateCell(c.updatedAt),
  },
];

export const CONTRACT_LIST_COLUMN_IDS = CONTRACT_LIST_COLUMNS.map((c) => c.id);

/** Shown until someone changes the columns. */
export const CONTRACT_LIST_DEFAULT_HIDDEN = ["sla", "department", "blockers", "requested", "termEnd", "updated"];
