"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MotionReveal } from "@/components/MotionReveal";
import { DocTypeBadge } from "@/components/DocTypeBadge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { docTypeShort } from "@/lib/doc-types";
import { useDocuments, isProcessing } from "@/lib/queries/documents";
import { useNow } from "@/lib/use-now";
import { fmtMoney } from "@/lib/contract-value";
import { documentKeyDates, formatKeyDate, isoDayToMs, portfolioDates, type DerivedKeyDate, type KeyDateKind } from "@/lib/key-dates";
import type { ApiDocument, DocType } from "@/lib/types";
import { CalendarClock, Repeat, XCircle, CheckCircle2, ArrowRight, DollarSign, Layers, X, RefreshCw, Clock } from "@/components/ui/icons";

const DAY = 86_400_000;

type Item = {
  /** Unique per row: a document can have several dates listed. */
  key: string;
  doc: ApiDocument;
  /** Key date (ms) the pipeline extracted, or null when the document has none.
   *  It is never replaced by today's date. */
  date: number | null;
  /** The date as written to the precision the document gave ("Q1 2027"), when
   *  it comes from the document's key dates. */
  dateText?: string;
  /** Whole days from now to `date` (negative = past); null when there is no date. */
  days: number | null;
  /** expired = the term has ended; passed = an obligation's due date is behind us. */
  kind: "renewal" | "expired" | "upcoming" | "passed";
  /** This document's extracted contract value; null when none was extracted. */
  value: number | null;
  autoRenews: boolean;
  dateLabel: string; // what the key date represents (Renews / Term ends / Payment due …)
  /** Name of the milestone, deliverable or payment, and its amount if stated. */
  detail?: string;
  href: string;
};

/** How far ahead a date is listed, and how long a passed due date stays listed. */
const AHEAD_DAYS = 180;
const PASSED_DAYS = 90;

const DATE_LABEL: Partial<Record<KeyDateKind, string>> = {
  renewal: "Renews",
  term_end: "Term ends",
  notice_deadline: "Notice deadline",
  payment: "Payment due",
  milestone: "Milestone",
  deliverable: "Deliverable due",
};

/** Which list a key date belongs in, or null when it is out of range. */
function kindOf(k: DerivedKeyDate): Item["kind"] | null {
  const days = k.days as number;
  if (k.kind === "term_end") return days < 0 ? "expired" : days <= AHEAD_DAYS ? "upcoming" : null;
  if (k.kind === "renewal") return days <= AHEAD_DAYS ? "renewal" : null;
  // Notice deadline, payment, milestone, deliverable. A period under way (a
  // payment due "in Q4") is upcoming until the period ends.
  if (k.state === "completed") return days >= -PASSED_DAYS ? "passed" : null;
  return days <= AHEAD_DAYS ? "upcoming" : null;
}

type WindowKey = "all" | "30" | "60" | "90";
const STATUS_OPTIONS: { key: Item["kind"] | "all"; label: string }[] = [
  { key: "all", label: "All statuses" },
  { key: "expired", label: "Expired" },
  { key: "passed", label: "Due date passed" },
  { key: "renewal", label: "Up for renewal" },
  { key: "upcoming", label: "Upcoming" },
];
const CHIP =
  "h-10 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] aria-[pressed=true]:border-[var(--brand-primary-300)] aria-[pressed=true]:bg-[var(--brand-primary-50)] aria-[pressed=true]:text-[var(--brand-primary-700)] sm:h-9";

function monthLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysLabel(days: number | null): string {
  if (days === null) return "No date extracted";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export default function RenewalsPage() {
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const now = useNow(); // real current time, re-read every minute
  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  // What is listed, and why.
  //
  // A document analysed with key-date extraction lists EACH of its dated
  // renewal, term-end, notice-deadline, payment, milestone and deliverable
  // dates (see kindOf above):
  //  • expired  — a term-end date that has passed, or lifecycle "expired"
  //  • renewal  — a renewal date up to 180 days ahead (or already past), or
  //               lifecycle "renewal"
  //  • passed   — a notice deadline / payment / milestone / deliverable whose
  //               date passed within the last 90 days (whether it was met is
  //               not tracked)
  //  • upcoming — any of those dates within the next 180 days
  //
  // A document analysed before key dates existed keeps the older single row,
  // from the fields on the document row: its renewal date, else its term-end
  // date, else its effective date (labelled as such). A document with no date
  // at all keeps `date: null` and is shown as "No date extracted".
  const { items, legacyCount } = useMemo(() => {
    const out: Item[] = [];
    let legacyCount = 0;
    for (const d of docs) {
      const value = typeof d.contractValue === "number" ? d.contractValue : null;
      const autoRenews = !!d.autoRenews;
      const shared = { doc: d, value, autoRenews } as const;

      if (documentKeyDates(d).extracted) {
        const kinds = new Set<Item["kind"]>();
        for (const k of portfolioDates(d, now)) {
          const kind = kindOf(k);
          if (!kind) continue;
          kinds.add(kind);
          const named = k.kind === "payment" || k.kind === "milestone" || k.kind === "deliverable";
          const amount = k.amount !== null ? fmtMoney(k.amount, k.currency) : null;
          out.push({
            ...shared,
            key: `${d.docId}:${k.id}`,
            date: isoDayToMs(k.date as string),
            dateText: formatKeyDate(k) ?? undefined,
            days: k.days,
            kind,
            dateLabel: (k.kind === "term_end" && kind === "expired" ? "Term ended" : DATE_LABEL[k.kind]) ?? k.label,
            detail: [named ? k.label : null, amount].filter(Boolean).join(" · ") || undefined,
            href: `/projects/${d.docId}/timeline`,
          });
        }
        // The lifecycle stage still counts when no date backs it up.
        const undatedRow = (kind: "expired" | "renewal"): Item => ({
          ...shared, key: `${d.docId}:${kind}`, date: null, days: null, kind, dateLabel: "", href: `/projects/${d.docId}`,
        });
        if (d.lifecycle === "expired" && !kinds.has("expired")) out.push(undatedRow("expired"));
        if (d.lifecycle === "renewal" && !kinds.has("renewal")) out.push(undatedRow("renewal"));
        continue;
      }

      if (d.status === "READY") legacyCount += 1;
      const keyIso = d.renewalDate || d.termEndDate || d.effectiveDate;
      const dateLabel = d.renewalDate ? "Renews" : d.termEndDate ? "Term ends" : "Effective";
      const t = keyIso ? new Date(keyIso).getTime() : NaN;
      const date = Number.isFinite(t) ? t : null;
      const days = date !== null ? Math.round((date - now) / DAY) : null;
      const termEnd = d.termEndDate ? new Date(d.termEndDate).getTime() : NaN;

      const base = { ...shared, key: d.docId, dateLabel, date, days, href: `/projects/${d.docId}` } as const;

      if (d.lifecycle === "expired" || (Number.isFinite(termEnd) && termEnd < now)) {
        out.push({ ...base, kind: "expired" });
      } else if (d.lifecycle === "renewal" || (!!d.renewalDate && date !== null && date <= now + AHEAD_DAYS * DAY)) {
        out.push({ ...base, kind: "renewal" });
      } else if (date !== null && date >= now && date <= now + AHEAD_DAYS * DAY) {
        out.push({ ...base, kind: "upcoming" });
      }
    }
    // Soonest first; rows with no date go last.
    out.sort((a, b) => (a.date ?? Number.MAX_SAFE_INTEGER) - (b.date ?? Number.MAX_SAFE_INTEGER));
    return { items: out, legacyCount };
  }, [docs, now]);

  const kpis = useMemo(() => {
    const inRenewal = items.filter((i) => i.kind === "renewal").length;
    const expired = items.filter((i) => i.kind === "expired").length;
    // "Due" = a date that has not passed and is 0–90 days away.
    const due = items.filter((i) => i.kind !== "expired" && i.kind !== "passed" && i.days !== null && i.days >= 0 && i.days <= 90);
    const d30 = due.filter((i) => (i.days as number) <= 30).length;
    const d60 = due.filter((i) => (i.days as number) > 30 && (i.days as number) <= 60).length;
    const d90 = due.filter((i) => (i.days as number) > 60).length;
    // Value in scope: the sum of each listed document's own extracted value, per
    // currency (amounts in different currencies are never added together). An
    // amendment states the new contract total, so when a contract and its
    // amendment are both listed the same money is counted in both.
    const byCurrency = new Map<string, number>();
    let valued = 0;
    // One row per document here: a document with several dates listed is
    // still counted, and valued, once.
    const listedDocs = [...new Map(items.map((i) => [i.doc.docId, i])).values()];
    for (const i of listedDocs) {
      if (i.value === null || i.value <= 0) continue;
      valued += 1;
      const cur = (i.doc.currency ?? "").toUpperCase();
      byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + i.value);
    }
    return { inRenewal, expired, next90: due.length, d30, d60, d90, byCurrency: [...byCurrency.entries()], valued, listedDocs: listedDocs.length };
  }, [items]);

  // List filters — status, document type and time window, all over fields already on each item.
  const [statusFilter, setStatusFilter] = useState<Item["kind"] | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all");
  const [windowFilter, setWindowFilter] = useState<WindowKey>("all");
  const availableTypes = useMemo(() => [...new Set(items.map((i) => i.doc.docType))].sort(), [items]);
  const visibleItems = useMemo(() => {
    const maxDays = windowFilter === "all" ? null : Number(windowFilter);
    return items.filter((i) =>
      (statusFilter === "all" || i.kind === statusFilter) &&
      (typeFilter === "all" || i.doc.docType === typeFilter) &&
      (maxDays === null || (i.days !== null && i.days <= maxDays)),
    );
  }, [items, statusFilter, typeFilter, windowFilter]);
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (windowFilter !== "all" ? 1 : 0);
  const clearFilters = () => { setStatusFilter("all"); setTypeFilter("all"); setWindowFilter("all"); };

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of visibleItems) {
      const key = i.kind === "expired" ? "Overdue" : i.kind === "passed" ? "Passed" : i.date === null ? "No date extracted" : monthLabel(i.date);
      (map.get(key) ?? map.set(key, []).get(key)!).push(i);
    }
    return [...map.entries()];
  }, [visibleItems]);

  const windowMax = Math.max(kpis.d30, kpis.d60, kpis.d90, 1);

  if (isLoading) return <RenewalsSkeleton />;

  // Nothing loaded and the request failed: say so. (This used to fall through
  // to "Nothing due right now", which read as a clean bill of health.)
  if (isError && !data) {
    return (
      <>
        <PageHeader title="Obligations & renewals" subtitle="What's expiring, up for renewal, and coming due." />
        <div className="app-container py-6 md:py-8">
          <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-14 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={24} strokeWidth={1.5} /></span>
            <h2 className="text-xl font-semibold text-foreground">Couldn&apos;t load your contracts</h2>
            <p className="mt-2 max-w-md break-words text-base leading-relaxed text-[var(--ink-600)]">{error instanceof Error ? error.message : "The request failed."} Renewal and expiry dates are unknown until this loads.</p>
            <Button variant="outline" size="lg" className="mt-6" onClick={() => refetch()}><RefreshCw size={14} />Try again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Obligations & renewals"
        subtitle="What's expiring, up for renewal, and coming due."
        actions={<LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />}
      />

      <div className="app-container space-y-6 py-6 md:space-y-8 md:py-8">
        {/* Summary — the 90-day window is the focal block; the other three figures sit beside it. */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <section aria-labelledby="window-heading" className="rounded-xl bg-[var(--brand-primary-600)] p-5 text-white md:p-6 lg:col-span-7">
            <h2 id="window-heading" className="text-base font-medium text-[var(--brand-primary-100)]">Due in the next 90 days</h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-bold leading-none tracking-[-0.025em] tabular-nums">{kpis.next90}</span>
              <span className="text-base text-[var(--brand-primary-100)]">date{kpis.next90 === 1 ? "" : "s"} in that window: renewals, term ends, notice deadlines, payments, milestones and deliverables</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
              {([["0–30 days", kpis.d30], ["31–60 days", kpis.d60], ["61–90 days", kpis.d90]] as const).map(([label, n]) => (
                <div key={label} className="min-w-0">
                  <div className="text-2xl font-semibold leading-none tabular-nums">{n}</div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden>
                    <div
                      className="h-full rounded-full bg-white transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{ width: `${(n / windowMax) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-[var(--brand-primary-100)]">{label}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-2">
            <MetricCard label="Up for renewal" value={kpis.inRenewal} icon={<Repeat size={14} />} tone="warning" />
            <MetricCard label="Expired" value={kpis.expired} icon={<XCircle size={14} />} tone={kpis.expired > 0 ? "danger" : "neutral"} hint={kpis.expired > 0 ? "Past term end" : undefined} />
            <MetricCard
              className="lg:col-span-2"
              label="Value of the documents listed"
              value={kpis.byCurrency.length > 0 ? kpis.byCurrency.map(([cur, total]) => fmtMoney(total, cur || null)).join(" + ") : "Not extracted"}
              icon={<DollarSign size={14} />}
              hint={items.length === 0
                ? "No documents listed"
                : `Sum of each document's own extracted value, counted once per document · ${kpis.valued} of ${kpis.listedDocs} have one${kpis.byCurrency.some(([cur]) => !cur) ? " · currency not extracted for some" : ""}`}
            />
          </div>
        </div>

        {/* Timeline */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
              <CheckCircle2 size={22} />
            </span>
            <p className="mb-1 text-lg font-semibold text-foreground">Nothing due right now</p>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
              {docs.length === 0
                ? "You have no documents yet."
                : `None of your ${docs.length} document${docs.length === 1 ? " is" : "s are"} expired, in renewal, or has an extracted date in the next 6 months.`}
              {processingCount > 0 ? ` ${processingCount} ${processingCount === 1 ? "is" : "are"} still being analysed, so dates may yet appear.` : ""}
            </p>
            {legacyCount > 0 && <LegacyNote count={legacyCount} className="mt-3 max-w-sm" />}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter bar — status chips scroll sideways on narrow screens; selects wrap beneath */}
            <div className="space-y-2.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
                  <div role="group" aria-label="Filter by status" className="flex w-max items-center gap-1.5">
                    {STATUS_OPTIONS.map((o) => (
                      <button key={o.key} type="button" onClick={() => setStatusFilter(o.key)} aria-pressed={statusFilter === o.key} className={CHIP}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  {availableTypes.length > 1 && (
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocType | "all")}>
                      <SelectTrigger aria-label="Filter by document type" className="h-10! min-w-[140px] flex-1 bg-card text-sm sm:h-9! sm:w-[176px] sm:flex-none"><Layers size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All document types</SelectItem>
                        {availableTypes.map((t) => <SelectItem key={t} value={t}>{docTypeShort(t)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={windowFilter} onValueChange={(v) => setWindowFilter(v as WindowKey)}>
                    <SelectTrigger aria-label="Filter by time window" className="h-10! min-w-[140px] flex-1 bg-card text-sm sm:h-9! sm:w-[176px] sm:flex-none"><CalendarClock size={14} className="text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any date</SelectItem>
                      <SelectItem value="30">Within 30 days</SelectItem>
                      <SelectItem value="60">Within 60 days</SelectItem>
                      <SelectItem value="90">Within 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 sm:min-h-9">
                <p className="text-sm text-[var(--ink-600)]" aria-live="polite">
                  Showing <span className="font-semibold tabular-nums text-foreground">{visibleItems.length}</span> of <span className="tabular-nums">{items.length}</span> date{items.length === 1 ? "" : "s"} across {kpis.listedDocs} document{kpis.listedDocs === 1 ? "" : "s"}, soonest first
                </p>
                {activeFilters > 0 && (
                  <Button variant="ghost" className="h-10 text-[var(--brand-primary-700)] sm:h-9" onClick={clearFilters}>
                    <X size={14} />Clear filters ({activeFilters})
                  </Button>
                )}
              </div>
            </div>

            {visibleItems.length === 0 && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
                <p className="mb-1 text-lg font-semibold text-foreground">No dates match these filters</p>
                <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">Try a different status, document type, or time window.</p>
                <Button variant="outline" className="mt-5 h-10 sm:h-9" onClick={clearFilters}>Clear filters</Button>
              </div>
            )}

            {legacyCount > 0 && <LegacyNote count={legacyCount} />}

            {groups.map(([label, group]) => (
              <section key={label}>
                <div className="mb-2.5 flex items-baseline gap-2">
                  <h2 className={`text-lg font-semibold tracking-tight ${label === "Overdue" ? "text-[var(--danger)]" : "text-foreground"}`}>{label === "Overdue" ? "Expired or past term end" : label === "Passed" ? "Due date passed in the last 90 days" : label}</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">{group.length}</span>
                </div>
                {label === "Passed" && <p className="-mt-1 mb-2.5 text-sm text-[var(--ink-600)]">These dates are behind us. Blue-IQ does not record whether a payment, deliverable, milestone or notice was completed.</p>}
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  {group.map((i, idx) => (
                    <MotionReveal key={i.key} delay={Math.min(idx * 0.02, 0.12)}>
                      <Link
                        href={i.href}
                        className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] sm:items-center sm:gap-3.5 sm:px-5"
                      >
                        <KindMark kind={i.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="min-w-0 text-base font-semibold text-foreground [overflow-wrap:anywhere]">{i.doc.title || "Untitled"}</span>
                            <DocTypeBadge type={i.doc.docType} />
                            {i.autoRenews && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--warning)]">
                                <Repeat size={12} />Auto-renews
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-[var(--ink-600)]">
                            {i.date !== null ? `${i.dateLabel} ${i.dateText ?? new Date(i.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "No date extracted"}
                            {i.detail ? <span className="[overflow-wrap:anywhere]"> · {i.detail}</span> : null}
                            {i.value !== null && i.value > 0 ? <span className="tabular-nums"> · {fmtMoney(i.value, i.doc.currency)}</span> : null}
                          </div>
                        </div>
                        <span className={`mt-0.5 shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums sm:mt-0 ${i.days === null ? "bg-muted text-[var(--ink-600)]" : i.days < 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : i.days <= 30 ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-muted text-[var(--ink-600)]"}`}>
                          {i.kind === "expired" && i.days === null ? "Marked expired" : i.kind !== "expired" && i.days !== null && i.days < 0 ? `${Math.abs(i.days)}d ago` : daysLabel(i.days)}
                        </span>
                        <ArrowRight size={16} className="hidden shrink-0 text-[var(--ink-300)] transition-colors group-hover:text-[var(--brand-primary-600)] sm:block" />
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
    expired: { icon: <XCircle size={16} className="text-[var(--danger)]" />, bg: "bg-[var(--danger-soft)]", label: "Expired" },
    renewal: { icon: <Repeat size={16} className="text-[var(--warning)]" />, bg: "bg-[var(--warning-soft)]", label: "Up for renewal" },
    upcoming: { icon: <CalendarClock size={16} className="text-[var(--brand-primary-700)]" />, bg: "bg-[var(--brand-primary-50)]", label: "Upcoming" },
    passed: { icon: <Clock size={16} className="text-[var(--danger)]" />, bg: "bg-[var(--danger-soft)]", label: "Due date passed" },
  } as const;
  const m = map[kind];
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`} title={m.label}>
      {m.icon}
      <span className="sr-only">{m.label}:</span>
    </span>
  );
}

/** Documents analysed before key-date extraction list fewer dates: say so. */
function LegacyNote({ count, className = "" }: { count: number; className?: string }) {
  return (
    <p className={`text-sm leading-relaxed text-[var(--ink-600)] ${className}`}>
      {count} analysed document{count === 1 ? " was" : "s were"} analysed before full date extraction, so only {count === 1 ? "its" : "their"} renewal, term-end or effective date can be listed. Re-analyse {count === 1 ? "it" : "them"} to list notice deadlines, payments, milestones and deliverables.
    </p>
  );
}

function RenewalsSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container space-y-3 pb-5 pt-6 md:pb-7 md:pt-8">
          <Skeleton className="h-8 w-2/3 max-w-sm" />
          <Skeleton className="h-4 w-1/2 max-w-xs" />
        </div>
      </div>
      <div className="app-container space-y-6 py-6 md:space-y-8 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <Skeleton className="h-[208px] rounded-xl lg:col-span-7" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-2">
            <Skeleton className="h-[96px] rounded-xl" />
            <Skeleton className="h-[96px] rounded-xl" />
            <Skeleton className="h-[96px] rounded-xl lg:col-span-2" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  );
}
