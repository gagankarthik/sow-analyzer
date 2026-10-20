"use client";

// Filter definitions for the index pages (Obligations, Renewals, Library,
// Projects) rendered three ways on the shared ds Toolbar (UI_SPEC section 9):
//   <QuickFilters>      [Label │ Value ▾] FilterButtons (Toolbar.Filters, wide rows)
//   <MoreFilters>       one "More filters" menu holding the same filters, shown
//                       only while the quick filters have stepped aside
//   <SheetFilters>      the phone bottom sheet: every filter as 44px rows
// plus <InViewFooter>, the "N in view" bar under a table (section 3).

import * as React from "react";
import { FilterButton, MoreFiltersButton } from "@/components/ds/FilterButton";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type IndexFilterOption = { value: string; label: string; count?: number };

export type IndexFilter = {
  id: string;
  label: string;
  options: IndexFilterOption[];
  /** Chosen values; empty = Any. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** One choice at a time (radio) instead of several (checkboxes). */
  single?: boolean;
};

const NUMBER = new Intl.NumberFormat("en-US");

/** Words for the value side of the button: "Overdue", "Overdue +1", or undefined (Any). */
function summary(f: IndexFilter): string | undefined {
  if (f.selected.length === 0) return undefined;
  const first = f.options.find((o) => o.value === f.selected[0])?.label ?? f.selected[0];
  return f.selected.length === 1 ? first : `${first} +${f.selected.length - 1}`;
}

/** Number of filters with something chosen. */
export function activeFilterCount(filters: IndexFilter[]): number {
  return filters.filter((f) => f.selected.length > 0).length;
}

function Items({ f }: { f: IndexFilter }) {
  if (f.single) {
    return (
      <DropdownMenuRadioGroup value={f.selected[0] ?? "__any"} onValueChange={(v) => f.onChange(v === "__any" ? [] : [v])}>
        <DropdownMenuRadioItem value="__any">Any</DropdownMenuRadioItem>
        {f.options.map((o) => (
          <DropdownMenuRadioItem key={o.value} value={o.value}>
            <OptionLabel o={o} />
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    );
  }
  return (
    <>
      {f.options.map((o) => (
        <DropdownMenuCheckboxItem
          key={o.value}
          checked={f.selected.includes(o.value)}
          onCheckedChange={(on) => f.onChange(on === true ? [...f.selected, o.value] : f.selected.filter((v) => v !== o.value))}
          onSelect={(e) => e.preventDefault()}
        >
          <OptionLabel o={o} />
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

function OptionLabel({ o }: { o: IndexFilterOption }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate">{o.label}</span>
      {o.count !== undefined && <span className="shrink-0 text-xs tabular-nums text-[var(--ink-500)]">{NUMBER.format(o.count)}</span>}
    </span>
  );
}

/** The quick filters as segmented FilterButtons (at most four). */
export function QuickFilters({ filters }: { filters: IndexFilter[] }) {
  return (
    <>
      {filters.slice(0, 4).map((f) => (
        <FilterButton key={f.id} label={f.label} value={summary(f)} onClear={() => f.onChange([])}>
          {f.options.length === 0 ? <p className="px-2 py-1.5 text-xs text-[var(--ink-500)]">No choices in this view</p> : <Items f={f} />}
        </FilterButton>
      ))}
    </>
  );
}

/**
 * "More filters": every filter in one menu. With `onlyWhenNarrow` (all the
 * filters are already quick filters) it hides itself once the row is wide
 * enough to show them, so nothing appears twice.
 */
export function MoreFilters({ filters, onlyWhenNarrow = true }: { filters: IndexFilter[]; onlyWhenNarrow?: boolean }) {
  const count = activeFilterCount(filters);
  if (filters.length === 0) return null;
  return (
    <span className={cn("inline-flex", onlyWhenNarrow && "@min-[72rem]/toolbar:hidden")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreFiltersButton count={count} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 w-64 overflow-y-auto">
          {filters.map((f, i) => (
            <React.Fragment key={f.id}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{f.label}</DropdownMenuLabel>
              <Items f={f} />
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** Phones: every filter as a list of 44px choices inside the Toolbar's sheet. */
export function SheetFilters({ filters, onClear }: { filters: IndexFilter[]; onClear?: () => void }) {
  const count = activeFilterCount(filters);
  return (
    <div className="flex flex-col gap-5">
      {filters.map((f) => (
        <fieldset key={f.id} className="flex min-w-0 flex-col gap-1">
          <legend className="mb-1 text-xs font-medium text-[var(--ink-600)]">{f.label}</legend>
          {f.options.length === 0 && <p className="text-sm text-[var(--ink-500)]">No choices in this view</p>}
          {f.options.map((o) => {
            const on = f.selected.includes(o.value);
            return (
              <label key={o.value} className="flex min-h-11 min-w-0 items-center gap-3 rounded-md px-1 text-sm text-foreground">
                <input
                  type={f.single ? "radio" : "checkbox"}
                  name={f.id}
                  checked={on}
                  onChange={() => f.onChange(f.single ? (on ? [] : [o.value]) : on ? f.selected.filter((v) => v !== o.value) : [...f.selected, o.value])}
                  className="size-4 shrink-0 accent-[var(--brand-primary-600)]"
                />
                <OptionLabel o={o} />
              </label>
            );
          })}
        </fieldset>
      ))}
      {count > 0 && onClear && (
        <button type="button" onClick={onClear} className="min-h-11 self-start rounded-md px-1 text-sm font-medium text-[var(--brand-primary-700)] hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */

export type FooterCell = { label: string; value: React.ReactNode; tone?: "danger" };

/** The bar under a list: "N {noun} in view" and up to three totals over those rows. */
export function InViewFooter({ count, noun, cells = [] }: { count: number; noun: [string, string]; cells?: FooterCell[] }) {
  return (
    <div
      role="status"
      aria-label={`Totals for the ${noun[1]} in view`}
      className="flex flex-wrap border-b border-border-default text-xs leading-none"
    >
      <Cell>
        <span className="font-medium tabular-nums text-[var(--ink-900)]">{NUMBER.format(count)}</span>
        <span className="text-[var(--ink-600)]">{count === 1 ? noun[0] : noun[1]} in view</span>
      </Cell>
      {cells.map((c) => (
        <Cell key={c.label}>
          <span className="text-[var(--ink-600)]">{c.label}</span>
          <span className={cn("font-medium tabular-nums", c.tone === "danger" ? "text-status-blocked-fg" : "text-[var(--ink-900)]")}>{c.value}</span>
        </Cell>
      ))}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-e border-border-default px-3 py-3 last:border-e-0">{children}</div>;
}
