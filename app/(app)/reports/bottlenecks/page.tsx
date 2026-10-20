"use client";

// Bottleneck view (Requirement 3): every contract not yet signed, grouped by
// step and by who it is waiting on, with average days against the target,
// overdue and late counts, and a sortable list of every one with its next
// step. Filters are optional; plain-word search is enough.

import { byEdition } from "@/lib/edition-runtime";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { X } from "@/components/ui/icons";
import { BarMeter, ProgressMeter } from "@/components/ds";
import { prefersReducedMotion } from "@/lib/chart-theme";
import { contractsTable, describeFilters, type ExportReport } from "@/lib/govern/export";
import { STAGE_LABEL, WAITING_ON_SHORT, daysLabel, plural } from "@/lib/govern/labels";
import {
  NO_FILTERS, applyFilters, filterOptions, isFiltering, isUnsigned, stageQueues, waitingQueues,
  type ContractFilters, type StageQueue, type WaitingQueue,
} from "@/lib/govern/metrics";
import type { Stage } from "@/lib/govern/types";
import { useContracts } from "@/lib/govern/queries";
import { ExportButtons } from "../_components/ExportButtons";
import { SlaLegend, StageFlow, WaitingBars, stageTable, waitingTable } from "../_components/ReportCharts";
import {
  FilterBar, NoContracts, Panel, ReportError, StatTile, reviewerNameFrom,
} from "../_components/ReportKit";
import { useStageTargets } from "../_components/report-data";
import { useHashFocus, type ReportFocus } from "../_components/use-hash-focus";
import { OpenContractsTable, sortContracts, useContractSort } from "./_components/OpenContractsTable";
import { BottlenecksSkeleton } from "../_components/ReportSkeletons";

/** "Slowest: In review · 14 days avg vs a 10-day target" */
function stageTakeaway(stages: StageQueue[], targets: Partial<Record<Stage, number | null>>): string {
  const withWait = stages.filter((s) => s.averageDays !== null);
  if (withWait.length === 0) return "No contract is in a step right now.";
  const ratio = (s: StageQueue) => (targets[s.stage] ? (s.averageDays ?? 0) / (targets[s.stage] as number) : 0);
  const over = withWait.filter((s) => ratio(s) > 1).sort((a, b) => ratio(b) - ratio(a))[0];
  if (over) {
    return `Slowest: ${STAGE_LABEL[over.stage]} · ${daysLabel(Math.round(over.averageDays ?? 0))} avg vs a ${targets[over.stage]}-day target`;
  }
  const slowest = [...withWait].sort((a, b) => (b.averageDays ?? 0) - (a.averageDays ?? 0))[0];
  return `All steps on target · longest: ${STAGE_LABEL[slowest.stage]}, ${daysLabel(Math.round(slowest.averageDays ?? 0))}`;
}

/** "Most are waiting on the other side (9). The longest waits are with internal office (avg 18 days)." */
function waitingTakeaway(queues: WaitingQueue[]): string {
  if (queues.length === 0) return "Nothing is waiting on anyone.";
  const most = [...queues].sort((a, b) => b.count - a.count)[0];
  const slowest = [...queues].sort((a, b) => (b.averageDays ?? 0) - (a.averageDays ?? 0))[0];
  const first = `Most are waiting on ${most.label.toLowerCase()} (${most.count}).`;
  return slowest.kind === most.kind
    ? `${first} They also wait longest, ${daysLabel(Math.round(most.averageDays ?? 0))} on average.`
    : `${first} The longest waits are with ${slowest.label.toLowerCase()}, ${daysLabel(Math.round(slowest.averageDays ?? 0))} on average.`;
}

function focusLabel(f: NonNullable<ReportFocus>): string {
  return f.kind === "waiting" ? `Waiting on ${WAITING_ON_SHORT[f.value].toLowerCase()}` : `In "${STAGE_LABEL[f.value]}"`;
}

