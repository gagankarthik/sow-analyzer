"use client";

// The board's view picker in the header: the open view and its count, and
// the shared list views (All open, Mine, Past target, Signed) as links.
// Saved views live on the Contracts list, one link away.

import Link from "next/link";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type BoardView = { id: string; label: string; count: number | null; href: string; alert?: boolean };

export function BoardViews({ views, activeId }: { views: BoardView[]; activeId: string }) {
  const active = views.find((v) => v.id === activeId) ?? views[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Views. Open view: ${active.label}${active.count != null ? `, ${active.count} agreements` : ""}`}
          className="group inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[var(--ink-900)] transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus data-[state=open]:bg-surface-hover max-md:h-10"
        >
          <span className="truncate">{active.label}</span>
          {active.count != null && <span className="shrink-0 rounded-full bg-[var(--ink-100)] px-1.5 text-[11px] leading-[18px] tabular-nums text-[var(--ink-700)]">{active.count.toLocaleString()}</span>}
          <ChevronDown size={12} aria-hidden className="shrink-0 text-[var(--ink-500)] transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {views.map((v) => (
          <DropdownMenuItem key={v.id} asChild>
            <Link href={v.href} scroll={false} aria-current={v.id === activeId ? "page" : undefined} className="flex items-center gap-2">
              <Check size={16} aria-hidden className={cn("shrink-0 text-[var(--brand-primary-700)]", v.id !== activeId && "invisible")} />
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              {v.count != null && (
                <span className={cn("shrink-0 text-[12px] tabular-nums", v.alert && v.count > 0 ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-600)]")}>
                  {v.count.toLocaleString()}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/contracts" className="text-[var(--brand-primary-700)]">Saved and quick views in the list</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
