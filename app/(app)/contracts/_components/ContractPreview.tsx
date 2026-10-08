"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronsRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/govern/StatusBanner";
import { AvatarStack } from "@/components/ds/Avatar";
import { personName } from "@/lib/govern/labels";
import { ContractDocuments, ContractProperties, shortDate } from "@/components/govern/ContractFacts";
import { contractPeople } from "@/lib/govern/people";
import { useContract } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";

/* Quick look at one contract without leaving the list: where it stands and
   whose turn it is, its documents and its key properties. "Open" goes to the
   full contract page. Escape or the close button returns to the list. */

export function ContractPreview({ contract: c, me, onClose }: { contract: Contract; me: string | null; onClose: () => void }) {
  const detail = useContract(c.contractId);
  const panelRef = useRef<HTMLElement>(null);
  const href = `/contracts/${encodeURIComponent(c.contractId)}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the panel when it opens on a new contract.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [c.contractId]);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Preview: ${c.title || "Untitled agreement"}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[30rem] flex-col border-l border-border bg-background shadow-[0_0_48px_-16px_rgba(10,13,20,0.28)] outline-none lg:top-16"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onClose} aria-label="Close preview" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-foreground">
            <ChevronsRight size={17} aria-hidden />
          </button>
          <Link href={href} aria-label="Open the full contract page" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-foreground">
            <Maximize2 size={15} aria-hidden />
          </Link>
        </div>
        <Button asChild size="sm"><Link href={href}>Open contract</Link></Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{c.title || "Untitled agreement"}</h2>
        <p className="mt-1.5 text-sm text-[var(--ink-600)]">
          {[c.owner ? `Owned by ${personName(c.owner)}` : "No owner yet", shortDate(c.createdAt) ? `Created ${shortDate(c.createdAt)}` : null].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3"><AvatarStack people={contractPeople(c)} max={5} /></div>

        <StatusBanner contract={c} me={me} compact className="mt-5" />

        <ContractDocuments contract={c} versions={detail.data?.versions ?? []} loading={detail.isLoading} className="mt-10" />
        <ContractProperties
          contract={c}
          className="mt-10"
          edit={<Link href={`${href}#details`} className="text-sm font-medium text-[var(--brand-primary-700)] hover:underline">Edit</Link>}
        />
      </div>
    </aside>
  );
}
