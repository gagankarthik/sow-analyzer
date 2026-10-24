"use client";

// Controls inside a header panel (Filters): the search field, a collapsible
// section with a count of what is chosen in it, and a 32px checkable row
// (checkbox or radio) with an optional leading icon.

import * as React from "react";
import { ChevronDown, Search } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function SearchField({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  const id = React.useId();
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={16} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder="Search contracts"
        autoComplete="off"
        className="h-8 w-full rounded-md border border-border-default bg-surface-raised ps-8 pe-2 text-[13px] text-[var(--ink-900)] outline-none transition-colors placeholder:text-[var(--ink-500)] hover:border-[var(--ink-300)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] max-md:h-10"
      />
    </div>
  );
}

export function Collapsible({ title, count = 0, defaultOpen = false, className, children }: {
  title: string; count?: number; defaultOpen?: boolean; className?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <section className={cn("border-b border-border-default last:border-b-0", className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full items-center gap-1.5 px-3 text-start text-[12px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus max-md:h-11"
        >
          <ChevronDown size={12} aria-hidden className={cn("shrink-0 transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")} />
          <span className="flex-1">{title}</span>
          {count > 0 && <span className="rounded-full bg-[var(--brand-primary-50)] px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums text-[var(--brand-primary-700)]">{count}<span className="sr-only"> chosen</span></span>}
        </button>
      </h3>
      <div id={id} hidden={!open}>{children}</div>
    </section>
  );
}

export function CheckRow({ type = "checkbox", name, checked, onChange, icon, children }: {
  type?: "checkbox" | "radio"; name?: string; checked: boolean; onChange: () => void; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <label className="flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] text-[var(--ink-900)] hover:bg-surface-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus max-md:h-11">
      <input type={type} name={name} checked={checked} onChange={onChange} className="size-3.5 shrink-0 accent-[var(--brand-primary-600)] focus-visible:outline-none" />
      {icon && <span className="inline-flex w-4 shrink-0 justify-center">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </label>
  );
}
