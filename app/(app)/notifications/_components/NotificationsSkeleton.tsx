// Notifications before they load: a day-bucket header and 52px rows (icon,
// title + time, type · body), exactly the loaded list's geometry.
// `NotificationsPageSkeleton` adds the title row and toolbar for the route.

import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTitleSkeleton, SkeletonLine, SkeletonRegion, ToolbarSkeleton,
} from "@/components/ds/skeletons";

export function NotificationListSkeleton({ rows = 6, label }: { rows?: number; label?: string }) {
  const list = (
    <div aria-hidden className="border-y border-border">
      <div className="flex h-8 items-center border-b border-border bg-[var(--panel)] px-4">
        <Skeleton className="h-2.5 w-14 bg-surface-raised" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex min-h-[52px] items-start gap-3 px-4 py-2.5">
            <span className="mt-0.5 flex w-4 shrink-0 justify-center"><Skeleton className="size-4 rounded-[4px]" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-3">
                <SkeletonLine text="text-sm" width={["w-3/5", "w-2/5", "w-1/2", "w-2/3"][i % 4]} className="flex-1" />
                <SkeletonLine text="text-xs" width="w-10" className="shrink-0" />
              </div>
              <SkeletonLine text="text-xs" width={["w-4/5", "w-3/5", "w-2/3", "w-1/2"][i % 4]} className="mt-0.5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
  return label ? <SkeletonRegion label={label}>{list}</SkeletonRegion> : list;
}

export function NotificationsPageSkeleton() {
  return (
    <SkeletonRegion label="notifications">
      <PageTitleSkeleton title="Notifications" count actions={1} />
      <div className="app-container app-page gap-3">
        <div className="flex max-w-[880px] flex-col gap-3">
          <ToolbarSkeleton search={false} filters={2} filtersAlways more={false} actions={0} />
          <NotificationListSkeleton rows={8} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
