"use client";

/**
 * The tenant's enabled compliance packs, read from and written to the API
 * (`/tenant/compliance`). One query feeds the settings page and the dashboard,
 * so a toggle in settings is reflected everywhere at once. Nothing is shown as
 * "enabled" until the API has answered — there is no client-side default.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getCompliancePacks, saveCompliancePacks, type CompliancePacksState } from "@/lib/api";

export const complianceKeys = {
  packs: ["tenant", "compliance-packs"] as const,
};

const SAVE_KEY = ["tenant", "compliance-packs", "save"] as const;

export function useCompliancePacks(): UseQueryResult<CompliancePacksState> {
  return useQuery({
    queryKey: complianceKeys.packs,
    queryFn: getCompliancePacks,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/** Save the full list of enabled pack ids. The switch moves immediately and is
 *  put back if the API refuses. */
export function useSaveCompliancePacks() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: SAVE_KEY,
    mutationFn: (ids: string[]) => saveCompliancePacks(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: complianceKeys.packs });
      const previous = qc.getQueryData<CompliancePacksState>(complianceKeys.packs);
      if (previous) {
        qc.setQueryData<CompliancePacksState>(complianceKeys.packs, { ...previous, packs: ids, explicit: true });
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) qc.setQueryData(complianceKeys.packs, context.previous);
    },
    onSettled: () => {
      // With several quick toggles, only the last one re-reads the server state;
      // an earlier refetch would briefly undo the later optimistic change.
      if (qc.isMutating({ mutationKey: SAVE_KEY }) <= 1) {
        void qc.invalidateQueries({ queryKey: complianceKeys.packs });
      }
    },
  });
}
