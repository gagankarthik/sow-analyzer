import * as React from "react";
import { cn } from "@/lib/utils";

export type KeyValueItem = {
  /** Stable key; defaults to the label. */
  id?: string;
  label: React.ReactNode;
  /** null / undefined / "" render as "Not provided" in tertiary ink (never blank). */
  value: React.ReactNode;
  /** Optional hint under the value. */
  hint?: React.ReactNode;
};

export type KeyValueListProps = Omit<React.ComponentProps<"dl">, "children"> & {
  items: KeyValueItem[];
  /** `stacked`: label over value. `inline`: label left, value right (from sm). */
  layout?: "stacked" | "inline";
  /** Columns for the stacked layout from md up. */
  columns?: 1 | 2 | 3;
  /** Text shown for a missing value. */
  emptyText?: string;
};

const COLS = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-2 xl:grid-cols-3" } as const;

function isEmpty(v: React.ReactNode): boolean {
  return v === null || v === undefined || v === "" || v === false;
}

/**
 * Record details as a definition list: agreement fields, integration
 * settings. Missing values say so ("Not provided") instead of going blank.
 */
export function KeyValueList({
  items,
  layout = "stacked",
  columns = 2,
  emptyText = "Not provided",
  className,
  ...props
}: KeyValueListProps) {
  if (layout === "inline") {
    return (
      <dl className={cn("min-w-0 divide-y divide-border-subtle", className)} {...props}>
        {items.map((it, i) => (
          <div key={it.id ?? (typeof it.label === "string" ? it.label : i)} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className="shrink-0 text-body text-fg-secondary">{it.label}</dt>
            <dd className="min-w-0 text-body font-medium text-fg-primary sm:text-end [overflow-wrap:anywhere]">
              {isEmpty(it.value) ? <span className="font-normal text-fg-tertiary">{emptyText}</span> : it.value}
              {it.hint && <div className="text-caption font-normal text-fg-tertiary">{it.hint}</div>}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cn("grid min-w-0 grid-cols-1 gap-x-8 gap-y-4", COLS[columns], className)} {...props}>
      {items.map((it, i) => (
        <div key={it.id ?? (typeof it.label === "string" ? it.label : i)} className="flex min-w-0 flex-col gap-1">
          <dt className="text-caption font-medium text-fg-secondary">{it.label}</dt>
          <dd className="text-body text-fg-primary [overflow-wrap:anywhere]">
            {isEmpty(it.value) ? <span className="text-fg-tertiary">{emptyText}</span> : it.value}
            {it.hint && <div className="mt-0.5 text-caption text-fg-tertiary">{it.hint}</div>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
