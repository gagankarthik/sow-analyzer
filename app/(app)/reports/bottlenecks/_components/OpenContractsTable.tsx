"use client";

// Every open contract in one table (the shared DataTable). Columns carry a
// priority: the essentials always show, the rest appear as the screen widens
// (and all of it is one click away on the contract page). Under md the rows
// become stacked cards. Sortable headers, a sticky header, optional grouping
// by step or by who it waits on, selection with CSV export, and pages of 25.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { DataTable, StatusPill, type DataTableColumn, type DataTableGroupBy } from "@/components/ds";
import type { ToneInput } from "@/components/ds/tone";
import { WaitingOnChip } from "@/components/govern/primitives";
import { SLA_LABEL, STAGE_LABEL, STAGES, WAITING_ON_SHORT, daysLabel, personName } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract, SlaStatus, WaitingOnKind } from "@/lib/govern/types";
import { displayTitle } from "@/lib/format";

export type SortKey = "title" | "stage" | "waitingOn" | "owner" | "daysInStage" | "totalDays" | "sla" | "value";
type SortDir = "asc" | "desc";
export type GroupBy = "none" | "stage" | "waitingOn";

const SLA_RANK: Record<SlaStatus, number> = { red: 0, amber: 1, on_track: 2, none: 3 };
/** Red and amber only where a target is actually missed; the rest stays neutral. */
const SLA_TONE: Record<SlaStatus, ToneInput> = { red: "blocked", amber: "caution", on_track: "unknown", none: "unknown" };

function compare(a: Contract, b: Contract, key: SortKey): number {
  switch (key) {
    case "title": return a.title.localeCompare(b.title);
    case "stage": return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
    case "waitingOn": return a.waitingOn.label.localeCompare(b.waitingOn.label);
    case "owner": return personName(a.owner).localeCompare(personName(b.owner));
    case "daysInStage": return a.daysInStage - b.daysInStage;
    case "totalDays": return a.totalDays - b.totalDays;
    case "sla": return SLA_RANK[a.slaStatus] - SLA_RANK[b.slaStatus];
    case "value": return (a.value ?? -1) - (b.value ?? -1);
  }
}

/** Sort used by both the table and the export, so the file lists rows in screen order. */
export function sortContracts(rows: Contract[], key: SortKey, dir: SortDir): Contract[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compare(a, b, key) * sign || b.daysInStage - a.daysInStage);
}

export function useContractSort(initial: SortKey = "daysInStage") {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: initial, dir: "desc" });
  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key, dir: key === "title" || key === "owner" || key === "waitingOn" || key === "stage" ? "asc" : "desc" }));
  return { sort, toggle };
}

const COLUMNS: DataTableColumn<Contract>[] = [
  {
    id: "title", header: "Contract", card: "title", className: "min-w-[14rem]", sortValue: (c) => c.title,
    exportValue: (c) => displayTitle(c.title),
    cell: (c) => (
      <span className="flex min-w-0 max-w-[min(24rem,32cqw)] flex-col">
        <span className="truncate" title={c.title}>{displayTitle(c.title)}</span>
        {(c.sponsor || c.counterparty) && (
          <span className="truncate text-xs font-normal text-[var(--ink-600)]">{c.sponsor || c.counterparty}</span>
        )}
      </span>
    ),
  },
  { id: "stage", header: "Step", priority: 2, sortValue: (c) => STAGES.indexOf(c.stage), exportValue: (c) => STAGE_LABEL[c.stage], cell: (c) => STAGE_LABEL[c.stage] },
  {
    id: "waitingOn", header: "Waiting on", sortValue: (c) => c.waitingOn.label, exportValue: (c) => c.waitingOn.label,
    cell: (c) => <WaitingOnChip waitingOn={c.waitingOn} />,
  },
  { id: "owner", header: "Owner", priority: 2, sortValue: (c) => personName(c.owner), truncate: (c) => personName(c.owner) },
  {
    id: "daysInStage", header: "In step", numeric: true, sortValue: (c) => c.daysInStage, exportValue: (c) => c.daysInStage,
    cell: (c) => daysLabel(c.daysInStage),
  },
  {
    id: "sla", header: "Against target", card: "status", sortFirst: "asc", sortValue: (c) => SLA_RANK[c.slaStatus], exportValue: (c) => SLA_LABEL[c.slaStatus],
    cell: (c) => (
      <StatusPill size="sm" tone={SLA_TONE[c.slaStatus]} title={c.targetDays ? `Target ${daysLabel(c.targetDays)} in this step` : undefined}>
        {SLA_LABEL[c.slaStatus]}
      </StatusPill>
    ),
  },
  { id: "totalDays", header: "Total", priority: 3, numeric: true, sortValue: (c) => c.totalDays, exportValue: (c) => c.totalDays, cell: (c) => daysLabel(c.totalDays) },
  { id: "value", header: "Value", priority: 3, numeric: true, sortValue: (c) => c.value, exportValue: (c) => c.value, cell: (c) => contractValueText(c) },
  { id: "next", header: "Next step", priority: 2, exportValue: (c) => c.nextStep.headline, truncate: (c) => c.nextStep.headline },
];

