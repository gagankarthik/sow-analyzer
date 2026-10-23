"use client";

// Obligations: every report, payment, milestone and term end the signed
// agreements commit the organization to. The list-page pattern (UI_SPEC
// sections 3, 7 and 9): title + count, views as tabs with counts (URL
// ?view=), the shared 32px toolbar, a flat table with an "N in view" footer,
// a preview on row click, and a floating bar to verify or complete many at
// once. Sonar-found obligations stay "Needs verification" until a person
// confirms them.

import { byEdition } from "@/lib/edition-runtime";
import { SummaryTilesSkeleton } from "@/components/ds/skeletons";
import { OBLIGATION_TILES, ObligationsSkeleton } from "./_components/ObligationsSkeleton";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { optionsFrom } from "@/components/ds/FilterPill";
import { Toolbar } from "@/components/ds/Toolbar";
import { ViewTabs, type ListView } from "@/components/ds/ViewTabs";
import { PageHeader } from "@/components/PageHeader";
import {
  InViewFooter, MoreFilters, QuickFilters, SheetFilters, activeFilterCount, type IndexFilter,
} from "@/components/govern/IndexFilters";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Check } from "@/components/ui/icons";
import { updateObligation } from "@/lib/govern/api";
import { OBLIGATION_KIND_LABEL, plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import {
  OBLIGATION_VIEWS, daysUntil, obligationViewById, startOfDay,
} from "@/lib/govern/obligation-views";
import { governKeys, useObligations, useCanEditContracts } from "@/lib/govern/queries";
import type { ObligationInput, PortfolioObligation } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";
import { ObligationPreview } from "./_components/ObligationPreview";
import { DUE_SOON_DAYS, displayTitle } from "@/lib/format";
import { StatusPill as DsStatusPill } from "@/components/ds/StatusPill";
import { DateRangeFilter, inDateRange, type DateRange } from "@/components/ds/DateRangeFilter";

/** The views shown as tabs, in order. Type views live in the Type filter. */
const TAB_VIEWS = ["all", "overdue", "30", "90", "no-date", "needs", "verified"];
const rowId = (o: PortfolioObligation) => `${o.contractId}:${o.id}`;
const DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

function sumAmounts(list: PortfolioObligation[]): string {
  const by = new Map<string, number>();
  for (const o of list) if (o.amount) by.set((o.currency ?? "").toUpperCase(), (by.get((o.currency ?? "").toUpperCase()) ?? 0) + o.amount);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? formatCompact(top[1], top[0] || null) : "—";
}

export default function ObligationsPage() {
  return (
    <Suspense fallback={<ObligationsSkeleton />}>
      <Obligations />
    </Suspense>
  );
}

function Obligations() {
  // Leaders read obligations; reviewers and admins change them.
  const canEdit = useCanEditContracts();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const view = obligationViewById(params.get("view"));
  const [today] = useState(() => startOfDay(Date.now()));
  const [due, setDue] = useState<DateRange | null>(null);

  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [kind, setKind] = useState<string[]>([]);
  const [verification, setVerification] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = useObligations();
  const all = useMemo(() => data?.obligations ?? [], [data]);

  const counts = useMemo(() => Object.fromEntries(OBLIGATION_VIEWS.map((v) => [v.id, all.filter((o) => v.test(o, today)).length])), [all, today]);

  const hrefFor = useCallback((id: string) => (id === "all" ? pathname : `${pathname}?view=${id}`), [pathname]);
  const goToView = (id: string) => { setSelected(new Set()); router.replace(hrefFor(id), { scroll: false }); };

  // Tabs: the fixed views (an empty "No due date" stays out of the way), plus
  // the open view when it is one of the type views reached by a link.
  const tabs: ListView[] = useMemo(() => {
    const ids = TAB_VIEWS.filter((id) => {
      const v = obligationViewById(id);
      return !(v.hideWhenEmpty && !counts[id] && view.id !== id);
    });
    if (!ids.includes(view.id)) ids.push(view.id);
    return ids.map((id) => {
      const v = obligationViewById(id);
      return { id: v.id, label: v.label, count: isLoading ? null : counts[v.id] ?? 0, href: hrefFor(v.id) };
    });
  }, [counts, view.id, isLoading, hrefFor]);

  const inView = useMemo(() => all.filter((o) => view.test(o, today)), [all, view, today]);
  const rows = useMemo(() => inView.filter((o) =>
    (kind.length === 0 || kind.includes(o.kind))
    && (verification.length === 0 || verification.includes(o.verified ? "verified" : "needs"))
    && (!query || [o.title, o.contractTitle, o.counterparty, o.owner?.name].some((s) => s?.toLowerCase().includes(query)))
    && inDateRange(o.dueDate, due, new Date(today), "future"),
  ), [inView, kind, verification, query, due, today]);
  const clearAll = () => { setQ(""); setKind([]); setVerification([]); setDue(null); };

  const filters: IndexFilter[] = [
    {
      id: "kind", label: "Type", selected: kind, onChange: setKind,
      options: optionsFrom(inView, (o) => o.kind, (v) => OBLIGATION_KIND_LABEL[v as PortfolioObligation["kind"]] ?? v),
    },
    {
      id: "verification", label: "Verification", selected: verification, onChange: setVerification,
      options: [
        { value: "needs", label: "Needs verification", count: inView.filter((o) => !o.verified).length },
        { value: "verified", label: "Verified", count: inView.filter((o) => o.verified).length },
      ].filter((o) => o.count > 0),
    },
  ];
  const activeCount = activeFilterCount(filters) + (due ? 1 : 0);
  const filtering = !!query || activeCount > 0;

  const d90 = all.filter((o) => obligationViewById("90").test(o, today));
  const kpis: Kpi[] = [
    { label: "Overdue", value: String(counts.overdue ?? 0), sub: counts.overdue ? "Past the due date" : "None", tone: counts.overdue ? "danger" : "neutral", href: hrefFor("overdue") },
    { label: "Due in 30 days", value: String(counts["30"] ?? 0), sub: "From today", tone: counts["30"] ? "warning" : "neutral", href: hrefFor("30") },
    { label: "Money due in 90 days", value: sumAmounts(d90), sub: plural(d90.length, "obligation"), href: hrefFor("90") },
    { label: "Needs verification", value: String(counts.needs ?? 0), sub: counts.needs ? "Found by Sonar" : "All confirmed", tone: counts.needs ? "warning" : "neutral", href: hrefFor("needs") },
  ];

  async function bulk(list: PortfolioObligation[], input: ObligationInput, done: string) {
    setBusy(true);
    const results = await Promise.allSettled(list.map((o) => updateObligation(o.contractId, o.id, input)));
    setBusy(false);
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: governKeys.obligations });
    void qc.invalidateQueries({ queryKey: governKeys.allContracts });
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) toast.error(`${plural(list.length - failed, "obligation")} ${done}, ${failed} failed`, { description: "Try the failed ones again." });
    else toast.success(`${plural(list.length, "obligation")} ${done}`, input.status === "done" ? {
      duration: 10_000,
      action: { label: "Undo", onClick: () => void bulk(list, { status: "open" }, "reopened") },
    } : undefined);
  }

  const columns: DataTableColumn<PortfolioObligation>[] = [
    {
      id: "title", header: "Obligation", card: "title", className: "min-w-[12rem]", sortValue: (o) => o.title.toLowerCase(),
      cell: (o) => (
        <span className="flex min-w-0 max-w-[min(26rem,40cqw)] flex-col">
          <span className="truncate">{displayTitle(o.title)}</span>
          <span className="text-xs font-normal text-[var(--ink-600)]">{OBLIGATION_KIND_LABEL[o.kind]}</span>
        </span>
      ),
    },
    {
      id: "due", header: "Due", sortValue: (o) => o.dueDate, className: "w-36",
      cell: (o) => {
        if (!o.dueDate) return <span className="text-[var(--ink-500)]">No date</span>;
        const n = daysUntil(o.dueDate, today);
        return (
          <span className="flex flex-col">
            <span className="font-medium tabular-nums">{DATE.format(new Date(`${o.dueDate.slice(0, 10)}T00:00:00`))}</span>
            <span className={cn("text-xs font-medium tabular-nums", n < 0 ? "text-[var(--danger-fg)]" : n <= DUE_SOON_DAYS ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>
              {n < 0 ? `${plural(-n, "day")} overdue` : n === 0 ? "Due today" : `In ${plural(n, "day")}`}
            </span>
          </span>
        );
      },
    },
    {
      id: "verified", header: "Verification", card: "status", sortValue: (o) => (o.verified ? 1 : 0),
      cell: (o) => o.verified ? (
        <DsStatusPill size="sm" tone="ok">Verified</DsStatusPill>
      ) : (
        <DsStatusPill size="sm" tone="caution">Needs verification</DsStatusPill>
      ),
    },
    {
      id: "contract", header: "Contract", priority: 2, sortValue: (o) => o.contractTitle?.toLowerCase() ?? null,
      cell: (o) => (
        <span className="flex min-w-0 max-w-[min(16rem,22cqw)] flex-col">
          <span className="truncate">{o.contractTitle ? displayTitle(o.contractTitle) : "Untitled contract"}</span>
          {o.counterparty && <span className="truncate text-xs text-[var(--ink-600)]">{o.counterparty}</span>}
        </span>
      ),
    },
    { id: "amount", header: "Amount", priority: 2, numeric: true, sortFirst: "desc", sortValue: (o) => o.amount, cell: (o) => (o.amount ? formatCompact(o.amount, o.currency) : "—") },
    { id: "owner", header: "Owner", priority: 2, sortValue: (o) => o.owner?.name ?? o.owner?.email ?? null, cell: (o) => o.owner?.name || o.owner?.email || <span className="text-[var(--ink-500)]">Unassigned</span> },
  ];

  const preview = previewId ? all.find((o) => rowId(o) === previewId) ?? null : null;
  const closePreview = useCallback(() => setPreviewId(null), []);
  const overdueInView = rows.filter((o) => !!o.dueDate && daysUntil(o.dueDate, today) < 0).length;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Obligations"
        count={isLoading ? null : rows.length}
        countLoading={isLoading}
        meta={<ViewTabs label="Obligation views" views={tabs} activeId={view.id} loading={isLoading} />}
      />
      <div className="app-container flex min-w-0 flex-col gap-3 pt-3 pb-8">
        {isLoading ? <SummaryTilesSkeleton labels={OBLIGATION_TILES} /> : !(isError && !data) && all.length > 0 && <KpiStrip items={kpis} />}
        <DataTable
          caption={view.label}
          noun="obligations"
          columns={columns}
          rows={rows}
          getRowId={rowId}
          getRowLabel={(o) => `Preview ${o.title}`}
          onRowClick={(o) => setPreviewId(rowId(o))}
          activeRowId={previewId}
          defaultSort={{ columnId: "due", direction: "asc" }}
          pageSize={25}
          columnsKey="obligations-table"
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
          onRetry={() => void refetch()}
          errorDetail={error instanceof Error ? error.message : undefined}
          isFiltered={filtering || (view.id !== "all" && all.length > 0)}
          onClearFilters={filtering ? clearAll : () => goToView("all")}
          selection={canEdit ? { selected, onChange: setSelected } : undefined}
          footer={rows.length > 0 ? (
            <InViewFooter
              count={rows.length}
              noun={["obligation", "obligations"]}
              cells={[
                { label: "Money due", value: sumAmounts(rows) },
                { label: "Overdue", value: overdueInView, tone: overdueInView > 0 ? "danger" : undefined },
              ]}
            />
          ) : undefined}
          bulkActions={canEdit ? (chosen) => (
            <>
              <button type="button" disabled={busy || chosen.every((o) => o.verified)} onClick={() => void bulk(chosen.filter((o) => !o.verified), { verified: true }, "verified")} className="inline-flex items-center gap-1.5 text-sm">
                <BadgeCheck size={16} aria-hidden />Verify
              </button>
              <button type="button" disabled={busy} onClick={() => void bulk(chosen, { status: "done" }, "marked done")} className="inline-flex items-center gap-1.5 text-sm">
                <Check size={16} aria-hidden />Mark done
              </button>
            </>
          ) : undefined}
          toolbar={
            <Toolbar
              label="Obligation filters"
              activeCount={activeCount}
              mobileSheet={<SheetFilters filters={filters} onClear={clearAll} />}
            >
              <Toolbar.Search label={`Search ${view.label.toLowerCase()}`} placeholder="Search this view" value={q} onChange={setQ} />
              <Toolbar.Filters>
                <QuickFilters filters={filters} />
                <DateRangeFilter label="Due" direction="future" value={due} onChange={setDue} />
              </Toolbar.Filters>
              <Toolbar.More><MoreFilters filters={filters} /></Toolbar.More>
              <Toolbar.Clear count={activeCount} onClear={clearAll} />
            </Toolbar>
          }
          empty={
            <div className="flex flex-col items-center gap-3 border-y border-border-default px-5 py-14 text-center">
              <p className="text-base font-semibold text-foreground">No open obligations</p>
              <p className="max-w-md text-sm text-[var(--ink-600)]">Signed agreements add their {byEdition("reports, payments, milestones", "deliverables, invoices, milestones")} and term end here to verify. You can also add one on any contract.</p>
              <Button asChild><Link href="/contracts?view=signed">View signed contracts</Link></Button>
            </div>
          }
        />
      </div>
      {preview && (
        <ObligationPreview
          obligation={preview}
          today={today}
          busy={busy}
          readOnly={!canEdit}
          onVerify={() => void bulk([preview], { verified: true }, "verified")}
          onDone={() => { void bulk([preview], { status: "done" }, "marked done"); closePreview(); }}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
