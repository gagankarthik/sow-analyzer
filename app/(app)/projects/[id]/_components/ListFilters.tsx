"use client";

// One filter bar for every list inside a project (clauses, versions, changes,
// timeline events, parties, members, documents). It only renders controls and
// counts; each page owns its filter state and does the actual filtering.

import { Search, X } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Value every filter group uses for "no filter applied". */
export const ALL = "all";

export type FilterOption = { value: string; label: string; count?: number; dot?: string };

export type FilterGroup = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Chips for short option sets, a select for long ones. */
  as?: "chips" | "select";
  /** Label of the select's "no filter" entry, e.g. "All categories". */
  allLabel?: string;
};

type SortControl = { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] };

type Props = {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  groups?: FilterGroup[];
  sort?: SortControl;
  shown: number;
  total: number;
  /** Plural noun for the result count, e.g. "clauses". */
  noun: string;
  onClear: () => void;
  className?: string;
};

const CONTROL_H = "h-10 md:h-9";
const TRIGGER = "w-full shrink-0 bg-card text-sm md:data-[size=default]:h-9";

export function activeFilterCount(search: string, groups: FilterGroup[] = []): number {
  return (search.trim() ? 1 : 0) + groups.filter((g) => g.value !== ALL).length;
}

export function ListFilters({ search, onSearch, placeholder, groups = [], sort, shown, total, noun, onClear, className }: Props) {
  const active = activeFilterCount(search, groups);
  const visibleGroups = groups.filter((g) => g.options.length > 1 || g.value !== ALL);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--ink-300)] bg-card px-3 transition-shadow focus-within:border-[var(--brand-primary-600)] focus-within:ring-2 focus-within:ring-[var(--brand-primary-100)]", CONTROL_H)}>
          <Search size={15} className="shrink-0 text-muted-foreground" />
          <span className="sr-only">{placeholder}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-[var(--ink-500)]"
          />
        </label>
        {sort && (
          <Select value={sort.value} onValueChange={sort.onChange}>
            <SelectTrigger aria-label="Sort" className={cn(TRIGGER, "sm:w-[190px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {sort.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Filters: a single sideways-scrolling row on narrow screens, wrapping from md up. */}
      {visibleGroups.length > 0 && (
        <div className="-mx-1 flex items-center gap-x-4 gap-y-2 overflow-x-auto px-1 py-0.5 scrollbar-none md:flex-wrap md:overflow-visible">
          {visibleGroups.map((g) =>
            g.as === "select" ? (
              <Select key={g.id} value={g.value} onValueChange={g.onChange}>
                <SelectTrigger aria-label={g.label} className={cn(TRIGGER, "w-auto min-w-[160px]", g.value !== ALL && "border-[var(--brand-primary-600)] text-[var(--brand-primary-700)]")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{g.allLabel ?? `All ${g.label.toLowerCase()}`}</SelectItem>
                  {g.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div key={g.id} role="group" aria-label={g.label} className="flex shrink-0 items-center gap-1.5">
                <span className="mr-0.5 text-xs font-medium text-muted-foreground">{g.label}</span>
                {g.options.map((o) => {
                  const on = g.value === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => g.onChange(on ? ALL : o.value)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8",
                        "h-10",
                        on
                          ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"
                          : "border-[var(--ink-300)] bg-card text-[var(--ink-600)] hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {o.dot && <span className={cn("h-2 w-2 rounded-full", o.dot)} aria-hidden />}
                      {o.label}
                      {typeof o.count === "number" && <span className="font-semibold tabular-nums">{o.count}</span>}
                    </button>
                  );
                })}
              </div>
            ),
          )}
        </div>
      )}

      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className="text-[var(--ink-600)]" aria-live="polite">
          <span className="font-semibold tabular-nums text-foreground">{shown}</span> of <span className="tabular-nums">{total}</span> {noun}
          {active > 0 && <span className="ml-2 rounded-md bg-structure-soft px-1.5 py-0.5 text-xs font-semibold text-structure-soft-fg">{active} filter{active === 1 ? "" : "s"} active</span>}
        </p>
        {active > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center gap-1 rounded-md px-1 text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
          >
            <X size={14} />Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/** "Nothing matches these filters" — distinct from a list that is genuinely empty. */
export function NoResults({ noun, onClear }: { noun: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-10 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]"><Search size={18} /></span>
      <p className="text-base font-semibold text-foreground">No {noun} match these filters</p>
      <p className="mt-1 text-sm text-[var(--ink-600)]">Try a different search or remove a filter.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--ink-300)] bg-card px-4 text-base font-semibold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X size={14} />Clear filters
      </button>
    </div>
  );
}
