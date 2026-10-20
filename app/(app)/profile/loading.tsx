import { PageSkeleton } from "@/components/ds/skeletons";

// Instant shell while Profile loads: its title and form panels.
export default function ProfileLoading() {
  return <PageSkeleton title="Profile" layout="form" label="your profile" />;
}
