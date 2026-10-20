import { cn } from "@/lib/utils"

/**
 * One placeholder block: slate panel tint (#F1F5F9), 6px radius, a calm
 * opacity pulse that stops under prefers-reduced-motion. Decorative: the
 * region it sits in carries aria-busy and the spoken "Loading …" status
 * (see components/ds/skeletons.tsx).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  // A block <span>, so it is valid inside buttons, links and other phrasing content.
  return (
    <span
      data-slot="skeleton"
      aria-hidden
      className={cn("block animate-skeleton rounded-[6px] bg-surface-sunken motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
