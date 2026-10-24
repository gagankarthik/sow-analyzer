"use client";

// What a signer sees at /sign/[token]: who sent the document and why, then
// either the signing flow (their turn), or where things stand (waiting,
// signed, declined, closed). Calm and flat, like the counterparty portal;
// one primary action at a time.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Ban, CheckCircle2, Clock, Download, RefreshCw, XCircle } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { SignError, getSigner, signedCopy } from "@/lib/esign/public";
import { isSignToken } from "@/lib/esign/signing";
import type { SignerView } from "@/lib/esign/types";
import { DeclineDialog } from "./DeclineDialog";
import { SignDocument } from "./SignDocument";

type State =
  | { kind: "loading" }
  | { kind: "gone" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: SignerView };

/** What just happened on this visit; the server view alone can't say. */
type Outcome = "signed" | "declined" | null;

const fallbackMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export function SignerPage({ token }: { token: string }) {
  const [state, setState] = useState<State>(() => (isSignToken(token) ? { kind: "loading" } : { kind: "gone" }));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [declining, setDeclining] = useState(false);
  const lastPageRefresh = useRef(0);

  /** `quiet` keeps the current view on screen while it refreshes (after signing). */
  const load = useCallback(async (quiet = false) => {
    if (!isSignToken(token)) return;
    if (!quiet) setState({ kind: "loading" });
    try {
      setState({ kind: "ready", view: await getSigner(token) });
    } catch (e) {
      if (e instanceof SignError && e.gone) setState({ kind: "gone" });
      else setState({ kind: "error", message: fallbackMessage(e) });
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetched once on arrival
    void load(true);
  }, [load]);

  // Page images are presigned for 15 minutes. When one fails, fetch fresh
  // links quietly and keep everything the signer has filled in.
  const refreshPages = useCallback(async () => {
    if (Date.now() - lastPageRefresh.current < 60_000) return;
    lastPageRefresh.current = Date.now();
    try {
      const fresh = await getSigner(token);
      setState((s) => (s.kind === "ready" ? { kind: "ready", view: { ...s.view, pages: fresh.pages } } : s));
    } catch {
      // The images stay broken; Finish still works, and a reload fetches new ones.
    }
  }, [token]);

  const onSigned = useCallback(() => {
    setOutcome("signed");
    window.scrollTo({ top: 0 });
    void load();
  }, [load]);

  // Declining revokes every link, so the view can't be fetched again: show it from here.
  const onDeclined = useCallback(() => {
    setDeclining(false);
    setOutcome("declined");
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 md:px-6">
          <Image src="/logo.svg" alt="Blue-IQ" width={84} height={22} priority className="select-none" />
          <span className="border-l border-border pl-3 text-sm text-[var(--ink-600)]">Govern e-signature</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pt-8 md:px-6 md:pt-12">
        {state.kind === "loading" && <LoadingView />}
        {state.kind === "gone" && outcome !== "declined" && (
          <Notice
            heading="h1"
            icon={<AlertCircle size={20} aria-hidden />}
            title="This signing link has expired or isn't valid"
            text="Ask the sender for a new link. If you already signed, you'll get the completed copy by email."
          />
        )}
        {state.kind === "error" && (
          <Notice heading="h1" icon={<AlertCircle size={20} aria-hidden />} title="We couldn't load this document" text={state.message}>
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw size={16} aria-hidden />
              Try again
            </Button>
          </Notice>
        )}
        {state.kind === "ready" && (
          <article className="flex flex-col gap-8 pb-8">
            <Intro view={state.view} onDecline={outcome === null && (state.view.status === "ready" || state.view.status === "waiting") ? () => setDeclining(true) : undefined} />
            {outcome === "declined" ? (
              <Notice icon={<XCircle size={20} aria-hidden />} title="You declined to sign" text="We've let the sender know, along with your reason. There's nothing more you need to do." />
            ) : (
              <StatusBody token={token} view={state.view} justSigned={outcome === "signed"} onSigned={onSigned} onPagesExpired={refreshPages} />
            )}
          </article>
        )}
      </main>
      <DeclineDialog token={token} open={declining} onOpenChange={setDeclining} onDeclined={onDeclined} />
    </div>
  );
}

function LoadingView() {
  return (
    <div aria-busy className="flex flex-col gap-8">
      <span role="status" className="sr-only">Loading the document</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="rounded-xl bg-[var(--ink-100)] p-3 sm:p-6">
        <Skeleton className="h-[60vh] w-full rounded-sm bg-card" />
      </div>
    </div>
  );
}

function Intro({ view, onDecline }: { view: SignerView; onDecline?: () => void }) {
  const sentBy = view.organizationName ? `Sent by ${view.senderName} at ${view.organizationName}` : `Sent by ${view.senderName}`;
  const due = view.status === "ready" && view.expiresAt ? dateText(view.expiresAt) : null;
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ink-600)]">Document to sign</p>
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground [overflow-wrap:anywhere]">{view.documentName}</h1>
          <p className="text-sm text-[var(--ink-600)]">
            {sentBy}
            {due && <> · Sign by {due}</>}
          </p>
        </div>
        {onDecline && (
          <Button type="button" variant="ghost" size="sm" onClick={onDecline} className="text-[var(--ink-700)]">
            <Ban size={14} aria-hidden />
            Decline to sign
          </Button>
        )}
      </div>
      {view.message && (
        <section aria-labelledby="sign-message" className="max-w-2xl border-l-2 border-[var(--brand-primary-600)] pl-4">
          <h2 id="sign-message" className="text-xs font-medium text-[var(--ink-600)]">Message from {view.senderName}</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{view.message}</p>
        </section>
      )}
    </header>
  );
}

