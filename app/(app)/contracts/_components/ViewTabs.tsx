"use client";

// Views as underline tabs under the title: the shared list tabs (All open,
// Mine, Past target, Signed), then your saved views, then the open view if it
// lives elsewhere (a quick or shared view), then "+ View" and the "All views"
// menu; the Table / Board switch sits at the row's right end. Built on the
// one list tab row, components/ds/ViewTabs, so it matches every other list.

import * as React from "react";
import { ViewTabs as DsViewTabs, VIEW_TAB_CLASS, type ListView } from "@/components/ds/ViewTabs";
import { Lock, Plus, UserCheck, Users } from "@/components/ui/icons";
import type { ViewVisibility } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

export type ViewTab = { id: string; label: string; count: number | null; href: string; visibility?: ViewVisibility; alert?: boolean };

const VIS_ICON: Record<ViewVisibility, typeof Lock> = { private: Lock, everyone: Users, specific: UserCheck };

export function ViewTabs({ tabs, activeId, onNewView, allViews, end, layout, loading = false }: {
  tabs: ViewTab[];
  activeId: string;
  onNewView: () => void;
  /** The "All views" menu. */
  allViews: React.ReactNode;
  /** Right of the tabs: unsaved-changes actions. */
  end?: React.ReactNode;
  /** The Table / Board switch, right-aligned on the tab row. */
  layout?: React.ReactNode;
  /** First load: count pills hold their place. */
  loading?: boolean;
}) {
  const views: ListView[] = tabs.map((t) => {
    const Icon = t.visibility ? VIS_ICON[t.visibility] : null;
    return { ...t, icon: Icon ? <Icon size={12} aria-hidden className="text-fg-tertiary" /> : undefined };
  });
  return (
    <DsViewTabs
      label="Contract views"
      views={views}
      activeId={activeId}
      end={end}
      layout={layout}
      loading={loading}
      extra={
        <>
          <button
            type="button"
            onClick={onNewView}
            className={cn(VIEW_TAB_CLASS, "gap-1 border-transparent text-fg-secondary hover:text-fg-primary")}
          >
            <Plus size={12} aria-hidden />
            View
            <span className="sr-only">: save the current settings as a new view</span>
          </button>
          {allViews}
        </>
      }
    />
  );
}
