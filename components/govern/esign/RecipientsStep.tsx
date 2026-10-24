"use client";

// The Recipients step: who signs (and in what order), who gets a copy, and
// the envelope's message and timing.

import { useState } from "react";
import { Panel } from "@/components/ds/Panel";
import { SegmentedControl } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Mail, Plus, X } from "@/components/ui/icons";
import { EXPIRY_OPTIONS, MAX_RECIPIENTS, MAX_SIGNERS, REMINDER_OPTIONS, type RecipientRole, type SigningOrder } from "@/lib/esign/types";
import {
  MAX_MESSAGE_CHARS, moveRecipient, nextRecipientId, recipientProblem, renumber, signerColor,
  type DraftRecipient, type EnvelopeDraft,
} from "@/lib/govern/esign-editor";
import { cn } from "@/lib/utils";
import { SignerDot } from "./shared";

type Change = (fn: (d: EnvelopeDraft) => EnvelopeDraft) => void;

/** Fields belong to signers only: a removed signer, or one turned into a copy, takes theirs along. */
function withRecipients(d: EnvelopeDraft, recipients: DraftRecipient[]): EnvelopeDraft {
  const signers = new Set(recipients.filter((r) => r.role === "signer").map((r) => r.id));
  return { ...d, recipients, fields: d.fields.filter((f) => signers.has(f.recipientId)) };
}

export function RecipientsEditor({ draft, change }: { draft: EnvelopeDraft; change: Change }) {
  const signerCount = draft.recipients.filter((r) => r.role === "signer").length;
  const full = draft.recipients.length >= MAX_RECIPIENTS;
  const sequential = draft.signingOrder === "sequential";

  function add(role: RecipientRole) {
    change((d) => withRecipients(d, renumber([...d.recipients, { id: nextRecipientId(d.recipients), name: "", email: "", role, order: 1 }], d.signingOrder)));
  }
  function patch(id: string, p: Partial<DraftRecipient>) {
    change((d) => withRecipients(d, d.recipients.map((r) => (r.id === id ? { ...r, ...p } : r))));
  }
  function remove(id: string) {
    change((d) => withRecipients(d, renumber(d.recipients.filter((r) => r.id !== id), d.signingOrder)));
  }
  function move(from: number, to: number) {
    change((d) => ({ ...d, recipients: moveRecipient(d.recipients, from, to, d.signingOrder) }));
  }
  function setOrder(o: SigningOrder) {
    change((d) => ({ ...d, signingOrder: o, recipients: renumber(d.recipients, o) }));
  }

  return (
    <Panel title="Recipients" meta={`${signerCount} of ${MAX_SIGNERS} signers`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span id="esign-order-label" className="text-caption font-semibold text-fg-secondary">Signing order</span>
          <SegmentedControl<SigningOrder>
            label="Signing order"
            size="sm"
            value={draft.signingOrder}
            onChange={setOrder}
            options={[{ value: "sequential", label: "One after another" }, { value: "parallel", label: "All at once" }]}
          />
          <p className="text-caption text-fg-tertiary">
            {sequential ? "Each signer gets their link when the one before has signed." : "Every signer gets a link straight away."}
          </p>
        </div>

        {draft.recipients.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-control px-3 py-4 text-body text-fg-secondary">No recipients yet. Add the people who sign.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {draft.recipients.map((r, i) => (
              <RecipientCard
                key={r.id}
                recipient={r}
                index={i}
                total={draft.recipients.length}
                all={draft.recipients}
                sequential={sequential}
                signersFull={signerCount >= MAX_SIGNERS}
                onPatch={(p) => patch(r.id, p)}
                onRemove={() => remove(r.id)}
                onMove={(to) => move(i, to)}
              />
            ))}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => add("signer")} disabled={full || signerCount >= MAX_SIGNERS}><Plus size={14} />Add signer</Button>
          <Button size="sm" variant="ghost" onClick={() => add("cc")} disabled={full}><Mail size={14} />Add copy recipient</Button>
        </div>
        {(full || signerCount >= MAX_SIGNERS) && (
          <p className="text-caption text-fg-tertiary">Up to {MAX_SIGNERS} signers and {MAX_RECIPIENTS} recipients in all.</p>
        )}
      </div>
    </Panel>
  );
}

