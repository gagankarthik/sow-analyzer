"use client";

import { useState } from "react";
import { RiskGauge, riskIndex } from "./RiskGauge";
import { RiskDonut } from "@/components/dashboard/RiskDonut";
import { BarList, type BarListRow } from "./primitives";
import { NEUTRAL_MARK, RISK_COLOR, RISK_LABEL } from "@/lib/chart-theme";
import { categoryLabel } from "@/lib/clause-categories";
import type { RiskLevel } from "@/lib/types";

type Counts = { low: number; medium: number; high: number; critical: number };
/** `risk` is the highest risk level among the category's RATED clauses, or null
 *  when none of its clauses was given a risk level. */
export type CatDatum = { name: string; count: number; risk: RiskLevel | null };

const FIRST_ROWS = 6;

function PaneTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 text-sm font-medium text-[var(--ink-600)]">{children}</h4>;
}

/**
 * `counts` are RATED clauses per level. `unrated` (optional) is how many more
 * clauses the analysis returned without a risk level: they are stated, never
 * folded into "low" and never part of the index.
 */
export function RiskIntelligence({ counts, categories, unrated = 0 }: { counts: Counts; categories: CatDatum[]; unrated?: number }) {
  const [showAll, setShowAll] = useState(false);
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const idx = riskIndex(counts);
  const highCrit = counts.high + counts.critical;
  const rows: BarListRow[] = categories.map((c) => ({
    key: c.name,
    label: categoryLabel(c.name),
    value: c.count,
    display: c.count.toLocaleString(),
    color: c.risk ? RISK_COLOR[c.risk] : NEUTRAL_MARK,
    note: c.risk ? `Highest risk: ${RISK_LABEL[c.risk].toLowerCase()}` : "Risk not assessed",
  }));
  const shown = showAll ? rows : rows.slice(0, FIRST_ROWS);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3.5 md:px-6">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Risk intelligence</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "clause" : "clauses"} with a risk level
          {unrated > 0 ? ` · ${unrated.toLocaleString()} not assessed` : ""}
        </span>
      </div>

      {/* Stacks on mobile, 2-up from md (categories span the row), 3 panes from xl. */}
      <div className="grid grid-cols-1 items-start gap-6 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-12 xl:gap-8">
        <div className="min-w-0 xl:col-span-3">
          <PaneTitle>Risk index</PaneTitle>
          {total === 0 ? (
            // No rated clauses: there is no index. Zero would read as "no risk".
            <p className="text-sm leading-relaxed text-muted-foreground">Not assessed. No clause has a risk level yet, so there is nothing to compute an index from.</p>
          ) : (
            <>
              <RiskGauge score={idx} />
              <p className="mt-4 text-sm text-[var(--ink-600)]">
                {highCrit > 0
                  ? <><span className="font-semibold text-foreground">{highCrit.toLocaleString()}</span> of {total.toLocaleString()} rated clause{total === 1 ? "" : "s"} {highCrit === 1 ? "is" : "are"} high or critical</>
                  : `None of the ${total.toLocaleString()} rated clause${total === 1 ? "" : "s"} is high or critical`}
              </p>
              {/* The index is this app's own arithmetic, so the formula sits next to the number. */}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                How it is calculated: each rated clause counts as low 12, medium 42, high 74 or critical 100, and the index is the average
                {" "}(({counts.low}×12 + {counts.medium}×42 + {counts.high}×74 + {counts.critical}×100) ÷ {total} = {idx}).
                The weights and the 25 / 50 / 75 bands are fixed by Blue-IQ, not returned by the analysis.
                {unrated > 0 ? ` The ${unrated.toLocaleString()} clause${unrated === 1 ? "" : "s"} without a risk level ${unrated === 1 ? "is" : "are"} left out.` : ""}
              </p>
            </>
          )}
        </div>

        <div className="min-w-0 xl:col-span-4">
          <PaneTitle>Clauses by risk level</PaneTitle>
          <RiskDonut counts={counts} />
          {unrated > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {unrated.toLocaleString()} more clause{unrated === 1 ? "" : "s"} came back without a risk level and {unrated === 1 ? "is" : "are"} not in this breakdown.
            </p>
          )}
        </div>

        <div className="min-w-0 border-t border-border pt-5 md:col-span-2 xl:col-span-5 xl:border-t-0 xl:pt-0">
          <PaneTitle>Clauses by category</PaneTitle>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category data.</p>
          ) : (
            <>
              <BarList rows={shown} labelWidth={140} caption="Clauses per category, largest first. Bar colour shows the highest risk level found." />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                  {shown.length < rows.length ? `Showing the ${shown.length} largest of ${rows.length} categories` : `${rows.length} ${rows.length === 1 ? "category" : "categories"}`}
                </p>
                {rows.length > FIRST_ROWS && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:min-h-0"
                  >
                    {showAll ? `Show the ${FIRST_ROWS} largest` : `Show all ${rows.length}`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
