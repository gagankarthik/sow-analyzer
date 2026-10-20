"use client";

// One contract on the board: what it is, where it is, who has it, how long,
// what blocks it, and the one thing to do next. On the board the whole card
// opens the preview panel (elsewhere it links to the contract); the owner
// prompt, the next-step button and the "…" menu sit above that layer.

import { byEdition } from "@/lib/edition-runtime";
import { memo, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert, CheckCircle2, CircleDashed, UserRound } from "@/components/ui/icons";
import { TurnPill } from "@/components/govern/primitives";
import { useOpenPreview } from "./preview-context";
import { AvatarStack } from "@/components/ds/Avatar";
import { contractPeople } from "@/lib/govern/people";
import { ActionDialogHost, ContractActionsMenu, NextStepButton, availableActions } from "@/components/govern/actions";
import { AGREEMENT_TYPE_LABEL, STATE_LABEL, plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import { displayTitle } from "@/lib/format";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

function partyLine(c: Contract): string | null {
  const party = c.sponsor || c.counterparty;
  // The PI is a research field: Workforce cards show the vendor only.
  const pi = byEdition(c.piName, null);
  if (party && pi) return `${party} · PI ${pi}`;
  return party || (pi ? `PI ${pi}` : null);
}

function ContractCardImpl({ contract: c }: { contract: Contract }) {
  const [assigning, setAssigning] = useState(false);
  const closed = c.state === "rejected" || c.state === "closed";
  const canAssign = availableActions(c).includes("assign");
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  const party = partyLine(c);
  const title = displayTitle(c.title) || "Untitled contract";
  const gaps = c.captureGaps?.length ?? 0;
  const href = `/contracts/${encodeURIComponent(c.contractId)}`;
  const openPreview = useOpenPreview();
  const cover = "block w-full rounded-sm text-start after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--brand-primary-400)] group-hover:text-[var(--brand-primary-700)]";

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-2.5 rounded-xl [content-visibility:auto] [contain-intrinsic-size:auto_120px] border border-border bg-card p-3 transition-colors duration-150 hover:border-[var(--ink-300)] focus-within:border-[var(--brand-primary-300)] motion-reduce:transition-none",
        closed && "bg-[var(--panel)]",
      )}
    >
      {/* Type and value */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-[var(--ink-600)]">{AGREEMENT_TYPE_LABEL[c.agreementType]}</span>
        {c.value !== null ? (
          <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCompact(c.value, c.currency)}</span>
        ) : (
          <span className="shrink-0 font-medium text-[var(--ink-600)]">No value yet</span>
        )}
      </div>

      {/* Title: the link that covers the card */}
      <div className="-mt-1 min-w-0">
        <h3 className="text-sm font-semibold break-words leading-snug text-foreground">
          {openPreview ? (
            <button type="button" onClick={() => openPreview(c.contractId)} title={title} className={cover}>
              <span className="line-clamp-2">{title}</span>
            </button>
          ) : (
            <Link href={href} title={title} className={cover}>
              <span className="line-clamp-2">{title}</span>
            </Link>
          )}
        </h3>
        {party && <p className="mt-0.5 truncate text-sm text-[var(--ink-600)]">{party}</p>}
      </div>

      {/* Who has it and for how long */}
      <div className="flex flex-wrap items-center gap-1.5">
        {closed ? (
          <span className="inline-flex h-6 items-center rounded-md bg-[var(--ink-100)] px-2 text-xs font-semibold text-[var(--ink-700)]">{STATE_LABEL[c.state]}</span>
        ) : (
          <>
            <TurnPill waitingOn={c.waitingOn} days={c.daysInStage} sla={c.slaStatus} className="min-w-0" />
          </>
        )}
        {analyzing && (
          <span className="inline-flex h-6 items-center gap-1 rounded-md bg-[var(--ai-surface)] px-2 text-xs font-medium text-[var(--ai-ink)]">
            <Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" />Sonar is reading
          </span>
        )}
      </div>

      {/* Owner, open items, missing details */}
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Owner</dt>
          <dd className="flex min-w-0 items-center gap-2">
            {c.owner ? (
              <AvatarStack people={contractPeople(c)} size="sm" showSoloName className="text-[var(--ink-700)]" />
            ) : !canAssign ? (
              <span className="text-[var(--ink-600)]">No owner</span>
            ) : (
              <button
                type="button"
                onClick={() => setAssigning(true)}
                className="relative z-10 inline-flex min-h-7 items-center gap-1.5 rounded-md border border-dashed border-[var(--warning)] px-2 text-xs font-semibold text-[var(--warning-fg)] transition-colors duration-150 hover:bg-[var(--warning-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warning)] max-md:min-h-11"
              >
                <UserRound size={12} aria-hidden />Unassigned: assign owner
              </button>
            )}
          </dd>
        </div>
        {!closed && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <dt className="sr-only">Open items</dt>
            <dd className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.openBlockers > 0 ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>
              {c.openBlockers > 0 ? <ShieldAlert size={12} aria-hidden /> : <CheckCircle2 size={12} aria-hidden />}
              {c.openBlockers > 0 ? `${plural(c.openBlockers, "open item")}` : "Nothing blocking"}
            </dd>
            {gaps > 0 && (
              <>
                <dt className="sr-only">Missing details</dt>
                <dd className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-600)]" title="Details Sonar could not find. Add them on the contract page.">
                  <CircleDashed size={12} aria-hidden />{plural(gaps, "detail")} missing
                </dd>
              </>
            )}
          </div>
        )}
      </dl>

      {/* The one next step, then everything else */}
      <div className="relative z-10 flex items-center gap-2 border-t border-border pt-2.5">
        <div className="min-w-0 flex-1">
          <NextStepButton contract={c} size="sm" className="w-full max-w-full max-md:h-11" />
        </div>
        <ContractActionsMenu contract={c} showOpen size="sm" className="max-md:size-11" />
      </div>

      <ActionDialogHost kind={assigning ? "assign" : null} contract={c} onClose={() => setAssigning(false)} />
    </article>
  );
}

/** Memoised: the list query keeps unchanged contracts as the same object
 *  (React Query structural sharing), so a poll re-renders only cards that changed. */
export const ContractCard = memo(ContractCardImpl);