function RecipientCard({ recipient: r, index, total, all, sequential, signersFull, onPatch, onRemove, onMove }: {
  recipient: DraftRecipient; index: number; total: number; all: DraftRecipient[]; sequential: boolean; signersFull: boolean;
  onPatch: (p: Partial<DraftRecipient>) => void; onRemove: () => void; onMove: (to: number) => void;
}) {
  const [touched, setTouched] = useState(false);
  const problem = recipientProblem(r, all);
  // Say what is missing once they have left the row, or straight away for a repeated signer.
  const shown = problem && (touched || /already a signer/.test(problem)) ? problem : null;
  const color = signerColor(all, r.id);
  const who = r.name.trim() || r.email.trim() || `recipient ${index + 1}`;
  const errId = `esign-r-${r.id}-error`;

  return (
    <li
      className={cn("flex flex-col gap-2 rounded-lg border bg-surface-raised p-3", r.role === "signer" ? color.chip : "border-border-default")}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTouched(true);
      }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border-default bg-surface-raised px-1.5 text-caption font-semibold tabular-nums text-fg-secondary">
          {sequential ? r.order : "·"}
          <span className="sr-only">{sequential ? `, signs ${ordinal(r.order)}` : ", signs at the same time as the others"}</span>
        </span>
        {r.role === "signer" && <SignerDot color={color} />}
        <Select
          value={r.role}
          onValueChange={(v) => onPatch({ role: v as RecipientRole })}
        >
          <SelectTrigger size="sm" aria-label={`Role of ${who}`} className="h-8 text-caption"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="signer" disabled={r.role !== "signer" && signersFull}>Signs</SelectItem>
            <SelectItem value="cc">Gets a copy</SelectItem>
          </SelectContent>
        </Select>
        <div className="ms-auto flex items-center">
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${who} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ChevronUp size={16} /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${who} down`} disabled={index === total - 1} onClick={() => onMove(index + 1)}><ChevronDown size={16} /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Remove ${who}`} onClick={onRemove}><X size={16} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Input
          aria-label={`Name of recipient ${index + 1}`}
          placeholder="Full name"
          value={r.name}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => onPatch({ name: e.target.value })}
          aria-invalid={shown && !r.name.trim() ? true : undefined}
          aria-describedby={shown ? errId : undefined}
          className="h-9"
        />
        <Input
          type="email"
          inputMode="email"
          aria-label={`Email of recipient ${index + 1}`}
          placeholder="name@example.org"
          value={r.email}
          maxLength={254}
          autoComplete="off"
          onChange={(e) => onPatch({ email: e.target.value })}
          aria-invalid={shown && !!r.name.trim() ? true : undefined}
          aria-describedby={shown ? errId : undefined}
          className="h-9"
        />
      </div>
      {shown && <p id={errId} role="alert" className="text-caption text-[var(--danger)]">{shown}</p>}
    </li>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function EnvelopeSettings({ draft, change }: { draft: EnvelopeDraft; change: Change }) {
  const expiry = [...new Set<number>([...EXPIRY_OPTIONS, draft.expiresInDays])].sort((a, b) => a - b);
  const reminders = [...new Set<number>([...REMINDER_OPTIONS, draft.reminderEveryDays])].sort((a, b) => a - b);
  const messageLength = draft.message.length;
  const nameMissing = !draft.name.trim();

  return (
    <Panel title="Message and timing">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="esign-name" className="text-caption font-semibold text-fg-secondary">Envelope name</label>
          <Input id="esign-name" value={draft.name} maxLength={200} onChange={(e) => change((d) => ({ ...d, name: e.target.value }))}
            aria-invalid={nameMissing || undefined} aria-describedby={nameMissing ? "esign-name-error" : undefined} />
          {nameMissing && <p id="esign-name-error" role="alert" className="text-caption text-[var(--danger)]">Give it a name. Signers see it.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="esign-subject" className="text-caption font-semibold text-fg-secondary">Email subject</label>
          <Input id="esign-subject" value={draft.subject} maxLength={200} placeholder={`Please sign: ${draft.name.trim() || "agreement"}`}
            onChange={(e) => change((d) => ({ ...d, subject: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="esign-message" className="text-caption font-semibold text-fg-secondary">Message (optional)</label>
          <textarea
            id="esign-message"
            rows={4}
            value={draft.message}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(e) => change((d) => ({ ...d, message: e.target.value }))}
            placeholder="A note in the signing email and on the signing page."
            aria-describedby="esign-message-count"
            className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] md:text-sm"
          />
          <p id="esign-message-count" className="text-end text-caption tabular-nums text-fg-tertiary">
            {messageLength.toLocaleString("en-US")} / {MAX_MESSAGE_CHARS.toLocaleString("en-US")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="esign-expiry" className="text-caption font-semibold text-fg-secondary">Expires after</label>
            <Select value={String(draft.expiresInDays)} onValueChange={(v) => change((d) => ({ ...d, expiresInDays: Number(v) }))}>
              <SelectTrigger id="esign-expiry" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {expiry.map((n) => <SelectItem key={n} value={String(n)}>{n} day{n === 1 ? "" : "s"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="esign-reminders" className="text-caption font-semibold text-fg-secondary">Reminders</label>
            <Select value={String(draft.reminderEveryDays)} onValueChange={(v) => change((d) => ({ ...d, reminderEveryDays: Number(v) }))}>
              <SelectTrigger id="esign-reminders" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {reminders.map((n) => <SelectItem key={n} value={String(n)}>{reminderLabel(n)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function reminderLabel(n: number): string {
  if (n === 0) return "Off";
  if (n === 1) return "Every day";
  return `Every ${n} days`;
}
