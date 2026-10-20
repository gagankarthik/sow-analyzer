"use client";

// The Workflow route before it renders: title row, the quick-view tabs with
// the Table / Board switch, the toolbar, the phase switch and the four lanes
// of the pre-signature phase with card placeholders.

import { PageTitleSkeleton, BoardSkeleton, SkeletonRegion, ToolbarSkeleton, ViewTabsSkeleton } from "@/components/ds/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { PRE_SIGNATURE_STAGES, STAGE_LABEL } from "@/lib/govern/labels";

const TABS = ["All open", "Assigned to me", "Needs a reviewer", "Past target", "With the other side"];

export function WorkflowSkeleton() {
  return (
    <SkeletonRegion label="the workflow">
      <PageTitleSkeleton title="Workflow" count actions={1} />
      <div className="app-container app-page">
        <div className="flex min-w-0 flex-col gap-3">
          <ViewTabsSkeleton labels={TABS} layoutSwitch />
          <ToolbarSkeleton filters={3} actions={0} />
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="hidden h-8 w-72 rounded-lg xl:block" />
            <BoardSkeleton stages={PRE_SIGNATURE_STAGES.map((s) => STAGE_LABEL[s])} cards={2} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
