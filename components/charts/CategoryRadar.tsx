"use client";

import { useState } from "react";
import { ACCENT, wholeShares } from "@/lib/chart-theme";
import { categoryLabel } from "@/lib/clause-categories";
import { BarList, ChartDataTable, ChartEmpty, type BarListRow } from "./primitives";

type Datum = { name: string; count: number };

const FIRST_ROWS = 8;

/** Clause coverage by category, largest first. Kept under its original name,
 *  but drawn as ranked bars: a radar with a handful of near-empty spokes hides
 *  both the order and the amounts, and bars answer "where is this contract's
 *  text concentrated?" directly.
 *
 *  Every category is listed by name. The first eight show by default; the rest
 *  open with "Show all", and the totals line always counts all of them. Shares
 *  are of all clauses, whichever rows are on screen. */
export function CategoryRadar({ data }: { data: Datum[] }) {
  const [showAll, setShowAll] = useState(false);
  const ranked = data.filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  if (ranked.length === 0) {
    return <ChartEmpty text="Category coverage appears once clauses are classified." />;
  }

  const total = ranked.reduce((s, d) => s + d.count, 0);
  const shares = wholeShares(ranked.map((d) => d.count));
  const rows: BarListRow[] = ranked.map((d, i) => ({
    key: d.name,
    label: categoryLabel(d.name),
    value: d.count,
    display: `${d.count.toLocaleString()} · ${shares[i] === 0 ? "<1" : shares[i]}%`,
    color: ACCENT,
  }));
  const shown = showAll ? rows : rows.slice(0, FIRST_ROWS);

  return (
    <div className="min-w-0">
      <BarList rows={shown} labelWidth={148} caption="Clauses per category, with share of all clauses" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {shown.length < rows.length ? `Showing ${shown.length} of ${rows.length} categories` : `${rows.length} ${rows.length === 1 ? "category" : "categories"}`}
          {" · "}{total.toLocaleString()} {total === 1 ? "clause" : "clauses"}
        </p>
        {rows.length > FIRST_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0"
          >
            {showAll ? `Show the first ${FIRST_ROWS}` : `Show all ${rows.length}`}
          </button>
        )}
      </div>
      {/* The text alternative always carries every category. */}
      <ChartDataTable
        caption="Clauses per category"
        columns={["Category", "Clauses and share"]}
        rows={rows.map((r) => [r.label, r.display])}
      />
    </div>
  );
}
