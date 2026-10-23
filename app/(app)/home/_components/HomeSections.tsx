"use client";

// The home's building blocks. Every section is a Panel (UI_SPEC section 3):
// a plain label, an optional count beside it, then the detail. Each panel
// owns its empty state; the page owns loading and errors.

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, DollarSign, Info } from "@/components/ui/icons";
import type { Opportunity } from "@/lib/govern/opportunities";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartSkeleton, PageTitleSkeleton, PanelSkeleton, SkeletonLine, SkeletonRegion, SummaryTilesSkeleton,
} from "@/components/ds/skeletons";
import { DIRECTION_LABEL, plural } from "@/lib/govern/labels";
import {
  formatCompact, formatMoney, type Money, type StageQueue, type ValueSummary, type WaitingQueue,
} from "@/lib/govern/metrics";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ListPanel, Panel as DsPanel } from "@/components/ds/Panel";
import { SummaryTiles, type DeltaProps } from "@/components/ds/KpiTile";
import { Sparkline } from "@/components/ds/charts/Sparkline";
import {
  LegendDot, MoneySplitBar, SlaLegend, StageFlow, VALUE_FILL, WaitingBars, stageTable, waitingTable,
} from "../../reports/_components/ReportCharts";
import { TEXT_LINK, ViewAsTable } from "../../reports/_components/ReportKit";
import { amountIn } from "../../reports/_components/report-data";
import { attentionSentence } from "./attention";
import { ContractRow } from "./ContractRow";

/* ── Shared frame ────────────────────────────────────────────────────────── */

export function Panel({
  id, title, meta, answer, action, children, className, flush = false,
}: {
  id: string;
  title: string;
  /** Count beside the title (12px muted). */
  meta?: React.ReactNode;
  /** Short status line at the top of the body: figures, not coaching. */
  answer?: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  /** Body without padding, for edge-to-edge lists. */
  flush?: boolean;
}) {
  const Frame = flush ? ListPanel : DsPanel;
  return (
    <Frame
      id={id}
      as="h2"
      title={title}
      meta={meta}
      className={className}
      actions={action && (
        <Link href={action.href} className={cn(TEXT_LINK, "shrink-0 whitespace-nowrap")}>
          {action.label} <ArrowRight size={12} aria-hidden />
        </Link>
      )}
    >
      {answer && <p className={cn("text-xs text-[var(--ink-600)]", flush ? "border-b border-border px-4 py-2" : "mb-3")}>{answer}</p>}
      {children}
    </Frame>
  );
}

/** A panel's "nothing here" state: quiet grey (nothing wrong is not green). */
function PanelEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 max-w-md text-sm text-[var(--ink-600)]">{body}</p>
    </div>
  );
}

/* ── Summary tiles ───────────────────────────────────────────────────────── */

export type Kpi = {
  label: string;
  value: string;
  sub: string;
  href: string;
  /** danger / warning: needs action; success: a change for the better. Neutral is quiet. */
  tone?: "neutral" | "danger" | "warning" | "success";
  /** Change against the previous period, from real history only. */
  delta?: DeltaProps;
  /** The figure per period, oldest first, drawn as a sparkline. */
  trend?: (number | null)[];
};

/** The summary row: the shared ds tiles, so every page's KPIs look the same. */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <SummaryTiles
      items={items.map((k) => ({
        label: k.label,
        value: k.value,
        footnote: k.sub,
        href: k.href,
        tone: k.tone && k.tone !== "neutral" ? k.tone : undefined,
        delta: k.delta,
        sparkline: k.trend ? <Sparkline values={k.trend} /> : undefined,
      }))}
    />
  );
}

/* ── Needs you ───────────────────────────────────────────────────────────── */

const FIRST = 4;

