"use client";

import { useEffect, useRef } from "react";

/* The hero's background: a field of clause cells, like a review matrix
   seen from far away. Cells near the pointer light up in the tier they
   would be rated (mostly within or fallback, a few that need work) and
   fade back; when nobody is pointing, small clusters light up on their own
   as Sonar checks them. With reduced motion the field is drawn once, with
   a few cells already rated. Behind text ([data-field-quiet]) the field
   rests empty and only ever lights faintly, so the copy stays easy to
   read. It pauses when off screen or in a hidden tab. Decorative only:
   hidden from assistive technology. */

const CELL = 6;            // resting cell size, px
const PITCH = 28;          // distance between cell centres, px
const REACH = 170;         // pointer radius that lights cells, px
const DECAY = 0.965;       // energy kept per frame
const PULSE_EVERY_MS = 450;
const QUIET_MAX = 0.18;    // most a cell behind text may light

/* How often each tier is dealt, roughly the shape of a real review. */
const TIER_WEIGHTS = [
  { variable: "--site-within", weight: 60 },
  { variable: "--site-fallback", weight: 22 },
  { variable: "--site-deviates", weight: 9 },
  { variable: "--site-unacceptable", weight: 6 },
  { variable: "--site-missing", weight: 3 },
];

type Rgb = [number, number, number];
type Cell = { x: number; y: number; tier: number; energy: number; cap: number };

export function MatrixField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const styles = getComputedStyle(host);
    const base = toRgb(styles.getPropertyValue("--site-line"));
    const tiers = TIER_WEIGHTS.map((t) => toRgb(styles.getPropertyValue(t.variable)));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cells: Cell[] = [];
    let width = 0;
    let height = 0;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let lastPulse = 0;
    let isVisible = true;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth;
      height = host.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hostRect = host.getBoundingClientRect();
      const quiet = Array.from(host.querySelectorAll<HTMLElement>("[data-field-quiet]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - hostRect.left, top: r.top - hostRect.top, right: r.right - hostRect.left, bottom: r.bottom - hostRect.top };
      });
      const isQuiet = (x: number, y: number) => quiet.some((q) => x > q.left - PITCH && x < q.right + PITCH && y > q.top - PITCH && y < q.bottom + PITCH);
      cells = [];
      const offsetX = ((width % PITCH) + PITCH) / 2;
      const offsetY = ((height % PITCH) + PITCH) / 2;
      for (let y = offsetY; y < height; y += PITCH) {
        for (let x = offsetX; x < width; x += PITCH) {
          const cap = isQuiet(x, y) ? QUIET_MAX : 1;
          const energy = reducedMotion && Math.random() < 0.08 ? Math.min(0.45, cap) : 0;
          cells.push({ x, y, tier: dealTier(), energy, cap });
        }
      }
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const cell of cells) {
        const e = cell.energy;
        if (cell.cap < 1 && e === 0) continue;
        const [r, g, b] = mix(base, tiers[cell.tier], Math.min(e, 1) * 0.85);
        const size = CELL + e * 4;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.roundRect(cell.x - size / 2, cell.y - size / 2, size, size, 1.5);
        ctx.fill();
      }
    };

    const pulse = () => {
      const centre = cells[Math.floor(Math.random() * cells.length)];
      if (!centre) return;
      for (const cell of cells) {
        const d = Math.hypot(cell.x - centre.x, cell.y - centre.y);
        if (d < PITCH * 2.2) cell.energy = Math.min(cell.cap, Math.max(cell.energy, 0.75 - d / (PITCH * 4)));
      }
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (!isVisible) return;
      if (time - lastPulse > PULSE_EVERY_MS && !pointer) {
        pulse();
        lastPulse = time;
      }
      for (const cell of cells) {
        if (pointer) {
          const d = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
          if (d < REACH) cell.energy = Math.min(cell.cap, Math.max(cell.energy, 1 - d / REACH));
        }
        cell.energy *= DECAY;
        if (cell.energy < 0.03) cell.energy = 0;
      }
      draw();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };

    const resize = new ResizeObserver(layout);
    resize.observe(host);
    layout();
    if (reducedMotion) return () => resize.disconnect();

    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && document.visibilityState === "visible";
    });
    visibility.observe(host);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="home-field" aria-hidden="true" />;
}

function dealTier(): number {
  const total = TIER_WEIGHTS.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < TIER_WEIGHTS.length; i++) {
    roll -= TIER_WEIGHTS[i].weight;
    if (roll <= 0) return i;
  }
  return 0;
}

/** "#RRGGBB" to [r, g, b]. */
function toRgb(hex: string): Rgb {
  const value = parseInt(hex.trim().replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * amount)) as Rgb;
}
