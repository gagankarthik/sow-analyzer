"use client";

// Data manager: the workspace's data model in one place. Agreement types are
// the categories every contract is filed under (each with its own matrix);
// properties are the facts Govern keeps on every contract. Each row shows
// where it is used across your contracts; click one for its details.

import { SearchField } from "@/components/ds/inputs";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { ProgressMeter } from "@/components/ds/Meter";
import { X } from "@/components/ui/icons";
import { SettingsLayout } from "@/components/settings/SettingsNav";
import { agreementTypeRows, propertyUsage, type AgreementTypeRow, type PropertyUsage } from "@/lib/govern/data-model";
import { plural } from "@/lib/govern/labels";
import { useContracts, useMatrix } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";

type Tab = "types" | "properties";

export default function DataManagerPage() {
  const [tab, setTab] = useState<Tab>("types");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const contracts = useContracts(true);
  const matrix = useMatrix();
  const all = useMemo(() => contracts.data?.contracts ?? [], [contracts.data]);
  const query = q.trim().toLowerCase();

  const types = useMemo(() => agreementTypeRows(all, matrix.data?.current), [all, matrix.data]);
  const props = useMemo(() => propertyUsage(all), [all]);
  const typeRows = types.filter((t) => !query || `${t.label} ${t.key} ${t.description}`.toLowerCase().includes(query));
  const propRows = props.filter((p) => !query || `${p.def.label} ${p.def.key} ${p.def.description}`.toLowerCase().includes(query));
  const state = contracts.isLoading ? "loading" : contracts.isError && !contracts.data ? "error" : "ready";

  const typeColumns: DataTableColumn<AgreementTypeRow>[] = [
    { id: "label", header: "Display name", card: "title", sortValue: (t) => t.label, cell: (t) => t.label },
    { id: "key", header: "Key", priority: 2, cell: (t) => <code className="text-xs text-[var(--ink-600)]">{t.key}</code> },
    { id: "description", header: "Description", priority: 2, className: "max-w-[24rem]", cell: (t) => <span className="line-clamp-2 text-sm text-[var(--ink-700)]">{t.description}</span> },
    { id: "matrix", header: "Matrix clauses", numeric: true, sortValue: (t) => t.matrixClauses, cell: (t) => t.matrixClauses || <span className="text-[var(--ink-500)]">None</span> },
    { id: "usage", header: "Contracts", numeric: true, sortFirst: "desc", sortValue: (t) => t.contracts, cell: (t) => t.contracts.toLocaleString() },
  ];
  const propColumns: DataTableColumn<PropertyUsage>[] = [
    { id: "label", header: "Display name", card: "title", sortValue: (p) => p.def.label, cell: (p) => p.def.label },
    { id: "type", header: "Type", card: "status", sortValue: (p) => p.def.type, cell: (p) => <span className="inline-flex h-6 items-center rounded-md bg-[var(--ink-100)] px-2 text-xs font-medium text-[var(--ink-800)]">{p.def.type}</span> },
    { id: "key", header: "Key", priority: 3, cell: (p) => <code className="text-xs text-[var(--ink-600)]">{p.def.key}</code> },
    { id: "source", header: "Filled by", priority: 2, sortValue: (p) => p.def.source, cell: (p) => p.def.source },
    {
      id: "usage", header: "Captured", numeric: true, sortFirst: "desc", sortValue: (p) => (p.total ? p.filled / p.total : null),
      cell: (p) => <Captured filled={p.filled} total={p.total} />,
    },
  ];

  const openType = tab === "types" ? types.find((t) => t.id === openId) ?? null : null;
  const openProp = tab === "properties" ? props.find((p) => p.def.key === openId) ?? null : null;

  return (
    <>
      <PageHeader
        title="Data manager"
        subtitle="The agreement types and properties every contract is described with, and where each is used."
        back={{ href: "/settings", label: "Settings" }}
      />
      <SettingsLayout>
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Data" className="inline-flex h-9 items-center rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
            {([["types", `Agreement types`], ["properties", `Properties`]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setOpenId(null); }}
                className={cn("h-full rounded-md px-3 text-sm font-medium", tab === id ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-[var(--ink-600)] hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
          <SearchField label="Search by name" hideLabel placeholder="Search by name" value={q} onChange={setQ} className="sm:w-64" />
        </div>

        <div className={cn("grid grid-cols-1 gap-6", (openType || openProp) && "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
          {tab === "types" ? (
            <DataTable caption="Agreement types" noun="agreement types" columns={typeColumns} rows={typeRows} getRowId={(t) => t.id}
              onRowClick={(t) => setOpenId(t.id)} activeRowId={openId} state={state} onRetry={() => void contracts.refetch()}
              isFiltered={!!query} onClearFilters={() => setQ("")} />
          ) : (
            <DataTable caption="Properties" noun="properties" columns={propColumns} rows={propRows} getRowId={(p) => p.def.key}
              onRowClick={(p) => setOpenId(p.def.key)} activeRowId={openId} state={state} onRetry={() => void contracts.refetch()}
              isFiltered={!!query} onClearFilters={() => setQ("")} />
          )}

          {openType && (
            <DetailPanel title={openType.label} onClose={() => setOpenId(null)}>
              <Fact label="Description" value={openType.description} />
              <Fact label="Key" value={<code className="text-xs">{openType.key}</code>} />
              <Fact label="Usage" value={`${plural(openType.contracts, "contract")}, ${openType.open} in progress`} />
              <Fact label="Review matrix" value={openType.matrixClauses ? `${plural(openType.matrixClauses, "clause position")} in the current matrix` : "No positions yet"} />
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
                <Link href={`/contracts?view=all&type=${openType.id}`} className="font-medium text-[var(--brand-primary-700)] hover:underline">See contracts</Link>
                <Link href="/settings/matrix" className="font-medium text-[var(--brand-primary-700)] hover:underline">Edit its matrix</Link>
              </div>
            </DetailPanel>
          )}
          {openProp && (
            <DetailPanel title={openProp.def.label} onClose={() => setOpenId(null)}>
              <Fact label="Description" value={openProp.def.description} />
              <Fact label="Type" value={openProp.def.type} />
              <Fact label="Filled by" value={openProp.def.source} />
              <Fact label="Captured" value={<Captured filled={openProp.filled} total={openProp.total} wide />} />
              <Fact label="Unique values" value={openProp.unique.toLocaleString()} />
              <Fact label="Example" value={openProp.example ?? "No value yet"} />
              <Fact label="Key" value={<code className="text-xs">{openProp.def.key}</code>} />
              {openProp.filled < openProp.total && (
                <Link href="/contracts?view=gaps" className="border-t border-border pt-4 text-sm font-medium text-[var(--brand-primary-700)] hover:underline">See contracts with missing details</Link>
              )}
            </DetailPanel>
          )}
        </div>
      </SettingsLayout>
    </>
  );
}

function Captured({ filled, total, wide = false }: { filled: number; total: number; wide?: boolean }) {
  if (total === 0) return <span className="text-[var(--ink-500)]">No contracts yet</span>;
  const pct = Math.round((filled / total) * 100);
  return (
    <ProgressMeter
      label="Captured on contracts"
      hideLabel={!wide}
      value={filled}
      max={total}
      valueText={`${filled.toLocaleString()} of ${total.toLocaleString()}`}
      tone={pct >= 90 ? "success" : pct >= 50 ? "brand" : "warning"}
      className={wide ? "w-full" : "ms-auto w-24"}
    />
  );
}

function DetailPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside aria-label={`Details: ${title}`} className="h-fit rounded-xl border border-border bg-card p-5 shadow-xs xl:sticky xl:top-20">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close details" className="-me-2 -mt-1 inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-[var(--ink-100)] hover:text-foreground">
          <X size={16} aria-hidden />
        </button>
      </div>
      <dl className="mt-4 flex flex-col gap-4">{children}</dl>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--ink-600)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
