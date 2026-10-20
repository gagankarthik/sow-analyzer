import { ReportPageSkeleton, ReportsIndexSkeleton } from "./_components/ReportSkeletons";

// Instant shell while Reports loads: the title and the four report cards.
export default function ReportsLoading() {
  return (
    <ReportPageSkeleton title="Reports" sub={false}>
      <ReportsIndexSkeleton />
    </ReportPageSkeleton>
  );
}
