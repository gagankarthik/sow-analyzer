"use client";

// The Workflow route before it renders: the one header row, then the
// pre-signature columns with card placeholders.

import { ListHeaderSkeleton } from "@/components/ds/ListHeader";
import { SkeletonRegion } from "@/components/ds/skeletons";
import { BoardLanesSkeleton } from "./StageLane";

export function WorkflowSkeleton() {
  return (
    <SkeletonRegion label="the workflow" className="flex flex-col">
      <ListHeaderSkeleton title="Contracts" />
      <div className="app-container pt-4">
        <BoardLanesSkeleton />
      </div>
    </SkeletonRegion>
  );
}
