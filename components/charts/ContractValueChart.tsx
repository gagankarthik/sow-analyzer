"use client";

// Contract-value analytics for a contract family. Consumes the value segments
// from lib/contract-value (original SOW + each amendment's change) and offers
// three lenses on the same numbers:
//   • By document  — each document's contribution, as signed bars from zero.
//   • Composition  — what the current total is made of (one stacked bar).
//   • Value journey — the running total after each document, drawn as steps
//     because the value only changes when a document is signed.
// Value is not risk, so it uses the brand blue ramp (original = blue, increase
// = lighter blue, decrease = gray) and leaves green / red to the risk scale.
// Direction is carried by the sign, the bar's side of zero and the legend.

import { useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  PieChart as CompositionIcon, LineChart as TrendIcon,
} from "@/components/ui/icons";
import { fmtMoney, type ValueSegment } from "@/lib/contract-value";
import { ACCENT, ACCENT_LIGHT, NEUTRAL_MARK, fmtCompactMoney } from "@/lib/chart-theme";
import { CompositionBar } from "./CompositionBar";
import {
  AXIS_STROKE, AXIS_TICK, GRID_STROKE, RESPONSIVE_INITIAL,
  BarList, ChartFigure, LegendSwatch, TooltipShell, TooltipRow, useChartMotion,
} from "./primitives";

type Mode = "bar" | "pie" | "trend";
type TrendPoint = { name: string; total: number; add: number };

const TABS: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "bar", label: "By document", icon: <BarChart3 size={13} /> },
  { id: "pie", label: "Composition", icon: <CompositionIcon size={13} /> },
  { id: "trend", label: "Value journey", icon: <TrendIcon size={13} /> },
];

function segColor(s: { isAmendment: boolean; value: number }): string {
  if (!s.isAmendment) return ACCENT;
  return s.value < 0 ? NEUTRAL_MARK : ACCENT_LIGHT;
}

/** Signed money: +$40,000 / −$40,000 (fmtMoney alone drops the sign). */
function signedMoney(n: number, currency: string | null, plus = true): string {
  const sign = n < 0 ? "−" : plus && n > 0 ? "+" : "";
  return `${sign}${fmtMoney(Math.abs(n), currency)}`;
}

function shorten(s: string, n = 16): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function JourneyTooltip({ active, payload, currency }: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
  currency: string | null;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell label={p.name}>
      <TooltipRow color={ACCENT} label="Running total" value={fmtMoney(p.total, currency)} />
      <TooltipRow label="This document" value={signedMoney(p.add, currency)} />
    </TooltipShell>
  );
}

