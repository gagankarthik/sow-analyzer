"use client";

// The Contracts toolbar, built on the shared Toolbar (docs/UI_SPEC.md §9):
// search, four quick filters (Stage, Owner, Type, Risk), More filters (the
// builder), the active count with Clear; right: Group, column settings (with
// row density), export, Table / Board. Phones get search plus one Filters
// sheet that holds everything, including sort.

import * as React from "react";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnSettings, type ColumnSetting } from "@/components/ds/ColumnSettings";
import { FilterButton } from "@/components/ds/FilterButton";
import { Toolbar } from "@/components/ds/Toolbar";
import { Download, Layers } from "@/components/ui/icons";
import { countActiveRules, fieldById, quickValues, setQuickValues, type FilterFieldId } from "@/lib/govern/filter-rules";
import { GROUP_BY_OPTIONS, type ListSettings } from "@/lib/govern/list-views";
import type { FilterGroup } from "@/lib/govern/types";
import { AdvancedFilters, FilterRulesEditor, type FilterSuggestions } from "./FilterBuilder";
import { fieldClass } from "./controls";

export type SortOption = { id: string; label: string };
export type OwnerOption = { email: string; label: string };

export type ListToolbarProps = {
  settings: ListSettings;
  onSettings: (patch: Partial<ListSettings>) => void;
  q: string;
  onQ: (q: string) => void;
  searchLabel: string;
  owners: OwnerOption[];
  me: string | null;
  suggestions: FilterSuggestions;
  sortOptions: SortOption[];
  columns: ColumnSetting[];
  onClear: () => void;
  exports: { csv: () => void; excel: () => void; busy: boolean } | null;
  /** Quick filters kept by the page rather than the saved view (a date range). */
  extraFilters?: React.ReactNode;
  /** How many of those are set, for the clear button. */
  extraActive?: number;
};

export function ListToolbar(p: ListToolbarProps) {
  const filters = p.settings.filters;
  const setFilters = (f: FilterGroup) => p.onSettings({ filters: f });
  const hidden = React.useMemo(() => new Set(p.settings.columns.hidden), [p.settings.columns.hidden]);
  const setHidden = (id: string, hide: boolean) =>
    p.onSettings({ columns: { ...p.settings.columns, hidden: hide ? [...new Set([...p.settings.columns.hidden, id])] : p.settings.columns.hidden.filter((x) => x !== id) } });
  const setOrder = (order: string[]) => p.onSettings({ columns: { ...p.settings.columns, order } });
  const active = countActiveRules(filters) + (p.q.trim() ? 1 : 0) + (p.extraActive ?? 0);

  const columnSettings = (
    <ColumnSettings
      columns={p.columns}
      hidden={hidden}
      onHiddenChange={setHidden}
      onOrderChange={setOrder}
      density={p.settings.density}
      onDensityChange={(density) => p.onSettings({ density })}
    />
  );
  const exportMenu = p.exports && <ExportMenu {...p.exports} />;

  return (
    <Toolbar
      label="Contract filters"
      activeCount={countActiveRules(filters)}
      mobileSheet={<MobileSheet {...p} />}
      mobileActions={exportMenu}
    >
      <Toolbar.Search label={p.searchLabel} placeholder="Search contracts" value={p.q} onChange={p.onQ} />
      <Toolbar.Filters>
        <QuickChoice field="stage" filters={filters} onChange={setFilters} />
        <QuickOwner filters={filters} onChange={setFilters} owners={p.owners} me={p.me} />
        <QuickChoice field="agreementType" label="Type" filters={filters} onChange={setFilters} />
        <QuickChoice field="risk" label="Risk" filters={filters} onChange={setFilters} />
        {p.extraFilters}
      </Toolbar.Filters>
      <Toolbar.More>
        <AdvancedFilters value={filters} onChange={setFilters} suggestions={p.suggestions} />
      </Toolbar.More>
      <Toolbar.Clear count={active} onClear={p.onClear} />
      <Toolbar.Actions>
        <GroupMenu value={p.settings.groupBy} onChange={(groupBy) => p.onSettings({ groupBy })} />
        {columnSettings}
        {exportMenu}
      </Toolbar.Actions>
    </Toolbar>
  );
}

/* ─── Quick filters ──────────────────────────────────────────────── */

