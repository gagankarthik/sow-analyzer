"use client";

// One contract on the board, and nothing more than it takes to pick it out
// and see whether it is late: the title, the counterparty, the time in its
// stage ("3 days past target" in the danger colour, else "8 days in stage")
// and the owner's initials. On the board the whole card opens the preview
// panel (elsewhere it links to the contract); the next step, assigning and
// the other actions live on the contract page, one click from the preview.

import { memo } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ds/Avatar";
import { daysPastTarget } from "@/lib/govern/stage-time";
import { useOpenPreview } from "./preview-context";
import { STATE_LABEL } from "@/lib/govern/labels";
import { displayTitle } from "@/lib/format";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

function timeText(c: Contract): { text: string; late: boolean } {
  const past = daysPastTarget(c.daysInStage, c.targetDays);
  if (past !== null) return { text: `${past} ${past === 1 ? "day" : "days"} past target`, late: true };
  return { text: `${c.daysInStage} ${c.daysInStage === 1 ? "day" : "days"} in stage`, late: false };
}

function ContractCardImpl({ contract: c }: { contract: Contract }) {
  const closed = c.state === "rejected" || c.state === "closed";
  const title = displayTitle(c.title) || "Untitled contract";
  const party = c.counterparty || c.sponsor;
  const time = closed ? { text: STATE_LABEL[c.state], late: false } : timeText(c);
  const owner = c.owner ? c.owner.name || c.owner.email : "Unassigned";
  const href = `/contracts/${encodeURIComponent(c.contractId)}`;
  const openPreview = useOpenPreview();
  const cover = "block w-full text-start outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus";

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 rounded-md border border-[var(--ink-200)] bg-surface-raised px-3.5 py-3 transition-colors duration-150 [content-visibility:auto] [contain-intrinsic-size:auto_96px] hover:border-[var(--ink-300)] motion-reduce:transition-none",
        closed && "bg-[var(--ink-50)]",
      )}
    >
      <div className="flex min-w-0 flex-col leading-5">
        <h3 className="text-[15px] font-semibold break-words text-[var(--ink-900)] group-hover:text-[var(--brand-primary-700)]">
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
        {party && <p className="truncate text-[14px] text-[var(--ink-600)]">{party}</p>}
      </div>
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className={cn("min-w-0 truncate font-semibold tabular-nums", time.late ? "text-[var(--danger)]" : "text-[var(--ink-600)]")}>
          {time.text}
        </span>
        <span title={owner} className="shrink-0">
          {c.owner ? <Avatar name={c.owner.name} email={c.owner.email} size="sm" decorative /> : <Avatar size="sm" decorative />}
          <span className="sr-only">Owner: {owner}</span>
        </span>
      </div>
    </article>
  );
}

/** Memoised: the list query keeps unchanged contracts as the same object
 *  (React Query structural sharing), so a poll re-renders only cards that changed. */
export const ContractCard = memo(ContractCardImpl);
