"use client";

// The bar under the table: how many contracts are in view and three
// calculations over exactly those rows, in hairline-divided 12px cells.

import { fmtMoney } from "@/lib/contract-value";
import type { ListTotals } from "@/lib/govern/list-totals";

const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function ListFooter({ totals, currency }: { totals: ListTotals; currency: string }) {
  return (
    <div role="status" aria-label="Totals for the contracts in view" className="grid grid-cols-2 border-b border-border-default text-[12px] leading-none sm:grid-cols-4">
      <Cell>
        <span className="font-medium tabular-nums text-[var(--ink-900)]">{totals.count.toLocaleString()}</span>
        <span className="text-[var(--ink-600)]">{totals.count === 1 ? "contract" : "contracts"} in view</span>
      </Cell>
      <Cell>
        <span className="text-[var(--ink-600)]">Sum of value</span>
        <span className="font-medium tabular-nums text-[var(--ink-900)]">{fmtMoney(totals.valueSum, currency)}</span>
        {totals.otherCurrency > 0 && <span className="text-[var(--ink-500)]">+{totals.otherCurrency} in other currencies</span>}
      </Cell>
      <Cell>
        <span className="text-[var(--ink-600)]">Avg days in step</span>
        <span className="font-medium tabular-nums text-[var(--ink-900)]">{totals.avgDays === null ? "—" : oneDecimal.format(totals.avgDays)}</span>
      </Cell>
      <Cell>
        <span className="text-[var(--ink-600)]">Overdue</span>
        <span className={totals.overdue > 0 ? "font-medium tabular-nums text-status-blocked-fg" : "font-medium tabular-nums text-[var(--ink-900)]"}>
          {totals.overdue.toLocaleString()}
        </span>
      </Cell>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-e border-border-default px-3 py-3 last:border-e-0 max-sm:even:border-e-0 max-sm:[&:nth-child(-n+2)]:border-b">{children}</div>;
}
