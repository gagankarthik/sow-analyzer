// The contract page before its data: the header band (back link, title and
// party, the action, five facts, the stage bar, the tabs), then issue cards
// beside the right rail. Used by the route's loading.tsx and the page's own
// first load.

import { Skeleton } from "@/components/ui/skeleton";
import { PanelSkeleton, SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

const TABS = ["Issues", "Overview", "Matrix", "Activity", "Rounds", "Money", "Details"];

export function ContractRecordSkeleton() {
  return (
    <SkeletonRegion label="contract">
      <div aria-hidden className="border-b border-[var(--ink-200)] bg-card">
        <div className="app-container flex flex-col gap-5 pt-5">
          <span className="text-body font-semibold text-[var(--brand-primary-700)]">Contracts</span>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <SkeletonLine text="text-2xl font-semibold" width="w-[min(28rem,80%)]" />
              <SkeletonLine text="text-base" width="w-48" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <SkeletonLine text="text-caption" width="w-16" />
                <SkeletonLine text="text-base font-semibold" width={i % 2 ? "w-28" : "w-20"} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <span className="h-1.5 rounded-full bg-[var(--ink-200)]" />
                <SkeletonLine text="text-caption" width="w-16" />
              </div>
            ))}
          </div>
          <div className="flex gap-6 overflow-hidden">
            {TABS.map((t, i) => (
              <span
                key={t}
                className={
                  "inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-body font-semibold " +
                  (i === 0 ? "border-[var(--brand-primary-800)] text-[var(--brand-primary-800)]" : "border-transparent text-[var(--ink-600)]")
                }
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[var(--ink-50)]">
        <div className="app-container grid grid-cols-1 items-start gap-6 py-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
            <SkeletonLine text="text-base font-semibold" width="w-64" />
            {[0, 1].map((i) => <IssueCardSkeleton key={i} />)}
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <PanelSkeleton title="Sign-offs" rows={3} />
            <PanelSkeleton title="Latest activity" rows={3} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

function IssueCardSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-[var(--ink-200)] bg-card">
      <div className="flex justify-between border-b border-[var(--ink-100)] px-5 py-3.5">
        <SkeletonLine text="text-base" width="w-40" />
        <SkeletonLine text="text-body" width="w-20" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1.5 px-5 py-4">
            <SkeletonLine text="text-caption" width="w-24" />
            <SkeletonLine text="text-base" width="w-full" />
            <SkeletonLine text="text-base" width="w-3/4" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 border-t border-[var(--ink-100)] px-5 py-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/** A lazily loaded tab: a titled panel of rows, the common tab shape. */
export function SectionSkeleton() {
  return <PanelSkeleton label="section" rows={5} footer />;
}
