import { cn } from "@/lib/utils";

type Props = {
  level: 1 | 2 | 3 | 4;
  className?: string;
  showLabel?: boolean;
};

const labelMap = {
  1: "Low",
  2: "Fair",
  3: "Good",
  4: "Strong",
} as const;

export function ConfidenceDots({ level, className, showLabel = false }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        className,
      )}
      title={`AI confidence: ${labelMap[level]}`}
    >
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i <= level
                ? "bg-[color:var(--ai-ink)]"
                : "bg-[color:var(--ink-200)]",
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-[11px] text-[color:var(--ink-500)] tracking-wide">
          {labelMap[level]}
        </span>
      )}
    </span>
  );
}
