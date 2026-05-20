import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

const levelToCount: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const levelToColor: Record<RiskLevel, string> = {
  low: "bg-[color:var(--ink-300)]",
  medium: "bg-[color:var(--warning)]",
  high: "bg-[color:var(--risk-3)]",
  critical: "bg-[color:var(--danger)]",
};

const labels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

type Props = {
  level: RiskLevel;
  showLabel?: boolean;
  className?: string;
};

export function RiskDots({ level, showLabel = true, className }: Props) {
  const count = levelToCount[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex gap-0.5" title={`Risk: ${labels[level]}`}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i <= count ? levelToColor[level] : "bg-[color:var(--ink-100)]",
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-[11px] font-medium text-[color:var(--ink-600)]">
          {labels[level]}
        </span>
      )}
    </span>
  );
}
