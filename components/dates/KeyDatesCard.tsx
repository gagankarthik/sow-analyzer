"use client";

// Compact "Key dates" card for a document's overview: what is current, what
// comes next and what most recently passed, with a link to the full timeline.

import Link from "next/link";
import { ArrowRight, CalendarClock } from "@/components/ui/icons";
import { KindIcon } from "@/components/dates/kind-icons";
import {
  formatIsoDay, formatKeyDate, kindLabel, overdueLabel, relativeDays, relativeLabel, ruleText, summariseKeyDates,
  type DerivedKeyDate, type DocumentKeyDates, type KeyDateTimeline, type TermPeriod,
} from "@/lib/key-dates";

export function KeyDatesCard({ docId, source, timeline }: { docId: string; source: DocumentKeyDates; timeline: KeyDateTimeline }) {
  const { nextUpcoming, current, lastCompleted, term } = summariseKeyDates(timeline);
  const { counts } = timeline;
  const href = `/projects/${docId}/timeline`;

  return (
    <section aria-labelledby="key-dates-heading" className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="shrink-0 text-[var(--brand-primary-600)]" />
          <h3 id="key-dates-heading" className="text-lg font-semibold tracking-tight text-foreground">Key dates</h3>
          <span className="text-sm tabular-nums text-muted-foreground">{counts.total}</span>
        </div>
        <Link href={href} className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">
          All dates<ArrowRight size={13} strokeWidth={2.25} />
        </Link>
      </div>

      {counts.total === 0 ? (
        <p className="text-sm text-[var(--ink-600)]">
          {source.extracted
            ? "No dates were found in this document."
            : "No dates were extracted by the earlier analysis of this document."}
        </p>
      ) : (
        <>
          {/* Asymmetric on purpose: what is happening now gets the wide column. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <Slot title="Current" className="md:col-span-6">
              {term?.state === "current" && <TermLine term={term} />}
              {current.slice(0, 2).map((k) => <DateLine key={k.id} item={k} />)}
              {current.length > 2 && <p className="text-xs text-muted-foreground">and {current.length - 2} more</p>}
              {current.length === 0 && term?.state !== "current" && <Nothing>Nothing is dated today or under way.</Nothing>}
            </Slot>
            <Slot title="Next" className="md:col-span-3">
              {nextUpcoming ? <DateLine item={nextUpcoming} /> : <Nothing>No upcoming date.</Nothing>}
            </Slot>
            <Slot title="Most recent" className="md:col-span-3">
              {lastCompleted ? <DateLine item={lastCompleted} /> : <Nothing>No date has passed yet.</Nothing>}
            </Slot>
          </div>
          <p className="mt-3 text-xs tabular-nums text-muted-foreground">
            {counts.completed} completed · {counts.current} current · {counts.upcoming} upcoming
            {counts.undated > 0 && <> · {counts.undated} with no calendar date</>}
            {counts.withIssues > 0 && <> · {counts.withIssues} to check</>}
          </p>
        </>
      )}
    </section>
  );
}

function Slot({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-lg border border-border bg-[var(--panel)] p-3.5 ${className ?? ""}`}>
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Nothing({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--ink-600)]">{children}</p>;
}

function TermLine({ term }: { term: TermPeriod }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">Contract term in force</p>
      <p className="text-sm text-[var(--ink-600)]">
        <time dateTime={term.start}>{formatIsoDay(term.start)}</time> to <time dateTime={term.end}>{formatIsoDay(term.end)}</time>
        <span className="tabular-nums"> · ends {relativeDays(term.remainingDays)}</span>
      </p>
    </div>
  );
}

function DateLine({ item: k }: { item: DerivedKeyDate }) {
  const formatted = formatKeyDate(k);
  const relative = relativeLabel(k);
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--ink-600)]"><KindIcon kind={k.kind} size={14} /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{k.label}</p>
        <p className="text-sm text-[var(--ink-600)]">
          <span className="sr-only">{kindLabel(k.kind)}: </span>
          {k.date && formatted ? <time dateTime={k.date} className="tabular-nums">{formatted}</time> : ruleText(k) ?? "No calendar date"}
          {relative && <span className="tabular-nums"> · {relative}</span>}
          {k.overdue && <span className="font-medium text-[var(--danger)]"> · {overdueLabel(k.kind)}</span>}
        </p>
      </div>
    </div>
  );
}
