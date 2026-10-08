"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const RISK_TEXT: Record<RiskLevel, string> = {
  critical: "text-[var(--danger)]",
  high: "text-[var(--warning)]",
  medium: "text-[var(--ink-700)]",
  low: "text-[var(--success)]",
};

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
          `${totalClauses.toLocaleString()} clause${totalClauses === 1 ? "" : "s"} in ${rows.length} categor${rows.length === 1 ? "y" : "ies"}`,
          `from ${analysedDocs} of ${docs.length} document${docs.length === 1 ? "" : "s"}`,
          processingCount > 0 ? `${processingCount} still processing` : "",
          loadingCount > 0 ? `${loadingCount} loading` : "",
          failedCount > 0 ? `${failedCount} couldn’t be read` : "",
        ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        title="Clause library"
        subtitle="Every clause Sonar extracted from your analyzed documents, grouped by category."
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        <SettingsSection title="Clause categories" description={status}>
          {stillLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : docsFailed ? (
            <div role="alert" className="flex flex-col items-center rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-10 text-center">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={22} strokeWidth={1.75} /></span>
              <h3 className="text-base font-semibold text-foreground">Couldn&apos;t load your documents</h3>
              <p className="mt-1.5 max-w-sm break-words text-sm leading-relaxed text-[var(--ink-600)]">
                {docsQuery.error instanceof Error ? docsQuery.error.message : "The request failed."}
              </p>
              <Button variant="outline" size="lg" className="mt-5" onClick={() => docsQuery.refetch()}><RefreshCw size={14} />Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--ink-300)] bg-[var(--panel)] px-4 py-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-structure-soft">
                <FileText size={20} className="text-[var(--brand-primary-700)]" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">No clauses yet</h3>
              <p className="mt-2 max-w-sm text-base leading-relaxed text-[var(--ink-600)]">
                {docs.length === 0
                  ? "Upload a document and its clauses appear here once it has been analyzed."
                  : processingCount > 0
                    ? `${processingCount} document${processingCount === 1 ? " is" : "s are"} still being analyzed. Clauses appear here as each one finishes.`
                    : failedCount > 0
                      ? "The analysis for your documents couldn’t be read. Refresh to try again."
                      : "None of your documents has an analysis with clauses."}
              </p>
              {docs.length === 0 && (
                <Button variant="outline" size="lg" className="mt-5" asChild>
                  <Link href="/projects/new">Add a document</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <SettingsSearch id="clause-search" label="Search categories" placeholder="Category or clause type" value={q} onChange={setQ} />
              {riskOptions.length > 2 && <FilterChips label="Highest risk found" value={risk} onChange={setRisk} options={riskOptions} />}
              <FilterSummary shown={visible.length} total={rows.length} noun="categories" active={filtering} onClear={clearFilters} />

              {visible.length === 0 ? (
                <NoResults noun="categories" onClear={clearFilters} />
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {visible.map((cat) => (
                    <li key={cat.key || "__uncategorised"} className="min-w-0 rounded-lg border border-border bg-[var(--panel)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold min-w-0 break-words text-foreground">{cat.label}</h3>
                        <span className="shrink-0 text-xl font-semibold leading-none tabular-nums text-foreground">{cat.clauses.toLocaleString()}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-600)]">
                        clause{cat.clauses === 1 ? "" : "s"} in {cat.docs} document{cat.docs === 1 ? "" : "s"}
                      </p>
                      <p className="mt-2 text-xs">
                        {cat.peak === null ? (
                          <span className="text-muted-foreground">Risk not assessed</span>
                        ) : (
                          <>
                            <span className={`font-semibold ${RISK_TEXT[cat.peak]}`}>Highest risk: {RISK_LABEL[cat.peak].toLowerCase()}</span>
                            {cat.highRisk > 0 && <span className="text-muted-foreground"> · {cat.highRisk} high or critical</span>}
                          </>
                        )}
                      </p>
                      {cat.types.length > 0 && (
                        <p className="mt-2 break-words text-xs text-muted-foreground">Types: {cat.types.join(", ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </SettingsSection>
      </SettingsLayout>
    </>
  );
}
