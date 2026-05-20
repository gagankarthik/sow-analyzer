import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
};

export function KeyFigure({ label, value, delta, hint, className, size = "md" }: Props) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="eyebrow">{label}</div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "numeric h-display text-foreground leading-none",
            size === "lg" ? "text-[40px]" : "text-[30px]",
          )}
        >
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "text-[11px] font-medium tracking-tight",
              delta.direction === "up" && "text-[color:var(--success)]",
              delta.direction === "down" && "text-[color:var(--danger)]",
              delta.direction === "flat" && "text-muted-foreground",
            )}
          >
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•"} {delta.value}
          </span>
        )}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground tracking-wide leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}
