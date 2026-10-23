"use client";

// Data capture. Capture should never miss anything silently: this
// page lists every detail Govern could not capture and nobody has entered
// (per kind, each with the contracts to fix), every document that did not
// become a contract and why, and when the check last ran.

import { byEdition } from "@/lib/edition-runtime";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { HBarChart } from "@/components/charts/HBarChart";
import { CheckCircle2, ChevronRight, FileText, X } from "@/components/ui/icons";
import { CAPTURE_GAP_LABEL, STAGE_LABEL, plural } from "@/lib/govern/labels";
import { useCaptureReport, useContracts } from "@/lib/govern/queries";
import type { CaptureGap, CaptureReport, Contract } from "@/lib/govern/types";
import type { ExportReport } from "@/lib/govern/export";
import { displayTitle } from "@/lib/format";
import { ExportButtons } from "../_components/ExportButtons";
import { Panel, ReportError, StatBar, StatTile } from "../_components/ReportKit";
import { CaptureSkeleton, GapContractsSkeleton } from "../_components/ReportSkeletons";

function reconciledText(iso: string | null): string {
  if (!iso) return "The full check has not run yet.";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Last checked: unknown."
    : `Last checked ${d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`;
}

export default function CapturePage() {
  const report = useCaptureReport();
  const contractsQuery = useContracts(true);
  const byId = useMemo(() => new Map((contractsQuery.data?.contracts ?? []).map((c) => [c.contractId, c])), [contractsQuery.data]);
  const [selected, setSelected] = useState<CaptureGap | null>(null);

  const { data, isLoading, isError, error, refetch } = report;
  const gaps = useMemo(() => [...(data?.gaps ?? [])].filter((g) => g.count > 0).sort((a, b) => b.count - a.count), [data]);
  const missed = data?.missedDocuments ?? [];
  const affected = new Set(gaps.flatMap((g) => g.contractIds)).size;
  const allClear = !!data && gaps.length === 0 && missed.length === 0;
  const active = gaps.find((g) => g.gap === selected) ?? null;

  return (
    <>
      <PageHeader
        back={{ href: "/reports", label: "Reports" }}
        title="Data capture"
        actions={<ExportButtons build={() => buildCaptureReport(data as CaptureReport, byId)} disabled={!data || allClear} />}
      />
      <div className="app-container app-page">
        {isLoading ? (
          <CaptureSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="the capture check" />
        ) : allClear ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-6 md:px-6">
            <CheckCircle2 size={24} className="shrink-0 text-[var(--success)]" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Everything captured</h2>
              <p className="mt-1 max-w-[64ch] text-sm text-[var(--ink-700)]">
                Every document became a contract, and every contract has its value, parties, {byEdition("PI, department", "department")}, dates and system references.
                {" "}{reconciledText(data?.lastReconciledAt ?? null)}
              </p>
            </div>
          </div>
        ) : (
          <>
            <StatBar label="Capture figures">
              <StatTile
                label="Contracts missing details"
                value={affected.toLocaleString("en-US")}
                tone={affected > 0 ? "warning" : "neutral"}
                hint={affected > 0 ? "Add the missing details" : "None"}
                href={affected > 0 ? "#fix" : undefined}
              />
              <StatTile
                label="Documents not captured"
                value={missed.length.toLocaleString("en-US")}
                tone={missed.length > 0 ? "warning" : "neutral"}
                hint={missed.length > 0 ? "In no report yet" : "None"}
                href={missed.length > 0 ? "#missed" : undefined}
              />
            </StatBar>
            <p className="-mt-3 text-xs text-[var(--ink-600)]">{reconciledText(data?.lastReconciledAt ?? null)}</p>

            {gaps.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <Panel
                  id="gaps"
                  className="lg:col-span-5"
                  title="What is missing"
                  sub={`Most often: ${CAPTURE_GAP_LABEL[gaps[0].gap]}, on ${plural(gaps[0].count, "contract")}`}
                  table={{ caption: "Missing details", columns: ["Detail", "Contracts"], rows: gaps.map((g) => [CAPTURE_GAP_LABEL[g.gap], g.count]) }}
                >
                  <HBarChart
                    data={gaps.map((g) => ({
                      id: g.gap,
                      label: CAPTURE_GAP_LABEL[g.gap],
                      value: g.count,
                      color: g.gap === selected ? "var(--brand-primary-600)" : "var(--ink-500)",
                    }))}
                    onSelect={(id) => setSelected((s) => (s === id ? null : (id as CaptureGap)))}
                    yAxisWidth={180}
                  />
                </Panel>
                <Panel
                  id="fix"
                  className="lg:col-span-7"
                  title={active ? `Missing: ${CAPTURE_GAP_LABEL[active.gap]}` : "Contracts to fix"}
                  meta={plural(active ? active.count : affected, "contract")}
                  bodyClassName="p-0"
                  action={active && (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--ink-300)] px-2.5 text-xs font-medium text-[var(--ink-700)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
                    >
                      Show all <X size={12} aria-hidden />
                    </button>
                  )}
                >
                  <GapContracts
                    ids={active ? active.contractIds : [...new Set(gaps.flatMap((g) => g.contractIds))]}
                    byId={byId}
                    loading={contractsQuery.isLoading}
                  />
                </Panel>
              </div>
            )}

            {missed.length > 0 && (
              <Panel
                id="missed"
                title="Documents not captured"
                meta={plural(missed.length, "document")}
                bodyClassName="p-0"
              >
                <ul className="divide-y divide-border">
                  {missed.map((d) => (
                    <li key={d.docId}>
                      <Link
                        href={`/projects/${encodeURIComponent(d.docId)}`}
                        className="group flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]"
                      >
                        <FileText size={16} className="mt-0.5 shrink-0 text-[var(--ink-500)]" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground" title={d.title}>{d.title ? displayTitle(d.title) : "Untitled document"}</span>
                          <span className="block text-xs text-[var(--ink-600)]">{d.reason}</span>
                        </span>
                        <span className="shrink-0 rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-medium text-[var(--ink-700)]">
                          {d.status === "FAILED" ? "Failed" : d.status === "READY" ? "Read, not linked" : d.status.toLowerCase()}
                        </span>
                        <ChevronRight size={16} aria-hidden className="mt-1 shrink-0 text-[var(--ink-400)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  );
}

function GapContracts({ ids, byId, loading }: { ids: string[]; byId: Map<string, Contract>; loading: boolean }) {
  if (loading) return <GapContractsSkeleton rows={Math.min(ids.length, 4) || 3} />;
  return (
    <ul className="divide-y divide-border">
      {ids.map((id) => {
        const c = byId.get(id);
        const missing = c?.captureGaps ?? [];
        return (
          <li key={id}>
            <Link
              href={`/contracts/${encodeURIComponent(id)}`}
              className="group flex items-start justify-between gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground" title={c?.title}>{c ? displayTitle(c.title) : "Contract"}</span>
                <span className="block text-xs text-[var(--ink-600)]">
                  {c ? `${STAGE_LABEL[c.stage]} · ` : ""}
                  {missing.length ? `Missing ${missing.map((g) => CAPTURE_GAP_LABEL[g].toLowerCase()).join(", ")}` : "Open to see what is missing"}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--brand-primary-700)] group-hover:underline">
                Fix <ChevronRight size={12} aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function buildCaptureReport(report: CaptureReport, byId: Map<string, Contract>): ExportReport {
  return {
    title: "Data capture",
    fileBase: "govern-capture",
    notes: [reconciledText(report.lastReconciledAt)],
    tables: [
      {
        name: "Missing details",
        columns: [{ key: "gap", header: "Detail", width: 30 }, { key: "count", header: "Contracts", kind: "number" }],
        rows: report.gaps.filter((g) => g.count > 0).map((g) => ({ gap: CAPTURE_GAP_LABEL[g.gap], count: g.count })),
      },
      {
        name: "Contracts to fix",
        columns: [{ key: "contract", header: "Contract", width: 40 }, { key: "gap", header: "Missing", width: 30 }, { key: "stage", header: "Step", width: 22 }],
        rows: report.gaps.flatMap((g) => g.contractIds.map((id) => {
          const c = byId.get(id);
          return { contract: c?.title ?? id, gap: CAPTURE_GAP_LABEL[g.gap], stage: c ? STAGE_LABEL[c.stage] : null };
        })),
      },
      {
        name: "Documents not captured",
        columns: [{ key: "title", header: "Document", width: 40 }, { key: "status", header: "Status", width: 14 }, { key: "reason", header: "Why", width: 60 }],
        rows: report.missedDocuments.map((d) => ({ title: d.title, status: d.status, reason: d.reason })),
      },
    ],
  };
}
