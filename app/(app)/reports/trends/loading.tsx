import { Skeleton } from "@/components/ui/skeleton";
import { ReportPageSkeleton, TrendsSkeleton } from "../_components/ReportSkeletons";

export default function TrendsLoading() {
  return (
    <ReportPageSkeleton title="Trends">
      {/* The Month / Week switch. */}
      <Skeleton className="h-8 w-64" />
      <TrendsSkeleton />
    </ReportPageSkeleton>
  );
}
