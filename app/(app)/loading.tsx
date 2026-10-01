import { SonarMark } from "@/components/ui/SonarMark";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4">
      <SonarMark size="lg" tile />
      <div className="h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-[var(--ink-200)]" aria-hidden>
        <div className="bar-indeterminate h-full w-1/3 rounded-full bg-[var(--brand-primary-600)] motion-reduce:animate-none" />
      </div>
      <p className="text-sm font-medium text-[var(--ink-600)]">Loading your workspace…</p>
    </div>
  );
}
