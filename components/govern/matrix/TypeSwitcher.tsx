"use client";

// Agreement-type tabs with each playbook's clause count. A scrolling row on
// small screens; wraps on wide ones.

import { cn } from "@/lib/utils";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import type { AgreementType } from "@/lib/govern/types";

export function TypeSwitcher({
  value, onChange, counts, label = "Agreement type", dirtyTypes,
}: {
  value: AgreementType;
  onChange: (t: AgreementType) => void;
  counts: Record<AgreementType, number>;
  label?: string;
  /** Types with unsaved edits get a dot. */
  dirtyTypes?: ReadonlySet<AgreementType>;
}) {
  return (
    <div role="group" aria-label={label} className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 lg:flex-wrap">
      {AGREEMENT_TYPES.map((t) => {
        const isActive = t === value;
        const isDirty = dirtyTypes?.has(t) ?? false;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(t)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors md:h-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive
                ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white"
                : "border-[var(--ink-300)] bg-card text-[var(--ink-700)] hover:border-[var(--ink-400)] hover:text-foreground",
            )}
          >
            {AGREEMENT_TYPE_LABEL[t]}
            <span className={cn("tabular-nums text-xs", isActive ? "text-[var(--brand-primary-100)]" : "text-muted-foreground")}>{counts[t]}</span>
            {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-label="has unsaved changes" />}
          </button>
        );
      })}
    </div>
  );
}
