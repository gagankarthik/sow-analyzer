import { CaptureSkeleton, ReportPageSkeleton } from "../_components/ReportSkeletons";

export default function CaptureLoading() {
  return (
    <ReportPageSkeleton title="Data capture">
      <CaptureSkeleton />
    </ReportPageSkeleton>
  );
}
