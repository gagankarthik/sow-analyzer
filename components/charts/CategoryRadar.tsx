"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

type Datum = { name: string; count: number };

/** Radar of clause volume across the top categories — shows the document's
 *  "shape" of coverage. Falls back to a hint when there are too few categories. */
export function CategoryRadar({ data }: { data: Datum[] }) {
  if (data.length < 3) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center text-center">
        <p className="text-[12.5px] text-muted-foreground">Coverage radar needs at least 3 categories.</p>
      </div>
    );
  }
  const top = data.slice(0, 8).map((d) => ({
    category: d.name.length > 11 ? d.name.slice(0, 10) + "…" : d.name,
    count: d.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={top} outerRadius="70%">
        <PolarGrid stroke="var(--ink-200)" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--ink-500)" }} />
        <Radar
          dataKey="count"
          stroke="var(--brand-primary-600)"
          fill="var(--brand-primary-600)"
          fillOpacity={0.22}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
