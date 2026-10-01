"use client";

// The vertical timeline of a document's key dates, grouped Completed / Current
// / Upcoming / No calendar date, with a "today" marker between what has passed
// and what has not. The state of each entry is derived by lib/key-dates.ts from
// today's date; this file only draws it.

import { useId, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowUpRight, ChevronDown, ChevronUp } from "@/components/ui/icons";
import { KindIcon, KindTag } from "@/components/dates/kind-icons";
import { fmtMoney } from "@/lib/contract-value";
import { cn } from "@/lib/utils";
import {
  formatIsoDay, formatKeyDate, issueLabel, overdueLabel, relativeLabel, ruleText, stateLabel,
  type DerivedKeyDate, type KeyDateState,
} from "@/lib/key-dates";

const GROUP_HINT: Record<KeyDateState, string> = {
  completed: "Dates that have passed, oldest first.",
  current: "Happening today, a period under way, or a notice window that is open.",
  upcoming: "Dates still to come, soonest first.",
  undated: "The document gives a rule or wording, but no calendar date.",
};

const NODE: Record<KeyDateState, string> = {
  completed: "border border-[var(--ink-300)] bg-[var(--ink-100)] text-[var(--ink-600)]",
  current: "bg-[var(--brand-primary-600)] text-white ring-4 ring-[var(--brand-primary-100)]",
  upcoming: "border-2 border-[var(--brand-primary-400)] bg-card text-[var(--brand-primary-700)]",
  undated: "border-2 border-dashed border-[var(--ink-300)] bg-card text-[var(--ink-600)]",
};

const ORDER: KeyDateState[] = ["completed", "current", "upcoming", "undated"];

export function KeyDateList({ items, docId, today }: { items: DerivedKeyDate[]; docId: string; today: string }) {
  const byState = (state: KeyDateState) => items.filter((k) => k.state === state);
  const hasDated = items.some((k) => k.state !== "undated");

  return (
    <div className="space-y-6">
      {ORDER.flatMap((state) => {
        const group = byState(state);
        return [
          // Today sits between what has passed and what has not.
          state === "current" && hasDated ? <TodayMarker key="today" today={today} /> : null,
          group.length > 0 ? <Group key={state} state={state} items={group} docId={docId} /> : null,
        ];
      })}
    </div>
  );
}

function TodayMarker({ today }: { today: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--brand-primary-300)]" aria-hidden />
      <time
        dateTime={today}
        aria-current="date"
        className="shrink-0 rounded-full bg-[var(--brand-primary-600)] px-3 py-1 text-xs font-semibold text-white"
      >
        Today · {formatIsoDay(today)}
      </time>
      <span className="h-px flex-1 bg-[var(--brand-primary-300)]" aria-hidden />
    </div>
  );
}

