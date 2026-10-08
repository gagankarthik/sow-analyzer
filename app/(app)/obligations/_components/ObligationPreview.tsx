"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, Check, ChevronsRight, FileText } from "lucide-react";
import { Sonar } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ds/Avatar";
import { shortDate } from "@/components/govern/ContractFacts";
import { AGREEMENT_TYPE_LABEL, OBLIGATION_KIND_LABEL, personName, plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import { daysUntil } from "@/lib/govern/obligation-views";
import type { PortfolioObligation } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/* Quick look at one obligation: what it is, when it is due, whether a person
   has confirmed it, the contract it comes from, and the two things you do
   with it (verify, mark done). */

export function ObligationPreview({ obligation: o, today, busy, readOnly = false, onVerify, onDone, onClose }: {
  obligation: PortfolioObligation;
  /** Local midnight, from the page, so every date reads from the same "today". */
  today: number;
  busy: boolean;
  /** Hide Verify and Mark done (leaders read only). */
  readOnly?: boolean;
  onVerify: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [o.id]);

  const n = o.dueDate ? daysUntil(o.dueDate, today) : null;
  const when = n === null ? "No due date yet" : n < 0 ? `${plural(-n, "day")} overdue` : n === 0 ? "Due today" : `Due in ${plural(n, "day")}`;
  const contractHref = `/contracts/${encodeURIComponent(o.contractId)}`;

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={`Preview: ${o.title}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[28rem] flex-col border-l border-border bg-background shadow-[0_0_48px_-16px_rgba(10,13,20,0.28)] outline-none lg:top-16"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <button type="button" onClick={onClose} aria-label="Close preview" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-foreground">
          <ChevronsRight size={17} aria-hidden />
        </button>
        <div className="flex gap-2">
          {!readOnly && !o.verified && <Button size="sm" variant="outline" disabled={busy} onClick={onVerify}><BadgeCheck size={14} />Verify</Button>}
          {!readOnly && <Button size="sm" disabled={busy} onClick={onDone}><Check size={14} />Mark done</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-5">
        <p className="text-sm text-[var(--ink-600)]">{OBLIGATION_KIND_LABEL[o.kind]}</p>
        <h2 className="mt-1 text-xl font-semibold leading-snug tracking-tight text-foreground">{o.title}</h2>

        <section aria-label="When it is due" className="mt-5 rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className={cn("text-lg font-semibold", n !== null && n < 0 ? "text-[var(--danger)]" : n !== null && n <= 14 ? "text-[var(--warning-fg)]" : "text-foreground")}>{when}</p>
          <p className="mt-0.5 text-sm text-[var(--ink-600)]">
            {[shortDate(o.dueDate), o.amount ? formatCompact(o.amount, o.currency) : null].filter(Boolean).join(" · ") || "Add a date on the contract so it is tracked."}
          </p>
          <p className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm">
            {o.verified ? (
              <>
                <BadgeCheck size={15} aria-hidden className="text-[var(--success)]" />
                <span>Verified{o.verifiedBy ? ` by ${personName(o.verifiedBy)}` : ""}{o.verifiedAt ? ` on ${shortDate(o.verifiedAt)}` : ""}</span>
              </>
            ) : (
              <>
                <Sonar size={15} aria-hidden className="text-[var(--warning-fg)]" />
                <span>Found by Sonar. Check it against the agreement, then verify.</span>
              </>
            )}
          </p>
        </section>

        <section aria-labelledby="ob-contract" className="mt-8">
          <h3 id="ob-contract" className="text-base font-semibold text-foreground">From the contract</h3>
          <Link href={`${contractHref}#money`} className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:border-[var(--ink-300)]">
            <FileText size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{o.contractTitle || "Untitled contract"}</span>
              <span className="block text-xs text-[var(--ink-600)]">{[o.agreementType ? AGREEMENT_TYPE_LABEL[o.agreementType] : null, o.counterparty].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
          <dl className="mt-5 flex flex-col gap-4">
            <div>
              <dt className="text-xs text-[var(--ink-600)]">Contract owner</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                {o.owner?.email ? <><Avatar name={o.owner.name} email={o.owner.email} size="sm" decorative />{o.owner.name || o.owner.email}</> : <span className="text-[var(--ink-500)]">Unassigned</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--ink-600)]">Source</dt>
              <dd className="mt-0.5 text-sm text-foreground">{o.source === "sonar" ? "Found by Sonar in the signed agreement" : "Added by a person"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </aside>
  );
}
