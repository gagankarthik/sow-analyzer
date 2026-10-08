"use client";

// Inputs and navigation: SearchField, FilterChips, FilterSelect, FilterBar,
// SegmentedControl, Toolbar, Tabs. Every control has a visible or
// programmatic label, a 40px touch target below sm, and a visible focus ring.

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Search, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatValue } from "./format";

/* ─── SearchField ────────────────────────────────────────────────── */

export type SearchFieldProps = Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> & {
  /** Visible label. Use `hideLabel` only when a heading right above names the list. */
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  /** Called with the value after the user pauses typing (server-friendly search). */
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  className?: string;
};

/**
 * Labelled search input with a clear button. Escape clears. Debounced
 * callback for server queries; `onChange` stays immediate for the input.
 */
export function SearchField({
  label,
  hideLabel = false,
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 250,
  className,
  id,
  placeholder,
  ...props
}: SearchFieldProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const debouncedRef = React.useRef(onDebouncedChange);
  React.useEffect(() => {
    debouncedRef.current = onDebouncedChange;
  });
  React.useEffect(() => {
    if (!debouncedRef.current) return;
    const t = window.setTimeout(() => debouncedRef.current?.(value), debounceMs);
    return () => window.clearTimeout(t);
  }, [value, debounceMs]);

  return (
    <div className={cn("w-full min-w-0 md:max-w-[360px]", className)}>
      <label htmlFor={inputId} className={cn("mb-1.5 block text-body font-medium text-fg-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search size={16} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
        <Input
          id={inputId}
          type="search"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              onChange("");
            }
          }}
          className="h-9 rounded-lg border-border-control ps-9 pe-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute end-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-tertiary hover:bg-surface-hover hover:text-fg-primary"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── FilterChips ────────────────────────────────────────────────── */

export type FilterOption<V extends string> = { value: V; label: string; count?: number };

/** Single-select chip row (toggle buttons with aria-pressed). Scrolls on mobile. */
export function FilterChips<V extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  className,
}: {
  label: string;
  options: FilterOption<V>[];
  value: V;
  onChange: (v: V) => void;
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("min-w-0", className)}>
      {!hideLabel && <div className="mb-1.5 text-body font-medium text-fg-secondary">{label}</div>}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill border px-3.5 text-body font-medium whitespace-nowrap transition-colors duration-(--duration-instant) sm:h-8",
                active
                  ? "border-interactive bg-interactive text-fg-on-interactive"
                  : "border-border-strong bg-surface-raised text-fg-secondary hover:border-border-control hover:text-fg-primary",
              )}
            >
              {o.label}
              {o.count !== undefined && (
                <span className={cn("tabular-nums text-caption", active ? "opacity-90" : "text-fg-tertiary")}>
                  {formatValue(o.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FilterSelect ───────────────────────────────────────────────── */

/** Labelled single-select dropdown for a filter dimension with many options. */
export function FilterSelect<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: FilterOption<V>[];
  value: V;
  onChange: (v: V) => void;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label id={id} className="mb-1.5 block text-body font-medium text-fg-secondary">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v as V)}>
        <SelectTrigger aria-labelledby={id} className="w-full min-w-[11rem] sm:w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              {o.count !== undefined ? ` (${formatValue(o.count)})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─── FilterBar ──────────────────────────────────────────────────── */

export type FilterBarProps = {
  /** Search + filter controls (SearchField, FilterChips, FilterSelect…). */
  children: React.ReactNode;
  /** Rows shown after filtering. */
  shown: number;
  /** Rows before filtering. */
  total: number;
  /** Plural noun: "contracts". */
  noun: string;
  /** True when any filter or search is applied. */
  active: boolean;
  onClear: () => void;
  /** Right-aligned extras (export: exports exactly what is shown). */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Filters in one row above the data, with a live "Showing 12 of 48
 * contracts" summary and Clear filters. Wraps on narrow screens.
 */
export function FilterBar({ children, shown, total, noun, active, onClear, actions, className }: FilterBarProps) {
  return (
    <div role="search" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-end">{children}</div>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-body text-fg-secondary" aria-live="polite">
          Showing <span className="font-semibold tabular-nums text-fg-primary">{formatValue(shown)}</span> of{" "}
          <span className="tabular-nums">{formatValue(total)}</span> {noun}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center rounded-control px-2 text-body font-semibold text-fg-link hover:underline"
            >
              Clear filters
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

/* ─── SegmentedControl ───────────────────────────────────────────── */

export type SegmentedOption<V extends string> = { value: V; label: string; icon?: React.ReactNode };

/**
 * 2–5 mutually exclusive views of the same content (Chart / Table, Week /
 * Month). A radiogroup: arrow keys move, one tab stop. Not for navigation
 * between pages (use links) or panels with different content (use Tabs).
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (v: V) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const rtl = typeof document !== "undefined" && document.dir === "rtl" && (e.key === "ArrowRight" || e.key === "ArrowLeft");
    const next = (i + (rtl ? -dir : dir) + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex max-w-full rounded-control border border-border-strong bg-surface-sunken p-0.5", className)}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-3 font-medium whitespace-nowrap transition-colors duration-(--duration-instant) [&_svg]:size-3.5",
              size === "sm" ? "h-8 text-caption" : "h-10 text-body sm:h-8",
              checked ? "bg-surface-raised text-fg-primary shadow-raised" : "text-fg-secondary hover:text-fg-primary",
            )}
          >
            {o.icon && <span aria-hidden className="inline-flex">{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Toolbar ────────────────────────────────────────────────────── */

/**
 * A row of related controls with a label (role="toolbar"). Groups split by
 * hairlines; `end` content aligns to the inline end.
 */
export function Toolbar({
  label,
  children,
  end,
  className,
}: {
  label: string;
  children: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="toolbar" aria-label={label} className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {children}
      {end && <div className="ms-auto flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}

/** Vertical hairline between toolbar groups. */
export function ToolbarSeparator() {
  return <span role="separator" aria-orientation="vertical" className="mx-1 h-6 w-px bg-border-default" />;
}

/* ─── Tabs ───────────────────────────────────────────────────────── */

/** Tabs root (radix): panels with different content in the same place. */
export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}

/** The tab row: underline style, scrolls horizontally on narrow screens. */
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("scrollbar-none flex min-w-0 gap-1 overflow-x-auto border-b border-border-default", className)}
      {...props}
    />
  );
}

/** One tab. Optional `count` badge (e.g. items needing attention). */
export function TabsTrigger({
  className,
  children,
  count,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-body font-medium whitespace-nowrap text-fg-secondary transition-colors duration-(--duration-instant) hover:text-fg-primary",
        "data-[state=active]:border-interactive data-[state=active]:font-semibold data-[state=active]:text-fg-link",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-surface-sunken px-1.5 text-caption tabular-nums text-fg-secondary">
          {formatValue(count)}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

/** A tab panel. */
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("min-w-0", className)} {...props} />;
}
