import { ReportPageSkeleton, ValueReportSkeleton } from "../_components/ReportSkeletons";

export default function ValueReportLoading() {
  return (
    <ReportPageSkeleton title="Value">
      <ValueReportSkeleton />
    </ReportPageSkeleton>
  );
}
