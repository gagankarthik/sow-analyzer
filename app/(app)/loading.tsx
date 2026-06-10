import { SonarMark } from "@/components/ui/SonarMark";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5">
      <SonarMark size="lg" tile pulse />
      <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-1/3 rounded-full bar-indeterminate bg-[var(--brand-primary-600)]" />
      </div>
      <p className="text-[12.5px] text-muted-foreground">Loading your workspace…</p>
    </div>
  );
}
