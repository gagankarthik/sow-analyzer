"use client";

// Review & send: the signers in order with what each fills, what still stops
// the send, and the Send button. After sending, the links are shown once.

import { KeyValueList } from "@/components/ds/KeyValueList";
import { Panel } from "@/components/ds/Panel";
import { Callout } from "@/components/ds/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send } from "@/components/ui/icons";
import { FIELD_LABEL, type FieldType, type SigningLink } from "@/lib/esign/types";
import { reviewIssues, signerColor, signerSummaries, type EnvelopeDraft } from "@/lib/govern/esign-editor";
import { reminderLabel } from "./RecipientsStep";
import { LinksShownOnce, SignerDot, SigningLinkRow } from "./shared";

const TYPE_ORDER: FieldType[] = ["signature", "initials", "name", "email", "date", "text", "checkbox"];

function countsText(counts: Partial<Record<FieldType, number>>): string {
  const parts = TYPE_ORDER.filter((t) => counts[t]).map((t) => `${counts[t]} ${FIELD_LABEL[t].toLowerCase()}`);
  return parts.length ? parts.join(" · ") : "No fields";
}

export function ReviewSend({ draft, onSend, sending, sendError, saveBlocked }: {
  draft: EnvelopeDraft;
  onSend: () => void;
  sending: boolean;
  /** Why the last send failed (the API's words), if it did. */
  sendError: string | null;
  /** The last save failed: send would go out without the latest changes. */
  saveBlocked: boolean;
}) {
  const { blocking, notes } = reviewIssues(draft);
  const signers = signerSummaries(draft);
  const copies = draft.recipients.filter((r) => r.role === "cc");
  const sequential = draft.signingOrder === "sequential";

  return (
    <>
      <Panel title="Signers" meta={sequential ? "One after another" : "All at once"}>
        {signers.length === 0 ? (
          <p className="text-body text-fg-secondary">No signers yet.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border-subtle">
            {signers.map((s) => (
              <li key={s.recipient.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-sunken px-1 text-caption font-semibold tabular-nums text-fg-secondary">
                  {sequential ? s.recipient.order : "·"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <SignerDot color={signerColor(draft.recipients, s.recipient.id)} />
                    <span className="truncate text-body font-medium text-fg-primary">{s.recipient.name.trim() || "Unnamed signer"}</span>
                  </span>
                  <span className="truncate text-caption text-fg-tertiary">{s.recipient.email.trim() || "No email"}</span>
                  <span className={s.hasSignature ? "text-caption text-fg-secondary" : "text-caption text-status-blocked-fg"}>{countsText(s.counts)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {copies.length > 0 && (
          <p className="mt-3 border-t border-border-subtle pt-3 text-caption text-fg-secondary">
            Copy of the signed document to {copies.map((c) => c.name.trim() || c.email.trim()).join(", ")}.
          </p>
        )}
      </Panel>

      <Panel title="Sending">
        <KeyValueList
          layout="inline"
          items={[
            { label: "Subject", value: draft.subject.trim() || `Please sign: ${draft.name.trim() || "agreement"}` },
            { label: "Expires after", value: `${draft.expiresInDays} day${draft.expiresInDays === 1 ? "" : "s"}` },
            { label: "Reminders", value: reminderLabel(draft.reminderEveryDays) },
          ]}
        />
      </Panel>

      {blocking.length > 0 && (
        <Callout tone="warning" title="Before you send">
          <ul className="list-disc ps-4">{blocking.map((b) => <li key={b}>{b}</li>)}</ul>
        </Callout>
      )}
      {notes.length > 0 && blocking.length === 0 && (
        <ul className="flex flex-col gap-1 text-caption text-fg-tertiary">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
      {sendError && <Callout tone="danger" title="Not sent" live="assertive">{sendError}</Callout>}
      {saveBlocked && <Callout tone="danger" title="The latest changes aren't saved">Fix the save error above, then send.</Callout>}

      <Button size="lg" variant="primary" onClick={onSend} disabled={sending || blocking.length > 0}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Send for signature
      </Button>
    </>
  );
}

export function SentLinksDialog({ links, open, onDone }: { links: SigningLink[]; open: boolean; onDone: () => void }) {
  const emailed = links.filter((l) => l.emailed).length;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDone(); }}>
      <DialogContent className="gap-5 p-5 sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg font-semibold tracking-tight">Sent for signature</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--ink-600)]">
            {links.length === 0
              ? "The first signers get their links as soon as it is their turn."
              : emailed === links.length
                ? "Each signer whose turn it is has their link by email. The others get theirs when it is their turn."
                : "Some links could not be emailed. Copy them and send them to each signer yourself."}
          </DialogDescription>
        </DialogHeader>
        {links.length > 0 && (
          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
            {links.map((l) => <SigningLinkRow key={l.recipientId} link={l} />)}
            <LinksShownOnce />
          </div>
        )}
        <DialogFooter className="-mx-5 -mb-5 p-4">
          <Button size="lg" onClick={onDone}>Back to contract</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
