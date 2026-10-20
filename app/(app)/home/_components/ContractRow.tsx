"use client";

// One contract as a single line: title · party · days in step · next step.
// The whole row opens the contract page, where the blockers are listed. Why
// it is listed (`reason`) is spoken and shown as the row's tooltip, so the
// row stays one line.

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { STAGE_LABEL } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract } from "@/lib/govern/types";
import { displayTitle } from "@/lib/format";
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
  const title = displayTitle(c.title) || "Untitled contract";
  const why = reason ?? STAGE_LABEL[c.stage];
  return (
    <li>
      <Link
        href={contractHref(c.contractId) + (c.openBlockers > 0 ? "#blockers" : "")}
        title={why}
        className="group flex min-h-11 min-w-0 items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]"
      >
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            tone === "danger" ? "bg-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning)]" : "bg-[var(--ink-300)]",
          )}
        />
        <span className="relative min-w-0 flex-[2] truncate text-sm font-medium text-foreground group-hover:text-[var(--brand-primary-700)]">
          {title}
          <span className="sr-only">. {why.replace(/[.\s]+$/, "")}.</span>
        </span>
        {who && <span className="hidden min-w-0 flex-1 truncate text-sm text-[var(--ink-600)] sm:block">{who}</span>}
        {showValue && (
          <span className="hidden shrink-0 text-sm tabular-nums text-[var(--ink-600)] md:block">{contractValueText(c)}</span>
        )}
        <span className="shrink-0"><DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} /></span>
        {showNext && (
          c.nextStep.headline ? (
            <span className="relative hidden min-w-0 flex-[2] truncate text-sm text-[var(--ink-700)] lg:block">
              <span className="sr-only">Next: </span>
              {c.nextStep.headline}
            </span>
          ) : (
            <span className="hidden shrink-0 lg:flex"><WaitingOnChip waitingOn={c.waitingOn} short /></span>
          )
        )}
        <ChevronRight aria-hidden size={16} className="shrink-0 text-[var(--ink-400)] group-hover:text-[var(--brand-primary-600)] rtl:rotate-180" />
      </Link>
    </li>
  );
}
