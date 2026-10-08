"use client";

// Two small trend lines for the leader home: is work arriving faster than it
// is signed, and is the time to sign getting shorter. One sentence each, and
// a link to the full Trends report. A failed or empty trend read never blocks
// the rest of the home view.

import Link from "next/link";
import { ArrowRight, RefreshCw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrends } from "@/lib/govern/queries";
import type { Trends } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { LegendDot, Sparkline } from "../../reports/_components/ReportCharts";
import { TEXT_LINK } from "../../reports/_components/ReportKit";
import { changeSentence, hasHistory, periodLabel, throughputSentence } from "../../reports/_components/trend-utils";

const RECEIVED_COLOR = "var(--ink-400)";
const SIGNED_COLOR = "var(--viz-primary)";

const FRAME = "rounded-xl border border-border bg-card p-4 shadow-xs md:p-5";

export function TrendGlance({ kind }: { kind: "throughput" | "cycle" }) {
  const { data, isLoading, isError, refetch, isFetching } = useTrends("month", 6);
  if (isLoading) {
    return (
      <div className={cn(FRAME, "space-y-3")} aria-busy="true" aria-label="Loading trend">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  // A failed trend read never blocks the rest of home: it says so in place.
  if (isError || !data) {
    return (
      <div role="alert" className={cn(FRAME, "flex items-center justify-between gap-3")}>
        <p className="text-sm text-[var(--ink-700)]">Couldn&apos;t load this trend.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={cn(isFetching && "animate-spin motion-reduce:animate-none")} />
          Try again
        </Button>
      </div>
    );
  }
  return <TrendGlanceBody trends={data} kind={kind} />;
}

function TrendGlanceBody({ trends, kind }: { trends: Trends; kind: "throughput" | "cycle" }) {
  const { periods, granularity } = trends;
  const labels = periods.map((p) => periodLabel(p, granularity));

  if (!hasHistory(periods)) {
    return (
      <p className={cn(FRAME, "text-sm text-[var(--ink-600)]")}>
        Trends appear here after a few weeks of activity.
      </p>
    );
  }

  const isThroughput = kind === "throughput";
  const sentence = isThroughput
    ? throughputSentence(periods, granularity)
    : changeSentence({ values: periods.map((p) => p.avgCycleDays), subject: "Time to signature", unit: " days", granularity })
      ?? "No contract was signed in this window, so there is no time to signature yet.";

  return (
    <div className={cn(FRAME, "flex flex-col gap-3")}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isThroughput ? "Arriving vs signed, last 6 months" : "Days from arrival to signature, last 6 months"}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-700)]">{sentence}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {isThroughput ? (
            <>
              <LegendDot color={RECEIVED_COLOR} label="Received" />
              <LegendDot color={SIGNED_COLOR} label="Signed" />
            </>
          ) : null}
          <Link href="/reports/trends" className={cn(TEXT_LINK)}>
            See trends <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <Sparkline
        periods={labels}
        caption={isThroughput ? "Contracts received and signed per month" : "Average days to signature per month"}
        series={isThroughput
          ? [
              { label: "Received", values: periods.map((p) => p.received), color: RECEIVED_COLOR, dashed: true },
              { label: "Signed", values: periods.map((p) => p.signed), color: SIGNED_COLOR },
            ]
          : [{ label: "Average days to signature", values: periods.map((p) => p.avgCycleDays), color: SIGNED_COLOR }]}
      />
    </div>
  );
}
