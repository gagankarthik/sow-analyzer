"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "@/components/ui/icons";
import { OFFICE_LABEL, plural } from "@/lib/govern/labels";
import type { Contract, Office } from "@/lib/govern/types";
import { ActionDialog, NoteField } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";
import { useGovernFeature } from "@/lib/govern/queries";

/** Offices routing still needs, in order, after the given approvals. */
export function pendingOffices(c: Contract): Office[] {
  const approved = new Set(c.routing.approvals.map((a) => a.office));
  return c.routing.required.filter((o) => !approved.has(o));
}

export function ApproveDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [note, setNote] = useState("");

  // An escalated contract is approved on behalf of the office it waits on.
  const office = contract.state === "escalated" ? contract.waitingOn.office : null;
  // Approval routing is a "Later" feature: while it is off the API requires no
  // offices, so approving goes straight to Ready to sign.
  const isRoutingOn = useGovernFeature("routingRules");
  const remaining = isRoutingOn ? pendingOffices(contract).filter((o) => o !== office) : [];
  const next = remaining[0] ?? null;

  async function confirm() {
    const ok = await run(
      contract.contractId,
      office ? { action: "office_approve", office, note: note.trim() || undefined } : { action: "approve", note: note.trim() || undefined },
      {
        what: "approve this contract",
        success: next ? `Approved — now with ${OFFICE_LABEL[next]}` : "Approved — ready to sign",
        description: contract.title,
      },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={office ? `Approve for ${OFFICE_LABEL[office]}` : "Approve for signature"}
      description={<>You are approving <strong className="font-semibold text-foreground">{contract.title}</strong>.</>}
      confirmLabel={office ? `Approve for ${OFFICE_LABEL[office]}` : "Approve"}
      onConfirm={confirm}
      pending={pending}
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-[var(--panel)] p-3.5">
        {next ? <ArrowRight size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary-600)]" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />}
        <div className="min-w-0 text-sm leading-relaxed">
          {next ? (
            <>
              <p className="font-semibold text-foreground">This goes to {OFFICE_LABEL[next]} next.</p>
              <p className="text-[var(--ink-600)]">
                {remaining.length > 1
                  ? `Then ${remaining.slice(1).map((o) => OFFICE_LABEL[o]).join(", then ")}. `
                  : ""}
                {contract.routing.reasons.length > 0 && <>Why: {contract.routing.reasons.join("; ")}.</>}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">It will be ready to sign.</p>
              <p className="text-[var(--ink-600)]">No other office needs to see it. Next you send it for signature.</p>
            </>
          )}
        </div>
      </div>

      {contract.openBlockers > 0 && (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--warning)]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {plural(contract.openBlockers, "item")} still open. Approving does not close them; close them on the contract page if they are resolved.
        </p>
      )}

      <NoteField id="approve-note" value={note} onChange={setNote} />
    </ActionDialog>
  );
}
