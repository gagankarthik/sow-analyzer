"use client";

// Contracts: the one dashboard for every agreement, in progress and signed.
// Views down the left (saved filters with live counts), filter pills and
// search over the table, a preview panel on row click, and a floating bar
// for bulk actions. Each view is a URL, so it can be bookmarked and shared.

import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EditionOnly } from "@/components/govern/EditionOnly";
import { DataTable } from "@/components/ds/DataTable";
import { FilterPill, optionsFrom } from "@/components/ds/FilterPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSignature, Plus, Search } from "@/components/ui/icons";
import { RISK_LABEL } from "@/lib/chart-theme";
import { AGREEMENT_TYPE_LABEL, STAGE_LABEL, STAGES, WAITING_ON_SHORT } from "@/lib/govern/labels";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { CONTRACT_VIEWS, VIEW_GROUP_LABEL, viewById, type ViewGroup } from "@/lib/govern/views";
import type { Contract } from "@/lib/govern/types";
import type { RiskLevel } from "@/lib/types";
import { BulkActions } from "./_components/BulkActions";
import { CONTRACT_COLUMNS } from "./_components/columns";
import { ContractPreview } from "./_components/ContractPreview";
import { type PanelGroup } from "@/components/govern/ViewsPanel";
import { RecordDashboard } from "@/components/govern/RecordDashboard";

const GROUPS: ViewGroup[] = ["all", "workflows", "signed"];

export default function ContractsPage() {
  return (
    <Suspense fallback={null}>
      <Contracts />
    </Suspense>
  );
}

