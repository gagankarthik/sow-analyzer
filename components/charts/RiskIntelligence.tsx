"use client";

import { RiskGauge, riskIndex } from "./RiskGauge";
import { RiskDonut } from "@/components/dashboard/RiskDonut";
import type { RiskLevel } from "@/lib/types";
import { InfoTip } from "@/components/ui/info-tip";

type Counts = { low: number; medium: number; high: number; critical: number };
/** `risk` is the highest risk level among the category's RATED clauses, or null
 *  when none of its clauses was given a risk level. */
export type CatDatum = { name: string; count: number; risk: RiskLevel | null };

function PaneTitle({ children, info }: { children: React.ReactNode; info?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-1">
      <h4 className="text-sm font-semibold">{children}</h4>
      {info}
    </div>
  );
}

/**
 * `counts` are RATED clauses per level. `unrated` (optional) is how many more
 * clauses the analysis returned without a risk level: they are stated, never
 * folded into "low" and never part of the index.
 */
export function RiskIntelligence({ counts, unrated = 0 }: { counts: Counts; unrated?: number }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const idx = riskIndex(counts);
  const highCrit = counts.high + counts.critical;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3.5 md:px-6">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Risk intelligence</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "clause" : "clauses"} with a risk level
          {unrated > 0 ? ` · ${unrated.toLocaleString()} not assessed` : ""}
        </span>
      </div>

      {/* Two rows, grouped by question (Gestalt proximity, common region):
          "how risky overall?" = index + mix, two equal panes side by side;
          "where?" = categories across the full width in two columns. No
          pane sits beside a much taller one, so no dead space opens up. */}
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="min-w-0 p-4 md:p-6">
          <PaneTitle
            info={total > 0 && (
              // The index is this app's own arithmetic, so the formula is one tap away.
              <InfoTip label="How the risk index is calculated" title="How it is calculated" align="start">
                Each rated clause counts as low 12, medium 42, high 74 or critical 100, and the index is the average
                {" "}(({counts.low}×12 + {counts.medium}×42 + {counts.high}×74 + {counts.critical}×100) ÷ {total} = {idx}).
                The weights and the 25 / 50 / 75 bands are fixed by Blue-IQ, not returned by the analysis.
                {unrated > 0 ? ` The ${unrated.toLocaleString()} clause${unrated === 1 ? "" : "s"} without a risk level ${unrated === 1 ? "is" : "are"} left out.` : ""}
              </InfoTip>
            )}
          >
            Risk index
          </PaneTitle>
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
            </>
          )}
        </div>

        <div className="min-w-0 p-4 md:p-6">
          <PaneTitle>Clauses by risk level</PaneTitle>
          <RiskDonut counts={counts} />
          {unrated > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {unrated.toLocaleString()} more clause{unrated === 1 ? "" : "s"} came back without a risk level and {unrated === 1 ? "is" : "are"} not in this breakdown.
            </p>
          )}
        </div>

      </div>

    </section>
  );
}
