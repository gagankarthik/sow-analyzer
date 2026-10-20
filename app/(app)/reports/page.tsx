"use client";

// Reports hub: four reports, one card each, all the same size and structure:
// a plain label, today's figure, a small picture of the data behind it, and
// the link to open the full report. Downloads appear only when the exports
// feature is on.

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ListPanel } from "@/components/ds/Panel";
import { AlertTriangle, ArrowRight, DollarSign, Hourglass, ListChecks, TrendingUp } from "@/components/ui/icons";
import { contractsTable } from "@/lib/govern/export";
import { plural } from "@/lib/govern/labels";
import {
  byUrgency, formatCompact, isCurrent, isUnsigned, needsAttention, stageQueues, sumMoney, valueSummary, waitingQueues,
} from "@/lib/govern/metrics";
import { useContracts, useGovernFeature, useTrends } from "@/lib/govern/queries";
import { buildHomeReport } from "../home/_components/home-export";
import { ExportButtons } from "./_components/ExportButtons";
import { MoneySplitBar, Sparkline } from "./_components/ReportCharts";
import { ReportError } from "./_components/ReportKit";
import { amountIn, hasCaptureGaps, mainCurrency, useStageTargets } from "./_components/report-data";
import { hasHistory, periodLabel } from "./_components/trend-utils";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";
import { ReportCardBodySkeleton, ReportsIndexSkeleton } from "./_components/ReportSkeletons";

export default function ReportsPage() {
  const { data, isLoading, isError, error, refetch } = useContracts();
  const contracts = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const { targets } = useStageTargets(contracts);
  const exportsOn = useGovernFeature("exports");

  const facts = useMemo(() => {
    const open = contracts.filter(isUnsigned);
    const summary = valueSummary(contracts);
    return {
      open: open.length,
      overdue: open.filter((c) => c.slaStatus === "red").length,
      summary,
      primary: mainCurrency(summary.current, summary.potential),
      unvalued: sumMoney(contracts.filter((c) => isUnsigned(c) || isCurrent(c))).unvalued,
      missing: contracts.filter(hasCaptureGaps).length,
      attention: contracts.filter(needsAttention).sort(byUrgency),
      waiting: waitingQueues(contracts),
      stages: stageQueues(contracts),
      longest: [...open].sort((a, b) => b.daysInStage - a.daysInStage).slice(0, 3),
    };
  }, [contracts]);

  return (
    <>
      <PageHeader title="Reports" />
      <div className="app-container app-page">
        {isLoading ? (
          <ReportsIndexSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="your reports" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BottlenecksCard facts={facts} />
              <MoneyCard facts={facts} />
              <TrendsCard />
              <CaptureCard total={contracts.length} missing={facts.missing} />
            </div>

            {exportsOn && (
              <ListPanel id="downloads" as="h2" title="Downloads">
                <ul className="divide-y divide-border">
                  <DownloadRow
                    title="Leader summary"
                    detail="What needs attention, where work waits, and the money, as on Home."
                    disabled={contracts.length === 0}
                    build={() => buildHomeReport({ ...facts, targets })}
                  />
                  <DownloadRow
                    title="Every contract"
                    detail="One row per contract with step, who it waits on, days, value and next step."
                    disabled={contracts.length === 0}
                    build={() => ({
                      title: "Every contract",
                      fileBase: "govern-contracts",
                      summary: [{ label: "Contracts", value: String(contracts.length) }],
                      notes: ["Rejected and closed contracts are not included."],
                      tables: [contractsTable("Contracts", contracts)],
                    })}
                  />
                </ul>
              </ListPanel>
            )}
          </>
        )}
      </div>
    </>
  );
}

type Facts = {
  open: number;
  overdue: number;
  summary: ReturnType<typeof valueSummary>;
  primary: string | null;
  unvalued: number;
  waiting: ReturnType<typeof waitingQueues>;
};

/* ── The card frame: identical for every report ──────────────────────────── */