export default function BottlenecksPage() {
  const { data, isLoading, isError, error, refetch } = useContracts();
  const all = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const [focus, setFocus] = useHashFocus();
  const { sort, toggle } = useContractSort();

  const options = useMemo(() => filterOptions(all), [all]);
  // Typing stays instant; the list catches up a moment later on big sets.
  const deferredFilters = useDeferredValue(filters);
  const filtered = useMemo(() => applyFilters(all, deferredFilters), [all, deferredFilters]);
  const open = useMemo(() => filtered.filter(isUnsigned), [filtered]);
  const { targets, redAfter } = useStageTargets(all);

  const view = useMemo(() => {
    const listed = focus
      ? open.filter((c) => (focus.kind === "waiting" ? c.waitingOn.kind === focus.value : c.stage === focus.value))
      : open;
    const avgTotal = open.length ? Math.round(open.reduce((s, c) => s + c.totalDays, 0) / open.length) : null;
    return {
      listed,
      stages: stageQueues(open),
      waiting: waitingQueues(open),
      overdue: open.filter((c) => c.slaStatus === "red").length,
      late: open.filter((c) => c.slaStatus === "amber").length,
      avgTotal,
    };
  }, [open, focus]);

  // Opening the report on a queue (from the home view) or picking one here
  // brings the matching list into view.
  const focusKey = focus ? `${focus.kind}-${focus.value}` : "";
  useEffect(() => {
    if (!focusKey) return;
    document.getElementById("open-contracts")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [focusKey, isLoading]);

  const buildReport = (): ExportReport => ({
    title: "Where contracts are stuck",
    fileBase: "govern-bottlenecks",
    summary: [
      { label: "Waiting for signature", value: String(open.length) },
      { label: "Overdue", value: String(view.overdue) },
      { label: "Running late", value: String(view.late) },
      { label: "Average days so far", value: view.avgTotal === null ? "—" : String(view.avgTotal) },
    ],
    notes: [describeFilters(filters, reviewerNameFrom(options)), focus ? `Contract list narrowed to: ${focusLabel(focus)}.` : null]
      .filter((n): n is string => !!n),
    tables: [
      {
        name: "By step",
        columns: [
          { key: "stage", header: "Step", width: 26 },
          { key: "count", header: "Contracts", kind: "number" },
          { key: "averageDays", header: "Average days", kind: "number" },
          { key: "target", header: "Target days", kind: "number" },
          { key: "overdue", header: "Overdue", kind: "number" },
          { key: "late", header: "Running late", kind: "number" },
        ],
        rows: view.stages.map((s) => ({
          stage: STAGE_LABEL[s.stage], count: s.count, averageDays: s.averageDays, target: targets[s.stage] ?? null, overdue: s.overdue, late: s.late,
        })),
      },
      {
        name: "By who it is waiting on",
        columns: [
          { key: "label", header: "Waiting on", width: 22 },
          { key: "who", header: "Who exactly", width: 34 },
          { key: "count", header: "Contracts", kind: "number" },
          { key: "averageDays", header: "Average days", kind: "number" },
        ],
        rows: view.waiting.flatMap((q) => [
          { label: q.label, who: "All", count: q.count, averageDays: q.averageDays },
          ...q.who.map((w) => ({ label: q.label, who: w.label, count: w.count, averageDays: w.averageDays })),
        ]),
      },
      contractsTable("Open contracts", sortContracts(view.listed, sort.key, sort.dir)),
    ],
  });

  return (
    <>
      <PageHeader
        back={{ href: "/reports", label: "Reports" }}
        title="Bottlenecks"
        actions={<ExportButtons build={buildReport} disabled={!data || all.length === 0} />}
      />
      <div className="app-container app-page">
        {isLoading ? (
          <BottlenecksSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="the bottleneck report" />
        ) : all.length === 0 ? (
          <NoContracts />
        ) : (
          <>
            <FilterBar
              idPrefix="bottlenecks"
              filters={filters}
              onChange={setFilters}
              options={options}
              shown={open.length}
              total={all.filter(isUnsigned).length}
              noun="open contracts"
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Waiting for signature" value={open.length} />
              {/* On time is quiet: only overdue and late take a colour. */}
              <StatTile label="Overdue" value={view.overdue} tone={view.overdue > 0 ? "danger" : "neutral"} hint={view.overdue > 0 ? "Well past the step's target" : "None"} />
              <StatTile label="Running late" value={view.late} tone={view.late > 0 ? "warning" : "neutral"} hint="Past the step's target" />
              <StatTile label="Average days so far" value={view.avgTotal === null ? "—" : daysLabel(view.avgTotal)} hint="From arrival to today" />
            </div>
            {open.length > 0 && (
              <BarMeter
                label="Open contracts by time against their step's target"
                showKey
                segments={[
                  { key: "overdue", label: "Overdue", value: view.overdue, tone: "blocked" },
                  { key: "late", label: "Running late", value: view.late, tone: "caution" },
                  { key: "ontime", label: "On time", value: Math.max(0, open.length - view.overdue - view.late), tone: "unknown" },
                ]}
              />
            )}

            {open.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-10 text-center text-sm text-[var(--ink-600)]">
                {!isFiltering(filters) ? "Nothing is waiting for signature. Every contract is signed, rejected or closed." : "No open contract matches these filters."}
              </p>
            ) : (
              <>
                <Panel
                  id="stages"
                  title="Time by step"
                  sub={stageTakeaway(view.stages, targets)}
                  table={stageTable(view.stages, targets)}
                >
                  <StageFlow
                    queues={view.stages}
                    targets={targets}
                    redAfter={redAfter}
                    selected={focus?.kind === "stage" ? focus.value : null}
                    onSelect={(s) => setFocus(focus?.kind === "stage" && focus.value === s ? null : { kind: "stage", value: s })}
                  />
                </Panel>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <Panel
                    id="waiting"
                    className="lg:col-span-7"
                    title="Waiting on"
                    sub={waitingTakeaway(view.waiting)}
                    action={<SlaLegend />}
                    table={waitingTable(view.waiting, open)}
                  >
                    <WaitingBars
                      queues={view.waiting}
                      contracts={open}
                      selected={focus?.kind === "waiting" ? focus.value : null}
                      onSelect={(k) => setFocus(focus?.kind === "waiting" && focus.value === k ? null : { kind: "waiting", value: k })}
                    />
                  </Panel>
                  <Panel id="who" className="lg:col-span-5" title={byEdition("Holders: people, offices, sponsors", "Holders: people, offices, vendors")}>
                    <WhoList queues={view.waiting} />
                  </Panel>
                </div>

                <Panel
                  id="open-contracts"
                  title={focus ? focusLabel(focus) : "Open contracts"}
                  meta={plural(view.listed.length, "contract")}
                  bodyClassName="p-0"
                  action={focus && (
                    <button
                      type="button"
                      onClick={() => setFocus(null)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--brand-primary-600)] bg-card px-2.5 text-xs font-medium text-[var(--brand-primary-700)] hover:bg-[var(--brand-primary-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
                    >
                      Show all <X size={12} aria-hidden />
                    </button>
                  )}
                >
                  {view.listed.length === 0
                    ? <p className="px-4 py-6 text-center text-sm text-[var(--ink-600)]">No open contract is in this group.</p>
                    : <OpenContractsTable contracts={view.listed} sort={sort} onSort={toggle} />}
                </Panel>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function WhoList({ queues }: { queues: ReturnType<typeof waitingQueues> }) {
  const rows = queues.flatMap((q) => q.who.map((w) => ({ ...w, group: q.label, key: `${q.kind}-${w.label}` })))
    .sort((a, b) => b.count - a.count || b.averageDays - a.averageDays)
    .slice(0, 12);
  if (rows.length === 0) return <p className="text-sm text-[var(--ink-600)]">Nobody is holding a contract.</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline justify-between gap-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground" title={r.label}>{r.label}</span>
            <span className="block text-xs text-[var(--ink-600)]">{r.group}</span>
            {/* Who holds the most, at a glance: the bar is their share of the longest queue. */}
            <ProgressMeter className="mt-1.5 max-w-xs" size="sm" hideLabel label={`${r.label} holds ${r.count}`} value={r.count} max={rows[0].count} valueText={String(r.count)} tone="brand" />
          </span>
          <span className="shrink-0 text-right text-sm tabular-nums text-[var(--ink-600)]">
            <span className="font-semibold text-foreground">{r.count}</span> · avg {daysLabel(Math.round(r.averageDays))}
          </span>
        </li>
      ))}
    </ul>
  );
}
