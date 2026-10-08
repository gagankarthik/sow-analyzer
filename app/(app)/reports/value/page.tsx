"use client";

// Spend and value report (Requirement 4): money in and money out reported
// separately; current (signed and active) against potential (in the
// pipeline); potential value by step and by days waiting, so the cost of a
// slow queue shows; licensing income; breakdowns; and every contract with no
// value yet, so the totals are never silently incomplete.

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { HBarChart } from "@/components/charts/HBarChart";
import { ArrowRight } from "@/components/ui/icons";
import { contractsTable, describeFilters, type CellValue, type ExportReport, type ExportTable } from "@/lib/govern/export";
import { DIRECTION_HINT, DIRECTION_LABEL, INCOME_KIND_LABEL, STAGE_LABEL, plural } from "@/lib/govern/labels";
import {
  BREAKDOWN_LABEL, NO_FILTERS, applyFilters, breakdown, filterOptions, formatCompact, formatMoney, isCurrent,
  isUnsigned, valueHeldUp, valueSummary, type BreakdownKey, type ContractFilters,
} from "@/lib/govern/metrics";
import { useContracts } from "@/lib/govern/queries";
import type { Direction } from "@/lib/govern/types";
import { ContractRow } from "../../home/_components/ContractRow";
import { ExportButtons } from "../_components/ExportButtons";
import { LegendDot, MoneySplitBar, VALUE_FILL } from "../_components/ReportCharts";
import {
  FilterBar, NoContracts, Panel, ReportError, ReportSkeleton, StatTile, TEXT_LINK, reviewerNameFrom,
} from "../_components/ReportKit";
import { amountIn, mainCurrency } from "../_components/report-data";
import { BREAKDOWN_KEYS, BreakdownSection, breakdownName } from "./_components/BreakdownSection";
import { IncomeSection, incomeByKind } from "./_components/IncomeSection";
import { useLicensingIncome } from "./_components/licensing-income";

/** Older waits read darker: one hue, light to dark. */
const DAYS_RAMP = ["var(--viz-seq-3)", "var(--viz-seq-4)", "var(--viz-seq-5)", "var(--viz-seq-7)"];
const DIRECTIONS: Direction[] = ["incoming", "outgoing"];