function Contracts() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = viewById(params.get("view"));

  const { data, isLoading, isError, error, refetch } = useContracts(true);
  const all = useMemo(() => data?.contracts ?? [], [data]);
  const me = useGovernMe().data?.email?.toLowerCase() ?? null;
  const [now] = useState(() => Date.now());

  const counts = useMemo(() => {
    const ctx = { me, now };
    return Object.fromEntries(CONTRACT_VIEWS.map((v) => [v.id, all.filter((c) => v.test(c, ctx)).length]));
  }, [all, me, now]);
  const inView = useMemo(() => all.filter((c) => view.test(c, { me, now })), [all, view, me, now]);

  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [stage, setStage] = useState<string[]>([]);
  const [type, setType] = useState<string[]>(() => (params.get("type") ? [params.get("type") as string] : []));
  const [people, setPeople] = useState<string[]>([]);
  const [turn, setTurn] = useState<string[]>([]);
  const [risk, setRisk] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const ownerKey = (c: Contract) => c.owner?.email?.toLowerCase() ?? "unassigned";
  const rows = useMemo(() => inView.filter((c) =>
    (!query || [c.title, c.counterparty, c.sponsor, c.piName, c.department, c.owner?.name, c.huronRecordId].some((s) => s?.toLowerCase().includes(query)))
    && (stage.length === 0 || stage.includes(c.stage))
    && (type.length === 0 || type.includes(c.agreementType))
    && (people.length === 0 || people.includes(ownerKey(c)))
    && (turn.length === 0 || turn.includes(c.waitingOn.kind))
    && (risk.length === 0 || risk.includes(c.overallRisk ?? "none")),
  ), [inView, query, stage, type, people, turn, risk]);
  const filtering = !!query || stage.length + type.length + people.length + turn.length + risk.length > 0;
  const clearAll = () => { setQ(""); setStage([]); setType([]); setPeople([]); setTurn([]); setRisk([]); };

  const hrefFor = useCallback((id: string) => `${pathname}?view=${id}`, [pathname]);
  const groups: PanelGroup[] = useMemo(() => GROUPS.map((g) => ({
    label: VIEW_GROUP_LABEL[g],
    views: CONTRACT_VIEWS.filter((v) => v.group === g).map((v) => ({ id: v.id, label: v.label, count: counts[v.id] ?? 0, hideWhenEmpty: v.hideWhenEmpty })),
  })), [counts]);
  const goToView = (id: string) => { setSelected(new Set()); router.replace(`${pathname}?view=${id}`, { scroll: false }); };

  const preview = previewId ? all.find((c) => c.contractId === previewId) ?? null : null;
  const closePreview = useCallback(() => setPreviewId(null), []);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-60">
        <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
        <Input type="search" aria-label={`Search ${view.label.toLowerCase()}`} placeholder="Search this view" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-full pl-9 text-sm" />
      </div>
      <FilterPill label="Stage" selected={stage} onChange={setStage} options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], count: inView.filter((c) => c.stage === s).length })).filter((o) => o.count > 0)} />
      <FilterPill label="Type" selected={type} onChange={setType} options={optionsFrom(inView, (c) => c.agreementType, (v) => AGREEMENT_TYPE_LABEL[v as Contract["agreementType"]] ?? v)} />
      <FilterPill label="People" selected={people} onChange={setPeople} options={optionsFrom(inView, ownerKey, (v) => v === "unassigned" ? "Unassigned" : inView.find((c) => ownerKey(c) === v)?.owner?.name || v)} />
      <FilterPill label="Turn" selected={turn} onChange={setTurn} options={optionsFrom(inView, (c) => c.waitingOn.kind, (v) => WAITING_ON_SHORT[v as Contract["waitingOn"]["kind"]] ?? v)} />
      <FilterPill label="Risk" selected={risk} onChange={setRisk} options={optionsFrom(inView, (c) => c.overallRisk ?? "none", (v) => v === "none" ? "Not assessed" : RISK_LABEL[v as RiskLevel])} />
      {filtering && <button type="button" onClick={clearAll} className="h-9 rounded-full px-2 text-sm font-medium text-[var(--brand-primary-700)] hover:underline">Clear all</button>}
    </div>
  );

  return (
    <RecordDashboard
      page="contracts"
      label="Contract views"
      groups={groups}
      activeId={view.id}
      hrefFor={hrefFor}
      onSelectView={goToView}
      title={view.label}
      count={isLoading ? null : rows.length}
      description={view.description}
      actions={
        <>
          <EditionOnly feature="sowDrafting"><Button asChild variant="outline" size="lg" className="md:h-9"><Link href="/draft"><FileSignature size={15} />Draft an SOW</Link></Button></EditionOnly>
          <Button asChild size="lg" className="md:h-9"><Link href="/projects/upload"><Plus size={15} strokeWidth={2.25} />New agreement</Link></Button>
        </>
      }
      aside={preview && <ContractPreview contract={preview} me={me} onClose={closePreview} />}
    >
          <DataTable
            caption={view.label}
            noun="contracts"
            columns={CONTRACT_COLUMNS}
            rows={rows}
            getRowId={(c) => c.contractId}
            getRowLabel={(c) => `Preview ${c.title || "Untitled agreement"}`}
            onRowClick={(c) => setPreviewId(c.contractId)}
            activeRowId={previewId}
            defaultSort={{ columnId: "days", direction: "desc" }}
            pageSize={25}
            densityKey="contracts-table-density"
            columnsKey="contracts-table"
            toolbar={toolbar}
            state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
            onRetry={() => void refetch()}
            errorDetail={error instanceof Error ? error.message : undefined}
            isFiltered={filtering || (view.id !== "all" && all.length > 0)}
            onClearFilters={filtering ? clearAll : () => goToView("all")}
            selection={{ selected, onChange: setSelected }}
            bulkActions={(chosen) => <BulkActions contracts={chosen} viewLabel={view.label} onDone={() => setSelected(new Set())} />}
            empty={
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
                <p className="text-base font-semibold text-foreground">No contracts yet</p>
                <p className="max-w-md text-sm text-[var(--ink-600)]">Upload an agreement. Sonar reads it, checks it against your matrix and lists it here.</p>
                <Button asChild><Link href="/projects/upload">Upload an agreement</Link></Button>
              </div>
            }
          />
    </RecordDashboard>
  );
}
