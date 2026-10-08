"use client";

// Leadership insights: is the work getting faster, where is the value, who
// is carrying the load, where is the risk, what is coming due, and where can
// time and money be saved. Everything is a count or sum over the live
// contracts, obligations and trends.

import { useMemo } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/govern/labels";
import { formatCompact, valueSummary } from "@/lib/govern/metrics";
import { useContracts, useObligations, useTrends } from "@/lib/govern/queries";
import { findOpportunities } from "@/lib/govern/opportunities";
import {
  obligationsByMonth, riskExposure, speed, topCounterparties, valueByType, workload, type ValueRow,
} from "@/lib/govern/leadership";
import { cn } from "@/lib/utils";
import { KpiStrip, OpportunitiesPanel, Panel, type Kpi } from "../../home/_components/HomeSections";

function mainCurrency(...totals: { currency: string; amount: number }[][]): string | null {
  const by = new Map<string, number>();
  for (const list of totals) for (const t of list) by.set(t.currency, (by.get(t.currency) ?? 0) + t.amount);
  return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function change(recent: number | null, before: number | null, unit: string, lowerIsBetter = false): { text: string; tone: Kpi["tone"] } {
  if (recent === null || before === null || before === 0) return { text: "No earlier period to compare", tone: "neutral" };
  const diff = recent - before;
  if (diff === 0) return { text: "Same as the 3 months before", tone: "neutral" };
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}${unit} vs the 3 months before`, tone: better ? "neutral" : "warning" };
}

export function LeadershipView() {
  const contractsQ = useContracts();
  const obligationsQ = useObligations();
  const trendsQ = useTrends("month", 6);
  const contracts = useMemo(() => contractsQ.data?.contracts ?? [], [contractsQ.data]);
  const obligations = useMemo(() => obligationsQ.data?.obligations ?? [], [obligationsQ.data]);

  const v = useMemo(() => {
    const summary = valueSummary(contracts);
    const currency = mainCurrency(summary.current.totals, summary.potential.totals);
    const amount = (m: typeof summary.current) => m.totals.find((t) => t.currency === (currency ?? ""))?.amount ?? 0;
    return {
      currency,
      signed: amount(summary.current),
      pipeline: amount(summary.potential),
      heldUp: amount(summary.heldUp),
      byType: valueByType(contracts, currency),
      counterparties: topCounterparties(contracts, currency),
      team: workload(contracts, currency),
      risk: riskExposure(contracts),
      months: obligationsByMonth(obligations),
      opportunities: findOpportunities(contracts, obligations),
    };
  }, [contracts, obligations]);
  const sp = useMemo(() => speed(trendsQ.data?.periods ?? []), [trendsQ.data]);

  if (contractsQ.isLoading) {
    return (
      <div className="flex flex-col gap-4 lg:gap-5" aria-busy="true" aria-label="Loading leadership insights">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (contractsQ.isError && !contractsQ.data) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-5 py-12 text-center">
        <p className="text-base font-semibold text-foreground">Couldn&apos;t load leadership insights</p>
        <p className="text-sm text-[var(--ink-600)]">Check your connection and try again. Nothing has been lost.</p>
        <Button variant="outline" onClick={() => void contractsQ.refetch()}>Try again</Button>
      </div>
    );
  }
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-14 text-center">
        <p className="text-base font-semibold text-foreground">No contracts yet</p>
        <p className="max-w-md text-sm text-[var(--ink-600)]">Leadership insights fill in as agreements are uploaded, reviewed and signed.</p>
        <Button asChild><Link href="/projects/upload">Upload an agreement</Link></Button>
      </div>
    );
  }

  const signedChange = change(sp.signedRecent, sp.signedBefore, "");
  const cycleChange = change(sp.cycleRecent, sp.cycleBefore, " days", true);
  const due90 = v.months.reduce((s, m) => s + m.count, 0);
  const kpis: Kpi[] = [
    { label: "Signed, last 3 months", value: trendsQ.data ? String(sp.signedRecent) : "—", sub: trendsQ.data ? signedChange.text : "Trends unavailable", tone: signedChange.tone, href: "/reports/trends" },
    { label: "Days to signature", value: sp.cycleRecent === null ? "—" : String(sp.cycleRecent), sub: sp.cycleRecent === null ? "Nothing signed recently" : cycleChange.text, tone: cycleChange.tone, href: "/reports/trends" },
    { label: "Pipeline value", value: formatCompact(v.pipeline, v.currency), sub: v.heldUp > 0 ? `${formatCompact(v.heldUp, v.currency)} held up by delays` : "Nothing held up", tone: v.heldUp > 0 ? "warning" : "neutral", href: "/reports/value" },
    { label: "Obligations, next 3 months", value: obligationsQ.data ? String(due90) : "—", sub: obligationsQ.isError ? "Obligations unavailable" : "Reports, payments and term ends", href: "/obligations?view=90" },
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <KpiStrip items={kpis} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel id="value-by-type" className="lg:col-span-7" title="Value by agreement type" answer={`Signed and in the pipeline${v.currency ? `, in ${v.currency}` : ""}.`} action={{ href: "/reports/value", label: "Report" }}>
          <ValueBars rows={v.byType} currency={v.currency} empty="No contract has a value yet." />
        </Panel>
        <Panel id="counterparties" className="lg:col-span-5" title="Largest counterparties" answer="By signed plus pipeline value." flush>
          {v.counterparties.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--ink-600)]">No valued contract names a counterparty yet.</p>
          ) : (
            <ol className="divide-y divide-border">
              {v.counterparties.map((r, i) => (
                <li key={r.key} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-5 shrink-0 tabular-nums text-[var(--ink-500)]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{r.label}</span>
                    <span className="text-xs text-[var(--ink-600)]">{plural(r.count, "contract")}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold text-foreground">{formatCompact(r.signed + r.pipeline, v.currency)}</span>
                    <span className="text-xs text-[var(--ink-600)]">{formatCompact(r.signed, v.currency)} signed</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel id="team" title="Team workload" answer="Open contracts each reviewer holds, with what is overdue. Unassigned work is listed last." action={{ href: "/settings/team", label: "Team" }} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-[var(--ink-50)] text-left text-xs font-medium text-[var(--ink-600)]">
              <tr>
                <th scope="col" className="px-5 py-2.5">Reviewer</th>
                <th scope="col" className="px-3 py-2.5 text-right">Open</th>
                <th scope="col" className="px-3 py-2.5 text-right">Overdue</th>
                <th scope="col" className="px-3 py-2.5 text-right">Running late</th>
                <th scope="col" className="px-3 py-2.5 text-right">Longest wait</th>
                <th scope="col" className="px-5 py-2.5 text-right">Value held</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {v.team.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-6 text-[var(--ink-600)]">No open contracts right now.</td></tr>
              ) : v.team.map((r) => (
                <tr key={r.key} className="hover:bg-[var(--ink-50)]">
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className={cn("block font-semibold", r.key === "__unassigned" ? "text-[var(--warning-fg)]" : "text-foreground")}>{r.name}</span>
                    {r.email && r.email !== r.name && <span className="text-xs text-[var(--ink-600)]">{r.email}</span>}
                  </th>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{r.open}</td>
                  <td className={cn("px-3 py-3 text-right tabular-nums", r.overdue > 0 ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-600)]")}>{r.overdue}</td>
                  <td className={cn("px-3 py-3 text-right tabular-nums", r.late > 0 ? "font-semibold text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>{r.late}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--ink-700)]">{plural(r.longestDays, "day")}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-[var(--ink-700)]">{r.value === null ? "—" : formatCompact(r.value, v.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel id="risk" title="Risk in open contracts" answer={v.risk.unacceptable + v.risk.withBlockers === 0
          ? "No open contract has an unacceptable term or an open blocker."
          : `${plural(v.risk.unacceptable, "contract")} with a term the matrix never accepts, ${plural(v.risk.withBlockers, "contract")} with other open items.`}
          action={{ href: "/workflow", label: "Workflow" }}>
          {v.risk.rows.length === 0 ? (
            <p className="text-sm text-[var(--ink-600)]">Nothing to show.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {v.risk.rows.map((r) => {
                const total = r.unacceptable + r.open;
                const max = Math.max(...v.risk.rows.map((x) => x.unacceptable + x.open));
                return (
                  <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
                    <span className="truncate text-[var(--ink-700)]">{r.label}</span>
                    <span className="flex h-2.5 overflow-hidden rounded-full bg-[var(--ink-100)]" role="img" aria-label={`${r.unacceptable} unacceptable, ${r.open} with open items`}>
                      <span className="h-full bg-[var(--danger)]" style={{ width: `${(r.unacceptable / max) * 100}%` }} />
                      <span className="h-full bg-[var(--warning)]" style={{ width: `${(r.open / max) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{total}</span>
                  </li>
                );
              })}
              <li className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-[var(--ink-600)]">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--danger)]" aria-hidden />Unacceptable term</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--warning)]" aria-hidden />Other open items</span>
              </li>
            </ul>
          )}
        </Panel>

        <Panel id="commitments" title="Commitments coming due" answer={obligationsQ.isError ? "Obligations couldn't be loaded." : `${plural(due90, "obligation")} due in the next three months.`} action={{ href: "/obligations", label: "Obligations" }}>
          <ul className="flex flex-col gap-3">
            {v.months.map((m) => {
              const max = Math.max(1, ...v.months.map((x) => x.count));
              return (
                <li key={m.key} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="text-[var(--ink-700)]">{m.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-[var(--ink-100)]">
                    <span className="block h-full rounded-full bg-[var(--viz-primary)]" style={{ width: `${(m.count / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-semibold text-foreground">{m.count}</span>
                    {m.amount > 0 && <span className="ml-2 text-xs text-[var(--ink-600)]">{formatCompact(m.amount, v.currency)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <OpportunitiesPanel items={v.opportunities} />
    </div>
  );
}

function ValueBars({ rows, currency, empty }: { rows: ValueRow[]; currency: string | null; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--ink-600)]">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.signed + r.pipeline));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
            <span className="truncate text-[var(--ink-700)]">{r.label}</span>
            <span className="flex h-2.5 overflow-hidden rounded-full bg-[var(--ink-100)]" role="img" aria-label={`${formatCompact(r.signed, currency)} signed, ${formatCompact(r.pipeline, currency)} in the pipeline`}>
              <span className="h-full bg-[var(--viz-primary)]" style={{ width: `${(r.signed / max) * 100}%` }} />
              <span className="h-full bg-[var(--viz-compare)]" style={{ width: `${(r.pipeline / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums text-foreground">{formatCompact(r.signed + r.pipeline, currency)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-600)]">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--viz-primary)]" aria-hidden />Signed</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--viz-compare)]" aria-hidden />Pipeline</span>
      </div>
    </div>
  );
}
