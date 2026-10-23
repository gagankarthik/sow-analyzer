"use client";

// Who is carrying the open work: one row per reviewer, with how much of
// their load is overdue or running late drawn as a bar against their open
// count. Red and amber only when there is something overdue or late.

import { useState } from "react";
import { DataTable, ProgressMeter, type DataTableColumn } from "@/components/ds";
import { plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import type { WorkloadRow } from "@/lib/govern/leadership";
import { cn } from "@/lib/utils";

/** The count beside a mini bar of its share of the row's open contracts, on one line with the rest of the row. */
function ShareOfOpen({ row, value, label, tone }: { row: WorkloadRow; value: number; label: string; tone: "blocked" | "caution" }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      {row.open > 0 && (
        <ProgressMeter className="w-12" hideLabel label={`${row.name}: ${label} of ${row.open} open`} value={value} max={row.open} valueText={`${value} of ${row.open}`} tone={value > 0 ? tone : "unknown"} />
      )}
      <span className={cn("min-w-[2ch]", value > 0 ? "font-semibold" : "text-[var(--ink-600)]")}>{value}</span>
    </span>
  );
}

function columns(currency: string | null): DataTableColumn<WorkloadRow>[] {
  return [
    {
      id: "name", header: "Reviewer", card: "title", sortValue: (r) => r.name, exportValue: (r) => (r.email && r.email !== r.name ? `${r.name} <${r.email}>` : r.name),
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", r.key === "__unassigned" && "text-[var(--warning-fg)]")}>{r.name}</span>
          {r.email && r.email !== r.name && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{r.email}</span>}
        </span>
      ),
    },
    { id: "open", header: "Open", numeric: true, sortValue: (r) => r.open, exportValue: (r) => r.open, cell: (r) => r.open },
    {
      id: "overdue", header: "Overdue", numeric: true, sortValue: (r) => r.overdue, exportValue: (r) => r.overdue,
      cell: (r) => <ShareOfOpen row={r} value={r.overdue} label="overdue" tone="blocked" />,
    },
    {
      id: "late", header: "Running late", numeric: true, sortValue: (r) => r.late, exportValue: (r) => r.late,
      cell: (r) => <ShareOfOpen row={r} value={r.late} label="running late" tone="caution" />,
    },
    { id: "longest", header: "Longest wait", numeric: true, priority: 2, sortValue: (r) => r.longestDays, exportValue: (r) => r.longestDays, cell: (r) => plural(r.longestDays, "day") },
    {
      id: "value", header: "Value held", numeric: true, priority: 2, sortValue: (r) => r.value, exportValue: (r) => r.value,
      cell: (r) => (r.value === null ? "—" : formatCompact(r.value, currency)),
    },
  ];
}

export function TeamWorkloadTable({ rows, currency }: { rows: WorkloadRow[]; currency: string | null }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  return (
    <DataTable
      caption="Team workload: open contracts per reviewer"
      noun="reviewers"
      columns={columns(currency)}
      rows={rows}
      getRowId={(r) => r.key}
      pageSize={25}
      selection={{ selected, onChange: setSelected }}
      exportName="team-workload"
      empty={<p className="px-4 py-5 text-sm text-[var(--ink-600)]">No open contracts right now.</p>}
    />
  );
}
