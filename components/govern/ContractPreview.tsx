"use client";

import { displayTitle } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Coins, Clause, Hourglass, Maximize2, X } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBanner } from "@/components/govern/StatusBanner";
import { AvatarStack } from "@/components/ds/Avatar";
import { AGREEMENT_TYPE_LABEL, WAITING_ON_LABEL, personName } from "@/lib/govern/labels";
import { ContractDocuments, ContractProperties, shortDate } from "@/components/govern/ContractFacts";
import { contractRef } from "@/lib/govern/list-properties";
import { contractValueText } from "@/lib/govern/metrics";
import { contractPeople } from "@/lib/govern/people";
import { useContract } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { AssignDialog, availableActions } from "./actions";
import { OwnerChip, RISK_FG, RiskBars, daysText } from "./PropertyChip";
import { StageLabel } from "./StageIcon";
import { RISK_TEXT } from "./list-cells";

/* Quick look at one contract without leaving the list (a "peek"): a header
   with the title and the actions (open the full page, close), the key
   properties as label / value rows, then where it stands and whose turn it
   is, its documents and every other property. Owner opens Assign when the
   person may assign. Escape or the close button returns to the list. */

export function ContractPreview({ contract: c, me, onClose }: { contract: Contract; me: string | null; onClose: () => void }) {
  const detail = useContract(c.contractId);
  const panelRef = useRef<HTMLElement>(null);
  const [assigning, setAssigning] = useState(false);
  const href = `/contracts/${encodeURIComponent(c.contractId)}`;
  const title = displayTitle(c.title) || "Untitled contract";
  const ref = contractRef(c);
  const canAssign = availableActions(c).includes("assign");
  const days = daysText(c);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !assigning && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, assigning]);

  // Move focus into the panel when it opens on a new contract.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [c.contractId]);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Preview: ${title}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[32rem] flex-col border-l border-border-default bg-surface-raised shadow-[0_0_48px_-16px_rgba(10,13,20,0.28)] outline-none lg:top-11 lg:right-2 lg:bottom-2 lg:rounded-r-lg lg:border-t lg:border-b"
    >
      <div className="flex items-start gap-2 border-b border-border-default px-4 py-2.5">
        <div className="min-w-0 flex-1 py-0.5">
          {ref && <p className="font-mono text-[12px] tabular-nums text-[var(--ink-500)]">{ref}</p>}
          <h2 className="line-clamp-2 text-[16px] leading-6 font-semibold text-[var(--ink-900)]" title={c.title || undefined}>{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label="Open the full contract page">
            <Link href={href} aria-label="Open the full contract page" className={iconButton}>
              <Maximize2 size={16} aria-hidden />
            </Link>
          </IconAction>
          <IconAction label="Close preview (Esc)">
            <button type="button" onClick={onClose} aria-label="Close preview" className={iconButton}>
              <X size={16} aria-hidden />
            </button>
          </IconAction>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3">
        <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-3 text-[13px]">
          <Prop label="Stage"><StageLabel stage={c.stage} state={c.state} textClassName="text-[var(--ink-900)]" /></Prop>
          <Prop label="Owner">
            <OwnerChip owner={c.owner} onAssign={canAssign ? () => setAssigning(true) : undefined} />
          </Prop>
          <Prop label="Risk">
            <span className="inline-flex items-center gap-2">
              <RiskBars risk={c.overallRisk} />
              <span className={c.overallRisk ? cn("font-medium", RISK_FG[c.overallRisk]) : "text-[var(--ink-600)]"}>{c.overallRisk ? RISK_TEXT[c.overallRisk] : "Not assessed"}</span>
            </span>
          </Prop>
          <Prop label="Days in step">
            <span className={cn("inline-flex items-center gap-2", days.past !== null ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-900)]")}>
              <Clock size={12} aria-hidden className={days.past !== null ? "" : "text-[var(--ink-500)]"} />
              <span className="tabular-nums">
                {c.daysInStage} {c.daysInStage === 1 ? "day" : "days"}
                {days.past !== null ? ` · ${days.past} past target` : c.targetDays ? <span className="text-[var(--ink-500)]"> of {c.targetDays}</span> : null}
              </span>
            </span>
          </Prop>
          <Prop label="Value">
            <span className="inline-flex items-center gap-2">
              <Coins size={12} aria-hidden className="text-[var(--ink-500)]" />
              <span className={c.value === null ? "text-[var(--ink-600)]" : "tabular-nums text-[var(--ink-900)]"}>{contractValueText(c)}</span>
            </span>
          </Prop>
          <Prop label="Agreement type">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Clause size={12} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
              <span className="truncate text-[var(--ink-900)]">{AGREEMENT_TYPE_LABEL[c.agreementType]}</span>
            </span>
          </Prop>
          <Prop label="Waiting on">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Hourglass size={12} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
              <span className="truncate text-[var(--ink-900)]">{c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind]}</span>
            </span>
          </Prop>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-4">
          <p className="text-[13px] text-[var(--ink-600)]">
            {[c.owner ? `Owned by ${personName(c.owner)}` : "No owner yet", shortDate(c.createdAt) ? `Created ${shortDate(c.createdAt)}` : null].filter(Boolean).join(" · ")}
          </p>
          <AvatarStack people={contractPeople(c)} max={5} />
        </div>

        <StatusBanner contract={c} me={me} compact className="mt-4" />

        <ContractDocuments contract={c} versions={detail.data?.versions ?? []} loading={detail.isLoading} className="mt-8" />
        <ContractProperties
          contract={c}
          className="mt-8"
          edit={<Link href={`${href}#details`} className="text-sm font-medium text-[var(--brand-primary-700)] hover:underline">Edit</Link>}
        />
      </div>
      {canAssign && <AssignDialog contract={c} open={assigning} onOpenChange={setAssigning} />}
    </aside>
  );
}

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus max-md:size-10";

function IconAction({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="flex h-9 items-center text-[var(--ink-600)]">{label}</dt>
      <dd className="flex h-9 min-w-0 items-center">{children}</dd>
    </>
  );
}