function StatusBody({ token, view, justSigned, onSigned, onPagesExpired }: { token: string; view: SignerView; justSigned: boolean; onSigned: () => void; onPagesExpired: () => void }) {
  switch (view.status) {
    case "ready":
      return <SignDocument token={token} view={view} onSigned={onSigned} onPagesExpired={onPagesExpired} />;
    case "waiting":
      return (
        <Notice
          icon={<Clock size={20} aria-hidden />}
          title="Someone else signs first"
          text="We'll email you when it's your turn. You can close this page."
        />
      );
    case "signed":
      return (
        <Notice
          icon={<CheckCircle2 size={20} aria-hidden />}
          tone="done"
          title={justSigned ? "Signed" : "You signed this"}
          text={
            view.canDownload
              ? "Everyone has signed. Download the completed copy below; it's also on its way by email."
              : justSigned
                ? "Everyone will get the completed copy by email once all have signed."
                : "We're waiting on the others. Everyone will get the completed copy by email once all have signed."
          }
        >
          {view.canDownload && <DownloadButton token={token} />}
        </Notice>
      );
    case "declined":
      return <Notice icon={<XCircle size={20} aria-hidden />} title="You declined to sign" text="The sender has your reason. If that was a mistake, ask them to send a new request." />;
    case "closed":
      return <ClosedNotice token={token} view={view} />;
  }
}

function ClosedNotice({ token, view }: { token: string; view: SignerView }) {
  if (view.envelopeStatus === "completed") {
    return (
      <Notice icon={<CheckCircle2 size={20} aria-hidden />} tone="done" title="This document is complete" text="Everyone has signed.">
        {view.canDownload && <DownloadButton token={token} />}
      </Notice>
    );
  }
  const text: Partial<Record<SignerView["envelopeStatus"], string>> = {
    declined: "A signer declined, so the request is closed. The sender can send a new one.",
    voided: "The sender withdrew this request. There's nothing for you to sign.",
    expired: "This request expired before everyone signed. Ask the sender for a new one.",
  };
  return (
    <Notice
      icon={<Ban size={20} aria-hidden />}
      title="This request is closed"
      text={text[view.envelopeStatus] ?? "This document can't be signed from this link any more."}
    />
  );
}

function DownloadButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    setError(null);
    setBusy(true);
    try {
      const { url } = await signedCopy(token);
      window.location.assign(url); // served as an attachment, so the page stays
    } catch (e) {
      setError(fallbackMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="primary" onClick={download} pending={busy}>
        <Download size={16} aria-hidden />
        Download the signed copy
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Notice({ icon, title, text, tone = "neutral", heading: Heading = "h2", children }: { icon: ReactNode; title: string; text: string; tone?: "neutral" | "done"; heading?: "h1" | "h2"; children?: ReactNode }) {
  return (
    <div role="status" className="flex max-w-xl gap-4 rounded-lg border border-border bg-card p-5 sm:p-6">
      <span className={tone === "done" ? "mt-0.5 shrink-0 text-[var(--brand-primary-600)]" : "mt-0.5 shrink-0 text-[var(--ink-500)]"}>{icon}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Heading className="text-base font-semibold text-foreground">{title}</Heading>
        <p className="text-sm leading-relaxed text-[var(--ink-600)]">{text}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

function dateText(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
