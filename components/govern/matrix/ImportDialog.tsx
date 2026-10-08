"use client";

// Bulk import of an existing matrix from Excel or CSV, in four steps:
// 1 choose a file, 2 check which column is which, 3 preview the rows and
// choose how to import, 4 the result. Each agreement type is one import call
// (the API saves each as a new matrix version).

import { useAgreementTypes } from "@/lib/govern/queries";
import { useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle, AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload,
} from "@/components/ui/icons";
import { ErrorText, Field } from "@/components/govern/admin/shared";
import { useImportMatrix } from "@/lib/govern/queries";
import { AGREEMENT_TYPE_LABEL, plural } from "@/lib/govern/labels";
import { cn } from "@/lib/utils";
import type { AgreementType, MatrixImportRow } from "@/lib/govern/types";
import {
  IMPORT_FIELDS, ImportFileError, buildPreview, detectMapping, downloadTemplate, parseMatrixFile,
  type ColumnMapping, type ImportField, type ParsedSheet, type PreviewRow,
} from "./import-utils";

type Step = "file" | "map" | "review" | "done";
const NOT_IN_FILE = "__none";
const SPLIT = "__split";
const PREVIEW_LIMIT = 150;

interface TypeResult {
  agreementType: AgreementType;
  sent: number;
  imported: number;
  skipped: { sheetRow: number | null; reason: string }[];
  error: string | null;
}

