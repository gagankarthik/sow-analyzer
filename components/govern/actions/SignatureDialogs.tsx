"use client";

// Signature: send it out (DocuSign or by hand), then record that it is signed.
// Signing is the moment the value moves from potential to current.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Coins, PenLine, Send } from "@/components/ui/icons";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ActionDialog, Field } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";
import { COMING_SOON, ComingSoonBadge } from "@/components/govern/ComingSoon";
import { useGovernFeature } from "@/lib/govern/queries";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendForSignatureDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  // DocuSign is a "Later" feature: while it is off, signing is by hand only.
  const isDocusignOn = useGovernFeature("docusign");
  const [chosen, setProvider] = useState<"docusign" | "manual">(isDocusignOn ? "docusign" : "manual");
  const provider = isDocusignOn ? chosen : "manual";
  const [email, setEmail] = useState(contract.signature?.signatory?.email ?? "");
  const [name, setName] = useState(contract.signature?.signatory?.name ?? "");
  const emailOk = EMAIL.test(email.trim());
  const needsSignatory = provider === "docusign";

  async function confirm() {
    const signatory = emailOk ? { email: email.trim(), name: name.trim() || null } : undefined;
    const ok = await run(
      contract.contractId,
      { action: "send_for_signature", provider, signatory },
      {
        what: "send this for signature",
        success: provider === "docusign" ? "Sent through DocuSign" : "Marked as out for signature",
        description: provider === "docusign" ? "The card moves to Signed by itself when everyone has signed." : "Mark it signed when the signed copy comes back.",
      },
    );
    if (ok) onOpenChange(false);
  }

  const options = [
    { id: "docusign" as const, title: "DocuSign", text: "Send an envelope. The card moves to Signed by itself when it is signed.", Icon: Send },
    { id: "manual" as const, title: "By hand", text: "Signed on paper or by email. You mark it signed when it comes back.", Icon: PenLine },
  ];

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send for signature"
      description={<>All approvals are in for <strong className="font-semibold text-foreground">{contract.title}</strong>.</>}
      confirmLabel={provider === "docusign" ? "Send through DocuSign" : "Mark as out for signature"}
      onConfirm={confirm}
      pending={pending}
      disabled={needsSignatory ? !emailOk : email.trim() !== "" && !emailOk}
    >
      <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <legend className="sr-only">How will it be signed?</legend>
        {options.map(({ id, title, text, Icon }) => {
          const isComingSoon = id === "docusign" && !isDocusignOn;
          return (
          <button
            key={id}
            type="button"
            aria-pressed={provider === id}
            aria-disabled={isComingSoon || undefined}
            title={isComingSoon ? COMING_SOON : undefined}
            onClick={() => { if (!isComingSoon) setProvider(id); }}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
              provider === id ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-border bg-card hover:border-[var(--ink-300)]",
              isComingSoon && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              <Icon size={15} />{title}
              {isComingSoon && <ComingSoonBadge />}
            </span>
            <span className="text-xs leading-relaxed text-[var(--ink-600)]">{text}</span>
          </button>
          );
        })}
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={needsSignatory ? "Signatory email" : "Signatory email (optional)"} htmlFor="sig-email">
          <Input id="sig-email" type="email" inputMode="email" placeholder="signatory@example.org" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={email.trim() !== "" && !emailOk} />
        </Field>
        <Field label="Signatory name (optional)" htmlFor="sig-name">
          <Input id="sig-name" placeholder="e.g. Dana Whitfield" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  );
}

/** Today as yyyy-mm-dd in the viewer's time zone. */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MarkSignedDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [date, setDate] = useState(todayIso);
  const isObligationsOn = useGovernFeature("obligations");

  async function confirm() {
    const ok = await run(
      contract.contractId,
      { action: "mark_signed", signedAt: date || undefined },
      {
        what: "mark this signed",
        success: "Signed",
        description: contract.value !== null ? `${contractValueText(contract)} now counts as current value.` : "Add its value so it counts in the totals.",
      },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark as signed"
      description={<>Record that every party has signed <strong className="font-semibold text-foreground">{contract.title}</strong>.</>}
      confirmLabel="Mark as signed"
      onConfirm={confirm}
      pending={pending}
      disabled={!date}
    >
      <Field label="Date signed" htmlFor="signed-at">
        <Input id="signed-at" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-[var(--panel)] p-3.5 text-sm leading-relaxed">
        <Coins size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
        <p className="text-[var(--ink-700)]">
          {contract.value !== null
            ? <>Its value, <strong className="font-semibold text-foreground">{contractValueText(contract)}</strong>, moves from potential to current.{isObligationsOn && " Sonar then lists its obligations and due dates."}</>
            : <>It has no value yet, so the totals will not include it.{isObligationsOn && " Sonar lists its obligations and due dates."}</>}
        </p>
      </div>
    </ActionDialog>
  );
}
