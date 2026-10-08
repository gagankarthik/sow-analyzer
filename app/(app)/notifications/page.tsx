"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowRight,
  X,
} from "@/components/ui/icons";

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; tint: string; bg: string }
> = {
  risk: { icon: ShieldAlert, label: "Risk", tint: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
  renewal: { icon: CalendarClock, label: "Renewal", tint: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
  analysis: { icon: CheckCircle2, label: "Analysis", tint: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
  failed: { icon: AlertTriangle, label: "Failed", tint: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
  team: { icon: Users, label: "Team", tint: "text-structure-soft-fg", bg: "bg-structure-soft" },
};

const FILTERS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "risk", label: "Risk" },
  { key: "renewal", label: "Renewals" },
  { key: "analysis", label: "Analysis" },
  { key: "failed", label: "Failed" },
  { key: "team", label: "Team" },
];

const CHIP =
  "h-10 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:border-structure-border aria-[pressed=true]:bg-structure-soft aria-[pressed=true]:text-structure-soft-fg sm:h-8";

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
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
        actions={
          <>
            <Button variant="outline" className="h-10 sm:h-9" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check size={14} />
              Mark all read
            </Button>
          </>
        }
      />

      {/* A reading column, not a full-bleed table: the list stays at a comfortable measure on wide screens. */}
      <div className="app-container app-page">
        <div className="max-w-[880px]">
          {/* Filter bar — read state + type; one row that scrolls sideways on narrow screens */}
          <div className="mb-5 space-y-2.5">
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
              <div className="flex w-max items-center gap-1.5">
                <div role="group" aria-label="Filter by read state" className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setUnreadOnly(false)} aria-pressed={!unreadOnly} className={CHIP}>All</button>
                  <button type="button" onClick={() => setUnreadOnly(true)} aria-pressed={unreadOnly} className={CHIP}>
                    Unread<span className="ml-1.5 tabular-nums">{unreadCount}</span>
                  </button>
                </div>
                <span className="mx-1.5 h-5 w-px bg-[var(--ink-300)]" aria-hidden />
                <div role="group" aria-label="Filter by type" className="flex items-center gap-1.5">
                  {FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} className={CHIP}>
                      {f.key === "all" ? "All types" : f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 sm:min-h-8">
              <p className="text-sm text-[var(--ink-600)]" aria-live="polite">
                Showing <span className="font-semibold tabular-nums text-foreground">{visible.length}</span> of <span className="tabular-nums">{notifications.length}</span>
              </p>
              {activeFilters > 0 && (
                <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] sm:h-8" onClick={clearFilters}>
                  <X size={14} />Clear filters ({activeFilters})
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}</div>
          ) : isError && notifications.length === 0 ? (
            <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-14 text-center">
              <p className="mb-1 text-lg font-semibold text-foreground">Couldn&apos;t load notifications</p>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">Your documents couldn&apos;t be loaded, so there is nothing to derive notifications from yet.</p>
              <Button variant="outline" className="mt-5 h-10 sm:h-9" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : notifications.length > 0 && visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
              <p className="mb-1 text-lg font-semibold text-foreground">No notifications match these filters</p>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                {unreadOnly ? "You have no unread notifications of this type." : "Nothing of this type right now."}
              </p>
              <Button variant="outline" className="mt-5 h-10 sm:h-9" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-[var(--ink-600)]">
                <Bell size={22} strokeWidth={1.5} />
              </span>
              <p className="mb-1 text-lg font-semibold text-foreground">You&apos;re all caught up</p>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                Risk findings, renewal dates, failed analyses and pending invitations appear here as your documents are analysed.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([bucket, items]) => (
                <section key={bucket}>
                  <h2 className="text-lg font-semibold mb-2.5 tracking-tight text-foreground">{bucket}</h2>
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    {items.map((n, i) => {
                      const meta = TYPE_META[n.type];
                      const Icon = meta.icon;
                      const read = isRead(n.id);
                      return (
                        <MotionReveal key={n.id} delay={Math.min(i * 0.02, 0.12)}>
                          {/* Unread rows carry a brand edge + bold title; read rows drop to regular weight
                              on the panel tint (no opacity fade, so text stays AA). */}
                          <Link
                            href={n.href}
                            onClick={() => markRead(n.id)}
                            data-read={read}
                            className="group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] data-[read=true]:bg-[var(--panel)] data-[read=true]:hover:bg-muted sm:gap-3.5 sm:px-5"
                          >
                            {!read && <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--brand-primary-600)]" aria-hidden />}
                            <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                              <Icon size={16} className={meta.tint} strokeWidth={1.85} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <span className={`min-w-0 flex-1 text-base leading-snug [overflow-wrap:anywhere] ${read ? "font-medium text-[var(--ink-700)]" : "font-semibold text-foreground"}`}>
                                  {!read && <span className="sr-only">Unread: </span>}
                                  {n.title}
                                </span>
                                <span className="shrink-0 whitespace-nowrap pt-px text-xs tabular-nums text-muted-foreground">
                                  {relTime(n.timestamp, now)}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--ink-600)]">{n.body}</p>
                              <span className={`mt-1.5 inline-block text-xs font-medium ${meta.tint}`}>{meta.label}</span>
                            </div>
                            <ArrowRight
                              size={16}
                              className="mt-1 hidden shrink-0 text-[var(--ink-300)] transition-colors group-hover:text-[var(--brand-primary-600)] sm:block"
                            />
                          </Link>
                        </MotionReveal>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
