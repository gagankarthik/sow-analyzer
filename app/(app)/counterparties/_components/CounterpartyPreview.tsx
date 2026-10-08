"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarStack, type StackPerson } from "@/components/ds/Avatar";
import { shortDate } from "@/components/govern/ContractFacts";
import { StageDots } from "@/components/govern/StageDots";
import { AGREEMENT_TYPE_LABEL, plural } from "@/lib/govern/labels";
import { contractValueText, formatCompact } from "@/lib/govern/metrics";
import { contractPeople } from "@/lib/govern/people";
import type { Counterparty } from "@/lib/govern/counterparties";
import { cn } from "@/lib/utils";

/* One counterparty's profile: the relationship, the figures across all their
   agreements, every agreement with where it stands, and the people on your
   side who work with them. */

export function CounterpartyPreview({ counterparty: r, onClose }: { counterparty: Counterparty; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [r.key]);

  // Everyone on your side across their agreements, once each.
  const people = new Map<string, StackPerson>();
  for (const c of r.contracts) for (const p of contractPeople(c)) if (!people.has(p.email.toLowerCase())) people.set(p.email.toLowerCase(), p);
  const sorted = [...r.contracts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const listHref = `/contracts?view=all&q=${encodeURIComponent(r.name)}`;

  const figures = [
    { label: "Agreements", value: r.contracts.length.toLocaleString() },
    { label: "Open", value: r.open.toLocaleString(), tone: r.overdue > 0 ? `${r.overdue} overdue` : null },
    { label: "Signed value", value: r.signed ? formatCompact(r.signed, r.currency) : "—" },
    { label: "Pipeline", value: r.pipeline ? formatCompact(r.pipeline, r.currency) : "—" },
  ];

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={`Profile: ${r.name}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[30rem] flex-col border-l border-border bg-background shadow-[0_0_48px_-16px_rgba(10,13,20,0.28)] outline-none lg:top-16"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <button type="button" onClick={onClose} aria-label="Close profile" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-foreground">
          <ChevronsRight size={17} aria-hidden />
        </button>
        <Button asChild size="sm"><Link href={listHref}>See all in Contracts</Link></Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <p className="text-sm text-[var(--ink-600)]">{r.relationship}</p>
        <h2 className="mt-1 text-xl font-semibold leading-snug tracking-tight text-foreground">{r.name}</h2>
        <p className="mt-1.5 text-sm text-[var(--ink-600)]">Last activity {shortDate(r.lastActivity)}</p>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {figures.map((f) => (
            <div key={f.label} className="bg-card px-4 py-3">
              <dt className="text-xs text-[var(--ink-600)]">{f.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{f.value}</dd>
              {f.tone && <dd className="text-xs font-medium text-[var(--danger)]">{f.tone}</dd>}
            </div>
          ))}
        </dl>

        {people.size > 0 && (
          <section aria-labelledby="cp-people" className="mt-8">
            <h3 id="cp-people" className="text-base font-semibold text-foreground">Your people on their agreements</h3>
            <AvatarStack people={[...people.values()]} max={8} className="mt-3" />
          </section>
        )}

        <section aria-labelledby="cp-contracts" className="mt-8">
          <h3 id="cp-contracts" className="flex items-baseline gap-2 text-base font-semibold text-foreground">
            Agreements <span className="text-sm font-medium text-[var(--ink-500)]">{plural(r.contracts.length, "agreement")}</span>
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {sorted.map((c) => (
              <li key={c.contractId}>
                <Link href={`/contracts/${encodeURIComponent(c.contractId)}`} className={cn("flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-[var(--ink-300)]", c.slaStatus === "red" && c.state !== "signed" && c.state !== "active" ? "border-[color-mix(in_srgb,var(--danger)_35%,var(--border))]" : "border-border")}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{c.title || "Untitled agreement"}</span>
                    <span className="block text-xs text-[var(--ink-600)]">{AGREEMENT_TYPE_LABEL[c.agreementType]} · {contractValueText(c)}</span>
                  </span>
                  <StageDots contract={c} className="shrink-0 items-end" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
