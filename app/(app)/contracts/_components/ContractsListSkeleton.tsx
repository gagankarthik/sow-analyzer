"use client";

// The Contracts list before its first data: the same title row, view tabs,
// §9 toolbar, flat table (the default visible columns) and totals footer,
// box for box. Used by the route's loading.tsx and the page's Suspense
// fallback, so a navigation shows the list's shape at once.

import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonRegion, TableFooterSkeleton, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton,
} from "@/components/ds/skeletons";
import { CONTRACT_LIST_COLUMNS, CONTRACT_LIST_DEFAULT_HIDDEN } from "@/components/govern/contract-list-columns";
import { DEFAULT_VIEWS } from "@/lib/govern/list-views";

const VISIBLE = CONTRACT_LIST_COLUMNS.filter((c) => c.card === "title" || !CONTRACT_LIST_DEFAULT_HIDDEN.includes(c.id));

export function ContractsListSkeleton() {
  return (
    <SkeletonRegion label="contracts" className="app-container flex flex-col gap-3 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-baseline gap-2 text-[18px] leading-tight font-medium text-[var(--ink-900)] md:text-[20px]">
          Contracts
          <Skeleton className="h-3.5 w-8 self-center" />
        </h1>
        <div aria-hidden className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <ViewTabsSkeleton labels={DEFAULT_VIEWS.map((v) => v.label)} />
      <div className="flex min-w-0 flex-col gap-3">
        <ToolbarSkeleton filters={4} actions={3} layoutSwitch />
        <TableSkeleton columns={VISIBLE} rows={12} leading={["w-10"]} trailing={["w-10"]} />
        <TableFooterSkeleton />
      </div>
    </SkeletonRegion>
  );
}
