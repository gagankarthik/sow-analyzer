"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS } from "@/lib/govern/views";
import { cn } from "@/lib/utils";

/* Shortcuts into the Contracts dashboard: the views people open most, with
   the same live counts the dashboard's Views panel shows. */

const SHORTCUTS = ["mine", "unassigned", "overdue", "other-side", "renewals", "gaps"];

export function ViewsCard() {
  const { data, isLoading } = useContracts(true);
  const me = useGovernMe().data?.email?.toLowerCase() ?? null;
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const all = data?.contracts ?? [];
    return SHORTCUTS.map((id) => CONTRACT_VIEWS.find((v) => v.id === id)!).map((v) => ({
      view: v,
      count: all.filter((c) => v.test(c, { me, now })).length,
    }));
  }, [data, me, now]);

  return (
    <section aria-labelledby="views-card-title" className="rounded-xl border border-border bg-card shadow-xs">
      <header className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
        <h2 id="views-card-title" className="text-base font-semibold text-foreground">Your views</h2>
        <Link href="/contracts?view=all" className="text-sm font-medium text-[var(--brand-primary-700)] hover:underline">All contracts</Link>
      </header>
      <ul className="px-2 pb-2">
        {rows.map(({ view, count }) => (
          <li key={view.id}>
            <Link
              href={`/contracts?view=${view.id}`}
              className="group flex h-10 items-center justify-between gap-3 rounded-lg px-3 text-sm text-[var(--ink-700)] transition-colors hover:bg-[var(--ink-50)] hover:text-foreground"
            >
              <span className="truncate">{view.label}</span>
              <span className="flex items-center gap-2">
                <span className={cn("tabular-nums", count > 0 ? "font-semibold text-foreground" : "text-[var(--ink-500)]")}>
                  {isLoading ? "–" : count.toLocaleString()}
                </span>
                <ChevronRight size={14} aria-hidden className="text-[var(--ink-400)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
