"use client";

// The Workflow toolbar (UI_SPEC section 9), the same component as the
// Contracts list: search (240px), four quick filters as [Label │ Value ▾],
// "More filters" with every dimension, then "n filters · Clear". Below md:
// search, then one "Filters (n)" button that opens a sheet with them all.

import { useAgreementTypes, useEditionTerms } from "@/lib/govern/queries";
import { Toolbar } from "@/components/ds/Toolbar";
import { FilterButton, FilterButtonTrigger, MoreFiltersButton } from "@/components/ds/FilterButton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import { NO_FILTERS, VALUE_BAND_LABEL, type ContractFilters, type ValueBand } from "@/lib/govern/metrics";

const RISK_LABEL: Record<ContractFilters["risk"], string> = {
  all: "Any",
  needs_attention: "Needs attention",
  high: "High risk",
  critical: "Highest risk only",
};

const ALL = "all";
type Key = Exclude<keyof ContractFilters, "q">;
type Option = { value: string; label: string };
type Dimension = { key: Key; label: string; options: Option[] };

export interface FilterOptions {
  departments: string[];
  sponsors: string[];
  reviewers: { email: string; name: string }[];
}

/** Filters set, besides the search text. */
export function activeFilterCount(filters: ContractFilters): number {
  return (Object.keys(NO_FILTERS) as (keyof ContractFilters)[]).filter((k) => k !== "q" && filters[k] !== NO_FILTERS[k]).length;
}

export function BoardFilters({
  filters, onChange, options, showClosed, onShowClosedChange,
}: {
  filters: ContractFilters;
  onChange: (f: ContractFilters) => void;
  options: FilterOptions;
  showClosed: boolean;
  onShowClosedChange: (v: boolean) => void;
}) {
  const terms = useEditionTerms();
  const agreementTypes = useAgreementTypes();
  const set = (key: Key, value: string) => onChange({ ...filters, [key]: value } as ContractFilters);

  const dims: Record<Key, Dimension> = {
    agreementType: { key: "agreementType", label: "Type", options: agreementTypes.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] })) },
    sponsor: { key: "sponsor", label: terms.party, options: options.sponsors.map((s) => ({ value: s, label: s })) },
    risk: {
      key: "risk", label: "Risk",
      options: (Object.keys(RISK_LABEL) as ContractFilters["risk"][]).filter((r) => r !== ALL).map((r) => ({ value: r, label: RISK_LABEL[r] })),
    },
    department: { key: "department", label: "Department", options: options.departments.map((d) => ({ value: d, label: d })) },
    reviewer: { key: "reviewer", label: "Reviewer", options: options.reviewers.map((r) => ({ value: r.email, label: r.name })) },
    valueBand: {
      key: "valueBand", label: "Value",
      options: (Object.keys(VALUE_BAND_LABEL) as ValueBand[]).filter((b) => b !== ALL).map((b) => ({ value: b, label: VALUE_BAND_LABEL[b] })),
    },
  };
  const quick: Key[] = ["agreementType", "sponsor", "risk"];
  const order: Key[] = ["agreementType", "sponsor", "risk", "department", "reviewer", "valueBand"];
  const count = activeFilterCount(filters) + (showClosed ? 1 : 0);
  const clear = () => {
    onChange({ ...NO_FILTERS, q: filters.q });
    onShowClosedChange(false);
  };
  const valueLabel = (d: Dimension) => d.options.find((o) => o.value === filters[d.key])?.label;
  const statusLabel = showClosed ? "All" : "Open";

  return (
    <Toolbar
      label="Workflow filters"
      activeCount={count}
      mobileSheet={
        <div className="flex flex-col gap-3">
          <SheetSelect
            label="Status"
            value={showClosed ? "all" : "open"}
            onChange={(v) => onShowClosedChange(v === "all")}
            options={[{ value: "open", label: "Open" }, { value: "all", label: "All, including closed" }]}
          />
          {order.map((k) => (
            <SheetSelect
              key={k}
              label={dims[k].label}
              value={filters[k]}
              onChange={(v) => set(k, v)}
              options={[{ value: ALL, label: "Any" }, ...dims[k].options]}
            />
          ))}
        </div>
      }
    >
      <Toolbar.Search label="Search agreements" placeholder="Search contracts" value={filters.q} onChange={(v) => onChange({ ...filters, q: v })} />
      <Toolbar.Filters>
        {/* Status always names its value ("Open" by default, never "Any"). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButtonTrigger label="Status" value={statusLabel} active={showClosed} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={showClosed ? "all" : "open"} onValueChange={(v) => onShowClosedChange(v === "all")}>
              <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all">All, including closed</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {quick.map((k) => (
          <FilterButton key={k} label={dims[k].label} value={valueLabel(dims[k])} active={filters[k] !== ALL} onClear={() => set(k, ALL)}>
            <RadioOptions dim={dims[k]} value={filters[k]} onChange={(v) => set(k, v)} />
          </FilterButton>
        ))}
      </Toolbar.Filters>
      <Toolbar.More>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreFiltersButton count={count} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="min-w-0 flex-1 truncate">Status</span>
                <span className="text-xs text-[var(--ink-600)]">{statusLabel}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuRadioGroup value={showClosed ? "all" : "open"} onValueChange={(v) => onShowClosedChange(v === "all")}>
                  <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="all">All, including closed</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {order.map((k) => (
              <DropdownMenuSub key={k}>
                <DropdownMenuSubTrigger>
                  <span className="min-w-0 flex-1 truncate">{dims[k].label}</span>
                  <span className="max-w-24 truncate text-xs text-[var(--ink-600)]">{valueLabel(dims[k]) ?? "Any"}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 w-60 overflow-y-auto">
                  <RadioOptions dim={dims[k]} value={filters[k]} onChange={(v) => set(k, v)} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Toolbar.More>
      <Toolbar.Clear count={count} onClear={clear} />
    </Toolbar>
  );
}

function RadioOptions({ dim, value, onChange }: { dim: Dimension; value: string; onChange: (v: string) => void }) {
  return (
    <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
      <DropdownMenuRadioItem value={ALL}>Any</DropdownMenuRadioItem>
      {dim.options.length === 0 && <p className="px-2 py-1.5 text-xs text-[var(--ink-600)]">No options yet</p>}
      {dim.options.map((o) => (
        <DropdownMenuRadioItem key={o.value} value={o.value}>
          <span className="min-w-0 truncate">{o.label}</span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** One filter in the mobile sheet: a labelled 44px select. */
function SheetSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Option[];
}) {
  const id = `wf-filter-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[var(--ink-600)]">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
