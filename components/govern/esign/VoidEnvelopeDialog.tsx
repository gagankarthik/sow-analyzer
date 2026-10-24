"use client";

// Voiding an envelope that is out for signature: the links stop working, the
// signers who were reached get an email with the reason, and the contract
// goes back to Ready to sign.

import { useState } from "react";
import { toast } from "sonner";
import { ActionDialog, NoteField } from "@/components/govern/actions/ActionDialog";
import { esignErrorMessage, useVoidEnvelope } from "@/lib/govern/esign";

const MAX_REASON = 1000;

export function VoidEnvelopeDialog({ contractId, envelope, open, onOpenChange }: {
  contractId: string;
  envelope: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const voidIt = useVoidEnvelope(contractId);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const clean = reason.trim();
  const error = clean.length > MAX_REASON
    ? `Keep the reason under ${MAX_REASON.toLocaleString("en-US")} characters.`
    : tried && !clean ? "Say why it is cancelled. The signers see this." : undefined;

  async function confirm() {
    try {
      await voidIt.mutateAsync({ envelopeId: envelope.id, reason: clean });
      toast.success("Signing request voided", { description: "Its links no longer open. The contract is ready to sign again." });
      setReason("");
      setTried(false);
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't void the signing request", { description: esignErrorMessage(e) });
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Void signing request"
      description={<>Cancel <strong className="font-semibold text-foreground">{envelope.name}</strong>. Signatures already given are discarded.</>}
      confirmLabel="Void request"
      tone="danger"
      onConfirm={confirm}
      onInvalidSubmit={() => setTried(true)}
      pending={voidIt.isPending}
      disabled={!clean || clean.length > MAX_REASON}
    >
      <NoteField
        id={`void-reason-${envelope.id}`}
        label="Reason"
        value={reason}
        onChange={setReason}
        placeholder="e.g. The sponsor asked for a change to section 4."
        error={error}
      />
    </ActionDialog>
  );
}