export function ContractValueChart({
  segments, total, currency,
}: {
  segments: ValueSegment[];
  total: number;
  currency: string | null;
}) {
  const [mode, setMode] = useState<Mode>("bar");
  const animate = useChartMotion();
  if (!segments.length || total <= 0) return null;

  const base = segments.find((s) => !s.isAmendment)?.value ?? segments[0].value;
  const net = total - base;
  const pct = base > 0 ? (net / base) * 100 : 0;
  const rose = net > 0.5;
  const fell = net < -0.5;
  const hasCuts = segments.some((s) => s.isAmendment && s.value < 0);
  const hasAdds = segments.some((s) => s.isAmendment && s.value > 0);
  const cuts = segments.filter((s) => s.value < 0).reduce((sum, s) => sum + s.value, 0);

  const trendData = segments.reduce<TrendPoint[]>((acc, s) => {
    const previous = acc.length ? acc[acc.length - 1].total : 0;
    return [...acc, { name: s.label, total: previous + s.value, add: s.value }];
  }, []);

  const summary =
    `Contract value is ${fmtMoney(total, currency)} across ${segments.length} document${segments.length === 1 ? "" : "s"}` +
    (net === 0 ? ", unchanged from the original SOW." : `, ${signedMoney(net, currency)} against the original SOW of ${fmtMoney(base, currency)}.`);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-muted-foreground" />
          <h3 className="text-base font-semibold tracking-tight text-foreground">Contract value analytics</h3>
        </div>
        {/* Lens switch — scrolls sideways on narrow screens instead of wrapping. */}
        <div className="-mx-1 max-w-full overflow-x-auto px-1 scrollbar-none">
          <div role="group" aria-label="Chart view" className="inline-flex rounded-lg border border-border bg-muted p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                aria-pressed={mode === t.id}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-[var(--ink-600)] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:bg-card aria-[pressed=true]:text-[var(--brand-primary-700)] aria-[pressed=true]:shadow-xs sm:h-8"
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-12 md:gap-8 md:p-6">
        {/* Headline */}
        <div className="flex min-w-0 flex-col gap-4 md:col-span-4 lg:col-span-3">
          <div>
            <div className="text-sm font-medium text-[var(--ink-600)]">Current total</div>
            <div className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground [overflow-wrap:anywhere]">
              {fmtMoney(total, currency)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-[var(--panel)] p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Compared with original SOW</div>
            <div className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xl font-semibold tabular-nums text-foreground">
              {rose && <TrendingUp size={16} className="text-[var(--ink-600)]" aria-hidden />}
              {fell && <TrendingDown size={16} className="text-[var(--ink-600)]" aria-hidden />}
              {net === 0 ? "No change" : signedMoney(net, currency)}
            </div>
            {base > 0 && net !== 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {pct > 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}% from {fmtMoney(base, currency)}
              </div>
            )}
          </div>
          <div className="flex flex-row flex-wrap gap-x-4 gap-y-1.5 md:flex-col">
            <LegendSwatch color={ACCENT} label="Original SOW" />
            {hasAdds && <LegendSwatch color={ACCENT_LIGHT} label="Amendment increase" />}
            {hasCuts && <LegendSwatch color={NEUTRAL_MARK} label="Amendment decrease" />}
          </div>
        </div>

        {/* Chart */}
        <ChartFigure
          className="md:col-span-8 lg:col-span-9"
          summary={summary}
          table={{
            caption: "Contract value by document",
            columns: ["Document", "Change in value", "Running total"],
            rows: segments.map((s, i) => [s.label, signedMoney(s.value, currency, s.isAmendment), fmtMoney(trendData[i].total, currency)]),
          }}
        >
          {mode === "bar" && (
            <BarList
              signed
              labelWidth={168}
              caption="Value each document adds or removes"
              rows={segments.map((s, i) => ({
                key: `${s.docId}-${i}`,
                label: s.label,
                value: s.value,
                display: signedMoney(s.value, currency, s.isAmendment),
                color: segColor(s),
                note: s.source ? `“${s.source}”` : undefined,
              }))}
            />
          )}

          {mode === "pie" && (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                Share of {hasCuts ? "the value added" : "the current total"}, by document
              </p>
              <CompositionBar
                segments={segments.map((s, i) => ({ key: `${s.docId}-${i}`, label: s.label, value: s.value, color: segColor(s) }))}
                valueFormatter={(n) => fmtMoney(n, currency)}
              />
              {hasCuts && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Decreases totalling {signedMoney(cuts, currency)} are not part of this breakdown. After them the contract stands at {fmtMoney(total, currency)}.
                </p>
              )}
            </div>
          )}

          {mode === "trend" && (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">Running total after each document</p>
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={RESPONSIVE_INITIAL}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tickFormatter={(v: string) => shorten(v)} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS_STROKE }} minTickGap={8} interval="preserveStartEnd" padding={{ left: 16, right: 16 }} />
                    <YAxis domain={[0, "auto"]} tickFormatter={(v: number) => fmtCompactMoney(v, currency)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
                    <Tooltip content={<JourneyTooltip currency={currency} />} cursor={{ stroke: AXIS_STROKE, strokeWidth: 1 }} />
                    <Area
                      type="stepAfter" dataKey="total" stroke={ACCENT} strokeWidth={2} fill={ACCENT} fillOpacity={0.1}
                      isAnimationActive={animate}
                      dot={{ r: 4, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </ChartFigure>
      </div>
    </section>
  );
}
