"use client";

// Value × risk — "are the expensive contracts the risky ones?"
// x = contract value, y = weighted risk index (0–100), bubble area = clauses
// analyzed, colour = overall risk level.
//
// Contract values routinely span orders of magnitude (one $13M master agreement
// next to several $100k SOWs). On a linear axis that pins everything but the
// largest contract into the left corner, so when the spread is wide the value
// axis switches to a log scale — and says so in its title. The high-risk
// threshold is drawn and labelled, and the most notable points are named on
// the chart instead of waiting for a hover.

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import {
  HIGH_RISK_THRESHOLD, RISK_COLOR, RISK_LABEL, fmtCompactMoney,
} from "@/lib/chart-theme";
import {
  AXIS_STROKE, AXIS_TICK, GRID_STROKE, RESPONSIVE_INITIAL,
  ChartEmpty, ChartFigure, TooltipShell, TooltipRow,
} from "./primitives";
import { fmtMoney } from "@/lib/contract-value";
import type { RiskLevel } from "@/lib/types";

export type ScatterPoint = {
  id: string;
  name: string;
  value: number;       // contract value
  risk: number;        // 0–100 risk index
  clauses: number;     // bubble size
  level: RiskLevel;    // color
  currency?: string | null;
};

/** Switch to a log axis once the largest value is this many times the smallest. */
const LOG_SPREAD = 20;
const MAX_LABELS = 6;

type XScale = { log: boolean; domain: [number, number]; ticks?: number[]; frac: (v: number) => number };

function xScale(points: ScatterPoint[]): XScale {
  const values = points.map((p) => p.value).filter((v) => v > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (values.length < 2 || max / min < LOG_SPREAD) {
    const top = max * 1.08;
    return { log: false, domain: [0, top], frac: (v) => v / top };
  }
  const lo = Math.pow(10, Math.floor(Math.log10(min)));
  const hi = Math.pow(10, Math.ceil(Math.log10(max)));
  const decades = Math.round(Math.log10(hi / lo));
  // Few decades: add 2× and 5× steps so the axis is not just two or three ticks.
  const steps = decades <= 2 ? [1, 2, 5] : [1];
  const ticks: number[] = [];
  for (let d = lo; d < hi; d *= 10) for (const s of steps) ticks.push(d * s);
  ticks.push(hi);
  const span = Math.log10(hi / lo);
  return { log: true, domain: [lo, hi], ticks, frac: (v) => Math.log10(v / lo) / span };
}

function shorten(s: string, n = 22): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

type LabelSpec = { text: string; anchor: "start" | "middle" | "end"; below: boolean };

/** Name the points a reader will ask about first — the largest and the riskiest —
 *  and skip any whose label would sit on top of one already placed. */
function pickLabels(points: ScatterPoint[], scale: XScale): Map<string, LabelSpec> {
  const byValue = [...points].sort((a, b) => b.value - a.value);
  const byRisk = [...points].sort((a, b) => b.risk - a.risk);
  const candidates: ScatterPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    for (const p of [byRisk[i], byValue[i]]) if (p && !candidates.includes(p)) candidates.push(p);
  }
  const placed: { fx: number; fy: number }[] = [];
  const out = new Map<string, LabelSpec>();
  for (const p of candidates) {
    if (out.size >= MAX_LABELS) break;
    const fx = scale.frac(p.value);
    const fy = p.risk / 100;
    if (placed.some((q) => Math.abs(q.fx - fx) < 0.22 && Math.abs(q.fy - fy) < 0.1)) continue;
    placed.push({ fx, fy });
    out.set(p.id, { text: shorten(p.name), anchor: fx > 0.75 ? "end" : fx < 0.2 ? "start" : "middle", below: fy > 0.88 });
  }
  return out;
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell label={p.name}>
      <TooltipRow label="Contract value" value={fmtMoney(p.value, p.currency)} />
      <TooltipRow label="Risk index" value={`${p.risk} out of 100`} />
      <TooltipRow color={RISK_COLOR[p.level]} label="Overall risk" value={RISK_LABEL[p.level]} />
      <TooltipRow label="Clauses analyzed" value={p.clauses.toLocaleString()} />
    </TooltipShell>
  );
}

