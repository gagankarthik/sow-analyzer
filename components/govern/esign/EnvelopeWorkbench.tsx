"use client";

// The Govern e-signature workbench for one envelope: Recipients, Fields and
// Review & send on the left (stacked above the pages on narrow screens), the
// document's pages on the right. A draft autosaves; anything else is read-only.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyValueList } from "@/components/ds/KeyValueList";
import { Panel } from "@/components/ds/Panel";
import { Callout } from "@/components/ds/feedback";
import { formatDate } from "@/components/ds/format";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, ChevronLeft, Download, Loader2 } from "@/components/ui/icons";
import type { Envelope, FieldType, SigningLink } from "@/lib/esign/types";
import { placeAt, type DraftField, type DraftRecipient, type Rect } from "@/lib/govern/esign-editor";
import { esignErrorMessage, useDownloadEnvelope, useSendEnvelope } from "@/lib/govern/esign";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EnvelopeDetailBody } from "./EnvelopesPanel";
import { FieldTools } from "./FieldTools";
import { PageCanvas, type CanvasField } from "./PageCanvas";
import { EnvelopeSettings, RecipientsEditor, reminderLabel } from "./RecipientsStep";
import { ReviewSend, SentLinksDialog } from "./ReviewSend";
import { EnvelopeStatusPill } from "./shared";
import { useEnvelopeDraft, type SaveState } from "./useEnvelopeDraft";

type Step = "recipients" | "fields" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "recipients", label: "Recipients" },
  { id: "fields", label: "Fields" },
  { id: "review", label: "Review & send" },
];

export function EnvelopeWorkbench({ contractId, contractTitle, envelope }: {
  contractId: string;
  contractTitle: string | null;
  envelope: Envelope;
}) {
  const router = useRouter();
  // Lives above the draft editor: after Send the envelope turns read-only, and the links must still show.
  const [sent, setSent] = useState<SigningLink[] | null>(null);
  const contractHref = `/contracts/${encodeURIComponent(contractId)}`;
  const back = { href: contractHref, label: contractTitle ? `Back to ${contractTitle}` : "Back to contract" };

  return (
    <>
      {envelope.canEdit
        ? <DraftWorkbench key={envelope.id} contractId={contractId} envelope={envelope} back={back} onSent={setSent} />
        : <ReadOnlyWorkbench contractId={contractId} envelope={envelope} back={back} />}
      <SentLinksDialog links={sent ?? []} open={sent !== null} onDone={() => { setSent(null); router.push(contractHref); }} />
    </>
  );
}

function Header({ back, name, envelope, right }: {
  back: { href: string; label: string };
  name: string;
  envelope: Envelope;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-border-default pb-4">
      <Link href={back.href} className="inline-flex w-fit items-center gap-1 rounded-sm text-caption font-medium text-fg-secondary transition-colors hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11">
        <ChevronLeft size={12} aria-hidden />
        <span className="max-w-[40ch] truncate">{back.label}</span>
      </Link>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 truncate text-title-sm font-semibold text-fg-primary">{name.trim() || "Untitled envelope"}</h1>
          <EnvelopeStatusPill status={envelope.status} />
          <span className="text-caption text-fg-tertiary">
            Govern e-signature · {envelope.source.filename} · {envelope.source.pageCount} page{envelope.source.pageCount === 1 ? "" : "s"}
          </span>
        </div>
        {right && <div className="flex flex-wrap items-center gap-3">{right}</div>}
      </div>
    </header>
  );
}

function SaveIndicator({ state, error, onRetry }: { state: SaveState; error: string | null; onRetry: () => void }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-caption text-fg-secondary">
      {state === "saving" && <><Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />Saving…</>}
      {state === "saved" && <><Check size={12} aria-hidden className="text-status-ok-fg" />Saved</>}
      {state === "unsaved" && <>Unsaved changes</>}
      {state === "error" && (
        <>
          <AlertCircle size={12} aria-hidden className="text-status-blocked-fg" />
          <span className="text-status-blocked-fg">Not saved{error ? `: ${error}` : ""}</span>
          <Button size="xs" variant="outline" onClick={onRetry}>Retry</Button>
        </>
      )}
    </span>
  );
}

