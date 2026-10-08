"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REJECT_REASONS, REJECT_REASON_LABEL } from "@/lib/govern/labels";
import type { Contract, RejectReason } from "@/lib/govern/types";
import { ActionDialog, Field, NoteField } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";

export function RejectDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [reason, setReason] = useState<RejectReason | "">(contract.nextStep.action === "reject" ? "unacceptable_terms" : "");
  const [note, setNote] = useState("");
  const needsNote = reason === "other";

  async function confirm() {
    if (!reason) return;
    const ok = await run(
      contract.contractId,
      { action: "reject", reasonCode: reason, note: note.trim() || undefined },
      { what: "reject this contract", success: "Contract rejected", description: `${contract.title} · ${REJECT_REASON_LABEL[reason]}` },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title="Reject this contract"
      description={<>OSU will not sign <strong className="font-semibold text-foreground">{contract.title}</strong>. It leaves the board; you can reopen it later from “Show rejected & closed”.</>}
      confirmLabel="Reject"
      onConfirm={confirm}
      pending={pending}
      disabled={!reason || (needsNote && !note.trim())}
    >
      <Field label="Why?" htmlFor="reject-reason">
        <Select value={reason} onValueChange={(v) => setReason(v as RejectReason)}>
          <SelectTrigger id="reject-reason" className="w-full">
            <SelectValue placeholder="Choose a reason" />
          </SelectTrigger>
          <SelectContent>
            {REJECT_REASONS.map((r) => <SelectItem key={r} value={r}>{REJECT_REASON_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <NoteField
        id="reject-note"
        value={note}
        onChange={setNote}
        label={needsNote ? "Explain the reason" : "Note (optional)"}
        placeholder="e.g. Sponsor will not accept OSU's publication rights."
      />
    </ActionDialog>
  );
}
