"use client";

// The filter builder: rows of [field] [operator] [value], matched All or
// Any. Changes apply to the table as they are made; an unfinished row
// (no value yet) is skipped, so the list never empties mid-edit. The rules
// themselves are evaluated by lib/govern/filter-rules.ts.

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Check, ChevronDown, Plus, X } from "@/components/ui/icons";
import { MoreFiltersButton } from "@/components/ds/FilterButton";
import {
  FILTER_FIELDS, countActiveRules, emptyValueFor, fieldById, needsValue, newRule, operatorsFor, withOperator,
  type FilterFieldId, type FilterOp, type FilterOption,
} from "@/lib/govern/filter-rules";
import { VIEW_LIMITS, type FilterGroup, type FilterRule } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { fieldClass } from "./controls";

export type FilterSuggestions = Partial<Record<FilterFieldId, string[]>>;

/** "More filters": the toolbar button and its right-hand sheet with the
 *  builder. `children`: filters kept outside the rules (a date range), shown
 *  above them; `extraActive` counts those that are set. */
export function AdvancedFilters({ value, onChange, suggestions, children, extraActive = 0 }: {
  value: FilterGroup;
  onChange: (g: FilterGroup) => void;
  suggestions: FilterSuggestions;
  children?: React.ReactNode;
  extraActive?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const n = countActiveRules(value) + extraActive;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        // Opening an empty builder starts the first row.
        if (o && value.rules.length === 0) onChange({ ...value, rules: [newRule("stage")] });
        setOpen(o);
      }}
    >
      <SheetTrigger asChild>
        <MoreFiltersButton count={n} />
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border-default pe-12">
          <SheetTitle className="text-[16px] font-medium">Filters</SheetTitle>
          <SheetDescription className="text-[12px] text-[var(--ink-600)]">The table updates as you change a filter.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
          <FilterRulesEditor value={value} onChange={onChange} suggestions={suggestions} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** The rows themselves (also used in the mobile Filters sheet). */
