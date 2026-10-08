import * as React from "react";
import { HatchPattern } from "../Meter";
import type { ChartSeries } from "./chart-utils";

/** id of the hatch pattern for a series inside a chart's id scope. */
export function hatchId(scope: string, seriesKey: string): string {
  return `${scope}-hatch-${seriesKey.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Zero-size SVG holding hatch <pattern>s for hatched series. Rendered next
 * to a chart; marks reference it with fill="url(#…)" (ids are document-wide).
 * Alternating 45° / 135° so two adjacent hatched series still differ.
 */
export function ChartPatterns({ scope, series }: { scope: string; series: Required<ChartSeries>[] }) {
  const hatched = series.filter((s) => s.hatch);
  if (hatched.length === 0) return null;
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        {hatched.map((s, i) => (
          <HatchPattern key={s.key} id={hatchId(scope, s.key)} fill={s.color} size={6} reverse={i % 2 === 1} />
        ))}
      </defs>
    </svg>
  );
}

/** Fill for a series: its colour, or its hatch pattern. */
export function seriesFill(scope: string, s: Required<ChartSeries>): string {
  return s.hatch ? `url(#${hatchId(scope, s.key)})` : s.color;
}
