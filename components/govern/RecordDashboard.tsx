"use client";

import type { ReactNode } from "react";
import { useStoredValue, writeStoredValue } from "@/lib/use-stored-value";
import { cn } from "@/lib/utils";
import { ViewsPanel, ViewsSelect, viewsPanelKey, type PanelGroup } from "./ViewsPanel";

/* The frame every record dashboard shares (Contracts, Obligations): the
   Views panel on the left, then the open view's title with its count, one
   line on what it holds, the page actions, and the table below. */

export function RecordDashboard({
  page,
  label,
  groups,
  activeId,
  hrefFor,
  onSelectView,
  title,
  count,
  description,
  actions,
  children,
  aside,
}: {
  /** Key for the remembered panel state, e.g. "contracts". */
  page: string;
  /** Accessible name of the Views panel. */
  label: string;
  groups: PanelGroup[];
  activeId: string;
  hrefFor: (id: string) => string;
  onSelectView: (id: string) => void;
  title: string;
  count: number | null;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  /** A preview panel or drawer, rendered outside the grid. */
  aside?: ReactNode;
}) {
  const key = viewsPanelKey(page);
  const collapsed = useStoredValue(key) === "collapsed";
  const toggle = () => writeStoredValue(key, collapsed ? "open" : "collapsed");

  return (
    <div className="app-container py-6 md:py-8">
      <div className={cn("grid grid-cols-1 gap-6 lg:gap-8", collapsed ? "lg:grid-cols-[2.25rem_minmax(0,1fr)]" : "lg:grid-cols-[14.5rem_minmax(0,1fr)]")}>
        <ViewsPanel label={label} groups={groups} activeId={activeId} collapsed={collapsed} onToggle={toggle} hrefFor={hrefFor} />

        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
                {title}
                {count !== null && <span className="text-base font-medium tabular-nums text-[var(--ink-500)]">{count.toLocaleString()}</span>}
              </h1>
              <p className="mt-1 max-w-[60ch] text-sm text-[var(--ink-600)]">{description}</p>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </header>

          <ViewsSelect groups={groups} activeId={activeId} onChange={onSelectView} />

          {children}
        </div>
      </div>
      {aside}
    </div>
  );
}
