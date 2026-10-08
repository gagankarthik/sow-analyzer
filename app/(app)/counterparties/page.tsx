"use client";

// Counterparties: one profile per organization you contract with, built from
// every contract that names it. The same dashboard as Contracts: views on the
// left (relationship, open and overdue work) with live counts, a table, and a
// profile panel on row click with their figures, agreements and your people.

import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { AvatarStack } from "@/components/ds/Avatar";
import { RecordDashboard } from "@/components/govern/RecordDashboard";
import type { PanelGroup } from "@/components/govern/ViewsPanel";
import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import {
  COUNTERPARTY_GROUP_LABEL, COUNTERPARTY_VIEWS, buildCounterparties, counterpartyViewById, type Counterparty, type CounterpartyView,
} from "@/lib/govern/counterparties";
import { plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import { contractPeople } from "@/lib/govern/people";
import { useContracts } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";
import { CounterpartyPreview } from "./_components/CounterpartyPreview";

const GROUPS: CounterpartyView["group"][] = ["all", "relationship", "work"];

function peopleOf(r: Counterparty) {
  const seen = new Map<string, ReturnType<typeof contractPeople>[number]>();
  for (const c of r.contracts) for (const p of contractPeople(c)) if (!seen.has(p.email.toLowerCase())) seen.set(p.email.toLowerCase(), p);
  return [...seen.values()];
}

const COLUMNS: DataTableColumn<Counterparty>[] = [
  { id: "name", header: "Counterparty", card: "title", className: "min-w-[14rem]", sortValue: (r) => r.name.toLowerCase(), cell: (r) => r.name },
  {
    id: "relationship", header: "Relationship", card: "status", sortValue: (r) => r.relationship,
    cell: (r) => <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium", r.relationship === "Vendor" ? "bg-[var(--ink-100)] text-[var(--ink-800)]" : "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]")}>{r.relationship}</span>,
  },
  { id: "contracts", header: "Agreements", numeric: true, sortFirst: "desc", sortValue: (r) => r.contracts.length, cell: (r) => r.contracts.length },
  {
    id: "open", header: "Open", numeric: true, sortFirst: "desc", sortValue: (r) => r.open,
    cell: (r) => r.overdue ? <span><span className="font-semibold text-foreground">{r.open}</span> <span className="text-xs font-medium text-[var(--danger)]">· {r.overdue} overdue</span></span> : r.open,
  },
  { id: "people", header: "Your people", priority: 2, cell: (r) => <AvatarStack people={peopleOf(r)} size="sm" emptyLabel="" /> },
  { id: "signed", header: "Signed value", numeric: true, sortFirst: "desc", priority: 2, sortValue: (r) => r.signed || null, cell: (r) => r.signed ? formatCompact(r.signed, r.currency) : "—" },
  { id: "pipeline", header: "Pipeline", numeric: true, sortFirst: "desc", priority: 2, sortValue: (r) => r.pipeline || null, cell: (r) => r.pipeline ? formatCompact(r.pipeline, r.currency) : "—" },
  { id: "last", header: "Last activity", numeric: true, sortFirst: "desc", priority: 3, sortValue: (r) => r.lastActivity, cell: (r) => new Date(r.lastActivity).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) },
];

export default function CounterpartiesPage() {
  return (
    <Suspense fallback={null}>
      <Counterparties />
    </Suspense>
  );
}

function Counterparties() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = counterpartyViewById(params.get("view"));
  const [now] = useState(() => Date.now());

  const { data, isLoading, isError, error, refetch } = useContracts(true);
  const contracts = useMemo(() => data?.contracts ?? [], [data]);
  const all = useMemo(() => buildCounterparties(contracts), [contracts]);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [openKey, setOpenKey] = useState<string | null>(null);

  const counts = useMemo(() => Object.fromEntries(COUNTERPARTY_VIEWS.map((v) => [v.id, all.filter((r) => v.test(r, now)).length])), [all, now]);
  const groups: PanelGroup[] = useMemo(() => GROUPS.map((g) => ({
    label: COUNTERPARTY_GROUP_LABEL[g],
    views: COUNTERPARTY_VIEWS.filter((v) => v.group === g).map((v) => ({ id: v.id, label: v.label, count: counts[v.id] ?? 0, hideWhenEmpty: v.hideWhenEmpty })),
  })), [counts]);
  const rows = useMemo(() => all.filter((r) => view.test(r, now) && (!query || r.name.toLowerCase().includes(query))), [all, view, now, query]);

  const hrefFor = useCallback((id: string) => `${pathname}?view=${id}`, [pathname]);
  const goToView = (id: string) => router.replace(`${pathname}?view=${id}`, { scroll: false });
  const open = openKey ? all.find((r) => r.key === openKey) ?? null : null;
  const close = useCallback(() => setOpenKey(null), []);

  const unnamed = contracts.filter((c) => !(c.counterparty || c.sponsor)).length;
  const kpis: Kpi[] = [
    { label: "Counterparties", value: String(all.length), sub: unnamed ? `${plural(unnamed, "contract")} name none` : "Every contract names one", href: hrefFor("all") },
    { label: "With open work", value: String(counts.open ?? 0), sub: plural(all.reduce((s, r) => s + r.open, 0), "open agreement"), href: hrefFor("open") },
    { label: "With overdue work", value: String(counts.overdue ?? 0), sub: "Past the step target", tone: counts.overdue ? "danger" : "neutral", href: hrefFor("overdue") },
    { label: "Sponsors and customers", value: String(counts.sponsors ?? 0), sub: `${counts.vendors ?? 0} vendors`, href: hrefFor("sponsors") },
  ];

  return (
    <RecordDashboard
      page="counterparties"
      label="Counterparty views"
      groups={groups}
      activeId={view.id}
      hrefFor={hrefFor}
      onSelectView={goToView}
      title={view.label}
      count={isLoading ? null : rows.length}
      description={view.description}
      aside={open && <CounterpartyPreview counterparty={open} onClose={close} />}
    >
      {!isLoading && !isError && all.length > 0 && <KpiStrip items={kpis} />}
      <DataTable
        caption={view.label}
        noun="counterparties"
        columns={COLUMNS}
        rows={rows}
        getRowId={(r) => r.key}
        getRowLabel={(r) => `Open the profile of ${r.name}`}
        onRowClick={(r) => setOpenKey(r.key)}
        activeRowId={openKey}
        defaultSort={{ columnId: "contracts", direction: "desc" }}
        pageSize={25}
        densityKey="counterparties-density"
        columnsKey="counterparties-table"
        state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
        onRetry={() => void refetch()}
        errorDetail={error instanceof Error ? error.message : undefined}
        isFiltered={!!query || (view.id !== "all" && all.length > 0)}
        onClearFilters={query ? () => setQ("") : () => goToView("all")}
        toolbar={
          <div className="relative w-full sm:w-64">
            <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
            <Input type="search" aria-label="Search counterparties" placeholder="Search counterparties" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-full pl-9 text-sm" />
          </div>
        }
        empty={
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
            <p className="text-base font-semibold text-foreground">No counterparties yet</p>
            <p className="max-w-md text-sm text-[var(--ink-600)]">They appear as contracts name the other party. Add the party on a contract&apos;s Details tab if Sonar couldn&apos;t read it.</p>
          </div>
        }
      />
    </RecordDashboard>
  );
}
