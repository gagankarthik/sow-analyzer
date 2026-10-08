"use client";

// Notifications are *derived* from data we already load — documents and project
// members — rather than a separate backend feed. Each event has a stable id so
// read-state (persisted in localStorage and shared across the bell + the page)
// survives reloads.

import { useMemo, useSyncExternalStore } from "react";
import { useDocuments } from "@/lib/queries/documents";
import { useProjects } from "@/lib/projects-store";
import { useNow } from "@/lib/use-now";
import { formatIsoDay, portfolioDates, relativeDays, type DerivedKeyDate, type KeyDateKind } from "@/lib/key-dates";
import type { ApiDocument } from "@/lib/types";

export type NotificationType = "risk" | "renewal" | "analysis" | "failed" | "team";
export type NotificationSeverity = "critical" | "high" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  timestamp: number;
  severity: NotificationSeverity;
}

// ── shared read-state store ──────────────────────────────────────────────
const READ_KEY = "biq-notif-read";
let readIds: Set<string> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (readIds) return;
  readIds = new Set();
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) readIds = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }
}
function persist() {
  if (typeof window === "undefined" || !readIds) return;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
  } catch {
    /* ignore quota/private-mode */
  }
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getSnapshot() {
  return version;
}
function getServerSnapshot() {
  return 0;
}
function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

export function markRead(ids: string | string[]) {
  ensureLoaded();
  const arr = Array.isArray(ids) ? ids : [ids];
  let changed = false;
  for (const id of arr) {
    if (!readIds!.has(id)) {
      readIds!.add(id);
      changed = true;
    }
  }
  if (changed) {
    persist();
    bump();
  }
}

