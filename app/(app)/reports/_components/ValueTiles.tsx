"use client";

// Requirement 4 dashboard tiles: current, potential and held-up value from the
// Govern contract list (the same valueSummary the value report uses, so the
// totals agree everywhere). Each opens the value report. Self-contained so the
// dashboard only has to place it.

import { useMemo } from "react";
import { SummaryTilesSkeleton } from "@/components/ds/skeletons";
import { RefreshCw } from "@/components/ui/icons";
import { plural } from "@/lib/govern/labels";
import { formatCompact, formatMoney, valueSummary, type Money } from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import { isNotFound } from "@/lib/api";
import { StatTile } from "./ReportKit";

/** "$1.25M" for one currency; the full "$1,250,000 + €40,000" when there are several. */
function tileValue(m: Money): string {
  if (m.totals.length === 0) return "—";
  if (m.totals.length > 1) return formatMoney(m);
  return formatCompact(m.totals[0].amount, m.totals[0].currency || null);
}

/** Exact total first (tiles are compact), then what it covers. */
function countHint(m: Money, what: string): string {
  const exact = m.totals.length === 1 ? `${formatMoney(m)} · ` : "";
  const base = `${exact}${what} · ${plural(m.valued, "contract")}`;
  return m.unvalued > 0 ? `${base} · ${m.unvalued} with no value yet` : base;
}

export function ValueTiles() {
  const { data, isLoading, isError, error, refetch } = useContracts();
  const contracts = data?.contracts;
  const summary = useMemo(() => (contracts ? valueSummary(contracts) : null), [contracts]);

  if (isLoading) {
    return <SummaryTilesSkeleton label="contract value" labels={["Current value", "Potential value", "Value held up"]} columns={3} />;
  }
  // 404 on the list itself means the Govern API is not deployed for this
  // workspace yet: there is no contract value to show, which is not a failure.
  if (isError && !summary && isNotFound(error)) return null;
  if (isError && !summary) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-[var(--ink-600)]" role="status">
        Current, potential and held-up value couldn&apos;t load.
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 font-medium text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:min-h-11"
        >
          <RefreshCw size={12} aria-hidden />Try again
        </button>
      </p>
    );
  }
  if (!summary || data?.contracts.length === 0) return null;

  return (
    <section aria-label="Contract value" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatTile
        href="/reports/value"
        label="Current value"
        value={<span title={formatMoney(summary.current)}>{tileValue(summary.current)}</span>}
        hint={countHint(summary.current, "Signed and active")}
      />
      <StatTile
        href="/reports/value"
        tone="neutral"
        label="Potential value"
        value={<span title={formatMoney(summary.potential)}>{tileValue(summary.potential)}</span>}
        hint={countHint(summary.potential, "Still in the pipeline")}
      />
      <StatTile
        href="/reports/value"
        tone={summary.heldUp.valued > 0 ? "warning" : "neutral"}
        label="Value held up"
        value={<span title={formatMoney(summary.heldUp)}>{tileValue(summary.heldUp)}</span>}
        hint={summary.heldUp.valued > 0 ? countHint(summary.heldUp, "Past its target") : "Nothing past its target"}
      />
    </section>
  );
}