export function ImportDialog({
  open, onOpenChange, defaultType,
}: { open: boolean; onOpenChange: (open: boolean) => void; defaultType: AgreementType }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        {open && <ImportWizard defaultType={defaultType} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportWizard({ defaultType, onClose }: { defaultType: AgreementType; onClose: () => void }) {
  const agreementTypes = useAgreementTypes();
  const uid = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const importMatrix = useImportMatrix();

  const [step, setStep] = useState<Step>("file");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);

  const [target, setTarget] = useState<string>(defaultType);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TypeResult[] | null>(null);

  const split = target === SPLIT;
  const preview = useMemo<PreviewRow[]>(
    () => (sheet && mapping ? buildPreview(sheet, mapping, split) : []),
    [sheet, mapping, split],
  );
  const valid = preview.filter((r) => r.problems.length === 0);
  const flagged = preview.filter((r) => r.problems.length > 0);
  const byType = useMemo(() => {
    const groups = new Map<AgreementType, PreviewRow[]>();
    for (const r of valid) {
      const t = split ? (r.agreementType as AgreementType) : (target as AgreementType);
      groups.set(t, [...(groups.get(t) ?? []), r]);
    }
    return groups;
  }, [valid, split, target]);

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setReading(true);
    try {
      const parsed = await parseMatrixFile(file);
      const m = detectMapping(parsed.headers);
      setSheet(parsed);
      setMapping(m);
      setTarget(m.agreementType !== null ? SPLIT : defaultType);
      setStep("map");
    } catch (e) {
      setFileError(e instanceof ImportFileError ? e.message : "The file could not be read. Check it is a normal Excel or CSV file.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function getTemplate() {
    setTemplateBusy(true);
    try { await downloadTemplate(); } finally { setTemplateBusy(false); }
  }

  const mappingError = mapping && (mapping.clauseType === null || mapping.standard === null)
    ? "Choose the columns for Clause type and Standard position. Both are needed for every row."
    : null;

  async function runImport() {
    setRunning(true);
    const out: TypeResult[] = [];
    for (const [agreementType, rows] of byType) {
      const sent: MatrixImportRow[] = rows.map((r) => r.row);
      try {
        const res = await importMatrix.mutateAsync({ agreementType, rows: sent, mode, note: note.trim() || undefined });
        out.push({
          agreementType,
          sent: sent.length,
          imported: res.imported,
          // `row` is the row's place in what was sent; map it back to the sheet.
          skipped: res.skipped.map((s) => ({ sheetRow: rows[s.row - 1]?.sheetRow ?? rows[s.row]?.sheetRow ?? null, reason: s.reason })),
          error: null,
        });
      } catch (e) {
        out.push({ agreementType, sent: sent.length, imported: 0, skipped: [], error: e instanceof Error ? e.message : "The import failed." });
      }
    }
    setResults(out);
    setRunning(false);
    setStep("done");
  }

  const stepIndex = ["file", "map", "review", "done"].indexOf(step);

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Import a review matrix</DialogTitle>
        <DialogDescription>Load your existing matrix from Excel or CSV instead of typing it in.</DialogDescription>
      </DialogHeader>

      <ol className="grid grid-cols-4 gap-2" aria-label="Import steps">
        {["Choose file", "Match columns", "Check rows", "Done"].map((s, i) => (
          <li key={s} aria-current={i === stepIndex ? "step" : undefined} className="min-w-0">
            <span className={cn("block h-1 rounded-full", i <= stepIndex ? "bg-[var(--brand-primary-600)]" : "bg-[var(--ink-100)]")} />
            <span className={cn("mt-1.5 block truncate text-xs", i === stepIndex ? "font-semibold text-foreground" : "text-muted-foreground")}>{s}</span>
          </li>
        ))}
      </ol>

      {step === "file" && (
        <div className="grid gap-4">
          <label
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void readFile(e.dataTransfer.files[0]); }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-ring/50",
              dragOver ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-[var(--ink-300)] hover:border-[var(--brand-primary-400)] hover:bg-[var(--brand-primary-50)]",
            )}
          >
            <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-600)] text-white">
              {reading ? <Loader2 size={20} className="animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet size={20} />}
            </span>
            <span className="text-base font-semibold text-foreground">
              {reading ? "Reading the file…" : <>Drop the matrix here, or <span className="text-[var(--brand-primary-600)] underline underline-offset-2">browse</span></>}
            </span>
            <span className="text-sm text-muted-foreground">Excel (.xlsx) or CSV · one row per clause</span>
          </label>
          {fileError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-foreground">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />{fileError}
            </p>
          )}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-[var(--panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[var(--ink-700)]">
              Columns: Agreement type, Clause type, Standard position, Fallback, Unacceptable terms, Escalation office, Beneficial terms, Suggested language. Your own headings are fine; you can match them next.
            </p>
            <Button variant="outline" className="h-10 shrink-0 md:h-9" onClick={() => void getTemplate()} disabled={templateBusy}>
              {templateBusy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Download size={14} />}Download template
            </Button>
          </div>
        </div>
      )}

      {step === "map" && sheet && mapping && (
        <div className="grid gap-4">
          <p className="text-sm text-[var(--ink-700)]">
            <span className="font-semibold text-foreground">{sheet.fileName}</span> · {plural(sheet.rows.length, "row")}. We matched the columns we recognised; change any that are wrong.
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {IMPORT_FIELDS.map((f) => (
              <Field key={f.id} label={f.label} htmlFor={`${uid}-${f.id}`} required={f.required}>
                <Select
                  value={mapping[f.id] === null ? NOT_IN_FILE : String(mapping[f.id])}
                  onValueChange={(v) => setMapping({ ...mapping, [f.id]: v === NOT_IN_FILE ? null : Number(v) } as Record<ImportField, number | null>)}
                >
                  <SelectTrigger id={`${uid}-${f.id}`} className={cn("w-full text-base md:data-[size=default]:h-9", f.required && mapping[f.id] === null && "border-[var(--danger)]")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_IN_FILE}>Not in this file</SelectItem>
                    {sheet.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
          {mappingError && <ErrorText>{mappingError}</ErrorText>}
          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setStep("file")}>Choose another file</Button>
            <Button size="lg" className="md:h-9" disabled={!!mappingError} onClick={() => {
              if (mapping.agreementType === null && target === SPLIT) setTarget(defaultType);
              setStep("review");
            }}>Check rows</Button>
          </DialogFooter>
        </div>
      )}

      {step === "review" && sheet && mapping && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Import into" htmlFor={`${uid}-target`}>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id={`${uid}-target`} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mapping.agreementType !== null && <SelectItem value={SPLIT}>Each row&apos;s Agreement type column</SelectItem>}
                  {agreementTypes.map((t) => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Optional note for the new version" htmlFor={`${uid}-note`}>
              <Input id={`${uid}-note`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Imported from the 2026 matrix" />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-foreground">How to import</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                ["merge", "Add and update", "Clauses in the file are added or updated. Clauses not in the file stay as they are."],
                ["replace", "Replace", "The file becomes the whole playbook for each agreement type in it. Clauses not in the file are removed."],
              ] as const).map(([value, title, desc]) => (
                <label key={value} className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring/50",
                  mode === value ? (value === "replace" ? "border-[var(--danger)] bg-[var(--danger-soft)]" : "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]") : "border-border",
                )}>
                  <input type="radio" name={`${uid}-mode`} value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1 accent-[var(--brand-primary-600)]" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="block text-xs leading-relaxed text-[var(--ink-700)]">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 text-sm" aria-live="polite">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--success-soft)] px-2 py-1 font-medium text-[var(--success-fg)]">
              <CheckCircle2 size={14} />{plural(valid.length, "row")} ready
            </span>
            {flagged.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--warning-soft)] px-2 py-1 font-medium text-[var(--warning-fg)]">
                <AlertTriangle size={14} />{plural(flagged.length, "row")} will be left out
              </span>
            )}
            {[...byType.entries()].map(([t, rows]) => (
              <span key={t} className="rounded-md border border-border px-2 py-1 text-[var(--ink-700)]">
                {AGREEMENT_TYPE_LABEL[t]}: {rows.length}
              </span>
            ))}
          </div>

          <PreviewTable rows={preview} showType={split} />

          {mode === "replace" && byType.size > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-foreground">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              Replace removes every clause of {[...byType.keys()].map((t) => AGREEMENT_TYPE_LABEL[t]).join(", ")} that is not in this file. Earlier versions stay in the version history.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" size="lg" className="md:h-9" onClick={() => setStep("map")} disabled={running}>Back</Button>
            <Button
              size="lg"
              variant={mode === "replace" ? "destructive" : "default"}
              className="md:h-9"
              disabled={running || valid.length === 0}
              onClick={() => void runImport()}
            >
              {running
                ? <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" />Importing…</>
                : <><Upload size={14} />{mode === "replace" ? "Replace with" : "Import"} {plural(valid.length, "row")}</>}
            </Button>
          </DialogFooter>
        </div>
      )}

      {step === "done" && results && (
        <div className="grid gap-4">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {results.map((r) => (
              <li key={r.agreementType} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{AGREEMENT_TYPE_LABEL[r.agreementType]}</span>
                  {r.error ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--danger)]"><AlertCircle size={14} />Not imported</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]"><CheckCircle2 size={14} />{plural(r.imported, "clause")} imported</span>
                  )}
                </div>
                {r.error && <p className="mt-1 text-sm text-[var(--ink-700)] [overflow-wrap:anywhere]">{r.error}</p>}
                {r.skipped.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-[var(--ink-700)]">
                    {r.skipped.map((s, i) => (
                      <li key={i}>Skipped{s.sheetRow ? ` row ${s.sheetRow}` : ""}: {s.reason}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {flagged.length > 0 && (
            <details className="rounded-lg border border-border px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">{plural(flagged.length, "row")} left out before importing</summary>
              <ul className="mt-2 space-y-1 text-[var(--ink-700)]">
                {flagged.map((r) => <li key={r.sheetRow}>Row {r.sheetRow}: {r.problems.join("; ")}</li>)}
              </ul>
            </details>
          )}
          <p className="text-sm text-muted-foreground">
            Each agreement type imported is saved as a new matrix version. Contracts already checked keep their result until they are re-checked.
          </p>
          <DialogFooter>
            {results.some((r) => r.error) && (
              <Button variant="outline" size="lg" className="md:h-9" onClick={() => setStep("review")}>Back to rows</Button>
            )}
            <Button size="lg" className="md:h-9" onClick={onClose}>Done</Button>
          </DialogFooter>
        </div>
      )}
    </div>
  );
}

function PreviewTable({ rows, showType }: { rows: PreviewRow[]; showType: boolean }) {
  const shown = rows.slice(0, PREVIEW_LIMIT);
  return (
    <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-border">
      {/* Cards below md, a table above. */}
      <ul className="divide-y divide-border md:hidden">
        {shown.map((r) => (
          <li key={r.sheetRow} className={cn("px-3 py-2.5 text-sm", r.problems.length && "bg-[var(--warning-soft)]")}>
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-foreground">{r.clauseLabel}</span>
              <span className="shrink-0 text-xs text-muted-foreground">Row {r.sheetRow}</span>
            </div>
            {showType && <p className="text-xs text-[var(--ink-600)]">{r.agreementType ? AGREEMENT_TYPE_LABEL[r.agreementType] : "—"}</p>}
            <p className="mt-1 line-clamp-2 text-[var(--ink-700)]">{r.row.standard || "—"}</p>
            {r.problems.length > 0 && <p className="mt-1 font-medium text-[var(--warning)]">{r.problems.join("; ")}</p>}
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-sm md:table">
        <caption className="sr-only">Rows found in the file</caption>
        <thead className="sticky top-0 bg-[var(--panel)] text-xs text-[var(--ink-600)]">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Row</th>
            {showType && <th scope="col" className="px-3 py-2 font-medium">Agreement type</th>}
            <th scope="col" className="px-3 py-2 font-medium">Clause type</th>
            <th scope="col" className="px-3 py-2 font-medium">Standard position</th>
            <th scope="col" className="px-3 py-2 font-medium">Check</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {shown.map((r) => (
            <tr key={r.sheetRow} className={cn(r.problems.length && "bg-[var(--warning-soft)]")}>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.sheetRow}</td>
              {showType && <td className="px-3 py-2">{r.agreementType ? AGREEMENT_TYPE_LABEL[r.agreementType] : "—"}</td>}
              <td className="px-3 py-2 font-medium text-foreground">{r.clauseLabel}</td>
              <td className="max-w-[28ch] px-3 py-2 text-[var(--ink-700)]"><span className="line-clamp-2">{r.row.standard || "—"}</span></td>
              <td className="px-3 py-2">
                {r.problems.length
                  ? <span className="font-medium text-[var(--warning)]">{r.problems.join("; ")}</span>
                  : <span className="inline-flex items-center gap-1 text-[var(--success)]"><CheckCircle2 size={13} />Ready</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PREVIEW_LIMIT && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Showing the first {PREVIEW_LIMIT} of {rows.length} rows. All of them are checked and imported.
        </p>
      )}
    </div>
  );
}
