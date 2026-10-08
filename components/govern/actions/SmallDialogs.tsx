"use client";

// The lighter actions: a comment, the contract value, a question to the PI
// or department, and the three one-click moves after signature (active,
// closed out, reopened).

import { byEdition } from "@/lib/edition-runtime";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useGovernFeature, useOrgCurrency, usePatchContract } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";
import { ActionDialog, Field, NoteField } from "./ActionDialog";
import { useGovernErrorToast, useRunContractAction } from "./useRunAction";
import { toast } from "sonner";

export function CommentDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [text, setText] = useState("");

  async function confirm() {
    const ok = await run(contract.contractId, { action: "comment", text: text.trim() }, { what: "add your comment", success: "Comment added" });
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a comment"
      description="Everyone working on this contract sees it in the activity log. It does not change the status."
      confirmLabel="Post comment"
      onConfirm={confirm}
      pending={pending}
      disabled={!text.trim()}
    >
      <NoteField id="comment-text" value={text} onChange={setText} label="Comment" placeholder={byEdition("e.g. Spoke to the sponsor; revised draft due Friday.", "e.g. Spoke to the vendor; revised SOW due Friday.")} />
    </ActionDialog>
  );
}

/** Requirement 3.1: the contract waits on the PI or department until a
 *  reviewer marks their answer received. */
export function AskPiDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [request, setRequest] = useState("");
  const who = byEdition(contract.piName, null) || contract.department || byEdition("the PI or department", "the requesting department");

  async function confirm() {
    const ok = await run(contract.contractId, { action: "ask_pi", request: request.trim() }, { what: byEdition("ask the PI or department", "ask the requesting department"), success: `Waiting on ${who}` });
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ask ${who}`}
      description="The contract shows it is waiting on them until you mark their answer received. The question goes in the activity log."
      confirmLabel="Mark as waiting on them"
      onConfirm={confirm}
      pending={pending}
      disabled={!request.trim()}
    >
      <NoteField id="pi-request" value={request} onChange={setRequest} label="What do they need to provide?" placeholder={byEdition("e.g. Confirm the field of use with the lab.", "e.g. Confirm the start date and headcount with the hiring manager.")} />
    </ActionDialog>
  );
}

export function PiAnsweredDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [note, setNote] = useState("");
  const asked = contract.piRequest?.request;

  async function confirm() {
    const ok = await run(contract.contractId, { action: "pi_answered", note: note.trim() || undefined }, { what: "record the answer", success: "Answer received" });
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark the answer received"
      description={asked ? `You asked: "${asked}". The contract goes back to its reviewer.` : "The contract goes back to its reviewer."}
      confirmLabel="Answer received"
      onConfirm={confirm}
      pending={pending}
    >
      <NoteField id="pi-answer-note" value={note} onChange={setNote} />
    </ActionDialog>
  );
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "JPY", "INR"];

/** Requirement 4: no contract is left silently out of the totals. */
export function AddValueDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const patch = usePatchContract(contract.contractId);
  const onError = useGovernErrorToast();
  const [amount, setAmount] = useState(contract.manualValue !== null ? String(contract.manualValue) : "");
  const orgCurrency = useOrgCurrency();
  const [currency, setCurrency] = useState(contract.currency ?? orgCurrency);
  const parsed = Number(amount.replace(/[,\s]/g, ""));
  const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

  async function confirm() {
    try {
      await patch.mutateAsync({ manualValue: parsed, currency: currency.trim().toUpperCase() || null });
      toast.success("Value saved", { description: "It now counts in the totals." });
      onOpenChange(false);
    } catch (e) {
      onError(e, "save the value", contract.contractId);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add the contract value"
      description="Sonar could not find a value in this agreement. Add it so totals are never incomplete."
      confirmLabel="Save value"
      onConfirm={confirm}
      pending={patch.isPending}
      disabled={!valid}
    >
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Total value" htmlFor="value-amount" hint="The whole value over the term, before any amendments.">
          <Input id="value-amount" inputMode="decimal" placeholder="e.g. 250000" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={amount.trim() !== "" && !valid} />
        </Field>
        <Field label="Currency" htmlFor="value-currency">
          <Input id="value-currency" list="value-currencies" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          <datalist id="value-currencies">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      </div>
    </ActionDialog>
  );
}

type SimpleKind = "activate" | "close" | "reopen";

const SIMPLE: Record<SimpleKind, { title: string; text: string; confirm: string; success: string }> = {
  activate: { title: "Mark as active", text: "The agreement is in force and its obligations are being tracked.", confirm: "Mark as active", success: "Marked as active" },
  close: { title: "Close out", text: "The term has ended and close-out is done. It moves to Closed out.", confirm: "Close out", success: "Closed out" },
  reopen: { title: "Reopen for review", text: "It goes back to In review with its current owner.", confirm: "Reopen", success: "Reopened for review" },
};

export function SimpleActionDialog({ kind, contract, open, onOpenChange }: { kind: SimpleKind; contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [note, setNote] = useState("");
  const s = SIMPLE[kind];
  const isObligationsOn = useGovernFeature("obligations");
  const description = kind === "activate" && !isObligationsOn ? "The agreement is in force." : s.text;

  async function confirm() {
    const action = kind === "activate" ? { action: "activate" as const } : { action: kind, note: note.trim() || undefined };
    const ok = await run(contract.contractId, action, { what: s.title, success: s.success, description: contract.title });
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog open={open} onOpenChange={onOpenChange} title={s.title} description={description} confirmLabel={s.confirm} onConfirm={confirm} pending={pending}>
      {kind !== "activate" && <NoteField id={`${kind}-note`} value={note} onChange={setNote} />}
    </ActionDialog>
  );
}
