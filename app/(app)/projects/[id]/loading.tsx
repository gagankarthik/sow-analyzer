import { ProjectRouteSkeleton } from "@/components/ProjectRecordSkeleton";

// Instant shell while a document (or project) record loads: the header band,
// its tabs with the right one active, and that sub-page's body shape.
export default function ProjectLoading() {
  return <ProjectRouteSkeleton />;
}
