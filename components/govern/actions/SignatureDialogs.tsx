"use client";

// Signature: send it out (Govern e-signature, DocuSign or by hand), then record
// that it is signed. Govern e-signature hands over to the envelope editor.
// Signing is the moment the value moves from potential to current.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Coins, PenLine, Send, Signature } from "@/components/ui/icons";
import { Callout } from "@/components/ds/feedback";
import { PdfPicker, usePrepareEnvelope } from "@/components/govern/esign/PrepareEnvelope";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ActionDialog, Field } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";
import { COMING_SOON, ComingSoonBadge } from "@/components/govern/ComingSoon";
import { useGovernFeature } from "@/lib/govern/queries";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The address in what was pasted: "Dana Whitfield <dana@uni.edu>" → "dana@uni.edu". */
function emailOf(raw: string): string {
  const t = raw.trim();
  return (/<([^<>\s]+@[^<>\s]+)>/.exec(t)?.[1] ?? t).replace(/^mailto:/i, "");
}

export function SendForSignatureDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending: running } = useRunContractAction();
  const prepare = usePrepareEnvelope(contract.contractId);
  const pending = running || prepare.pending;
  // DocuSign is a "Later" feature: while it is off, it can't be chosen.
  const isDocusignOn = useGovernFeature("docusign");
  const [chosen, setProvider] = useState<"govern" | "docusign" | "manual">("govern");
  const provider = chosen === "docusign" && !isDocusignOn ? "govern" : chosen;
  const [email, setEmail] = useState(contract.signature?.signatory?.email ?? "");
  const [name, setName] = useState(contract.signature?.signatory?.name ?? "");
  const address = emailOf(email);
  const emailOk = EMAIL.test(address);
  const emailError = email.trim() !== "" && !emailOk ? "Enter an email like name@university.edu." : undefined;
  const needsSignatory = provider === "docusign";

  async function confirm() {
    if (provider === "govern") {
      // A Word version can't be signed: the dialog then asks for a PDF instead.
      if (await prepare.start()) onOpenChange(false);
      return;
    }
    const signatory = emailOk ? { email: address, name: name.trim() || null } : undefined;
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
    { id: "govern" as const, title: "Govern e-signature", text: "Add signers, place fields on the pages and send private signing links. Sealed and filed here when done.", Icon: Signature },
    { id: "docusign" as const, title: "DocuSign", text: "Send an envelope. The card moves to Signed by itself when it is signed.", Icon: Send },
    { id: "manual" as const, title: "By hand", text: "Signed on paper or by email. You mark it signed when it comes back.", Icon: PenLine },
  ];

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send for signature"
      description={<>All approvals are in for <strong className="font-semibold text-foreground">{contract.title}</strong>.</>}
      confirmLabel={provider === "govern" ? "Prepare document" : provider === "docusign" ? "Send through DocuSign" : "Mark as out for signature"}
      onConfirm={confirm}
      pending={pending}
      disabled={provider === "govern" ? !!prepare.needsPdf : needsSignatory ? !emailOk : email.trim() !== "" && !emailOk}
      wide
    >
      <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
              {id === "govern" && <span className="inline-flex h-5 items-center rounded-full border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-2 text-xs font-semibold text-[var(--brand-primary-700)]">Recommended</span>}
            </span>
            <span className="text-xs leading-relaxed text-[var(--ink-600)]">{text}</span>
          </button>
          );
        })}
      </fieldset>
      {provider === "govern" ? (
        prepare.needsPdf ? (
          <Callout tone="warning" title="This version can't be signed as it is">
            <p>{prepare.needsPdf}</p>
            <PdfPicker
              className="mt-3"
              disabled={pending}
              onPick={async (file) => { if (await prepare.start(file)) onOpenChange(false); }}
            />
          </Callout>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--ink-600)]">
            The contract&apos;s current PDF is prepared for signature. Next you add the signers and place their fields.
          </p>
        )
      ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={needsSignatory ? "Signatory email" : "Signatory email (optional)"} htmlFor="sig-email" error={emailError}>
          <Input id="sig-email" type="email" inputMode="email" placeholder="signatory@example.org" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!emailError} aria-describedby={emailError ? "sig-email-error" : undefined} />
        </Field>
        <Field label="Signatory name (optional)" htmlFor="sig-name">
          <Input id="sig-name" placeholder="e.g. Dana Whitfield" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      )}
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
      disabled={!date || date > todayIso()}
    >
      <Field label="Date signed" htmlFor="signed-at" error={date > todayIso() ? "The signing date can't be in the future." : undefined}>
        <Input id="signed-at" type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)}
          aria-invalid={date > todayIso()} aria-describedby={date > todayIso() ? "signed-at-error" : undefined} />
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