export default function ValueReportPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useContracts();
  const all = useMemo(() => data?.contracts ?? [], [data]);
  const [filters, setFilters] = useState<ContractFilters>(NO_FILTERS);
  const options = useMemo(() => filterOptions(all), [all]);
  const deferredFilters = useDeferredValue(filters);
  const contracts = useMemo(() => applyFilters(all, deferredFilters), [all, deferredFilters]);

  const view = useMemo(() => {
    const summary = valueSummary(contracts);
    const currency = mainCurrency(summary.current, summary.potential);
    const byDirection = Object.fromEntries(
      DIRECTIONS.map((d) => [d, valueSummary(contracts.filter((c) => c.direction === d))]),
    ) as Record<Direction, ReturnType<typeof valueSummary>>;
    const noValue = contracts.filter((c) => c.value === null && (isUnsigned(c) || isCurrent(c)));
    const breakdowns = Object.fromEntries(BREAKDOWN_KEYS.map((k) => [k, breakdown(contracts, k)])) as Record<BreakdownKey, ReturnType<typeof breakdown>>;
    return { summary, currency, byDirection, heldUp: valueHeldUp(contracts), noValue, breakdowns };
  }, [contracts]);

  const income = useLicensingIncome(contracts);
  const { summary, currency } = view;

  // Takeaways, in the main currency.
  const topStep = [...view.heldUp.byStage].sort((a, b) => amountIn(b.money, currency) - amountIn(a.money, currency))[0];
  const stepTakeaway = topStep && amountIn(topStep.money, currency) > 0
    ? `Most pipeline value is in "${STAGE_LABEL[topStep.stage]}": ${formatCompact(amountIn(topStep.money, currency), currency)} across ${plural(topStep.count, "contract")}. Select a step to see them.`
    : "No pipeline contract has a value yet.";
  const oldMoney = view.heldUp.byDays.filter((b) => b.band === "15-30" || b.band === "31+").reduce((s, b) => s + amountIn(b.money, currency), 0);
  const daysTakeaway = oldMoney > 0
    ? `${formatCompact(oldMoney, currency)} has sat in the same step for over two weeks. Darker bars are older.`
    : "No pipeline value has waited more than two weeks in one step.";

  const buildReport = (): ExportReport => {
    const money = (key: string, header: string) => ({ key, header, kind: "money" as const, width: 18 });
    const kinds = incomeByKind(income.rows, currency);
    const breakdownTables: ExportTable[] = BREAKDOWN_KEYS.map((k) => ({
      name: `By ${BREAKDOWN_LABEL[k].toLowerCase()}`,
      columns: [
        { key: "group", header: BREAKDOWN_LABEL[k], width: 30 },
        { key: "count", header: "Contracts", kind: "number" },
        money("current", "Current"),
        money("potential", "Potential"),
        { key: "currency", header: "Currency" },
      ],
      // One row per group and currency, so amounts stay numbers and never mix.
      rows: view.breakdowns[k].flatMap((r): Record<string, CellValue>[] => {
        const currencies = [...new Set([...r.current.totals, ...r.potential.totals].map((t) => t.currency))];
        if (currencies.length === 0) return [{ group: breakdownName(k, r.key), count: r.count, current: null, potential: null, currency: null }];
        return currencies.map((cur) => ({
          group: breakdownName(k, r.key), count: r.count, current: amountIn(r.current, cur), potential: amountIn(r.potential, cur), currency: cur || null,
        }));
      }),
    }));
    const perCurrency = (m: typeof summary.current) => m.totals.map((t) => ({ amount: t.amount, currency: t.currency || null }));

    return {
      title: "Contract value: current, potential and held up",
      fileBase: "govern-value",
      summary: [
        { label: "Current (signed and active)", value: formatMoney(summary.current) },
        { label: "Potential (in the pipeline)", value: formatMoney(summary.potential) },
        { label: "Held up (potential, past target)", value: formatMoney(summary.heldUp) },
        { label: "Contracts with no value yet", value: String(view.noValue.length) },
      ],
      notes: [
        describeFilters(filters, reviewerNameFrom(options)),
        "Amounts in different currencies are listed separately and never added together.",
        income.capped ? `Licensing income read from the first ${income.read} of ${income.total} license and option agreements.` : null,
      ].filter((n): n is string => !!n),
      tables: [
        {
          name: "Money in and out",
          columns: [{ key: "direction", header: "Direction", width: 14 }, { key: "bucket", header: "Value", width: 14 }, money("amount", "Amount"), { key: "currency", header: "Currency" }],
          rows: DIRECTIONS.flatMap((d) => (["current", "potential", "heldUp"] as const).flatMap((b) =>
            perCurrency(view.byDirection[d][b]).map((t) => ({
              direction: DIRECTION_LABEL[d], bucket: b === "heldUp" ? "Held up" : b === "current" ? "Current" : "Potential", ...t,
            })))),
        },
        {
          name: "Potential by step",
          columns: [{ key: "stage", header: "Step", width: 26 }, { key: "count", header: "Contracts", kind: "number" }, money("amount", "Potential value"), { key: "currency", header: "Currency" }],
          rows: view.heldUp.byStage.flatMap((s) => (s.money.totals.length ? perCurrency(s.money) : [{ amount: null, currency: null }])
            .map((t) => ({ stage: STAGE_LABEL[s.stage], count: s.count, ...t }))),
        },
        {
          name: "Potential by days waiting",
          columns: [{ key: "band", header: "Waiting in current step", width: 26 }, { key: "count", header: "Contracts", kind: "number" }, money("amount", "Potential value"), { key: "currency", header: "Currency" }],
          rows: view.heldUp.byDays.flatMap((b) => (b.money.totals.length ? perCurrency(b.money) : [{ amount: null, currency: null }])
            .map((t) => ({ band: b.label, count: b.count, ...t }))),
        },
        {
          name: "Licensing income by kind",
          columns: [{ key: "kind", header: "Kind", width: 22 }, { key: "count", header: "Terms", kind: "number" }, money("amount", "Fixed amounts"), { key: "currency", header: "Currency" }, { key: "percentOnly", header: "Percent-only terms", kind: "number" }],
          rows: kinds.map((k) => ({ kind: k.label, count: k.count, amount: k.amount || null, currency, percentOnly: k.percentOnly })),
        },
        {
          name: "Licensing income terms",
          columns: [
            { key: "contract", header: "Contract", width: 36 }, { key: "kind", header: "Kind", width: 18 }, { key: "description", header: "Description", width: 40 },
            money("amount", "Amount"), { key: "pct", header: "Percent", kind: "number" }, { key: "currency", header: "Currency" }, { key: "expectedDate", header: "Expected", kind: "date", width: 14 },
          ],
          rows: income.rows.map((r) => ({
            contract: r.contractTitle, kind: INCOME_KIND_LABEL[r.kind], description: r.description, amount: r.amount, pct: r.pct, currency: r.currency, expectedDate: r.expectedDate,
          })),
        },
        ...breakdownTables,
        contractsTable("No value yet", view.noValue, "These contracts are not in any total until a value is added."),
      ],
    };
  };

  return (
    <>
      <PageHeader
        back={{ href: "/reports", label: "Reports" }}
        title="Contract value"
        subtitle="What is signed, what is on the way, and what slow steps are holding up. Money in and money out are reported separately."
        actions={
          <>
            <ExportButtons build={buildReport} disabled={!data || all.length === 0} />
          </>
        }
      />
      <div className="app-container space-y-8 py-6 md:py-8">
        {isLoading ? (
          <ReportSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="the value report" />
        ) : all.length === 0 ? (
          <NoContracts />
        ) : (
          <>
            <FilterBar
              idPrefix="value"
              filters={filters}
              onChange={setFilters}
              options={options}
              shown={contracts.length}
              total={all.length}
              noun="contracts"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Current" tone="success" value={formatMoney(summary.current)} hint={`Signed and active · ${plural(summary.current.valued, "contract")}`} />
              <StatTile label="Potential" tone="neutral" value={formatMoney(summary.potential)} hint={`Still in the pipeline · ${plural(summary.potential.valued, "contract")}`} />
              <StatTile label="Held up" tone={summary.heldUp.valued > 0 ? "warning" : "success"} value={formatMoney(summary.heldUp)} hint="Part of the potential: value past its step's target" href="/reports/bottlenecks" />
              <StatTile
                label="No value yet"
                tone={view.noValue.length > 0 ? "warning" : "success"}
                value={view.noValue.length}
                hint={view.noValue.length > 0 ? "Not in any total. Add their value." : "Every contract has a value"}
                href={view.noValue.length > 0 ? "#no-value" : undefined}
              />
            </div>

            <Panel id="direction" title="Money in and money out" sub="Reported separately, never netted against each other.">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {DIRECTIONS.map((d) => {
                  const s = view.byDirection[d];
                  const cur = mainCurrency(s.current, s.potential);
                  const any = s.current.totals.length + s.potential.totals.length > 0;
                  return (
                    <div key={d} className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground">{DIRECTION_LABEL[d]}</h3>
                      <p className="text-sm text-[var(--ink-600)]">{DIRECTION_HINT[d]}</p>
                      {any ? (
                        <>
                          <div className="mt-4">
                            <MoneySplitBar
                              current={amountIn(s.current, cur)}
                              potential={amountIn(s.potential, cur)}
                              heldUp={amountIn(s.heldUp, cur)}
                              labels={{ current: formatCompact(amountIn(s.current, cur), cur), potential: formatCompact(amountIn(s.potential, cur), cur), heldUp: formatCompact(amountIn(s.heldUp, cur), cur) }}
                            />
                          </div>
                          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                            <div><dt><LegendDot color={VALUE_FILL.current} label="Current" /></dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-foreground">{formatMoney(s.current)}</dd></div>
                            <div><dt><LegendDot color={VALUE_FILL.potential} label="Potential" /></dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-foreground">{formatMoney(s.potential)}</dd></div>
                            <div><dt><LegendDot color={VALUE_FILL.heldUp} hatched label="Held up" /></dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-foreground">{formatMoney(s.heldUp)}</dd></div>
                          </dl>
                        </>
                      ) : (
                        <p className="mt-4 text-base text-[var(--ink-600)]">No valued contracts.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Panel
                id="by-step"
                className="lg:col-span-7"
                title="Potential value by step"
                sub={stepTakeaway}
                table={{
                  caption: "Potential value by step",
                  columns: ["Step", "Contracts", "Potential value"],
                  rows: view.heldUp.byStage.map((s) => [STAGE_LABEL[s.stage], s.count, formatMoney(s.money)]),
                }}
              >
                <HBarChart
                  data={view.heldUp.byStage.map((s) => ({
                    id: s.stage,
                    label: STAGE_LABEL[s.stage],
                    value: amountIn(s.money, currency),
                    sub: `${plural(s.count, "contract")}${s.money.unvalued ? `, ${s.money.unvalued} with no value` : ""}`,
                  }))}
                  valueFormatter={(n) => formatCompact(n, currency)}
                  onSelect={(stage) => router.push(`/reports/bottlenecks#stage-${stage}`)}
                  yAxisWidth={170}
                />
              </Panel>
              <Panel
                id="by-days"
                className="lg:col-span-5"
                title="Potential value by days waiting"
                sub={daysTakeaway}
                table={{
                  caption: "Potential value by days waiting in the current step",
                  columns: ["Waiting", "Contracts", "Potential value"],
                  rows: view.heldUp.byDays.map((b) => [b.label, b.count, formatMoney(b.money)]),
                }}
              >
                <HBarChart
                  data={view.heldUp.byDays.map((b, i) => ({
                    id: b.band,
                    label: b.label,
                    value: amountIn(b.money, currency),
                    color: DAYS_RAMP[i],
                    sub: plural(b.count, "contract"),
                  }))}
                  valueFormatter={(n) => formatCompact(n, currency)}
                  yAxisWidth={120}
                />
              </Panel>
            </div>

            <Panel id="licensing" title="Licensing income" sub="Upfront fees, milestones, royalties, equity and sublicense income from license and option agreements.">
              <IncomeSection
                rows={income.rows}
                currency={currency}
                loading={income.loading}
                failed={income.failed}
                total={income.total}
                read={income.read}
                capped={income.capped}
              />
            </Panel>

            <Panel id="breakdown" title="Who and where the money comes from" sub={view.breakdowns.sponsor[0] && view.breakdowns.sponsor[0].current.valued + view.breakdowns.sponsor[0].potential.valued > 0
                ? `${view.breakdowns.sponsor[0].key} is the largest sponsor or licensee: ${formatMoney(view.breakdowns.sponsor[0].current)} current, ${formatMoney(view.breakdowns.sponsor[0].potential)} potential.`
                : `Current and potential value${currency ? ` (bars in ${currency})` : ""}.`}>
              <BreakdownSection rowsFor={(k) => view.breakdowns[k]} currency={currency} />
            </Panel>

            <Panel
              id="no-value"
              title="Contracts with no value yet"
              sub="These are left out of every total above. Open one and add its value so the totals are complete."
            >
              {view.noValue.length === 0 ? (
                <p className="text-base text-[var(--ink-600)]">Every open or active contract has a value. The totals are complete.</p>
              ) : (
                <ul className="-mx-4 -my-4 divide-y divide-border md:-mx-6 md:-my-6">
                  {view.noValue.map((c) => (
                    <ContractRow key={c.contractId} c={c} reason="No value recorded yet. Add the value on the contract page." />
                  ))}
                </ul>
              )}
            </Panel>

            <p className="text-sm text-[var(--ink-600)]">
              Bars and charts show {currency || "the main currency"} only; amounts in other currencies are listed in the figures and the downloads.{" "}
              <Link href="/reports/trends" className={TEXT_LINK}>Value signed over time <ArrowRight size={14} /></Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