function Group({ state, items, docId }: { state: KeyDateState; items: DerivedKeyDate[]; docId: string }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">{stateLabel(state)}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{items.length}</span>
        <p className="basis-full text-sm text-[var(--ink-600)]">{GROUP_HINT[state]}</p>
      </div>
      <ol className="relative">
        {items.map((k, i) => (
          <li key={k.id} className="relative flex gap-3 pb-3 last:pb-0 md:gap-4">
            {i < items.length - 1 && <span className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-[var(--ink-300)]" aria-hidden />}
            <span className={cn("relative z-10 mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full", NODE[k.state])}>
              <KindIcon kind={k.kind} />
            </span>
            <Entry item={k} docId={docId} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Entry({ item: k, docId }: { item: DerivedKeyDate; docId: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const formatted = formatKeyDate(k);
  const relative = relativeLabel(k);
  const rule = ruleText(k);
  const hasDetail = !!k.rawText || !!rule || !!k.recurring || !!k.confidence || !!k.sectionRef;

  return (
    <article className={cn(
      "min-w-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-xs",
      k.state === "current" ? "border-[var(--brand-primary-300)]" : "border-border",
    )}>
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h4 className="min-w-0 text-base font-semibold text-foreground [overflow-wrap:anywhere]">{k.label}</h4>
          <KindTag kind={k.kind} />
          {k.amount !== null && (
            <span className="text-sm font-semibold tabular-nums text-foreground">{fmtMoney(k.amount, k.currency)}</span>
          )}
        </div>

        {/* The date, to the precision the document gave; or the rule when there is none. */}
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          {k.date && formatted ? (
            <>
              <time dateTime={k.date} className="font-medium tabular-nums text-foreground">{formatted}</time>
              {relative && (
                <span className={cn("tabular-nums", k.state === "current" ? "font-semibold text-[var(--brand-primary-700)]" : "text-[var(--ink-600)]")}>
                  {relative}
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--ink-700)]">
              {rule ? <>Rule: {rule}</> : k.rawText ? <>&ldquo;{k.rawText}&rdquo;</> : "No calendar date in the document"}
            </span>
          )}
        </p>

        <Flags item={k} rule={rule} />

        {k.clauseNumber && (
          <Link
            href={`/projects/${docId}/sow#clause-${encodeURIComponent(k.clauseNumber)}`}
            className="mt-2 inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
          >
            Clause {k.clauseNumber}<ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      {hasDetail && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-border py-2 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {open ? <><ChevronUp size={14} />Hide wording</> : <><ChevronDown size={14} />Show wording and source</>}
          </button>
          <div id={panelId} hidden={!open} className="border-t border-border bg-[var(--panel)] px-4 py-3">
            {k.rawText ? (
              <blockquote className="border-l-2 border-[var(--ink-300)] pl-3 text-sm leading-relaxed text-[var(--ink-700)] [overflow-wrap:anywhere]">
                {k.rawText}
              </blockquote>
            ) : (
              <p className="text-sm text-[var(--ink-600)]">The wording was not included with this entry.</p>
            )}
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {rule && <Detail label="Rule">{rule}</Detail>}
              {k.recurring && <Detail label="Repeats">{k.recurring}</Detail>}
              {k.sectionRef && <Detail label="Section">{k.sectionRef}</Detail>}
              {k.confidence && <Detail label="Confidence"><span className="capitalize">{k.confidence}</span></Detail>}
            </dl>
          </div>
        </>
      )}
    </article>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** Everything a reader should know before trusting the date. */
function Flags({ item: k, rule }: { item: DerivedKeyDate; rule: string | null }) {
  const flags: React.ReactNode[] = [];
  if (k.noticeWindowOpen) flags.push(<Badge key="window" variant="info" size="md">Notice window open</Badge>);
  if (k.overdue) {
    flags.push(
      <Badge key="overdue" variant="danger" size="md" title="The due date has passed. Blue-IQ does not record whether it was met.">
        {overdueLabel(k.kind)}
      </Badge>,
    );
  }
  if (k.isDerived) {
    flags.push(<Badge key="derived" variant="neutral" size="md" className="h-auto max-w-full whitespace-normal py-0.5 text-left">{rule ? `Calculated: ${rule}` : "Calculated, not written in the document"}</Badge>);
  }
  if (k.isEstimated) flags.push(<Badge key="estimated" variant="neutral" size="md">Estimated</Badge>);
  if (k.ambiguous && !k.issues.includes("ambiguous_day_month")) {
    flags.push(<Badge key="ambiguous" variant="warning" size="md"><AlertTriangle />Ambiguous</Badge>);
  }
  for (const issue of k.issues) {
    flags.push(
      <Badge key={issue} variant="warning" size="md" className="h-auto max-w-full whitespace-normal py-0.5 text-left">
        <AlertTriangle />{issueLabel(issue)}
      </Badge>,
    );
  }
  if (flags.length === 0) return null;
  return <div className="mt-2 flex flex-wrap items-center gap-1.5">{flags}</div>;
}
