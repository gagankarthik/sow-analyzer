"use client";

import Link from "next/link";
import { Kanban } from "@/components/ui/icons";
import { STATE_LABEL } from "@/lib/govern/labels";
import { useContractForDoc } from "./useContractForDoc";

/** In a document's header: a link to its workflow contract, when it has one.
 *  Renders nothing otherwise (or while the list loads, or if it fails). */
export function WorkflowLinkChip({ docId }: { docId: string }) {
  const { contract } = useContractForDoc(docId);
  if (!contract) return null;
  return (
    <Link
      href={`/contracts/${encodeURIComponent(contract.contractId)}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-structure-border bg-structure-soft px-2.5 text-xs font-semibold text-structure-soft-fg transition-colors hover:border-[var(--brand-primary-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
    >
      <Kanban size={13} aria-hidden />
      Workflow · {STATE_LABEL[contract.state]}
    </Link>
  );
}
