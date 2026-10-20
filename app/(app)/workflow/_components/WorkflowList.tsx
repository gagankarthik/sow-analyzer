"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { TableFooterSkeleton } from "@/components/ds/skeletons";
import { CONTRACT_LIST_COLUMNS, CONTRACT_LIST_DEFAULT_HIDDEN } from "@/components/govern/contract-list-columns";
import { fmtMoney } from "@/lib/contract-value";
import { displayTitle } from "@/lib/format";
import { STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import { listTotals } from "@/lib/govern/list-totals";
import { useOrgCurrency } from "@/lib/govern/queries";
import type { Contract, Stage } from "@/lib/govern/types";

/* The Workflow page as a list: the same contracts as the board in the flat
   Contracts-list table, grouped by stage in workflow order, most urgent
   first inside each stage. The stage is the group, so the Stage column is
   left out. A footer gives "N in view" and the totals for exactly those rows. */

const titleColumn: DataTableColumn<Contract> = {
  ...CONTRACT_LIST_COLUMNS[0],
  cell: (c) => {
    const title = displayTitle(c.title) || "Untitled contract";
    return (
      <span className="flex min-w-0 max-w-[min(28rem,var(--name-cap,32cqw))] flex-col">
        <span className="truncate text-sm" title={title}>{title}</span>
        {(c.counterparty || c.sponsor) && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{c.counterparty || c.sponsor}</span>}
      </span>
    );
  },
};

const COLUMNS = CONTRACT_LIST_COLUMNS
  .filter((c) => c.id !== "stage" && !CONTRACT_LIST_DEFAULT_HIDDEN.includes(c.id))
  .map((c) => (c.id === "title" ? titleColumn : c));

const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat();

export function WorkflowList({ contracts, loading, previewId, onPreview }: {
  contracts: Contract[];
  loading: boolean;
  previewId: string | null;
  onPreview: (id: string) => void;
}) {
  const currency = useOrgCurrency();
  const totals = useMemo(() => listTotals(contracts, currency), [contracts, currency]);
  return (
    <DataTable
      caption="Agreements by stage"
      // No stage column or checkboxes here, so names get more of the width.
      className="[--name-cap:50cqw]"
      noun="agreements"
      columns={COLUMNS}
      rows={contracts}
      getRowId={(c) => c.contractId}
      getRowLabel={(c) => `Preview ${displayTitle(c.title) || "Untitled contract"}`}
      onRowClick={(c) => onPreview(c.contractId)}
      activeRowId={previewId}
      state={loading ? "loading" : "ready"}
      loadingFooter={<TableFooterSkeleton />}
      groupBy={{
        key: (c) => c.stage,
        label: (k) => STAGE_LABEL[k as Stage] ?? k,
        order: STAGES,
        subtotal: (rows) => {
          const overdue = rows.filter((c) => c.slaStatus === "red").length;
          return overdue ? `${plural(overdue, "overdue")}` : null;
        },
      }}
      footer={contracts.length > 0 ? (
        <div role="status" aria-label="Totals for the agreements in view" className="grid grid-cols-2 border-b border-border-default text-xs leading-none sm:grid-cols-4">
          <FooterCell>
            <span className="font-medium tabular-nums text-[var(--ink-900)]">{whole.format(totals.count)}</span>
            <span className="text-[var(--ink-600)]">in view</span>
          </FooterCell>
          <FooterCell>
            <span className="text-[var(--ink-600)]">Sum of value</span>
            <span className="font-medium tabular-nums text-[var(--ink-900)]">{fmtMoney(totals.valueSum, currency)}</span>
            {totals.otherCurrency > 0 && <span className="text-[var(--ink-500)]">+{whole.format(totals.otherCurrency)} in other currencies</span>}
          </FooterCell>
          <FooterCell>
            <span className="text-[var(--ink-600)]">Avg days in step</span>
            <span className="font-medium tabular-nums text-[var(--ink-900)]">{totals.avgDays === null ? "—" : oneDecimal.format(totals.avgDays)}</span>
          </FooterCell>
          <FooterCell>
            <span className="text-[var(--ink-600)]">Overdue</span>
            <span className={totals.overdue > 0 ? "font-medium tabular-nums text-status-blocked-fg" : "font-medium tabular-nums text-[var(--ink-900)]"}>
              {whole.format(totals.overdue)}
            </span>
          </FooterCell>
        </div>
      ) : undefined}
    />
  );
}

function FooterCell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-e border-border-default px-3 py-3 last:border-e-0 max-sm:even:border-e-0 max-sm:[&:nth-child(-n+2)]:border-b">{children}</div>;
}
