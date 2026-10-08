import * as React from "react";
import { cn } from "@/lib/utils";
import { Swatch } from "./Meter";
import type { ToneInput } from "./tone";

export type LegendItem = {
  key: string;
  label: string;
  /** CSS colour reference (var(--viz-cat-2)) or a tone. */
  color?: string;
  tone?: ToneInput;
  /** Pattern fill, matching a hatched series. */
  hatch?: boolean;
  /** Line series show a stroke swatch. */
  shape?: "square" | "line" | "dot";
  /** Optional value printed after the label. */
  value?: React.ReactNode;
};

/**
 * Chart key: swatch + ink label (+ value). Text never wears the series
 * colour. Present for ≥2 series; a single series is named by the title.
 */
export function Legend({
  items,
  className,
  label = "Legend",
}: {
  items: LegendItem[];
  className?: string;
  /** Accessible name of the list. */
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((it) => (
        <li key={it.key} className="inline-flex min-w-0 items-center gap-1.5 text-caption text-fg-secondary">
          <Swatch color={it.color} tone={it.tone} hatch={it.hatch} shape={it.shape} />
          <span className="truncate">{it.label}</span>
          {it.value !== undefined && <span className="font-medium tabular-nums text-fg-primary">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
