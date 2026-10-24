"use client";

// Home's chart panels (restored beside the new sections): Value, Waiting on,
// Waiting longest and Time in step. Each owns its empty state.

import { useState } from "react";
import Link from "next/link";
import { BarChart } from "@/components/ds/charts/BarChart";
import { AreaTrend } from "@/components/ds/charts/LineChart";
import { AlertTriangle, ArrowRight, Info } from "@/components/ui/icons";
import { DIRECTION_LABEL, STAGE_LABEL, plural } from "@/lib/govern/labels";
import {
  formatCompact, formatMoney, signedByMonth, type Money, type StageQueue, type ValueSummary, type WaitingQueue,
} from "@/lib/govern/metrics";
import type { Contract, Stage } from "@/lib/govern/types";
import {
  LegendDot, MoneySplitBar, SlaLegend, VALUE_FILL, WaitingBars, stageTable, waitingTable,
} from "../../reports/_components/ReportCharts";
import { TEXT_LINK, ViewAsTable } from "../../reports/_components/ReportKit";
import { amountIn } from "../../reports/_components/report-data";
import { ContractRow } from "./ContractRow";
import { Panel, PanelEmpty } from "./HomeSections";

/* ── Value ───────────────────────────────────────────────────────────────── */

export function MoneyPanel({
  summary, unvalued, primary, captureGaps, className,
}: {
  className?: string;
  summary: ValueSummary;
  /** Open or current contracts with no value at all. */
  unvalued: number;
  primary: string | null;
  captureGaps: number;
}) {
  const current = amountIn(summary.current, primary);
  const potential = amountIn(summary.potential, primary);
  const heldUp = amountIn(summary.heldUp, primary);
  const multi = new Set([...summary.current.totals, ...summary.potential.totals].map((t) => t.currency)).size > 1;
  const anyValue = summary.current.totals.length + summary.potential.totals.length > 0;
  // The split bar only earns its place when it splits something.
  const parts = [current, Math.max(0, potential - heldUp), heldUp].filter((n) => n > 0).length;

  return (
    <Panel
      id="money"
      className={className}
      title="Value"
      action={{ href: "/reports/value", label: "Report" }}
    >
      {anyValue ? (
        <>
          {parts >= 2 && (
            <div className="mb-3">
              <MoneySplitBar
                current={current}
                potential={potential}
                heldUp={heldUp}
                labels={{ current: formatCompact(current, primary), potential: formatCompact(potential, primary), heldUp: formatCompact(heldUp, primary) }}
              />
            </div>
          )}
          <dl className="divide-y divide-border">
            <MoneyFigure color={VALUE_FILL.current} label="Current" sub="Signed and active" money={summary.current} currency={primary} />
            <MoneyFigure color={VALUE_FILL.potential} label="Potential" sub="In the pipeline" money={summary.potential} currency={primary} />
            <MoneyFigure color={VALUE_FILL.heldUp} hatched label="Held up" sub="Of the potential, past its target" money={summary.heldUp} currency={primary} />
          </dl>
          {multi && (
            <p className="mt-3 flex items-start gap-2 text-xs text-[var(--ink-600)]">
              <Info size={16} className="mt-px shrink-0" aria-hidden />
              The bar shows {primary || "the main currency"} only. Other currencies are never added together.
            </p>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            {(["incoming", "outgoing"] as const).map((d) => (
              <div key={d} className="min-w-0">
                <dt className="text-xs font-medium text-[var(--ink-600)]">{DIRECTION_LABEL[d]}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">{moneyOrZero(summary.byDirection[d].current, primary)}</dd>
                <dd className="truncate text-xs tabular-nums text-[var(--ink-600)]">{moneyOrZero(summary.byDirection[d].potential, primary)} potential</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <PanelEmpty title="No values yet" body="Add a value to a contract and the signed, pipeline and held-up totals appear here." />
      )}

      {(unvalued > 0 || captureGaps > 0) && (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          {unvalued > 0 && (
            <Link
              href="/reports/value#no-value"
              className="inline-flex min-h-10 items-center gap-2 rounded-sm text-sm text-[var(--warning-fg)] hover:underline underline-offset-4 sm:min-h-0"
            >
              <AlertTriangle size={16} className="shrink-0" aria-hidden />
              <span><span className="font-semibold">{plural(unvalued, "contract")}</span> without a value: totals are incomplete</span>
            </Link>
          )}
          {captureGaps > 0 && (
            <Link href="/reports/capture" className={TEXT_LINK}>
              {plural(captureGaps, "contract")} missing details <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </Panel>
  );
}

/** No contract in a bucket is a known $0 (as on the tiles), not a missing figure. */
function moneyOrZero(money: Money, currency: string | null): string {
  return money.totals.length === 0 ? formatCompact(0, currency) : formatMoney(money);
}

function MoneyFigure({ color, label, sub, money, currency, hatched = false }: { color: string; label: string; sub: string; money: Money; currency: string | null; hatched?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="min-w-0">
        <LegendDot color={color} hatched={hatched} label={label} />
        <span className="block pl-5 text-xs text-[var(--ink-600)]">{sub}{money.valued > 0 ? ` · ${plural(money.valued, "contract")}` : ""}</span>
      </dt>
      <dd className="shrink-0 text-right text-base font-semibold tabular-nums text-foreground">{moneyOrZero(money, currency)}</dd>
    </div>
  );
}

/* ── Waiting on ──────────────────────────────────────────────────────────── */

export function WaitingPanel({ waiting, contracts, className }: { waiting: WaitingQueue[]; contracts: Contract[]; className?: string }) {
  const top = [...waiting].sort((a, b) => b.count - a.count)[0];
  const openCount = waiting.reduce((s, q) => s + q.count, 0);
  return (
    <Panel
      id="waiting"
      className={className}
      title="Waiting on"
      answer={openCount === 0 || !top
        ? "Nothing is waiting for signature."
        : <>Biggest queue: <span className="font-semibold text-foreground">{top.label.toLowerCase()}</span>, {plural(top.count, "contract")}{top.averageDays === null ? "" : `, ${Math.round(top.averageDays)} days on average`}.</>}
      action={{ href: "/reports/bottlenecks", label: "Bottlenecks" }}
    >
      {openCount === 0 ? (
        <PanelEmpty title="No queue" body="Every open contract has moved on." />
      ) : (
        <>
          <WaitingBars queues={waiting} contracts={contracts} hrefFor={(kind) => `/reports/bottlenecks#waiting-${kind}`} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3">
            <SlaLegend />
            <ViewAsTable table={waitingTable(waiting, contracts)} />
          </div>
        </>
      )}
    </Panel>
  );
}

export function LongestPanel({ longest, className }: { longest: Contract[]; className?: string }) {
  return (
    <Panel id="longest" className={className} title="Waiting longest" meta={longest.length || undefined} flush>
      {longest.length === 0 ? (
        <PanelEmpty title="Nothing waiting" body="No open contract is sitting in a step." />
      ) : (
        <ul className="divide-y divide-border">
          {longest.map((c) => (
            <ContractRow
              key={c.contractId}
              c={c}
              showNext={false}
              reason={`${c.daysInStage} days in this step, ${c.totalDays} in all`}
              tone={c.slaStatus === "red" ? "danger" : c.slaStatus === "amber" ? "warning" : "neutral"}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Time in step ────────────────────────────────────────────────────────── */

export function StepsPanel({
  stages, targets, className,
}: {
  className?: string;
  stages: StageQueue[];
  targets: Partial<Record<Stage, number | null>>;
}) {
  const any = stages.some((s) => s.count > 0);
  const slowest = [...stages].filter((q) => q.count > 0).sort((a, b) => (b.averageDays ?? 0) - (a.averageDays ?? 0))[0];
  const target = slowest ? targets[slowest.stage] : null;
  return (
    <Panel
      id="steps"
      className={className}
      title="Time in step"
      answer={slowest ? <>Slowest: <span className="font-semibold text-foreground">{STAGE_LABEL[slowest.stage].toLowerCase()}</span>, {Math.round(slowest.averageDays ?? 0)} days on average{target ? ` (target ${target})` : ""}.</> : undefined}
      action={{ href: "/reports/bottlenecks", label: "Details" }}
    >
      {any ? (
        <>
          {/* Columns: average days per step, in workflow order. */}
          <BarChart
            data={stages.map((q) => ({ step: STAGE_LABEL[q.stage], days: Math.round(q.averageDays ?? 0) }))}
            categoryKey="step"
            series={[{ key: "days", label: "Average days", color: "var(--brand-primary-600)" }]}
            orientation="vertical"
            showValues
            height={200}
            ariaLabel="Average days in each step"
          />
          <div className="mt-3"><ViewAsTable table={stageTable(stages, targets)} /></div>
        </>
      ) : (
        <PanelEmpty title="No open contracts" body="Step times appear once contracts move through review." />
      )}
    </Panel>
  );
}

/* ── Signed per month ────────────────────────────────────────────────────── */

/** The trend leaders and admins ask for: how many contracts got signed. */
export function SignedPanel({ contracts, className }: { contracts: Contract[]; className?: string }) {
  const [now] = useState(() => new Date());
  const rows = signedByMonth(contracts, now);
  const total = rows.reduce((s, r) => s + r.signed, 0);
  return (
    <Panel
      id="signed"
      className={className}
      title="Signed per month"
      answer={total ? <><span className="font-semibold text-foreground">{plural(total, "contract")}</span> signed in the last 6 months.</> : undefined}
      action={{ href: "/reports/trends", label: "Trends" }}
    >
      {total === 0 ? (
        <PanelEmpty title="Nothing signed yet" body="Signed contracts show here month by month." />
      ) : (
        <AreaTrend data={rows} xKey="month" series={[{ key: "signed", label: "Signed", color: "var(--success)" }]} height={200} ariaLabel="Contracts signed per month" />
      )}
    </Panel>
  );
}
