// Reusable horizontal bar chart — the default for "compare a value across
// categories/items". Bars share one scale that starts at zero, every bar prints
// its value, and long names truncate (full name on hover) instead of clipping.
// `signed` puts the zero baseline between negative and positive values, for
// things like amendment value movement. With `onSelect`, each row is a real
// button, so drilling down works from the keyboard as well as the mouse.

import { ACCENT } from "@/lib/chart-theme";
import { BarList, ChartDataTable, ChartEmpty, type BarListRow } from "./primitives";

export type HBarDatum = { id?: string; label: string; value: number; color?: string; sub?: string };

export function HBarChart({
  data,
  valueFormatter = (n: number) => n.toLocaleString(),
  onSelect,
  signed = false,
  accentColor = ACCENT,
  yAxisWidth = 150,
  unit,
  emptyText = "No data to compare yet.",
}: {
  data: HBarDatum[];
  valueFormatter?: (n: number) => string;
  onSelect?: (id: string) => void;
  signed?: boolean;
  accentColor?: string;
  yAxisWidth?: number;
  unit?: string;
  emptyText?: string;
}) {
  if (data.length === 0) return <ChartEmpty text={emptyText} />;

  const fmt = (n: number) => {
    const text = `${valueFormatter(n)}${unit ? ` ${unit}` : ""}`;
    return signed && n > 0 ? `+${text}` : text;
  };
  // A `sub` shared by every row is the measure's name: print it once as the
  // caption. Subs that differ are per-row detail, so they sit under each label.
  const subs = new Set(data.map((d) => d.sub ?? ""));
  const sharedSub = subs.size === 1 ? data[0].sub : undefined;

  const rows: BarListRow[] = data.map((d, i) => ({
    key: d.id ?? `${d.label}-${i}`,
    id: d.id,
    label: d.label,
    value: d.value,
    display: fmt(d.value),
    color: d.color ?? accentColor,
    note: sharedSub ? undefined : d.sub,
  }));

  return (
    <div className="min-w-0">
      <BarList rows={rows} labelWidth={yAxisWidth} signed={signed} onSelect={onSelect} caption={sharedSub} />
      {/* Buttons already announce themselves; static bars get a table twin. */}
      {!onSelect && (
        <ChartDataTable
          caption={sharedSub ?? "Values by item"}
          columns={["Item", sharedSub ?? "Value"]}
          rows={rows.map((r) => [r.label, r.display])}
        />
      )}
    </div>
  );
}
