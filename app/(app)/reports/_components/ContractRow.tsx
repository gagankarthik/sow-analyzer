"use client";

// One contract as a single, calm row a leader can click: what it is, why it
// is here, who has it, and the one next step. The whole row opens the
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
  c, reason, tone = "neutral", showValue = false,
}: {
  c: Contract;
  /** Plain sentence of why it is listed; defaults to its stage. */
  reason?: string;
  tone?: "neutral" | "danger" | "warning";
  showValue?: boolean;
}) {
  const who = c.sponsor || c.counterparty;
  return (
    <li>
      <Link
        href={contractHref(c.contractId)}
        className="group relative -mx-3 flex items-start gap-3 rounded-xl px-3 py-4 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:gap-4"
      >
        <span
          aria-hidden
          className={cn(
            "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
            tone === "danger" ? "bg-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning)]" : "bg-[var(--ink-300)]",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="min-w-0 break-words text-lg font-semibold leading-snug text-foreground group-hover:text-[var(--brand-primary-700)]">
              {c.title}
            </span>
            {who && <span className="text-base text-[var(--ink-600)]">with {who}</span>}
          </span>
          <span className="mt-1 block text-base leading-relaxed text-[var(--ink-700)]">
            {reason ?? STAGE_LABEL[c.stage]}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <WaitingOnChip waitingOn={c.waitingOn} />
            <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} />
            {showValue && <span className="text-sm font-medium tabular-nums text-[var(--ink-600)]">{contractValueText(c)}</span>}
          </span>
          {c.nextStep.headline && (
            <span className="mt-2.5 block text-base leading-relaxed text-foreground">
              <span className="font-semibold text-[var(--brand-primary-700)]">Next: </span>
              {c.nextStep.headline}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          size={18}
          className="mt-1.5 shrink-0 text-[var(--ink-400)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary-600)] motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}
