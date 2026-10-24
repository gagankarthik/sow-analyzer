"use client";

// A drawing surface for a hand-drawn signature: mouse, pen and touch through
// pointer events, at device resolution, transparent background. The parent
// reads the canvas through `canvasRef` when the signer adopts.

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { inkColor } from "./signature-image";

type Point = { x: number; y: number };

export function SignaturePad({
  canvasRef,
  hasInk,
  onInkChange,
  label,
  compact = false,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hasInk: boolean;
  onInkChange: (hasInk: boolean) => void;
  /** Spoken name of the surface: "Draw your signature". */
  label: string;
  /** Initials get a shorter pad. */
  compact?: boolean;
}) {
  const last = useRef<Point | null>(null);

  // Match the canvas bitmap to its rendered size (crisp on high-DPI screens).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      onInkChange(false); // resizing clears the bitmap
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef, onInkChange]);

  const pointAt = (e: PointerEvent<HTMLCanvasElement> | globalThis.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * canvas.width, y: ((e.clientY - rect.top) / rect.height) * canvas.height };
  };

  const stroke = (from: Point, to: Point, pressure: number, pointerType: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    const weight = pointerType === "pen" ? 0.6 + pressure * 1.2 : 1;
    ctx.strokeStyle = inkColor();
    ctx.lineWidth = 2.4 * ratio * weight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointAt(e);
    last.current = p;
    stroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, e.pressure || 0.5, e.pointerType); // a dot for a tap
    if (!hasInk) onInkChange(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length > 0 ? events : [e.nativeEvent]) {
      const p = pointAt(ev);
      stroke(last.current, p, ev.pressure || 0.5, ev.pointerType);
      last.current = p;
    }
  };

  const end = () => {
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onInkChange(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-lg border border-[var(--ink-300)] bg-white">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className={cn("block w-full cursor-crosshair touch-none select-none rounded-lg", compact ? "h-32" : "h-44")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-[var(--ink-300)]" />
        {!hasInk && (
          <p aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-[var(--ink-500)]">
            Draw here
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--ink-600)]">Use a mouse, finger or stylus. Prefer the keyboard? Choose Type.</p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <RotateCcw size={14} aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
