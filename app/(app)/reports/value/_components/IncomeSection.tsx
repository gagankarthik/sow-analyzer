"use client";

// Licensing income: what each kind is worth, and when it is expected, by
// calendar quarter. Percent-only terms (a 3% royalty) have no amount, so they
// are listed in words rather than charted as zero.

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import { ChartSkeleton, SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";
import { ACCENT } from "@/lib/chart-theme";
import { fmtMoney } from "@/lib/contract-value";
import { INCOME_KIND_LABEL, plural } from "@/lib/govern/labels";
import { displayTitle, parseDate } from "@/lib/format";
import { formatCompact } from "@/lib/govern/metrics";
const ColumnChart = dynamic(() => import("../../_components/TrendCharts").then((m) => m.ColumnChart), { ssr: false, loading: () => <ChartSkeleton height="h-[240px]" bars={6} label="the chart" /> });
import { INCOME_DETAIL_CAP, LICENSING_KINDS, quarterOf, type IncomeRow } from "./licensing-income";

export function incomeByKind(rows: IncomeRow[], currency: string | null) {
  return LICENSING_KINDS.map((kind) => {
    const set = rows.filter((r) => r.kind === kind);
    const inCurrency = set.filter((r) => r.amount !== null && (r.currency ?? "") === (currency ?? ""));
    return {
      kind,
      label: INCOME_KIND_LABEL[kind],
      count: set.length,
      amount: inCurrency.reduce((s, r) => s + (r.amount ?? 0), 0),
      percentOnly: set.filter((r) => r.amount === null && r.pct !== null).length,
    };
  });
}

export function incomeByQuarter(rows: IncomeRow[], currency: string | null) {
  const map = new Map<string, { key: string; label: string; amount: number }>();
  let undated = 0;
  for (const r of rows) {
    if (r.amount === null || (r.currency ?? "") !== (currency ?? "")) continue;
    const q = quarterOf(r.expectedDate);
    if (!q) { undated += 1; continue; }
    const cur = map.get(q.key) ?? { ...q, amount: 0 };
    cur.amount += r.amount;
    map.set(q.key, cur);
  }
  const quarters = [...map.values()].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  return { quarters, undated };
}

export function IncomeSection({
  rows, currency, loading, failed, total, read, capped,
}: {
  rows: IncomeRow[];
  currency: string | null;
  loading: boolean;
  failed: number;
  total: number;
  read: number;
  capped: boolean;
}) {
  const kinds = useMemo(() => incomeByKind(rows, currency), [rows, currency]);
  const { quarters, undated } = useMemo(() => incomeByQuarter(rows, currency), [rows, currency]);
  const otherCurrency = rows.filter((r) => r.amount !== null && (r.currency ?? "") !== (currency ?? "")).length;

  if (total === 0) {
    return <p className="text-sm text-[var(--ink-600)]">No license or option agreements match. Licensing income shows here once one is uploaded.</p>;
  }
  if (loading && rows.length === 0) {
    return (
      <SkeletonRegion label="licensing income" className="space-y-6">
        <div aria-hidden className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="min-w-0">
              <SkeletonLine text="text-xs" width="w-20" />
              <SkeletonLine text="text-xl font-semibold" width="w-16" className="mt-0.5" />
              <SkeletonLine text="text-xs" width="w-14" />
            </div>
          ))}
        </div>
        <div>
          <span className="block text-sm font-semibold text-foreground">Expected income by quarter</span>
          <SkeletonLine text="text-xs" width="w-56" className="mb-3" />
          <ChartSkeleton height="h-[240px]" bars={6} />
        </div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {kinds.map((k) => (
          <div key={k.kind} className="min-w-0">
            <dt className="text-xs text-[var(--ink-600)]">{k.label}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {k.amount > 0 ? formatCompact(k.amount, currency) : "—"}
            </dd>
            <dd className="text-xs text-[var(--ink-600)]">
              {k.count === 0 ? "None found" : plural(k.count, "term")}
              {k.percentOnly > 0 && ` · ${k.percentOnly} as a %`}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Expected income by quarter</h3>
        <p className="mb-3 text-xs text-[var(--ink-600)]">Fixed amounts with an expected date{currency ? `, in ${currency}` : ""}</p>
        {quarters.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--ink-300)] px-4 py-6 text-center text-sm text-[var(--ink-600)]">
            No income term has both an amount and an expected date yet.
          </p>
        ) : (
          <ColumnChart
            rows={quarters.map((q) => ({ label: q.label, amount: q.amount }))}
            series={[{ key: "amount", label: "Expected income", color: ACCENT }]}
            format={(n) => formatCompact(n, currency)}
            caption="Expected licensing income by quarter"
          />
        )}
      </div>

      <ul className="space-y-1 text-xs text-[var(--ink-600)]">
        {capped && <li>Read the first {INCOME_DETAIL_CAP} of {total} license and option agreements; the rest are in each contract&apos;s page.</li>}
        {!capped && read > 0 && <li>From {plural(read, "license or option agreement")}.</li>}
        {undated > 0 && <li>{plural(undated, "amount")} {undated === 1 ? "has" : "have"} no expected date and {undated === 1 ? "is" : "are"} not in the chart.</li>}
        {otherCurrency > 0 && <li>{plural(otherCurrency, "amount")} in another currency {otherCurrency === 1 ? "is" : "are"} listed below, not charted.</li>}
        {failed > 0 && <li className="text-[var(--warning-fg)]">{plural(failed, "agreement")} couldn&apos;t be read, so {failed === 1 ? "its" : "their"} income is missing here.</li>}
        {loading && <li>Still reading some agreements…</li>}
      </ul>

      {rows.length > 0 && (
        <details className="group border-t border-border">
          <summary className="cursor-pointer list-none py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:min-h-11 [&::-webkit-details-marker]:hidden">
            Every income term ({rows.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {rows.map((r) => (
              <li key={`${r.contractId}-${r.id}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="min-w-0">
                  <Link href={`/contracts/${encodeURIComponent(r.contractId)}`} className="block truncate font-medium text-foreground hover:text-[var(--brand-primary-700)] hover:underline">
                    {displayTitle(r.contractTitle)}
                  </Link>
                  <span className="block text-xs text-[var(--ink-600)]">{INCOME_KIND_LABEL[r.kind]} · {r.description}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-foreground sm:text-right">
                  {r.amount !== null ? fmtMoney(r.amount, r.currency) : r.pct !== null ? `${r.pct}%` : "No amount yet"}
                  <span className="block text-xs text-[var(--ink-600)]">
                    {r.expectedDate ? parseDate(r.expectedDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "No date"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
