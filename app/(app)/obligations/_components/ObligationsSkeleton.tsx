// The Obligations list before its data: title + count, the view tabs, four
// summary tiles, the toolbar and the flat table with the real columns.

import {
  PageTitleSkeleton, SkeletonRegion, SummaryTilesSkeleton, TableSkeleton, ToolbarSkeleton, ViewTabsSkeleton,
  type SkeletonColumn,
} from "@/components/ds/skeletons";
import { obligationViewById } from "@/lib/govern/obligation-views";

export const OBLIGATION_TILES = ["Overdue", "Due in 30 days", "Money due in 90 days", "Needs verification"];
const TABS = ["all", "overdue", "30", "90", "needs", "verified"].map((id) => obligationViewById(id).label);

/** Mirrors the page's DataTable columns (header, width, priority). */
const COLUMNS: SkeletonColumn[] = [
  { id: "title", header: "Obligation", card: "title", className: "min-w-[12rem]", sortable: true },
  { id: "due", header: "Due", className: "w-36", sortable: true },
  { id: "verified", header: "Verification", card: "status", sortable: true },
  { id: "contract", header: "Contract", priority: 2, sortable: true },
  { id: "amount", header: "Amount", priority: 2, numeric: true, sortable: true },
  { id: "owner", header: "Owner", priority: 2, sortable: true },
];

export function ObligationsSkeleton() {
  return (
    <SkeletonRegion label="obligations" className="min-w-0">
      <PageTitleSkeleton title="Obligations" count actions={0} meta={<ViewTabsSkeleton labels={TABS} />} />
      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        <SummaryTilesSkeleton labels={OBLIGATION_TILES} />
        <ToolbarSkeleton filters={2} actions={1} />
        <TableSkeleton columns={COLUMNS} rows={12} leading={["w-10"]} />
      </div>
    </SkeletonRegion>
  );
}
