"use client";

// Search is always there and needs nothing else (Requirement 5); the filters
// (Requirement 3) sit folded away until someone asks for them.

import { SearchField } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Filter, X } from "@/components/ui/icons";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import { NO_FILTERS, VALUE_BAND_LABEL, type ContractFilters, type ValueBand } from "@/lib/govern/metrics";
import { cn } from "@/lib/utils";

const RISK_LABEL: Record<ContractFilters["risk"], string> = {
  all: "Any risk",
  needs_attention: "Needs attention",
  high: "High risk",
  critical: "Highest risk only",
};

const ALL = "all";

export interface FilterOptions {
  departments: string[];
  sponsors: string[];
  reviewers: { email: string; name: string }[];
}

export function BoardFilters({
  filters, onChange, options, open, onOpenChange, showClosed, onShowClosedChange,
}: {
  filters: ContractFilters;
  onChange: (f: ContractFilters) => void;
  options: FilterOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showClosed: boolean;
  onShowClosedChange: (v: boolean) => void;
}) {
  const set = <K extends keyof ContractFilters>(key: K, value: ContractFilters[K]) => onChange({ ...filters, [key]: value });
  const activeCount = (Object.keys(NO_FILTERS) as (keyof ContractFilters)[])
    .filter((k) => k !== "q" && filters[k] !== NO_FILTERS[k]).length;

  return (
    <section aria-label="Search and filters" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField label="Search agreements" hideLabel placeholder="Search by title, sponsor, PI or department" value={filters.q} onChange={(v) => set("q", v)} className="flex-1 sm:max-w-md md:max-w-md" />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls="board-filters"
            onClick={() => onOpenChange(!open)}
            className="h-9"
          >
            <Filter size={14} />Filters
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary-600)] px-1.5 text-xs font-semibold text-white">{activeCount}</span>
            )}
            <ChevronDown size={14} className={cn("transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")} />
          </Button>
          {/* List scope, the standard Open | All convention: "All" adds
              closed and rejected agreements. */}
          <div role="radiogroup" aria-label="Agreements to show" className="inline-flex h-9 items-center rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
            {([
              [false, "Open", "Agreements still in progress or in force"],
              [true, "All", "Include closed and rejected agreements"],
            ] as const).map(([value, label, hint]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={showClosed === value}
                title={hint}
                onClick={() => onShowClosedChange(value)}
                className={cn(
                  "h-full rounded-md px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
                  showClosed === value ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-[var(--ink-600)] hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div id="board-filters" className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect label="Agreement type" value={filters.agreementType} onChange={(v) => set("agreementType", v as ContractFilters["agreementType"])}
            options={[{ value: ALL, label: "Any type" }, ...AGREEMENT_TYPES.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }))]} />
          <FilterSelect label="Sponsor or licensee" value={filters.sponsor} onChange={(v) => set("sponsor", v)}
            options={[{ value: ALL, label: "Any sponsor" }, ...options.sponsors.map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Department" value={filters.department} onChange={(v) => set("department", v)}
            options={[{ value: ALL, label: "Any department" }, ...options.departments.map((d) => ({ value: d, label: d }))]} />
          <FilterSelect label="Reviewer" value={filters.reviewer} onChange={(v) => set("reviewer", v)}
            options={[{ value: ALL, label: "Any reviewer" }, ...options.reviewers.map((r) => ({ value: r.email, label: r.name }))]} />
          <FilterSelect label="Value" value={filters.valueBand} onChange={(v) => set("valueBand", v as ValueBand)}
            options={(Object.keys(VALUE_BAND_LABEL) as ValueBand[]).map((b) => ({ value: b, label: VALUE_BAND_LABEL[b] }))} />
          <FilterSelect label="Risk" value={filters.risk} onChange={(v) => set("risk", v as ContractFilters["risk"])}
            options={(Object.keys(RISK_LABEL) as ContractFilters["risk"][]).map((r) => ({ value: r, label: RISK_LABEL[r] }))} />
          {activeCount > 0 && (
            <Button type="button" variant="ghost" className="justify-self-start sm:col-span-2 lg:col-span-3 xl:col-span-6" onClick={() => onChange({ ...NO_FILTERS, q: filters.q })}>
              <X size={14} />Clear filters
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const id = `filter-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-[var(--ink-600)]">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full min-w-0 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
