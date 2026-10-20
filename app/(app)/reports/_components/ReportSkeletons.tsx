"use client";

// The reports before their data, one shape per report, with the real panel
// titles and chart heights (240px trend charts), so nothing moves when the
// figures land. `ReportPageSkeleton` adds the title row for the routes'
// loading.tsx files.

import { byEdition } from "@/lib/edition-runtime";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartSkeleton, PageTitleSkeleton, PanelRowsSkeleton, PanelSkeleton, SkeletonLine, SkeletonRegion, SummaryTilesSkeleton,
  ToolbarSkeleton,
} from "@/components/ds/skeletons";

/* ── Reports hub ─────────────────────────────────────────────────────────── */

const CARDS = ["Bottlenecks", "Value", "Trends", "Data capture"];
const BAR_WIDTHS = ["w-[80%]", "w-[55%]", "w-[35%]"];

/** The picture area of a hub card (72px): three label · bar · figure rows. */
export function ReportCardBodySkeleton() {
  return (
    <span aria-hidden className="flex flex-col gap-2">
      {BAR_WIDTHS.map((w) => (
        <span key={w} className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-3">
          <SkeletonLine text="text-sm" width="w-24" />
          <Skeleton className={cn("h-2 rounded-pill", w)} />
          <SkeletonLine text="text-sm" width="w-5" />
        </span>
      ))}
    </span>
  );
}

/** One hub card (ReportCard geometry): title row, 24px figure, 72px picture, detail line. */
function ReportCardSkeleton({ title }: { title: string }) {
  return (
    <div aria-hidden className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4">
      <span className="flex min-w-0 items-center gap-2">
        <Skeleton className="size-4 shrink-0 rounded-[4px]" />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{title}</span>
      </span>
      <span className="mt-3 flex items-baseline gap-2">
        <SkeletonLine text="text-3xl font-semibold" width="w-16" />
        <SkeletonLine text="text-xs" width="w-32" />
      </span>
      <span className="mt-3 block min-h-[4.5rem]"><ReportCardBodySkeleton /></span>
      <span className="mt-3 block border-t border-border pt-2.5">
        <SkeletonLine text="text-xs" width="w-56" />
      </span>
    </div>
  );
}

export function ReportsIndexSkeleton() {
  return (
    <SkeletonRegion label="reports" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {CARDS.map((t) => <ReportCardSkeleton key={t} title={t} />)}
    </SkeletonRegion>
  );
}

/* ── Value ───────────────────────────────────────────────────────────────── */

export function ValueReportSkeleton() {
  return (
    <SkeletonRegion label="the value report" className="flex flex-col gap-6">
      <ToolbarSkeleton filters={4} actions={0} />
      <SummaryTilesSkeleton labels={["Current", "Potential", "Held up", "No value yet"]} />
      <PanelSkeleton title="Money in and money out" padded actions={false}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonLine text="text-sm font-semibold" width="w-28" />
              <SkeletonLine text="text-2xl font-semibold" width="w-24" />
              <div className="mt-1 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((j) => <SkeletonLine key={j} text="text-sm" width="w-16" />)}
              </div>
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <PanelSkeleton title="Potential value by step" className="lg:col-span-7" padded actions={false}>
          <ChartSkeleton height="h-[240px]" bars={6} />
        </PanelSkeleton>
        <PanelSkeleton title="Potential value by days waiting" className="lg:col-span-5" padded actions={false}>
          <ChartSkeleton height="h-[240px]" bars={4} />
        </PanelSkeleton>
      </div>
      <PanelSkeleton title={byEdition("Who and where the money comes from", "Who and where the money goes")} rows={5} row="key-value" actions={false} />
    </SkeletonRegion>
  );
}

/* ── Bottlenecks ─────────────────────────────────────────────────────────── */

export function BottlenecksSkeleton() {
  return (
    <SkeletonRegion label="the bottlenecks report" className="flex flex-col gap-6">
      <ToolbarSkeleton filters={4} actions={0} />
      <SummaryTilesSkeleton labels={["Waiting for signature", "Overdue", "Running late", "Average days so far"]} />
      <PanelSkeleton title="Time by step" padded actions={false}>
        <ChartSkeleton height="h-[240px]" bars={6} />
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <PanelSkeleton title="Waiting on" className="lg:col-span-7" padded actions={false}>
          <ChartSkeleton height="h-48" bars={4} />
        </PanelSkeleton>
        <PanelSkeleton
          title={byEdition("Holders: people, offices, sponsors", "Holders: people, offices, vendors")}
          className="lg:col-span-5"
          rows={5}
          row="key-value"
          actions={false}
        />
      </div>
    </SkeletonRegion>
  );
}

/* ── Trends ──────────────────────────────────────────────────────────────── */

/** A 240px trend chart (TrendCharts height), for a chart chunk still downloading. */
export function TrendChartSkeleton() {
  return <ChartSkeleton height="h-[240px]" bars={12} label="the chart" />;
}

function TrendPanel({ title, className }: { title: string; className?: string }) {
  return (
    <PanelSkeleton title={title} className={className} padded actions={false}>
      <ChartSkeleton height="h-[240px]" bars={12} />
    </PanelSkeleton>
  );
}

export function TrendsSkeleton() {
  return (
    <SkeletonRegion label="trends" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <TrendPanel title="Arriving and signed" className="lg:col-span-7" />
        <TrendPanel title="Days from arrival to signature" className="lg:col-span-5" />
      </div>
      <PanelSkeleton title="Days in each step" padded actions={false}>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex flex-col gap-1">
              <SkeletonLine text="text-sm font-medium" width="w-24" />
              <SkeletonLine text="text-2xl font-semibold" width="w-16" />
              <Skeleton className="mt-1 h-8 w-full" />
            </li>
          ))}
        </ul>
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <TrendPanel title="Steps finished on time" className="lg:col-span-7" />
        <TrendPanel title="Value signed" className="lg:col-span-5" />
      </div>
    </SkeletonRegion>
  );
}

/* ── Data capture ────────────────────────────────────────────────────────── */

export function CaptureSkeleton() {
  return (
    <SkeletonRegion label="the capture check" className="flex flex-col gap-6">
      <SummaryTilesSkeleton labels={["Contracts missing details", "Documents not captured"]} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <PanelSkeleton title="What is missing" className="lg:col-span-5" rows={6} row="key-value" actions={false} />
        <PanelSkeleton className="lg:col-span-7" rows={5} actions={false} />
      </div>
      <PanelSkeleton title="Documents not captured" rows={3} actions={false} />
    </SkeletonRegion>
  );
}

/** The contracts of one capture gap, while they load: divided two-line rows. */
export function GapContractsSkeleton({ rows }: { rows: number }) {
  return (
    <SkeletonRegion label="contracts">
      <PanelRowsSkeleton rows={rows} />
    </SkeletonRegion>
  );
}

/* ── Whole pages, for the routes' loading.tsx ────────────────────────────── */

/** A report route before it renders: the title row (with "Reports" back link on sub-reports), then the body. */
export function ReportPageSkeleton({ title, sub = true, children }: { title: string; sub?: boolean; children: React.ReactNode }) {
  return (
    <>
      <PageTitleSkeleton title={title} back={sub ? "Reports" : undefined} actions={sub ? 2 : 0} />
      <div className="app-container app-page">{children}</div>
    </>
  );
}
