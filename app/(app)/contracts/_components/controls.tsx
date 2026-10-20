"use client";

// Small controls the Contracts toolbar shares: the segmented trigger
// ("Stage │ Any ▾"), a compact density switch and the native select style
// used inside the filter builder and the bulk editor.

import * as React from "react";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** `[label] │ [value ▾]`: 30px, 12px, one hairline divider. Pass as the
 *  asChild child of a Popover or DropdownMenu trigger; the chevron turns
 *  while it is open (data-state=open). */
export const SegmentedTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { label: string; value: React.ReactNode; active?: boolean; icon?: React.ReactNode }
>(function SegmentedTrigger({ label, value, active = false, icon, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group inline-flex h-[30px] max-w-full shrink-0 items-stretch overflow-hidden rounded-md border bg-surface-raised text-[12px] leading-none transition-colors duration-150",
        "hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-surface-hover",
        active ? "border-[var(--brand-primary-300)]" : "border-border-default",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5 px-[9px] text-[var(--ink-600)]">
        {icon}
        {label}
      </span>
      <span aria-hidden className="w-px self-stretch bg-border-default" />
      <span className={cn("flex min-w-0 items-center gap-1.5 px-[9px]", active ? "font-medium text-[var(--brand-primary-700)]" : "text-[var(--ink-900)]")}>
        <span className="truncate">{value}</span>
        <ChevronDown size={12} aria-hidden className="shrink-0 text-[var(--ink-500)] transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </span>
    </button>
  );
});

/** 30px plain toolbar button (Save view as…, Clear, Export). */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { quiet?: boolean }>(
  function ToolbarButton({ quiet = false, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-[9px] text-[12px] leading-none transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[state=open]:bg-surface-hover",
          quiet ? "text-[var(--ink-700)] hover:bg-surface-hover hover:text-[var(--ink-900)]" : "border border-border-default bg-surface-raised text-[var(--ink-900)] hover:bg-surface-hover",
          className,
        )}
        {...props}
      />
    );
  },
);

export type Density = "comfortable" | "compact";

/** Two-state row density switch, 30px to sit in the toolbar. */
export function CompactDensityToggle({ value, onChange }: { value: Density; onChange: (d: Density) => void }) {
  const options: { id: Density; label: string }[] = [
    { id: "comfortable", label: "Comfortable" },
    { id: "compact", label: "Compact" },
  ];
  return (
    <div role="group" aria-label="Row density" className="inline-flex h-[30px] rounded-md border border-border-default bg-surface-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex items-center rounded-[5px] px-2 text-[12px] leading-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus",
            value === o.id ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Native select / input styling for dense forms (filter rows, bulk edit). */
export const fieldClass =
  "h-9 w-full min-w-0 rounded-md border border-border-default bg-surface-raised px-2.5 text-[14px] text-[var(--ink-900)] outline-none transition-colors placeholder:text-[var(--ink-500)] hover:border-[var(--ink-500)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] disabled:opacity-50 aria-invalid:border-[var(--danger)] max-md:h-11";
