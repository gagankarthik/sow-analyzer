"use client";

// The Library before its data: title + count, view tabs, toolbar and the
// flat documents table with the page's columns.

import { byEdition } from "@/lib/edition-runtime";
import {
  PageTitleSkeleton, SkeletonRegion, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton, type SkeletonColumn,
} from "@/components/ds/skeletons";

const TABS = ["All documents", "Ready", "Analyzing", "Failed"];

function columns(): SkeletonColumn[] {
  return [
    { id: "title", header: "Title", card: "title", className: "min-w-[14rem]", sortable: true },
    { id: "project", header: byEdition("Project", "Engagement"), priority: 2, sortable: true },
    { id: "type", header: "Type", sortable: true },
    { id: "lifecycle", header: "Stage", card: "status", sortable: true },
    { id: "status", header: "Status", sortable: true },
    { id: "parties", header: "Parties", numeric: true, priority: 3, sortable: true },
    { id: "version", header: "Version", numeric: true, priority: 3, sortable: true },
    { id: "created", header: "Created", sortable: true },
  ];
}

export function LibrarySkeleton() {
  return (
    <SkeletonRegion label="documents">
      <PageTitleSkeleton title="Library" count actions={1} meta={<ViewTabsSkeleton labels={TABS} />} />
      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        <ToolbarSkeleton filters={3} actions={1} />
        <TableSkeleton columns={columns()} rows={12} trailing={["w-12"]} />
      </div>
    </SkeletonRegion>
  );
}
