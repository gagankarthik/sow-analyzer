// Canvas → the PNG data URL the server accepts: trimmed to the ink, scaled
// inside IMAGE_LIMITS, transparent background. Sizing maths lives in
// lib/esign/signing.ts (tested); this file only touches the canvas.

import { IMAGE_LIMITS, dataUrlBytes, fitImageSize, inkBounds } from "@/lib/esign/signing";

/** The signature ink: the brand's deepest blue, read from the design tokens. */
export function inkColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--brand-primary-900").trim();
  return value || "#1A3170";
}

/** A trimmed transparent PNG of what is drawn on `source`, or null when it is blank. */
export function canvasToPng(source: HTMLCanvasElement): string | null {
  const ctx = source.getContext("2d");
  if (!ctx || source.width === 0 || source.height === 0) return null;
  const pixels = ctx.getImageData(0, 0, source.width, source.height);
  const pad = Math.round(Math.max(source.width, source.height) * 0.02) + 4;
  const box = inkBounds(pixels.data, source.width, source.height, pad);
  if (!box) return null;

  let size = fitImageSize(box.w, box.h);
  for (let attempt = 0; attempt < 5; attempt++) {
    const out = document.createElement("canvas");
    out.width = size.w;
    out.height = size.h;
    const o = out.getContext("2d");
    if (!o) return null;
    o.imageSmoothingQuality = "high";
    const scale = Math.min(size.w / box.w, size.h / box.h);
    const dw = box.w * scale;
    const dh = box.h * scale;
    o.drawImage(source, box.x, box.y, box.w, box.h, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
    const url = out.toDataURL("image/png");
    if (dataUrlBytes(url) <= IMAGE_LIMITS.maxBytes) return url;
    size = fitImageSize(Math.round(size.w * 0.7), Math.round(size.h * 0.7));
  }
  return null;
}

/** Typed text set in `fontFamily` onto a canvas, then trimmed like a drawing. */
export async function typedToPng(text: string, fontFamily: string): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  const font = `120px ${fontFamily}`;
  try {
    await document.fonts.load(font, clean);
  } catch {
    // The cursive fallback still produces a usable mark.
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(clean).width);
  canvas.width = Math.min(4000, width + 80);
  canvas.height = 220;
  ctx.font = font; // resizing a canvas resets its state
  ctx.fillStyle = inkColor();
  ctx.textBaseline = "middle";
  ctx.fillText(clean, 40, 115);
  return canvasToPng(canvas);
}
