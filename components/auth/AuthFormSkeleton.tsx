// An auth form before its search params resolve: the real heading, then
// labelled 48px fields and the full-width submit pill, at the form's own
// spacing, so the page does not jump when the form mounts.

import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

export function AuthFormSkeleton({ title, fields = 2 }: { title: string; fields?: number }) {
  return (
    <SkeletonRegion label="the form">
      <div className="mb-6 [@media(min-height:820px)]:mb-8">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">{title}</h1>
        <span aria-hidden className="mt-3 block">
          <SkeletonLine text="text-base leading-relaxed" width="w-full" />
          <SkeletonLine text="text-base leading-relaxed" width="w-2/3" />
        </span>
      </div>
      <div aria-hidden>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            <SkeletonLine text="text-sm font-medium" width="w-16" className="mb-1.5" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <span className="mt-1.5 block min-h-5" />
          </div>
        ))}
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>
    </SkeletonRegion>
  );
}
