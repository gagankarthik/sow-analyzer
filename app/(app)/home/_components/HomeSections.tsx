"use client";

// The leader home's building blocks. Every section is a Panel: a titled card
// with a one-line answer in its header and the detail in its body, so the
// page reads as a grid of equal-weight answers (Gestalt common region).
// Each panel owns its empty state; the page owns loading and errors.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, DollarSign, Info } from "@/components/ui/icons";
import type { Opportunity } from "@/lib/govern/opportunities";
import { Skeleton } from "@/components/ui/skeleton";
import { DIRECTION_LABEL, plural } from "@/lib/govern/labels";
import {
  formatCompact, formatMoney, type Money, type StageQueue, type ValueSummary, type WaitingQueue,
} from "@/lib/govern/metrics";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import {
  LegendDot, MoneySplitBar, SlaLegend, StageFlow, VALUE_FILL, WaitingBars, stageTable, waitingTable,
} from "../../reports/_components/ReportCharts";
import { TEXT_LINK, ViewAsTable } from "../../reports/_components/ReportKit";
import { amountIn } from "../../reports/_components/report-data";
import { attentionSentence } from "./attention";
import { ContractRow } from "./ContractRow";

/* ── Shared frame ────────────────────────────────────────────────────────── */

export function Panel({
  id, title, answer, action, children, className, flush = false,
}: {
  id: string;
  title: string;
  /** One line under the title that answers the panel's question. */
  answer?: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  /** Body without padding, for edge-to-edge lists. */
  flush?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("flex min-w-0 scroll-mt-20 flex-col rounded-xl border border-border bg-card shadow-xs", className)}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">{title}</h2>
          {answer && <p className="mt-0.5 text-sm text-[var(--ink-600)]">{answer}</p>}
        </div>
        {action && (
          <Link href={action.href} className={cn(TEXT_LINK, "shrink-0 whitespace-nowrap")}>
            {action.label} <ArrowRight size={14} />
          </Link>
        )}
      </header>
      <div className={cn("flex min-h-0 flex-1 flex-col", !flush && "p-5")}>{children}</div>
    </section>
  );
}

