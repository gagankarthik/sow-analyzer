"use client";

// Small derived-data helpers shared by the leader home and the reports.

import { useMemo } from "react";
import { useWorkflowSettings } from "@/lib/govern/queries";
import type { Money } from "@/lib/govern/metrics";
import type { Contract, Stage } from "@/lib/govern/types";

/**
 * Stage targets set by admins. Leaders may not be allowed to read the
 * settings, so when that read fails the targets the API stamped on each
 * contract (`targetDays`) are used instead: the same numbers, read another way.
 */
export function useStageTargets(contracts: Contract[]): { targets: Partial<Record<Stage, number | null>>; redAfter: number } {
  const settings = useWorkflowSettings();
  return useMemo(() => {
    if (settings.data) return { targets: settings.data.stageTargetDays, redAfter: settings.data.redAfterMultiple || 2 };
    const targets: Partial<Record<Stage, number | null>> = {};
    for (const c of contracts) if (c.targetDays !== null && targets[c.stage] == null) targets[c.stage] = c.targetDays;
    return { targets, redAfter: 2 };
  }, [settings.data, contracts]);
}

/** The currency with the biggest total across these sums: the one a chart plots. */
export function mainCurrency(...sums: Money[]): string | null {
  const totals = new Map<string, number>();
  for (const m of sums) for (const t of m.totals) totals.set(t.currency, (totals.get(t.currency) ?? 0) + t.amount);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

/** The amount of one currency in a sum (0 when that currency is absent). */
export function amountIn(money: Money, currency: string | null): number {
  return money.totals.find((t) => t.currency === (currency ?? ""))?.amount ?? 0;
}

/** Contracts with at least one capture gap (older API rows may lack the field). */
export function hasCaptureGaps(c: Contract): boolean {
  return (c.captureGaps?.length ?? 0) > 0;
}
