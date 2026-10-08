"use client";

// One contract as a compact row: what it is and who it is with, why it is
// listed, its status chips and the one next step. The whole row opens the
// contract page, where the blockers are listed.

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { STAGE_LABEL } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { contractHref } from "./attention";

export function ContractRow({
  c, reason, tone = "neutral", showValue = false, showNext = true,
}: {
  c: Contract;
  /** Plain sentence of why it is listed; defaults to its stage. */
  reason?: string;
  tone?: "neutral" | "danger" | "warning";
  showValue?: boolean;
  showNext?: boolean;
}) {
  const who = c.sponsor || c.counterparty;
  return (
    <li>
      <Link
        href={contractHref(c.contractId)}
        className="group flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            tone === "danger" ? "bg-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning)]" : "bg-[var(--ink-300)]",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground group-hover:text-[var(--brand-primary-700)]">
              {c.title}
            </span>
            {showValue && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--ink-600)]">{contractValueText(c)}</span>
            )}
            <span className="shrink-0"><DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} /></span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-[var(--ink-600)]">
            {who ? `${who} · ` : ""}{reason ?? STAGE_LABEL[c.stage]}
          </span>
          {/* "Next" already names who it waits on; without it, the chip does. */}
          {showNext && c.nextStep.headline ? (
            <span className="mt-1 block truncate text-sm text-foreground">
              <span className="font-semibold text-[var(--brand-primary-700)]">Next: </span>
              {c.nextStep.headline}
            </span>
          ) : (
            <span className="mt-1.5 flex"><WaitingOnChip waitingOn={c.waitingOn} /></span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          size={16}
          className="mt-1.5 shrink-0 text-[var(--ink-400)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary-600)] motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}
