"use client";

// Value by sponsor, department, college, PI, agreement type or fiscal year,
// with one selector. Each row shows current and potential side by side on one
// scale (main currency); the full sums, every currency, are printed beside it.

import { byEdition } from "@/lib/edition-runtime";
import { useState } from "react";
import { FilterChips } from "@/components/settings/SettingsNav";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import { BREAKDOWN_LABEL, RESEARCH_BREAKDOWNS, formatMoney, type BreakdownKey, type BreakdownRow } from "@/lib/govern/metrics";
import type { AgreementType } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { LegendDot, SegmentBar, VALUE_FILL } from "../../_components/ReportCharts";
import { TEXT_LINK } from "../../_components/ReportKit";
import { amountIn } from "../../_components/report-data";

export const BREAKDOWN_KEYS = Object.keys(BREAKDOWN_LABEL) as BreakdownKey[];


/** Display name for a breakdown group (agreement types come back as ids). */
export function breakdownName(key: BreakdownKey, group: string): string {
  return key === "agreementType" ? AGREEMENT_TYPE_LABEL[group as AgreementType] ?? group : group;
}

const FIRST = 10;

export function BreakdownSection({
  rowsFor, currency, initial = "sponsor",
}: {
  rowsFor: (key: BreakdownKey) => BreakdownRow[];
  currency: string | null;
  initial?: BreakdownKey;
}) {
  const [key, setKey] = useState<BreakdownKey>(initial);
  const [all, setAll] = useState(false);
  const rows = rowsFor(key);
  const shown = all ? rows : rows.slice(0, FIRST);
  const max = Math.max(1, ...rows.map((r) => amountIn(r.current, currency) + amountIn(r.potential, currency)));

  return (
    <div className="space-y-5">
      <FilterChips
        label="Group by"
        value={key}
        onChange={(k) => { setKey(k); setAll(false); }}
        options={BREAKDOWN_KEYS.filter((k) => byEdition(true, !RESEARCH_BREAKDOWNS.includes(k))).map((k) => ({ value: k, label: BREAKDOWN_LABEL[k] }))}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <LegendDot color={VALUE_FILL.current} label="Current" />
        <LegendDot color={VALUE_FILL.potential} label="Potential" />
      </div>
      {rows.length === 0 ? (
        <p className="text-base text-[var(--ink-600)]">No contracts to group.</p>
      ) : (
        <ul aria-label={`Value by ${BREAKDOWN_LABEL[key].toLowerCase()}`}>
            {shown.map((r) => (
              <li key={r.key} className="border-b border-border py-3 last:border-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="min-w-0 truncate text-base font-semibold text-foreground" title={breakdownName(key, r.key)}>{breakdownName(key, r.key)}</span>
                    <span className="text-sm text-[var(--ink-600)]">
                      {r.count} {r.count === 1 ? "contract" : "contracts"}
                    </span>
                  </span>
                  <SegmentBar
                    className="mt-2"
                    max={max}
                    height={12}
                    segments={[
                      { key: "current", value: amountIn(r.current, currency), color: VALUE_FILL.current, label: "Current" },
                      { key: "potential", value: amountIn(r.potential, currency), color: VALUE_FILL.potential, label: "Potential" },
                    ]}
                  />
                  <span className="mt-1.5 grid grid-cols-1 gap-x-4 text-sm text-[var(--ink-600)] sm:grid-cols-2">
                    <span><span className="font-medium text-foreground tabular-nums">{formatMoney(r.current)}</span> current</span>
                    <span><span className="font-medium text-foreground tabular-nums">{formatMoney(r.potential)}</span> potential</span>
                  </span>
              </li>
            ))}
        </ul>
      )}
      {rows.length > FIRST && (
        <button type="button" className={cn(TEXT_LINK)} onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
