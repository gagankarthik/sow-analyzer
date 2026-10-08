"use client";

import { useContracts } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";

/** The Govern contract a document belongs to (as its current version or any
 *  earlier one), from the shared contracts list. `null` when there is none. */
export function useContractForDoc(docId: string): { contract: Contract | null; isLoading: boolean; isError: boolean; error: unknown } {
  const q = useContracts(true);
  const contract = docId
    ? (q.data?.contracts ?? []).find((c) => c.contractId === docId || c.currentDocId === docId || c.versionDocIds.includes(docId)) ?? null
    : null;
  return { contract, isLoading: q.isLoading, isError: q.isError, error: q.error };
}
