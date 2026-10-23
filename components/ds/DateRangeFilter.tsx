"use client";

// A date-range quick filter in the FilterButton frame: [Received │ Last 30 days ▾].
// Presets cover the common windows; "Custom" takes a from / to pair. The
// direction picks the presets: "past" for dates already gone by (received,
// created), "future" for dates coming up (due, renewal).
//
//   const [range, setRange] = useState<DateRange | null>(null);
//   <DateRangeFilter label="Received" direction="past" value={range} onChange={setRange} />
//   rows.filter((r) => inDateRange(r.createdAt, range, today))

import * as React from "react";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CalendarClock } from "@/components/ui/icons";
import { FilterButton } from "./FilterButton";

export type DateRangePreset = "7" | "30" | "90" | "365" | "custom";

export type DateRange = {
  preset: DateRangePreset;
  /** Custom bounds, inclusive, as yyyy-mm-dd. */
  from?: string;
  to?: string;
};

const PRESET_DAYS: Record<Exclude<DateRangePreset, "custom">, number> = { "7": 7, "30": 30, "90": 90, "365": 365 };

function presetLabel(preset: DateRangePreset, direction: "past" | "future"): string {
  if (preset === "custom") return "Custom";
  const n = PRESET_DAYS[preset];
  const span = n === 365 ? "12 months" : `${n} days`;
  return direction === "past" ? `Last ${span}` : `Next ${span}`;
}

const DAY_MS = 86_400_000;

/** Midnight (local) of a yyyy-mm-dd string or ISO timestamp, in ms. */
function dayStart(value: string): number {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The inclusive [start, end] window, in ms, that a range covers. */
export function dateRangeBounds(range: DateRange, today: Date, direction: "past" | "future"): [number, number] {
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const t = now.getTime();
  if (range.preset === "custom") {
    return [range.from ? dayStart(range.from) : -Infinity, range.to ? dayStart(range.to) + DAY_MS - 1 : Infinity];
  }
  const span = PRESET_DAYS[range.preset] * DAY_MS;
  return direction === "past" ? [t - span, t + DAY_MS - 1] : [t, t + span + DAY_MS - 1];
}

/** True when the date falls in the range; with no range everything matches, and a missing date never does. */
export function inDateRange(
  value: string | null | undefined,
  range: DateRange | null,
  today: Date,
  direction: "past" | "future" = "past",
): boolean {
  if (!range) return true;
  if (!value) return false;
  const [start, end] = dateRangeBounds(range, today, direction);
  const at = dayStart(value);
  return at >= start && at <= end;
}

function rangeSummary(range: DateRange, direction: "past" | "future"): string {
  if (range.preset !== "custom") return presetLabel(range.preset, direction);
  const fmt = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`;
  if (range.from) return `From ${fmt(range.from)}`;
  if (range.to) return `Until ${fmt(range.to)}`;
  return "Custom";
}

export function DateRangeFilter({
  label,
  value,
  onChange,
  direction = "past",
}: {
  label: string;
  value: DateRange | null;
  onChange: (next: DateRange | null) => void;
  direction?: "past" | "future";
}) {
  const presets: Exclude<DateRangePreset, "custom">[] = ["7", "30", "90", "365"];
  const custom = value?.preset === "custom" ? value : null;
  // Typing in the date fields must not trigger the menu's typeahead.
  const stop = (e: React.KeyboardEvent) => e.stopPropagation();
  return (
    <FilterButton
      label={label}
      value={value ? rangeSummary(value, direction) : undefined}
      onClear={() => onChange(null)}
      icon={<CalendarClock />}
      menuClassName="w-64"
    >
      <DropdownMenuRadioGroup
        value={value?.preset ?? "any"}
        onValueChange={(v) => onChange(v === "any" ? null : v === "custom" ? { preset: "custom", from: custom?.from, to: custom?.to } : { preset: v as DateRangePreset })}
      >
        <DropdownMenuRadioItem value="any">Any time</DropdownMenuRadioItem>
        {presets.map((p) => (
          <DropdownMenuRadioItem key={p} value={p}>
            {presetLabel(p, direction)}
          </DropdownMenuRadioItem>
        ))}
        <DropdownMenuRadioItem value="custom" onSelect={(e) => e.preventDefault()}>
          Custom range
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      {custom && (
        <>
          <DropdownMenuSeparator />
          <div className="grid grid-cols-2 gap-2 px-2 pb-2 pt-1" onKeyDown={stop}>
            <label className="flex min-w-0 flex-col gap-1 text-caption text-fg-tertiary">
              From
              <input
                type="date"
                value={custom.from ?? ""}
                max={custom.to}
                onChange={(e) => onChange({ ...custom, from: e.target.value || undefined })}
                className="h-8 min-w-0 rounded-control border border-border-strong bg-surface-raised px-2 text-caption text-fg-primary focus-visible:outline-2 focus-visible:outline-focus"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-caption text-fg-tertiary">
              To
              <input
                type="date"
                value={custom.to ?? ""}
                min={custom.from}
                onChange={(e) => onChange({ ...custom, to: e.target.value || undefined })}
                className="h-8 min-w-0 rounded-control border border-border-strong bg-surface-raised px-2 text-caption text-fg-primary focus-visible:outline-2 focus-visible:outline-focus"
              />
            </label>
          </div>
        </>
      )}
    </FilterButton>
  );
}