/** A panel's "nothing here" state: says so plainly, in the panel's own space. */
function PanelEmpty({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "success" }) {
  return (
    <div className="px-5 py-6">
      <div className="flex max-w-md items-start gap-3">
        {tone === "success" ? (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
          </span>
        ) : (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink-100)] text-[var(--ink-600)]">
            <Info size={18} strokeWidth={2} aria-hidden />
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-[var(--ink-600)]">{body}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Summary tiles ───────────────────────────────────────────────────────── */

export type Kpi = {
  label: string;
  value: string;
  sub: string;
  href: string;
  tone?: "neutral" | "danger" | "warning";
};

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
      {items.map((k) => (
        <li key={k.label} className="min-w-0">
          <Link
            href={k.href}
            className="group flex h-full flex-col rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs transition-colors duration-150 hover:border-[var(--brand-primary-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
          >
            <span className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--ink-600)]">
              {k.label}
              <ArrowRight size={14} aria-hidden className="text-[var(--ink-400)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary-600)] motion-reduce:transition-none" />
            </span>
            <span className="mt-1 truncate text-3xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{k.value}</span>
            <span
              className={cn(
                "mt-0.5 truncate text-xs font-medium",
                k.tone === "danger" ? "text-[var(--danger)]" : k.tone === "warning" ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]",
              )}
            >
              {k.sub}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── What needs my attention? ────────────────────────────────────────────── */

const FIRST = 4;

export function AttentionPanel({ contracts, className }: { contracts: Contract[]; className?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? contracts : contracts.slice(0, FIRST);
  const overdue = contracts.filter((c) => c.slaStatus === "red").length;

  return (
    <Panel
      id="attention"
      className={className}
      title="What needs my attention"
      flush
      answer={contracts.length === 0
        ? "Nothing is overdue or held up."
        : <>{plural(contracts.length, "contract")}{overdue > 0 ? <>, <span className="font-semibold text-[var(--danger)]">{overdue} overdue</span></> : null}. Most urgent first.</>}
      action={{ href: "/workflow", label: "Workflow" }}
    >
      {contracts.length === 0 ? (
        <PanelEmpty
          tone="success"
          title="You're all caught up"
          body="No contract is overdue or held up by a term you don't accept. This list updates on its own."
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((c) => (
              <ContractRow key={c.contractId} c={c} reason={attentionSentence(c)} tone={c.slaStatus === "red" ? "danger" : "warning"} />
            ))}
          </ul>
          {contracts.length > FIRST && (
            <div className="border-t border-border px-5 py-3">
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

/** Shown in place of the attention panel when nothing needs the leader. */
export function AllClear() {
  return (
    <section
      id="attention"
      aria-labelledby="attention-title"
      className="flex scroll-mt-20 items-center gap-3 rounded-xl border border-[var(--success-border)] bg-[var(--success-soft)] px-4 py-3"
    >
      <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-[var(--success)]" aria-hidden />
      <p className="text-sm text-foreground">
        <span id="attention-title" className="font-semibold">You&apos;re all caught up.</span>{" "}
        No contract is overdue or held up by a term you don&apos;t accept.
      </p>
    </section>
  );
}

/* ── Ways to save time and money ─────────────────────────────────────────── */

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
      title="Ways to save time and money"
      flush
      answer={items.length === 0
        ? "Nothing to act on right now."
        : `${[time ? `${time} to save time` : "", money ? `${money} to protect money` : ""].filter(Boolean).join(", ")}. Most pressing first.`}
    >
      {items.length === 0 ? (
        <PanelEmpty tone="success" title="Running efficiently" body="No contract is past its target, unowned or holding up value, and no obligation is overdue." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((o) => (
              <li key={o.id}>
                <Link
                  href={o.href}
                  className="group flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                      o.kind === "time" ? "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]" : "bg-[var(--success-soft)] text-[var(--success-fg)]",
                    )}
                    aria-hidden
                  >
                    {o.kind === "time" ? <Clock size={16} /> : <DollarSign size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground group-hover:text-[var(--brand-primary-700)]">{o.title}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{o.figure}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--ink-600)]">{o.detail}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)]">
                      <span className="sr-only">{o.kind === "time" ? "Saves time. " : "Protects money. "}</span>
                      {o.action} <ArrowRight size={14} aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > SAVINGS_FIRST && (
            <div className="border-t border-border px-5 py-3">
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

/* ── Where the money is ──────────────────────────────────────────────────── */

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

  return (
    <Panel
      id="money"
      className={className}
      title="What is the money"
      answer={anyValue
        ? <><span className="font-semibold text-foreground">{formatCompact(current, primary)}</span> signed, <span className="font-semibold text-foreground">{formatCompact(potential, primary)}</span> on the way.</>
        : "No contract has a value yet."}
      action={{ href: "/reports/value", label: "Report" }}
    >
      {anyValue ? (
        <>
          <MoneySplitBar
            current={current}
            potential={potential}
            heldUp={heldUp}
            labels={{ current: formatCompact(current, primary), potential: formatCompact(potential, primary), heldUp: formatCompact(heldUp, primary) }}
          />
          <dl className="mt-4 divide-y divide-border">
            <MoneyFigure color={VALUE_FILL.current} label="Current" sub="Signed and active" money={summary.current} />
            <MoneyFigure color={VALUE_FILL.potential} label="Potential" sub="In the pipeline" money={summary.potential} />
            <MoneyFigure color={VALUE_FILL.heldUp} hatched label="Held up" sub="Of the potential, past its target" money={summary.heldUp} />
          </dl>
          {multi && (
            <p className="mt-3 flex items-start gap-2 text-xs text-[var(--ink-600)]">
              <Info size={14} className="mt-px shrink-0" aria-hidden />
              The bar shows {primary || "the main currency"} only. Other currencies are never added together.
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            {(["incoming", "outgoing"] as const).map((d) => (
              <div key={d} className="min-w-0">
                <dt className="text-xs font-medium text-[var(--ink-600)]">{DIRECTION_LABEL[d]}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">{formatMoney(summary.byDirection[d].current)}</dd>
                <dd className="truncate text-xs tabular-nums text-[var(--ink-600)]">{formatMoney(summary.byDirection[d].potential)} potential</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <PanelEmpty title="No values yet" body="Add a value to a contract and the signed, pipeline and held-up totals appear here." />
      )}

      {(unvalued > 0 || captureGaps > 0) && (
        <div className="flex flex-col gap-2 pt-4">
          {unvalued > 0 && (
            <Link
              href="/reports/value#no-value"
              className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-3 py-2.5 text-sm text-foreground transition-colors hover:border-[var(--warning)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
            >
              <span><span className="font-semibold">{plural(unvalued, "contract")}</span> without a value. Totals are incomplete.</span>
              <ArrowRight size={14} className="shrink-0" aria-hidden />
            </Link>
          )}
          {captureGaps > 0 && (
            <Link href="/reports/capture" className={TEXT_LINK}>
              {plural(captureGaps, "contract")} missing details <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}
    </Panel>
  );
}

function MoneyFigure({ color, label, sub, money, hatched = false }: { color: string; label: string; sub: string; money: Money; hatched?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="min-w-0">
        <LegendDot color={color} hatched={hatched} label={label} />
        <span className="block pl-5 text-xs text-[var(--ink-600)]">{sub}{money.valued > 0 ? ` · ${plural(money.valued, "contract")}` : ""}</span>
      </dt>
      <dd className="shrink-0 text-right text-base font-semibold tabular-nums text-foreground">{formatMoney(money)}</dd>
    </div>
  );
}

/* ── Where work is waiting ───────────────────────────────────────────────── */

export function WaitingPanel({ waiting, contracts, className }: { waiting: WaitingQueue[]; contracts: Contract[]; className?: string }) {
  const top = [...waiting].sort((a, b) => b.count - a.count)[0];
  const openCount = waiting.reduce((s, q) => s + q.count, 0);
  return (
    <Panel
      id="waiting"
      className={className}
      title="What is stuck and why"
      answer={openCount === 0 || !top
        ? "Nothing is waiting for signature."
        : <>Biggest queue: <span className="font-semibold text-foreground">{top.label.toLowerCase()}</span>, {plural(top.count, "contract")}{top.averageDays === null ? "" : `, ${Math.round(top.averageDays)} days on average`}.</>}
      action={{ href: "/reports/bottlenecks", label: "Bottlenecks" }}
    >
      {openCount === 0 ? (
        <PanelEmpty tone="success" title="No queue" body="Every open contract has moved on. New ones appear here as they arrive." />
      ) : (
        <>
          <WaitingBars queues={waiting} contracts={contracts} hrefFor={(kind) => `/reports/bottlenecks#waiting-${kind}`} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-4">
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
    <Panel id="longest" className={className} title="Waiting longest" answer="Open contracts by days in their current step." flush>
      {longest.length === 0 ? (
        <PanelEmpty tone="success" title="Nothing waiting" body="No open contract is sitting in a step." />
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

/* ── How long each step takes ────────────────────────────────────────────── */

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
      title="How long each step takes"
      answer="Average days open contracts have spent in each step, against its target."
      action={{ href: "/reports/bottlenecks", label: "Details" }}
    >
      {any ? (
        <>
          <StageFlow queues={stages} targets={targets} redAfter={redAfter} compact hrefFor={(s) => `/reports/bottlenecks#stage-${s}`} />
          <div className="mt-3"><ViewAsTable table={stageTable(stages, targets)} /></div>
        </>
      ) : (
        <PanelEmpty title="No open contracts" body="Step times appear once contracts are moving through review." />
      )}
    </Panel>
  );
}

/* ── Loading ─────────────────────────────────────────────────────────────── */

function PanelSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>
      <div className="space-y-2 border-b border-border px-5 py-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the loaded layout block for block, so nothing jumps when data arrives. */
export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your home">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-5">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={3} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4 lg:gap-5">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
