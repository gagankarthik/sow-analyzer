import Image from "next/image";

/* Brand logo, used wherever the wordmark appears.
   Aspect ratio matches the /logo.svg viewBox (165.88 × 41). The SVG ships with
   no intrinsic width/height, so next/image needs the real ratio and the height
   prop drives the size. */
const LOGO_ASPECT = 165.88 / 41; // ≈ 4.05

export function Logo({
  height = 28,
  className,
  variant = "light",
  priority = false,
}: {
  height?: number;
  className?: string;
  variant?: "light" | "dark";
  /** Preload it. Only for the copy in the header, which is above the fold. */
  priority?: boolean;
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Blue-IQ"
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        preload={priority}
        className={`select-none ${variant === "dark" ? "brightness-0 invert" : ""}`}
      />
    </span>
  );
}
