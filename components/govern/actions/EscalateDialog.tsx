"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFFICES, OFFICE_LABEL } from "@/lib/govern/labels";
import type { Contract, Office } from "@/lib/govern/types";
import { ActionDialog, Field, NoteField } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";

/** What each office looks at, so the reviewer picks the right one. */
const OFFICE_HINT: Record<Office, string> = {
  legal_affairs: "Indemnity, liability, governing law and anything you do not normally accept.",
  tech_commercialization: "License scope, royalties, equity and IP ownership.",
  sponsored_programs: "Budgets, sponsor terms and grant flow-down.",
  export_control: "Foreign parties, restricted technology and export rules.",
  risk_management: "Insurance limits and risk transfer.",
};

export function EscalateDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [office, setOffice] = useState<Office | "">(contract.nextStep.office ?? "");
  const [note, setNote] = useState("");

  async function confirm() {
    if (!office) return;
    const ok = await run(
      contract.contractId,
      { action: "escalate", office, note: note.trim() || undefined },
      { what: "escalate this contract", success: `Escalated to ${OFFICE_LABEL[office]}`, description: contract.title },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Escalate to an office"
      description="The office reviews it next. The card shows it is waiting on them until they approve."
      confirmLabel={office ? `Escalate to ${OFFICE_LABEL[office]}` : "Escalate"}
      onConfirm={confirm}
      pending={pending}
      disabled={!office}
    >
      <Field label="Which office?" htmlFor="escalate-office" hint={office ? OFFICE_HINT[office] : undefined}>
        <Select value={office} onValueChange={(v) => setOffice(v as Office)}>
          <SelectTrigger id="escalate-office" className="w-full">
            <SelectValue placeholder="Choose an office" />
          </SelectTrigger>
          <SelectContent>
            {OFFICES.map((o) => (
              <SelectItem key={o} value={o}>
                {OFFICE_LABEL[o]}{contract.nextStep.office === o ? " (suggested)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <NoteField id="escalate-note" value={note} onChange={setNote} label="What should they look at? (optional)" placeholder="e.g. Indemnity is uncapped in section 9." />
    </ActionDialog>
  );
}
