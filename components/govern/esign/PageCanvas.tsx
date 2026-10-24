"use client";

// The document's pages with their fields. Each page image is overlaid with an
// <svg viewBox="0 0 width height"> in the page's own points; fields are SVG
// rects placed by attribute (fraction × page size), so nothing needs an inline
// style. Pointer positions go through svg.getScreenCTM().inverse().

import { useEffect, useRef, useState } from "react";
import { FIELD_LABEL, type FieldType, type PageImage } from "@/lib/esign/types";
import {
  clientToFraction, moveRect, placeAt, resizeRect, signerColor, type DraftField, type DraftRecipient, type Point, type Rect,
} from "@/lib/govern/esign-editor";
import { cn } from "@/lib/utils";

/** The drag payload a palette button carries onto a page. */
export const FIELD_DRAG_TYPE = "application/x-govern-esign-field";

const NUDGE = 0.005;
const NUDGE_FAR = 0.02;

export type CanvasField = DraftField & { value?: string | null };

type Props = {
  pages: PageImage[];
  fields: CanvasField[];
  recipients: DraftRecipient[];
  /** Placing, moving and resizing are on. */
  editable: boolean;
  /** The armed field type: a click on a page places one. */
  tool: FieldType | null;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onPlace: (type: FieldType, page: number, rect: Rect, keepTool: boolean) => void;
  onChange: (key: string, rect: Rect) => void;
  onDelete: (key: string) => void;
  /** The page most in view, for the thumbnails and "place on this page". */
  onVisiblePage: (page: number) => void;
  visiblePage: number;
};

type Drag = { key: string; mode: "move" | "resize"; page: number; start: Point; rect: Rect; moved: boolean };

function pointerFraction(svg: SVGSVGElement, clientX: number, clientY: number, page: PageImage): Point | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return clientToFraction(ctm.inverse(), clientX, clientY, page);
}

