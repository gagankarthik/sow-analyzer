"use client";

import { byEdition } from "@/lib/edition-runtime";
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
  // Confirm was pressed with something missing: say what, under the field.
  const [attempted, setAttempted] = useState(false);
  const reasonError = attempted && !reason ? "Pick a reason, so the record shows why." : undefined;
  const noteError = attempted && needsNote && !note.trim() ? "Say why, so the other side can respond." : undefined;

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
      description={<>You will not sign <strong className="font-semibold text-foreground">{contract.title}</strong>. It leaves the board; you can find and reopen it later under All on the Workflow board.</>}
      confirmLabel="Reject"
      onConfirm={confirm}
      pending={pending}
      disabled={!reason || (needsNote && !note.trim())}
      onInvalidSubmit={() => setAttempted(true)}
    >
      <Field label="Why?" htmlFor="reject-reason" error={reasonError}>
        <Select value={reason} onValueChange={(v) => setReason(v as RejectReason)}>
          <SelectTrigger id="reject-reason" className="w-full"
            aria-invalid={reasonError ? true : undefined} aria-describedby={reasonError ? "reject-reason-error" : undefined}>
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
        error={noteError}
        placeholder={byEdition("e.g. Sponsor will not accept your publication rights.", "e.g. Vendor will not accept the hourly rate cap.")}
      />
    </ActionDialog>
  );
}
