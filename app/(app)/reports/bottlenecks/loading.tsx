import { BottlenecksSkeleton, ReportPageSkeleton } from "../_components/ReportSkeletons";

export default function BottlenecksLoading() {
  return (
    <ReportPageSkeleton title="Bottlenecks">
      <BottlenecksSkeleton />
    </ReportPageSkeleton>
  );
}