export function AttentionPanel({ contracts, className }: { contracts: Contract[]; className?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? contracts : contracts.slice(0, FIRST);
  const overdue = contracts.filter((c) => c.slaStatus === "red").length;

  return (
    <Panel
      id="attention"
      className={className}
      title="Needs you"
      flush
      meta={contracts.length > 0 && (
        <>
          {contracts.length}
          {overdue > 0 && <span className="text-[var(--danger-fg)]"> · {overdue} overdue</span>}
        </>
      )}
      action={{ href: "/workflow", label: "Workflow" }}
    >
      {contracts.length === 0 ? (
        <PanelEmpty title="Nothing needs you" body="No contract is overdue or held up by a term you don't accept." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((c) => (
              <ContractRow key={c.contractId} c={c} reason={attentionSentence(c)} tone={c.slaStatus === "red" ? "danger" : "warning"} />
            ))}
          </ul>
          {contracts.length > FIRST && (
            <div className="border-t border-border px-4 py-2">
              <button type="button" onClick={() => setAll((v) => !v)} className={TEXT_LINK} aria-expanded={all}>
                {all ? "Show fewer" : `Show all ${contracts.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/** Shown in place of the attention panel when nothing needs you: quiet, not green. */
export function AllClear() {
  return (
    <section
      id="attention"
      aria-labelledby="attention-title"
      className="flex scroll-mt-20 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
    >
      <Info size={16} className="shrink-0 text-[var(--ink-500)]" aria-hidden />
      <p className="min-w-0 text-sm text-[var(--ink-600)]">
        <span id="attention-title" className="font-medium text-foreground">Nothing needs you.</span>{" "}
        No contract is overdue or held up.
      </p>
    </section>
  );
}

/* ── Savings ─────────────────────────────────────────────────────────────── */

const SAVINGS_FIRST = 4;

/** Found from the portfolio as it stands: counts and sums, never estimates. */
export function OpportunitiesPanel({ items, className }: { items: Opportunity[]; className?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, SAVINGS_FIRST);
  const time = items.filter((o) => o.kind === "time").length;
  const money = items.length - time;
  return (
    <Panel
      id="opportunities"
      className={className}
      title="Savings"
      flush
      meta={items.length > 0 ? [time ? `${time} on time` : "", money ? `${money} on money` : ""].filter(Boolean).join(" · ") : undefined}
    >
      {items.length === 0 ? (
        <PanelEmpty title="Nothing to act on" body="No contract is past its target, unowned or holding up value, and no obligation is overdue." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((o) => (
              <li key={o.id}>
                <Link
                  href={o.href}
                  title={o.detail}
                  className="group flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]"
                >
                  <span className="shrink-0 text-[var(--ink-500)]" aria-hidden>
                    {o.kind === "time" ? <Clock size={16} /> : <DollarSign size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="sr-only">{o.kind === "time" ? "Saves time: " : "Protects money: "}</span>
                    <span className="font-medium text-foreground">{o.title}</span>
                    <span className="text-[var(--ink-500)]"> — </span>
                    <span className="font-medium text-[var(--brand-primary-700)] group-hover:underline underline-offset-2">{o.action}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{o.figure}</span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > SAVINGS_FIRST && (
            <div className="border-t border-border px-4 py-2">
              <button type="button" onClick={() => setAll((v) => !v)} className={TEXT_LINK} aria-expanded={all}>
                {all ? "Show fewer" : `Show all ${items.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

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
  stages, targets, redAfter,
}: {
  stages: StageQueue[];
  targets: Partial<Record<Stage, number | null>>;
  redAfter: number;
}) {
  const any = stages.some((s) => s.count > 0);
  return (
    <Panel
      id="steps"
      title="Time in step"
      action={{ href: "/reports/bottlenecks", label: "Details" }}
    >
      {any ? (
        <>
          <StageFlow queues={stages} targets={targets} redAfter={redAfter} compact hrefFor={(s) => `/reports/bottlenecks#stage-${s}`} />
          <div className="mt-3"><ViewAsTable table={stageTable(stages, targets)} /></div>
        </>
      ) : (
        <PanelEmpty title="No open contracts" body="Step times appear once contracts move through review." />
      )}
    </Panel>
  );
}

/* ── Loading ─────────────────────────────────────────────────────────────── */

const HOME_TILES = ["Needs you", "Open contracts", "Signed and active", "Held up"];

/** Mirrors the loaded layout block for block (tiles, then 8 + 4 columns of
 *  panels with their real titles), so nothing jumps when data arrives. */
export function HomeSkeleton() {
  return (
    <SkeletonRegion label="your home" className="flex flex-col gap-6">
      <SummaryTilesSkeleton labels={HOME_TILES} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <PanelSkeleton title="Needs you" row="line" rows={4} footer />
          <PanelSkeleton title="Savings" row="line" rows={4} actions={false} />
          <PanelSkeleton title="Waiting on" padded>
            <SkeletonLine text="text-xs" width="w-72" className="mb-3" />
            <ChartSkeleton height="h-44" bars={5} />
          </PanelSkeleton>
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <ViewsCardSkeleton />
          <MoneyPanelSkeleton />
          <PanelSkeleton title="Waiting longest" row="line" rows={5} actions={false} />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** "Your views" before the counts: six 36px rows. */
export function ViewsCardSkeleton() {
  return <PanelSkeleton title="Your views" row="key-value" rows={6} />;
}

/** The Value panel: split bar, three figures, the incoming / outgoing pair. */
function MoneyPanelSkeleton() {
  return (
    <PanelSkeleton title="Value" padded>
      <Skeleton className="mb-3 h-3 w-full rounded-pill" />
      <div className="divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 flex-col">
              <SkeletonLine text="text-sm" width="w-20" />
              <SkeletonLine text="text-xs" width="w-32" />
            </span>
            <SkeletonLine text="text-base font-semibold" width="w-16" className="shrink-0" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex min-w-0 flex-col">
            <SkeletonLine text="text-xs" width="w-16" />
            <SkeletonLine text="text-sm font-semibold" width="w-20" className="mt-0.5" />
            <SkeletonLine text="text-xs" width="w-24" />
          </div>
        ))}
      </div>
    </PanelSkeleton>
  );
}

/** Search + Export in the title row, before the data that enables them. */
export function HomeActionsSkeleton() {
  return (
    <span aria-hidden className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-11 w-full md:h-8 md:w-60" />
      <Skeleton className="h-9 w-[5.75rem]" />
    </span>
  );
}

/** The whole Home route before it renders: title row, view tabs, then the body skeleton. */
export function HomePageSkeleton() {
  return (
    <>
      <PageTitleSkeleton title="Home" actions={0} />
      <div className="app-container app-page">
        <div aria-hidden className="scrollbar-none flex gap-6 overflow-hidden border-b border-border">
          {["Overview", "Risk and documents"].map((t, i) => (
            <span
              key={t}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center border-b-2 text-sm font-medium whitespace-nowrap max-md:h-11",
                i === 0 ? "border-[var(--brand-primary-600)] font-semibold text-foreground" : "border-transparent text-[var(--ink-600)]",
              )}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="-mt-2 flex flex-col gap-6">
          <HomeSkeleton />
        </div>
      </div>
    </>
  );
}
