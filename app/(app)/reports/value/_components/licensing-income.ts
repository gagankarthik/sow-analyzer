"use client";

// Licensing income (Requirement 4): upfront fees, milestones, royalties,
// equity and sublicense income extracted from license and option agreements.
// The contract list does not carry these, so the detail of each license or
// option contract is read (capped, in parallel, cached with the contract page).

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { isPermanentError } from "@/lib/api";
import { getContract } from "@/lib/govern/api";
import { governKeys } from "@/lib/govern/queries";
import type { Contract, IncomeItem, IncomeKind } from "@/lib/govern/types";

/** At most this many contract details are read for the income view. */
export const INCOME_DETAIL_CAP = 100;

export const LICENSING_KINDS: IncomeKind[] = ["upfront", "milestone", "royalty", "equity", "sublicense"];

export interface IncomeRow extends IncomeItem {
  contractId: string;
  contractTitle: string;
  currency: string | null;
}

export function isLicensing(c: Contract): boolean {
  return c.agreementType === "license" || c.agreementType === "option";
}

export function useLicensingIncome(contracts: Contract[]) {
  const licensing = useMemo(() => contracts.filter(isLicensing), [contracts]);
  const read = licensing.slice(0, INCOME_DETAIL_CAP);
  const results = useQueries({
    queries: read.map((c) => ({
      queryKey: governKeys.contract(c.contractId),
      queryFn: () => getContract(c.contractId),
      staleTime: 60_000,
      retry: (n: number, e: Error) => !isPermanentError(e) && n < 2,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const failed = results.filter((r) => r.isError).length;
  // Stable key so the rows only rebuild when a detail actually changes.
  const stamp = results.map((r) => r.dataUpdatedAt).join(",");
  const rows = useMemo<IncomeRow[]>(() => {
    const out: IncomeRow[] = [];
    for (const r of results) {
      const d = r.data;
      if (!d) continue;
      for (const item of d.licensingIncome ?? []) {
        if (!LICENSING_KINDS.includes(item.kind)) continue;
        out.push({ ...item, contractId: d.contractId, contractTitle: d.title, currency: d.currency ? d.currency.toUpperCase() : null });
      }
    }
    return out;
    // `results` is a new array each render; `stamp` changes only when data does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  return { rows, loading, failed, total: licensing.length, read: read.length, capped: licensing.length > INCOME_DETAIL_CAP };
}

/** "Q3 2026" from an ISO date; null when there is no date. */
export function quarterOf(iso: string | null): { key: string; label: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const q = Math.floor(d.getMonth() / 3) + 1;
  return { key: `${d.getFullYear()}-${q}`, label: `Q${q} ${d.getFullYear()}` };
}
