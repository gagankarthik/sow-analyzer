import { SonarLoader } from "@/components/ui/SonarLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <SonarLoader label="Loading your workspace…" />
    </div>
  );
}
