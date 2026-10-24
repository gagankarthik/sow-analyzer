"use client";

// The Contracts list before its first data: the one header row, then the
// list layout's rows (checkbox slot, title bar, chip placeholders). Used by
// the route's loading.tsx and the page's Suspense fallback, so a navigation
// shows the list's shape at once.

import { SkeletonRegion } from "@/components/ds/skeletons";
import { ListHeaderSkeleton } from "@/components/ds/ListHeader";
import { ListSkeleton } from "./ContractList";

export function ContractsListSkeleton() {
  return (
    <SkeletonRegion label="contracts" className="flex flex-col">
      <ListHeaderSkeleton title="Contracts" />
      <ListSkeleton density="comfortable" />
    </SkeletonRegion>
  );
}
