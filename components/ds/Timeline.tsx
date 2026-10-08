import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "./format";
import { TONE_SOFT, resolveTone, type ToneInput } from "./tone";

export type TimelineEvent = {
  id: string;
  /** ISO timestamp. */
  at: string;
  /** What happened, in plain words: "Sent back for changes". */
  title: React.ReactNode;
  /** Optional detail (a comment, a stage change). */
  body?: React.ReactNode;
  /** Who did it (name or a node with an Avatar). Omit for system events. */
  actor?: React.ReactNode;
  /** Decorative icon for the node. */
  icon?: React.ReactNode;
  tone?: ToneInput;
  /** Render body as a quoted comment. */
  isComment?: boolean;
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "Unknown date"
    : d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * An ordered list of events, newest first, optionally grouped by day.
 * Generic over any activity source; Govern's ActivityFeed maps its entries
 * onto `TimelineEvent`.
 */
export function Timeline({
  events,
  groupByDay = true,
  label = "Activity",
  empty,
  className,
}: {
  events: TimelineEvent[];
  groupByDay?: boolean;
  /** Accessible name of the list. */
  label?: string;
  /** Shown when there are no events. */
  empty?: React.ReactNode;
  className?: string;
}) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (sorted.length === 0) {
    return (
      <div className="rounded-container border border-dashed border-border-strong px-4 py-8 text-center text-body text-fg-secondary">
        {empty ?? "Nothing has happened yet."}
      </div>
    );
  }
  const groups: { day: string; items: TimelineEvent[] }[] = [];
  for (const e of sorted) {
    const day = groupByDay ? dayLabel(e.at) : "";
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-6", className)}>
      {groups.map((g) => (
        <section key={g.day || "all"} aria-label={g.day || label}>
          {g.day && <h4 className="text-sm font-semibold mb-3 text-fg-primary">{g.day}</h4>}
          <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:start-[15px] before:w-px before:bg-border-default">
            {g.items.map((e) => (
              <TimelineItem key={e.id} event={e} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineItem({ event: e }: { event: TimelineEvent }) {
  const tone = resolveTone(e.tone ?? "unknown");
  return (
    <li className="relative flex gap-3">
      <span
        aria-hidden
        className={cn(
          "relative z-(--z-raised) inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 ring-4 ring-surface-raised [&_svg]:size-3.5",
          TONE_SOFT[tone],
        )}
      >
        {e.icon ?? <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-body font-semibold text-fg-primary">{e.title}</span>
          <time dateTime={e.at} title={formatDateTime(e.at)} className="ms-auto text-caption tabular-nums text-fg-tertiary">
            {shortTime(e.at)}
          </time>
        </div>
        {e.body && (
          <div
            className={cn(
              "mt-1 text-body break-words text-fg-secondary",
              e.isComment && "rounded-lg border border-border-default bg-surface-sunken px-3 py-2 text-fg-primary",
            )}
          >
            {e.body}
          </div>
        )}
        {e.actor && <div className="mt-1 flex items-center gap-1.5 text-caption text-fg-secondary">{e.actor}</div>}
      </div>
    </li>
  );
}

/** Alias: an activity feed is a timeline of who-did-what. */
export const ActivityFeed = Timeline;
