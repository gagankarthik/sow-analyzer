"use client";

// The list toolbar every index page shares (docs/UI_SPEC.md §9). One row,
// every control 32px on one center line, never wrapping on desktop:
//
//   [Search 240px] [quick filters ≤4] [More filters] [n · Clear]  ⟷  [Group] [⚙] [⤓] [Table|Board]
//
// Below md it becomes: search on its own row, then one "Filters (n)" button
// that opens a bottom sheet with every filter, beside the right-hand icon
// buttons, all 44px. Between md and xl the quick filters step aside (they are
// in "More filters"), so the row still fits beside the sidebar.
//
//   <Toolbar label="Contract filters" activeCount={n} mobileSheet={<AllFilters />} mobileActions={<Icons />}>
//     <Toolbar.Search label="Search contracts" value={q} onChange={setQ} />
//     <Toolbar.Filters>{quick FilterButtons}</Toolbar.Filters>
//     <Toolbar.More>{<MoreFiltersButton> as a menu/sheet trigger}</Toolbar.More>
//     <Toolbar.Clear count={n} onClear={clear} />
//     <Toolbar.Actions>{Group, Toolbar.IconButton…, layout switch}</Toolbar.Actions>
//   </Toolbar>

import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search as SearchIcon, SlidersHorizontal, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  /** Accessible name of the toolbar region, e.g. "Contract filters". */
  label: string;
  /** Filters set (for the mobile "Filters (n)" button). */
  activeCount?: number;
  /** Everything filterable, for the mobile bottom sheet. */
  mobileSheet?: React.ReactNode;
  /** Icon buttons shown beside "Filters (n)" on phones. */
  mobileActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function ToolbarRoot({ label, activeCount = 0, mobileSheet, mobileActions, children, className }: ToolbarProps) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-col gap-2", className)}>
      {/* A size container: the quick filters show only when the whole row fits
          in the toolbar's own width (not the window's), so nothing overlaps
          beside an open sidebar. */}
      <div className="@container/toolbar flex min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center">{children}</div>
      {mobileSheet && (
        <div className="flex items-center gap-2 md:hidden">
          <MobileFilters count={activeCount}>{mobileSheet}</MobileFilters>
          {mobileActions}
        </div>
      )}
    </div>
  );
}

/** Search: 240px on desktop, full width on phones. Escape clears. */
function ToolbarSearch({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = React.useId();
  return (
    <div className="relative w-full shrink-0 md:w-60">
      <label htmlFor={id} className="sr-only">{label}</label>
      <SearchIcon size={16} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className="h-11 w-full rounded-[6px] border border-border-strong bg-surface-raised ps-8 pe-8 text-[14px] text-[var(--ink-900)] outline-none transition-colors placeholder:text-[var(--ink-500)] hover:border-[var(--ink-500)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] md:h-8 md:text-[12px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--ink-500)] hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus md:size-6"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** The quick filters (at most four). Shown only when the toolbar is wide
 *  enough for the whole row (72rem); narrower, they live in "More filters"
 *  (and in the sheet below md). They never shrink, so they never overlap. */
function ToolbarFilters({ children, always = false }: { children: React.ReactNode; /** Show from md up (a short row with no "More filters"). */ always?: boolean }) {
  return <div className={cn("hidden shrink-0 items-center gap-2", always ? "md:flex" : "@min-[72rem]/toolbar:flex")}>{children}</div>;
}

/** "More filters": the rest of the filters and the builder. */
function ToolbarMore({ children }: { children: React.ReactNode }) {
  return <div className="hidden shrink-0 items-center md:flex">{children}</div>;
}

/** "n filters · Clear", only when something is set. */
function ToolbarClear({ count, onClear, noun = "filter" }: { count: number; onClear: () => void; noun?: string }) {
  if (count <= 0) return null;
  return (
    <div className="hidden shrink-0 items-center gap-2 text-[12px] md:flex">
      <span className="tabular-nums text-[var(--ink-600)]" aria-live="polite">{count} {count === 1 ? noun : `${noun}s`}</span>
      <button type="button" onClick={onClear} className="h-8 rounded-md px-1 font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus">
        Clear
      </button>
    </div>
  );
}

/** The right-hand group, pushed right with at least 16px before it. */
function ToolbarActions({ children }: { children: React.ReactNode }) {
  return <div className="hidden shrink-0 items-center gap-2 md:ms-auto md:flex md:ps-2">{children}</div>;
}

/** A 32px icon button with a tooltip; the label is its accessible name. 44px on phones. */
const ToolbarIconButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { label: string }>(
  function ToolbarIconButton({ label, className, children, ...props }, ref) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-[6px] border border-border-strong bg-surface-raised text-[var(--ink-700)] transition-colors duration-150 hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[state=open]:bg-surface-hover md:size-8",
              className,
            )}
            {...props}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  },
);

function MobileFilters({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[6px] border bg-surface-raised text-[14px] transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            count > 0 ? "border-[var(--brand-primary-600)] text-[var(--brand-primary-700)]" : "border-border-strong text-[var(--ink-900)]",
          )}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filters{count > 0 && <span className="tabular-nums"> ({count})</span>}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] gap-0 rounded-t-xl">
        <SheetHeader className="border-b border-border-default pe-12">
          <SheetTitle className="text-[16px] font-medium">Filters</SheetTitle>
          <SheetDescription className="text-[12px] text-[var(--ink-600)]">The list updates as you change them.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export const Toolbar = Object.assign(ToolbarRoot, {
  Search: ToolbarSearch,
  Filters: ToolbarFilters,
  More: ToolbarMore,
  Clear: ToolbarClear,
  Actions: ToolbarActions,
  IconButton: ToolbarIconButton,
});
