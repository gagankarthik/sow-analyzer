"use client";

// One way to run a reviewer action from any screen: the board, the contract
// page, the leader home. Success and failure are said in plain words, and a
// 409 (someone else moved the contract first) refreshes instead of erroring.

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorCode, errorStatus, isForbidden } from "@/lib/api";
import { governKeys, useAnyContractAction } from "@/lib/govern/queries";
import type { ContractAction } from "@/lib/govern/types";

/** Handles a failed Govern write the same way everywhere. */
export function useGovernErrorToast() {
  const qc = useQueryClient();
  return (e: unknown, what: string, contractId?: string) => {
    if (errorStatus(e) === 409 || errorCode(e) === "invalid_transition" || errorCode(e) === "conflict") {
      toast.info("Someone else just changed this contract — refreshed", {
        description: "Have a look at its new status, then try again if it still needs doing.",
      });
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
      if (contractId) void qc.invalidateQueries({ queryKey: governKeys.contract(contractId) });
      return;
    }
    if (isForbidden(e)) {
      toast.error(`You can't ${what.toLowerCase()} with your role`, {
        description: "Ask a Govern admin if you think you should be able to.",
      });
      return;
    }
    toast.error(`Couldn't ${what.toLowerCase()}`, {
      description: e instanceof Error ? e.message : "Please try again.",
    });
  };
}

export function useRunContractAction() {
  const mutation = useAnyContractAction();
  const onError = useGovernErrorToast();

  /** Runs the action; resolves true when it went through. */
  async function run(contractId: string, action: ContractAction, done: { what: string; success: string; description?: string }) {
    try {
      await mutation.mutateAsync({ id: contractId, action });
      toast.success(done.success, done.description ? { description: done.description } : undefined);
      return true;
    } catch (e) {
      onError(e, done.what, contractId);
      return false;
    }
  }

  return { run, pending: mutation.isPending };
}
