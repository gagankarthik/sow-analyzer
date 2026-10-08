"use client";

// Page-level view tabs (WAI-ARIA tabs): arrow keys move between views and only
// the active tab is in the tab order. The page owns the state (usually the URL).

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ViewTabs<T extends string>({
  id, label, views, value, onChange,
}: {
  /** Prefix for tab/panel ids: tabs are `${id}-tab-${view}`, panels `${id}-panel-${view}`. */
  id: string;
  label: string;
  views: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + views.length) % views.length;
    onChange(views[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="scrollbar-none flex gap-6 overflow-x-auto overflow-y-hidden border-b border-border">
      {views.map((v, i) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            ref={(el) => { refs.current[i] = el; }}
            id={`${id}-tab-${v.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${id}-panel-${v.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(v.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "-mb-px h-10 shrink-0 border-b-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:opacity-80",
              active ? "border-[var(--brand-primary-600)] font-semibold text-foreground" : "border-transparent text-[var(--ink-600)] hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