export function ValueRiskScatter({
  points,
  onSelect,
}: {
  points: ScatterPoint[];
  onSelect?: (id: string) => void;
}) {
  const plotted = points.filter((p) => p.value > 0);

  if (plotted.length === 0) {
    return <ChartEmpty className="h-[280px] md:h-[360px]" text="No contracts with an extracted value to plot yet." />;
  }

  const scale = xScale(plotted);
  const labels = pickLabels(plotted, scale);
  const elevated = plotted.filter((p) => p.risk >= HIGH_RISK_THRESHOLD).length;
  const summary =
    `Contract value against risk index for ${plotted.length} contract${plotted.length === 1 ? "" : "s"}. ` +
    `${elevated} ${elevated === 1 ? "is" : "are"} at or above the high-risk threshold of ${HIGH_RISK_THRESHOLD}.`;
  const sizes = plotted.map((p) => p.clauses);
  const sameSize = Math.min(...sizes) === Math.max(...sizes);

  return (
    <ChartFigure
      summary={summary}
      table={{
        caption: "Contract value and risk by contract",
        columns: ["Contract", "Value", "Risk index (0–100)", "Overall risk", "Clauses"],
        rows: [...plotted].sort((a, b) => b.value - a.value).map((p) => [
          p.name, fmtMoney(p.value, p.currency), p.risk, RISK_LABEL[p.level], p.clauses,
        ]),
      }}
    >
      <div className="@container h-[280px] w-full min-w-0 md:h-[360px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={RESPONSIVE_INITIAL}>
          <ScatterChart margin={{ top: 20, right: 28, bottom: 30, left: 12 }}>
            <CartesianGrid stroke={GRID_STROKE} />
            <XAxis
              type="number" dataKey="value" name="Contract value"
              scale={scale.log ? "log" : "linear"} domain={scale.domain} ticks={scale.ticks} allowDataOverflow
              tickFormatter={(v: number) => fmtCompactMoney(v, plotted[0].currency)}
              tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS_STROKE }} minTickGap={12}
              label={{
                value: scale.log ? "Contract value (log scale)" : "Contract value",
                position: "insideBottom", offset: -16, fontSize: 12, fill: "var(--ink-600)",
              }}
            />
            <YAxis
              type="number" dataKey="risk" name="Risk index" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
              tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS_STROKE }} width={44}
              label={{ value: "Risk index (0–100)", angle: -90, position: "insideLeft", offset: 4, fontSize: 12, fill: "var(--ink-600)", style: { textAnchor: "middle" } }}
            />
            <ZAxis type="number" dataKey="clauses" range={sameSize ? [140, 140] : [70, 420]} name="Clauses" />
            <ReferenceLine
              y={HIGH_RISK_THRESHOLD} stroke="var(--ink-500)" strokeDasharray="4 4"
              label={{ value: `High-risk threshold (${HIGH_RISK_THRESHOLD})`, position: "insideTopRight", fontSize: 12, fill: "var(--ink-600)" }}
            />
            <Tooltip content={<ScatterTip />} cursor={{ stroke: AXIS_STROKE, strokeWidth: 1 }} />
            <Scatter
              data={plotted}
              // No entrance animation: recharts holds point labels back while it runs.
              isAnimationActive={false}
              onClick={(d: unknown) => {
                const id = (d as { id?: string; payload?: { id?: string } })?.payload?.id ?? (d as { id?: string })?.id;
                if (id) onSelect?.(id);
              }}
              cursor={onSelect ? "pointer" : undefined}
            >
              {plotted.map((p) => (
                <Cell key={p.id} fill={RISK_COLOR[p.level]} fillOpacity={0.85} stroke="var(--card)" strokeWidth={2} />
              ))}
              <LabelList
                dataKey="id"
                content={(props) => {
                  const spec = labels.get(String(props.value));
                  if (!spec) return null;
                  const x = Number(props.x ?? 0);
                  const y = Number(props.y ?? 0);
                  const w = Number(props.width ?? 0);
                  const h = Number(props.height ?? 0);
                  const cx = x + w / 2;
                  const tx = spec.anchor === "middle" ? cx : spec.anchor === "end" ? x + w : x;
                  return (
                    <text
                      x={tx} y={spec.below ? y + h + 14 : y - 6} textAnchor={spec.anchor}
                      // Names need room: below ~480px they would collide, so the
                      // tooltip and the table carry them instead.
                      className="hidden @[480px]:block"
                      fontSize={12} fill="var(--ink-700)" stroke="var(--card)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
                    >
                      {spec.text}
                    </text>
                  );
                }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {!sameSize && <p className="mt-1 text-xs text-muted-foreground">Larger circles have more clauses analyzed.</p>}
    </ChartFigure>
  );
}
