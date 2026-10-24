"use client";

// The home's building blocks. Every section is a Panel (UI_SPEC section 3):
// a plain label, an optional count beside it, then the detail. Each panel
// owns its empty state; the page owns loading and errors.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, DollarSign, Sonar as SonarIcon } from "@/components/ui/icons";
import type { Opportunity } from "@/lib/govern/opportunities";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PanelSkeleton, SkeletonLine, SkeletonRegion, SummaryTilesSkeleton,
} from "@/components/ds/skeletons";
import { STAGE_LABEL, plural } from "@/lib/govern/labels";
import type { StageQueue } from "@/lib/govern/metrics";
import { STAGE_BG, STAGE_COLOR } from "@/lib/govern/stage-style";
import type { Contract } from "@/lib/govern/types";
import { displayTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ListPanel, Panel as DsPanel } from "@/components/ds/Panel";
import { SummaryTiles, type DeltaProps } from "@/components/ds/KpiTile";
import { Sparkline } from "@/components/ds/charts/Sparkline";
import { TEXT_LINK } from "../../reports/_components/ReportKit";
import { actionTask, attentionSentence, contractHref, dueText, type DueTone } from "./attention";

import { SonarName } from "@/components/ui/SonarText";
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

/* ── Page header ─────────────────────────────────────────────────────────── */

const TODAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

/** The title, today's date under it, and at most one control on the right. */
export function HomeHeader({ title, control }: { title: string; control?: React.ReactNode }) {
  const [today] = useState(() => TODAY.format(new Date()));
  return (
    <div className="app-container pt-5 md:pt-6">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
          <p suppressHydrationWarning className="mt-0.5 text-sm text-[var(--ink-600)]">{today}</p>
        </div>
        {control}
      </div>
    </div>
  );
}

/* ── Needs your action ───────────────────────────────────────────────────── */

const ACTION_ROWS = 5;

const DUE_TEXT: Record<DueTone, string> = {
  danger: "text-[var(--danger-fg)]",
  warning: "text-[var(--warning-fg)]",
  neutral: "text-[var(--ink-700)]",
};

/** The work waiting on the user: the task, the contract and party, when it is due. */
export function NeedsActionPanel({
  contracts, href, className,
}: {
  contracts: Contract[];
  /** Where "View all" goes: the full queue. */
  href: string;
  className?: string;
}) {
  return (
    <ListPanel
      id="attention"
      as="h2"
      title="Needs your action"
      meta={contracts.length || undefined}
      className={className}
      footer={contracts.length > ACTION_ROWS ? (
        <Link href={href} className={TEXT_LINK}>View all {contracts.length} <ArrowRight size={12} aria-hidden /></Link>
      ) : undefined}
    >
      {contracts.length === 0 ? (
        <PanelEmpty title="Nothing needs you" body="No contract is overdue or held up by a term you don't accept." />
      ) : (
        <ul className="divide-y divide-border">
          {contracts.slice(0, ACTION_ROWS).map((c) => <ActionRow key={c.contractId} c={c} />)}
        </ul>
      )}
    </ListPanel>
  );
}

function ActionRow({ c }: { c: Contract }) {
  const due = dueText(c);
  const why = attentionSentence(c);
  const where = [displayTitle(c.title) || "Untitled contract", c.sponsor || c.counterparty].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={contractHref(c.contractId) + (c.openBlockers > 0 ? "#blockers" : "")}
        title={why}
        className="group grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 px-4 py-3 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)]"
      >
        <span className="truncate text-[0.9375rem] font-semibold text-foreground group-hover:text-[var(--brand-primary-700)]">
          {actionTask(c)}
          <span className="sr-only">. {why}</span>
        </span>
        <span className={cn("text-right text-sm font-semibold tabular-nums whitespace-nowrap", DUE_TEXT[due.tone])}>{due.label}</span>
        <span className="col-span-2 truncate text-sm text-[var(--ink-600)]">{where}</span>
      </Link>
    </li>
  );
}

/* ── Pipeline ────────────────────────────────────────────────────────────── */

