import { PageSkeleton } from "@/components/ds/skeletons";

// The fallback for workspace routes without a loading shape of their own:
// a title row and panels inside the app shell (no full-page spinner).
export default function Loading() {
  return <PageSkeleton />;
}
