"use client";

// All contracts: the repository. Every agreement in one table you can search,
// filter by stage, type, owner, who it waits on and risk, sort by any column,
// and act on in bulk (assign a reviewer). The board (Workflow) is the same
// data by stage; this is the same data as records.

import { Suspense, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { FilterPill, optionsFrom } from "@/components/ds/FilterPill";
import { DaysInStage, PersonDot, WaitingOnChip } from "@/components/govern/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileSignature, Plus, Search, UserRound } from "@/components/ui/icons";
import { RISK_LABEL } from "@/lib/chart-theme";
import { AGREEMENT_TYPE_LABEL, STAGE_LABEL, STAGES, WAITING_ON_SHORT, plural } from "@/lib/govern/labels";
import { contractValueText, formatCompact, isUnsigned, valueSummary } from "@/lib/govern/metrics";
import { useAnyContractAction, useContracts, useWorkflowSettings } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ContractsPage() {
  return (
    <Suspense fallback={null}>
      <Contracts />
    </Suspense>
  );
}

function Contracts() {
  const params = useSearchParams();
  const [includeClosed, setIncludeClosed] = useState(false);
  const { data, isLoading, isError, error, refetch } = useContracts(includeClosed);
  const all = useMemo(() => data?.contracts ?? [], [data]);

  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [stage, setStage] = useState<string[]>([]);
  const [type, setType] = useState<string[]>([]);
  const [owner, setOwner] = useState<string[]>([]);
  const [waiting, setWaiting] = useState<string[]>([]);
  const [risk, setRisk] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ownerKey = (c: Contract) => c.owner?.email?.toLowerCase() ?? "unassigned";
  const rows = useMemo(() => all.filter((c) =>
    (!query || [c.title, c.counterparty, c.sponsor, c.piName, c.department, c.owner?.name].some((s) => s?.toLowerCase().includes(query)))
    && (stage.length === 0 || stage.includes(c.stage))
    && (type.length === 0 || type.includes(c.agreementType))
    && (owner.length === 0 || owner.includes(ownerKey(c)))
    && (waiting.length === 0 || waiting.includes(c.waitingOn.kind))
    && (risk.length === 0 || risk.includes(c.overallRisk ?? "none")),
  ), [all, query, stage, type, owner, waiting, risk]);
  const filtering = !!query || stage.length + type.length + owner.length + waiting.length + risk.length > 0;
  const clearAll = () => { setQ(""); setStage([]); setType([]); setOwner([]); setWaiting([]); setRisk([]); };

  const kpis: Kpi[] = useMemo(() => {
    const open = all.filter(isUnsigned);
    const overdue = open.filter((c) => c.slaStatus === "red").length;
    const sum = valueSummary(all);
    const top = [...sum.potential.totals, ...sum.current.totals].sort((a, b) => b.amount - a.amount)[0]?.currency ?? null;
    const amt = (m: typeof sum.current) => m.totals.find((t) => t.currency === (top ?? ""))?.amount ?? 0;
    return [
      { label: "Open", value: String(open.length), sub: plural(open.filter((c) => !c.owner).length, "unassigned contract"), href: "/workflow" },
      { label: "Overdue", value: String(overdue), sub: overdue ? "Past the step target" : "Nothing overdue", tone: overdue ? "danger" : "neutral", href: "/workflow" },
      { label: "Signed and active", value: formatCompact(amt(sum.current), top), sub: plural(sum.current.valued, "contract"), href: "/reports/value" },
      { label: "Pipeline", value: formatCompact(amt(sum.potential), top), sub: amt(sum.heldUp) > 0 ? `${formatCompact(amt(sum.heldUp), top)} held up` : "Nothing held up", tone: amt(sum.heldUp) > 0 ? "warning" : "neutral", href: "/reports/value" },
    ];
  }, [all]);

  const columns: DataTableColumn<Contract>[] = [
    {
      id: "title", header: "Contract", card: "title", className: "min-w-[16rem] max-w-[26rem]",
      sortValue: (c) => c.title.toLowerCase(),
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate" title={c.title}>{c.title || "Untitled agreement"}</span>
          {(c.counterparty || c.sponsor) && <span className="truncate text-xs font-normal text-[var(--ink-600)]">{c.counterparty || c.sponsor}</span>}
        </span>
      ),
    },
    {
      id: "stage", header: "Stage", card: "status",
      sortValue: (c) => STAGES.indexOf(c.stage),
      cell: (c) => <span className="inline-flex h-6 items-center whitespace-nowrap rounded-md bg-[var(--ink-100)] px-2 text-xs font-medium text-[var(--ink-800)]">{STAGE_LABEL[c.stage]}</span>,
    },
    { id: "waiting", header: "Waiting on", card: "status", cell: (c) => <WaitingOnChip waitingOn={c.waitingOn} />, sortValue: (c) => c.waitingOn.kind },
    {
      id: "owner", header: "Owner", priority: 2,
      sortValue: (c) => c.owner?.name?.toLowerCase() ?? c.owner?.email ?? null,
      cell: (c) => c.owner
        ? <span className="flex items-center gap-2"><PersonDot name={c.owner.name} email={c.owner.email} className="size-6" /><span className="truncate">{c.owner.name || c.owner.email}</span></span>
        : <span className="text-[var(--warning-fg)]">Unassigned</span>,
    },
    { id: "days", header: "In step", numeric: true, sortFirst: "desc", sortValue: (c) => c.daysInStage, cell: (c) => <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} /> },
    { id: "value", header: "Value", numeric: true, sortFirst: "desc", sortValue: (c) => c.value, cell: (c) => contractValueText(c) },
    { id: "type", header: "Type", priority: 2, sortValue: (c) => AGREEMENT_TYPE_LABEL[c.agreementType], cell: (c) => AGREEMENT_TYPE_LABEL[c.agreementType] },
    {
      id: "risk", header: "Risk", priority: 3,
      sortValue: (c) => (c.overallRisk ? RISK_ORDER[c.overallRisk] : null),
      cell: (c) => c.overallRisk ? (
        <span className={cn("text-sm font-medium", c.overallRisk === "critical" ? "text-[var(--danger)]" : c.overallRisk === "high" ? "text-[var(--warning-fg)]" : "text-[var(--ink-700)]")}>
          {RISK_LABEL[c.overallRisk]}
        </span>
      ) : <span className="text-[var(--ink-500)]">Not assessed</span>,
    },
    { id: "updated", header: "Updated", priority: 3, numeric: true, sortFirst: "desc", sortValue: (c) => c.updatedAt, cell: (c) => new Date(c.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
        <Input type="search" aria-label="Search contracts" placeholder="Search contracts" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-full pl-9 text-sm" />
      </div>
      <FilterPill label="Stage" selected={stage} onChange={setStage} options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], count: all.filter((c) => c.stage === s).length })).filter((o) => o.count > 0)} />
      <FilterPill label="Type" selected={type} onChange={setType} options={optionsFrom(all, (c) => c.agreementType, (v) => AGREEMENT_TYPE_LABEL[v as Contract["agreementType"]] ?? v)} />
      <FilterPill label="Owner" selected={owner} onChange={setOwner} options={optionsFrom(all, ownerKey, (v) => v === "unassigned" ? "Unassigned" : all.find((c) => ownerKey(c) === v)?.owner?.name || v)} />
      <FilterPill label="Waiting on" selected={waiting} onChange={setWaiting} options={optionsFrom(all, (c) => c.waitingOn.kind, (v) => WAITING_ON_SHORT[v as Contract["waitingOn"]["kind"]] ?? v)} />
      <FilterPill label="Risk" selected={risk} onChange={setRisk} options={optionsFrom(all, (c) => c.overallRisk ?? "none", (v) => v === "none" ? "Not assessed" : RISK_LABEL[v as RiskLevel])} />
      {filtering && <button type="button" onClick={clearAll} className="h-9 rounded-full px-2 text-sm font-medium text-[var(--brand-primary-700)] hover:underline">Clear all</button>}
      <div role="radiogroup" aria-label="Contracts to show" className="ms-auto inline-flex h-9 items-center rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
        {([[false, "Open"], [true, "All"]] as const).map(([v, l]) => (
          <button key={l} type="button" role="radio" aria-checked={includeClosed === v} onClick={() => setIncludeClosed(v)}
            className={cn("h-full rounded-md px-3 text-sm font-medium", includeClosed === v ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-[var(--ink-600)] hover:text-foreground")}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Contracts"
        subtitle="Every agreement in one place. Search, filter, sort and act on many at once."
        actions={
          <>
            <Button asChild variant="outline" size="lg" className="md:h-9"><Link href="/draft"><FileSignature size={15} />Draft an SOW</Link></Button>
            <Button asChild size="lg" className="md:h-9"><Link href="/projects/upload"><Plus size={15} strokeWidth={2.25} />New agreement</Link></Button>
          </>
        }
      />
      <div className="app-container app-page">
        {!isLoading && !isError && all.length > 0 && <KpiStrip items={kpis} />}
        <DataTable
          caption="All contracts"
          noun="contracts"
          columns={columns}
          rows={rows}
          getRowId={(c) => c.contractId}
          getRowHref={(c) => `/contracts/${encodeURIComponent(c.contractId)}`}
          defaultSort={{ columnId: "days", direction: "desc" }}
          pageSize={25}
          densityKey="contracts-table-density"
          columnsKey="contracts-table"
          toolbar={toolbar}
          state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
          onRetry={() => void refetch()}
          errorDetail={error instanceof Error ? error.message : undefined}
          isFiltered={filtering}
          onClearFilters={clearAll}
          selection={{ selected, onChange: setSelected }}
          bulkActions={(chosen) => <BulkAssign contracts={chosen} onDone={() => setSelected(new Set())} />}
          empty={
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
              <p className="text-base font-semibold text-foreground">No contracts yet</p>
              <p className="max-w-md text-sm text-[var(--ink-600)]">Upload an agreement or draft an SOW. Sonar reads it, checks it against your matrix and lists it here.</p>
              <Button asChild><Link href="/projects/upload">Upload an agreement</Link></Button>
            </div>
          }
        />
      </div>
    </>
  );
}

/** Assign every selected open contract to one reviewer from the directory. */
function BulkAssign({ contracts, onDone }: { contracts: Contract[]; onDone: () => void }) {
  const settings = useWorkflowSettings();
  const act = useAnyContractAction();
  const [busy, setBusy] = useState(false);
  const reviewers = settings.data?.reviewers ?? [];
  const open = contracts.filter(isUnsigned);

  const assign = async (email: string, name: string) => {
    setBusy(true);
    const results = await Promise.allSettled(open.map((c) => act.mutateAsync({ id: c.contractId, action: { action: "assign", owner: { email, name } } })));
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) toast.error(`${plural(open.length - failed, "contract")} assigned, ${failed} failed`, { description: "Try the failed ones again from their contract page." });
    else toast.success(`${plural(open.length, "contract")} assigned to ${name}`);
    onDone();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={busy || open.length === 0}>
          <UserRound size={14} />{busy ? "Assigning…" : "Assign reviewer"}<ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{open.length < contracts.length ? `${plural(open.length, "open contract")} of ${contracts.length} selected` : `Assign ${plural(open.length, "contract")} to`}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {reviewers.length === 0 ? (
          <DropdownMenuItem asChild><Link href="/settings/workflow#reviewers">Add reviewers first</Link></DropdownMenuItem>
        ) : reviewers.map((r) => (
          <DropdownMenuItem key={r.email} onSelect={() => void assign(r.email, r.name)}>
            <span className="flex min-w-0 flex-col"><span className="truncate">{r.name}</span><span className="truncate text-xs text-[var(--ink-600)]">{r.email}</span></span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
