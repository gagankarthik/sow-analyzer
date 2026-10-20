"use client";

// Column settings: show or hide each column and put them in order. Order
// changes three ways, so everyone can do it: drag the grip (mouse, pen or
// touch); focus the grip, press Space to pick the column up, arrow keys to
// move it and Space again to drop it (Escape puts it back); or the move up /
// move down buttons. Locked columns (the name) stay where they are.

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { ChevronDown, ChevronUp, GripVertical, Settings } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type ColumnSetting = { id: string; label: string; locked?: boolean };

export type Density = "comfortable" | "compact";

export function ColumnSettings({
  columns, hidden, onHiddenChange, onOrderChange, triggerClassName, density, onDensityChange,
}: {
  /** Every column, in the current order. */
  columns: ColumnSetting[];
  hidden: ReadonlySet<string>;
  onHiddenChange: (id: string, hidden: boolean) => void;
  onOrderChange: (order: string[]) => void;
  triggerClassName?: string;
  /** With both, the panel also switches row density. */
  density?: Density;
  onDensityChange?: (d: Density) => void;
}) {
  const shown = columns.filter((c) => c.locked || !hidden.has(c.id)).length;
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={`Column settings, ${shown} of ${columns.length} shown`}
        title="Column settings"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-border-strong bg-surface-raised text-[var(--ink-700)] transition-colors hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-surface-hover max-md:size-11",
          triggerClassName,
        )}
      >
        <Settings size={16} aria-hidden />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-72 rounded-lg border border-border-default bg-surface-raised p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <ColumnList columns={columns} hidden={hidden} onHiddenChange={onHiddenChange} onOrderChange={onOrderChange} />
          {density && onDensityChange && (
            <div role="group" aria-label="Row density" className="mt-1.5 flex items-center justify-between gap-2 border-t border-border-default px-2 pt-2 pb-0.5">
              <span className="text-[12px] text-[var(--ink-600)]">Rows</span>
              <span className="inline-flex rounded-[6px] border border-border-strong p-0.5">
                {(["comfortable", "compact"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={density === d}
                    onClick={() => onDensityChange(d)}
                    className={cn(
                      "inline-flex h-6 items-center rounded-[4px] px-2 text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus max-md:h-10",
                      density === d ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
                    )}
                  >
                    {d === "comfortable" ? "Comfortable" : "Compact"}
                  </button>
                ))}
              </span>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** The list itself (also usable inside a sheet). */
export function ColumnList({
  columns, hidden, onHiddenChange, onOrderChange,
}: {
  columns: ColumnSetting[];
  hidden: ReadonlySet<string>;
  onHiddenChange: (id: string, hidden: boolean) => void;
  onOrderChange: (order: string[]) => void;
}) {
  const [grabbed, setGrabbed] = React.useState<{ id: string; from: string[] } | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const helpId = React.useId();
  const rowRefs = React.useRef(new Map<string, HTMLLIElement>());
  const handleRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const order = columns.map((c) => c.id);
  const labelOf = (id: string) => columns.find((c) => c.id === id)?.label ?? id;
  const lockedIds = new Set(columns.filter((c) => c.locked).map((c) => c.id));
  // Locked columns pin to the top; movable ones can't pass above them.
  const firstMovable = columns.findIndex((c) => !c.locked);

  function moveTo(id: string, target: number) {
    const from = order.indexOf(id);
    const to = Math.max(firstMovable, Math.min(order.length - 1, target));
    if (from < 0 || from === to || lockedIds.has(id)) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    onOrderChange(next);
    setAnnounce(`${labelOf(id)}, position ${to + 1} of ${order.length}`);
    // Keep focus on the moved column's grip after the list re-renders.
    requestAnimationFrame(() => handleRefs.current.get(id)?.focus());
  }

  function onHandleKey(e: React.KeyboardEvent, id: string) {
    const i = order.indexOf(id);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grabbed?.id === id) {
        setGrabbed(null);
        setAnnounce(`${labelOf(id)} dropped at position ${i + 1} of ${order.length}`);
      } else {
        setGrabbed({ id, from: order });
        setAnnounce(`${labelOf(id)} picked up. Use the arrow keys to move it, Space to drop, Escape to cancel.`);
      }
    } else if (grabbed?.id === id && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      moveTo(id, i + (e.key === "ArrowUp" ? -1 : 1));
    } else if (grabbed?.id === id && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onOrderChange(grabbed.from);
      setGrabbed(null);
      setAnnounce(`Move cancelled. ${labelOf(id)} is back at position ${grabbed.from.indexOf(id) + 1}.`);
    }
  }

  function onPointerMove(e: React.PointerEvent, id: string) {
    if (dragging !== id) return;
    // The row whose middle the pointer has passed is the new slot.
    let target = order.indexOf(id);
    for (const [i, rid] of order.entries()) {
      const el = rowRefs.current.get(rid);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) target = i;
    }
    if (target !== order.indexOf(id)) moveTo(id, target);
  }

  return (
    <div>
      <p className="px-2 pb-1.5 pt-1 text-[12px] text-[var(--ink-600)]">Columns</p>
      <ul className="flex max-h-[min(60vh,26rem)] flex-col overflow-y-auto overscroll-contain" aria-label="Columns, in order">
        {columns.map((c, i) => {
          const checkId = `${helpId}-${c.id}`;
          const isGrabbed = grabbed?.id === c.id || dragging === c.id;
          return (
            <li
              key={c.id}
              ref={(el) => {
                if (el) rowRefs.current.set(c.id, el);
                else rowRefs.current.delete(c.id);
              }}
              className={cn(
                "flex items-center gap-1 rounded-md pe-1 transition-colors duration-150",
                isGrabbed ? "bg-surface-selected" : "hover:bg-surface-hover",
              )}
            >
              {c.locked ? (
                <span className="inline-flex size-8 shrink-0" aria-hidden />
              ) : (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) handleRefs.current.set(c.id, el);
                    else handleRefs.current.delete(c.id);
                  }}
                  aria-label={`Reorder ${c.label}`}
                  aria-pressed={grabbed?.id === c.id}
                  aria-describedby={helpId}
                  onKeyDown={(e) => onHandleKey(e, c.id)}
                  onBlur={() => grabbed?.id === c.id && setGrabbed(null)}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragging(c.id);
                  }}
                  onPointerMove={(e) => onPointerMove(e, c.id)}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setDragging(null);
                  }}
                  onPointerCancel={() => setDragging(null)}
                  className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-[var(--ink-500)] hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing max-md:size-11"
                >
                  <GripVertical size={16} aria-hidden />
                </button>
              )}
              <input
                id={checkId}
                type="checkbox"
                checked={c.locked || !hidden.has(c.id)}
                disabled={c.locked}
                onChange={(e) => onHiddenChange(c.id, !e.target.checked)}
                className="size-4 shrink-0 accent-[var(--brand-primary-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
              <label htmlFor={checkId} className={cn("min-w-0 flex-1 truncate py-2 ps-2 text-[14px] max-md:py-3", c.locked && "text-[var(--ink-500)]")}>
                {c.label}
              </label>
              {!c.locked && (
                <span className="flex shrink-0 items-center">
                  <MoveButton label={`Move ${c.label} up`} disabled={i <= firstMovable} onClick={() => moveTo(c.id, i - 1)}>
                    <ChevronUp size={16} aria-hidden />
                  </MoveButton>
                  <MoveButton label={`Move ${c.label} down`} disabled={i === columns.length - 1} onClick={() => moveTo(c.id, i + 1)}>
                    <ChevronDown size={16} aria-hidden />
                  </MoveButton>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p id={helpId} className="sr-only">Press Space to pick up, arrow keys to move, Space to drop.</p>
      <p aria-live="assertive" className="sr-only">{announce}</p>
    </div>
  );
}

function MoveButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-30 max-md:size-11"
    >
      {children}
    </button>
  );
}
