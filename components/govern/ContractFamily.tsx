"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";
import { StageDots } from "@/components/govern/StageDots";
import { contractValueText } from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";

/* An agreement and its amendments, in one place: on an amendment, the
   agreement it amends; on an agreement, every amendment with where it stands.
   Signing an amendment updates the agreement's value and term end. */

export function ContractFamily({ contract: c }: { contract: Contract }) {
  const { data } = useContracts(true);
  const all = data?.contracts ?? [];
  const byId = new Map(all.map((x) => [x.contractId, x]));
  const parent = c.parentContractId ? byId.get(c.parentContractId) ?? null : null;
  const amendments = (c.amendmentIds ?? []).map((id) => byId.get(id)).filter((x): x is Contract => !!x);
  if (!c.parentContractId && amendments.length === 0) return null;

  return (
    <section aria-labelledby={`family-${c.contractId}`}>
      <h3 id={`family-${c.contractId}`} className="flex items-center gap-2 text-base font-semibold text-foreground">
        <GitBranch size={16} aria-hidden className="text-[var(--ink-500)]" />
        {c.parentContractId ? "Amends" : "Amendments"}
        {amendments.length > 0 && <span className="text-sm font-medium text-[var(--ink-500)]">{amendments.length}</span>}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {c.parentContractId && (
          <li>
            <FamilyLink contract={parent} id={c.parentContractId} note="Signing this amendment updates its value and term end." />
          </li>
        )}
        {amendments.map((a) => (
          <li key={a.contractId}><FamilyLink contract={a} id={a.contractId} note={`Changes the value by ${contractValueText(a)}`} /></li>
        ))}
      </ul>
    </section>
  );
}

function FamilyLink({ contract, id, note }: { contract: Contract | null; id: string; note: string }) {
  return (
    <Link href={`/contracts/${encodeURIComponent(id)}`} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-[var(--ink-300)]">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{contract?.title || "The original agreement"}</span>
        <span className="block text-xs text-[var(--ink-600)]">{note}</span>
      </span>
      {contract && <StageDots contract={contract} className="shrink-0 items-end" />}
    </Link>
  );
}