/** One row per step before signature: how many sit there, and how many are past target. */
export function PipelinePanel({ stages, className }: { stages: StageQueue[]; className?: string }) {
  const open = stages.reduce((s, q) => s + q.count, 0);
  const max = Math.max(0, ...stages.map((q) => q.count));
  return (
    <DsPanel
      id="pipeline"
      as="h2"
      title="Pipeline"
      meta={open > 0 ? plural(open, "open contract") : undefined}
      className={className}
      actions={<Link href="/reports/bottlenecks" className={cn(TEXT_LINK, "whitespace-nowrap")}>Bottlenecks <ArrowRight size={12} aria-hidden /></Link>}
      bodyClassName="py-2"
    >
      {open === 0 ? (
        <PanelEmpty title="No open contracts" body="Contracts appear here from draft until they are signed." />
      ) : (
        <ul className="divide-y divide-border">
          {stages.map((q) => (
            <li key={q.stage}>
              <Link
                href={`/reports/bottlenecks#stage-${q.stage}`}
                className="grid min-h-11 grid-cols-[10rem_minmax(0,1fr)_2.5rem] -mx-2 items-center gap-x-3 gap-y-1 rounded-sm px-2 py-2 text-sm transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] sm:grid-cols-[11.5rem_minmax(0,1fr)_2.5rem_8rem]"
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-sm", STAGE_BG[q.stage])} />
                  <span className="truncate">{STAGE_LABEL[q.stage]}</span>
                </span>
                <svg aria-hidden className="h-2.5 w-full" preserveAspectRatio="none">
                  <rect x="0" y="0" width="100%" height="10" rx="5" fill="var(--ink-100)" />
                  {q.count > 0 && <rect x="0" y="0" width={`${(q.count / max) * 100}%`} height="10" rx="5" fill={STAGE_COLOR[q.stage]} />}
                </svg>
                <span className="text-right font-semibold tabular-nums text-foreground">{q.count}</span>
                <span
                  className={cn(
                    "col-span-3 font-semibold tabular-nums sm:col-span-1 sm:text-right",
                    q.overdue > 0 ? "text-[var(--danger-fg)]" : q.count > 0 ? "text-[var(--success-fg)]" : "text-[var(--ink-500)]",
                  )}
                >
                  {q.overdue > 0 ? `${q.overdue} past target` : q.count > 0 ? "On track" : "None"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DsPanel>
  );
}

/* ── Sonar found ─────────────────────────────────────────────────────────── */

const FINDINGS = 5;

/** What Sonar found in the portfolio: one line each, one link to act on it. */
export function SonarPanel({ items, className }: { items: Opportunity[]; className?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, FINDINGS);
  return (
    <ListPanel
      id="sonar"
      as="h2"
      className={className}
      title={(
        <span className="flex items-center gap-2">
          <SonarIcon size={18} aria-hidden className="shrink-0 text-[var(--brand-primary-800)]" />
          <SonarName /> found
        </span>
      )}
      footer={items.length > FINDINGS ? (
        <button type="button" onClick={() => setAll((v) => !v)} className={TEXT_LINK} aria-expanded={all}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      ) : undefined}
    >
      {items.length === 0 ? (
        <PanelEmpty title="Nothing found" body="No contract is past its target, unowned or holding up value, and no obligation is overdue." />
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((o) => (
            <li key={o.id} title={o.detail} className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1 text-[0.9375rem] text-foreground">
                {o.title}
                <span className="tabular-nums text-[var(--ink-600)]"> · {o.figure}</span>
              </span>
              <Link href={o.href} className={cn(TEXT_LINK, "shrink-0 font-semibold whitespace-nowrap")}>{o.action}</Link>
            </li>
          ))}
        </ul>
      )}
    </ListPanel>
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

/* ── Loading ─────────────────────────────────────────────────────────────── */

const HOME_TILES = ["Open contracts", "Past their target", "Signed and active", "Held up"];

/** Mirrors the loaded layout block for block (tiles, then 5 + 7 columns,
 *  then Sonar found), so nothing jumps when data arrives. */
export function HomeSkeleton() {
  return (
    <SkeletonRegion label="your home" className="flex flex-col gap-6">
      <SummaryTilesSkeleton labels={HOME_TILES} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <PanelSkeleton title="Needs your action" row="two-line" rows={5} actions={false} className="lg:col-span-5" />
        <PanelSkeleton title="Pipeline" padded className="lg:col-span-7">
          <div className="flex flex-col gap-4 py-1">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        </PanelSkeleton>
      </div>
      <PanelSkeleton title="Sonar found" row="line" rows={3} actions={false} />
    </SkeletonRegion>
  );
}

/** The whole Home route before it renders: title and date, view tabs, then the body skeleton. */
export function HomePageSkeleton() {
  return (
    <>
      <div className="app-container pt-5 md:pt-6">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-foreground">Home</h1>
        <SkeletonLine text="text-sm" width="w-40" className="mt-0.5" />
      </div>
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
