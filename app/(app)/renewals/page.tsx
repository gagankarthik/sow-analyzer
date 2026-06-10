"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MotionReveal } from "@/components/MotionReveal";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocuments } from "@/lib/queries/documents";
import { fmtMoney } from "@/lib/contract-value";
import type { ApiDocument } from "@/lib/types";
import { CalendarClock, Repeat, XCircle, CheckCircle2, ArrowRight } from "@/components/ui/icons";

const DAY = 86_400_000;

type Item = {
  doc: ApiDocument;
  date: number; // key date (ms)
  days: number; // days from now (negative = overdue)
  kind: "renewal" | "expired" | "upcoming";
  value: number;
};

function monthLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export default function RenewalsPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const [now] = useState(() => Date.now());

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const d of docs) {
      const value = d.contractValue ?? 0;
      const eff = d.effectiveDate ? new Date(d.effectiveDate).getTime() : NaN;
      const hasDate = Number.isFinite(eff);
      const days = hasDate ? Math.round((eff - now) / DAY) : 0;

      if (d.lifecycle === "expired") {
        out.push({ doc: d, date: hasDate ? eff : now, days: hasDate ? days : -1, kind: "expired", value });
      } else if (d.lifecycle === "renewal") {
        out.push({ doc: d, date: hasDate ? eff : now, days: hasDate ? days : 0, kind: "renewal", value });
      } else if (hasDate && eff >= now && eff <= now + 180 * DAY) {
        out.push({ doc: d, date: eff, days, kind: "upcoming", value });
      }
    }
    return out.sort((a, b) => a.date - b.date);
  }, [docs, now]);

  const kpis = useMemo(() => {
    const inRenewal = items.filter((i) => i.kind === "renewal").length;
    const expired = items.filter((i) => i.kind === "expired").length;
    const next90 = items.filter((i) => i.kind === "upcoming" && i.days <= 90).length;
    const value = items.reduce((s, i) => s + i.value, 0);
    const d30 = items.filter((i) => i.kind === "upcoming" && i.days <= 30).length;
    const d60 = items.filter((i) => i.kind === "upcoming" && i.days > 30 && i.days <= 60).length;
    const d90 = items.filter((i) => i.kind === "upcoming" && i.days > 60 && i.days <= 90).length;
    return { inRenewal, expired, next90, value, d30, d60, d90 };
  }, [items]);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of items) {
      const key = i.kind === "expired" ? "Overdue" : monthLabel(i.date);
      (map.get(key) ?? map.set(key, []).get(key)!).push(i);
    }
    return [...map.entries()];
  }, [items]);

  const windowMax = Math.max(kpis.d30, kpis.d60, kpis.d90, 1);

  if (isLoading) return <RenewalsSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Obligations & renewals"
        subtitle="Key contract dates across the portfolio — what's expiring, up for renewal, and coming due."
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Up for renewal" value={kpis.inRenewal} icon={<Repeat size={15} />} tone="warning" />
          <Kpi label="Expired" value={kpis.expired} icon={<XCircle size={15} />} tone="danger" />
          <Kpi label="Due in 90 days" value={kpis.next90} icon={<CalendarClock size={15} />} tone="brand" />
          <Kpi label="Value in scope" value={kpis.value > 0 ? fmtMoney(kpis.value) : "—"} icon={<CalendarClock size={15} />} tone="neutral" />
        </div>

        {/* 30/60/90 window infographic */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={15} className="text-[var(--brand-primary-600)]" />
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Upcoming window</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">by effective date</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {([["30 days", kpis.d30], ["60 days", kpis.d60], ["90 days", kpis.d90]] as const).map(([label, n]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">{n}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brand-primary-500)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${(n / windowMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 shadow-xs flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)] mb-4">
              <CheckCircle2 size={22} />
            </span>
            <p className="text-[13.5px] font-semibold text-foreground mb-1">Nothing due right now</p>
            <p className="text-[12.5px] text-muted-foreground max-w-sm">
              No contracts are expired, in renewal, or have a key date in the next 6 months.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([label, group]) => (
              <section key={label}>
                <div className="flex items-center gap-3 mb-2.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</h2>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border">
                  {group.map((i, idx) => (
                    <MotionReveal key={i.doc.docId} delay={Math.min(idx * 0.02, 0.12)}>
                      <Link
                        href={`/projects/${i.doc.docId}`}
                        className="group flex items-center gap-3.5 px-4 sm:px-5 py-3.5 transition-colors hover:bg-muted/40"
                      >
                        <KindMark kind={i.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-foreground truncate">{i.doc.title || "Untitled"}</span>
                            <DocTypeBadge type={i.doc.docType} />
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {i.doc.effectiveDate ? new Date(i.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "No date set"}
                            {i.value > 0 ? ` · ${fmtMoney(i.value, i.doc.currency)}` : ""}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${i.days < 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : i.days <= 30 ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-muted text-muted-foreground"}`}>
                          {daysLabel(i.days)}
                        </span>
                        <ArrowRight size={15} className="shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                      </Link>
                    </MotionReveal>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function KindMark({ kind }: { kind: Item["kind"] }) {
  const map = {
    expired: { icon: <XCircle size={16} className="text-[var(--danger)]" />, bg: "bg-[var(--danger-soft)]" },
    renewal: { icon: <Repeat size={16} className="text-[var(--warning)]" />, bg: "bg-[var(--warning-soft)]" },
    upcoming: { icon: <CalendarClock size={16} className="text-[var(--brand-primary-700)]" />, bg: "bg-[var(--brand-primary-50)]" },
  } as const;
  const m = map[kind];
  return <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.bg}`}>{m.icon}</span>;
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "warning" | "danger" | "brand" | "neutral";
}) {
  const tint =
    tone === "warning" ? "text-[var(--warning)]" : tone === "danger" ? "text-[var(--danger)]" : tone === "brand" ? "text-[var(--brand-primary-600)]" : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className={tint}>{icon}</span>
      </div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function RenewalsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-5 md:pt-6 pb-4 space-y-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="app-container py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
