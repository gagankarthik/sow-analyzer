"use client";

// One contract on the board: its reference when it has one, the title (two
// lines at most), the counterparty, then a row of property chips (risk,
// days in step, value, …) with the owner's avatar at the end, as chosen
// under Display. On the board the whole card opens the preview panel
// (elsewhere it links to the contract); status changes only through the
// actions in the preview or on the contract page. Hover darkens the border.

import { memo } from "react";
import Link from "next/link";
import { CHIP_CLASS, OwnerChip, PropertyChip } from "@/components/govern/PropertyChip";
import { useOpenPreview } from "./preview-context";
import { STATE_LABEL } from "@/lib/govern/labels";
import { contractRef } from "@/lib/govern/list-properties";
import { displayTitle } from "@/lib/format";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/** Default when the board does not say which chips to show. */
const ALL_CHIPS = new Set(["counterparty", "risk", "days", "value", "owner"]);

function ContractCardImpl({ contract: c, show = ALL_CHIPS }: { contract: Contract; show?: ReadonlySet<string> }) {
  const closed = c.state === "rejected" || c.state === "closed";
  const title = displayTitle(c.title) || "Untitled contract";
  const party = c.counterparty || c.sponsor;
  const ref = contractRef(c);
  const href = `/contracts/${encodeURIComponent(c.contractId)}`;
  const openPreview = useOpenPreview();
  const cover = "block w-full text-start outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus";
  const chips = (["risk", "days", "value", "type", "waitingOn"] as const).filter((id) => show.has(id) && !(closed && id === "days"));

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 rounded-md border border-[var(--ink-200)] bg-surface-raised px-3 py-2.5 transition-colors duration-150 [content-visibility:auto] [contain-intrinsic-size:auto_96px] hover:border-[var(--ink-400)] motion-reduce:transition-none",
        closed && "bg-[var(--ink-50)]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {ref && <p className="font-mono text-[11px] leading-4 tabular-nums text-[var(--ink-500)]">{ref}</p>}
        <h3 className="text-[14px] leading-5 font-semibold break-words text-[var(--ink-900)]">
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
        {party && show.has("counterparty") && <p className="truncate text-[13px] leading-5 text-[var(--ink-600)]">{party}</p>}
      </div>
      {(chips.length > 0 || closed || show.has("owner")) && (
        <div className="flex min-w-0 items-center gap-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {closed && <span className={cn(CHIP_CLASS, "text-[var(--ink-600)]")}>{STATE_LABEL[c.state]}</span>}
            {chips.map((id) => <PropertyChip key={id} id={id} contract={c} />)}
          </div>
          {show.has("owner") && <OwnerChip owner={c.owner} avatarOnly />}
        </div>
      )}
    </article>
  );
}

/** Memoised: the list query keeps unchanged contracts as the same object
 *  (React Query structural sharing), so a poll re-renders only cards that changed. */
export const ContractCard = memo(ContractCardImpl);