function QuickChoice({ field, label, filters, onChange }: { field: FilterFieldId; label?: string; filters: FilterGroup; onChange: (f: FilterGroup) => void }) {
  const def = fieldById(field)!;
  const name = label ?? def.label;
  const values = quickValues(filters, field);
  const options = def.options ?? [];
  const first = options.find((o) => o.value === values[0])?.label;
  const summary = values.length === 0 ? undefined : values.length === 1 ? first : `${first} +${values.length - 1}`;
  const toggle = (v: string, on: boolean) => onChange(setQuickValues(filters, field, on ? [...values, v] : values.filter((x) => x !== v)));
  return (
    <FilterButton label={name} value={summary} onClear={() => onChange(setQuickValues(filters, field, []))}>
      {options.map((o) => (
        <DropdownMenuCheckboxItem key={o.value} checked={values.includes(o.value)} onCheckedChange={(on) => toggle(o.value, on === true)} onSelect={(e) => e.preventDefault()}>
          {o.label}
        </DropdownMenuCheckboxItem>
      ))}
    </FilterButton>
  );
}

function QuickOwner({ filters, onChange, owners, me }: { filters: FilterGroup; onChange: (f: FilterGroup) => void; owners: OwnerOption[]; me: string | null }) {
  const value = quickValues(filters, "owner")[0] ?? "";
  const summary = !value ? undefined : value === me ? "Me" : owners.find((o) => o.email === value)?.label ?? value;
  return (
    <FilterButton label="Owner" value={summary} onClear={() => onChange(setQuickValues(filters, "owner", []))} menuClassName="w-64">
      <DropdownMenuRadioGroup value={value || "any"} onValueChange={(v) => onChange(setQuickValues(filters, "owner", v === "any" ? [] : [v]))}>
        <DropdownMenuRadioItem value="any">Any owner</DropdownMenuRadioItem>
        {me && <DropdownMenuRadioItem value={me}>Me</DropdownMenuRadioItem>}
        {owners.filter((o) => o.email !== me).map((o) => (
          <DropdownMenuRadioItem key={o.email} value={o.email}>
            <span className="truncate">{o.label}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </FilterButton>
  );
}

function GroupMenu({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const label = GROUP_BY_OPTIONS.find((o) => o.id === value)?.label;
  return (
    <FilterButton label="Group" icon={<Layers size={12} aria-hidden />} value={label ?? "None"} active={!!value} onClear={() => onChange(null)} align="end" menuClassName="w-52">
      <DropdownMenuRadioGroup value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
        {GROUP_BY_OPTIONS.map((o) => <DropdownMenuRadioItem key={o.id} value={o.id}>{o.label}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </FilterButton>
  );
}

/* ─── Export ─────────────────────────────────────────────────────── */

function ExportMenu({ csv, excel, busy }: { csv: () => void; excel: () => void; busy: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toolbar.IconButton label={busy ? "Exporting…" : "Export"} disabled={busy}>
          <Download size={16} aria-hidden />
        </Toolbar.IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={csv}>
          <span className="flex flex-col">
            <span>CSV</span>
            <span className="text-[12px] text-[var(--ink-600)]">The columns shown, in their order</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={excel}>
          <span className="flex flex-col">
            <span>Excel</span>
            <span className="text-[12px] text-[var(--ink-600)]">Every field, for reporting</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Phones: everything in one sheet ────────────────────────────── */

function MobileSheet(p: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-600)]">
          Group by
          <select value={p.settings.groupBy ?? ""} onChange={(e) => p.onSettings({ groupBy: e.target.value || null })} className={fieldClass}>
            <option value="">None</option>
            {GROUP_BY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-600)]">
          Sort by
          <select
            value={p.settings.sort ? `${p.settings.sort.key}:${p.settings.sort.dir}` : ""}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              p.onSettings({ sort: key ? { key, dir: dir === "asc" ? "asc" : "desc" } : null });
            }}
            className={fieldClass}
          >
            <option value="">None</option>
            {p.sortOptions.flatMap((o) => [
              <option key={`${o.id}:desc`} value={`${o.id}:desc`}>{o.label}, high to low</option>,
              <option key={`${o.id}:asc`} value={`${o.id}:asc`}>{o.label}, low to high</option>,
            ])}
          </select>
        </label>
      </div>
      <FilterRulesEditor value={p.settings.filters} onChange={(filters) => p.onSettings({ filters })} suggestions={p.suggestions} />
    </div>
  );
}