export function PageCanvas(props: Props) {
  const { pages, fields, visiblePage, onVisiblePage } = props;
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track the page most in view (IntersectionObserver callbacks, not render).
  useEffect(() => {
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) ratios.set(Number((e.target as HTMLElement).dataset.page), e.intersectionRatio);
      let best = 0;
      let bestRatio = -1;
      for (const [page, ratio] of ratios) if (ratio > bestRatio) [best, bestRatio] = [page, ratio];
      onVisiblePage(best);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    for (const el of pageRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [pages.length, onVisiblePage]);

  function jump(i: number) {
    pageRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex min-w-0 gap-4">
      <nav aria-label="Pages" className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] w-20 shrink-0 self-start overflow-y-auto md:block">
        <ol className="flex flex-col gap-2 pb-2">
          {pages.map((p, i) => {
            const count = fields.filter((f) => f.page === i).length;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={visiblePage === i ? "page" : undefined}
                  aria-label={`Page ${i + 1}${count ? `, ${count} field${count === 1 ? "" : "s"}` : ""}`}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-md border p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]",
                    visiblePage === i ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-border-default bg-surface-raised hover:border-border-strong",
                  )}
                >
                  {/* Presigned S3 images: next/image would need the bucket host in remotePatterns. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" width={p.width} height={p.height} loading="lazy" draggable={false} className="block h-auto w-full bg-white" />
                  <span className="text-caption tabular-nums text-fg-secondary">
                    {i + 1}{count > 0 && <span className="text-fg-tertiary"> · {count}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {pages.map((p, i) => (
          <div
            key={i}
            id={`esign-page-${i}`}
            data-page={i}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            className="scroll-mt-4"
          >
            <p className="mb-1.5 text-caption tabular-nums text-fg-tertiary">Page {i + 1} of {pages.length}</p>
            <PageSheet {...props} page={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PageSheet({ page, index, fields, recipients, editable, tool, selectedKey, onSelect, onPlace, onChange, onDelete }: Props & { page: PageImage; index: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dropping, setDropping] = useState(false);
  const own = fields.filter((f) => f.page === index);
  const W = page.width;
  const H = page.height;
  const placing = editable && tool !== null;

  function place(type: FieldType, clientX: number, clientY: number, keepTool: boolean) {
    const svg = svgRef.current;
    const at = svg && pointerFraction(svg, clientX, clientY, page);
    if (at) onPlace(type, index, placeAt(type, at, page), keepTool);
  }

  function onBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget && !(e.target as Element).hasAttribute("data-page-bg")) return;
    if (placing && tool) {
      e.preventDefault();
      place(tool, e.clientX, e.clientY, e.shiftKey);
      return;
    }
    onSelect(null);
  }

  function startDrag(e: React.PointerEvent<SVGElement>, f: CanvasField, mode: Drag["mode"]) {
    onSelect(f.key);
    if (!editable || e.button !== 0) return;
    const svg = svgRef.current;
    const start = svg && pointerFraction(svg, e.clientX, e.clientY, page);
    if (!start) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key: f.key, mode, page: index, start, rect: { x: f.x, y: f.y, w: f.w, h: f.h }, moved: false };
  }

  function onDragMove(e: React.PointerEvent<SVGElement>) {
    const d = drag.current;
    const svg = svgRef.current;
    if (!d || !svg || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const now = pointerFraction(svg, e.clientX, e.clientY, page);
    if (!now) return;
    const dx = now.x - d.start.x;
    const dy = now.y - d.start.y;
    d.moved = true;
    onChange(d.key, d.mode === "move" ? moveRect(d.rect, dx, dy) : resizeRect(d.rect, dx, dy));
  }

  function endDrag(e: React.PointerEvent<SVGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  }

  function onFieldKey(e: React.KeyboardEvent<SVGGElement>, f: CanvasField) {
    if (!editable) return;
    const step = e.shiftKey ? NUDGE_FAR : NUDGE;
    const rect = { x: f.x, y: f.y, w: f.w, h: f.h };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete(f.key);
    } else if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      onChange(f.key, e.altKey ? resizeRect(rect, dx, dy) : moveRect(rect, dx, dy));
    } else if (e.key === "Escape") {
      onSelect(null);
      (e.currentTarget as SVGGElement).blur();
    }
  }

  const fontSize = (f: Rect) => Math.max(6, Math.min(f.h * H * 0.42, 11));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border bg-white",
        dropping ? "border-[var(--brand-primary-600)] ring-2 ring-[var(--brand-primary-300)]" : "border-border-strong",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={page.url} alt={`Page ${index + 1}`} width={W} height={H} draggable={false} className="block h-auto w-full select-none" />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="group"
        aria-label={`Fields on page ${index + 1}`}
        className={cn("absolute inset-0 size-full", placing ? "cursor-crosshair" : "cursor-default")}
        onPointerDown={onBackgroundPointerDown}
        onDragOver={(e) => {
          if (!editable || !e.dataTransfer.types.includes(FIELD_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          setDropping(false);
          const type = e.dataTransfer.getData(FIELD_DRAG_TYPE) as FieldType;
          if (!editable || !type || !(type in FIELD_LABEL)) return;
          e.preventDefault();
          place(type, e.clientX, e.clientY, false);
        }}
      >
        <rect data-page-bg="" x={0} y={0} width={W} height={H} className="fill-transparent" />
        {own.map((f) => {
          const color = signerColor(recipients, f.recipientId);
          const signer = recipients.find((r) => r.id === f.recipientId);
          const selected = selectedKey === f.key;
          const x = f.x * W;
          const y = f.y * H;
          const w = f.w * W;
          const h = f.h * H;
          const text = f.value && f.type !== "signature" && f.type !== "initials" ? f.value : (f.label || FIELD_LABEL[f.type]);
          return (
            <g
              key={f.key}
              role={editable ? "button" : "img"}
              tabIndex={editable ? 0 : undefined}
              aria-pressed={editable ? selected : undefined}
              aria-label={`${FIELD_LABEL[f.type]}${f.label ? ` "${f.label}"` : ""} for ${signer?.name || "no signer"}${f.required ? "" : ", optional"}`}
              // touch-none on the field only, so the pages still scroll under a finger.
              className={cn("outline-none", editable ? "cursor-move touch-none" : "cursor-default")}
              onPointerDown={(e) => startDrag(e, f, "move")}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onFocus={() => { if (editable) onSelect(f.key); }}
              onKeyDown={(e) => onFieldKey(e, f)}
            >
              <rect
                x={x} y={y} width={w} height={h} rx={2}
                strokeWidth={selected ? 2 : 1}
                strokeDasharray={f.required ? undefined : "4 2"}
                vectorEffect="non-scaling-stroke"
                className={cn(color.fill, color.stroke)}
              />
              {f.type === "checkbox" ? null : (
                <text
                  x={x + Math.min(4, w * 0.08)} y={y + h / 2}
                  dominantBaseline="central"
                  fontSize={fontSize(f)}
                  className={cn(color.svgText, "pointer-events-none font-medium select-none")}
                >
                  {text}{f.required ? "" : " (optional)"}
                </text>
              )}
              {selected && (
                <rect
                  x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={3}
                  fill="none" strokeWidth={1} vectorEffect="non-scaling-stroke"
                  className="pointer-events-none stroke-[var(--brand-primary-600)]"
                />
              )}
              {selected && editable && (
                <rect
                  aria-hidden
                  x={x + w - 4} y={y + h - 4} width={8} height={8} rx={1}
                  strokeWidth={1} vectorEffect="non-scaling-stroke"
                  className="cursor-nwse-resize fill-white stroke-[var(--brand-primary-600)]"
                  onPointerDown={(e) => startDrag(e, f, "resize")}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
