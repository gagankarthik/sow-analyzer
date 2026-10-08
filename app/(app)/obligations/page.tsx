"use client";

// Obligations: every report, payment, milestone and term end the signed
// agreements commit the organization to. The same dashboard as Contracts:
// views on the left (by due date, verification and type) with live counts,
// filters over the table, a preview on row click, and a floating bar to
// verify or complete many at once. Sonar-found obligations stay "Needs
// verification" until a person confirms them.

import { SearchField } from "@/components/ds/inputs";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { FilterPill, optionsFrom } from "@/components/ds/FilterPill";
import { RecordDashboard } from "@/components/govern/RecordDashboard";
import type { PanelGroup } from "@/components/govern/ViewsPanel";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Check, Sparkles } from "@/components/ui/icons";
import { updateObligation } from "@/lib/govern/api";
import { OBLIGATION_KIND_LABEL, plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import {
  OBLIGATION_GROUP_LABEL, OBLIGATION_VIEWS, daysUntil, obligationViewById, startOfDay, type ObligationViewGroup,
} from "@/lib/govern/obligation-views";
import { governKeys, useObligations } from "@/lib/govern/queries";
import type { ObligationInput, PortfolioObligation } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";
import { ObligationPreview } from "./_components/ObligationPreview";

const GROUPS: ObligationViewGroup[] = ["all", "due", "verification", "kind"];
const rowId = (o: PortfolioObligation) => `${o.contractId}:${o.id}`;

function sumAmounts(list: PortfolioObligation[]): string {
  const by = new Map<string, number>();
  for (const o of list) if (o.amount) by.set((o.currency ?? "").toUpperCase(), (by.get((o.currency ?? "").toUpperCase()) ?? 0) + o.amount);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? formatCompact(top[1], top[0] || null) : "—";
}

export default function ObligationsPage() {
  return (
    <Suspense fallback={null}>
      <Obligations />
    </Suspense>
  );
}

function Obligations() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const view = obligationViewById(params.get("view"));
  const [today] = useState(() => startOfDay(Date.now()));

  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [kind, setKind] = useState<string[]>([]);
  const [verification, setVerification] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useObligations();
  const all = useMemo(() => data?.obligations ?? [], [data]);

  const counts = useMemo(() => Object.fromEntries(OBLIGATION_VIEWS.map((v) => [v.id, all.filter((o) => v.test(o, today)).length])), [all, today]);
  const groups: PanelGroup[] = useMemo(() => GROUPS.map((g) => ({
    label: OBLIGATION_GROUP_LABEL[g],
    views: OBLIGATION_VIEWS.filter((v) => v.group === g).map((v) => ({ id: v.id, label: v.label, count: counts[v.id] ?? 0, hideWhenEmpty: v.hideWhenEmpty })),
  })), [counts]);

  const inView = useMemo(() => all.filter((o) => view.test(o, today)), [all, view, today]);
  const rows = useMemo(() => inView.filter((o) =>
    (kind.length === 0 || kind.includes(o.kind))
    && (verification.length === 0 || verification.includes(o.verified ? "verified" : "needs"))
    && (!query || [o.title, o.contractTitle, o.counterparty, o.owner?.name].some((s) => s?.toLowerCase().includes(query))),
  ), [inView, kind, verification, query]);
  const filtering = !!query || kind.length + verification.length > 0;
  const clearAll = () => { setQ(""); setKind([]); setVerification([]); };

  const hrefFor = useCallback((id: string) => `${pathname}?view=${id}`, [pathname]);
  const goToView = (id: string) => { setSelected(new Set()); router.replace(`${pathname}?view=${id}`, { scroll: false }); };

  const d90 = all.filter((o) => counts["90"] && obligationViewById("90").test(o, today));
  const kpis: Kpi[] = [
    { label: "Overdue", value: String(counts.overdue ?? 0), sub: counts.overdue ? "Complete or reschedule" : "Nothing overdue", tone: counts.overdue ? "danger" : "neutral", href: hrefFor("overdue") },
    { label: "Due in 30 days", value: String(counts["30"] ?? 0), sub: "Plan the work now", tone: counts["30"] ? "warning" : "neutral", href: hrefFor("30") },
    { label: "Money due in 90 days", value: sumAmounts(d90), sub: plural(d90.length, "obligation"), href: hrefFor("90") },
    { label: "Needs verification", value: String(counts.needs ?? 0), sub: counts.needs ? "Found by Sonar, not yet confirmed" : "Everything is confirmed", tone: counts.needs ? "warning" : "neutral", href: hrefFor("needs") },
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
    else toast.success(`${plural(list.length, "obligation")} ${done}`);
  }

  const columns: DataTableColumn<PortfolioObligation>[] = [
    {
      id: "title", header: "Obligation", card: "title", className: "min-w-[14rem] max-w-[24rem]", sortValue: (o) => o.title.toLowerCase(),
      cell: (o) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{o.title}</span>
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
            <span className="font-medium tabular-nums">{new Date(`${o.dueDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
            <span className={cn("text-xs font-medium", n < 0 ? "text-[var(--danger)]" : n <= 14 ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>
              {n < 0 ? `${plural(-n, "day")} overdue` : n === 0 ? "Due today" : `In ${plural(n, "day")}`}
            </span>
          </span>
        );
      },
    },
    {
      id: "verified", header: "Verification", card: "status", sortValue: (o) => (o.verified ? 1 : 0),
      cell: (o) => o.verified ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success-fg)]"><BadgeCheck size={13} aria-hidden />Verified</span>
      ) : (
        <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md bg-[var(--warning-soft)] px-2 text-xs font-medium text-[var(--warning-fg)]"><Sparkles size={12} aria-hidden />Needs verification</span>
      ),
    },
    {
      id: "contract", header: "Contract", className: "max-w-[16rem]", sortValue: (o) => o.contractTitle?.toLowerCase() ?? null,
      cell: (o) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{o.contractTitle || "Untitled contract"}</span>
          {o.counterparty && <span className="truncate text-xs text-[var(--ink-600)]">{o.counterparty}</span>}
        </span>
      ),
    },
    { id: "amount", header: "Amount", numeric: true, sortFirst: "desc", sortValue: (o) => o.amount, cell: (o) => (o.amount ? formatCompact(o.amount, o.currency) : "—") },
    { id: "owner", header: "Owner", priority: 2, sortValue: (o) => o.owner?.name ?? o.owner?.email ?? null, cell: (o) => o.owner?.name || o.owner?.email || <span className="text-[var(--ink-500)]">Unassigned</span> },
  ];

  const preview = previewId ? all.find((o) => rowId(o) === previewId) ?? null : null;
  const closePreview = useCallback(() => setPreviewId(null), []);

  return (
    <RecordDashboard
      label="Obligation views"
      groups={groups}
      activeId={view.id}
      hrefFor={hrefFor}
      title={view.label}
      count={isLoading ? null : rows.length}
      description={view.description}
      aside={preview && (
        <ObligationPreview
          obligation={preview}
          today={today}
          busy={busy}
          onVerify={() => void bulk([preview], { verified: true }, "verified")}
          onDone={() => { void bulk([preview], { status: "done" }, "marked done"); closePreview(); }}
          onClose={closePreview}
        />
      )}
    >
      {!isLoading && !(isError && !data) && all.length > 0 && <KpiStrip items={kpis} />}
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
        state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
        onRetry={() => void refetch()}
        errorDetail={error instanceof Error ? error.message : undefined}
        isFiltered={filtering || (view.id !== "all" && all.length > 0)}
        onClearFilters={filtering ? clearAll : () => goToView("all")}
        selection={{ selected, onChange: setSelected }}
        bulkActions={(chosen) => (
          <>
            <button type="button" disabled={busy || chosen.every((o) => o.verified)} onClick={() => void bulk(chosen.filter((o) => !o.verified), { verified: true }, "verified")} className="inline-flex items-center gap-1.5 text-sm">
              <BadgeCheck size={14} aria-hidden />Verify
            </button>
            <button type="button" disabled={busy} onClick={() => void bulk(chosen, { status: "done" }, "marked done")} className="inline-flex items-center gap-1.5 text-sm">
              <Check size={14} aria-hidden />Mark done
            </button>
          </>
        )}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField label={`Search ${view.label.toLowerCase()}`} hideLabel placeholder="Search this view" value={q} onChange={setQ} className="sm:w-60" />
            <FilterPill label="Type" selected={kind} onChange={setKind} options={optionsFrom(inView, (o) => o.kind, (v) => OBLIGATION_KIND_LABEL[v as PortfolioObligation["kind"]] ?? v)} />
            <FilterPill label="Verification" selected={verification} onChange={setVerification}
              options={[{ value: "needs", label: "Needs verification", count: inView.filter((o) => !o.verified).length }, { value: "verified", label: "Verified", count: inView.filter((o) => o.verified).length }].filter((o) => o.count > 0)} />
            {filtering && <button type="button" onClick={clearAll} className="h-9 rounded-lg px-2 text-sm font-medium text-[var(--brand-primary-700)] hover:underline">Clear all</button>}
          </div>
        }
        empty={
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
            <p className="text-base font-semibold text-foreground">No open obligations</p>
            <p className="max-w-md text-sm text-[var(--ink-600)]">When an agreement is signed, Sonar reads it for reports, payments, milestones and the term end, and lists them here for you to verify. You can also add one on any contract page.</p>
            <Button asChild><Link href="/contracts?view=signed">Signed contracts</Link></Button>
          </div>
        }
      />
    </RecordDashboard>
  );
}
