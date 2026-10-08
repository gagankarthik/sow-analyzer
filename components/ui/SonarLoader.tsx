import { cn } from "@/lib/utils";

/**
 * The Blue-IQ loader: Sonar's spark with its waves pulsing outward, the way
 * the mark reads at rest. Used for page and panel loads; buttons use the
 * small spinner. Still (spark and waves shown) when reduced motion is on.
 */
export function SonarLoader({ label = "Loading…", size = 56, className }: { label?: string; size?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-4", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--brand-primary-600)]">
        <path
          d="M8 11.25c.55 2.6 1.6 3.65 4.2 4.2-2.6.55-3.65 1.6-4.2 4.2-.55-2.6-1.6-3.65-4.2-4.2 2.6-.55 3.65-1.6 4.2-4.2Z"
          fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
          className="sonar-spark"
        />
        <path d="M8 7.75a7.7 7.7 0 0 1 7.7 7.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="sonar-wave sonar-wave-1" />
        <path d="M8 3.75a11.7 11.7 0 0 1 11.7 11.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="sonar-wave sonar-wave-2" />
      </svg>
      <p className="text-sm font-medium text-[var(--ink-600)]">{label}</p>
    </div>
  );
}
