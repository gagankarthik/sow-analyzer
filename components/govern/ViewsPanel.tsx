"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* Views for the record dashboards (Contracts, Obligations): saved filters
   with live counts, in titled groups. The page title is the switcher: it
   names the open view and opens a menu of every view, so the table keeps the
   full width. Every view is a URL, so it can be bookmarked and shared. */

export type PanelView = { id: string; label: string; count: number; hideWhenEmpty?: boolean };
export type PanelGroup = { label: string | null; views: PanelView[] };

export function ViewSwitcher({
  label,
  groups,
  activeId,
  title,
  count,
  hrefFor,
}: {
  /** Accessible name of the menu, e.g. "Contract views". */
  label: string;
  groups: PanelGroup[];
  activeId: string;
  title: string;
  count: number | null;
  hrefFor: (id: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${title}. Change view`}
          className="group -ms-2 inline-flex max-w-full items-baseline gap-2.5 rounded-lg px-2 py-1 text-start transition-colors hover:bg-[var(--ink-100)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]"
        >
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">{title}</h1>
          {count !== null && <span className="shrink-0 text-base font-medium tabular-nums text-[var(--ink-500)]">{count.toLocaleString()}</span>}
          <ChevronDown size={18} aria-hidden className="shrink-0 self-center text-[var(--ink-500)] transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] w-72 overflow-y-auto" aria-label={label}>
        {groups.map((group, gi) => {
          const views = group.views.filter((v) => !v.hideWhenEmpty || v.count > 0 || v.id === activeId);
          if (views.length === 0) return null;
          return (
            <DropdownMenuGroup key={group.label ?? `g-${gi}`}>
              {gi > 0 && <DropdownMenuSeparator />}
              {group.label && <DropdownMenuLabel className="text-xs font-semibold text-[var(--ink-500)]">{group.label}</DropdownMenuLabel>}
              {views.map((v) => {
                const active = v.id === activeId;
                return (
                  <DropdownMenuItem key={v.id} asChild>
                    <Link href={hrefFor(v.id)} scroll={false} aria-current={active ? "page" : undefined} className={cn("flex items-center justify-between gap-3", active && "font-semibold")}>
                      <span className="flex min-w-0 items-center gap-2">
                        <Check size={14} aria-hidden className={cn("shrink-0", active ? "text-[var(--brand-primary-700)]" : "invisible")} />
                        <span className="truncate">{v.label}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-[var(--ink-500)]">{v.count.toLocaleString()}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
