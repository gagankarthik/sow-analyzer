// The contract record page before its data (UI_SPEC section 8): header band
// (breadcrumb, H1 + "Contract", highlights), the path with guidance, the
// center tab strip with the Overview panels, and the 320px sidebar. Used
// by the route's loading.tsx and the page's own first load.

import { Skeleton } from "@/components/ui/skeleton";
import {
  PanelSkeleton, PathSkeleton, RecordHeaderSkeleton, RecordSidebarSkeleton, SkeletonLine, SkeletonRegion,
} from "@/components/ds/skeletons";

const TABS = ["Overview", "Activity", "Matrix", "Blockers", "Rounds", "Money", "Details"];

export function ContractRecordSkeleton() {
  return (
    <SkeletonRegion label="contract">
      <RecordHeaderSkeleton objectTag="Contract" actions={3} />
      <div className="app-container flex flex-col gap-6 py-6">
        {/* Read, Review, Signature, Signed: the path every contract has (office approvals add one only when routed). */}
        <PathSkeleton steps={4} />
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ContractTabsSkeleton />
            <OverviewSkeleton />
          </div>
          <RecordSidebarSkeleton className="lg:sticky lg:top-20" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** The center tab strip (ContractTabList geometry) with the real tab names. */
function ContractTabsSkeleton() {
  return (
    <div aria-hidden className="scrollbar-none flex min-w-0 flex-nowrap gap-1 overflow-hidden border-b border-border-default">
      {TABS.map((t, i) => (
        <span
          key={t}
          className={
            "-mb-px inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium max-md:h-11 " +
            (i === 0 ? "border-[var(--brand-primary-600)] text-fg-primary" : "border-transparent text-fg-secondary")
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/** The Overview tab: Matrix result (figures, tier bar, legend) beside Open blockers. */
export function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <PanelSkeleton title="Matrix result" padded>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {[0, 1].map((i) => (
              <div key={i}>
                <SkeletonLine text="text-caption" width="w-14" />
                <SkeletonLine text="text-2xl font-semibold" width="w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2.5 w-full rounded-pill" />
          <div className="flex flex-wrap gap-3">
            {[0, 1, 2, 3].map((i) => <SkeletonLine key={i} text="text-caption" width="w-20" />)}
          </div>
        </div>
      </PanelSkeleton>
      <PanelSkeleton title="Open blockers" rows={3} />
    </div>
  );
}

/** A lazily loaded record tab: a titled panel of rows, the common tab shape. */
export function SectionSkeleton() {
  return <PanelSkeleton label="section" rows={5} footer />;
}
