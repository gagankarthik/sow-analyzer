"use client";

// The header's Filters panel for Contracts: the search (inside the panel
// below lg, where the header has no room for it), then Stage, Owner, Type,
// Risk and Received as checkable sections, then the rule builder for
// anything else. Every change applies at once; "Clear all" resets the
// search, the quick filters, the date range and the rules together.

import * as React from "react";
import { DateRangeFilter, type DateRange } from "@/components/ds/DateRangeFilter";
import { HeaderButton, HeaderPopover } from "@/components/ds/ListHeader";
import { StageIcon } from "@/components/govern/StageIcon";
import { RiskBars } from "@/components/govern/PropertyChip";
import { CheckRow, Collapsible, SearchField } from "@/components/ds/PanelControls";
import { ListFilter } from "@/components/ui/icons";
import { countActiveRules, fieldById, quickValues, setQuickValues, type FilterFieldId } from "@/lib/govern/filter-rules";
import type { FilterGroup, Stage } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilterRulesEditor, type FilterSuggestions } from "./FilterBuilder";

export type OwnerOption = { email: string; label: string };

export function FiltersPanel(p: {
  filters: FilterGroup;
  onFilters: (f: FilterGroup) => void;
  q: string;
  onQ: (q: string) => void;
  searchLabel: string;
  owners: OwnerOption[];
  me: string | null;
  suggestions: FilterSuggestions;
  received: DateRange | null;
  onReceived: (r: DateRange | null) => void;
  onClear: () => void;
}) {
  const rules = countActiveRules(p.filters);
  const active = rules + (p.received ? 1 : 0);
  const total = active + (p.q.trim() ? 1 : 0);
  return (
    <HeaderPopover
      label="Filters"
      className="w-[min(38rem,calc(100vw-24px))]"
      trigger={<HeaderButton icon={<ListFilter size={16} aria-hidden />} label="Filters" count={active} />}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="border-b border-border-default p-2 lg:hidden">
          <SearchField label={p.searchLabel} value={p.q} onChange={p.onQ} />
        </div>
        <div className="grid sm:grid-cols-2">
          <div className="flex min-w-0 flex-col sm:border-e sm:border-border-default">
            <Group title="Stage" field="stage" filters={p.filters} onChange={p.onFilters} defaultOpen
              icon={(v) => <StageIcon stage={v as Stage} size={14} />} />
            <Group title="Risk" field="risk" filters={p.filters} onChange={p.onFilters} defaultOpen
              icon={(v) => <RiskBars risk={v === "none" ? null : (v as RiskLevel)} />} />
          </div>
          <div className="flex min-w-0 flex-col">
            <OwnerGroup filters={p.filters} onChange={p.onFilters} owners={p.owners} me={p.me} />
            <Group title="Type" field="agreementType" filters={p.filters} onChange={p.onFilters} scroll />
            <Collapsible title="Received" count={p.received ? 1 : 0} defaultOpen={!!p.received}>
              <div className="px-3 pb-2.5">
                <DateRangeFilter label="Received" value={p.received} onChange={p.onReceived} />
              </div>
            </Collapsible>
          </div>
        </div>
        <Collapsible title="Rules" count={rules} defaultOpen={rules > 0} className="border-t border-border-default">
          <div className="px-3 pb-3">
            <FilterRulesEditor value={p.filters} onChange={p.onFilters} suggestions={p.suggestions} />
          </div>
        </Collapsible>
      </div>
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border-default px-3 text-[12px] text-[var(--ink-600)]">
        <span aria-live="polite">{total === 0 ? "No filters" : `${total} ${total === 1 ? "filter" : "filters"} on`}</span>
        <button
          type="button"
          onClick={p.onClear}
          disabled={total === 0}
          className="inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-[var(--brand-primary-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus disabled:text-[var(--ink-500)] disabled:hover:bg-transparent"
        >
          Clear all
        </button>
      </div>
    </HeaderPopover>
  );
}

/* ─── Sections ───────────────────────────────────────────────────── */

function Group({ title, field, filters, onChange, icon, defaultOpen, scroll }: {
  title: string;
  field: FilterFieldId;
  filters: FilterGroup;
  onChange: (f: FilterGroup) => void;
  icon?: (value: string) => React.ReactNode;
  defaultOpen?: boolean;
  scroll?: boolean;
}) {
  const values = quickValues(filters, field);
  const options = fieldById(field)?.options ?? [];
  const toggle = (v: string) => onChange(setQuickValues(filters, field, values.includes(v) ? values.filter((x) => x !== v) : [...values, v]));
  return (
    <Collapsible title={title} count={values.length} defaultOpen={defaultOpen || values.length > 0}>
      <div role="group" aria-label={title} className={cn("flex flex-col px-1 pb-2", scroll && "max-h-48 overflow-y-auto")}>
        {options.map((o) => (
          <CheckRow key={o.value} checked={values.includes(o.value)} onChange={() => toggle(o.value)} icon={icon?.(o.value)}>
            {o.label}
          </CheckRow>
        ))}
      </div>
    </Collapsible>
  );
}

function OwnerGroup({ filters, onChange, owners, me }: { filters: FilterGroup; onChange: (f: FilterGroup) => void; owners: OwnerOption[]; me: string | null }) {
  const value = quickValues(filters, "owner")[0] ?? "";
  const name = React.useId();
  const set = (v: string) => onChange(setQuickValues(filters, "owner", v ? [v] : []));
  return (
    <Collapsible title="Owner" count={value ? 1 : 0} defaultOpen>
      <div role="radiogroup" aria-label="Owner" className="flex max-h-48 flex-col overflow-y-auto px-1 pb-2">
        <CheckRow type="radio" name={name} checked={!value} onChange={() => set("")}>Any owner</CheckRow>
        {me && <CheckRow type="radio" name={name} checked={value === me} onChange={() => set(me)}>Me</CheckRow>}
        {owners.filter((o) => o.email !== me).map((o) => (
          <CheckRow key={o.email} type="radio" name={name} checked={value === o.email} onChange={() => set(o.email)}>{o.label}</CheckRow>
        ))}
      </div>
    </Collapsible>
  );
}
