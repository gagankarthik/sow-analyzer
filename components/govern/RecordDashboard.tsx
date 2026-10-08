"use client";

import type { ReactNode } from "react";
import { ViewSwitcher, type PanelGroup } from "./ViewsPanel";

/* The frame every record dashboard shares (Contracts, Obligations): the open
   view's name is the page title and switches views; one line on what it
   holds; the page actions; then the filters and the table at full width. */

export function RecordDashboard({
  label,
  groups,
  activeId,
  hrefFor,
  title,
  count,
  description,
  actions,
  children,
  aside,
}: {
  /** Accessible name of the views menu. */
  label: string;
  groups: PanelGroup[];
  activeId: string;
  hrefFor: (id: string) => string;
  title: string;
  count: number | null;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  /** A preview panel or drawer, rendered outside the page flow. */
  aside?: ReactNode;
}) {
  return (
    <div className="app-container flex flex-col gap-5 py-6 md:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <ViewSwitcher label={label} groups={groups} activeId={activeId} title={title} count={count} hrefFor={hrefFor} />
          <p className="mt-0.5 max-w-[64ch] text-sm text-[var(--ink-600)]">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
      {aside}
    </div>
  );
}
