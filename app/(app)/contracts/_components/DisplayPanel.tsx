"use client";

// The header's Display panel for Contracts: how the rows are grouped and
// ordered, which properties each row shows (in the spreadsheet, which
// columns) and how dense the rows are. All of it belongs to the open view,
// so "Update this view" saves it.

import * as React from "react";
import { HeaderButton, HeaderPopover, PanelSection, Segmented, ToggleChip } from "@/components/ds/ListHeader";
import { SlidersHorizontal } from "@/components/ui/icons";
import { toggleHidden } from "@/lib/govern/list-properties";
import { GROUP_BY_OPTIONS, type ListSettings } from "@/lib/govern/list-views";
import { cn } from "@/lib/utils";
import { fieldClass } from "./controls";

export type DisplayOption = { id: string; label: string };

const DIRECTIONS: { value: "asc" | "desc"; label: string }[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export function DisplayPanel({ settings, onSettings, sortOptions, properties, layout }: {
  settings: ListSettings;
  onSettings: (patch: Partial<ListSettings>) => void;
  sortOptions: DisplayOption[];
  /** Every property (column) but the name, in the current order. */
  properties: DisplayOption[];
  layout: "list" | "spreadsheet";
}) {
  const hidden = new Set(settings.columns.hidden);
  const sortId = React.useId();
  const setShown = (id: string, show: boolean) =>
    onSettings({ columns: { ...settings.columns, hidden: toggleHidden(settings.columns.hidden, id, show) } });
  return (
    <HeaderPopover label="Display" trigger={<HeaderButton icon={<SlidersHorizontal size={16} aria-hidden />} label="Display" />}>
      <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain py-0.5">
        <PanelSection title="Group by">
          <div role="group" aria-label="Group by" className="flex flex-wrap gap-1.5">
            <ToggleChip pressed={!settings.groupBy} onClick={() => onSettings({ groupBy: null })}>None</ToggleChip>
            {GROUP_BY_OPTIONS.map((o) => (
              <ToggleChip key={o.id} pressed={settings.groupBy === o.id} onClick={() => onSettings({ groupBy: o.id })}>{o.label}</ToggleChip>
            ))}
          </div>
        </PanelSection>
        <PanelSection title="Order by">
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="sr-only">Order by</label>
            <select
              id={sortId}
              value={settings.sort?.key ?? ""}
              onChange={(e) => {
                const key = e.target.value;
                const first = key === "title" ? "asc" : settings.sort?.dir ?? "desc";
                onSettings({ sort: key ? { key, dir: first } : null });
              }}
              className={cn(fieldClass, "h-8 flex-1 text-[13px]")}
            >
              <option value="">As listed</option>
              {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {settings.sort && (
              <div className="w-48 shrink-0">
                <Segmented
                  label="Direction"
                  value={settings.sort.dir}
                  onChange={(dir) => onSettings({ sort: { key: settings.sort!.key, dir } })}
                  options={DIRECTIONS}
                />
              </div>
            )}
          </div>
        </PanelSection>
        <PanelSection title={layout === "spreadsheet" ? "Show columns" : "Show properties"}>
          <div role="group" aria-label={layout === "spreadsheet" ? "Show columns" : "Show properties"} className="flex flex-wrap gap-1.5">
            {properties.map((p) => (
              <ToggleChip key={p.id} pressed={!hidden.has(p.id)} onClick={() => setShown(p.id, hidden.has(p.id))}>{p.label}</ToggleChip>
            ))}
          </div>
          {layout === "spreadsheet" && <p className="mt-2 text-[12px] text-[var(--ink-600)]">Drag columns into order from the table’s column settings.</p>}
        </PanelSection>
        <PanelSection title="Rows">
          <Segmented
            label="Row density"
            value={settings.density}
            onChange={(density) => onSettings({ density })}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]}
          />
        </PanelSection>
      </div>
    </HeaderPopover>
  );
}
