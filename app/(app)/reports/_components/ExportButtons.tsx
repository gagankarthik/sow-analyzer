"use client";

// "Download Excel" and "Download PDF" for a report. The page passes a builder
// that assembles the report from exactly what is on screen (same filters, same
// metrics), so the file always matches the view. The heavy libraries load on
// the first click only (see lib/govern/export).

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, Loader2 } from "@/components/ui/icons";
import { downloadExcel, downloadPdf, type ExportReport } from "@/lib/govern/export";
import { useGovernFeature } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";

export function ExportButtons({
  build, disabled = false, className, compact = false,
}: {
  build: () => ExportReport;
  disabled?: boolean;
  className?: string;
  /** Shorter labels for tight headers. */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const isExportsOn = useGovernFeature("exports");

  const run = async (kind: "xlsx" | "pdf") => {
    setBusy(kind);
    try {
      const report = build();
      // exceljs / jspdf load inside these calls, on first use only.
      if (kind === "xlsx") await downloadExcel(report);
      else await downloadPdf(report);
      toast.success(kind === "xlsx" ? "Excel file downloaded" : "PDF downloaded");
    } catch (e) {
      toast.error("Couldn't create the file", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  // Exports are a "Later" feature: while it is off, no download buttons are
  // shown at all, so nothing on screen is a button that does nothing.
  if (!isExportsOn) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="outline" className="h-10 sm:h-9" disabled={disabled || busy !== null} onClick={() => void run("xlsx")}>
        {busy === "xlsx" ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet size={15} />}
        {compact ? "Excel" : "Download Excel"}
      </Button>
      <Button variant="outline" className="h-10 sm:h-9" disabled={disabled || busy !== null} onClick={() => void run("pdf")}>
        {busy === "pdf" ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <FileDown size={15} />}
        {compact ? "PDF" : "Download PDF"}
      </Button>
    </div>
  );
}
