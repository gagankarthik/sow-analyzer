"use client";

// Trends: is the work getting faster, where does it slow down, and which
// matrix positions cause the most back-and-forth. Every chart leads with one
// plain sentence computed from the data, so a leader can read the page
// without reading the charts.

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { HBarChart } from "@/components/charts/HBarChart";
import { FilterChips } from "@/components/settings/SettingsNav";
import { ACCENT } from "@/lib/chart-theme";
import type { ExportReport } from "@/lib/govern/export";
import {
  AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, OFFICE_LABEL, PRE_SIGNATURE_STAGES, STAGE_LABEL, daysLabel, plural,
} from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import { useTrends } from "@/lib/govern/queries";
import type { Trends } from "@/lib/govern/types";
import { ExportButtons } from "../_components/ExportButtons";
import { Sparkline } from "../_components/ReportCharts";
import { Panel, ReportError, ReportSkeleton } from "../_components/ReportKit";
import { ColumnChart, LineTrendChart, chartRowsTable, type ChartSeries } from "../_components/TrendCharts";
import { useStageTargets } from "../_components/report-data";
import {
  activePeriods, changeSentence, currenciesIn, hasHistory, moneySentence, pct, periodLabel, periodTick,
  primaryCurrency, throughputSentence, unitWord,
} from "../_components/trend-utils";
import { ClauseFrictionMap } from "./_components/ClauseFrictionMap";

type Granularity = Trends["granularity"];
const PERIODS: Record<Granularity, number> = { month: 12, week: 13 };

const RECEIVED = "var(--ink-400)";
const SIGNED = ACCENT;

const THROUGHPUT: ChartSeries[] = [{ key: "received", label: "Received", color: RECEIVED }, { key: "signed", label: "Signed", color: SIGNED }];
const CYCLE: ChartSeries[] = [{ key: "days", label: "Average days to signature", color: SIGNED }];
const ON_TIME: ChartSeries[] = [{ key: "pct", label: "Finished within target", color: "var(--success)" }];
const FRICTION: ChartSeries[] = [
  { key: "sentBack", label: "Sent back", color: ACCENT },
  { key: "rejected", label: "Rejected", color: "var(--ink-500)", dashed: true },
  { key: "overdue", label: "Went overdue", color: "var(--danger)", dashed: true },
];

export default function TrendsPage() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { data, isLoading, isError, error, refetch } = useTrends(granularity, PERIODS[granularity]);

  return (
    <>
      <PageHeader
        back={{ href: "/reports", label: "Reports" }}
        title="Trends"
        subtitle="How the work is moving over time: what arrives, what gets signed, how long it takes and where it slows down."
        actions={
          <>
            <ExportButtons build={() => buildTrendsReport(data as Trends)} disabled={!data || data.periods.length === 0} />
          </>
        }
      />
      <div className="app-container space-y-8 py-6 md:py-8">
        <FilterChips
          label="Show by"
          value={granularity}
          onChange={setGranularity}
          options={[{ value: "month", label: "Month (last 12)" }, { value: "week", label: "Week (last 13)" }]}
        />
        {isLoading ? (
          <ReportSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="trends" />
        ) : !data || !hasHistory(data.periods) ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-16 text-center">
            <h2 className="text-lg font-semibold text-foreground">Trends appear after a few weeks of activity</h2>
            <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--ink-600)]">
              {data && activePeriods(data.periods).length === 1
                ? `There is one ${unitWord(granularity, 1)} of activity so far. Come back once there are two or more to compare.`
                : "As contracts arrive, move and get signed, this page shows how fast the work moves and where it slows down."}
            </p>
          </div>
        ) : (
          <TrendsBody trends={data} />
        )}
      </div>
    </>
  );
}

