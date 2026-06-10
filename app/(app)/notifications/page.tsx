"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MotionReveal } from "@/components/MotionReveal";
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
} from "@/components/ui/icons";

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; tint: string; bg: string }
> = {
  risk: { icon: ShieldAlert, label: "Risk", tint: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
  renewal: { icon: CalendarClock, label: "Renewals", tint: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
  analysis: { icon: CheckCircle2, label: "Analysis", tint: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
  failed: { icon: AlertTriangle, label: "Failed", tint: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
  team: { icon: Users, label: "Team", tint: "text-[var(--brand-primary-700)]", bg: "bg-[var(--brand-primary-50)]" },
};

const FILTERS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "risk", label: "Risk" },
  { key: "renewal", label: "Renewals" },
  { key: "analysis", label: "Analysis" },
  { key: "team", label: "Team" },
];

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
  const { notifications, unreadCount, isRead, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [now] = useState(() => Date.now());

  const visible = useMemo(
    () => (filter === "all" ? notifications : notifications.filter((n) => n.type === filter)),
    [notifications, filter],
  );

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
        eyebrow="Workspace"
        title="Notifications"
        subtitle="Risk, renewals, analysis, and team activity across your portfolio — newest first."
      />

      <div className="app-container py-6 md:py-8">
        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  data-active={active}
                  className="h-8 px-3 rounded-lg border border-border text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:border-[var(--brand-primary-600)] data-[active=true]:bg-[var(--brand-primary-600)] data-[active=true]:text-white"
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            Mark all read{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 shadow-xs flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <Bell size={22} strokeWidth={1.5} />
            </span>
            <p className="text-[13.5px] font-semibold text-foreground mb-1">You&apos;re all caught up</p>
            <p className="text-[12.5px] text-muted-foreground max-w-sm">
              {filter === "all"
                ? "New risk findings, renewals, and analysis results will show up here as Sonar processes your documents."
                : "Nothing in this category right now. Try another filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map(([bucket, items]) => (
              <section key={bucket}>
                <div className="flex items-center gap-3 mb-2.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{bucket}</h2>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border">
                  {items.map((n, i) => {
                    const meta = TYPE_META[n.type];
                    const Icon = meta.icon;
                    const read = isRead(n.id);
                    return (
                      <MotionReveal key={n.id} delay={Math.min(i * 0.02, 0.12)}>
                        <Link
                          href={n.href}
                          onClick={() => markRead(n.id)}
                          data-read={read}
                          className="group flex items-start gap-3.5 px-4 sm:px-5 py-3.5 transition-colors hover:bg-muted/40 data-[read=true]:opacity-65"
                        >
                          <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                            <Icon size={16} className={meta.tint} strokeWidth={1.85} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!read && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary-600)]" aria-label="Unread" />
                              )}
                              <span className="text-[13.5px] font-semibold text-foreground truncate">{n.title}</span>
                              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                {relTime(n.timestamp, now)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>
                          </div>
                          <ArrowRight
                            size={15}
                            className="mt-1 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
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
    </>
  );
}
