"use client";

// A quick filter as a segmented control: [Label │ Value ▾]. 32px tall, 12px
// text, 6px radius, 1px strong border on a white surface. Unset reads "Any".
// When set, the border and value turn accent and a small ✕ clears it. Width
// follows the content between 96px and 220px; a long value truncates and
// shows in full on hover.
//
//   <FilterButton label="Stage" value={summary} active={n > 0} onClear={clear}>
//     <DropdownMenuCheckboxItem …>In review</DropdownMenuCheckboxItem>
//   </FilterButton>
//
// `children` is the menu (DropdownMenu items). For a trigger that opens
// something else (a sheet, a popover), use <FilterButtonTrigger> as its
// asChild child.

import * as React from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ListFilter, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type FilterButtonProps = {
  /** The dimension: "Stage", "Owner". Muted, left of the divider. */
  label: string;
  /** The current choice in words; leave empty for "Any". */
  value?: React.ReactNode;
  /** Something is chosen: accent border, accent value, clear button. Default: value is set. */
  active?: boolean;
  /** Shows the ✕ when active. */
  onClear?: () => void;
  /** Leading icon (12px, decorative). */
  icon?: React.ReactNode;
  /** Menu content: DropdownMenu items. */
  children: React.ReactNode;
  /** Menu alignment. */
  align?: "start" | "end";
  /** Width class for the menu. */
  menuClassName?: string;
  /** Show the label as the menu heading. Default true. */
  menuLabel?: boolean;
  className?: string;
};

export function FilterButton({
  label, value, active, onClear, icon, children, align = "start", menuClassName, menuLabel = true, className,
}: FilterButtonProps) {
  const isActive = active ?? (value !== undefined && value !== null && value !== "");
  const text = isActive ? value : "Any";
  return (
    <DropdownMenu>
      <FilterButtonFrame active={isActive} onClear={onClear} label={label} className={className}>
        <DropdownMenuTrigger asChild>
          <FilterButtonTrigger label={label} value={text} icon={icon} active={isActive} framed={false} />
        </DropdownMenuTrigger>
      </FilterButtonFrame>
      <DropdownMenuContent align={align} className={cn("max-h-80 w-60", menuClassName)}>
        {menuLabel && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The border and the clear button around a trigger. */
function FilterButtonFrame({ active, onClear, label, className, children }: {
  active: boolean; onClear?: () => void; label: string; className?: string; children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-24 max-w-[220px] shrink-0 items-stretch overflow-hidden rounded-[6px] border bg-surface-raised transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
        active ? "border-[var(--brand-primary-600)]" : "border-border-strong",
        className,
      )}
    >
      {children}
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="inline-flex w-6 shrink-0 items-center justify-center text-[var(--brand-primary-700)] hover:bg-surface-hover focus-visible:outline-none"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}

/** The segmented face on its own. `framed` (default) draws the border, for
 *  use as the asChild child of a Popover, Sheet or DropdownMenu trigger. */
export const FilterButtonTrigger = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<"button">, "value"> & { label: string; value: React.ReactNode; active?: boolean; icon?: React.ReactNode; framed?: boolean }
>(function FilterButtonTrigger({ label, value, active = false, icon, framed = true, className, ...props }, ref) {
  const title = typeof value === "string" ? `${label}: ${value}` : label;
  return (
    <button
      ref={ref}
      type="button"
      title={title}
      className={cn(
        "group inline-flex h-full min-w-0 flex-1 items-stretch text-[12px] leading-none transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none data-[state=open]:bg-surface-hover",
        framed && cn(
          "h-9 min-w-24 max-w-[220px] flex-none shrink-0 overflow-hidden rounded-[6px] border bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          active ? "border-[var(--brand-primary-600)]" : "border-border-strong",
        ),
        className,
      )}
      {...props}
    >
      <span className="flex shrink-0 items-center gap-1.5 px-2 text-[var(--ink-600)]">
        {icon}
        {label}
      </span>
      <span aria-hidden className="w-px shrink-0 self-stretch bg-border-default" />
      <span className={cn("flex min-w-0 flex-1 items-center gap-1 px-2", active ? "font-medium text-[var(--brand-primary-700)]" : "text-[var(--ink-900)]")}>
        <span className="min-w-0 truncate">{value}</span>
        <ChevronDown size={12} aria-hidden className="ms-auto shrink-0 text-[var(--ink-500)] transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </span>
    </button>
  );
});

/** "More filters" as a plain 32px button: filter icon, label and "(n)" when
 *  filters are set (accent border then). Use as the asChild child of a
 *  DropdownMenu, Popover or Sheet trigger. */
export const MoreFiltersButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { count?: number; label?: string }
>(function MoreFiltersButton({ count = 0, label = "More filters", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={count > 0 ? `${label}, ${count} applied` : label}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] border bg-surface-raised px-2.5 text-[12px] leading-none text-[var(--ink-900)] transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-surface-hover",
        count > 0 ? "border-[var(--brand-primary-600)]" : "border-border-strong",
        className,
      )}
      {...props}
    >
      <ListFilter size={12} aria-hidden className="text-[var(--ink-600)]" />
      {label}
      {count > 0 && <span className="tabular-nums text-[var(--brand-primary-700)]">({count})</span>}
    </button>
  );
});

export type RadioFilterOption<V extends string> = { value: V; label: string };

/** A single-choice quick filter: a FilterButton over a radio list. The
 *  `anyValue` option means "not filtering" and reads "Any". */
export function RadioFilterButton<V extends string>({
  label, value, options, onChange, anyValue, className,
}: {
  label: string;
  value: V;
  options: RadioFilterOption<V>[];
  onChange: (v: V) => void;
  anyValue: V;
  className?: string;
}) {
  const set = value !== anyValue;
  return (
    <FilterButton
      label={label}
      value={set ? options.find((o) => o.value === value)?.label ?? value : undefined}
      onClear={() => onChange(anyValue)}
      className={className}
    >
      <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as V)}>
        {options.map((o) => (
          <DropdownMenuRadioItem key={o.value} value={o.value}>
            {o.value === anyValue ? "Any" : o.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </FilterButton>
  );
}
