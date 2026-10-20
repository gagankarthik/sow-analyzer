// Insights before its data. LeadershipSkeleton and DocumentInsightsSkeleton
// mirror each view's blocks (with their real panel titles); InsightsSkeleton
// adds the title row and view tabs for the route and the Suspense fallback.
// In their own file so the Documents view can show its shape while its
// (charting) chunk downloads.

import {
  ChartSkeleton, PageTitleSkeleton, PanelRowsSkeleton, PanelSkeleton, SkeletonLine, SkeletonRegion, SkeletonText,
  SummaryTilesSkeleton, ToolbarSkeleton,
} from "@/components/ds/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const LEADERSHIP_TILES = ["Signed, last 3 months", "Days to signature", "Pipeline value", "Obligations, next 3 months"];

/** Rows of label · bar · figure (the value bars and risk rows). */
function BarRows({ rows }: { rows: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3">
          <SkeletonLine text="text-sm" width="w-24" />
          <Skeleton className={["h-2.5 w-[82%]", "h-2.5 w-[64%]", "h-2.5 w-[46%]", "h-2.5 w-[30%]", "h-2.5 w-[18%]"][i % 5]} />
          <SkeletonLine text="text-sm" width="w-10" />
        </li>
      ))}
    </ul>
  );
}

export function LeadershipSkeleton() {
  return (
    <SkeletonRegion label="leadership insights" className="flex flex-col gap-6">
      <SummaryTilesSkeleton labels={LEADERSHIP_TILES} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <PanelSkeleton title="Value by agreement type" className="lg:col-span-7" padded>
          <BarRows rows={5} />
        </PanelSkeleton>
        <PanelSkeleton title="Largest counterparties" className="lg:col-span-5" row="key-value" rows={5} actions={false} />
      </div>
      <PanelSkeleton title="Team workload" rows={4} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <PanelSkeleton title="Risk in open contracts" padded actions={false}>
          <BarRows rows={4} />
        </PanelSkeleton>
        <PanelSkeleton title="Commitments coming due" padded>
          <BarRows rows={3} />
        </PanelSkeleton>
      </div>
    </SkeletonRegion>
  );
}

export function DocumentInsightsSkeleton() {
  return (
    <SkeletonRegion label="document insights" className="flex flex-col gap-6">
      <ToolbarSkeleton search={false} filters={2} filtersAlways more={false} actions={0} />
      <div aria-hidden className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <SkeletonLine text="text-base font-semibold" width="w-48" className="mb-1" />
          <SkeletonText lines={2} />
        </div>
      </div>
      <PanelSkeleton title="Needs attention" actions={false}>
        <PanelRowsSkeleton rows={6} />
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelSkeleton title="Risk by category" padded actions={false}><ChartSkeleton height="h-56" /></PanelSkeleton>
        <PanelSkeleton title="Key findings" rows={4} actions={false} />
      </div>
    </SkeletonRegion>
  );
}

export function InsightsSkeleton({ view = "leadership" }: { view?: "leadership" | "documents" }) {
  return (
    <>
      <PageTitleSkeleton title="Insights" actions={0} />
      <div className="app-container app-page">
        <div aria-hidden className="scrollbar-none flex gap-6 overflow-hidden border-b border-border">
          {["Leadership", "Documents"].map((t) => {
            const on = t.toLowerCase() === view;
            return (
              <span
                key={t}
                className={
                  "-mb-px inline-flex h-10 shrink-0 items-center border-b-2 text-sm font-medium whitespace-nowrap max-md:h-11 " +
                  (on ? "border-[var(--brand-primary-600)] font-semibold text-foreground" : "border-transparent text-[var(--ink-600)]")
                }
              >
                {t}
              </span>
            );
          })}
        </div>
        {view === "documents" ? <DocumentInsightsSkeleton /> : <LeadershipSkeleton />}
      </div>
    </>
  );
}
