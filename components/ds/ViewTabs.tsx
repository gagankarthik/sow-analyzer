// List (index) page view tabs, UI_SPEC section 7: views across the top under
// the title, each with a count, then an optional "+ View" control and "All
// views" menu, and the Table / Board switch on the right. Every tab is a
// link, so the open view lives in the URL and can be bookmarked or shared.
//
// Not the same as components/ui/view-tabs (WAI-ARIA tabs that switch panels
// inside one page): these navigate between views of one list.

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Kanban, LayoutGrid } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

export type ListView = {
  id: string;
  label: string;
  /** Rows in this view; null while unknown (prints nothing, never "0"). */
  count?: number | null;
  href: string;
  /** Small leading icon (12px), e.g. a saved view's visibility. */
  icon?: React.ReactNode;
  /** The count reads in the danger colour when above zero ("Past target"). */
  alert?: boolean;
};

const NUMBER = new Intl.NumberFormat("en-US");

/** One tab look for every list: 40px, 14px medium label, 12px muted count,
 *  2px accent underline on the active tab. Also used by "+ View" style
 *  controls placed in `extra`. */
export const VIEW_TAB_CLASS =
  "inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-body font-medium whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus max-md:h-11";
const TAB = VIEW_TAB_CLASS;

export function ViewTabs({
  views,
  activeId,
  label,
  extra,
  layout,
  end,
  loading = false,
  className,
}: {
  views: ListView[];
  activeId: string;
  /** Accessible name of the nav: "Obligation views". */
  label: string;
  /** "+ View" and "All views" controls, rendered after the tabs. */
  extra?: React.ReactNode;
  /** A <LayoutSwitch> where the list also has a board. */
  layout?: React.ReactNode;
  /** Right of the tabs, before `layout`: e.g. unsaved-view actions. */
  end?: React.ReactNode;
  /** First load: tabs without a count yet hold a count-pill placeholder, so they keep their width. */
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-end gap-4 border-b border-border-default", className)}>
      <nav aria-label={label} className="scrollbar-none -mb-px flex min-w-0 flex-1 items-end overflow-x-auto">
        {views.map((v) => {
          const active = v.id === activeId;
          return (
            <Link
              key={v.id}
              href={v.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                TAB,
                active ? "border-interactive text-fg-primary" : "border-transparent text-fg-secondary hover:text-fg-primary",
              )}
            >
              {v.icon}
              <span className="max-w-[14rem] truncate">{v.label}</span>
              {v.count == null && loading && <Skeleton className="h-4 w-6 rounded-pill" />}
              {v.count != null && (
                <span
                  className={cn(
                    "rounded-pill px-1.5 text-caption tabular-nums",
                    active ? "bg-surface-sunken text-fg-primary" : "text-fg-tertiary",
                    v.alert && v.count > 0 && "font-semibold text-[var(--danger)]",
                  )}
                >
                  {NUMBER.format(v.count)}
                </span>
              )}
            </Link>
          );
        })}
        {extra}
      </nav>
      {end && <div className="mb-1 hidden shrink-0 items-center gap-2 sm:flex">{end}</div>}
      {layout && <div className="mb-1 shrink-0">{layout}</div>}
    </div>
  );
}

/**
 * Table / Board switch for a list that has both: one segmented control,
 * 36px (44px on phones), the current side filled in the primary colour.
 * Each side is a link; the current one is aria-current.
 */
export function LayoutSwitch({
  current,
  tableHref,
  boardHref,
  className,
}: {
  current: "table" | "board";
  tableHref: string;
  boardHref: string;
  className?: string;
}) {
  const item =
    "inline-flex items-center gap-1.5 px-3 text-[14px] font-medium leading-none transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
  const on = "bg-primary text-primary-foreground";
  const off = "text-[var(--ink-700)] hover:bg-surface-hover hover:text-[var(--ink-900)]";
  return (
    <div
      role="group"
      aria-label="Layout"
      className={cn("inline-flex h-11 shrink-0 overflow-hidden rounded-md border border-[var(--ink-300)] bg-surface-raised md:h-9", className)}
    >
      <Link href={tableHref} scroll={false} aria-current={current === "table" ? "page" : undefined} className={cn(item, current === "table" ? on : off)}>
        <LayoutGrid size={14} aria-hidden />
        Table
      </Link>
      <Link href={boardHref} scroll={false} aria-current={current === "board" ? "page" : undefined} className={cn(item, "border-s border-[var(--ink-300)]", current === "board" ? on : off)}>
        <Kanban size={14} aria-hidden />
        Board
      </Link>
    </div>
  );
}