function TrendsBody({ trends }: { trends: Trends }) {
  const { periods, granularity } = trends;
  const { targets } = useStageTargets([]);

  const view = useMemo(() => {
    const labels = periods.map((p) => periodLabel(p, granularity));
    const ticks = periods.map((p) => periodTick(p, granularity));
    const currency = primaryCurrency(periods.map((p) => p.signedValue));
    const otherCurrencies = currenciesIn(periods.map((p) => p.signedValue)).filter((c) => c !== currency);
    const row = (i: number) => ({ label: ticks[i], tooltipLabel: labels[i] });
    return {
      labels, ticks, currency, otherCurrencies,
      throughput: periods.map((p, i) => ({ ...row(i), received: p.received, signed: p.signed })),
      cycle: periods.map((p, i) => ({ ...row(i), days: p.avgCycleDays })),
      onTime: periods.map((p, i) => ({ ...row(i), pct: p.onTimePct })),
      value: periods.map((p, i) => ({ ...row(i), amount: currency ? p.signedValue[currency] ?? 0 : 0 })),
      friction: periods.map((p, i) => ({ ...row(i), sentBack: p.sentBack, rejected: p.rejected, overdue: p.overdueEvents })),
      stages: periods.map((p, i) => ({ ...row(i), ...Object.fromEntries(PRE_SIGNATURE_STAGES.map((s) => [s, p.avgDaysByStage[s] ?? null])) })),
    };
  }, [periods, granularity]);

  const sum = (k: "sentBack" | "rejected" | "overdueEvents") => periods.reduce((s, p) => s + p[k], 0);
  const topClause = trends.clauseDeviations[0];
  const busiestOffice = [...trends.officeLoad].sort((a, b) => b.escalations - a.escalations)[0];
  const slowestOffice = [...trends.officeLoad].filter((o) => o.avgDaysToApprove !== null)
    .sort((a, b) => (b.avgDaysToApprove ?? 0) - (a.avgDaysToApprove ?? 0))[0];
  const typeRows = AGREEMENT_TYPES.map((t) => ({ type: t, ...trends.byAgreementType[t] })).filter((r) => (r.received ?? 0) + (r.signed ?? 0) > 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel
          id="throughput"
          className="lg:col-span-7"
          title="Arriving and signed"
          sub={throughputSentence(periods, granularity)}
          table={chartRowsTable("Contracts received and signed", view.throughput, THROUGHPUT)}
        >
          <ColumnChart
            rows={view.throughput}
            series={THROUGHPUT}
            caption={`Contracts received and signed per ${unitWord(granularity, 1)}`}
          />
        </Panel>
        <Panel
          id="cycle"
          className="lg:col-span-5"
          title="Days from arrival to signature"
          sub={changeSentence({ values: periods.map((p) => p.avgCycleDays), subject: "Time to signature", unit: " days", granularity })
            ?? "No contract was signed in this window yet."}
          table={chartRowsTable("Average days from arrival to signature", view.cycle, CYCLE, (n) => `${Math.round(n)}`)}
        >
          <LineTrendChart
            rows={view.cycle}
            series={CYCLE}
            caption="Average days from arrival to signature"
            format={(n) => `${Math.round(n)}`}
          />
        </Panel>
      </div>

      <Panel
        id="stages"
        title="Days spent in each step"
        sub="Average days a contract spent in each step before moving on, against the target."
        table={chartRowsTable("Average days spent in each step", view.stages, PRE_SIGNATURE_STAGES.map((s) => ({ key: s, label: STAGE_LABEL[s], color: SIGNED })), (n) => `${Math.round(n)}`)}
      >
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PRE_SIGNATURE_STAGES.map((stage) => {
            const values = periods.map((p) => p.avgDaysByStage[stage] ?? null);
            const latest = [...values].reverse().find((v): v is number => v !== null);
            const target = targets[stage] ?? null;
            const over = latest !== undefined && target !== null && latest > target;
            return (
              <li key={stage} className="min-w-0">
                <p className="text-base font-semibold text-foreground">{STAGE_LABEL[stage]}</p>
                <p className="mt-0.5 text-sm text-[var(--ink-600)]">
                  {latest === undefined ? "No moves yet" : <>Latest <span className="font-semibold text-foreground">{daysLabel(Math.round(latest))}</span></>}
                  {target ? ` · target ${daysLabel(target)}` : ""}
                  {over && <span className="font-medium text-[var(--warning)]"> · over target</span>}
                </p>
                <div className="mt-2">
                  <Sparkline
                    periods={view.labels}
                    caption={`Average days in ${STAGE_LABEL[stage]}`}
                    series={[{ label: STAGE_LABEL[stage], values, color: over ? "var(--warning)" : SIGNED }]}
                  />
                </div>
                <p className="mt-1.5 text-sm leading-snug text-[var(--ink-600)]">
                  {changeSentence({ values, subject: "Average", unit: " days", granularity }) ?? ""}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel
          id="on-time"
          className="lg:col-span-5"
          title="Steps finished on time"
          sub={changeSentence({ values: periods.map((p) => p.onTimePct), subject: "On-time steps", unit: "%", granularity })
            ?? "No step finished in this window yet."}
          table={chartRowsTable("Share of steps finished within target", view.onTime, ON_TIME, (n) => `${Math.round(n)}%`)}
        >
          <LineTrendChart
            rows={view.onTime}
            series={ON_TIME}
            caption="Share of steps finished within target"
            format={(n) => `${Math.round(n)}%`}
            yMax={100}
          />
        </Panel>
        <Panel
          id="value"
          className="lg:col-span-7"
          title="Value signed"
          sub={view.currency
            ? `${moneySentence(view.value.map((v) => v.amount), view.currency, granularity)}${view.otherCurrencies.length ? ` Also signed in ${view.otherCurrencies.join(", ")}; see the download.` : ""}`
            : "No signed contract had a value in this window."}
          table={chartRowsTable("Value signed per period", view.value, [{ key: "amount", label: "Value signed", color: SIGNED }], (n) => formatCompact(n, view.currency))}
        >
          <ColumnChart
            rows={view.value}
            series={[{ key: "amount", label: `Value signed${view.currency ? ` (${view.currency})` : ""}`, color: SIGNED }]}
            caption="Value signed per period"
            format={(n) => formatCompact(n, view.currency)}
          />
        </Panel>
      </div>

      <Panel
        id="friction"
        title="Sent back, rejected and overdue"
        sub={`${plural(sum("sentBack"), "contract")} sent back, ${sum("rejected")} rejected and ${plural(sum("overdueEvents"), "step")} went past target in this window. ${
          changeSentence({ values: periods.map((p) => p.sentBack), subject: "Send-backs", unit: "", granularity }) ?? ""}`}
        table={chartRowsTable("Sent back, rejected and overdue per period", view.friction, FRICTION)}
      >
        <LineTrendChart
          rows={view.friction}
          series={FRICTION}
          caption="Contracts sent back, rejected and steps going overdue, per period"
        />
      </Panel>

      <Panel
        id="clauses"
        title="Which terms cause the most changes"
        sub={topClause
          ? `${topClause.label} needed changes most often: ${plural(topClause.total, "time")} in this window. Admins may want to review that matrix position.`
          : "No clause needed changes in this window."}
      >
        {trends.clauseDeviations.length > 0 && (
          <ClauseFrictionMap
            deviations={trends.clauseDeviations}
            periods={periods.map((p) => p.period)}
            labels={view.labels}
            ticks={view.ticks}
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel
          id="offices"
          className="lg:col-span-6"
          title="Office workload"
          sub={busiestOffice
            ? `${OFFICE_LABEL[busiestOffice.office]} had the most escalations (${busiestOffice.escalations}).${slowestOffice ? ` ${OFFICE_LABEL[slowestOffice.office]} took longest to approve, ${daysLabel(Math.round(slowestOffice.avgDaysToApprove ?? 0))} on average.` : ""}`
            : "No contract was escalated to an office in this window."}
        >
          {trends.officeLoad.length > 0 && (
            <HBarChart
              data={trends.officeLoad.map((o) => ({
                id: o.office,
                label: OFFICE_LABEL[o.office],
                value: o.escalations,
                sub: o.avgDaysToApprove === null ? "No approvals yet" : `avg ${daysLabel(Math.round(o.avgDaysToApprove))} to approve`,
              }))}
              valueFormatter={(n) => `${n}`}
              unit="escalations"
              yAxisWidth={190}
            />
          )}
        </Panel>
        <Panel id="types" className="lg:col-span-6" title="By agreement type" sub="Over the whole window.">
          {typeRows.length === 0 ? (
            <p className="text-base text-[var(--ink-600)]">Nothing arrived or was signed in this window.</p>
          ) : (
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Contracts by agreement type</caption>
              <thead>
                <tr className="border-b border-border text-xs text-[var(--ink-600)]">
                  <th scope="col" className="w-[44%] py-2 text-left font-medium">Type</th>
                  <th scope="col" className="py-2 text-right font-medium">Received</th>
                  <th scope="col" className="py-2 text-right font-medium">Signed</th>
                  <th scope="col" className="py-2 text-right font-medium">Avg days</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map((r) => (
                  <tr key={r.type} className="border-b border-border last:border-0">
                    <th scope="row" className="truncate py-2.5 text-left font-medium text-foreground">{AGREEMENT_TYPE_LABEL[r.type]}</th>
                    <td className="py-2.5 text-right tabular-nums">{r.received ?? 0}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.signed ?? 0}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.avgCycleDays == null ? "—" : Math.round(r.avgCycleDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}

function buildTrendsReport(trends: Trends): ExportReport {
  const { periods, granularity } = trends;
  const currencies = currenciesIn(periods.map((p) => p.signedValue));
  const periodName = granularity === "month" ? "Month" : "Week";
  return {
    title: `Trends by ${granularity}`,
    fileBase: `govern-trends-${granularity}`,
    summary: [
      { label: "Received", value: String(periods.reduce((s, p) => s + p.received, 0)) },
      { label: "Signed", value: String(periods.reduce((s, p) => s + p.signed, 0)) },
      { label: "Sent back", value: String(periods.reduce((s, p) => s + p.sentBack, 0)) },
      { label: "Rejected", value: String(periods.reduce((s, p) => s + p.rejected, 0)) },
    ],
    notes: [
      throughputSentence(periods, granularity),
      changeSentence({ values: periods.map((p) => p.avgCycleDays), subject: "Time to signature", unit: " days", granularity }),
      changeSentence({ values: periods.map((p) => p.onTimePct), subject: "On-time steps", unit: "%", granularity }),
    ].filter((n): n is string => !!n),
    tables: [
      {
        name: `By ${granularity}`,
        columns: [
          { key: "period", header: periodName, width: 16 },
          { key: "received", header: "Received", kind: "number" },
          { key: "signed", header: "Signed", kind: "number" },
          { key: "sentBack", header: "Sent back", kind: "number" },
          { key: "rejected", header: "Rejected", kind: "number" },
          { key: "escalated", header: "Escalated", kind: "number" },
          { key: "overdue", header: "Went overdue", kind: "number" },
          { key: "revisions", header: "New versions", kind: "number" },
          { key: "cycle", header: "Avg days to sign", kind: "number" },
          { key: "rounds", header: "Avg rounds", kind: "number" },
          { key: "onTime", header: "On time", width: 10 },
          ...PRE_SIGNATURE_STAGES.map((s) => ({ key: `stage_${s}`, header: `Days in ${STAGE_LABEL[s]}`, kind: "number" as const, width: 16 })),
        ],
        rows: periods.map((p) => ({
          period: periodLabel(p, granularity), received: p.received, signed: p.signed, sentBack: p.sentBack, rejected: p.rejected,
          escalated: p.escalated, overdue: p.overdueEvents, revisions: p.revisions, cycle: p.avgCycleDays === null ? null : Math.round(p.avgCycleDays),
          rounds: p.avgRounds, onTime: pct(p.onTimePct),
          ...Object.fromEntries(PRE_SIGNATURE_STAGES.map((s) => [`stage_${s}`, p.avgDaysByStage[s] == null ? null : Math.round(p.avgDaysByStage[s] as number)])),
        })),
      },
      {
        name: "Value signed",
        columns: [{ key: "period", header: periodName, width: 16 }, { key: "amount", header: "Value signed", kind: "money", width: 18 }, { key: "currency", header: "Currency" }],
        rows: periods.flatMap((p) => currencies.map((cur) => ({ period: periodLabel(p, granularity), amount: p.signedValue[cur] ?? 0, currency: cur }))),
      },
      {
        name: "Terms causing changes",
        columns: [
          { key: "label", header: "Clause", width: 34 },
          { key: "total", header: "Total", kind: "number" },
          ...periods.map((p) => ({ key: p.period, header: periodTick(p, granularity), kind: "number" as const, width: 9 })),
        ],
        rows: trends.clauseDeviations.map((d) => ({ label: d.label, total: d.total, ...Object.fromEntries(periods.map((p) => [p.period, d.byPeriod[p.period] ?? 0])) })),
      },
      {
        name: "Office workload",
        columns: [{ key: "office", header: "Office", width: 30 }, { key: "escalations", header: "Escalations", kind: "number" }, { key: "days", header: "Avg days to approve", kind: "number", width: 20 }],
        rows: trends.officeLoad.map((o) => ({ office: OFFICE_LABEL[o.office], escalations: o.escalations, days: o.avgDaysToApprove === null ? null : Math.round(o.avgDaysToApprove) })),
      },
      {
        name: "By agreement type",
        columns: [{ key: "type", header: "Type", width: 28 }, { key: "received", header: "Received", kind: "number" }, { key: "signed", header: "Signed", kind: "number" }, { key: "days", header: "Avg days to sign", kind: "number", width: 18 }],
        rows: AGREEMENT_TYPES.filter((t) => trends.byAgreementType[t]).map((t) => {
          const r = trends.byAgreementType[t]!;
          return { type: AGREEMENT_TYPE_LABEL[t], received: r.received, signed: r.signed, days: r.avgCycleDays === null ? null : Math.round(r.avgCycleDays) };
        }),
      },
    ],
  };
}
