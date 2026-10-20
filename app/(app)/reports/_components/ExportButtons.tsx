"use client";

// One "Export" button for a report. It opens a dialog to pick Excel or PDF,
// shows what the file holds, and downloads on "Download". The page passes a
// builder that assembles the report from exactly what is on screen (same
// filters, same metrics), so the file always matches the view. The heavy
// libraries load on the first download only (see lib/govern/export).

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, FileDown, FileSpreadsheet } from "@/components/ui/icons";
import { ActionDialog } from "@/components/govern/actions/ActionDialog";
import { downloadExcel, downloadPdf, type ExportReport } from "@/lib/govern/export";
import { useGovernFeature } from "@/lib/govern/queries";
import { plural } from "@/lib/govern/labels";
import { cn } from "@/lib/utils";

type Format = "xlsx" | "pdf";

const FORMATS: { id: Format; label: string; hint: string; icon: typeof FileDown }[] = [
  { id: "xlsx", label: "Excel", hint: "One sheet per table, numbers you can sort and sum.", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF", hint: "A formatted report to share or print.", icon: FileDown },
];

// The last format picked is a per-viewer convenience; storage may be unavailable.
const FORMAT_KEY = "blueiq.export.format";
function readFormat(): Format {
  try {
    return window.localStorage.getItem(FORMAT_KEY) === "pdf" ? "pdf" : "xlsx";
  } catch {
    return "xlsx";
  }
}
function saveFormat(f: Format) {
  try {
    window.localStorage.setItem(FORMAT_KEY, f);
  } catch {
    /* not remembered; nothing else depends on it */
  }
}

export function ExportButtons({
  build, disabled = false, className,
}: {
  build: () => ExportReport;
  disabled?: boolean;
  className?: string;
  /** Kept for existing callers; the single button is already compact. */
  compact?: boolean;
}) {
  const isExportsOn = useGovernFeature("exports");
  const [report, setReport] = useState<ExportReport | null>(null);

  // Exports are a "Later" feature: while it is off, no export button is shown,
  // so nothing on screen is a button that does nothing.
  if (!isExportsOn) return null;

  const open = () => {
    try {
      setReport(build());
    } catch (e) {
      toast.error("Couldn't prepare the export", { description: e instanceof Error ? e.message : "Try again." });
    }
  };

  return (
    <>
      <Button variant="outline" className={className} disabled={disabled} onClick={open}>
        <Download size={16} aria-hidden />
        Export
      </Button>
      {report && <ExportDialog report={report} onClose={() => setReport(null)} />}
    </>
  );
}

function ExportDialog({ report, onClose }: { report: ExportReport; onClose: () => void }) {
  const ids = useId();
  const [format, setFormat] = useState<Format>(readFormat);
  const [busy, setBusy] = useState(false);
  const rows = report.tables.reduce((n, t) => n + t.rows.length, 0);

  const download = async () => {
    setBusy(true);
    try {
      // exceljs / jspdf load inside these calls, on first use only.
      if (format === "xlsx") await downloadExcel(report);
      else await downloadPdf(report);
      saveFormat(format);
      toast.success(format === "xlsx" ? "Excel file downloaded" : "PDF downloaded");
      onClose();
    } catch (e) {
      toast.error("Couldn't create the file", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Export"
      description={<>{report.title}</>}
      confirmLabel="Download"
      onConfirm={() => void download()}
      pending={busy}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold text-foreground">Format</legend>
        {FORMATS.map((f) => {
          const Icon = f.icon;
          const on = format === f.id;
          return (
            <label
              key={f.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                on ? "border-[var(--brand-primary-300)] bg-surface-selected" : "border-border-default hover:bg-surface-hover",
              )}
            >
              <input
                type="radio"
                name={`${ids}-format`}
                value={f.id}
                checked={on}
                onChange={() => setFormat(f.id)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary-600)]"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Icon size={12} aria-hidden className="text-[var(--ink-600)]" />
                  {f.label}
                </span>
                <span className="text-xs text-[var(--ink-600)]">{f.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">Included</p>
        <ul className="divide-y divide-border rounded-md border border-border-default text-sm">
          {report.summary && report.summary.length > 0 && (
            <li className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-[var(--ink-700)]">Headline figures</span>
              <span className="tabular-nums text-[var(--ink-600)]">{report.summary.length}</span>
            </li>
          )}
          {report.tables.map((t) => (
            <li key={t.name} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-[var(--ink-700)]">{t.name}</span>
              <span className="shrink-0 tabular-nums text-[var(--ink-600)]">{plural(t.rows.length, "row")}</span>
            </li>
          ))}
        </ul>
        {rows === 0 && <p className="text-xs text-[var(--ink-600)]">The tables are empty for this view; the file still has the headings.</p>}
        {report.notes?.map((n) => <p key={n} className="text-xs text-[var(--ink-600)]">{n}</p>)}
      </div>
    </ActionDialog>
  );
}
