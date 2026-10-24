import { Skeleton } from "@/components/ui/skeleton";

/** The envelope workbench's shape while it loads: header, side column, one page. */
export function WorkbenchSkeleton() {
  return (
    <div role="status" aria-label="Loading the signing request" className="app-container flex flex-col gap-5 py-5">
      <div className="flex flex-col gap-2 border-b border-border-default pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="aspect-[612/792] w-full max-w-3xl" />
      </div>
    </div>
  );
}
