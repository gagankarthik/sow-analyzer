import { CompositionBar } from "@/components/charts/CompositionBar";
import { ChartEmpty } from "@/components/charts/primitives";
import { RISK_COLOR, RISK_LABEL, RISK_ORDER_DESC } from "@/lib/chart-theme";

type Counts = { low: number; medium: number; high: number; critical: number };

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** Clause-risk distribution. Kept under its original name, but drawn as one
 *  stacked bar with a labelled key rather than a donut: when every clause is
 *  low risk a donut is just a solid ring, and its legend repeated 0% rows.
 *  Levels with no clauses are named in one sentence instead of being drawn. */
export function RiskDonut({ counts }: { counts: Counts }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;

  if (total === 0) {
    return <ChartEmpty className="min-h-[120px]" text="No risk-scored clauses yet. Process a contract to see the risk mix." />;
  }

  const segments = RISK_ORDER_DESC.map((level) => ({
    key: level,
    label: RISK_LABEL[level],
    value: counts[level],
    color: RISK_COLOR[level],
  }));
  const absent = RISK_ORDER_DESC.filter((level) => counts[level] === 0).map((level) => RISK_LABEL[level].toLowerCase());

  return (
    <div className="min-w-0">
      <CompositionBar segments={segments} />
      {absent.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">No {joinList(absent)} risk clauses.</p>
      )}
    </div>
  );
}
