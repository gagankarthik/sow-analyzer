"use client";

// What the counterparty sees: the agreement, what we need from them (with
// suggested wording to copy), the reviewer's note, and one place to upload
// the revised version. Calm and flat (docs/UI_SPEC.md); one primary action.

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/ds/StatusPill";
import { AlertCircle, Loader2 } from "@/components/ui/icons";
import { isPortalToken, requestedDateText, validUntilText, type PortalNeed, type PortalView } from "@/lib/portal/helpers";
import { PortalError, getPortalView } from "@/lib/portal/public";
import { CopyButton } from "./CopyButton";
import { RevisionDropzone } from "./RevisionDropzone";

type State =
  | { kind: "loading" }
  | { kind: "gone" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: PortalView };

const GONE_TEXT = "This link has expired or isn't valid. Ask your contact for a new one.";

export function PortalPage({ token }: { token: string }) {
  const [state, setState] = useState<State>(() => (isPortalToken(token) ? { kind: "loading" } : { kind: "gone" }));

  const load = useCallback(async () => {
    if (!isPortalToken(token)) return;
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", view: await getPortalView(token) });
    } catch (e) {
      if (e instanceof PortalError && e.gone) setState({ kind: "gone" });
      else setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetched once on arrival
    void load();
  }, [load]);

  const org = state.kind === "ready" ? state.view.organizationName : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 md:px-6">
          <Image src="/logo.svg" alt="Blue-IQ" width={84} height={22} priority className="select-none" />
          {org && <span className="truncate border-l border-border pl-3 text-sm text-[var(--ink-600)]">Shared by {org}</span>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        {state.kind === "loading" && (
          <p className="flex items-center gap-2 text-sm text-[var(--ink-600)]" role="status">
            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />Loading the agreement
          </p>
        )}
        {state.kind === "gone" && <Problem title="Link not available" text={GONE_TEXT} />}
        {state.kind === "error" && <Problem title="Couldn't load this page" text={state.message} onRetry={load} />}
        {state.kind === "ready" && <Ready token={token} view={state.view} />}
      </main>
    </div>
  );
}

function Problem({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex max-w-xl gap-3 rounded-lg border border-border bg-card p-5">
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--ink-500)]" aria-hidden />
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="text-sm leading-relaxed text-[var(--ink-600)]">{text}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 self-start text-sm font-medium text-[var(--brand-primary-600)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)]">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function Ready({ token, view }: { token: string; view: PortalView }) {
  const meta = [requestedDateText(view.requestedDate), validUntilText(view.expiresAt)].filter(Boolean) as string[];
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--ink-600)]">Agreement</p>
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]">{view.contractTitle}</h1>
        {meta.length > 0 && <p className="text-sm text-[var(--ink-600)]">{meta.join(" · ")}</p>}
      </header>

      {view.note && (
        <section aria-labelledby="portal-note" className="border-l-2 border-[var(--brand-primary-600)] pl-4">
          <h2 id="portal-note" className="text-xs font-medium text-[var(--ink-600)]">Note from {view.organizationName ?? "your contact"}</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{view.note}</p>
        </section>
      )}

      <section aria-labelledby="portal-needs" className="flex flex-col gap-3">
        <h2 id="portal-needs" className="text-base font-semibold text-foreground">What we need from you</h2>
        {view.needs.length === 0 ? (
          <p className="text-sm text-[var(--ink-600)]">Nothing specific is open. Send a revised version if you have one.</p>
        ) : (
          <ol className="divide-y divide-border rounded-lg border border-border bg-card">
            {view.needs.map((need, i) => <NeedItem key={`${need.clauseLabel}-${i}`} need={need} />)}
          </ol>
        )}
      </section>

      {view.allowUpload && <RevisionDropzone token={token} />}
    </article>
  );
}

const TIER_TONE: Record<string, "warning" | "info" | "neutral"> = {
  "Required change": "warning",
  "Missing clause": "warning",
  "Change requested": "info",
  "Please confirm": "neutral",
  Requested: "neutral",
};

function NeedItem({ need }: { need: PortalNeed }) {
  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-foreground">{need.clauseLabel}</h3>
        <StatusPill tone={TIER_TONE[need.tier] ?? "neutral"} size="sm">{need.tier}</StatusPill>
      </div>
      <p className="text-sm text-[var(--ink-700)]">{need.title}</p>
      {need.suggestedLanguage && (
        <div className="flex flex-col gap-1.5 rounded-md bg-[var(--ink-50)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--ink-600)]">Suggested wording</span>
            <CopyButton text={need.suggestedLanguage} label={`Copy suggested wording for ${need.clauseLabel}`} />
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{need.suggestedLanguage}</p>
        </div>
      )}
    </li>
  );
}
