import { PageSkeleton } from "@/components/ds/skeletons";

// The upload form's shape (not the projects list above it).
export default function UploadLoading() {
  return <PageSkeleton title="Upload a contract" layout="form" label="the upload form" />;
}
