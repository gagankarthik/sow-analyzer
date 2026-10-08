import type { Icon } from "@/components/landing/icons";

/* The one icon treatment on the public site: a line icon (1.5px stroke)
   centred in a soft circular badge tinted with its product area, the icon
   in that area's ink. Used only where an icon labels a real thing: a
   product area or a lifecycle stage. 40px everywhere, 48px on the
   lifecycle loop. */
export function IconBadge({
  icon: Glyph,
  area,
  size = "md",
  className,
}: {
  icon: Icon;
  /** Product area whose colour the badge takes (lp-area-*). */
  area: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span className={`lp-badge lp-badge-${size} lp-area-${area} ${className ?? ""}`} aria-hidden="true">
      <Glyph size={size === "lg" ? 22 : 20} />
    </span>
  );
}
