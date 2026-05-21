import Image from "next/image";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 44,
};

type Props = {
  size?: Size | number;
  /** Show a subtle pulsing dot in the corner (for "live" states). */
  pulse?: boolean;
  /** Wrap the icon in a tinted tile (good on light backgrounds). */
  tile?: boolean;
  className?: string;
};

/**
 * Bluey — the AI assistant brand mark.
 * Use this anywhere AI-generated content or insights appear.
 * Renders /public/logo-icon.svg at the requested size, with optional tile + pulse.
 */
export function BlueyMark({
  size = "md",
  pulse = false,
  tile = false,
  className,
}: Props) {
  const px = typeof size === "number" ? size : SIZES[size];
  const inner = (
    <Image
      src="/logo-icon.svg"
      alt=""
      width={px}
      height={px}
      priority
      className="select-none pointer-events-none"
      style={{ display: "block", width: px, height: px }}
    />
  );

  if (tile) {
    const tileSize = Math.round(px * 1.5);
    return (
      <span
        aria-label="Bluey"
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg bg-[var(--ai-surface)] ring-1 ring-[var(--ai-border)] shrink-0",
          className,
        )}
        style={{ width: tileSize, height: tileSize }}
      >
        {inner}
        {pulse && (
          <span className="ai-pulse absolute -top-0.5 -right-0.5 ring-2 ring-card" />
        )}
      </span>
    );
  }

  return (
    <span
      aria-label="Bluey"
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {inner}
      {pulse && (
        <span className="ai-pulse absolute -top-0.5 -right-0.5 ring-2 ring-card" />
      )}
    </span>
  );
}
