"use client";

// The Contracts list before its first data: the same title row, view tabs
// with the Table / Board switch, filter row, flat table and totals footer,
// box for box. Used by the route's loading.tsx and the page's Suspense
// fallback, so a navigation shows the list's shape at once.

import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonRegion, TableFooterSkeleton, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton,
} from "@/components/ds/skeletons";
import { CONTRACT_LIST_COLUMNS } from "@/components/govern/contract-list-columns";
import { LIST_TABS } from "@/lib/govern/list-views";

export function ContractsListSkeleton() {
  return (
    <SkeletonRegion label="contracts" className="app-container flex flex-col gap-3 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Contracts</h1>
        <Skeleton aria-hidden className="h-9 w-36" />
      </div>
      <ViewTabsSkeleton labels={LIST_TABS.map((v) => v.label)} layoutSwitch />
      <div className="flex min-w-0 flex-col gap-3">
        <ToolbarSkeleton filters={3} filtersAlways actions={0} />
        <TableSkeleton columns={CONTRACT_LIST_COLUMNS} rows={12} leading={["w-10"]} />
        <TableFooterSkeleton />
      </div>
    </SkeletonRegion>
  );
}
