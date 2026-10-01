"use client";

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   Sonar field — the hero's background. Pings spread out as rings;
   wherever a ring passes, points on the surface answer with a brief
   echo, the way Sonar finds clauses in a document. The cursor sends
   pings as it moves, a click sends a stronger one, and a slow ping
   from behind the headline keeps it alive when nobody is moving.

   Nothing is drawn until a ping exists, so there is no static
   pattern. The loop stops when the last ping fades, and the whole
   thing stays off under reduced motion.
   ────────────────────────────────────────────────────────────── */

type Ping = { x: number; y: number; start: number; strength: number };
type Point = { x: number; y: number };

const SPEED = 0.2; // ring growth, px per ms
const LIFE_MS = 2800;
const BAND = 18; // how close a ring must be for a point to echo
const GRID = 46; // average spacing of echo points
const MOVE_GAP_MS = 380; // at most one cursor ping per this interval
const MOVE_GAP_PX = 36;
const AMBIENT_MS = 3400;
const MAX_PINGS = 7;

// Seeded so the echo points sit in the same places on every load.
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(width: number, height: number): Point[] {
  const rand = seeded(11);
  const points: Point[] = [];
  for (let y = GRID / 2; y < height; y += GRID) {
    for (let x = GRID / 2; x < width; x += GRID) {
      if (rand() < 0.45) continue; // sparse: most cells stay empty
      points.push({ x: x + (rand() - 0.5) * GRID * 0.8, y: y + (rand() - 0.5) * GRID * 0.8 });
    }
  }
  return points;
}

export function SonarField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const css = getComputedStyle(canvas);
    const ringColor = css.getPropertyValue("--lp-accent").trim();
    const echoColor = css.getPropertyValue("--lp-accent").trim();

    let width = 0;
    let height = 0;
    let points: Point[] = [];
    let pings: Ping[] = [];
    let frame = 0;
    let lastMove = { x: -999, y: -999, t: 0 };

    const draw = (now: number) => {
      frame = 0;
      pings = pings.filter((p) => now - p.start < LIFE_MS);
      ctx.clearRect(0, 0, width, height);

      for (const p of pings) {
        const age = now - p.start;
        if (age < 0) continue;
        const fade = 1 - age / LIFE_MS;
        ctx.beginPath();
        ctx.arc(p.x, p.y, age * SPEED, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.globalAlpha = 0.45 * fade * p.strength;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = echoColor;
      for (const pt of points) {
        let lit = 0;
        for (const p of pings) {
          const age = now - p.start;
          if (age < 0) continue;
          const edge = Math.abs(Math.hypot(pt.x - p.x, pt.y - p.y) - age * SPEED);
          if (edge < BAND) lit = Math.max(lit, (1 - edge / BAND) * (1 - age / LIFE_MS) * p.strength);
        }
        if (lit < 0.03) continue;
        ctx.globalAlpha = Math.min(0.7, lit);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5 + lit * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pings.length > 0) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const ping = (x: number, y: number, strength: number, delay = 0) => {
      if (pings.length >= MAX_PINGS) pings.shift();
      pings.push({ x, y, start: performance.now() + delay, strength });
      schedule();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = scatter(width, height);
    };

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (y > height) return; // below the tinted surface
      const now = performance.now();
      if (now - lastMove.t < MOVE_GAP_MS || Math.hypot(x - lastMove.x, y - lastMove.y) < MOVE_GAP_PX) return;
      lastMove = { x, y, t: now };
      ping(x, y, 0.7);
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (y <= height) ping(x, y, 1);
    };
    const ambient = () => {
      if (document.visibilityState === "visible") ping(width / 2, Math.min(height * 0.36, 300), 0.8);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    ping(width / 2, Math.min(height * 0.36, 300), 1, 500);
    const timer = setInterval(ambient, AMBIENT_MS);

    return () => {
      observer.disconnect();
      clearInterval(timer);
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
