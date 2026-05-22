"use client";

// Value × Risk scatter — the strategic "are the expensive contracts the risky
// ones?" view. x = contract value, y = weighted risk index (0–100), bubble size
// = clauses analyzed, color = overall risk. Points above the "elevated" line and
// to the right are the ones that cost the most AND carry the most risk.

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { RISK_COLOR, RISK_LABEL, fmtCompactMoney } from "@/lib/chart-theme";
import { TooltipShell, TooltipRow, useChartMotion, RESPONSIVE_INITIAL } from "./primitives";
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

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell label={p.name}>
      <TooltipRow color={RISK_COLOR[p.level]} label="Value" value={fmtMoney(p.value, p.currency)} />
      <TooltipRow label="Risk index" value={`${p.risk}/100`} />
      <TooltipRow label="Clauses" value={p.clauses.toLocaleString()} />
      <TooltipRow label="Overall" value={RISK_LABEL[p.level]} />
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
  const animate = useChartMotion();
  const summary = `Value versus risk for ${points.length} contracts. ${points.filter((p) => p.risk >= 50).length} sit in the elevated-risk band.`;

  return (
    <div className="h-[300px] w-full md:h-[340px]" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={RESPONSIVE_INITIAL}>
        <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number" dataKey="value" name="Contract value"
            tickFormatter={(v: number) => fmtCompactMoney(v)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false} axisLine={{ stroke: "var(--border)" }}
            label={{ value: "Contract value →", position: "insideBottom", offset: -14, fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="number" dataKey="risk" name="Risk index" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false} axisLine={{ stroke: "var(--border)" }}
            label={{ value: "Risk index ↑", angle: -90, position: "insideLeft", offset: 16, fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <ZAxis type="number" dataKey="clauses" range={[60, 520]} name="Clauses" />
          <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Tooltip content={<ScatterTip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Scatter
            data={points}
            isAnimationActive={animate}
            onClick={(d: unknown) => {
              const id = (d as { id?: string; payload?: { id?: string } })?.payload?.id ?? (d as { id?: string })?.id;
              if (id) onSelect?.(id);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {points.map((p) => (
              <Cell key={p.id} fill={RISK_COLOR[p.level]} fillOpacity={0.7} stroke={RISK_COLOR[p.level]} strokeWidth={1} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
