"use client";

// The Projects (Engagements) list before its data. `ProjectsBodySkeleton` is
// the part under the title row (toolbar + table, or the card grid), used by
// the page itself while the list loads; `ProjectsSkeleton` adds the title
// row and view tabs for the route's loading.tsx and Suspense fallback.

import { byEdition } from "@/lib/edition-runtime";
import { useEditionTerms } from "@/lib/govern/queries";
import {
  BoardCardSkeleton, PageTitleSkeleton, SkeletonRegion, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton,
  type SkeletonColumn,
} from "@/components/ds/skeletons";

const TABS = ["All", "Needs attention", "Active or signed", "Renews or ends in 90 days", "Expired"];

/** Mirrors the page's DataTable columns (header, width, priority). */
export function projectSkeletonColumns(): SkeletonColumn[] {
  return [
    { id: "name", header: byEdition("Project", "Engagement"), card: "title", className: "min-w-[14rem]", sortable: true },
    { id: "status", header: "Status", card: "status", sortable: true },
    { id: "risk", header: "Risk", sortable: true },
    { id: "highRisk", header: "High-risk", numeric: true, priority: 2, sortable: true },
    { id: "docCount", header: "Docs", numeric: true, priority: 2, sortable: true },
    { id: "value", header: "Value", numeric: true, sortable: true },
    { id: "change", header: "Change", numeric: true, priority: 3, sortable: true },
    { id: "data", header: "Data", priority: 3 },
    { id: "date", header: "Renewal or term end", priority: 2, sortable: true },
    { id: "attention", header: "Attention", priority: 2 },
  ];
}

export function ProjectsBodySkeleton({ layout = "table", columns }: { layout?: "table" | "grid"; columns?: SkeletonColumn[] }) {
  return (
    <SkeletonRegion label={byEdition("projects", "engagements")} className="flex min-w-0 flex-col gap-3">
      <ToolbarSkeleton filters={2} actions={1} />
      {layout === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <BoardCardSkeleton key={i} className="p-4" />)}
        </div>
      ) : (
        <TableSkeleton columns={columns ?? projectSkeletonColumns()} rows={12} />
      )}
    </SkeletonRegion>
  );
}

export function ProjectsSkeleton() {
  const terms = useEditionTerms();
  return (
    <>
      <PageTitleSkeleton title={terms.projects} count actions={1} meta={<ViewTabsSkeleton labels={TABS} />} />
      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        <ProjectsBodySkeleton />
      </div>
    </>
  );
}
