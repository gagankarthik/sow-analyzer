"use client";

// The Workflow route before it renders: title row, the shared view tabs with
// the Table / Board switch, the filter row, the phase switch and the four
// lanes of the pre-signature phase with card placeholders.

import { SkeletonRegion, ToolbarSkeleton, ViewTabsSkeleton } from "@/components/ds/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { LIST_TABS } from "@/lib/govern/list-views";
import { BoardLanesSkeleton } from "./StageLane";

export function WorkflowSkeleton() {
  return (
    <SkeletonRegion label="the workflow" className="app-container flex flex-col gap-3 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em] text-[var(--ink-900)]">Workflow</h1>
        <Skeleton aria-hidden className="h-9 w-36" />
      </div>
      <ViewTabsSkeleton labels={LIST_TABS.map((t) => t.label)} layoutSwitch />
      <ToolbarSkeleton filters={3} actions={0} />
      <Skeleton aria-hidden className="h-9 w-80" />
      <BoardLanesSkeleton />
    </SkeletonRegion>
  );
}
