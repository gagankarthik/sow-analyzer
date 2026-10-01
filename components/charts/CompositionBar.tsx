// Part-to-whole composition as one 100% stacked bar with a directly labelled
// key underneath. For a handful of groups (risk level, pricing model, document
// type, finding severity) this reads faster than a donut, and the key carries
// the label + exact count + share, so nothing depends on colour alone.

import { cn } from "@/lib/utils";
import { wholeShares } from "@/lib/chart-theme";

export type CompositionSegment = { key: string; label: string; value: number; color: string };

export function CompositionBar({
  segments,
  className,
  unit,
  emptyText = "No data to break down yet.",
  valueFormatter = (n: number) => n.toLocaleString(),
}: {
  segments: CompositionSegment[];
  className?: string;
  unit?: string;
  emptyText?: string;
  /** How each value is printed (e.g. as money). Defaults to a plain number. */
  valueFormatter?: (n: number) => string;
}) {
  // Zero-value groups are never drawn — no slivers, no "0%" rows.
  const present = segments.filter((s) => s.value > 0);
  const total = present.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const shares = wholeShares(present.map((s) => s.value));
  const pct = (i: number) => (shares[i] === 0 ? "<1%" : `${shares[i]}%`);
  const show = (n: number) => `${valueFormatter(n)}${unit ? ` ${unit}` : ""}`;
  const summary = present.map((s, i) => `${s.label} ${show(s.value)} (${pct(i)})`).join(", ");

  return (
    <div className={cn("@container min-w-0 space-y-3", className)}>
      <div className="flex h-3 w-full gap-0.5" role="img" aria-label={`${show(total)} in total: ${summary}.`}>
        {present.map((s, i) => (
          <div
            key={s.key}
            className="h-full min-w-[4px] basis-0 first:rounded-l-[4px] last:rounded-r-[4px]"
            style={{ flexGrow: s.value, background: s.color }}
            title={`${s.label}: ${show(s.value)} (${pct(i)})`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 @[440px]:grid-cols-2">
        {present.map((s, i) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2 text-sm">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground" title={s.label}>{s.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{show(s.value)}</span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct(i)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
