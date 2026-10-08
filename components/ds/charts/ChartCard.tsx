"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Layers } from "@/components/ui/icons";
import { EmptyState, ErrorState, LoadingState } from "../feedback";
import { SegmentedControl } from "../inputs";
import { ChartDataTable, type ChartTableData } from "./chart-utils";

export type ChartCardProps = {
  /** The question the chart answers: "Where is the queue backing up?" */
  title: string;
  /**
   * One computed, plain-language sentence that answers it: "Legal Affairs
   * holds 14 of 38 waiting contracts, more than any other office."
   */
  takeaway?: React.ReactNode;
  /** Legend (≥2 series). A single series is named by the title. */
  legend?: React.ReactNode;
  /** Extra header actions (period picker, export). */
  actions?: React.ReactNode;
  /** The chart's numbers. Enables "View as table" and is the screen-reader alternative. */
  table?: ChartTableData;
  /** Completeness note: "Includes 12 contracts with no value yet." */
  footnote?: React.ReactNode;
  state?: "ready" | "loading" | "empty" | "error";
  emptyText?: string;
  onRetry?: () => void;
  /** Card (default) or plain (inside an existing surface). */
  variant?: "card" | "plain";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

/**
 * Frame for every chart: question title, takeaway sentence, legend,
 * actions, chart ⇄ table toggle, footnote, and loading/empty/error. Renders
 * a <figure> whose <figcaption> is the takeaway, with the data table as a
 * hidden twin when the chart view is showing.
 */
export function ChartCard({
  title,
  takeaway,
  legend,
  actions,
  table,
  footnote,
  state = "ready",
  emptyText = "No data to show yet.",
  onRetry,
  variant = "card",
  className,
  bodyClassName,
  children,
}: ChartCardProps) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  const titleId = React.useId();
  const ready = state === "ready";

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col",
        variant === "card" && "rounded-container border border-border-default bg-surface-raised shadow-raised",
        className,
      )}
    >
      <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", variant === "card" ? "px-4 pt-4 md:px-5 md:pt-5" : "")}>
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-semibold tracking-tight text-fg-primary">{title}</h3>
          {takeaway && ready && <p className="mt-1 max-w-prose-ds text-body text-fg-secondary">{takeaway}</p>}
        </div>
        {(actions || (table && ready)) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
            {table && ready && (
              <SegmentedControl
                label={`${title}: view`}
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "chart", label: "Chart", icon: <BarChart3 /> },
                  { value: "table", label: "Table", icon: <Layers /> },
                ]}
              />
            )}
          </div>
        )}
      </header>

      <div className={cn("min-w-0 flex-1", variant === "card" ? "p-4 md:p-5" : "pt-4", bodyClassName)}>
        {state === "loading" ? (
          <LoadingState variant="chart" label={`Loading ${title}`} />
        ) : state === "error" ? (
          <ErrorState title="We couldn’t load this chart" onRetry={onRetry} />
        ) : state === "empty" ? (
          <EmptyState title={emptyText} />
        ) : (
          <figure className="m-0 flex min-w-0 flex-col gap-3">
            {view === "table" && table ? (
              <ChartDataTable data={table} caption={title} />
            ) : (
              <>
                {legend}
                {children}
                {table && <ChartDataTable data={table} caption={title} srOnly />}
              </>
            )}
            {takeaway && <figcaption className="sr-only">{takeaway}</figcaption>}
          </figure>
        )}
        {footnote && ready && <p className="mt-3 text-caption text-fg-tertiary">{footnote}</p>}
      </div>
    </section>
  );
}
