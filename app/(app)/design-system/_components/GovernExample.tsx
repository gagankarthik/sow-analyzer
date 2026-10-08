"use client";

// A realistic Govern composition built only from components/ds, on example
// data: answer first (KPIs), then the breakdown (charts with takeaways),
// then the detail (a filterable, sortable, grouped table).

import * as React from "react";
import {
  Avatar,
  BarMeter,
  Button,
  Callout,
  DataTable,
  DateCell,
  FilterBar,
  FilterChips,
  KpiTile,
  OutcomeBadge,
  SearchField,
  StatusPill,
  Value,
  formatValue,
  useDebouncedValue,
  type DataTableColumn,
} from "@/components/ds";
import { BarChart, ChartCard, Sparkline } from "@/components/ds/charts";
import { Download, MoreHorizontal } from "@/components/ui/icons";
import {
  AGREEMENT_TYPE_LABEL,
  OFFICE_LABEL,
  SLA_LABEL,
  STAGE_LABEL,
  WAITING_ON_SHORT,
  daysLabel,
  personName,
} from "@/lib/govern/labels";
import type { SlaStatus, Stage } from "@/lib/govern/types";
import { Chapter, ExampleDataLabel } from "./Specimen";
import { EXAMPLE_NOW, makeExampleContracts, type ExampleContract } from "./example-data";

const SLA_TONE: Record<SlaStatus, "unknown" | "caution" | "blocked"> = {
  on_track: "unknown",
  amber: "caution",
  red: "blocked",
  none: "unknown",
};
const STAGE_ORDER: Stage[] = ["draft", "review", "negotiation", "approval", "signed", "active", "renewal", "expired"];
const ROWS = makeExampleContracts(240);

const COLUMNS: DataTableColumn<ExampleContract>[] = [
  {
    id: "title",
    header: "Agreement",
    card: "title",
    sortValue: (r) => r.title,
    truncate: (r) => `${r.title} · ${r.counterparty}`,
    className: "min-w-[16rem]",
    cell: (r) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{r.title}</span>
        <span className="truncate text-caption font-normal text-fg-tertiary">{r.counterparty}</span>
      </span>
    ),
  },
  {
    id: "waiting",
    header: "Waiting on",
    card: "status",
    sortValue: (r) => WAITING_ON_SHORT[r.waitingOn],
    cell: (r) => (
      <StatusPill tone={r.waitingOn === "counterparty" ? "unknown" : r.waitingOn === "nobody" ? "unknown" : "brand"} size="sm">
        {WAITING_ON_SHORT[r.waitingOn]}
      </StatusPill>
    ),
  },
  {
    id: "days",
    header: "Days in stage",
    numeric: true,
    card: "status",
    sortValue: (r) => r.daysInStage,
    cell: (r) => (
      <StatusPill tone={SLA_TONE[r.sla]} size="sm" srSuffix={r.sla === "amber" || r.sla === "red" ? `, ${SLA_LABEL[r.sla]}` : undefined}>
        {daysLabel(r.daysInStage)}
      </StatusPill>
    ),
  },
  {
    id: "value",
    header: "Value",
    numeric: true,
    sortValue: (r) => r.value,
    cell: (r) => <Value value={r.value} kind="currency" currency="USD" unknownLabel="No value yet" />,
  },
  {
    id: "tier",
    header: "Worst clause",
    priority: 2,
    sortValue: (r) => ["unacceptable", "deviates", "missing", "review", "fallback", "within"].indexOf(r.worstTier),
    cell: (r) => <OutcomeBadge outcome={r.worstTier} size="sm" />,
  },
  {
    id: "owner",
    header: "Owner",
    priority: 2,
    sortValue: (r) => (r.owner ? personName(r.owner) : null),
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        <Avatar name={r.owner?.name} email={r.owner?.email} size="xs" decorative />
        <span className="truncate">{r.owner ? personName(r.owner) : "Unassigned"}</span>
      </span>
    ),
  },
  {
    id: "type",
    header: "Type",
    priority: 3,
    sortValue: (r) => AGREEMENT_TYPE_LABEL[r.agreementType],
  },
  {
    id: "updated",
    header: "Last activity",
    priority: 3,
    numeric: true,
    sortValue: (r) => r.updatedAt,
    cell: (r) => <DateCell value={r.updatedAt} now={EXAMPLE_NOW} />,
  },
];

