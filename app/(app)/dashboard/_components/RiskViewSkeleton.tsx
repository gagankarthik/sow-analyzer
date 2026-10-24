// The "Risk and documents" view before its data, block for block: the
// focal value-at-risk band, six metric cards (three across), the risk
// intelligence band, then the heatmap beside value by year. In its own file
// so the home can show it while the RiskView chunk itself downloads.

import {
  ChartSkeleton, PanelSkeleton, SkeletonLine, SkeletonRegion,
} from "@/components/ds/skeletons";

export function RiskViewSkeleton({ label }: { label?: string }) {
  const body = (
    <div className="flex flex-col gap-6">
      {/* Value at risk */}
      <div aria-hidden className="grid min-h-[188px] grid-cols-1 gap-6 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-end lg:gap-10">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-base font-semibold text-foreground">Value at risk</span>
          <SkeletonLine text="text-4xl font-semibold" width="w-40" className="mt-2" />
          <SkeletonLine text="text-sm" width="w-64" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {[0, 1, 2].map((i) => <SkeletonLine key={i} text="text-sm" width={i === 2 ? "w-3/5" : "w-full"} />)}
        </div>
      </div>
      {/* Six metric cards */}
      <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex min-h-[112px] flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <SkeletonLine text="text-xs font-medium" width="w-36" />
            <SkeletonLine text="text-2xl font-semibold" width={i % 2 ? "w-24" : "w-12"} className="mt-1" />
            <SkeletonLine text="text-xs" width="w-4/5" />
          </div>
        ))}
      </div>
      <PanelSkeleton title="Risk intelligence" padded actions={false}>
        <ChartSkeleton height="h-40" bars={5} />
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
        <PanelSkeleton title="Risk by category" className="lg:col-span-7" padded actions={false}>
          <ChartSkeleton height="h-48" bars={8} />
        </PanelSkeleton>
        <PanelSkeleton title="Value and exposure by year" className="lg:col-span-5" padded actions={false}>
          <ChartSkeleton height="h-48" bars={6} />
        </PanelSkeleton>
      </div>
    </div>
  );
  return label ? <SkeletonRegion label={label}>{body}</SkeletonRegion> : body;
}
