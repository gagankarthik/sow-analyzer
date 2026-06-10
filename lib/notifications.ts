"use client";

// Notifications are *derived* from data we already load — documents and project
// members — rather than a separate backend feed. Each event has a stable id so
// read-state (persisted in localStorage and shared across the bell + the page)
// survives reloads.

import { useMemo, useSyncExternalStore } from "react";
import { useDocuments } from "@/lib/queries/documents";
import { useProjects } from "@/lib/projects-store";
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

function fromDocs(docs: ApiDocument[]): AppNotification[] {
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
        body: `${title} could not be processed${d.errorMessage ? ` — ${d.errorMessage}` : "."}`,
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
          body: `${title} has ${high} high-risk clause${high === 1 ? "" : "s"} that need review.`,
          href,
          timestamp: when,
          severity: crit ? "critical" : "high",
        });
      } else {
        out.push({
          id: `analysis:${d.docId}`,
          type: "analysis",
          title: "Analysis complete",
          body: `${title} is analysed and ready to review.`,
          href,
          timestamp: when,
          severity: "info",
        });
      }
      if (d.lifecycle === "renewal" || d.lifecycle === "expired") {
        const expired = d.lifecycle === "expired";
        out.push({
          id: `renewal:${d.docId}`,
          type: "renewal",
          title: expired ? "Contract expired" : "Renewal approaching",
          body: `${title} is ${expired ? "past its term — review before it lapses." : "up for renewal."}`,
          href,
          timestamp: when,
          severity: expired ? "high" : "info",
        });
      }
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
  const { data: docs = [] } = useDocuments();
  const projects = useProjects();
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  ensureLoaded();

  const notifications = useMemo(
    () => [...fromDocs(docs), ...fromProjects(projects)].sort((a, b) => b.timestamp - a.timestamp),
    [docs, projects],
  );

  const unreadCount = useMemo(
    () => notifications.reduce((n, x) => n + (readIds?.has(x.id) ? 0 : 1), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, v],
  );

  const isRead = (id: string) => !!readIds?.has(id);
  const markAllRead = () => markRead(notifications.map((n) => n.id));

  return { notifications, unreadCount, isRead, markRead, markAllRead };
}