export function GovernExample() {
  const [query, setQuery] = React.useState("");
  const [waiting, setWaiting] = React.useState<"all" | "osu" | "external">("all");
  const [grouped, setGrouped] = React.useState(false);
  const [simulate, setSimulate] = React.useState<"ready" | "loading" | "error" | "empty">("ready");
  const debounced = useDebouncedValue(query, 200);

  const open = React.useMemo(() => ROWS.filter((r) => r.stage !== "signed" && r.stage !== "active"), []);
  const filtered = React.useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return open.filter((r) => {
      if (waiting === "osu" && (r.waitingOn === "counterparty" || r.waitingOn === "nobody")) return false;
      if (waiting === "external" && r.waitingOn !== "counterparty") return false;
      if (!q) return true;
      return `${r.title} ${r.counterparty} ${r.ref}`.toLowerCase().includes(q);
    });
  }, [open, debounced, waiting]);

  const waitingOnOsu = open.filter((r) => r.waitingOn !== "counterparty" && r.waitingOn !== "nobody");
  const overdue = open.filter((r) => r.sla === "red");
  const known = open.filter((r) => r.value !== null);
  const heldUp = known.filter((r) => r.sla === "red" || r.sla === "amber").reduce((s, r) => s + (r.value ?? 0), 0);
  const noValue = open.length - known.length;

  const byOffice = React.useMemo(() => {
    const offices = Object.keys(OFFICE_LABEL) as (keyof typeof OFFICE_LABEL)[];
    return offices
      .map((o, i) => ({ office: OFFICE_LABEL[o], waiting: Math.max(0, Math.round(waitingOnOsu.length / (i + 1.6)) - i) }))
      .sort((a, b) => b.waiting - a.waiting);
  }, [waitingOnOsu.length]);
  const top = byOffice[0];
  const officeTotal = byOffice.reduce((s, o) => s + o.waiting, 0);

  const isFiltered = query !== "" || waiting !== "all";
  const rows = simulate === "empty" ? [] : filtered;

  return (
    <Chapter
      id="gov-example"
      title="Govern example"
      intro="A leader's view assembled only from components/ds: the answer first, then the breakdown, then the detail. Every figure here is example data."
    >
      <div className="flex flex-wrap items-center gap-3">
        <ExampleDataLabel />
        <span className="text-caption text-fg-tertiary">240 generated agreements; nothing here comes from a real university.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Waiting on OSU" value={waitingOnOsu.length} emphasis="hero" delta={{ value: -0.09, goodWhen: "down", period: "vs last month" }} href="#gov-table" />
        <KpiTile label="Past target" value={overdue.length} tone="blocked" footnote={`${formatValue(overdue.length)} of ${formatValue(open.length)} open agreements`} />
        <KpiTile
          label="Held-up value"
          value={heldUp}
          format={{ kind: "currency", currency: "USD" }}
          tone="caution"
          footnote={`Includes ${noValue} agreements with no value yet`}
        />
        <KpiTile
          label="Signed this month"
          value={47}
          sparkline={<Sparkline values={[33, 35, 38, 36, 44, 47]} />}
          delta={{ value: 0.07, period: "vs September" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartCard
          title="Which office is holding the most contracts?"
          takeaway={`${top.office} holds ${top.waiting} of ${officeTotal} contracts waiting on an OSU office, more than any other.`}
          table={{ columns: ["Office", "Waiting"], rows: byOffice.map((o) => [o.office, o.waiting]) }}
        >
          <BarChart data={byOffice} categoryKey="office" series={[{ key: "waiting", label: "Contracts waiting" }]} labelWidth={170} />
        </ChartCard>
        <ChartCard
          title="Where is the money?"
          takeaway={`$4.2M is signed; ${formatValue(heldUp, { kind: "currency", currency: "USD", compact: true })} is held up past target.`}
          footnote={`Includes ${noValue} agreements with no value yet (shown separately, not as $0).`}
          table={{ columns: ["State", "Value"], rows: [["Signed", "$4,215,000"], ["Held up", formatValue(heldUp, { kind: "currency", currency: "USD" })], ["No value yet", `${noValue} agreements`]] }}
        >
          <BarMeter
            label="Contract value by state"
            showKey
            valueFormatter={(n) => formatValue(n, { kind: "currency", currency: "USD", compact: true })}
            segments={[
              { key: "signed", label: "Signed", value: 4_215_000, tone: "ok" },
              { key: "held", label: "Held up", value: heldUp, tone: "caution", hatch: true },
            ]}
          />
        </ChartCard>
      </div>

      <Callout tone="warning" title={`${noValue} open agreements have no value yet`}>
        They are listed in the table with “No value yet” and are not counted in the money totals.
      </Callout>

      <section id="gov-table" aria-labelledby="gov-table-title" className="flex min-w-0 scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 id="gov-table-title" className="text-body-lg font-semibold text-fg-primary">Open agreements</h3>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChips
              label="Simulate state"
              hideLabel
              value={simulate}
              onChange={setSimulate}
              options={[
                { value: "ready", label: "Data" },
                { value: "loading", label: "Loading" },
                { value: "empty", label: "Empty" },
                { value: "error", label: "Error" },
              ]}
            />
          </div>
        </div>
        <FilterBar
          shown={filtered.length}
          total={open.length}
          noun="agreements"
          active={isFiltered}
          onClear={() => {
            setQuery("");
            setWaiting("all");
          }}
          actions={
            <>
              <Button variant="outline" size="sm" aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}>
                {grouped ? "Ungroup" : "Group by stage"}
              </Button>
              <Button variant="outline" size="sm"><Download />Export shown</Button>
            </>
          }
        >
          <SearchField label="Search agreements" placeholder="Title, sponsor or reference" value={query} onChange={setQuery} />
          <FilterChips
            label="Waiting on"
            value={waiting}
            onChange={setWaiting}
            options={[
              { value: "all", label: "Anyone" },
              { value: "osu", label: "OSU" },
              { value: "external", label: "Other side" },
            ]}
          />
        </FilterBar>
        <DataTable
          caption="Open agreements (example data)"
          columns={COLUMNS}
          rows={rows}
          getRowId={(r) => r.id}
          getRowHref={(r) => `#${r.ref}`}
          getRowLabel={(r) => `${r.title}, ${r.counterparty}`}
          rowActions={(r) => (
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.title}`}>
              <MoreHorizontal />
            </Button>
          )}
          defaultSort={{ columnId: "days", direction: "desc" }}
          pageSize={25}
          noun="agreements"
          densityKey="ds-example-density"
          groupBy={
            grouped
              ? {
                  key: (r) => r.stage,
                  label: (k) => STAGE_LABEL[k as Stage],
                  order: STAGE_ORDER,
                  subtotal: (g) => {
                    const sum = g.reduce((s, r) => s + (r.value ?? 0), 0);
                    const missing = g.filter((r) => r.value === null).length;
                    return `${formatValue(sum, { kind: "currency", currency: "USD", compact: true })}${missing ? ` + ${missing} with no value` : ""}`;
                  },
                }
              : undefined
          }
          state={simulate === "loading" ? "loading" : simulate === "error" ? "error" : "ready"}
          onRetry={() => setSimulate("ready")}
          isFiltered={isFiltered}
          onClearFilters={() => {
            setQuery("");
            setWaiting("all");
          }}
        />
      </section>
    </Chapter>
  );
}
