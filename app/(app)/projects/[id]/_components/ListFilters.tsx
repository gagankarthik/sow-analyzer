"use client";

// One filter toolbar for every list inside a project (clauses, versions,
// changes, timeline events, parties, members, documents), on the shared ds
// Toolbar (UI_SPEC section 9): one 32px row (search 240px, [Label │ Value ▾]
// quick filters, count + Clear, sort on the right); below md a search row and
// a "Filters (n)" sheet. It only renders controls and counts; each page owns
// its filter state and does the actual filtering.

import { Search, X } from "@/components/ui/icons";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterButtonTrigger, RadioFilterButton } from "@/components/ds/FilterButton";
import { Toolbar } from "@/components/ds/Toolbar";
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
  /** Kept for compatibility: every group now renders as one quick filter. */
  as?: "chips" | "select";
  /** Kept for compatibility: the "no filter" entry always reads "Any". */
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

const NUMBER = new Intl.NumberFormat("en-US");

export function activeFilterCount(search: string, groups: FilterGroup[] = []): number {
  return (search.trim() ? 1 : 0) + groups.filter((g) => g.value !== ALL).length;
}

export function ListFilters({ search, onSearch, placeholder, groups = [], sort, shown, total, noun, onClear, className }: Props) {
  const active = activeFilterCount(search, groups);
  const visibleGroups = groups.filter((g) => g.options.length > 1 || g.value !== ALL);
  const filtersSet = groups.filter((g) => g.value !== ALL).length;
  const quick = visibleGroups.map((g) => (
    <RadioFilterButton
      key={g.id}
      label={g.label}
      value={g.value}
      anyValue={ALL}
      onChange={g.onChange}
      options={[
        { value: ALL, label: "Any" },
        ...g.options.map((o) => ({
          value: o.value,
          label: typeof o.count === "number" ? `${o.label} (${NUMBER.format(o.count)})` : o.label,
        })),
      ]}
    />
  ));
  const sortButton = sort ? <SortButton sort={sort} /> : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Toolbar
        label={`Filter ${noun}`}
        activeCount={filtersSet}
        mobileSheet={quick.length > 0 || sortButton ? <div className="flex flex-col items-start gap-3">{quick.length > 0 ? quick : sortButton}</div> : undefined}
        mobileActions={quick.length > 0 ? sortButton : undefined}
      >
        <Toolbar.Search label={placeholder} placeholder={placeholder} value={search} onChange={onSearch} />
        {quick.length > 0 && <Toolbar.Filters always>{quick}</Toolbar.Filters>}
        <Toolbar.Clear count={filtersSet} onClear={onClear} />
        {sortButton && <Toolbar.Actions>{sortButton}</Toolbar.Actions>}
      </Toolbar>
      <p className="text-xs text-[var(--ink-600)]" aria-live="polite">
        <span className="tabular-nums text-foreground">{NUMBER.format(shown)}</span> of{" "}
        <span className="tabular-nums">{NUMBER.format(total)}</span> {noun}
        {active > 0 && filtersSet === 0 && (
          <button type="button" onClick={onClear} className="ml-2 rounded-sm font-medium text-[var(--brand-primary-600)] hover:underline underline-offset-2 max-md:min-h-11">
            Clear search
          </button>
        )}
      </p>
    </div>
  );
}

/** The sort choice in the toolbar's right group: [Sort │ Newest ▾], 32px. */
function SortButton({ sort }: { sort: SortControl }) {
  const current = sort.options.find((o) => o.value === sort.value)?.label ?? sort.options[0]?.label ?? "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterButtonTrigger label="Sort" value={current} className="max-md:h-11" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup value={sort.value} onValueChange={sort.onChange}>
          {sort.options.map((o) => <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Nothing matches these filters": distinct from a list that is genuinely empty. */
export function NoResults({ noun, onClear }: { noun: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-10 text-center">
      <Search size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
      <p className="text-sm font-semibold text-foreground">No {noun} match these filters</p>
      <p className="mt-1 text-sm text-[var(--ink-600)]">Try a different search or remove a filter.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--ink-300)] bg-card px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted max-md:h-11"
      >
        <X size={16} aria-hidden />Clear filters
      </button>
    </div>
  );
}
