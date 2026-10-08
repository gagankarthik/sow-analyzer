"use client";

// Counterparties: one row per organization you contract with, built from
// every contract that names it. Relationship comes from the money direction
// (money in: customer or sponsor; money out: vendor). Selecting one opens
// All contracts filtered to it.

import { useDeferredValue, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { FilterPill } from "@/components/ds/FilterPill";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import { plural } from "@/lib/govern/labels";
import { formatCompact, isCurrent, isUnsigned } from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";

type Relationship = "Customer or sponsor" | "Vendor" | "Both";

interface Counterparty {
  key: string
  name: string
  relationship: Relationship
  contracts: number
  open: number
  overdue: number
  signed: number
  pipeline: number
  currency: string | null
  lastActivity: string
}

function buildCounterparties(contracts: Contract[]): Counterparty[] {
  const map = new Map<string, Counterparty & { dirs: Set<string> }>();
  for (const c of contracts) {
    const name = (c.counterparty || c.sponsor || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const row = map.get(key) ?? {
      key, name, relationship: "Vendor" as Relationship, contracts: 0, open: 0, overdue: 0, signed: 0, pipeline: 0,
      currency: c.currency ?? null, lastActivity: c.updatedAt, dirs: new Set<string>(),
    };
    row.contracts += 1;
    row.dirs.add(c.direction);
    if (isUnsigned(c)) {
      row.open += 1;
      if (c.slaStatus === "red") row.overdue += 1;
    }
    // Sum only in the counterparty's first-seen currency: never mix currencies.
    if (c.value !== null && (c.currency ?? null) === row.currency) {
      if (isCurrent(c)) row.signed += c.value;
      else if (isUnsigned(c)) row.pipeline += c.value;
    }
    if (c.updatedAt > row.lastActivity) row.lastActivity = c.updatedAt;
    map.set(key, row);
  }
  return [...map.values()].map(({ dirs, ...r }) => ({
    ...r,
    relationship: dirs.has("incoming") && dirs.has("outgoing") ? "Both" : dirs.has("incoming") ? "Customer or sponsor" : "Vendor",
  }));
}

export default function CounterpartiesPage() {
  const { data, isLoading, isError, error, refetch } = useContracts(true);
  const contracts = useMemo(() => data?.contracts ?? [], [data]);
  const all = useMemo(() => buildCounterparties(contracts), [contracts]);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [rel, setRel] = useState<string[]>([]);

  const rows = useMemo(() => all.filter((r) => (!query || r.name.toLowerCase().includes(query)) && (rel.length === 0 || rel.includes(r.relationship))), [all, query, rel]);
  const filtering = !!query || rel.length > 0;

  const kpis: Kpi[] = [
    { label: "Counterparties", value: String(all.length), sub: plural(contracts.filter((c) => !(c.counterparty || c.sponsor)).length, "contract") + " name none", href: "/counterparties" },
    { label: "With open work", value: String(all.filter((r) => r.open > 0).length), sub: plural(all.reduce((s, r) => s + r.open, 0), "open contract"), href: "/contracts" },
    { label: "With overdue work", value: String(all.filter((r) => r.overdue > 0).length), sub: "Past the step target", tone: all.some((r) => r.overdue > 0) ? "danger" : "neutral", href: "/workflow" },
    { label: "Customers and sponsors", value: String(all.filter((r) => r.relationship !== "Vendor").length), sub: `${all.filter((r) => r.relationship !== "Customer or sponsor").length} vendors`, href: "/counterparties" },
  ];

  const columns: DataTableColumn<Counterparty>[] = [
    { id: "name", header: "Counterparty", card: "title", className: "min-w-[14rem]", sortValue: (r) => r.name.toLowerCase(), cell: (r) => r.name },
    {
      id: "relationship", header: "Relationship", card: "status", sortValue: (r) => r.relationship,
      cell: (r) => <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-medium", r.relationship === "Vendor" ? "bg-[var(--ink-100)] text-[var(--ink-800)]" : "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]")}>{r.relationship}</span>,
    },
    { id: "contracts", header: "Contracts", numeric: true, sortFirst: "desc", sortValue: (r) => r.contracts, cell: (r) => r.contracts },
    { id: "open", header: "Open", numeric: true, sortFirst: "desc", sortValue: (r) => r.open, cell: (r) => r.open },
    { id: "overdue", header: "Overdue", numeric: true, sortFirst: "desc", sortValue: (r) => r.overdue, cell: (r) => <span className={r.overdue ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-600)]"}>{r.overdue}</span> },
    { id: "signed", header: "Signed value", numeric: true, sortFirst: "desc", priority: 2, sortValue: (r) => r.signed || null, cell: (r) => r.signed ? formatCompact(r.signed, r.currency) : "—" },
    { id: "pipeline", header: "Pipeline", numeric: true, sortFirst: "desc", priority: 2, sortValue: (r) => r.pipeline || null, cell: (r) => r.pipeline ? formatCompact(r.pipeline, r.currency) : "—" },
    { id: "last", header: "Last activity", numeric: true, sortFirst: "desc", priority: 3, sortValue: (r) => r.lastActivity, cell: (r) => new Date(r.lastActivity).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) },
  ];

  return (
    <>
      <PageHeader title="Counterparties" subtitle="Everyone you contract with, one profile each across all their agreements." />
      <div className="app-container app-page">
        {!isLoading && !isError && all.length > 0 && <KpiStrip items={kpis} />}
        <DataTable
          caption="Counterparties"
          noun="counterparties"
          columns={columns}
          rows={rows}
          getRowId={(r) => r.key}
          getRowHref={(r) => `/contracts?q=${encodeURIComponent(r.name)}`}
          defaultSort={{ columnId: "contracts", direction: "desc" }}
          pageSize={25}
          densityKey="counterparties-density"
          columnsKey="counterparties-table"
          state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
          onRetry={() => void refetch()}
          errorDetail={error instanceof Error ? error.message : undefined}
          isFiltered={filtering}
          onClearFilters={() => { setQ(""); setRel([]); }}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
                <Input type="search" aria-label="Search counterparties" placeholder="Search counterparties" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-full pl-9 text-sm" />
              </div>
              <FilterPill label="Relationship" selected={rel} onChange={setRel}
                options={(["Customer or sponsor", "Vendor", "Both"] as Relationship[]).map((r) => ({ value: r, label: r, count: all.filter((x) => x.relationship === r).length })).filter((o) => o.count > 0)} />
            </div>
          }
          empty={
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
              <p className="text-base font-semibold text-foreground">No counterparties yet</p>
              <p className="max-w-md text-sm text-[var(--ink-600)]">They appear as contracts name the other party. Add the party on a contract&apos;s Details tab if Sonar couldn&apos;t read it.</p>
            </div>
          }
        />
      </div>
    </>
  );
}
