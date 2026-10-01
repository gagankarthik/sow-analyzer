import { SonarIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const ICON_PX: Record<Size, number> = { xs: 14, sm: 18, md: 24, lg: 32, xl: 44 };

const TILE_ICON_PX: Record<Size, number> = { xs: 12, sm: 16, md: 20, lg: 28, xl: 36 };

const TILE: Record<Size, string> = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

type Props = {
  size?: Size;
  /** Sit the mark on a brand-tinted tile (for use on white cards). */
  tile?: boolean;
  className?: string;
};

/**
 * Sonar, the Blue-IQ assistant. This is the only mark Sonar uses: the same
 * drawing as the `Sonar` icon, in brand blue. Decorative by default; the
 * surrounding text names Sonar.
 */
export function SonarMark({ size = "md", tile = false, className }: Props) {
  const px = tile ? TILE_ICON_PX[size] : ICON_PX[size];
  // Small sizes get a heavier stroke so the rings stay legible.
  const icon = <SonarIcon size={px} strokeWidth={px < 24 ? 2 : 1.75} />;

  if (!tile) {
    return <span className={cn("inline-flex shrink-0 text-[var(--brand-primary-600)]", className)}>{icon}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
        TILE[size],
        className,
      )}
    >
      {icon}
    </span>
  );
}