function ReportCard({
  href, icon: Icon, title, figure, figureLabel, tone = "neutral", detail, children,
}: {
  href: string;
  icon: typeof ArrowRight;
  title: string;
  figure: React.ReactNode;
  figureLabel: string;
  tone?: "neutral" | "danger" | "warning";
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-[var(--ink-300)] hover:bg-[var(--ink-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{title}</span>
        <ArrowRight size={16} aria-hidden className="shrink-0 text-[var(--ink-400)] transition-colors duration-150 group-hover:text-[var(--brand-primary-600)]" />
      </span>
      <span className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={tone === "danger" ? "text-3xl font-semibold tabular-nums tracking-tight text-[var(--danger-fg)]" : tone === "warning" ? "text-3xl font-semibold tabular-nums tracking-tight text-[var(--warning-fg)]" : "text-3xl font-semibold tabular-nums tracking-tight text-foreground"}>{figure}</span>
        <span className={tone === "danger" ? "inline-flex items-center gap-1 text-xs font-medium text-[var(--danger-fg)]" : tone === "warning" ? "inline-flex items-center gap-1 text-xs font-medium text-[var(--warning-fg)]" : "text-xs text-[var(--ink-600)]"}>
          {tone !== "neutral" && <AlertTriangle size={12} aria-hidden className="shrink-0" />}
          {figureLabel}
        </span>
      </span>
      <span className="mt-3 block min-h-[4.5rem]">{children}</span>
      <span className="mt-3 block border-t border-border pt-2.5 text-xs text-[var(--ink-600)]">{detail}</span>
    </Link>
  );
}

/* ── The four reports ────────────────────────────────────────────────────── */

function BottlenecksCard({ facts }: { facts: Facts }) {
  const queues = [...facts.waiting].filter((q) => q.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  const max = Math.max(1, ...queues.map((q) => q.count));
  return (
    <ReportCard
      href="/reports/bottlenecks"
      icon={Hourglass}
      title="Bottlenecks"
      figure={String(facts.open)}
      figureLabel={facts.overdue > 0 ? `waiting, ${facts.overdue} overdue` : "waiting for signature"}
      tone={facts.overdue > 0 ? "danger" : "neutral"}
      detail="By step and by holder, days against target"
    >
      {queues.length === 0 ? (
        <span className="text-sm text-[var(--ink-600)]">Nothing is waiting right now.</span>
      ) : (
        <span className="flex flex-col gap-2">
          {queues.map((q) => (
            <span key={q.kind} className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
              <span className="truncate text-[var(--ink-700)]">{q.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--ink-100)]">
                <span className="block h-full rounded-full bg-[var(--viz-primary)]" style={{ width: `${(q.count / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-foreground">{q.count}</span>
            </span>
          ))}
        </span>
      )}
    </ReportCard>
  );
}

function MoneyCard({ facts }: { facts: Facts }) {
  const { summary, primary } = facts;
  const current = amountIn(summary.current, primary);
  const potential = amountIn(summary.potential, primary);
  const heldUp = amountIn(summary.heldUp, primary);
  const any = current + potential > 0;
  return (
    <ReportCard
      href="/reports/value"
      icon={DollarSign}
      title="Value"
      figure={formatCompact(current, primary)}
      figureLabel={`signed · ${formatCompact(potential, primary)} on the way`}
      detail={facts.unvalued > 0 ? `${plural(facts.unvalued, "contract")} without a value: totals are incomplete` : "Money in and out, held-up value, breakdowns"}
    >
      {any ? (
        <MoneySplitBar
          current={current}
          potential={potential}
          heldUp={heldUp}
          labels={{ current: formatCompact(current, primary), potential: formatCompact(potential, primary), heldUp: formatCompact(heldUp, primary) }}
        />
      ) : (
        <span className="text-sm text-[var(--ink-600)]">No contract has a value yet.</span>
      )}
    </ReportCard>
  );
}

function TrendsCard() {
  const { data, isLoading, isError } = useTrends("month", 6);
  const periods = data?.periods ?? [];
  const signed = periods.reduce((s, p) => s + (p.signed ?? 0), 0);
  return (
    <ReportCard
      href="/reports/trends"
      icon={TrendingUp}
      title="Trends"
      figure={isLoading ? <SkeletonLine text="text-3xl font-semibold" width="w-12" className="inline-block" /> : isError ? "—" : String(signed)}
      figureLabel="signed in the last 6 months"
      detail="Arrivals, signatures, days to sign, terms that cause changes"
    >
      {isLoading ? (
        <SkeletonRegion label="trends"><ReportCardBodySkeleton /></SkeletonRegion>
      ) : isError || !data ? (
        <span className="text-sm text-[var(--ink-600)]">Couldn&apos;t load trends. Open the report to try again.</span>
      ) : !hasHistory(periods) ? (
        <span className="text-sm text-[var(--ink-600)]">Trends appear after a few weeks of activity.</span>
      ) : (
        <Sparkline
          periods={periods.map((p) => periodLabel(p, data.granularity))}
          caption="Contracts received and signed per month"
          series={[
            { label: "Received", values: periods.map((p) => p.received), color: "var(--ink-400)", dashed: true },
            { label: "Signed", values: periods.map((p) => p.signed), color: "var(--viz-primary)" },
          ]}
        />
      )}
    </ReportCard>
  );
}

function CaptureCard({ total, missing }: { total: number; missing: number }) {
  const complete = total - missing;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 100;
  return (
    <ReportCard
      href="/reports/capture"
      icon={ListChecks}
      title="Data capture"
      figure={`${pct}%`}
      figureLabel={missing > 0 ? `complete · ${plural(missing, "contract")} missing details` : "of contracts complete"}
      tone={missing > 0 ? "warning" : "neutral"}
      detail="Missing key details and documents that never became a contract"
    >
      <span className="flex flex-col gap-2">
        <span className="h-2 overflow-hidden rounded-full bg-[var(--ink-100)]" role="img" aria-label={`${pct}% of contracts have every key detail`}>
          <span className="block h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-sm text-[var(--ink-600)]">
          {complete} of {plural(total, "contract")} {complete === 1 ? "has" : "have"} every key detail.
        </span>
      </span>
    </ReportCard>
  );
}

function DownloadRow({ title, detail, build, disabled }: { title: string; detail: string; build: Parameters<typeof ExportButtons>[0]["build"]; disabled: boolean }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-[var(--ink-600)]">{detail}</span>
      </span>
      <ExportButtons build={build} disabled={disabled} />
    </li>
  );
}
