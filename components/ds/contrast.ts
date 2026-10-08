// WCAG 2.x contrast maths, used by the /design-system reference to compute
// live ratios for every token pair in the current theme. Pure functions.

export type RGBA = { r: number; g: number; b: number; a: number };

/** Parse a computed CSS colour: rgb(), rgba(), or color(srgb r g b / a). */
export function parseColor(input: string): RGBA | null {
  const s = input.trim();
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3], a: alpha(m[4]) };
  }
  m = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: alpha(m[4]) };
  }
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  return null;
}

function alpha(v: string | undefined): number {
  if (v === undefined) return 1;
  return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
}

/** Composite a translucent colour over an opaque background. */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(c: RGBA): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG contrast ratio of `fg` on `bg` (fg composited over bg first). */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const top = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(top);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** AA verdict for a ratio: text needs 4.5 (3 for large text); marks and borders need 3. */
export function wcagLevel(ratio: number, use: "text" | "large-text" | "graphic"): "AAA" | "AA" | "Fail" {
  if (use === "text") return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail";
  if (use === "large-text") return ratio >= 4.5 ? "AAA" : ratio >= 3 ? "AA" : "Fail";
  return ratio >= 3 ? "AA" : "Fail";
}

/** "#RRGGBB" for display. */
export function toHex(c: RGBA): string {
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}
