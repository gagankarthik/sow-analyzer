"use client";

// Taking a contract off the board for good, and the way out when Sonar could
// not read a document: analyze it (anyway, when Sonar doubted it is an
// agreement) or remove it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "@/components/ui/icons";
import { useReanalyzeContract, useRemoveContract } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";
import { ActionDialog } from "./ActionDialog";
import { useGovernErrorToast } from "./useRunAction";

export function RemoveContractDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const remove = useRemoveContract();
  const onError = useGovernErrorToast();
  const router = useRouter();

  async function confirm() {
    try {
      await remove.mutateAsync(contract.contractId);
      toast.success("Removed from Govern", { description: `${contract.title || "The contract"} and its documents are gone.` });
      onOpenChange(false);
      router.push("/contracts");
    } catch (e) {
      onError(e, "remove this contract", contract.contractId);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this contract?"
      description="Its documents and analysis are deleted. The activity log is kept. This can't be undone."
      confirmLabel="Remove contract"
      tone="danger"
      onConfirm={confirm}
      pending={remove.isPending}
    />
  );
}

/** The next step when the analysis failed: analyze it, or remove it. */
export function AnalysisFailedActions({ contract, size = "lg" }: { contract: Contract; size?: "sm" | "default" | "lg" }) {
  const reanalyze = useReanalyzeContract(contract);
  const onError = useGovernErrorToast();
  const [removing, setRemoving] = useState(false);
  const notAgreement = contract.analysisError === "not_agreement";
  const canEdit = contract.allowedActions.some((a) => a !== "comment");

  async function analyze() {
    try {
      await reanalyze.mutateAsync(notAgreement);
      toast.success("Sonar is reading it", { description: "The review appears here when the analysis finishes." });
    } catch (e) {
      onError(e, "start the analysis", contract.contractId);
    }
  }

  if (!canEdit) return null;
  return (
    <>
      <Button type="button" size={size} onClick={analyze} disabled={reanalyze.isPending} className="min-w-0 max-sm:flex-1">
        {reanalyze.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {notAgreement ? "Analyze anyway" : "Analyze again"}
      </Button>
      <Button type="button" size={size} variant="outline" onClick={() => setRemoving(true)}>
        <Trash2 size={14} />Remove
      </Button>
      {removing && <RemoveContractDialog contract={contract} open onOpenChange={setRemoving} />}
    </>
  );
}
