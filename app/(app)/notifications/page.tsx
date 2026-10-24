"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RadioFilterButton } from "@/components/ds/FilterButton";
import { Toolbar } from "@/components/ds/Toolbar";
import { Button } from "@/components/ui/button";
import { NotificationListSkeleton } from "./_components/NotificationsSkeleton";
import { useNow } from "@/lib/use-now";
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";
import {
  Bell,
  ShieldAlert,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Check,
} from "@/components/ui/icons";

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; tint: string }
> = {
  // Colour only where something needs attention; the type word always shows.
  risk: { icon: ShieldAlert, label: "Risk", tint: "text-[var(--danger-fg)]" },
  renewal: { icon: CalendarClock, label: "Renewal", tint: "text-[var(--warning-fg)]" },
  analysis: { icon: CheckCircle2, label: "Analysis", tint: "text-[var(--ink-500)]" },
  failed: { icon: AlertTriangle, label: "Failed", tint: "text-[var(--danger-fg)]" },
  team: { icon: Users, label: "Team", tint: "text-[var(--ink-500)]" },
};

const FILTERS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "risk", label: "Risk" },
  { key: "renewal", label: "Renewals" },
  { key: "analysis", label: "Analysis" },
  { key: "failed", label: "Failed" },
  { key: "team", label: "Team" },
];

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function bucketOf(ts: number, now: number): "Today" | "This week" | "Earlier" {
  const startToday = new Date(now).setHours(0, 0, 0, 0);
  if (ts >= startToday) return "Today";
  if (ts >= now - 7 * 86_400_000) return "This week";
  return "Earlier";
}

function relTime(ts: number, now: number): string {
  if (!ts) return "";
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return SHORT_DATE.format(new Date(ts));
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isRead, markRead, markAllRead, isLoading, isError, refetch } = useNotifications();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const now = useNow(30_000); // "5m ago" and the Today bucket follow the real clock

  const visible = useMemo(
    () => notifications.filter((n) => (filter === "all" || n.type === filter) && (!unreadOnly || !isRead(n.id))),
    [notifications, filter, unreadOnly, isRead],
  );

  const activeFilters = (filter !== "all" ? 1 : 0) + (unreadOnly ? 1 : 0);
  const clearFilters = () => { setFilter("all"); setUnreadOnly(false); };

  const groups = useMemo(() => {
    const order = ["Today", "This week", "Earlier"] as const;
    const map = new Map<string, AppNotification[]>();
    for (const n of visible) {
      const b = bucketOf(n.timestamp, now);
      (map.get(b) ?? map.set(b, []).get(b)!).push(n);
    }
    return order.filter((o) => map.has(o)).map((o) => [o, map.get(o)!] as const);
  }, [visible, now]);

  return (
    <>
      <PageHeader
        title="Notifications"
        count={isLoading ? null : notifications.length}
        countLoading={isLoading}
        actions={
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <Check size={16} aria-hidden />
            Mark all read
          </Button>
        }
      />

      {/* A reading column: the list stays at a comfortable measure on wide screens. */}
      <div className="app-container app-page gap-3">
        <div className="flex flex-col gap-3">
          {(() => {
            const quick = (
              <>
                <RadioFilterButton
                  label="Show"
                  value={unreadOnly ? "unread" : "all"}
                  anyValue="all"
                  onChange={(v) => setUnreadOnly(v === "unread")}
                  options={[
                    { value: "all", label: "All" },
                    { value: "unread", label: `Unread (${unreadCount})` },
                  ]}
                />
                <RadioFilterButton
                  label="Type"
                  value={filter}
                  anyValue="all"
                  onChange={setFilter}
                  options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
                />
              </>
            );
            return (
              <Toolbar
                label="Filter notifications"
                activeCount={activeFilters}
                mobileSheet={<div className="flex flex-col items-start gap-3">{quick}</div>}
              >
                <Toolbar.Filters always>{quick}</Toolbar.Filters>
                <Toolbar.Clear count={activeFilters} onClear={clearFilters} />
              </Toolbar>
            );
          })()}

          {isLoading ? (
            <NotificationListSkeleton rows={6} label="notifications" />
          ) : isError && notifications.length === 0 ? (
            <div role="alert" className="flex flex-col items-center border-y border-border px-5 py-12 text-center">
              <AlertTriangle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t load notifications</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">Your documents couldn&apos;t be loaded, so there is nothing to derive notifications from yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : notifications.length > 0 && visible.length === 0 ? (
            <div className="flex flex-col items-center border-y border-border px-5 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">No notifications match these filters</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                {unreadOnly ? "You have no unread notifications of this type." : "Nothing of this type right now."}
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center border-y border-border px-5 py-12 text-center">
              <Bell size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                Risk findings, renewal dates, failed analyses and pending invitations appear here.
              </p>
            </div>
          ) : (
            <div className="border-y border-border">
              {groups.map(([bucket, items]) => (
                <section key={bucket} aria-labelledby={`notif-${bucket}`}>
                  <h2 id={`notif-${bucket}`} className="flex h-8 items-center border-b border-border bg-[var(--panel)] px-4 text-xs font-medium text-[var(--ink-600)]">
                    {bucket}
                  </h2>
                  <ul className="divide-y divide-border">
                    {items.map((n) => {
                      const meta = TYPE_META[n.type];
                      const Icon = meta.icon;
                      const read = isRead(n.id);
                      return (
                        <li key={n.id}>
                          <Link
                            href={n.href}
                            onClick={() => markRead(n.id)}
                            className="group flex min-h-[52px] items-start gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]"
                          >
                            <span className="mt-0.5 flex w-4 shrink-0 justify-center">
                              <Icon size={16} aria-hidden className={meta.tint} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-baseline gap-3">
                                <span className={`min-w-0 flex-1 truncate text-sm ${read ? "text-[var(--ink-700)]" : "font-semibold text-foreground"}`}>
                                  {!read && <span className="sr-only">Unread: </span>}
                                  {n.title}
                                </span>
                                <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-[var(--ink-500)]">
                                  {relTime(n.timestamp, now)}
                                </span>
                              </div>
                              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-600)]">
                                <span className={`shrink-0 font-medium ${meta.tint === "text-[var(--ink-500)]" ? "text-[var(--ink-600)]" : meta.tint}`}>{meta.label}</span>
                                <span aria-hidden>·</span>
                                <span className="min-w-0 truncate">{n.body}</span>
                              </p>
                            </div>
                            {!read && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--brand-primary-600)]" aria-hidden />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {!isLoading && visible.length > 0 && (
            <p className="text-xs text-[var(--ink-500)] tabular-nums" aria-live="polite">
              {visible.length} of {notifications.length} in view
            </p>
          )}
        </div>
      </div>
    </>
  );
}
