"use client";

// Renewals: every renewal, term end, notice deadline, payment, milestone and
// deliverable date the analysed documents carry, soonest first. The list-page
// pattern (UI_SPEC sections 3, 7, 9): title + count, status views as tabs
// (URL ?view=), the shared toolbar, a flat table grouped by month.

import { Suspense, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { SummaryTiles } from "@/components/ds/KpiTile";
import { Toolbar } from "@/components/ds/Toolbar";
import { ViewTabs, type ListView } from "@/components/ds/ViewTabs";
import {
  InViewFooter, MoreFilters, QuickFilters, SheetFilters, activeFilterCount, type IndexFilter,
} from "@/components/govern/IndexFilters";
import { RenewalsSkeleton } from "./_components/RenewalsSkeleton";
import { Button } from "@/components/ui/button";
import { docTypeShort } from "@/lib/doc-types";
import { useDocuments, isProcessing } from "@/lib/queries/documents";
import { useNow } from "@/lib/use-now";
import { fmtMoney } from "@/lib/contract-value";
import { DUE_SOON_DAYS, displayTitle, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { documentKeyDates, formatKeyDate, isoDayToMs, portfolioDates, type DerivedKeyDate, type KeyDateKind } from "@/lib/key-dates";
import type { ApiDocument, DocType } from "@/lib/types";
import { CalendarClock, Repeat, XCircle, CheckCircle2, RefreshCw, Clock, Info } from "@/components/ui/icons";

type ViewId = "all" | "renewal" | "upcoming" | "passed" | "expired";
const VIEW_IDS: ViewId[] = ["all", "renewal", "upcoming", "passed", "expired"];
const VIEW_LABEL: Record<ViewId, string> = {
  all: "All dates",
  renewal: "Up for renewal",
  upcoming: "Upcoming",
  passed: "Due date passed",
  expired: "Expired",
};
const DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const MONTH = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

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

function monthLabel(ms: number): string {
  return MONTH.format(new Date(ms));
}

function daysLabel(days: number | null): string {
  if (days === null) return "No date extracted";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export default function RenewalsPage() {
  return (
    <Suspense fallback={<RenewalsSkeleton />}>
      <Renewals />
    </Suspense>
  );
}

function Renewals() {
  const { data, isLoading, isError, error, refetch } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);
  const now = useNow(); // real current time, re-read every minute
  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  // What is listed, and why.
  //
  // A document analyzed with key-date extraction lists EACH of its dated
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
  // A document analyzed before key dates existed keeps the older single row,
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
      const termEnd = d.termEndDate ? parseDate(d.termEndDate).getTime() : NaN;

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

  const params = useSearchParams();
  const pathname = usePathname();
  const statusFilter = VIEW_IDS.includes(params.get("view") as ViewId) ? (params.get("view") as ViewId) : "all";

  // List filters over fields already on each item: search, document type, time window.
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [windowFilter, setWindowFilter] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | undefined>(undefined);
  const inStatus = useMemo(() => items.filter((i) => statusFilter === "all" || i.kind === statusFilter), [items, statusFilter]);
  const availableTypes = useMemo(() => [...new Set(inStatus.map((i) => i.doc.docType))].sort(), [inStatus]);
  const visibleItems = useMemo(() => {
    const maxDays = windowFilter.length === 0 ? null : Number(windowFilter[0]);
    return inStatus.filter((i) =>
      (typeFilter.length === 0 || typeFilter.includes(i.doc.docType)) &&
      (maxDays === null || (i.days !== null && i.days <= maxDays)) &&
      (!query || [i.doc.title, i.detail].some((s) => s?.toLowerCase().includes(query))),
    );
  }, [inStatus, typeFilter, windowFilter, query]);

  const filters: IndexFilter[] = [
    ...(availableTypes.length > 1 ? [{
      id: "type", label: "Type", selected: typeFilter, onChange: setTypeFilter,
      options: availableTypes.map((t) => ({ value: t, label: docTypeShort(t as DocType), count: inStatus.filter((i) => i.doc.docType === t).length })),
    }] : []),
    {
      id: "window", label: "Date", single: true, selected: windowFilter, onChange: setWindowFilter,
      options: [{ value: "30", label: "Within 30 days" }, { value: "60", label: "Within 60 days" }, { value: "90", label: "Within 90 days" }],
    },
  ];
  const activeCount = activeFilterCount(filters);
  const clearFilters = () => { setQ(""); setTypeFilter([]); setWindowFilter([]); };

  const counts = useMemo(() => Object.fromEntries(VIEW_IDS.map((id) => [id, id === "all" ? items.length : items.filter((i) => i.kind === id).length])), [items]);
  const tabs: ListView[] = VIEW_IDS.map((id) => ({
    id, label: VIEW_LABEL[id], count: isLoading ? null : counts[id], href: id === "all" ? pathname : `${pathname}?view=${id}`,
  }));

  // Month groups, in date order: expired first, passed next, undated last.
  const groupOf = (i: Item) => (i.kind === "expired" ? "Overdue" : i.kind === "passed" ? "Passed" : i.date === null ? "No date" : monthLabel(i.date));
  const groupOrder = useMemo(() => ["Overdue", "Passed", ...new Set(items.filter((i) => i.date !== null && i.kind !== "expired" && i.kind !== "passed").map((i) => monthLabel(i.date as number))), "No date"], [items]);

  const columns: DataTableColumn<Item>[] = [
    {
      id: "doc", header: "Document", card: "title", className: "min-w-[14rem]", sortValue: (i) => (i.doc.title || "").toLowerCase(),
      cell: (i) => (
        <span className="flex min-w-0 max-w-[min(28rem,42cqw)] flex-col">
          <span className="truncate">{displayTitle(i.doc.title) || "Untitled"}</span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-normal text-[var(--ink-600)]">
            <span className="truncate">{docTypeShort(i.doc.docType)}</span>
            {i.autoRenews && <span className="inline-flex shrink-0 items-center gap-1 text-[var(--warning-fg)]"><Repeat size={12} aria-hidden />Auto-renews</span>}
          </span>
        </span>
      ),
    },
    {
      id: "date", header: "Date", sortValue: (i) => i.date, className: "w-56",
      cell: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="tabular-nums">{i.date !== null ? `${i.dateLabel} ${i.dateText ?? DATE.format(new Date(i.date))}` : "No date extracted"}</span>
          {i.detail && <span className="truncate text-xs text-[var(--ink-600)]">{i.detail}</span>}
        </span>
      ),
    },
    { id: "status", header: "Status", card: "status", sortValue: (i) => VIEW_LABEL[i.kind], cell: (i) => <KindMark kind={i.kind} /> },
    {
      id: "when", header: "When", sortValue: (i) => i.days, className: "w-32",
      cell: (i) => (
        <span className={cn("whitespace-nowrap text-xs font-medium tabular-nums", i.days !== null && i.days <= DUE_SOON_DAYS ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>
          {i.kind === "expired" && i.days === null ? "Marked expired" : i.kind !== "expired" && i.days !== null && i.days < 0 ? `${Math.abs(i.days)}d ago` : daysLabel(i.days)}
        </span>
      ),
    },
    { id: "value", header: "Value", numeric: true, priority: 2, sortFirst: "desc", sortValue: (i) => i.value, cell: (i) => (i.value !== null && i.value > 0 ? fmtMoney(i.value, i.doc.currency) : "—") },
  ];

  const valueLabel = kpis.byCurrency.length > 0 ? kpis.byCurrency.map(([cur, total]) => fmtMoney(total, cur || null)).join(" + ") : "No value yet";

  if (isLoading) return <RenewalsSkeleton />;

  // Nothing loaded and the request failed: say so. (This used to fall through
  // to "Nothing due right now", which read as a clean bill of health.)
  if (isError && !data) {
    return (
      <>
        <PageHeader title="Renewals" />
        <div className="app-container app-page">
          <div role="alert" className="flex flex-col items-center border-y border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-14 text-center">
            <XCircle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
            <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load your contracts</h2>
            <p className="mt-2 max-w-md break-words text-sm leading-relaxed text-[var(--ink-600)]">{error instanceof Error ? error.message : "The request failed."} Renewal and expiry dates are unknown until this loads.</p>
            <Button variant="outline" className="mt-5" onClick={() => refetch()}><RefreshCw size={16} aria-hidden />Try again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Renewals"
        count={visibleItems.length}
        meta={<ViewTabs label="Renewal views" views={tabs} activeId={statusFilter} />}
      />

      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        <SummaryTiles
          items={[
            { label: "Due in 90 days", value: kpis.next90, footnote: `${kpis.d30} · ${kpis.d60} · ${kpis.d90} by 30/60/90 days`, tone: kpis.d30 > 0 ? "warning" : undefined },
            { label: "Up for renewal", value: kpis.inRenewal, footnote: kpis.inRenewal ? "Within 6 months" : "None", tone: kpis.inRenewal ? "warning" : undefined, href: `${pathname}?view=renewal` },
            { label: "Expired", value: kpis.expired, footnote: kpis.expired > 0 ? "Past term end" : "None", tone: kpis.expired > 0 ? "danger" : undefined, href: `${pathname}?view=expired` },
            { label: "Value listed", value: valueLabel, footnote: items.length === 0 ? "No documents listed" : `${kpis.valued} of ${kpis.listedDocs} documents have a value` },
          ]}
        />

        {legacyCount > 0 && <LegacyNote count={legacyCount} />}

        <DataTable
          caption={statusFilter === "all" ? "Renewal and key dates" : VIEW_LABEL[statusFilter]}
          noun="dates"
          columns={columns}
          rows={visibleItems}
          getRowId={(i) => i.key}
          getRowHref={(i) => i.href}
          getRowLabel={(i) => `Open ${i.doc.title || "document"}`}
          defaultSort={{ columnId: "date", direction: "asc" }}
          groupBy={{ key: groupOf, label: groupLabel, order: groupOrder }}
          pageSize={50}
          columnsKey="renewals-table"
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          isFiltered={activeCount > 0 || !!query || (statusFilter !== "all" && items.length > 0)}
          onClearFilters={clearFilters}
          footer={visibleItems.length > 0 ? (
            <InViewFooter
              count={visibleItems.length}
              noun={["date", "dates"]}
              cells={[
                { label: "Documents", value: new Set(visibleItems.map((i) => i.doc.docId)).size },
                { label: "Expired", value: visibleItems.filter((i) => i.kind === "expired").length, tone: visibleItems.some((i) => i.kind === "expired") ? "danger" : undefined },
              ]}
            />
          ) : undefined}
          toolbar={
            <Toolbar label="Renewal filters" activeCount={activeCount} mobileSheet={<SheetFilters filters={filters} onClear={clearFilters} />}>
              <Toolbar.Search label="Search renewals" placeholder="Search documents" value={q} onChange={setQ} />
              <Toolbar.Filters><QuickFilters filters={filters} /></Toolbar.Filters>
              <Toolbar.More><MoreFilters filters={filters} /></Toolbar.More>
              <Toolbar.Clear count={activeCount} onClear={clearFilters} />
            </Toolbar>
          }
          empty={
            <div className="flex flex-col items-center border-y border-border-default px-5 py-14 text-center">
              <CheckCircle2 size={24} aria-hidden className="mb-3 text-[var(--ink-500)]" />
              <p className="mb-1 text-base font-semibold text-foreground">Nothing due right now</p>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                {docs.length === 0
                  ? "You have no documents yet."
                  : `None of your ${docs.length} document${docs.length === 1 ? " is" : "s are"} expired, in renewal, or has an extracted date in the next 6 months.`}
                {processingCount > 0 ? ` ${processingCount} ${processingCount === 1 ? "is" : "are"} still being analyzed, so dates may yet appear.` : ""}
              </p>
            </div>
          }
        />
      </div>
    </>
  );
}

function groupLabel(key: string): string {
  if (key === "Overdue") return "Expired or past term end";
  if (key === "Passed") return "Due date passed in the last 90 days (completion not tracked)";
  if (key === "No date") return "No date extracted";
  return key;
}

const KIND_MARK = {
  expired: { Icon: XCircle, cls: "text-[var(--danger-fg)]", label: "Expired" },
  renewal: { Icon: Repeat, cls: "text-[var(--warning-fg)]", label: "Up for renewal" },
  upcoming: { Icon: CalendarClock, cls: "text-[var(--ink-700)]", label: "Upcoming" },
  passed: { Icon: Clock, cls: "text-[var(--warning-fg)]", label: "Due date passed" },
} as const;

/** Status as icon + word, coloured only when it needs attention. */
function KindMark({ kind }: { kind: Item["kind"] }) {
  const m = KIND_MARK[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", m.cls)}>
      <m.Icon size={12} aria-hidden />
      {m.label}
    </span>
  );
}

/** Documents analyzed before key-date extraction list fewer dates: say so,
 *  in one line (the detail is in the tooltip). */
function LegacyNote({ count }: { count: number }) {
  return (
    <p
      className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-600)]"
      title="Older analysis lists only renewal, term-end and effective dates. Re-analyze for all dates."
    >
      <Info size={12} aria-hidden className="shrink-0" />
      <span className="min-w-0 truncate">
        {count} document{count === 1 ? " needs" : "s need"} re-analysis for full dates ·{" "}
        <Link href="/library" className="font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline">Re-analyze</Link>
      </span>
    </p>
  );
}
