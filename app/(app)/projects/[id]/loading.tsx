import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div>
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2 sm:w-1/3" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div>
        <div className="app-container">
          <div className="flex h-11 items-center gap-6 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-16 shrink-0" />
            ))}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="app-container space-y-4 py-6 md:space-y-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-40 rounded-xl lg:col-span-8" />
          <Skeleton className="h-40 rounded-xl lg:col-span-4" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}
