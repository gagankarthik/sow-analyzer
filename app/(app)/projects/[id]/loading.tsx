import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="border-b border-border bg-card">
        <div className="app-container pt-6 md:pt-8 pb-5 md:pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-5 gap-6 pt-4 border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="border-b border-border bg-card">
        <div className="app-container">
          <div className="flex items-center gap-6 h-9">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-16" />
            ))}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="app-container py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}
