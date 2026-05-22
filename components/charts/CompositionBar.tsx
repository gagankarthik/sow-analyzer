"use client";

// Part-to-whole composition as a single 100% horizontal stacked bar + legend.
// For a small number of segments (pricing model, doc type, finding severity)
// this is clearer and crisper than a pie/donut, and the legend carries the
// label + exact count so status never reads from color alone.

import { cn } from "@/lib/utils";

export type CompositionSegment = { key: string; label: string; value: number; color: string };

export function CompositionBar({
  segments,
  className,
  unit,
}: {
  segments: CompositionSegment[];
  className?: string;
  unit?: string;
}) {
  const present = segments.filter((s) => s.value > 0);
  const total = present.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return <p className="text-[12.5px] text-muted-foreground">No data to break down yet.</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`Composition across ${present.length} groups, ${total} total.`}>
        {present.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {present.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{s.value}{unit ? ` ${unit}` : ""}</span>
            <span className="w-9 text-right tabular-nums text-muted-foreground/80">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
