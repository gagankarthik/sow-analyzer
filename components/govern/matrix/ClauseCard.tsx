"use client";

// One clause of a playbook, read at a glance: the standard and fallback side
// by side, what you never accept and what favours it, who reviews a
// deviation, the numbers Sonar checks and the redline it offers.

import { Button } from "@/components/ui/button";
import { Building2, Pencil, Trash2 } from "@/components/ui/icons";
import { Chip } from "@/components/govern/admin/shared";
import { OFFICE_LABEL } from "@/lib/govern/labels";
import { formatThreshold, thresholdMeta } from "@/lib/playbook";
import { cn } from "@/lib/utils";
import type { MatrixClause } from "@/lib/govern/types";

export type ClauseChange = "added" | "edited" | null;

export function ClauseCard({
  clause, change, onEdit, onRemove,
}: {
  clause: MatrixClause;
  change?: ClauseChange;
  /** Omitted when read-only. */
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const thresholds = Object.entries(clause.thresholds ?? {});
  return (
    <article
      aria-label={clause.label}
      className={cn(
        "relative px-4 py-5 sm:px-5",
        change && "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--warning)]",
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-snug text-foreground">{clause.label}</h3>
            {clause.required ? (
              <span className="rounded-md border border-[var(--ink-300)] px-1.5 py-0.5 text-xs font-medium text-[var(--ink-700)]">Required</span>
            ) : (
              <span className="rounded-md border border-dashed border-[var(--ink-300)] px-1.5 py-0.5 text-xs font-medium text-[var(--ink-500)]">Optional</span>
            )}
            {change && (
              <span className="rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--warning-fg)]">
                {change === "added" ? "New, not saved" : "Edited, not saved"}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{clause.clauseType}</p>
        </div>
        {(onEdit || onRemove) && (
          <div className="flex shrink-0 gap-2">
            {onEdit && <Button variant="outline" className="h-10 md:h-8" onClick={onEdit}><Pencil size={14} />Edit</Button>}
            {onRemove && (
              <Button variant="ghost" className="h-10 text-[var(--danger)] hover:text-[var(--danger)] md:h-8" onClick={onRemove} aria-label={`Remove ${clause.label}`}>
                <Trash2 size={14} /><span className="sm:sr-only">Remove</span>
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <h4 className="text-sm font-semibold">Standard position</h4>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{clause.standard || "—"}</p>
        </div>
        <div className="min-w-0 border-l-2 border-[var(--info-soft)] pl-3 lg:col-span-5">
          <h4 className="text-sm font-semibold">Acceptable fallback</h4>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-700)]">{clause.fallback || "No fallback: only the standard is accepted."}</p>
        </div>
      </div>

      {(clause.unacceptable.length > 0 || clause.beneficial.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {clause.unacceptable.length > 0 && (
            <div className="min-w-0">
              <h4 className="text-sm font-semibold mb-1.5">Not acceptable</h4>
              <ul className="flex flex-wrap gap-1.5">{clause.unacceptable.map((u) => <li key={u}><Chip tone="danger">{u}</Chip></li>)}</ul>
            </div>
          )}
          {clause.beneficial.length > 0 && (
            <div className="min-w-0">
              <h4 className="text-sm font-semibold mb-1.5">Favours you</h4>
              <ul className="flex flex-wrap gap-1.5">{clause.beneficial.map((b) => <li key={b}><Chip tone="success">{b}</Chip></li>)}</ul>
            </div>
          )}
        </div>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Building2 size={14} aria-hidden className="text-[var(--ink-500)]" />
          <dt className="text-muted-foreground">Escalates to</dt>
          <dd className="font-medium text-foreground">{clause.escalationOffice ? OFFICE_LABEL[clause.escalationOffice] : "Reviewer decides"}</dd>
        </div>
        {thresholds.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">{thresholdMeta(k).label}</dt>
            <dd className="font-medium tabular-nums text-foreground">{formatThreshold(k, v)}</dd>
          </div>
        ))}
      </dl>

      {clause.suggestedLanguage && (
        <blockquote className="mt-4 rounded-lg border border-border bg-[var(--panel)] px-3 py-2.5">
          <p className="text-sm font-semibold text-[var(--ink-800)]">Suggested redline</p>
          <p className="mt-1 text-sm italic leading-relaxed text-[var(--ink-700)]">{clause.suggestedLanguage}</p>
        </blockquote>
      )}
    </article>
  );
}
