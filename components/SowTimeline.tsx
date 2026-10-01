"use client";

// Chronological timeline of the dates extracted from a set of documents (a SOW
// and its amendments). It reads each classification's `keyDates` when the
// analysis produced them, and otherwise the older structured fields (effective
// date, start / end, phases, milestones, deliverable due dates), so documents
// analysed before key dates existed still show what was extracted.
//
// Whether a date is completed, today or upcoming is derived from the live clock
// (lib/key-dates.ts); nothing about that is stored.

import { useMemo } from "react";
import { CalendarClock } from "@/components/ui/icons";
import { KindIcon } from "@/components/dates/kind-icons";
import { fmtMoney } from "@/lib/contract-value";
import { useNow } from "@/lib/use-now";
import {
  buildKeyDateTimeline, documentKeyDates, formatIsoDay, formatKeyDate, kindLabel, relativeLabel,
  type DerivedKeyDate, type KeyDate, type KeyDateState,
} from "@/lib/key-dates";
import type { ApiClassification } from "@/lib/types";

const TONE: Record<KeyDateState, string> = {
  completed: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  current: "bg-[var(--brand-primary-600)] text-white",
  upcoming: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
  undated: "bg-[var(--ink-100)] text-[var(--ink-600)]",
};

const STATE_WORD: Record<KeyDateState, string> = {
  completed: "Completed",
  current: "Current",
  upcoming: "Upcoming",
  undated: "No calendar date",
};

/** Dated entries of every classification, without the repeats that occur when
 *  an amendment restates the SOW's dates. */
function gather(classifications: ApiClassification[]): { dates: KeyDate[]; legacyDocs: number } {
  const seen = new Set<string>();
  const dates: KeyDate[] = [];
  let legacyDocs = 0;
  classifications.forEach((c, i) => {
    const source = documentKeyDates({ docType: c.docType, effectiveDate: c.effectiveDate }, c);
    if (!source.extracted) legacyDocs += 1;
    for (const d of source.dates) {
      if (!d.date) continue;
      const key = `${d.kind}|${d.date}|${d.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dates.push({ ...d, id: `${i}:${d.id}` });
    }
  });
  return { dates, legacyDocs };
}

export function SowTimeline({ classifications, currency }: { classifications: ApiClassification[]; currency?: string | null }) {
  const now = useNow();
  const { dates, legacyDocs } = useMemo(() => gather(classifications), [classifications]);
  const timeline = useMemo(() => buildKeyDateTimeline(dates, now), [dates, now]);
  const events = timeline.items;
  if (events.length === 0) return null;

  const cur = currency ?? classifications.find((c) => c.commercials?.currency)?.commercials?.currency ?? null;
  const first = events[0].date as string;
  const last = events[events.length - 1].date as string;
  // Index of the first entry that has not passed: "today" is drawn before it.
  const todayAt = events.findIndex((e) => e.state !== "completed");

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="shrink-0 self-center text-[var(--brand-primary-600)]" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Timeline</h3>
          <span className="text-sm tabular-nums text-muted-foreground">{events.length} dated event{events.length === 1 ? "" : "s"}</span>
        </div>
        {events.length >= 2 && <span className="text-sm tabular-nums text-[var(--ink-600)]">{formatIsoDay(first)} → {formatIsoDay(last)}</span>}
      </div>

      <ol className="relative ml-3 space-y-4 border-l border-[var(--ink-300)] pl-6">
        {events.map((e, i) => (
          <Item key={e.id} event={e} currency={cur} today={i === todayAt ? timeline.today : null} />
        ))}
        {todayAt === -1 && <TodayRow today={timeline.today} />}
      </ol>

      {legacyDocs > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {legacyDocs === classifications.length ? "These documents were" : `${legacyDocs} of these documents ${legacyDocs === 1 ? "was" : "were"}`} analysed before full date extraction, so some dates may be missing. Re-analyse a document to extract every date.
        </p>
      )}
    </section>
  );
}

function TodayRow({ today }: { today: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-primary-600)] ring-2 ring-card" aria-hidden />
      <time dateTime={today} aria-current="date" className="text-xs font-semibold text-[var(--brand-primary-700)]">Today · {formatIsoDay(today)}</time>
    </li>
  );
}

function Item({ event: e, currency, today }: { event: DerivedKeyDate; currency: string | null; today: string | null }) {
  const relative = relativeLabel(e);
  return (
    <>
      {today && <TodayRow today={today} />}
      <li className="relative">
        <span className={`absolute -left-[2.3rem] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card ${TONE[e.state]}`}>
          <KindIcon kind={e.kind} size={13} />
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words text-base font-semibold text-foreground">{e.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-[var(--ink-700)]">{kindLabel(e.kind)}</span>
          {e.amount !== null && e.amount > 0 && (
            // The amount carries its own currency symbol (or none when the
            // currency was not extracted): no fixed "$" glyph in front.
            <span className="text-sm font-semibold tabular-nums text-foreground">{fmtMoney(e.amount, e.currency ?? currency)}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <time dateTime={e.date ?? undefined} className="tabular-nums text-[var(--ink-600)]">{formatKeyDate(e)}</time>
          {relative && <span>· {relative}</span>}
          <span>· {STATE_WORD[e.state]}</span>
        </div>
      </li>
    </>
  );
}
