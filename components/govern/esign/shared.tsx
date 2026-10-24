"use client";

// Small pieces every Govern e-signature screen shares: status pills, the
// signer colour dot, field-type icons, and a signing link shown once.

import { useEffect, useRef, useState } from "react";
import { StatusPill } from "@/components/ds/StatusPill";
import type { ToneInput } from "@/components/ds/tone";
import { Button } from "@/components/ui/button";
import {
  AtSign, CalendarDays, Check, Copy, Mail, PenLine, Signature, SquareCheck, TextCursorInput, User,
} from "@/components/ui/icons";
import { ENVELOPE_STATUS_LABEL, type EnvelopeStatus, type FieldType, type RecipientStatus, type SigningLink } from "@/lib/esign/types";
import type { SignerColor } from "@/lib/govern/esign-editor";
import { cn } from "@/lib/utils";

const ENVELOPE_TONE: Record<EnvelopeStatus, ToneInput> = {
  draft: "unknown",
  sent: "acceptable",
  sealing: "acceptable",
  completed: "ok",
  declined: "blocked",
  voided: "unknown",
  expired: "caution",
  failed: "blocked",
};

export function EnvelopeStatusPill({ status, size }: { status: EnvelopeStatus; size?: "sm" | "md" }) {
  return <StatusPill tone={ENVELOPE_TONE[status]} size={size}>{ENVELOPE_STATUS_LABEL[status]}</StatusPill>;
}

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  pending: "Waiting",
  sent: "Link sent",
  viewed: "Opened",
  signed: "Signed",
  declined: "Declined",
};

const RECIPIENT_TONE: Record<RecipientStatus, ToneInput> = {
  pending: "unknown",
  sent: "acceptable",
  viewed: "brand",
  signed: "ok",
  declined: "blocked",
};

export function RecipientStatusPill({ status }: { status: RecipientStatus }) {
  return <StatusPill tone={RECIPIENT_TONE[status]} size="sm">{RECIPIENT_STATUS_LABEL[status]}</StatusPill>;
}

/** The signer's colour, always next to their name (never colour alone). */
export function SignerDot({ color, className }: { color: SignerColor; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", color.dot, className)} />;
}

export const FIELD_ICON: Record<FieldType, typeof Signature> = {
  signature: Signature,
  initials: PenLine,
  name: User,
  email: AtSign,
  date: CalendarDays,
  text: TextCursorInput,
  checkbox: SquareCheck,
};

/** One signing link: who it is for, whether it was emailed, and a copy button. Shown once. */
export function SigningLinkRow({ link }: { link: SigningLink }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      // No clipboard permission: select it so Ctrl/Cmd+C works.
      input.current?.select();
    }
  }

  const id = `link-${link.recipientId}`;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-default bg-surface-raised p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="min-w-0 text-body font-semibold text-fg-primary">
          {link.name} <span className="font-normal text-fg-tertiary">{link.email}</span>
        </label>
        <span className={cn("inline-flex items-center gap-1 text-caption", link.emailed ? "text-status-ok-fg" : "text-status-caution-fg")}>
          <Mail size={12} aria-hidden />
          {link.emailed ? "Emailed" : "Not emailed: share the link yourself"}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={input}
          id={id}
          readOnly
          value={link.url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-surface-sunken px-2.5 font-mono text-caption text-fg-primary outline-none focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
        />
        <Button type="button" variant="outline" onClick={copy} aria-label={copied ? "Link copied" : `Copy ${link.name}'s link`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </div>
  );
}

/** "Copy them now" under a list of links. */
export function LinksShownOnce() {
  return <p className="text-caption text-fg-secondary">Each link is shown only now. Anyone with a link can sign as that person, so share it only with them.</p>;
}
