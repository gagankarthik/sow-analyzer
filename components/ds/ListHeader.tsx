"use client";

// The one header row of a work list (Contracts, Workflow): 48px, white, a
// hairline under it. Left: the page title and the view picker. Right: the
// layout switch (icon buttons), the Filters and Display popovers, then the
// page's own actions. On narrow screens the buttons drop their words and the
// row wraps rather than scrolling.

import * as React from "react";
import Link from "next/link";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "@/components/shell/SidebarToggle";

export function ListHeader({ title, views, children }: { title: string; views?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="border-b border-border-default bg-surface-raised">
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1.5 px-[1.35rem] py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <SidebarToggle inHeader />
          <h1 className="shrink-0 px-1 text-[13px] leading-6 font-medium text-[var(--ink-900)]">{title}</h1>
          {views && (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-[var(--ink-200)]" />
              {views}
            </>
          )}
        </div>
        <div className="ms-auto flex min-w-0 items-center gap-1.5">{children}</div>
      </div>
    </header>
  );
}

/** 32px header button: icon, word (from sm), a count badge, a chevron. */
export const HeaderButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { icon?: React.ReactNode; label: string; count?: number; chevron?: boolean; showLabel?: "always" | "sm" | "lg" }
>(function HeaderButton({ icon, label, count = 0, chevron = true, showLabel = "sm", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={count > 0 ? `${label}, ${count} active` : label}
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-surface-raised px-2 text-[13px] font-medium text-[var(--ink-700)] transition-colors duration-150",
        "hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-surface-hover data-[state=open]:text-[var(--ink-900)] disabled:opacity-50 max-md:h-10",
        count > 0 && "border-[var(--brand-primary-300)] text-[var(--brand-primary-700)]",
        className,
      )}
      {...props}
    >
      {icon}
      <span className={cn(showLabel === "sm" && "max-sm:sr-only", showLabel === "lg" && "max-lg:sr-only")} aria-hidden>{label}</span>
      {count > 0 && (
        <span aria-hidden className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary-600)] px-1 text-[11px] font-semibold tabular-nums leading-none text-white">
          {count}
        </span>
      )}
      {chevron && <ChevronDown size={12} aria-hidden className="text-[var(--ink-500)] transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none max-sm:hidden" />}
    </button>
  );
});

/** A header button that opens a panel (Filters, Display). */
export function HeaderPopover({ trigger, children, label, align = "end", className, open, onOpenChange }: {
  trigger: React.ReactElement;
  children: React.ReactNode;
  /** Accessible name of the panel. */
  label: string;
  align?: "start" | "end";
  className?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          aria-label={label}
          className={cn(
            "z-50 flex max-h-[min(75vh,40rem)] w-[min(22rem,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** A titled block inside a header panel. */
export function PanelSection({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border-t border-border-default px-3 py-2.5 first:border-t-0", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-medium text-[var(--ink-600)]">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A toggle chip (Show properties): pressed = shown. */
export function ToggleChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center rounded-md border px-2 text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus max-md:h-9",
        pressed
          ? "border-[var(--brand-primary-300)] bg-[var(--brand-primary-50)] font-medium text-[var(--brand-primary-700)]"
          : "border-border-default text-[var(--ink-600)] hover:bg-surface-hover hover:text-[var(--ink-900)]",
      )}
    >
      {children}
    </button>
  );
}

/** A small segmented choice inside a panel (density, direction, phase). */
export function Segmented<V extends string>({ label, value, options, onChange }: {
  label: string;
  value: V;
  options: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-full rounded-md border border-border-default p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus max-md:h-9",
            value === o.value ? "bg-[var(--ink-100)] font-medium text-[var(--ink-900)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type LayoutItem = { id: string; label: string; href: string; icon: React.ReactNode };

/** List | Board | Spreadsheet as icon links with tooltips; the current one
 *  is filled and aria-current. */
export function LayoutToggle({ items, current }: { items: LayoutItem[]; current: string }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border-default bg-surface-raised p-0.5 max-md:h-10">
      {items.map((it) => {
        const on = it.id === current;
        return (
          <Tooltip key={it.id}>
            <TooltipTrigger asChild>
              <Link
                href={it.href}
                scroll={false}
                aria-label={`${it.label} layout`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-full w-7 items-center justify-center rounded-[5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-focus max-md:w-9",
                  on ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-500)] hover:bg-surface-hover hover:text-[var(--ink-900)]",
                )}
              >
                {it.icon}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">{it.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** The header row before data: the real title, placeholders for the rest. */
export function ListHeaderSkeleton({ title }: { title: string }) {
  return (
    <ListHeader title={title} views={<span aria-hidden className="inline-block h-4 w-24 animate-pulse rounded bg-[var(--ink-100)] motion-reduce:animate-none" />}>
      {["w-52 max-lg:hidden", "w-[5.5rem]", "w-20", "w-20", "w-32"].map((w, i) => (
        <span key={i} aria-hidden className={cn("h-8 animate-pulse rounded-md bg-[var(--ink-100)] motion-reduce:animate-none max-md:h-10", w)} />
      ))}
    </ListHeader>
  );
}
