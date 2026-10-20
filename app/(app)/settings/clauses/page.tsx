"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  FilterChips,
  FilterSummary,
  NoResults,
  SettingsLayout,
  SettingsSearch,
  SettingsSection,
} from "@/components/settings/SettingsNav";
import { FileText, RefreshCw, XCircle } from "@/components/ui/icons";
import { useDocuments, useClassifications, isProcessing } from "@/lib/queries/documents";
import { categoryLabel, clauseSpecificType } from "@/lib/clause-categories";
import { RISK_LABEL, RISK_ORDER_DESC } from "@/lib/chart-theme";
import type { RiskLevel } from "@/lib/types";
import { TableSkeleton, type SkeletonColumn } from "@/components/ds/skeletons";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
// Colour only where the risk needs attention; low and medium stay quiet.
const RISK_TEXT: Record<RiskLevel, string> = {
  critical: "text-[var(--danger-fg)]",
  high: "text-[var(--warning-fg)]",
  medium: "text-[var(--ink-700)]",
  low: "text-[var(--ink-600)]",
};
const NUM = new Intl.NumberFormat("en-US");

type CategoryRow = {
  key: string;
  label: string;
  /** Clauses in this category across all analyzed documents. */
  clauses: number;
  /** Documents that contain at least one clause in this category. */
  docs: number;
  /** Highest risk level the analysis gave any clause in it; null if none was rated. */
  peak: RiskLevel | null;
  /** Clauses rated high or critical. */
  highRisk: number;
  /** Finer-grained clause types the API reported inside this category. */
  types: string[];
};

type RiskFilter = "all" | RiskLevel | "unrated";

/**
 * Clause library: an index of the clauses Sonar actually extracted from this
 * workspace's analyzed documents, grouped by the category the backend assigned.
 * Every number is a count over the classification responses — there is no
 * fixed category list, so a category the backend starts sending tomorrow shows
 * up here on its own.
 */
/** The categories table's columns, for its loading skeleton. */
const CATEGORY_COLUMNS: SkeletonColumn[] = [
  { id: "category", header: "Category", card: "title" },
  { id: "clauses", header: "Clauses", numeric: true },
  { id: "docs", header: "Documents", numeric: true },
  { id: "risk", header: "Highest risk" },
  { id: "types", header: "Types", priority: 2 },
];