export function FilterRulesEditor({ value, onChange, suggestions, onDone }: {
  value: FilterGroup;
  onChange: (g: FilterGroup) => void;
  suggestions: FilterSuggestions;
  onDone?: () => void;
}) {
  const fieldRefs = React.useRef<(HTMLSelectElement | null)[]>([]);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const focusIndex = React.useRef<number | null>(null);
  const listId = React.useId();

  React.useEffect(() => {
    if (focusIndex.current === null) return;
    const el = fieldRefs.current[focusIndex.current];
    focusIndex.current = null;
    (el ?? addRef.current)?.focus();
  });

  const setRule = (i: number, rule: FilterRule) => onChange({ ...value, rules: value.rules.map((r, j) => (j === i ? rule : r)) });
  const remove = (i: number) => {
    focusIndex.current = Math.min(i, value.rules.length - 2);
    onChange({ ...value, rules: value.rules.filter((_, j) => j !== i) });
  };
  const add = () => {
    focusIndex.current = value.rules.length;
    onChange({ ...value, rules: [...value.rules, newRule("stage")] });
  };
  const full = value.rules.length >= VIEW_LIMITS.rules;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--ink-600)]">
        <label htmlFor={`${listId}-match`}>Matches</label>
        <select
          id={`${listId}-match`}
          value={value.match}
          onChange={(e) => onChange({ ...value, match: e.target.value === "any" ? "any" : "all" })}
          className={cn(fieldClass, "h-[30px] w-auto text-[12px] max-md:h-11")}
        >
          <option value="all">All filters</option>
          <option value="any">Any filter</option>
        </select>
      </div>

      {value.rules.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-default px-3 py-4 text-[14px] text-[var(--ink-600)]">
          No filters. Add one to narrow the list.
        </p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Filter rules">
          {value.rules.map((rule, i) => (
            <RuleRow
              key={i}
              index={i}
              rule={rule}
              onChange={(r) => setRule(i, r)}
              onRemove={() => remove(i)}
              fieldRef={(el) => { fieldRefs.current[i] = el; }}
              suggestions={suggestions}
              idBase={`${listId}-${i}`}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-3">
        <div className="flex items-center gap-2">
          <button
            ref={addRef}
            type="button"
            onClick={add}
            disabled={full}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[var(--brand-primary-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50 max-md:h-11"
          >
            <Plus size={12} aria-hidden />
            Add filter
          </button>
          {full && <span className="text-[12px] text-[var(--ink-600)]">Up to {VIEW_LIMITS.rules} filters.</span>}
          {value.rules.length > 0 && (
            <button
              type="button"
              onClick={() => { focusIndex.current = 0; onChange({ ...value, rules: [] }); }}
              className="inline-flex h-[30px] items-center rounded-md px-2 text-[12px] text-[var(--ink-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus max-md:h-11"
            >
              Remove all
            </button>
          )}
        </div>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-[30px] items-center rounded-md border border-border-default bg-surface-raised px-3 text-[12px] font-medium text-[var(--ink-900)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus max-md:h-11"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

function RuleRow({ index, rule, onChange, onRemove, fieldRef, suggestions, idBase }: {
  index: number;
  rule: FilterRule;
  onChange: (r: FilterRule) => void;
  onRemove: () => void;
  fieldRef: (el: HTMLSelectElement | null) => void;
  suggestions: FilterSuggestions;
  idBase: string;
}) {
  const field = fieldById(rule.field) ?? FILTER_FIELDS[0];
  const ops = operatorsFor(field);
  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_9rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="sr-only">Filter {index + 1}</span>
      <select
        ref={fieldRef}
        aria-label={`Filter ${index + 1}: field`}
        value={field.id}
        onChange={(e) => onChange(newRule(e.target.value as FilterFieldId))}
        className={cn(fieldClass, "max-sm:col-span-1")}
      >
        {FILTER_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${field.label}`}
        className="inline-flex size-9 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus max-md:size-11 sm:order-last"
      >
        <X size={16} aria-hidden />
      </button>
      <select
        aria-label={`Filter ${index + 1}: condition`}
        value={rule.op}
        onChange={(e) => onChange(withOperator(rule, e.target.value as FilterOp))}
        className={cn(fieldClass, "max-sm:col-span-2")}
      >
        {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
      </select>
      <div className="min-w-0 max-sm:col-span-2">
        <ValueInput rule={rule} onChange={onChange} suggestions={suggestions[field.id as FilterFieldId]} id={`${idBase}-value`} label={`Filter ${index + 1}: value`} />
      </div>
    </li>
  );
}

function ValueInput({ rule, onChange, suggestions, id, label }: {
  rule: FilterRule; onChange: (r: FilterRule) => void; suggestions?: string[]; id: string; label: string;
}) {
  const field = fieldById(rule.field);
  if (!field || !needsValue(rule.op)) return <span aria-hidden className="hidden sm:block" />;
  const set = (value: unknown) => onChange({ ...rule, value });

  if (rule.op === "within_next_days") {
    return (
      <span className="flex items-center gap-2">
        <input
          id={id}
          aria-label={`${label} (days)`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={typeof rule.value === "number" ? rule.value : ""}
          onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          className={cn(fieldClass, "w-24 tabular-nums")}
        />
        <span className="text-[14px] text-[var(--ink-600)]">days</span>
      </span>
    );
  }
  switch (field.type) {
    case "enum":
      return (
        <EnumPicker
          label={label}
          options={field.options ?? []}
          selected={Array.isArray(rule.value) ? (rule.value as string[]) : []}
          onChange={(v) => set(v)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          aria-label={label}
          type="number"
          inputMode="decimal"
          value={typeof rule.value === "number" ? rule.value : ""}
          onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="Number"
          className={cn(fieldClass, "tabular-nums")}
        />
      );
    case "date":
      return (
        <input
          id={id}
          aria-label={label}
          type="date"
          value={typeof rule.value === "string" ? rule.value : ""}
          onChange={(e) => set(e.target.value)}
          className={cn(fieldClass, "tabular-nums")}
        />
      );
    default: {
      const listId = `${id}-suggestions`;
      return (
        <>
          <input
            id={id}
            aria-label={label}
            type="text"
            value={typeof rule.value === "string" ? rule.value : String(emptyValueFor(field.type, rule.op) ?? "")}
            onChange={(e) => set(e.target.value)}
            placeholder={field.id === "owner" ? "name@example.edu" : "Text"}
            list={suggestions?.length ? listId : undefined}
            autoComplete="off"
            className={fieldClass}
          />
          {suggestions && suggestions.length > 0 && (
            <datalist id={listId}>
              {suggestions.slice(0, 200).map((s) => <option key={s} value={s} />)}
            </datalist>
          )}
        </>
      );
    }
  }
}

/** Multi-choice for enum fields: a button that opens a checklist. */
function EnumPicker({ label, options, selected, onChange }: {
  label: string; options: FilterOption[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const first = options.find((o) => o.value === selected[0])?.label;
  const summary = selected.length === 0 ? "Choose…" : selected.length === 1 ? first : `${first} +${selected.length - 1}`;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={`${label}: ${selected.length === 0 ? "none chosen" : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ")}`}
        className={cn(fieldClass, "group flex items-center justify-between gap-2 text-start", selected.length === 0 && "text-[var(--ink-500)]")}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-[var(--ink-500)] transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="z-50 w-64 rounded-lg border border-border-default bg-surface-raised p-1 shadow-lg"
        >
          <div role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-72 overflow-y-auto overscroll-contain">
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-[14px] hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none max-md:min-h-11"
                >
                  <span aria-hidden className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white" : "border-[var(--ink-300)] bg-surface-raised")}>
                    {on && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
