"use client";

// The Activity tab (UI_SPEC section 8.3): a comment box, type filter chips,
// search, and the timeline. The contract carries its newest entries; "Show
// older" pages in the rest (GET /contracts/{id}/activity).

import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "@/components/ui/icons";
import { ActivityFeed, CommentBox } from "@/components/govern/ActivityFeed";
import { ACTIVITY_FILTERS, activityCounts, activityTotal, filterActivity, type ActivityFilter } from "@/lib/govern/activity";
import { useContractActivity } from "@/lib/govern/queries";
import type { ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

const NUMBER = new Intl.NumberFormat("en-US");

export function ActivityTab({ contract: c }: { contract: ContractDetail }) {
  const { entries, hasOlder, loadingOlder, error, loadOlder } = useContractActivity(c);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const shown = useMemo(() => filterActivity(entries, filter, query), [entries, filter, query]);
  const counts = useMemo(() => activityCounts(entries), [entries]);
  const total = activityTotal(c);
  const narrowed = filter !== "all" || query.trim() !== "";

  return (
    <section aria-label="Activity" className="flex flex-col gap-4">
      <CommentBox contractId={c.contractId} />

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Activity type" className="scrollbar-none flex min-w-0 gap-1.5 overflow-x-auto">
          {ACTIVITY_FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:h-11",
                  on ? "border-[var(--brand-primary-600)] bg-surface-raised text-fg-link" : "border-border-strong bg-surface-raised text-fg-secondary hover:text-fg-primary",
                )}
              >
                {f.label}<span className="tabular-nums text-fg-tertiary">{NUMBER.format(counts[f.id])}</span>
              </button>
            );
          })}
        </div>
        <label className="relative block md:max-w-60 xl:w-60 xl:shrink-0">
          <span className="sr-only">Search activity</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity" className="h-8 ps-8 max-md:h-11" />
        </label>
      </div>

      {narrowed && shown.length === 0 ? (
        <p className="rounded-container border border-dashed border-border-strong px-4 py-6 text-body text-fg-tertiary">
          No matching activity{hasOlder ? " in what is loaded" : ""}
        </p>
      ) : (
        <ActivityFeed entries={shown} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        {hasOlder && (
          <Button type="button" variant="outline" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder && <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />}
            Show older
          </Button>
        )}
        <span className="text-caption tabular-nums text-fg-tertiary">
          {NUMBER.format(entries.length)} of {total.label} loaded
        </span>
        {error && <span role="alert" className="text-caption text-[var(--danger)]">Couldn&rsquo;t load older activity. Try again.</span>}
      </div>
    </section>
  );
}
