"use client";

import { cn } from "@/lib/utils";

/* Quick views over the board: the same saved filters as the Contracts
   dashboard, as chips with live counts. */
export function QuickViews({ views, active, onChange }: {
  views: { id: string; label: string; count: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Quick views" className="flex flex-wrap items-center gap-2">
      {views.map((v) => {
        const on = v.id === active;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v.id)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
              on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)] font-semibold text-[var(--brand-primary-800)]" : "border-border bg-card text-[var(--ink-700)] hover:border-[var(--ink-300)] hover:text-foreground",
            )}
          >
            {v.label}
            <span className={cn("tabular-nums text-xs", on ? "text-[var(--brand-primary-700)]" : "text-[var(--ink-500)]")}>{v.count}</span>
          </button>
        );
      })}
    </div>
  );
}
