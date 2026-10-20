import Image from "next/image";

/* Brand logo, used wherever the wordmark appears.
   Aspect ratio matches the /logo.svg viewBox (283.40 × 73.86). The SVG ships with
   no intrinsic width/height, so next/image needs the real ratio and the height
   prop drives the size. On a dark surface the brand's own on-dark version is
   used (white wordmark, light-blue mark), not a colour filter. */
export const LOGO_ASPECT = 283.4 / 73.86; // ≈ 3.84

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
        src={variant === "dark" ? "/logo-on-dark.svg" : "/logo.svg"}
        alt="Blue-IQ"
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        preload={priority}
        className="select-none"
      />
    </span>
  );
}
