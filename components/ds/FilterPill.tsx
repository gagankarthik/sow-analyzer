"use client";

// One filter dimension as a pill ("Stage", "Owner", "Type"). Empty, it reads
// as the dimension; with choices it reads "Stage: In review +1" and turns
// blue. The popover lists every option with its count, adds a search box
// when there are many, and clears in one click. Multi-select.

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Check, ChevronDown, Search, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string; count?: number };

export function FilterPill({
  label, options, selected, onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = React.useState("");
  const active = selected.length > 0;
  const first = options.find((o) => o.value === selected[0])?.label;
  const shown = q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options;

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <PopoverPrimitive.Root onOpenChange={(o) => { if (!o) setQ(""); }}>
      <span className="inline-flex items-center">
        <PopoverPrimitive.Trigger
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
            active
              ? "border-[var(--brand-primary-300)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"
              : "border-border bg-card text-[var(--ink-700)] hover:border-[var(--ink-300)]",
            active && "rounded-e-none border-e-0 pe-2",
          )}
        >
          {active ? (
            <>
              <span>{label}:</span>
              <span className="max-w-[10rem] truncate font-semibold">{first}</span>
              {selected.length > 1 && <span className="font-semibold">+{selected.length - 1}</span>}
            </>
          ) : (
            <>
              {label}
              <ChevronDown size={14} aria-hidden className="text-[var(--ink-500)]" />
            </>
          )}
        </PopoverPrimitive.Trigger>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            aria-label={`Clear ${label} filter`}
            className="inline-flex h-9 items-center rounded-e-lg border border-s-0 border-[var(--brand-primary-300)] bg-[var(--brand-primary-50)] pe-2.5 ps-1 text-[var(--brand-primary-700)] hover:text-[var(--brand-primary-900,var(--brand-primary-700))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </span>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {options.length > 8 && (
            <div className="relative mb-1.5">
              <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-sm outline-none hover:border-[var(--ink-500)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)]"
              />
            </div>
          )}
          <div role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-72 overflow-y-auto">
            {shown.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-[var(--ink-600)]">No matches.</p>
            ) : shown.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none"
                >
                  <span className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white" : "border-[var(--ink-300)] bg-card")} aria-hidden>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{o.label}</span>
                  {o.count !== undefined && <span className="shrink-0 text-xs tabular-nums text-[var(--ink-500)]">{o.count}</span>}
                </button>
              );
            })}
          </div>
          {active && (
            <div className="mt-1.5 border-t border-border pt-1.5">
              <button type="button" onClick={() => onChange([])} className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--brand-primary-700)] hover:bg-[var(--ink-50)]">
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** Option list with counts from rows, sorted by count. */
export function optionsFrom<T>(rows: T[], get: (r: T) => string | null | undefined, label: (v: string) => string = (v) => v): FilterOption[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = get(r);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: label(value), count }));
}
