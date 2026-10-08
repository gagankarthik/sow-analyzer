"use client";

import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* The Views panel shared by the record dashboards (Contracts, Obligations):
   saved filters down the left, each with a live count, in titled groups.
   Every view is a URL so it can be bookmarked and shared. Collapses to a
   rail; on small screens the same views are one select (ViewsSelect). */

export type PanelView = { id: string; label: string; count: number; hideWhenEmpty?: boolean };
export type PanelGroup = { label: string | null; views: PanelView[] };

export function ViewsPanel({
  label,
  groups,
  activeId,
  collapsed,
  onToggle,
  hrefFor,
}: {
  /** Accessible name, e.g. "Contract views". */
  label: string;
  groups: PanelGroup[];
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  hrefFor: (id: string) => string;
}) {
  if (collapsed) {
    return (
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Show views"
          className="sticky top-20 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-[var(--ink-600)] shadow-xs hover:text-foreground"
        >
          <ChevronsRight size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <nav aria-label={label} className="hidden lg:block">
      <div className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col overflow-y-auto pb-6 pe-2">
        <div className="flex items-center justify-between pb-2">
          <p className="text-sm font-semibold text-foreground">Views</p>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Hide views"
            className="inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-[var(--ink-100)] hover:text-foreground"
          >
            <ChevronsLeft size={16} aria-hidden />
          </button>
        </div>

        {groups.map((group, gi) => {
          const views = group.views.filter((v) => !v.hideWhenEmpty || v.count > 0 || v.id === activeId);
          if (views.length === 0) return null;
          return (
            <div key={group.label ?? `group-${gi}`} className={cn(gi > 0 && "mt-4 border-t border-border pt-4")}>
              {group.label && <p className="px-2.5 pb-1.5 text-xs font-semibold text-[var(--ink-500)]">{group.label}</p>}
              <ul className="flex flex-col gap-0.5">
                {views.map((v) => {
                  const active = v.id === activeId;
                  return (
                    <li key={v.id}>
                      <Link
                        href={hrefFor(v.id)}
                        aria-current={active ? "page" : undefined}
                        scroll={false}
                        className={cn(
                          "flex h-9 items-center justify-between gap-3 rounded-lg px-2.5 text-sm transition-colors",
                          active ? "bg-[var(--brand-primary-50)] font-semibold text-[var(--brand-primary-800)]" : "text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{v.label}</span>
                        <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-[var(--brand-primary-700)]" : "text-[var(--ink-500)]")}>
                          {v.count.toLocaleString()}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Phones and tablets: the same views as one select above the table. */
export function ViewsSelect({ groups, activeId, onChange }: { groups: PanelGroup[]; activeId: string; onChange: (id: string) => void }) {
  return (
    <label className="flex items-center gap-2 lg:hidden">
      <span className="text-sm font-medium text-[var(--ink-700)]">View</span>
      <select
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-control)] bg-card px-3 text-sm text-foreground"
      >
        {groups.map((g, gi) => (
          <optgroup key={g.label ?? `g-${gi}`} label={g.label ?? "All"}>
            {g.views.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.count.toLocaleString()})</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** Remembered open/closed state of a dashboard's Views panel. */
export const viewsPanelKey = (page: string) => `blueiq:${page}-views-panel`;
