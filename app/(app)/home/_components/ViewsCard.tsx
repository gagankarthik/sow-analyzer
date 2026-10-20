"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS } from "@/lib/govern/views";
import { cn } from "@/lib/utils";
import { ListPanel } from "@/components/ds/Panel";
import { Skeleton } from "@/components/ui/skeleton";

const NUMBER = new Intl.NumberFormat("en-US");

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
    <ListPanel
      as="h2"
      title="Your views"
      aria-busy={isLoading || undefined}
      actions={<Link href="/contracts?view=all" className="text-sm font-medium text-[var(--brand-primary-700)] hover:underline underline-offset-4">All contracts</Link>}
    >
      <ul>
        {rows.map(({ view, count }) => (
          <li key={view.id}>
            <Link
              href={`/contracts?view=${view.id}`}
              className="group flex h-9 min-w-0 items-center justify-between gap-3 px-4 text-sm text-[var(--ink-700)] transition-colors duration-150 hover:bg-[var(--ink-50)] hover:text-foreground max-md:h-11"
            >
              <span className="min-w-0 truncate">{view.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={cn("tabular-nums", count > 0 ? "font-semibold text-foreground" : "text-[var(--ink-500)]")}>
                  {isLoading ? <Skeleton className="inline-block h-3 w-5 align-middle" /> : NUMBER.format(count)}
                </span>
                <ChevronRight size={16} aria-hidden className="text-[var(--ink-400)] rtl:rotate-180" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ListPanel>
  );
}
