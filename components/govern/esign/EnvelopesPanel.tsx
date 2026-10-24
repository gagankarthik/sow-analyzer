"use client";

// The contract page's "E-signature" panel: every Govern e-signature envelope
// for this contract, newest first, with who has signed and what can be done
// next (continue a draft, resend a link, void, download).

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ListPanel, PanelEmpty, PanelRow } from "@/components/ds/Panel";
import { Callout } from "@/components/ds/feedback";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { PanelRowsSkeleton } from "@/components/ds/skeletons";
import { formatDate, formatDateTime } from "@/components/ds/format";
import { Button } from "@/components/ui/button";
import { Ban, ChevronDown, Download, FilePen, Loader2, Send, Trash2 } from "@/components/ui/icons";
import { isForbidden } from "@/lib/api";
import type { Envelope, EnvelopeSummary, Recipient, SigningLink } from "@/lib/esign/types";
import { dueSigners, signerColor } from "@/lib/govern/esign-editor";
import {
  esignErrorMessage, useDeleteEnvelope, useDownloadEnvelope, useEnvelope, useEnvelopes, useResendLink,
} from "@/lib/govern/esign";
import type { ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { PdfPicker, signingPath, usePrepareEnvelope } from "./PrepareEnvelope";
import { EnvelopeStatusPill, LinksShownOnce, RecipientStatusPill, SignerDot, SigningLinkRow } from "./shared";
import { VoidEnvelopeDialog } from "./VoidEnvelopeDialog";

/** States where signing is in play; elsewhere the panel stays out of the way. */
const SIGNING_STATES = new Set(["ready_to_sign", "out_for_signature", "signed", "active"]);

export function EnvelopesPanel({ contract: c }: { contract: ContractDetail }) {
  const relevant = SIGNING_STATES.has(c.state) || c.signature?.provider === "govern";
  const list = useEnvelopes(c.contractId, relevant);
  const prepare = usePrepareEnvelope(c.contractId);

  // Reading envelopes needs edit access: people who can't edit don't see the panel.
  if (!relevant || isForbidden(list.error)) return null;
  const envelopes = list.data ?? [];
  const canStart = c.state === "ready_to_sign" && !envelopes.some((e) => e.status === "draft" || e.status === "sent" || e.status === "sealing");
  if (list.isSuccess && envelopes.length === 0 && c.state !== "ready_to_sign") return null;

  return (
    <ListPanel
      title="E-signature"
      meta={envelopes.length > 0 ? envelopes.length.toLocaleString("en-US") : undefined}
      actions={canStart && !prepare.needsPdf ? (
        <Button size="sm" variant="outline" onClick={() => void prepare.start()} disabled={prepare.pending}>
          {prepare.pending ? <Loader2 size={14} className="animate-spin" /> : <FilePen size={14} />}
          Prepare document
        </Button>
      ) : undefined}
    >
      {prepare.needsPdf && (
        <div className="border-b border-border-subtle p-4">
          <Callout tone="warning" title="This version can't be signed as it is">
            <p>{prepare.needsPdf}</p>
            <PdfPicker className="mt-3" disabled={prepare.pending} onPick={(file) => void prepare.start(file)} />
          </Callout>
        </div>
      )}
      {list.isLoading ? (
        <PanelRowsSkeleton rows={2} />
      ) : list.isError ? (
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 text-body text-fg-secondary">
          Couldn&rsquo;t load the signing requests.
          <Button size="sm" variant="outline" onClick={() => void list.refetch()}>Try again</Button>
        </div>
      ) : envelopes.length === 0 ? (
        <PanelEmpty>No signing requests yet. Prepare the document to add signers and place their fields.</PanelEmpty>
      ) : (
        <ul>
          {envelopes.map((e, i) => <EnvelopeRow key={e.id} contractId={c.contractId} summary={e} defaultOpen={i === 0} />)}
        </ul>
      )}
    </ListPanel>
  );
}

function progressText(e: EnvelopeSummary): string {
  if (e.signerCount === 0) return "No signers yet";
  return `${e.signedCount.toLocaleString("en-US")} of ${e.signerCount.toLocaleString("en-US")} signed`;
}

function whenText(e: EnvelopeSummary): string {
  if (e.completedAt) return `Completed ${formatDate(e.completedAt)}`;
  if (e.sentAt) return `Sent ${formatDate(e.sentAt)}${e.expiresAt && e.status === "sent" ? ` · expires ${formatDate(e.expiresAt)}` : ""}`;
  return `Created ${formatDate(e.createdAt)}`;
}

function EnvelopeRow({ contractId, summary: e, defaultOpen }: { contractId: string; summary: EnvelopeSummary; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const detail = useEnvelope(contractId, e.id, open);
  const remove = useDeleteEnvelope(contractId);
  const download = useDownloadEnvelope(contractId);
  const bodyId = `envelope-${e.id}-body`;

  function save(file: "sealed" | "source") {
    download.mutate({ envelopeId: e.id, file }, {
      onError: (err) => toast.error("Couldn't download the document", { description: esignErrorMessage(err) }),
    });
  }

  return (
    <PanelRow className="flex flex-col gap-3 py-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="group flex min-w-0 flex-1 items-start gap-2 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]"
        >
          <ChevronDown size={16} aria-hidden className={cn("mt-0.5 shrink-0 text-fg-tertiary transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body font-semibold text-fg-primary">{e.name}</span>
            <span className="text-caption text-fg-tertiary">{progressText(e)} · {whenText(e)}</span>
          </span>
        </button>
        <EnvelopeStatusPill status={e.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 ps-6">
        {e.status === "draft" && (
          <>
            <Button asChild size="sm"><Link href={signingPath(contractId, e.id)}><FilePen size={14} />Continue editing</Link></Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}><Trash2 size={14} />Delete draft</Button>
          </>
        )}
        {e.status === "sent" && (
          <Button size="sm" variant="outline" onClick={() => setVoiding(true)}><Ban size={14} />Void</Button>
        )}
        {e.status === "completed" && (
          <Button size="sm" onClick={() => save("sealed")} disabled={download.isPending}><Download size={14} />Download signed PDF</Button>
        )}
        {e.status !== "draft" && (
          <Button size="sm" variant="ghost" onClick={() => save("source")} disabled={download.isPending}><Download size={14} />Original</Button>
        )}
        {e.status !== "draft" && (
          <Button asChild size="sm" variant="ghost"><Link href={signingPath(contractId, e.id)}>View fields</Link></Button>
        )}
      </div>

      {open && (
        <div id={bodyId} className="ps-6">
          {detail.isLoading ? (
            <PanelRowsSkeleton rows={Math.max(1, e.signerCount)} row="line" className="-mx-4" />
          ) : detail.data ? (
            <EnvelopeDetailBody contractId={contractId} envelope={detail.data} />
          ) : (
            <p className="text-caption text-fg-tertiary">Couldn&rsquo;t load the signers. {detail.error instanceof Error ? detail.error.message : ""}</p>
          )}
        </div>
      )}

      {e.status === "sent" && <VoidEnvelopeDialog contractId={contractId} envelope={e} open={voiding} onOpenChange={setVoiding} />}
      {e.status === "draft" && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          tone="danger"
          title={`Delete the draft "${e.name}"?`}
          description="Its signers and fields are removed. The contract's document is not touched."
          confirmLabel="Delete draft"
          onConfirm={async () => {
            try {
              await remove.mutateAsync(e.id);
              toast.success("Draft deleted");
            } catch (err) {
              toast.error("Couldn't delete the draft", { description: esignErrorMessage(err) });
              throw err;
            }
          }}
        />
      )}
    </PanelRow>
  );
}

export function EnvelopeDetailBody({ contractId, envelope: env }: { contractId: string; envelope: Envelope }) {
  const resend = useResendLink(contractId);
  const [links, setLinks] = useState<SigningLink[]>([]);
  const due = env.status === "sent" ? new Set(dueSigners(env.recipients, env.signingOrder).map((r) => r.id)) : new Set<string>();
  const ordered = [...env.recipients].sort((a, b) => a.order - b.order);

  async function resendTo(r: Recipient) {
    try {
      const link = await resend.mutateAsync({ envelopeId: env.id, recipientId: r.id });
      setLinks((prev) => [link, ...prev.filter((l) => l.recipientId !== link.recipientId)]);
      toast.success(link.emailed ? `New link emailed to ${r.name}` : `New link for ${r.name}`, { description: link.emailed ? undefined : "Email is off: copy the link below and send it yourself." });
    } catch (e) {
      toast.error("Couldn't send a new link", { description: esignErrorMessage(e) });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {env.status === "failed" && (
        <Callout tone="danger" title="Sealing the signed document failed">
          Everyone signed, but the final PDF could not be sealed{env.failure ? ` (${env.failure.reason})` : ""}. Govern retries on its own; if this stays, contact your Govern admin.
        </Callout>
      )}
      {env.status === "sealing" && <Callout tone="info">Everyone has signed. Govern is sealing the final PDF; it appears here in a minute.</Callout>}
      {env.status === "voided" && env.voidReason && (
        <p className="text-caption text-fg-secondary">Voided {formatDate(env.voidedAt)}: {env.voidReason}</p>
      )}

      <ol className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-default">
        {ordered.map((r) => {
          const color = signerColor(env.recipients, r.id);
          return (
            <li key={r.id} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  {r.role === "signer" && <SignerDot color={color} />}
                  <span className="min-w-0 truncate text-body font-medium text-fg-primary">{r.name}</span>
                  <span className="min-w-0 truncate text-caption text-fg-tertiary">{r.email}</span>
                  {r.role === "cc" && <span className="text-caption text-fg-tertiary">· gets a copy</span>}
                </span>
                {r.role === "signer" && <RecipientStatusPill status={r.status} />}
              </div>
              {r.role === "signer" && <RecipientTimes recipient={r} />}
              {r.status === "declined" && r.declineReason && (
                <p className="text-caption text-status-blocked-fg">Declined: {r.declineReason}</p>
              )}
              {due.has(r.id) && (
                <div>
                  <Button size="xs" variant="outline" onClick={() => void resendTo(r)} disabled={resend.isPending}>
                    <Send size={12} />Resend link
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          {links.map((l) => <SigningLinkRow key={l.recipientId} link={l} />)}
          <LinksShownOnce />
        </div>
      )}
    </div>
  );
}

function RecipientTimes({ recipient: r }: { recipient: Recipient }) {
  const parts = [
    r.sentAt && `Sent ${formatDateTime(r.sentAt)}`,
    r.viewedAt && `Opened ${formatDateTime(r.viewedAt)}`,
    r.signedAt && `Signed ${formatDateTime(r.signedAt)}`,
    r.declinedAt && `Declined ${formatDateTime(r.declinedAt)}`,
  ].filter(Boolean);
  if (parts.length === 0) return <p className="text-caption text-fg-tertiary">Not sent yet</p>;
  return <p className="text-caption text-fg-tertiary">{parts.join(" · ")}</p>;
}
