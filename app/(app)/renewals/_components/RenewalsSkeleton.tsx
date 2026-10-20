// The Renewals list before its data: title + count, the view tabs, four
// tiles, the toolbar and the flat table with the page's columns.

import {
  PageTitleSkeleton, SkeletonRegion, SummaryTilesSkeleton, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton, type SkeletonColumn,
} from "@/components/ds/skeletons";

const TABS = ["All dates", "Up for renewal", "Upcoming", "Due date passed", "Expired"];

const RENEWAL_COLUMNS: SkeletonColumn[] = [
  { id: "doc", header: "Document", card: "title", className: "min-w-[14rem]", sortable: true },
  { id: "date", header: "Date", className: "w-56", sortable: true },
  { id: "status", header: "Status", card: "status", sortable: true },
  { id: "when", header: "When", className: "w-32", sortable: true },
  { id: "value", header: "Value", numeric: true, priority: 2, sortable: true },
];

/** The page before its data: title + count, view tabs, tiles, toolbar, table. */
export function RenewalsSkeleton() {
  return (
    <SkeletonRegion label="renewals">
      <PageTitleSkeleton title="Renewals" count actions={0} meta={<ViewTabsSkeleton labels={TABS} />} />
      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        <SummaryTilesSkeleton labels={["Due in 90 days", "Up for renewal", "Expired", "Value listed"]} />
        <ToolbarSkeleton filters={2} actions={1} />
        <TableSkeleton columns={RENEWAL_COLUMNS} rows={12} />
      </div>
    </SkeletonRegion>
  );
}