/** Group header: whole-group average days in step and overdue count. */
function groupNote(rows: Contract[]): string {
  const avg = Math.round(rows.reduce((s, c) => s + c.daysInStage, 0) / Math.max(1, rows.length));
  const overdue = rows.filter((c) => c.slaStatus === "red").length;
  return `avg ${daysLabel(avg)}${overdue ? ` · ${overdue} overdue` : ""}`;
}

const WAITING_ORDER = (Object.keys(WAITING_ON_SHORT) as WaitingOnKind[]).sort((a, b) => WAITING_ON_SHORT[a].localeCompare(WAITING_ON_SHORT[b]));

const GROUPS: Record<Exclude<GroupBy, "none">, DataTableGroupBy<Contract>> = {
  stage: { key: (c) => c.stage, label: (k) => STAGE_LABEL[k as Contract["stage"]], order: [...STAGES], subtotal: groupNote },
  waitingOn: {
    key: (c) => c.waitingOn.kind,
    label: (k) => `Waiting on ${(WAITING_ON_SHORT[k as WaitingOnKind] ?? k).toLowerCase()}`,
    order: WAITING_ORDER,
    subtotal: groupNote,
  },
};

export function OpenContractsTable({
  contracts, sort, onSort,
}: {
  contracts: Contract[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => sortContracts(contracts, sort.key, sort.dir), [contracts, sort]);

  return (
    <DataTable
      caption="Open contracts, sortable. Select a contract to open it."
      noun="contracts"
      columns={COLUMNS}
      rows={rows}
      getRowId={(c) => c.contractId}
      getRowHref={(c) => `/contracts/${encodeURIComponent(c.contractId)}`}
      getRowLabel={(c) => displayTitle(c.title)}
      sort={{ columnId: sort.key, direction: sort.dir }}
      onSortChange={(s) => s && onSort(s.columnId as SortKey)}
      groupBy={groupBy === "none" ? undefined : GROUPS[groupBy]}
      pageSize={25}
      columnsKey="bottlenecks-open-contracts"
      selection={{ selected, onChange: setSelected }}
      exportName="open-contracts"
      toolbar={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-2">
          <div className="flex items-center gap-2">
            <span id="group-by-label" className="text-xs text-[var(--ink-600)]">Group by</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger aria-labelledby="group-by-label" className="h-8 w-44 text-xs max-md:h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nothing</SelectItem>
                <SelectItem value="stage">Step</SelectItem>
                <SelectItem value="waitingOn">Who it waits on</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Phones show cards without headers, so sorting moves here. */}
          <div className="flex items-center gap-2 md:hidden">
            <span id="sort-by-label" className="text-xs text-[var(--ink-600)]">Sort by</span>
            <Select value={sort.key} onValueChange={(v) => onSort(v as SortKey)}>
              <SelectTrigger aria-labelledby="sort-by-label" className="h-11 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMNS.filter((c) => c.sortValue).map((c) => <SelectItem key={c.id} value={c.id}>{c.header}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    />
  );
}