export default function ClauseLibraryPage() {
  const docsQuery = useDocuments();
  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);
  const { byDoc, version, loadingCount, failedCount, readyCount } = useClassifications(docs);
  const processingCount = docs.filter((d) => isProcessing(d.status)).length;

  const rows = useMemo<CategoryRow[]>(() => {
    const m = new Map<string, { clauses: number; docs: Set<string>; peak: RiskLevel | null; highRisk: number; types: Set<string> }>();
    byDoc.forEach((c, docId) => {
      for (const cl of c.clauses) {
        const e = m.get(cl.category) ?? { clauses: 0, docs: new Set<string>(), peak: null, highRisk: 0, types: new Set<string>() };
        e.clauses += 1;
        e.docs.add(docId);
        if (cl.riskRated !== false) {
          if (e.peak === null || RISK_RANK[cl.riskLevel] > RISK_RANK[e.peak]) e.peak = cl.riskLevel;
          if (cl.riskLevel === "high" || cl.riskLevel === "critical") e.highRisk += 1;
        }
        const specific = clauseSpecificType(cl);
        if (specific) e.types.add(categoryLabel(specific));
        m.set(cl.category, e);
      }
    });
    return [...m.entries()]
      .map(([key, v]) => ({ key, label: categoryLabel(key), clauses: v.clauses, docs: v.docs.size, peak: v.peak, highRisk: v.highRisk, types: [...v.types].sort() }))
      .sort((a, b) => b.clauses - a.clauses || a.label.localeCompare(b.label));
    // `version` changes whenever a classification changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDoc, version]);

  const totalClauses = rows.reduce((s, r) => s + r.clauses, 0);
  const analysedDocs = byDoc.size;

  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const term = q.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (risk === "all" || (risk === "unrated" ? r.peak === null : r.peak === risk)) &&
      (!term || r.label.toLowerCase().includes(term) || r.key.toLowerCase().includes(term) || r.types.some((t) => t.toLowerCase().includes(term))),
  );
  const filtering = term !== "" || risk !== "all";
  const clearFilters = () => { setQ(""); setRisk("all"); };
  const riskOptions: { value: RiskFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...RISK_ORDER_DESC.filter((r) => rows.some((x) => x.peak === r)).map((r) => ({ value: r as RiskFilter, label: `${RISK_LABEL[r]} peak` })),
    ...(rows.some((x) => x.peak === null) ? [{ value: "unrated" as RiskFilter, label: "Not rated" }] : []),
  ];

  const loadingDocs = docsQuery.isLoading;
  const docsFailed = docsQuery.isError && !docsQuery.data;
  const stillLoading = loadingDocs || (readyCount > 0 && loadingCount > 0 && rows.length === 0);

  // One sentence, each part a count from the queries above.
  const status = loadingDocs
    ? "Loading…"
    : docsFailed
      ? "Not available"
      : [
          `${NUM.format(totalClauses)} clause${totalClauses === 1 ? "" : "s"} in ${rows.length} categor${rows.length === 1 ? "y" : "ies"}`,
          `from ${analysedDocs} of ${docs.length} document${docs.length === 1 ? "" : "s"}`,
          processingCount > 0 ? `${processingCount} still processing` : "",
          loadingCount > 0 ? `${loadingCount} loading` : "",
          failedCount > 0 ? `${failedCount} couldn’t be read` : "",
        ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        title="Clause library"
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        <SettingsSection title="Clause categories" flush>
          {stillLoading ? (
            <TableSkeleton label="clause categories" columns={CATEGORY_COLUMNS} rows={6} />
          ) : docsFailed ? (
            <div role="alert" className="flex flex-col items-center px-4 py-10 text-center">
              <XCircle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
              <h3 className="text-base font-semibold text-foreground">Couldn&apos;t load your documents</h3>
              <p className="mt-1.5 max-w-sm break-words text-sm leading-relaxed text-[var(--ink-600)]">
                {docsQuery.error instanceof Error ? docsQuery.error.message : "The request failed."}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => docsQuery.refetch()}><RefreshCw size={16} aria-hidden />Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <FileText size={24} aria-hidden className="mb-3 text-[var(--ink-400)]" />
              <h3 className="text-sm font-semibold text-foreground">No clauses yet</h3>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                {docs.length === 0
                  ? "Upload a document and its clauses appear here once it has been analyzed."
                  : processingCount > 0
                    ? `${processingCount} document${processingCount === 1 ? " is" : "s are"} still being analyzed. Clauses appear here as each one finishes.`
                    : failedCount > 0
                      ? "The analysis for your documents couldn’t be read. Refresh to try again."
                      : "None of your documents has an analysis with clauses."}
              </p>
              {docs.length === 0 && (
                <Button className="mt-4" asChild>
                  <Link href="/projects/new">Add a document</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div role="toolbar" aria-label="Filter categories" className="flex min-w-0 flex-col gap-2 border-b border-border px-4 py-2.5 md:flex-row md:items-center md:gap-3">
                <SettingsSearch id="clause-search" label="Search categories" placeholder="Category or clause type" value={q} onChange={setQ} />
                {riskOptions.length > 2 && <FilterChips label="Highest risk" value={risk} onChange={setRisk} options={riskOptions} />}
              </div>

              {visible.length === 0 ? (
                <NoResults noun="categories" onClear={clearFilters} />
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <caption className="sr-only">Clause categories</caption>
                    <thead className="bg-[var(--panel)]">
                      <tr className="h-[38px] text-left text-xs font-medium text-[var(--ink-600)]">
                        <th scope="col" className="px-4 font-medium">Category</th>
                        <th scope="col" className="px-4 text-right font-medium">Clauses</th>
                        <th scope="col" className="px-4 text-right font-medium">Documents</th>
                        <th scope="col" className="px-4 font-medium">Highest risk</th>
                        <th scope="col" className="px-4 font-medium">Types</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((cat) => (
                        <tr key={cat.key || "__uncategorised"} className="h-[42px] border-t border-border transition-colors duration-150 hover:bg-[var(--ink-50)]">
                          <th scope="row" className="max-w-[16rem] truncate px-4 text-left font-medium text-foreground" title={cat.label}>{cat.label}</th>
                          <td className="px-4 text-right tabular-nums text-foreground">{NUM.format(cat.clauses)}</td>
                          <td className="px-4 text-right tabular-nums text-[var(--ink-700)]">{NUM.format(cat.docs)}</td>
                          <td className="px-4 whitespace-nowrap">
                            {cat.peak === null ? (
                              <span className="text-[var(--ink-500)]">Not assessed</span>
                            ) : (
                              <>
                                <span className={`font-medium ${RISK_TEXT[cat.peak]}`}>{RISK_LABEL[cat.peak]}</span>
                                {cat.highRisk > 0 && <span className="text-[var(--ink-500)]"> · {NUM.format(cat.highRisk)} high or critical</span>}
                              </>
                            )}
                          </td>
                          <td className="max-w-[18rem] truncate px-4 text-[var(--ink-600)]" title={cat.types.join(", ") || undefined}>
                            {cat.types.length > 0 ? cat.types.join(", ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-2.5">
                <FilterSummary shown={visible.length} total={rows.length} noun="categories in view" active={filtering} onClear={clearFilters} />
                <p className="text-xs text-[var(--ink-500)] tabular-nums">{status}</p>
              </div>
            </>
          )}
        </SettingsSection>
      </SettingsLayout>
    </>
  );
}
