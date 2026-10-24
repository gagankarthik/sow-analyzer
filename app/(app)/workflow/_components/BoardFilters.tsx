"use client";

// The board's Filters panel in the header: the search (inside the panel
// below lg), Status (open or all), then Type, party, Risk, Department,
// Reviewer and Value, one choice each. Changes apply at once; "Clear all"
// resets everything but the search, as before.

import { HeaderButton, HeaderPopover } from "@/components/ds/ListHeader";
import { CheckRow, Collapsible, SearchField } from "@/components/ds/PanelControls";
import { RiskBars } from "@/components/govern/PropertyChip";
import { ListFilter } from "@/components/ui/icons";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import { NO_FILTERS, VALUE_BAND_LABEL, type ContractFilters, type ValueBand } from "@/lib/govern/metrics";
import { useAgreementTypes, useEditionTerms } from "@/lib/govern/queries";
import type { RiskLevel } from "@/lib/types";

const RISK_LABEL: Record<Exclude<ContractFilters["risk"], "all">, string> = {
  needs_attention: "Needs attention",
  high: "High risk",
  critical: "Highest risk only",
};
const RISK_ICON: Record<Exclude<ContractFilters["risk"], "all">, RiskLevel | null> = {
  needs_attention: "medium", high: "high", critical: "critical",
};

const ALL = "all";
type Key = Exclude<keyof ContractFilters, "q">;
type Option = { value: string; label: string };

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
  const dims: { key: Key; label: string; options: Option[]; scroll?: boolean; icon?: (v: string) => React.ReactNode }[] = [
    { key: "agreementType", label: "Type", scroll: true, options: agreementTypes.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] })) },
    { key: "sponsor", label: terms.party, scroll: true, options: options.sponsors.map((s) => ({ value: s, label: s })) },
    {
      key: "risk", label: "Risk",
      options: (Object.keys(RISK_LABEL) as (keyof typeof RISK_LABEL)[]).map((r) => ({ value: r, label: RISK_LABEL[r] })),
      icon: (v) => <RiskBars risk={RISK_ICON[v as keyof typeof RISK_ICON] ?? null} />,
    },
    { key: "department", label: "Department", scroll: true, options: options.departments.map((d) => ({ value: d, label: d })) },
    { key: "reviewer", label: "Reviewer", scroll: true, options: options.reviewers.map((r) => ({ value: r.email, label: r.name })) },
    {
      key: "valueBand", label: "Value",
      options: (Object.keys(VALUE_BAND_LABEL) as ValueBand[]).filter((b) => b !== ALL).map((b) => ({ value: b, label: VALUE_BAND_LABEL[b] })),
    },
  ];
  const count = activeFilterCount(filters) + (showClosed ? 1 : 0);
  const total = count + (filters.q.trim() ? 1 : 0);
  const clear = () => {
    onChange({ ...NO_FILTERS, q: filters.q });
    onShowClosedChange(false);
  };
  const half = Math.ceil((dims.length + 1) / 2);
  const sections = [
    <Collapsible key="status" title="Status" count={showClosed ? 1 : 0} defaultOpen>
      <div role="radiogroup" aria-label="Status" className="flex flex-col px-1 pb-2">
        <CheckRow type="radio" name="wf-status" checked={!showClosed} onChange={() => onShowClosedChange(false)}>Open</CheckRow>
        <CheckRow type="radio" name="wf-status" checked={showClosed} onChange={() => onShowClosedChange(true)}>All, including closed</CheckRow>
      </div>
    </Collapsible>,
    ...dims.map((d) => (
      <Collapsible key={d.key} title={d.label} count={filters[d.key] !== ALL ? 1 : 0} defaultOpen={d.key === "risk" || filters[d.key] !== ALL}>
        <div role="radiogroup" aria-label={d.label} className={d.scroll ? "flex max-h-48 flex-col overflow-y-auto px-1 pb-2" : "flex flex-col px-1 pb-2"}>
          <CheckRow type="radio" name={`wf-${d.key}`} checked={filters[d.key] === ALL} onChange={() => set(d.key, ALL)}>Any</CheckRow>
          {d.options.length === 0 && <p className="px-2 py-1.5 text-[12px] text-[var(--ink-600)]">No options yet</p>}
          {d.options.map((o) => (
            <CheckRow key={o.value} type="radio" name={`wf-${d.key}`} checked={filters[d.key] === o.value} onChange={() => set(d.key, o.value)} icon={d.icon?.(o.value)}>
              {o.label}
            </CheckRow>
          ))}
        </div>
      </Collapsible>
    )),
  ];

  return (
    <HeaderPopover
      label="Filters"
      className="w-[min(34rem,calc(100vw-24px))]"
      trigger={<HeaderButton icon={<ListFilter size={16} aria-hidden />} label="Filters" count={count} />}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="border-b border-border-default p-2 lg:hidden">
          <SearchField label="Search agreements" value={filters.q} onChange={(v) => onChange({ ...filters, q: v })} />
        </div>
        <div className="grid sm:grid-cols-2">
          <div className="flex min-w-0 flex-col sm:border-e sm:border-border-default">{sections.slice(0, half)}</div>
          <div className="flex min-w-0 flex-col">{sections.slice(half)}</div>
        </div>
      </div>
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border-default px-3 text-[12px] text-[var(--ink-600)]">
        <span aria-live="polite">{total === 0 ? "No filters" : `${total} ${total === 1 ? "filter" : "filters"} on`}</span>
        <button
          type="button"
          onClick={clear}
          disabled={count === 0}
          className="inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-[var(--brand-primary-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus disabled:text-[var(--ink-500)] disabled:hover:bg-transparent"
        >
          Clear all
        </button>
      </div>
    </HeaderPopover>
  );
}
