"use client";

import { useEffect, useState } from "react";
import { RiskGauge, riskIndex } from "./RiskGauge";
import { RiskDonut } from "@/components/dashboard/RiskDonut";
import type { RiskLevel } from "@/lib/types";

type Counts = { low: number; medium: number; high: number; critical: number };
export type CatDatum = { name: string; count: number; risk: RiskLevel };

const RISK_FILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger)]",
  high: "bg-[var(--warning)]",
  medium: "bg-[var(--ink-400)]",
  low: "bg-[var(--success)]",
};
const RISK_DOT: Record<RiskLevel, string> = {
  critical: "var(--danger)", high: "var(--warning)", medium: "var(--ink-400)", low: "var(--success)",
};

export function RiskIntelligence({ counts, categories }: { counts: Counts; categories: CatDatum[] }) {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  const idx = riskIndex(counts);
  const highCrit = counts.high + counts.critical;
  const top = categories.slice(0, 6);
  const maxCat = Math.max(1, ...top.map((c) => c.count));

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Risk intelligence</h3>
        <span className="text-[11px] font-mono text-muted-foreground">{total} clauses analyzed</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 md:p-6 items-center">
        {/* Gauge */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center">
          <RiskGauge score={idx} />
          <p className="mt-5 text-[12px] text-muted-foreground text-center">
            {highCrit > 0
              ? <><span className="font-semibold text-foreground">{highCrit}</span> high/critical clause{highCrit === 1 ? "" : "s"}</>
              : total > 0 ? "No high-risk exposure" : "Awaiting analysis"}
          </p>
        </div>

        {/* Donut */}
        <div className="lg:col-span-5 lg:border-x border-border lg:px-6">
          <RiskDonut counts={counts} />
        </div>

        {/* Category bars */}
        <div className="lg:col-span-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Top categories</div>
          {top.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No category data.</p>
          ) : (
            <ul className="space-y-2.5">
              {top.map((c) => (
                <li key={c.name} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: RISK_DOT[c.risk] }} />
                  <span className="text-[11.5px] text-foreground w-24 truncate">{c.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${RISK_FILL[c.risk]}`} style={{ width: mounted ? `${(c.count / maxCat) * 100}%` : 0, transition: "width 0.8s cubic-bezier(0.2,0.8,0.2,1)" }} />
                  </div>
                  <span className="tabular-nums text-[11px] text-muted-foreground w-5 text-right">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