// ── derivation ───────────────────────────────────────────────────────────
function ts(s: string | null | undefined): number {
  const t = s ? new Date(s).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** A renewal, term-end or notice date this close (or already past) raises a notification. */
const RENEWAL_WINDOW_DAYS = 90;

/** The date of one kind that matters now: the next one still to come, else the
 *  most recent one that has passed. Only exact days: a date known just to the
 *  month or quarter is not counted down to. */
function relevant(dates: DerivedKeyDate[], kind: KeyDateKind): DerivedKeyDate | null {
  const exact = dates.filter((k) => k.kind === kind && k.precision === "day");
  return exact.find((k) => (k.days as number) >= 0) ?? exact[exact.length - 1] ?? null;
}

/**
 * The date-based notifications for one document: its renewal / term end, and
 * the last day to give notice of non-renewal.
 *
 * The dates come from the same place as the timeline and the renewals page
 * (lib/key-dates.ts): the document's `keyDates` when the analysis produced
 * them, else the older renewal / term-end / notice-period fields. "In N days"
 * is counted in calendar days from the real current date.
 */
function datesFor(d: ApiDocument, title: string, href: string, when: number, now: number): AppNotification[] {
  const dates = portfolioDates(d, now);
  const renewal = relevant(dates, "renewal");
  // The latest stated term end: an extension supersedes the original end.
  const termEnds = dates.filter((k) => k.kind === "term_end" && k.precision === "day");
  const termEnd = termEnds[termEnds.length - 1] ?? null;
  const key = renewal ?? termEnd; // null = neither date was extracted
  const what = renewal ? "renews" : "reaches the end of its term";
  const base = { id: `renewal:${d.docId}`, type: "renewal" as const, href, timestamp: when };
  const out: AppNotification[] = [];

  if (d.lifecycle === "expired") {
    out.push({
      ...base,
      title: "Contract expired",
      body: `${title} is in the Expired stage${termEnd ? ` (term ended ${formatIsoDay(termEnd.date as string)})` : ""}.`,
      severity: "high",
    });
    return out;
  }

  const days = key ? (key.days as number) : null;
  if (key && days !== null && days < 0 && !renewal) {
    out.push({
      ...base,
      title: "Term has ended",
      body: `${title} reached the end of its term on ${formatIsoDay(key.date as string)}.`,
      severity: "high",
    });
  } else if (key && days !== null && days >= 0 && days <= RENEWAL_WINDOW_DAYS) {
    out.push({
      ...base,
      title: renewal ? "Renewal approaching" : "Term ending soon",
      body: `${title} ${what} ${relativeDays(days)}, on ${formatIsoDay(key.date as string)}${d.autoRenews ? ". It renews automatically" : ""}.`,
      severity: days <= 30 ? "high" : "info",
    });
  } else if (d.lifecycle === "renewal") {
    out.push({
      ...base,
      title: "In renewal",
      body: `${title} is in the Renewal stage. No renewal date was extracted.`,
      severity: "info",
    });
  }

  // The last day to give notice of non-renewal, while it can still be met.
  const notice = dates.find((k) => k.kind === "notice_deadline" && k.precision === "day" && (k.days as number) >= 0);
  if (notice && (notice.days as number) <= RENEWAL_WINDOW_DAYS) {
    const left = notice.days as number;
    out.push({
      id: `notice:${d.docId}`,
      type: "renewal",
      href,
      timestamp: when,
      title: "Notice deadline approaching",
      body: `The last day to give notice of non-renewal for ${title} is ${formatIsoDay(notice.date as string)} (${relativeDays(left)})${notice.isDerived ? ", calculated from the term end and the notice period" : ""}.`,
      severity: left <= 30 ? "high" : "info",
    });
  }
  return out;
}

function fromDocs(docs: ApiDocument[], now: number): AppNotification[] {
  const out: AppNotification[] = [];
  for (const d of docs) {
    const href = `/projects/${d.docId}`;
    const when = ts(d.updatedAt) || ts(d.createdAt);
    const title = d.title || "Untitled document";

    if (d.status === "FAILED") {
      out.push({
        id: `failed:${d.docId}`,
        type: "failed",
        title: "Analysis failed",
        body: `${title} could not be processed${d.errorMessage ? `: ${d.errorMessage}` : "."}`,
        href,
        timestamp: when,
        severity: "high",
      });
      continue;
    }

    if (d.status === "READY") {
      const high = (d.riskCounts?.high ?? 0) + (d.riskCounts?.critical ?? 0);
      if (high > 0) {
        const crit = (d.riskCounts?.critical ?? 0) > 0;
        out.push({
          id: `risk:${d.docId}`,
          type: "risk",
          title: crit ? "Critical risk found" : "High-risk clauses found",
          body: `${title} has ${high} clause${high === 1 ? "" : "s"} rated high or critical.`,
          href,
          timestamp: when,
          severity: crit ? "critical" : "high",
        });
      } else {
        out.push({
          id: `analysis:${d.docId}`,
          type: "analysis",
          title: "Analysis complete",
          body: `${title} has been analyzed.`,
          href,
          timestamp: when,
          severity: "info",
        });
      }
      out.push(...datesFor(d, title, href, when, now));
    }
  }
  return out;
}

function fromProjects(projects: ReturnType<typeof useProjects>): AppNotification[] {
  const out: AppNotification[] = [];
  for (const p of projects) {
    for (const m of p.members ?? []) {
      if (m.status === "invited") {
        out.push({
          id: `team:${p.id}:${m.email}`,
          type: "team",
          title: "Invitation pending",
          body: `${m.email} was invited to ${p.name} as ${m.role}.`,
          href: `/projects/${p.id}`,
          timestamp: ts(m.invitedAt) || ts(p.createdAt),
          severity: "info",
        });
      }
    }
  }
  return out;
}

export function useNotifications() {
  const query = useDocuments();
  const { data: docs } = query;
  const projects = useProjects();
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Renewal countdowns are counted from the real current time, re-read each minute.
  const now = useNow(60_000);
  ensureLoaded();

  const notifications = useMemo(
    () => [...fromDocs(docs ?? [], now), ...fromProjects(projects)].sort((a, b) => b.timestamp - a.timestamp),
    [docs, projects, now],
  );

  const unreadCount = useMemo(
    () => notifications.reduce((n, x) => n + (readIds?.has(x.id) ? 0 : 1), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, v],
  );

  const isRead = (id: string) => !!readIds?.has(id);
  const markAllRead = () => markRead(notifications.map((n) => n.id));

  return {
    notifications,
    unreadCount,
    isRead,
    markRead,
    markAllRead,
    /** State of the documents query the notifications are derived from, so a
     *  caller never shows "all caught up" while loading or after a failed load. */
    isLoading: query.isLoading,
    isError: query.isError && !query.data,
    isFetching: query.isFetching,
    updatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
