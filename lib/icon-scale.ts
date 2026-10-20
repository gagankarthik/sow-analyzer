// Icon scale: the four sizes every icon renders at, and the stroke that keeps
// them the same optical weight. Pure math, shared by components/ui/brand-icons
// (which applies it to every icon) and the icon review page.

/** The drawing grid every icon is authored on (viewBox 0 0 24 24). */
export const ICON_GRID = 24;

/** The four UI sizes. 12 dense badges, 16 default, 20 nav and page level, 24 empty states. */
export const ICON_SIZES = [12, 16, 20, 24] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/** Sizes at or above this are display marks (Sonar tiles, hero empty states), not UI icons. */
export const ICON_DISPLAY_MIN = 28;

/** Rendered stroke, in screen pixels, at every size. */
export const ICON_OPTICAL_STROKE = 1.5;

/**
 * Snap a requested size onto the scale: below 14 → 12, 14–17 → 16,
 * 18–22 → 20, 23–27 → 24. Display sizes (≥ 28) pass through rounded, so a
 * 44px Sonar mark is not shrunk to a UI icon. Non-numeric CSS lengths
 * ("1em") pass through untouched; missing or invalid values fall back to 24,
 * lucide's default.
 */
export function snapIconSize(size: number | string | undefined | null): number | string {
  if (size === undefined || size === null || size === "") return 24;
  const n = typeof size === "number" ? size : Number(size);
  if (!Number.isFinite(n)) return typeof size === "string" ? size : 24;
  if (n <= 0) return 24;
  if (n < 14) return 12;
  if (n < 18) return 16;
  if (n < 23) return 20;
  if (n < ICON_DISPLAY_MIN) return 24;
  return Math.round(n);
}

/**
 * The stroke, in viewBox units, that renders as ICON_OPTICAL_STROKE screen
 * pixels at `size` (lucide's absoluteStrokeWidth: stroke × 24 / size).
 * Non-numeric sizes return the optical stroke itself.
 */
export function iconStrokeWidth(size: number | string): number {
  const n = typeof size === "number" ? size : Number(size);
  if (!Number.isFinite(n) || n <= 0) return ICON_OPTICAL_STROKE;
  return Math.round(((ICON_OPTICAL_STROKE * ICON_GRID) / n) * 1000) / 1000;
}
