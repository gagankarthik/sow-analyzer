import { PageSkeleton } from "@/components/ds/skeletons";

// The new-project form's shape (not the projects list above it).
export default function NewProjectLoading() {
  return <PageSkeleton layout="form" label="the form" />;
}
