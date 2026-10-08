"use client";

// Reports hub: each report as the question it answers, with today's answer
// on the card, plus one-click downloads for leadership updates.

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { ArrowRight } from "@/components/ui/icons";
import { contractsTable } from "@/lib/govern/export";
import { plural } from "@/lib/govern/labels";
import {
  byUrgency, formatMoney, isCurrent, isUnsigned, needsAttention, stageQueues, sumMoney, valueSummary, waitingQueues,
} from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";
import { buildHomeReport } from "./_components/home-export";
import { ExportButtons } from "./_components/ExportButtons";
import { FeatureComingSoonBadge } from "@/components/govern/ComingSoon";
import { ReportError, ReportSkeleton } from "./_components/ReportKit";
import { hasCaptureGaps, useStageTargets } from "./_components/report-data";

export default function ReportsPage() {
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt, refetch } = useContracts();
  const contracts = useMemo(() => data?.contracts ?? [], [data]);
  const { targets } = useStageTargets(contracts);

  const facts = useMemo(() => {
    const open = contracts.filter(isUnsigned);
    const summary = valueSummary(contracts);
    return {
      open: open.length,
      overdue: open.filter((c) => c.slaStatus === "red").length,
      summary,
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
      <PageHeader
        title="Reports"
        subtitle="Each report answers one question. Open it for the detail, or download it for a leadership update."
        actions={<LastUpdated updatedAt={dataUpdatedAt || undefined} isFetching={isFetching} onRefresh={() => void refetch()} failed={isError && !!data} />}
      />
      <div className="app-container app-page">
        {isLoading ? (
          <ReportSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="your reports" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
              <ReportCard
                href="/reports/bottlenecks"
                className="md:col-span-2 lg:col-span-7 lg:row-span-2"
                question="Where are contracts stuck?"
                answer={facts.open === 0 ? "Nothing is waiting for signature." : `${plural(facts.open, "contract")} waiting for signature${facts.overdue ? `, ${facts.overdue} overdue` : ""}.`}
                detail="Grouped by step and by who has each one, with average days against target and every contract's next step."
                large
              />
              <ReportCard
                href="/reports/value"
                className="lg:col-span-5"
                question="What is the money?"
                answer={`${formatMoney(facts.summary.current)} current · ${formatMoney(facts.summary.potential)} potential`}
                detail={facts.unvalued > 0 ? `${plural(facts.unvalued, "contract")} still ${facts.unvalued === 1 ? "has" : "have"} no value.` : "Money in and out, held-up value, licensing income and breakdowns."}
              />
              <ReportCard
                href="/reports/trends"
                className="lg:col-span-5"
                question="Is the work getting faster?"
                answer="Arrivals, signatures and days to sign over time."
                detail="Plus which matrix terms cause the most changes and how each office keeps up."
              />
              <ReportCard
                href="/reports/capture"
                className="md:col-span-2 lg:col-span-12"
                question="Is anything missing?"
                answer={facts.missing === 0 ? "Every contract has its key details." : `${plural(facts.missing, "contract")} ${facts.missing === 1 ? "is" : "are"} missing details.`}
                detail="Details Sonar could not read and nobody entered, and documents that never became a contract."
                inline
              />
            </div>

            <section aria-labelledby="downloads" className="rounded-xl border border-border bg-card">
              <h2 id="downloads" className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-4 text-lg font-semibold text-foreground md:px-6">
                Quick downloads <FeatureComingSoonBadge feature="exports" />
              </h2>
              <ul className="divide-y divide-border">
                <DownloadRow
                  title="Leader summary"
                  detail="What needs attention, where work waits, and the money, as on the Home view."
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
            </section>
          </>
        )}
      </div>
    </>
  );
}

function ReportCard({
  href, question, answer, detail, className, large = false, inline = false,
}: {
  href: string;
  question: string;
  answer: string;
  detail: string;
  className?: string;
  large?: boolean;
  inline?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 transition-colors duration-150 hover:border-[var(--ink-300)] hover:bg-[var(--ink-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:p-7",
        inline && "md:flex-row md:items-center md:gap-8",
        className,
      )}
    >
      <span className={cn("min-w-0", inline && "md:flex-1")}>
        <span className={cn("block font-semibold leading-tight tracking-[-0.02em] text-foreground", large ? "text-[clamp(24px,2.6vw,32px)]" : "text-xl")}>
          {question}
        </span>
        <span className={cn("mt-3 block break-words font-medium text-[var(--ink-800)]", large ? "text-xl" : "text-base")}>{answer}</span>
        <span className="mt-2 block max-w-[56ch] text-base leading-relaxed text-[var(--ink-600)]">{detail}</span>
      </span>
      <span className={cn("mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)]", large && "lg:mt-auto lg:pt-10", inline && "md:mt-0")}>
        Open report <ArrowRight size={15} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </span>
    </Link>
  );
}

function DownloadRow({ title, detail, build, disabled }: { title: string; detail: string; build: Parameters<typeof ExportButtons>[0]["build"]; disabled: boolean }) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <span className="min-w-0">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-[var(--ink-600)]">{detail}</span>
      </span>
      <ExportButtons build={build} disabled={disabled} />
    </li>
  );
}