function StepNav({ step, onStep, counts }: { step: Step; onStep: (s: Step) => void; counts: Record<Step, string | null> }) {
  return (
    <nav aria-label="Envelope steps">
      <ol className="grid grid-cols-3 overflow-hidden rounded-lg border border-border-default bg-surface-raised">
        {STEPS.map((s, i) => {
          const on = s.id === step;
          return (
            <li key={s.id} className="min-w-0 border-e border-border-subtle last:border-e-0">
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => onStep(s.id)}
                className={cn(
                  "flex h-full w-full min-w-0 flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]",
                  on ? "bg-[var(--brand-primary-50)] shadow-[inset_0_-2px_0_var(--brand-primary-600)]" : "hover:bg-surface-hover",
                )}
              >
                <span className="text-caption tabular-nums text-fg-tertiary">{i + 1}</span>
                <span className={cn("truncate text-body", on ? "font-semibold text-fg-primary" : "font-medium text-fg-secondary")}>{s.label}</span>
                {counts[s.id] && <span className="truncate text-caption text-fg-tertiary">{counts[s.id]}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function DraftWorkbench({ contractId, envelope, back, onSent }: {
  contractId: string;
  envelope: Envelope;
  back: { href: string; label: string };
  onSent: (links: SigningLink[]) => void;
}) {
  const { draft, change, flush, saveState, saveError, skipped } = useEnvelopeDraft(contractId, envelope);
  const send = useSendEnvelope(contractId, envelope.id);
  const [step, setStep] = useState<Step>(() => (envelope.recipients.length === 0 ? "recipients" : "fields"));
  const [tool, setTool] = useState<FieldType | null>(null);
  const [chosenSigner, setChosenSigner] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [visiblePage, setVisiblePage] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);

  const signers = draft.recipients.filter((r) => r.role === "signer");
  const activeSigner = signers.find((s) => s.id === chosenSigner)?.id ?? signers[0]?.id ?? null;
  const selected = draft.fields.find((f) => f.key === selectedKey) ?? null;
  const editingFields = step === "fields";

  function place(type: FieldType, page: number, rect: Rect, keepTool: boolean) {
    if (!activeSigner) return;
    const key = newKey();
    const field: DraftField = { key, recipientId: activeSigner, type, page, ...rect, required: type !== "checkbox", label: null };
    change((d) => ({ ...d, fields: [...d.fields, field] }));
    setSelectedKey(key);
    if (!keepTool) setTool(null);
  }
  function placeHere() {
    const page = envelope.pages[visiblePage];
    if (tool && page) place(tool, visiblePage, placeAt(tool, { x: 0.5, y: 0.5 }, page), false);
  }
  function patchField(key: string, patch: Partial<DraftField>) {
    change((d) => ({ ...d, fields: d.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)) }));
  }
  function deleteField(key: string) {
    change((d) => ({ ...d, fields: d.fields.filter((f) => f.key !== key) }));
    setSelectedKey((k) => (k === key ? null : k));
  }

  async function doSend() {
    setSendError(null);
    if (!(await flush())) {
      setSendError("The latest changes couldn't be saved, so nothing was sent. Retry the save, then send.");
      return;
    }
    try {
      const out = await send.mutateAsync();
      onSent(out.links ?? []);
    } catch (e) {
      setSendError(esignErrorMessage(e));
    }
  }

  const fieldCount = draft.fields.length;
  const counts: Record<Step, string | null> = {
    recipients: draft.recipients.length ? `${signers.length} signer${signers.length === 1 ? "" : "s"}` : null,
    fields: fieldCount ? `${fieldCount} field${fieldCount === 1 ? "" : "s"}` : null,
    review: null,
  };

  return (
    <div
      className="app-container flex flex-col gap-5 py-5"
      onKeyDown={(e) => {
        if (e.key === "Escape" && tool) setTool(null);
      }}
    >
      <Header
        back={back}
        name={draft.name}
        envelope={envelope}
        right={
          <>
            <SaveIndicator state={saveState} error={saveError} onRetry={() => void flush()} />
            {step !== "review" && <Button onClick={() => setStep("review")}>Review &amp; send</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <aside aria-label="Envelope settings" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pb-4 [&>*]:shrink-0">
          <StepNav step={step} onStep={(s) => { setStep(s); if (s !== "fields") setTool(null); }} counts={counts} />
          {skipped.length > 0 && (
            <Callout tone="info" title="Not saved until complete">
              <ul className="list-disc ps-4">{skipped.map((s) => <li key={s}>{s}</li>)}</ul>
            </Callout>
          )}
          {step === "recipients" && (
            <>
              <RecipientsEditor draft={draft} change={change} />
              <EnvelopeSettings draft={draft} change={change} />
              <Button variant="outline" className="w-fit" onClick={() => setStep("fields")}>Next: place fields</Button>
            </>
          )}
          {step === "fields" && (
            <FieldTools
              recipients={draft.recipients}
              fields={draft.fields}
              activeSigner={activeSigner}
              onActiveSigner={setChosenSigner}
              tool={tool}
              onTool={setTool}
              onPlaceHere={placeHere}
              visiblePage={visiblePage}
              selected={selected}
              onUpdate={patchField}
              onDelete={deleteField}
              onGoRecipients={() => setStep("recipients")}
            />
          )}
          {step === "review" && (
            <ReviewSend draft={draft} onSend={() => void doSend()} sending={send.isPending} sendError={sendError} saveBlocked={saveState === "error"} />
          )}
        </aside>

        <section aria-label="Document" className="min-w-0">
          <PageCanvas
            pages={envelope.pages}
            fields={draft.fields}
            recipients={draft.recipients}
            editable={editingFields}
            tool={editingFields ? tool : null}
            selectedKey={editingFields ? selectedKey : null}
            onSelect={(k) => {
              setSelectedKey(k);
              if (k && !editingFields) setStep("fields");
            }}
            onPlace={place}
            onChange={(key, rect) => patchField(key, rect)}
            onDelete={deleteField}
            onVisiblePage={setVisiblePage}
            visiblePage={visiblePage}
          />
        </section>
      </div>
    </div>
  );
}

function ReadOnlyWorkbench({ contractId, envelope: env, back }: { contractId: string; envelope: Envelope; back: { href: string; label: string } }) {
  const download = useDownloadEnvelope(contractId);
  const [visiblePage, setVisiblePage] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const recipients: DraftRecipient[] = env.recipients.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, order: r.order }));
  const fields: CanvasField[] = env.fields.map((f) => ({ ...f, key: f.id }));

  function save(file: "sealed" | "source") {
    download.mutate({ envelopeId: env.id, file }, {
      onError: (e) => toast.error("Couldn't download the document", { description: esignErrorMessage(e) }),
    });
  }

  return (
    <div className="app-container flex flex-col gap-5 py-5">
      <Header
        back={back}
        name={env.name}
        envelope={env}
        right={
          <>
            {env.status === "completed" && <Button onClick={() => save("sealed")} disabled={download.isPending}><Download size={14} />Download signed PDF</Button>}
            <Button variant="outline" onClick={() => save("source")} disabled={download.isPending}><Download size={14} />Original</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <aside aria-label="Envelope status" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pb-4 [&>*]:shrink-0">
          {env.status === "draft" && (
            <Callout tone="info">You can view this draft, but editing it needs edit access to the contract.</Callout>
          )}
          <Panel title="Recipients" meta={`${env.signedCount} of ${env.signerCount} signed`}>
            <EnvelopeDetailBody contractId={contractId} envelope={env} />
          </Panel>
          <Panel title="Details">
            <KeyValueList
              layout="inline"
              items={[
                { label: "Signing order", value: env.signingOrder === "parallel" ? "All at once" : "One after another" },
                { label: "Sent", value: env.sentAt ? formatDate(env.sentAt) : null },
                { label: "Expires", value: env.expiresAt ? formatDate(env.expiresAt) : `${env.expiresInDays} days after sending` },
                { label: "Reminders", value: reminderLabel(env.reminderEveryDays) },
                { label: "Completed", value: env.completedAt ? formatDate(env.completedAt) : null },
                { label: "Sealed", value: env.sealed ? `${formatDate(env.sealed.sealedAt)}${env.sealed.timestamped ? ", timestamped" : ""}` : null },
              ]}
              emptyText="Not yet"
            />
            {env.message && <p className="mt-3 border-t border-border-subtle pt-3 text-body whitespace-pre-line text-fg-secondary">{env.message}</p>}
          </Panel>
        </aside>
        <section aria-label="Document" className="min-w-0">
          <PageCanvas
            pages={env.pages}
            fields={fields}
            recipients={recipients}
            editable={false}
            tool={null}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onPlace={() => undefined}
            onChange={() => undefined}
            onDelete={() => undefined}
            onVisiblePage={setVisiblePage}
            visiblePage={visiblePage}
          />
        </section>
      </div>
    </div>
  );
}
