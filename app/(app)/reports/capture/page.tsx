"use client";

// "Is anything missing?" Capture should never miss anything silently: this
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
import { ExportButtons } from "../_components/ExportButtons";
import { Panel, ReportError, ReportSkeleton } from "../_components/ReportKit";

function reconciledText(iso: string | null): string {
  if (!iso) return "The full check has not run yet.";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Last checked: unknown."
    : `Last checked ${d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`;
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
        title="Is anything missing?"
        subtitle="Details Govern could not read from an agreement and nobody has entered yet, and any document that did not become a contract."
        actions={
          <>
            <ExportButtons build={() => buildCaptureReport(data as CaptureReport, byId)} disabled={!data || allClear} />
          </>
        }
      />
      <div className="app-container space-y-8 py-6 md:py-8">
        {isLoading ? (
          <ReportSkeleton />
        ) : isError && !data ? (
          <ReportError error={error} onRetry={() => void refetch()} what="the capture check" />
        ) : allClear ? (
          <div className="flex flex-col items-start gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[var(--success-soft)] px-6 py-10 md:flex-row md:items-center md:px-10 md:py-14">
            <CheckCircle2 size={48} strokeWidth={1.5} className="shrink-0 text-[var(--success)]" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold leading-tight tracking-[-0.02em] text-foreground">Everything captured</h2>
              <p className="mt-2 max-w-[54ch] text-lg leading-relaxed text-[var(--ink-700)]">
                Every document became a contract, and every contract has its value, parties, {byEdition("PI, department", "department")}, dates and system references.
                {" "}{reconciledText(data?.lastReconciledAt ?? null)}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--ink-700)]">
              {affected > 0 && <><span className="font-semibold text-foreground">{plural(affected, "contract")}</span> {affected === 1 ? "is" : "are"} missing details</>}
              {affected > 0 && missed.length > 0 && " and "}
              {missed.length > 0 && <><span className="font-semibold text-foreground">{plural(missed.length, "document")}</span> {missed.length === 1 ? "was" : "were"} not captured</>}
              . {reconciledText(data?.lastReconciledAt ?? null)}
            </p>

            {gaps.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <Panel
                  id="gaps"
                  className="lg:col-span-5"
                  title="What is missing"
                  sub={`${CAPTURE_GAP_LABEL[gaps[0].gap]} is missing most often, on ${plural(gaps[0].count, "contract")}. Select a row to see them.`}
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
                  sub={active ? `${plural(active.count, "contract")}. Open one and add the detail.` : "Choose a detail on the left, or work down every contract with something missing."}
                  action={active && (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--ink-300)] px-3 text-sm font-medium text-[var(--ink-700)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
                    >
                      Show all <X size={14} aria-hidden />
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
                sub="These were uploaded but did not become a contract, so they are in no report. Open each one to retry or link it."
              >
                <ul className="divide-y divide-border">
                  {missed.map((d) => (
                    <li key={d.docId}>
                      <Link
                        href={`/projects/${encodeURIComponent(d.docId)}`}
                        className="group -mx-3 flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
                      >
                        <FileText size={18} className="mt-0.5 shrink-0 text-[var(--ink-500)]" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-semibold text-foreground" title={d.title}>{d.title || "Untitled document"}</span>
                          <span className="block text-sm text-[var(--ink-700)]">{d.reason}</span>
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
  if (loading) return <p className="text-sm text-[var(--ink-600)]">Loading contracts…</p>;
  return (
    <ul className="divide-y divide-border">
      {ids.map((id) => {
        const c = byId.get(id);
        const missing = c?.captureGaps ?? [];
        return (
          <li key={id}>
            <Link
              href={`/contracts/${encodeURIComponent(id)}`}
              className="group -mx-3 flex items-start justify-between gap-3 rounded-lg px-3 py-3 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-foreground" title={c?.title}>{c?.title ?? "Contract"}</span>
                <span className="block text-sm text-[var(--ink-600)]">
                  {c ? `${STAGE_LABEL[c.stage]} · ` : ""}
                  {missing.length ? `Missing ${missing.map((g) => CAPTURE_GAP_LABEL[g].toLowerCase()).join(", ")}` : "Open to see what is missing"}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)] group-hover:underline">
                Fix <ChevronRight size={14} aria-hidden />
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
    title: "Is anything missing?",
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
